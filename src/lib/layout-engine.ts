// Inline crossword layout engine
// Ported from crossword-layout-generator by Michael Wehar (MIT License)
// Additional credits: Itay Livni, Michael Blättler
// Extended with scoring and multi-attempt generation

// --- Public types ---

export interface LayoutScore {
  overall: number            // 0-1 composite
  placementRatio: number     // placed words / total words
  sizeRatio: number          // min(rows,cols)/max(rows,cols) — squareness
  density: number            // filled cells / total cells
  interconnectedness: number // crossing cells / filled cells
}

export interface LayoutEngineOptions {
  attempts?: number                          // default 10
  placementWeights?: [number, number, number, number]  // internal per-word scoring
  layoutWeights?: {                          // layout comparison scoring
    placementRatio?: number   // default 0.35
    density?: number          // default 0.25
    interconnectedness?: number // default 0.25
    sizeRatio?: number        // default 0.15
  }
}

export interface LayoutInputWord {
  clue: string
  answer: string
}

interface InternalWord {
  clue: string
  answer: string
  startx?: number
  starty?: number
  position?: number
  orientation?: "across" | "down" | "none"
  [key: string]: unknown
}

export interface LayoutEngineResult {
  result: InternalWord[]
  rows: number
  cols: number
  score: LayoutScore
}

// --- Internal types ---

interface PlacementCandidate {
  score: number
  word: string
  index: number
  row: number
  col: number
  orientation: 0 | 1  // 0 = across, 1 = down
}

interface TableData {
  table: string[][]
  result: InternalWord[]
}

interface TrimmedData extends TableData {
  rows: number
  cols: number
}

// --- Math helpers ---

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}

function weightedAverage(weights: number[], values: number[]): number {
  let temp = 0
  for (let k = 0; k < weights.length; k++) {
    temp += weights[k] * values[k]
  }
  return temp
}

// --- Component scores for per-word placement ---

// 1. Number of connections relative to word length
function computeScore1(connections: number, word: string): number {
  return connections / (word.length / 2)
}

// 2. Distance from center of grid
function computeScore2(rows: number, cols: number, i: number, j: number): number {
  return 1 - distance(rows / 2, cols / 2, i, j) / (rows / 2 + cols / 2)
}

// 3. Vertical vs horizontal balance
function computeScore3(a: number, b: number, verticalCount: number, totalCount: number): number {
  if (verticalCount > totalCount / 2) return a
  if (verticalCount < totalCount / 2) return b
  return 0.5
}

// 4. Word length relative to grid dimension
function computeScore4(val: number, word: string): number {
  return word.length / val
}

// --- Table functions ---

function initTable(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => "-"))
}

function isConflict(
  table: string[][],
  isVertical: boolean,
  character: string,
  i: number,
  j: number,
): boolean {
  if (character !== table[i][j] && table[i][j] !== "-") return true
  if (table[i][j] === "-" && !isVertical && i + 1 < table.length && table[i + 1][j] !== "-") return true
  if (table[i][j] === "-" && !isVertical && i - 1 >= 0 && table[i - 1][j] !== "-") return true
  if (table[i][j] === "-" && isVertical && j + 1 < table[i].length && table[i][j + 1] !== "-") return true
  if (table[i][j] === "-" && isVertical && j - 1 >= 0 && table[i][j - 1] !== "-") return true
  return false
}

