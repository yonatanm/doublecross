import type { RawClue, CrosswordCell, NumberedClue, LayoutWord, GeneratorResult } from "@/types/crossword"

// @ts-expect-error — CJS module without types
import clg from "crossword-layout-generator"

// Hebrew final-letter normalization
const FINAL_LETTERS: Record<string, string> = {
  "ך": "כ",
  "ם": "מ",
  "ן": "נ",
  "ף": "פ",
  "ץ": "צ",
}

export function cleanAnswer(answer: string): string {
  const noDblSpaces = answer
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
    .join(" ")
  return noDblSpaces
    .split("")
    .map((ch) => FINAL_LETTERS[ch] || ch)
    .join("")
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatAnswerLength(answer: string): string {
  const words = answer.split(" ").reverse()
  if (words.length === 1) return `(${words[0].length})`
  return `(${words.map((w) => w.length).join(",")})`
}

export function generateCrosswordLayout(rawClues: RawClue[]): GeneratorResult {
  // 1. Normalize Hebrew answers
  const cleaned = rawClues.map((c) => ({
    clue: c.clue,
    answer: cleanAnswer(c.answer),
  }))

  // 2. Shuffle for variety
  const shuffled = shuffle(cleaned)

  // 3. Handle multi-word answers: split by space, track with identifiers
  interface SpaceAwareClue {
    clue: string
    answer: string
    identifier: number
    subId: number
    origAnswer: string
  }

  const spaceAware: SpaceAwareClue[] = []
  shuffled.forEach((item, i) => {
    const answer = item.answer
    const words = answer.split(" ")
    if (words.length <= 1) {
      spaceAware.push({
        clue: item.clue,
        answer: answer.replaceAll(" ", ""),
        identifier: i,
        subId: 0,
        origAnswer: answer,
      })
    } else {
      words.forEach((word, j) => {
        spaceAware.push({
          clue: item.clue,
          answer: word,
          identifier: i,
          subId: j,
          origAnswer: answer,
        })
      })
    }
  })

  // 4. Call generator
  const layout = clg.generateLayout(spaceAware)

  // 5. Filter out unplaced entries
  const unplacedRaw = layout.result.filter(
    (d: LayoutWord) => d.startx < 1 || d.starty < 1 || !d.orientation || d.orientation === "none"
  )
  const unplacedClues: RawClue[] = Array.from(
    new Map<string, RawClue>(
      unplacedRaw.map((d: LayoutWord) => [d.clue, { clue: d.clue, answer: d.answer }])
    ).values()
  )

  let result: LayoutWord[] = layout.result.filter(
    (d: LayoutWord) => d.startx > 0 && d.starty > 0 && d.orientation !== "none"
  )

  const cols: number = layout.cols
  const rows: number = layout.rows

  // 6. RTL flip: mirror startx
  result = result.map((d: LayoutWord) => ({
    ...d,
    origStartx: d.startx,
    startx: cols + 1 - d.startx,
  }))

  // 7. Sort: top-to-bottom, right-to-left (RTL)
  result.sort((a, b) => {
    if (a.starty !== b.starty) return a.starty - b.starty
    return -(a.startx - b.startx)
  })

  // 8. Re-assign sequential position numbers
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

  // 9. Build CrosswordCell[][] grid
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

  // 10. Extract numbered clues
  const clues_across: NumberedClue[] = result
    .filter((d) => d.orientation === "across")
    .map((d) => ({
      number: d.position,
      clue: d.clue,
      answer: d.answer,
      answerLength: formatAnswerLength((d as unknown as SpaceAwareClue).origAnswer || d.answer),
    }))

  const clues_down: NumberedClue[] = result
    .filter((d) => d.orientation === "down")
    .map((d) => ({
      number: d.position,
      clue: d.clue,
      answer: d.answer,
      answerLength: formatAnswerLength((d as unknown as SpaceAwareClue).origAnswer || d.answer),
    }))

  return {
    grid,
    clues_across,
    clues_down,
    unplacedClues,
    layout_result: result,
    rows,
    cols,
  }
}
