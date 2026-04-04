import type { RawClue, CrosswordCell, NumberedClue, LayoutWord, GeneratorResult } from "@/types/crossword"
import { generateLayout, type LayoutEngineResult } from "@/lib/layout-engine"

// Hebrew final-letter normalization
const FINAL_LETTERS: Record<string, string> = {
  "ך": "כ",
  "ם": "מ",
  "ן": "נ",
  "ף": "פ",
  "ץ": "צ",
}

export function cleanAnswer(answer: string): string {
  // Normalize: collapse runs of spaces/underscores into the appropriate single separator
  const noDblSpaces = answer
    .replace(/[ _]+/g, (match) => (match.includes("_") ? "_" : " "))
    .trim()
  return noDblSpaces
    .split("")
    .map((ch) => FINAL_LETTERS[ch] || ch)
    .join("")
}

function formatAnswerLength(answer: string): string {
  const words = answer.split(/[ _]+/).filter((w) => w.length > 0).reverse()
  if (words.length <= 1) return `(${(words[0] || "").length})`
  return `(${words.map((w) => w.length).join(", ")})`
}

/**
 * A clue prepared for the layout engine, with metadata for reassembly.
 * For split multi-word answers, each fragment gets its own VariantClue.
 * For joined multi-word answers, the concatenated form is a single VariantClue.
 */
export interface VariantClue {
  clue: string
  answer: string        // the engine-level word (fragment or joined)
  identifier: number    // index into the original RawClue[]
  subId: number         // fragment index (0 for single/joined)
  origAnswer: string    // the original multi-word answer (for display)
}

/** Move words from smaller connected components to unplaced. Keeps largest island only. */
function removeIslands(
  result: LayoutWord[],
  unplacedClues: RawClue[],
  variantMap: Map<string, VariantClue>,
): LayoutWord[] {
  if (result.length <= 1) return result

  // Map each cell to the word indices that occupy it (engine coords, before RTL flip)
  const cellToWords = new Map<string, number[]>()
  result.forEach((d, idx) => {
    const cells = wordCells(d)
    for (const key of cells) {
      const arr = cellToWords.get(key) ?? []
      arr.push(idx)
      cellToWords.set(key, arr)
    }
  })

  // Build word-level adjacency from shared cells
  const adj: Set<number>[] = result.map(() => new Set<number>())
  for (const indices of cellToWords.values()) {
    for (let i = 0; i < indices.length; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        adj[indices[i]].add(indices[j])
        adj[indices[j]].add(indices[i])
      }
    }
  }

  // BFS to find connected components
  const visited = new Set<number>()
  const components: number[][] = []
  for (let i = 0; i < result.length; i++) {
    if (visited.has(i)) continue
    const component: number[] = []
    const queue = [i]
    visited.add(i)
    while (queue.length > 0) {
      const node = queue.shift()!
      component.push(node)
      for (const neighbor of adj[node]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    }
    components.push(component)
  }

  if (components.length <= 1) return result

  // Keep only the largest component
  const largest = components.reduce((a, b) => (a.length >= b.length ? a : b))
  const keepSet = new Set(largest)

  for (let i = 0; i < result.length; i++) {
    if (keepSet.has(i)) continue
    const d = result[i]
    const vc = variantMap.get(`${d.clue}|${d.answer}`)
    if (!unplacedClues.some((u) => u.clue === d.clue)) {
      unplacedClues.push({ clue: d.clue, answer: vc?.origAnswer ?? d.answer })
    }
  }

  return result.filter((_, i) => keepSet.has(i))
}

/** Get the set of cell keys occupied by a word (engine coords, before RTL flip). */
function wordCells(d: LayoutWord): string[] {
  const cells: string[] = []
  if (d.orientation === "across") {
    for (let i = 0; i < d.answer.length; i++) {
      cells.push(`${d.starty},${d.startx + i}`)
    }
  } else if (d.orientation === "down") {
    for (let i = 0; i < d.answer.length; i++) {
      cells.push(`${d.starty + i},${d.startx}`)
    }
  }
  return cells
}

