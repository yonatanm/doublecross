import type { RawClue, RankedProposal } from "@/types/crossword"
import { cleanAnswer, generateFromVariant, type VariantClue } from "@/lib/crossword-generator"
import { DEFAULT_LAYOUT_WEIGHTS } from "@/lib/layout-engine"

interface GenerateProposalsOptions {
  attemptsPerVariant?: number
  maxVariants?: number
  topK?: number
  timeBudgetMs?: number
}

/**
 * Generate top-K ranked proposals from raw clues.
 * Explores both shuffle randomness AND input variants (split vs. join multi-word answers).
 * Time-bounded: generates first proposal, measures cost, then fills remaining time budget.
 */
export function generateProposals(
  rawClues: RawClue[],
  options?: GenerateProposalsOptions,
): RankedProposal[] {
  const maxVariants = options?.maxVariants ?? 16
  const topK = options?.topK ?? 10
  const timeBudgetMs = options?.timeBudgetMs ?? 5000

  // 1. Normalize Hebrew answers
  const cleaned = rawClues.map((c) => ({
    clue: c.clue,
    answer: cleanAnswer(c.answer),
  }))

  // 2. Identify multi-word answers
  const multiWordIndices: number[] = []
  cleaned.forEach((c, i) => {
    if (c.answer.includes(" ")) {
      multiWordIndices.push(i)
    }
  })

  // 3. Enumerate variants via bitmask
  const M = multiWordIndices.length
  const totalVariants = Math.min(1 << M, maxVariants)

  const allResults: { result: ReturnType<typeof generateFromVariant>; label: string }[] = []

  // Generate first attempt and measure time
  const firstVariantClues = buildVariantClues(cleaned, multiWordIndices, 0)
  const firstLabel = buildVariantLabel(cleaned, multiWordIndices, 0)
  const t0 = performance.now()
  const firstResult = generateFromVariant(firstVariantClues, 1)
  const singleAttemptMs = performance.now() - t0
  allResults.push({ result: firstResult, label: firstLabel })

  // Calculate how many more attempts fit in the time budget
  const attemptsPerVariant = options?.attemptsPerVariant ??
    Math.max(1, Math.min(20, Math.floor((timeBudgetMs - singleAttemptMs) / (singleAttemptMs * totalVariants))))

  const deadline = t0 + timeBudgetMs

  for (let mask = 0; mask < totalVariants; mask++) {
    const variantClues = buildVariantClues(cleaned, multiWordIndices, mask)
    const label = buildVariantLabel(cleaned, multiWordIndices, mask)
    const startAttempt = (mask === 0) ? 1 : 0 // skip first attempt for mask 0 (already done)
    for (let a = startAttempt; a < attemptsPerVariant; a++) {
      if (performance.now() > deadline) break
      const result = generateFromVariant(variantClues, 1)
      allResults.push({ result, label })
    }
    if (performance.now() > deadline) break
  }

  // 4. Deduplicate by grid fingerprint (keep higher-scoring)
  const seen = new Map<string, number>() // fingerprint → index in deduped
  const deduped: typeof allResults = []

  for (const entry of allResults) {
    const fp = gridFingerprint(entry.result.grid)
    const existingIdx = seen.get(fp)
    if (existingIdx !== undefined) {
      // Keep the one with higher engine score
      const existingScore = deduped[existingIdx].result.score?.overall ?? 0
      const newScore = entry.result.score?.overall ?? 0
      if (newScore > existingScore) {
        deduped[existingIdx] = entry
      }
    } else {
      seen.set(fp, deduped.length)
      deduped.push(entry)
    }
  }

  // 5. Compute adjusted scores and rank
  const totalOriginalClues = cleaned.length
  const proposals: RankedProposal[] = deduped.map(({ result, label }) => {
    const adjustedScore = computeAdjustedScore(result, totalOriginalClues)
    return { result, adjustedScore, variantLabel: label }
  })

  proposals.sort((a, b) => b.adjustedScore - a.adjustedScore)

  return proposals.slice(0, topK)
}

