export interface CrosswordCell {
  letter?: string
  isBlocked: boolean
  number?: number
}

export interface RawClue {
  clue: string
  answer: string
}

export interface NumberedClue {
  number: number
  clue: string
  answer: string
  answerLength: string // e.g. "(4,2)" for multi-word
}

export interface LayoutWord {
  clue: string
  answer: string
  startx: number
  starty: number
  position: number
  orientation: "across" | "down" | "none"
  origStartx?: number
  origAnswer?: string
  identifier?: number
  subId?: number
}

export interface Crossword {
  id?: string
  title: string
  description?: string
  grid_size: number
  grid: CrosswordCell[][]
  raw_clues: RawClue[]
  clues_across: NumberedClue[]
  clues_down: NumberedClue[]
  highlighted_cells: string[] // "row-col" format
  status: "draft" | "published" | "archived"
  difficulty: "easy" | "medium" | "hard"
  createdAt?: { seconds: number; nanoseconds: number }
  updatedAt?: { seconds: number; nanoseconds: number }
  userId?: string
  userEmail?: string
  layout_result?: LayoutWord[]
  layout_rows?: number
  layout_cols?: number
}

export interface GeneratorResult {
  grid: CrosswordCell[][]
  clues_across: NumberedClue[]
  clues_down: NumberedClue[]
  unplacedClues: RawClue[]
  layout_result: LayoutWord[]
  rows: number
  cols: number
}
