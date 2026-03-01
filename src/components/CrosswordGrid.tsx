import type { CrosswordCell, LayoutWord } from "@/types/crossword"

interface CrosswordGridProps {
  grid: CrosswordCell[][]
  cols: number
  rows: number
  layoutResult: LayoutWord[]
  highlightedCells: string[]
  focusedCells?: string[]
  onCellClick: (pos: string) => void
  interactive: boolean
  showLetters: boolean
  cellSize?: number
  showNumbers?: boolean
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
}: CrosswordGridProps) {
  const findLabel = (r: number, c: number) => {
    const word = layoutResult.find((d) => d.starty === r + 1 && d.startx === c + 1)
    return word?.position
  }

  return (
    <div
      className="crossword-grid inline-grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        fontSize: `${Math.max(8, cellSize * 0.45)}px`,
      }}
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => c).map((c) => {
          const cell = grid[r]?.[c]
          if (!cell) return null
          const pos = `${r}-${c}`
          const isHighlighted = highlightedCells.includes(pos)
          const isFocused = focusedCells.includes(pos)
          const label = findLabel(r, c)

          if (cell.isBlocked) {
            return (
              <span key={pos} className="crossword-cell blocked" style={{ width: cellSize, height: cellSize }} />
            )
          }

          const shouldShowLetter = interactive || (showLetters && isHighlighted)

          return (
            <span
              key={pos}
              className={[
                "crossword-cell",
                interactive ? "interactive cursor-pointer" : "",
                isHighlighted ? "highlighted" : "",
                isFocused ? "focused" : "",
              ].join(" ")}
              style={{ width: cellSize, height: cellSize }}
              onClick={() => interactive && onCellClick(pos)}
            >
              {shouldShowLetter && cell.letter && (
                <span>{cell.letter}</span>
              )}
              {showNumbers && label != null && (
                <span className="cell-number">{label}</span>
              )}
            </span>
          )
        })
      )}
    </div>
  )
}