function attemptToInsert(
  rows: number,
  cols: number,
  table: string[][],
  weights: [number, number, number, number],
  verticalCount: number,
  totalCount: number,
  word: string,
  index: number,
): PlacementCandidate | null {
  let bestI = 0
  let bestJ = 0
  let bestO: 0 | 1 = 0
  let bestScore = -1

  // Horizontal
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols - word.length + 1; j++) {
      let isValid = true
      let atleastOne = false
      let connections = 0
      let prevFlag = false

      for (let k = 0; k < word.length; k++) {
        if (isConflict(table, false, word.charAt(k), i, j + k)) {
          isValid = false
          break
        } else if (table[i][j + k] === "-") {
          prevFlag = false
          atleastOne = true
        } else {
          if (prevFlag) {
            isValid = false
            break
          } else {
            prevFlag = true
            connections += 1
          }
        }
      }

      if (j - 1 >= 0 && table[i][j - 1] !== "-") {
        isValid = false
      } else if (j + word.length < cols && table[i][j + word.length] !== "-") {
        isValid = false
      }

      if (isValid && atleastOne && word.length > 1) {
        const tempScore1 = computeScore1(connections, word)
        const tempScore2 = computeScore2(rows, cols, i, j + word.length / 2)
        const tempScore3 = computeScore3(1, 0, verticalCount, totalCount)
        const tempScore4 = computeScore4(rows, word)
        const tempScore = weightedAverage(weights, [tempScore1, tempScore2, tempScore3, tempScore4])

        if (tempScore > bestScore) {
          bestScore = tempScore
          bestI = i
          bestJ = j
          bestO = 0
        }
      }
    }
  }

  // Vertical
  for (let i = 0; i < rows - word.length + 1; i++) {
    for (let j = 0; j < cols; j++) {
      let isValid = true
      let atleastOne = false
      let connections = 0
      let prevFlag = false

      for (let k = 0; k < word.length; k++) {
        if (isConflict(table, true, word.charAt(k), i + k, j)) {
          isValid = false
          break
        } else if (table[i + k][j] === "-") {
          prevFlag = false
          atleastOne = true
        } else {
          if (prevFlag) {
            isValid = false
            break
          } else {
            prevFlag = true
            connections += 1
          }
        }
      }

      if (i - 1 >= 0 && table[i - 1][j] !== "-") {
        isValid = false
      } else if (i + word.length < rows && table[i + word.length][j] !== "-") {
        isValid = false
      }

      if (isValid && atleastOne && word.length > 1) {
        const tempScore1 = computeScore1(connections, word)
        const tempScore2 = computeScore2(rows, cols, i + word.length / 2, j)
        const tempScore3 = computeScore3(0, 1, verticalCount, totalCount)
        const tempScore4 = computeScore4(rows, word)
        const tempScore = weightedAverage(weights, [tempScore1, tempScore2, tempScore3, tempScore4])

        if (tempScore > bestScore) {
          bestScore = tempScore
          bestI = i
          bestJ = j
          bestO = 1
        }
      }
    }
  }

  if (bestScore > -1) {
    return { score: bestScore, word, index, row: bestI, col: bestJ, orientation: bestO }
  }
  return null
}

function addWord(candidate: PlacementCandidate, words: InternalWord[], table: string[][]): void {
  const { word, index, row, col, orientation } = candidate

  words[index].startx = col + 1
  words[index].starty = row + 1

  if (orientation === 0) {
    for (let k = 0; k < word.length; k++) {
      table[row][col + k] = word.charAt(k)
    }
    words[index].orientation = "across"
  } else {
    for (let k = 0; k < word.length; k++) {
      table[row + k][col] = word.charAt(k)
    }
    words[index].orientation = "down"
  }
}

function generateTable(
  table: string[][],
  rows: number,
  cols: number,
  words: InternalWord[],
  weights: [number, number, number, number],
): TableData {
  let verticalCount = 0
  let totalCount = 0

  for (let _outerIndex = 0; _outerIndex < words.length; _outerIndex++) {
    let best: PlacementCandidate | null = null
    for (let innerIndex = 0; innerIndex < words.length; innerIndex++) {
      if (words[innerIndex].answer && words[innerIndex].startx === undefined) {
        const temp = attemptToInsert(
          rows, cols, table, weights, verticalCount, totalCount,
          words[innerIndex].answer, innerIndex,
        )
        if (temp && (!best || temp.score > best.score)) {
          best = temp
        }
      }
    }

    if (!best) break
    addWord(best, words, table)
    if (best.orientation === 1) verticalCount += 1
    totalCount += 1
  }

  for (let index = 0; index < words.length; index++) {
    if (words[index].startx === undefined) {
      words[index].orientation = "none"
    }
  }

  return { table, result: words }
}

