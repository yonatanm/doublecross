import type { CrosswordCell, LayoutWord } from "@/types/crossword"

/** Check if a cell has letters in all 4 neighbors. */
function hasLetterAllSides(grid: CrosswordCell[][], r: number, c: number, rows: number, cols: number): boolean {
  const hasLetter = (nr: number, nc: number) => {
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return false
    const cell = grid[nr]?.[nc]
    return cell && !cell.isBlocked && !!cell.letter
  }
  return hasLetter(r - 1, c) && hasLetter(r + 1, c) && hasLetter(r, c - 1) && hasLetter(r, c + 1)
}

interface CrosswordGridProps {
  grid: CrosswordCell[][]
  cols: number
  rows: number
  layoutResult: LayoutWord[]
  highlightedCells: string[]
  focusedCells?: string[][]
  onCellClick: (pos: string) => void
  interactive: boolean
  showLetters: boolean
  cellSize?: number
  showNumbers?: boolean
  // Solve mode props
  solveMode?: boolean
  userLetters?: Record<string, string>
  focusedPos?: string | null
  hintCells?: Set<string>
  wordCells?: Set<string>
  correctCells?: Set<string>
}

export default function CrosswordGrid({
  grid,
  cols,
  rows,
  layoutResult,
  highlightedCells,
  focusedCells = [],

  onCellClick,
  interactive,
  showLetters,
  cellSize = 40,
  showNumbers = true,
  // Solve mode
  solveMode = false,
  userLetters,
  focusedPos,
  hintCells,
  wordCells,
  correctCells,
}: CrosswordGridProps) {
  const findLabel = (r: number, c: number) => {
    const word = layoutResult.find((d) => d.starty === r + 1 && d.startx === c + 1)
    return word?.position
  }

  // Compute per-cell focus border styles (green border on outer edges of focused word groups)
  const focusStyleMap = new Map<string, React.CSSProperties>()
  const green = "3px solid #22c55e"
  for (const group of focusedCells) {
    if (group.length === 0) continue
    const positions = group.map((pos) => {
      const [r, c] = pos.split("-").map(Number)
      return { r, c, pos }
    })
    const minR = Math.min(...positions.map((p) => p.r))
    const maxR = Math.max(...positions.map((p) => p.r))
    const minC = Math.min(...positions.map((p) => p.c))
    const maxC = Math.max(...positions.map((p) => p.c))
    for (const p of positions) {
      focusStyleMap.set(p.pos, {
        borderTop: p.r === minR ? green : undefined,
        borderBottom: p.r === maxR ? green : undefined,
        borderLeft: p.c === minC ? green : undefined,
        borderRight: p.c === maxC ? green : undefined,
      })
    }
  }

  return (
    <table
        className="crossword-grid"
        style={{
          '--cell-size': `${cellSize}px`,
          fontSize: `${Math.max(8, cellSize * 0.45)}px`,
        } as React.CSSProperties}
      >
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => {
                const cell = grid[r]?.[c]
                if (!cell) return <td key={c} className="crossword-cell blocked" />
                const pos = `${r}-${c}`
                const isHighlighted = highlightedCells.includes(pos)
                const label = findLabel(r, c)

                if (cell.isBlocked || !cell.letter) {
                  const isInterior = hasLetterAllSides(grid, r, c, rows, cols)
                  return (
                    <td key={c} className={`crossword-cell ${isInterior ? "blocked-interior" : "blocked"}`} />
                  )
                }

                if (solveMode) {
                  const isFocused = focusedPos === pos
                  const isHint = hintCells?.has(pos) ?? false
                  const isInWord = wordCells?.has(pos) ?? false
                  const isCorrect = correctCells?.has(pos) ?? false
                  const letter = isHint ? cell.letter : userLetters?.[pos] || ""

                  return (
                    <td
                      key={c}
                      className={[
                        "crossword-cell interactive cursor-pointer",
                        isCorrect ? "solve-correct" : "",
                        isFocused ? "solve-focused" : "",
                        !isFocused && !isCorrect && isInWord ? "solve-word" : "",
                        !isFocused && !isCorrect && !isInWord && isHint ? "solve-hint" : "",
                      ].join(" ")}
                      onClick={() => onCellClick(pos)}
                    >
                      {letter && <span>{letter}</span>}
                      {showNumbers && label != null && (
                        <span className="cell-number">{label}</span>
                      )}
                    </td>
                  )
                }

                const shouldShowLetter = interactive || (showLetters && isHighlighted)

                return (
                  <td
                    key={c}
                    className={[
                      "crossword-cell",
                      interactive ? "interactive cursor-pointer" : "",
                      isHighlighted ? "highlighted" : "",
                    ].join(" ")}
                    style={focusStyleMap.get(pos)}
                    onClick={() => interactive && onCellClick(pos)}
                  >
                    {shouldShowLetter && cell.letter && (
                      <span>{cell.letter}</span>
                    )}
                    {showNumbers && label != null && (
                      <span className="cell-number">{label}</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
  )
}
