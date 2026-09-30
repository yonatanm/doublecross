import type { LayoutWord, NumberedClue, RawClue } from "@/types/crossword"
import { cleanAnswer } from "@/lib/crossword-generator"

/** Sync updated definitions from raw_clues into numbered clues.
 *  Match strategy per numbered clue:
 *  - Answer is unique among raw clues → match by answer text (robust to line reordering/edits)
 *  - Answer appears more than once → match by grid position via layout_result identifier
 *    (robust to duplicate answers; each placed word keeps its own line's definition)
 *  Preserves "ראה" cross-references and "(יחד עם...)" suffixes. */
export function syncClueDefinitions(
  numberedClues: NumberedClue[],
  rawClues: RawClue[],
  orientation: "across" | "down",
  layoutResult?: LayoutWord[],
): NumberedClue[] {
  // Build lookup: cleaned answer (without spaces) → definition (for single-word matches)
  const defByAnswer = new Map<string, string>()
  const answerCounts = new Map<string, number>()
  for (const rc of rawClues) {
    const key = cleanAnswer(rc.answer).replace(/ /g, "")
    defByAnswer.set(key, rc.clue)
    answerCounts.set(key, (answerCounts.get(key) ?? 0) + 1)
  }

  // Build lookup: grid position → definition (via layout_result identifier)
  const defByPosition = new Map<number, string>()
  if (layoutResult) {
    for (const w of layoutResult) {
      if (w.orientation === orientation && w.identifier !== undefined && w.identifier < rawClues.length) {
        defByPosition.set(w.position, rawClues[w.identifier].clue)
      }
    }
  }

  return numberedClues.map((nc) => {
    // Skip cross-reference clues ("ראה 3 מאוזן")
    if (nc.clue.startsWith("ראה ")) return nc
    const key = cleanAnswer(nc.answer).replace(/ /g, "")
    const isDuplicateAnswer = (answerCounts.get(key) ?? 0) > 1
    const newDef = isDuplicateAnswer
      ? (defByPosition.get(nc.number) ?? defByAnswer.get(key))
      : (defByAnswer.get(key) ?? defByPosition.get(nc.number))
    if (!newDef) return nc
    // Preserve "(יחד עם...)" suffix if present
    const suffixMatch = nc.clue.match(/(\s*\(יחד עם .+\))$/)
    const suffix = suffixMatch ? suffixMatch[1] : ""
    return { ...nc, clue: newDef + suffix }
  })
}