/** Remove split multi-word answers where not all fragments were placed. */
function removeIncompleteSplits(
  result: LayoutWord[],
  variantClues: VariantClue[],
  unplacedClues: RawClue[],
  variantMap: Map<string, VariantClue>,
): LayoutWord[] {
  const fragmentsNeeded = new Map<number, number>()
  for (const vc of variantClues) {
    fragmentsNeeded.set(vc.identifier, (fragmentsNeeded.get(vc.identifier) ?? 0) + 1)
  }
  const fragmentsPlaced = new Map<number, number>()
  for (const d of result) {
    const vc = variantMap.get(`${d.clue}|${d.answer}`)
    if (vc) {
      fragmentsPlaced.set(vc.identifier, (fragmentsPlaced.get(vc.identifier) ?? 0) + 1)
    }
  }
  const incompleteIds = new Set<number>()
  for (const [id, needed] of fragmentsNeeded) {
    if (needed > 1 && (fragmentsPlaced.get(id) ?? 0) < needed) {
      incompleteIds.add(id)
    }
  }
  if (incompleteIds.size === 0) return result

  for (const d of result) {
    const vc = variantMap.get(`${d.clue}|${d.answer}`)
    if (vc && incompleteIds.has(vc.identifier)) {
      if (!unplacedClues.some((u) => u.clue === d.clue)) {
        unplacedClues.push({ clue: d.clue, answer: vc.origAnswer })
      }
    }
  }
  return result.filter((d) => {
    const vc = variantMap.get(`${d.clue}|${d.answer}`)
    return !vc || !incompleteIds.has(vc.identifier)
  })
}

/**
 * Post-engine processing: filter unplaced, RTL flip, grid build, numbering, clue extraction.
 * Takes raw engine output + variant clues and produces a full GeneratorResult.
 */