function removeIsolatedWords(data: TableData): TableData {
  const oldTable = data.table
  const words = data.result
  const rows = oldTable.length
  const cols = oldTable[0].length
  let newTable = initTable(rows, cols)

  // Mark intersections
  for (const word of words) {
    if (word.orientation === "across") {
      const i = word.starty! - 1
      const j = word.startx! - 1
      for (let k = 0; k < word.answer.length; k++) {
        if (newTable[i][j + k] === "-") newTable[i][j + k] = "O"
        else if (newTable[i][j + k] === "O") newTable[i][j + k] = "X"
      }
    } else if (word.orientation === "down") {
      const i = word.starty! - 1
      const j = word.startx! - 1
      for (let k = 0; k < word.answer.length; k++) {
        if (newTable[i + k][j] === "-") newTable[i + k][j] = "O"
        else if (newTable[i + k][j] === "O") newTable[i + k][j] = "X"
      }
    }
  }

  // Remove words with no intersections
  for (const word of words) {
    let isIsolated = true
    if (word.orientation === "across") {
      const i = word.starty! - 1
      const j = word.startx! - 1
      for (let k = 0; k < word.answer.length; k++) {
        if (newTable[i][j + k] === "X") { isIsolated = false; break }
      }
    } else if (word.orientation === "down") {
      const i = word.starty! - 1
      const j = word.startx! - 1
      for (let k = 0; k < word.answer.length; k++) {
        if (newTable[i + k][j] === "X") { isIsolated = false; break }
      }
    }
    if (word.orientation !== "none" && isIsolated) {
      delete word.startx
      delete word.starty
      delete word.position
      word.orientation = "none"
    }
  }

  // Redraw table
  newTable = initTable(rows, cols)
  for (const word of words) {
    if (word.orientation === "across") {
      const i = word.starty! - 1
      const j = word.startx! - 1
      for (let k = 0; k < word.answer.length; k++) {
        newTable[i][j + k] = word.answer.charAt(k)
      }
    } else if (word.orientation === "down") {
      const i = word.starty! - 1
      const j = word.startx! - 1
      for (let k = 0; k < word.answer.length; k++) {
        newTable[i + k][j] = word.answer.charAt(k)
      }
    }
  }

  return { table: newTable, result: words }
}

function trimTable(data: TableData): TrimmedData {
  const table = data.table
  const rows = table.length
  const cols = table[0].length

  let leftMost = cols
  let topMost = rows
  let rightMost = -1
  let bottomMost = -1

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (table[i][j] !== "-") {
        if (j < leftMost) leftMost = j
        if (j > rightMost) rightMost = j
        if (i < topMost) topMost = i
        if (i > bottomMost) bottomMost = i
      }
    }
  }

  const trimmedRows = Math.max(bottomMost - topMost + 1, 0)
  const trimmedCols = Math.max(rightMost - leftMost + 1, 0)
  const trimmedTable = initTable(trimmedRows, trimmedCols)

  for (let i = topMost; i < bottomMost + 1; i++) {
    for (let j = leftMost; j < rightMost + 1; j++) {
      trimmedTable[i - topMost][j - leftMost] = table[i][j]
    }
  }

  const words = data.result
  for (const word of words) {
    if (word.startx !== undefined) {
      word.startx -= leftMost
      word.starty! -= topMost
    }
  }

  return { table: trimmedTable, result: words, rows: trimmedRows, cols: trimmedCols }
}

function assignPositions(words: InternalWord[]): void {
  const positions: Record<string, number> = {}
  for (const word of words) {
    if (word.orientation !== "none" && word.orientation !== undefined) {
      const key = word.starty + "," + word.startx
      if (key in positions) {
        word.position = positions[key]
      } else {
        positions[key] = Object.keys(positions).length + 1
        word.position = positions[key]
      }
    }
  }
}