/**
 * Build VariantClue[] for a specific bitmask.
 * Bit i: 0 = split the i-th multi-word answer, 1 = join it.
 */
function buildVariantClues(
  cleaned: RawClue[],
  multiWordIndices: number[],
  mask: number,
): VariantClue[] {
  const joinSet = new Set<number>()
  for (let i = 0; i < multiWordIndices.length; i++) {
    if (mask & (1 << i)) {
      joinSet.add(multiWordIndices[i])
    }
  }

  const result: VariantClue[] = []
  cleaned.forEach((item, idx) => {
    const words = item.answer.split(" ")
    if (words.length <= 1 || joinSet.has(idx)) {
      // Single-word or joined multi-word: one engine entry
      result.push({
        clue: item.clue,
        answer: item.answer.replaceAll(" ", "").replaceAll("_", ""),
        identifier: idx,
        subId: 0,
        origAnswer: item.answer,
      })
    } else {
      // Split: each word as a separate engine entry
      words.forEach((word, j) => {
        result.push({
          clue: item.clue,
          answer: word.replaceAll("_", ""),
          identifier: idx,
          subId: j,
          origAnswer: item.answer,
        })
      })
    }
  })

  return result
}

/**
 * Build a Hebrew label describing the variant.
 */
function buildVariantLabel(
  cleaned: RawClue[],
  multiWordIndices: number[],
  mask: number,
): string {
  if (multiWordIndices.length === 0) return "ללא מילים מרובות"

  const parts: string[] = []
  for (let i = 0; i < multiWordIndices.length; i++) {
    const idx = multiWordIndices[i]
    const answer = cleaned[idx].answer
    const joined = !!(mask & (1 << i))
    parts.push(`${answer}: ${joined ? "מאוחד" : "מפוצל"}`)
  }
  return parts.join(" · ")
}

/**
 * Grid fingerprint for deduplication.
 */
function gridFingerprint(grid: { letter?: string; isBlocked: boolean }[][]): string {
  return grid
    .map((row) =>
      row.map((cell) => (cell.isBlocked ? "#" : cell.letter ?? ".")).join("")
    )
    .join("|")
}

/**
 * Compute adjusted overall score relative to original clue count.
 * For split variants, a clue is "placed" only if ALL its fragments were placed.
 */
function computeAdjustedScore(
  result: ReturnType<typeof generateFromVariant>,
  totalOriginalClues: number,
): number {
  const score = result.score
  if (!score) return 0

  // Check unplaced: if any fragment of an identifier is unplaced, the whole clue is unplaced
  // unplacedClues contains unique clue texts — cross-check with layout_result
  const unplacedClueTexts = new Set(result.unplacedClues.map((c) => c.clue))

  // Check layout_result for placed entries by identifier
  const identifierPlacedFragments = new Map<number, number>()
  const identifierClue = new Map<number, string>()
  for (const lw of result.layout_result) {
    if (lw.identifier !== undefined) {
      identifierPlacedFragments.set(
        lw.identifier,
        (identifierPlacedFragments.get(lw.identifier) ?? 0) + 1
      )
      if (!identifierClue.has(lw.identifier)) {
        identifierClue.set(lw.identifier, lw.clue)
      }
    }
  }

  // An original clue is "placed" if its clue text does NOT appear in unplacedClues
  // AND at least one of its fragments is in layout_result.
  let originalPlaced = 0
  for (let i = 0; i < totalOriginalClues; i++) {
    if (identifierPlacedFragments.has(i) && !unplacedClueTexts.has(identifierClue.get(i) ?? "")) {
      originalPlaced++
    }
  }

  const adjustedPlacementRatio = totalOriginalClues > 0 ? originalPlaced / totalOriginalClues : 0

  return (
    DEFAULT_LAYOUT_WEIGHTS.placementRatio * adjustedPlacementRatio +
    DEFAULT_LAYOUT_WEIGHTS.density * score.density +
    DEFAULT_LAYOUT_WEIGHTS.interconnectedness * score.interconnectedness +
    DEFAULT_LAYOUT_WEIGHTS.sizeRatio * score.sizeRatio
  )
}