export function buildGeneratorResult(
  engineResult: LayoutEngineResult,
  variantClues: VariantClue[],
): GeneratorResult {
  // Build variant lookup early — used for split enforcement and metadata attachment
  const variantMap = new Map<string, VariantClue>()
  for (const vc of variantClues) {
    variantMap.set(`${vc.clue}|${vc.answer}`, vc)
  }

  // 1. Filter out unplaced entries
  const unplacedRaw = engineResult.result.filter(
    (d) => !d.startx || d.startx < 1 || !d.starty || d.starty < 1 || !d.orientation || d.orientation === "none"
  )
  const unplacedClues: RawClue[] = Array.from(
    new Map<string, RawClue>(
      unplacedRaw.map((d) => [d.clue, { clue: d.clue, answer: d.answer }])
    ).values()
  )

  let result = engineResult.result.filter(
    (d) => d.startx && d.startx > 0 && d.starty && d.starty > 0 && d.orientation !== "none"
  ) as LayoutWord[]

  // 1b. Enforce single connected component — no islands.
  // Keep only the largest connected cluster; move the rest to unplaced.
  result = removeIslands(result, unplacedClues, variantMap)

  // 1c. Enforce split completeness: if a multi-word answer was split,
  // ALL its fragments must be placed. Remove partially-placed splits.
  // (Runs after island removal so orphaned fragments from removed islands are caught.)
  result = removeIncompleteSplits(result, variantClues, unplacedClues, variantMap)

  // 1d. Re-check islands: removing incomplete splits may have broken a bridge word
  // that connected two components, creating new islands.
  result = removeIslands(result, unplacedClues, variantMap)

  const cols: number = engineResult.cols
  const rows: number = engineResult.rows

  // 2. RTL flip: mirror startx
  result = result.map((d: LayoutWord) => ({
    ...d,
    origStartx: d.startx,
    startx: cols + 1 - d.startx,
  }))

  // 3. Sort: top-to-bottom, right-to-left (RTL)
  result.sort((a, b) => {
    if (a.starty !== b.starty) return a.starty - b.starty
    return -(a.startx - b.startx)
  })

  // 4. Re-assign sequential position numbers
  let posCounter = 0
  let prevX = -1
  let prevY = -1
  result.forEach((d) => {
    if (d.startx !== prevX || d.starty !== prevY) {
      prevX = d.startx
      prevY = d.starty
      posCounter++
    }
    d.position = posCounter
  })

  // 5. Build CrosswordCell[][] grid
  const grid: CrosswordCell[][] = []
  for (let r = 0; r < rows; r++) {
    const row: CrosswordCell[] = []
    for (let c = 0; c < cols; c++) {
      row.push({ isBlocked: true })
    }
    grid.push(row)
  }

  result.forEach((d) => {
    if (d.orientation === "across") {
      for (let i = 0; i < d.answer.length; i++) {
        const cell = grid[d.starty - 1][d.startx - 1 - i]
        cell.isBlocked = false
        cell.letter = d.answer.charAt(i)
      }
    }
    if (d.orientation === "down") {
      for (let i = 0; i < d.answer.length; i++) {
        const cell = grid[d.starty - 1 + i][d.startx - 1]
        cell.isBlocked = false
        cell.letter = d.answer.charAt(i)
      }
    }
  })

  // Set position numbers on cells
  result.forEach((d) => {
    const cell = grid[d.starty - 1][d.startx - 1]
    if (!cell.number) {
      cell.number = d.position
    }
  })

  // 6. Attach variant metadata (identifier, subId, origAnswer) to layout words
  result.forEach((d) => {
    const vc = variantMap.get(`${d.clue}|${d.answer}`)
    if (vc) {
      d.identifier = vc.identifier
      d.subId = vc.subId
      d.origAnswer = vc.origAnswer
    }
  })

  // 7. Build split-fragment cross-references
  // Group placed words by identifier to find split siblings
  const fragmentsByIdentifier = new Map<number, typeof result>()
  for (const d of result) {
    if (d.identifier === undefined) continue
    const group = fragmentsByIdentifier.get(d.identifier)
    if (group) group.push(d)
    else fragmentsByIdentifier.set(d.identifier, [d])
  }

  const orientationLabel = (o: string) => o === "across" ? "מאוזן" : "מאונך"

  const isSplitSecondary = (d: typeof result[0]): boolean => {
    if (d.identifier === undefined) return false
    const siblings = fragmentsByIdentifier.get(d.identifier)
    if (!siblings || siblings.length <= 1) return false
    const sorted = [...siblings].sort((a, b) => (a.subId ?? 0) - (b.subId ?? 0))
    return d !== sorted[0]
  }

  const buildSplitClue = (d: typeof result[0]): string => {
    if (d.identifier === undefined) return d.clue
    const siblings = fragmentsByIdentifier.get(d.identifier)
    if (!siblings || siblings.length <= 1) return d.clue
    // Sort by subId so first fragment (subId=0) gets the definition
    const sorted = [...siblings].sort((a, b) => (a.subId ?? 0) - (b.subId ?? 0))
    if (d === sorted[0]) {
      // First fragment: show definition + references to all other fragments
      const refs = sorted.slice(1).map(s => `${s.position} ${orientationLabel(s.orientation)}`)
      return `${d.clue} (יחד עם ${refs.join(" ו\u00A0-\u00A0")})`
    } else {
      // Later fragments: "see" the first fragment
      const first = sorted[0]
      return `ראה ${first.position} ${orientationLabel(first.orientation)}`
    }
  }

  // 8. Extract numbered clues
  const clues_across: NumberedClue[] = result
    .filter((d) => d.orientation === "across")
    .map((d) => ({
      number: d.position,
      clue: buildSplitClue(d),
      answer: d.answer,
      answerLength: isSplitSecondary(d) ? "" : formatAnswerLength((d.origAnswer as string) || d.answer),
    }))

  const clues_down: NumberedClue[] = result
    .filter((d) => d.orientation === "down")
    .map((d) => ({
      number: d.position,
      clue: buildSplitClue(d),
      answer: d.answer,
      answerLength: isSplitSecondary(d) ? "" : formatAnswerLength((d.origAnswer as string) || d.answer),
    }))

  return {
    grid,
    clues_across,
    clues_down,
    unplacedClues,
    layout_result: result,
    rows,
    cols,
    score: engineResult.score,
  }
}

/**
 * Run the layout engine on a set of variant clues (already prepared),
 * with multiple shuffle attempts, and return the best GeneratorResult.
 */
export function generateFromVariant(
  variantClues: VariantClue[],
  attempts: number,
): GeneratorResult {
  const engineInput = variantClues.map((vc) => ({ clue: vc.clue, answer: vc.answer }))
  const engineResult = generateLayout(engineInput, { attempts })
  return buildGeneratorResult(engineResult, variantClues)
}