function computeDimension(words: LayoutInputWord[], factor: number): number {
  let temp = 0
  for (const word of words) {
    if (temp < word.answer.length) temp = word.answer.length
  }
  return temp * factor
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// --- Layout scoring ---

function scoreLayout(
  result: InternalWord[],
  totalInputWords: number,
  rows: number,
  cols: number,
  table: string[][],
  weights: Required<NonNullable<LayoutEngineOptions["layoutWeights"]>>,
): LayoutScore {
  const placed = result.filter((w) => w.orientation !== "none" && w.orientation !== undefined)
  const placementRatio = totalInputWords > 0 ? placed.length / totalInputWords : 0

  // Density: filled cells / total cells
  let filledCells = 0
  const totalCells = rows * cols
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (table[i][j] !== "-") filledCells++
    }
  }
  const density = totalCells > 0 ? filledCells / totalCells : 0

  // Interconnectedness: cells that are part of both an across and a down word / filled cells
  const cellUsage = initTable(rows, cols) // track "H", "V", "X" (both)
  for (const word of placed) {
    if (word.orientation === "across") {
      const r = word.starty! - 1
      const c = word.startx! - 1
      for (let k = 0; k < word.answer.length; k++) {
        const cur = cellUsage[r][c + k]
        cellUsage[r][c + k] = cur === "-" ? "H" : cur === "V" ? "X" : cur
      }
    } else if (word.orientation === "down") {
      const r = word.starty! - 1
      const c = word.startx! - 1
      for (let k = 0; k < word.answer.length; k++) {
        const cur = cellUsage[r + k][c]
        cellUsage[r + k][c] = cur === "-" ? "V" : cur === "H" ? "X" : cur
      }
    }
  }
  let crossingCells = 0
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (cellUsage[i][j] === "X") crossingCells++
    }
  }
  const interconnectedness = filledCells > 0 ? crossingCells / filledCells : 0

  // Size ratio (squareness)
  const sizeRatio = rows > 0 && cols > 0 ? Math.min(rows, cols) / Math.max(rows, cols) : 0

  const overall =
    weights.placementRatio * placementRatio +
    weights.density * density +
    weights.interconnectedness * interconnectedness +
    weights.sizeRatio * sizeRatio

  return { overall, placementRatio, sizeRatio, density, interconnectedness }
}

// --- Single-pass generation (one attempt) ---

function generateSinglePass(
  words: InternalWord[],
  placementWeights: [number, number, number, number],
): TrimmedData {
  const dim = computeDimension(words, 3)
  const rows = dim
  const cols = dim
  const blankTable = initTable(rows, cols)
  const tableData = generateTable(blankTable, rows, cols, words, placementWeights)
  const cleaned = removeIsolatedWords(tableData)
  const trimmed = trimTable(cleaned)
  assignPositions(trimmed.result)
  return trimmed
}

export const DEFAULT_LAYOUT_WEIGHTS = {
  placementRatio: 0.35,
  density: 0.25,
  interconnectedness: 0.25,
  sizeRatio: 0.15,
} as const

// --- Public API ---

export function generateLayout(
  inputWords: LayoutInputWord[],
  options?: LayoutEngineOptions,
): LayoutEngineResult {
  const attempts = options?.attempts ?? 10
  const placementWeights = options?.placementWeights ?? [0.7, 0.15, 0.1, 0.05]
  const layoutWeights = {
    placementRatio: options?.layoutWeights?.placementRatio ?? DEFAULT_LAYOUT_WEIGHTS.placementRatio,
    density: options?.layoutWeights?.density ?? DEFAULT_LAYOUT_WEIGHTS.density,
    interconnectedness: options?.layoutWeights?.interconnectedness ?? DEFAULT_LAYOUT_WEIGHTS.interconnectedness,
    sizeRatio: options?.layoutWeights?.sizeRatio ?? DEFAULT_LAYOUT_WEIGHTS.sizeRatio,
  }

  let bestResult: TrimmedData | null = null
  let bestScore: LayoutScore | null = null

  for (let attempt = 0; attempt < attempts; attempt++) {
    // Deep-clone and shuffle input words
    const shuffled = shuffleArray(inputWords.map((w) => ({ ...w }))) as InternalWord[]

    const result = generateSinglePass(shuffled, placementWeights)
    const score = scoreLayout(
      result.result, inputWords.length,
      result.rows, result.cols, result.table,
      layoutWeights,
    )

    if (!bestScore || score.overall > bestScore.overall) {
      bestResult = result
      bestScore = score
    }
  }

  // Fallback for empty input
  if (!bestResult || !bestScore) {
    return { result: [], rows: 0, cols: 0, score: { overall: 0, placementRatio: 0, sizeRatio: 0, density: 0, interconnectedness: 0 } }
  }

  return {
    result: bestResult.result,
    rows: bestResult.rows,
    cols: bestResult.cols,
    score: bestScore,
  }
}
