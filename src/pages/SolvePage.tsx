import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { Loader2, PartyPopper } from "lucide-react"
import confetti from "canvas-confetti"
import CrosswordGrid from "@/components/CrosswordGrid"
import { getCrossword } from "@/lib/firestore"
import type { Crossword, LayoutWord } from "@/types/crossword"

// Hebrew final-letter normalization (for lenient validation)
const FINAL_TO_NORMAL: Record<string, string> = {
  "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ",
}
function normalizeLetter(ch: string): string {
  return FINAL_TO_NORMAL[ch] || ch
}

function isHebrewChar(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 0x0590 && code <= 0x05FF
}

/** Get the localStorage key for a crossword's solve progress. */
function storageKey(id: string): string {
  return `solve-progress:${id}`
}

export default function SolvePage() {
  const { id } = useParams<{ id: string }>()
  const [crossword, setCrossword] = useState<Crossword | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Solving state
  const [userLetters, setUserLetters] = useState<Record<string, string>>({})
  const [focusedPos, setFocusedPos] = useState<string | null>(null)
  const [direction, setDirection] = useState<"across" | "down">("across")
  const [completed, setCompleted] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  // Fetch crossword
  useEffect(() => {
    if (!id) return
    setLoading(true)
    getCrossword(id)
      .then((cw) => {
        if (!cw) {
          setError("התשבץ לא נמצא")
        } else {
          setCrossword(cw)
          // Restore progress from localStorage
          try {
            const saved = localStorage.getItem(storageKey(id))
            if (saved) setUserLetters(JSON.parse(saved))
          } catch { /* ignore */ }
        }
      })
      .catch((err) => {
        const msg = (err as Error)?.message || ""
        if (msg.includes("permission") || msg.includes("Missing or insufficient permissions")) {
          setError("אין הרשאת קריאה — יש לעדכן את חוקי Firestore לאפשר קריאה ציבורית לתשבצים שפורסמו")
        } else {
          setError("שגיאה בטעינת התשבץ")
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  // Persist progress to localStorage
  useEffect(() => {
    if (!id || !crossword) return
    try {
      localStorage.setItem(storageKey(id), JSON.stringify(userLetters))
    } catch { /* quota */ }
  }, [id, crossword, userLetters])

  // Build hint cells set from highlighted_cells
  const hintCells = useMemo(() => {
    return new Set(crossword?.highlighted_cells || [])
  }, [crossword])

  // Build a map of non-blocked cells for navigation
  const editableCells = useMemo(() => {
    if (!crossword?.grid) return new Set<string>()
    const set = new Set<string>()
    const grid = crossword.grid
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < (grid[r]?.length || 0); c++) {
        const cell = grid[r][c]
        if (cell && !cell.isBlocked) {
          const pos = `${r}-${c}`
          if (!hintCells.has(pos)) {
            set.add(pos)
          }
        }
      }
    }
    return set
  }, [crossword, hintCells])

  // Build lookup from cell position to the words that pass through it
  const cellToWords = useMemo(() => {
    if (!crossword?.layout_result) return new Map<string, LayoutWord[]>()
    const map = new Map<string, LayoutWord[]>()
    for (const w of crossword.layout_result) {
      if (!w.startx || !w.starty || w.orientation === "none") continue
      const cells = getWordCellPositions(w)
      for (const pos of cells) {
        const arr = map.get(pos) ?? []
        arr.push(w)
        map.set(pos, arr)
      }
    }
    return map
  }, [crossword])

  // Get word cell positions for currently focused word
  const currentWordCells = useMemo(() => {
    if (!focusedPos || !cellToWords) return new Set<string>()
    const words = cellToWords.get(focusedPos) || []
    // Pick the word matching current direction, fallback to first
    const word = words.find((w) => w.orientation === direction) || words[0]
    if (!word) return new Set<string>()
    return new Set(getWordCellPositions(word))
  }, [focusedPos, direction, cellToWords])

  // Check completion
  useEffect(() => {
    if (!crossword?.grid || completed) return
    const grid = crossword.grid
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < (grid[r]?.length || 0); c++) {
        const cell = grid[r][c]
        if (!cell || cell.isBlocked) continue
        const pos = `${r}-${c}`
        if (hintCells.has(pos)) continue
        const userLetter = userLetters[pos]
        if (!userLetter) return
        if (normalizeLetter(userLetter) !== normalizeLetter(cell.letter || "")) return
      }
    }
    // All cells match
    setCompleted(true)
    // Fire confetti burst
    const duration = 2000
    const end = Date.now() + duration
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } })
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [userLetters, crossword, hintCells, completed])

  // Find next/prev cell in current direction
  const findNextCell = useCallback((pos: string, dir: "across" | "down", forward: boolean): string | null => {
    const [r, c] = pos.split("-").map(Number)
    if (dir === "across") {
      // Across goes right-to-left (column decreases for forward)
      const nextC = forward ? c - 1 : c + 1
      const nextPos = `${r}-${nextC}`
      if (editableCells.has(nextPos) || hintCells.has(nextPos)) return nextPos
    } else {
      const nextR = forward ? r + 1 : r - 1
      const nextPos = `${nextR}-${c}`
      if (editableCells.has(nextPos) || hintCells.has(nextPos)) return nextPos
    }
    return null
  }, [editableCells, hintCells])

  // Find the next editable (non-hint) cell in direction
  const findNextEditable = useCallback((pos: string, dir: "across" | "down", forward: boolean): string | null => {
    let current = pos
    while (true) {
      const next = findNextCell(current, dir, forward)
      if (!next) return null
      if (editableCells.has(next)) return next
      current = next
    }
  }, [findNextCell, editableCells])

  // Find the first empty cell of the next clue
  const findNextClueFirstEmpty = useCallback((): string | null => {
    if (!crossword?.layout_result || !focusedPos) return null

    // Get all words, sorted by position number
    const words = [...crossword.layout_result]
      .filter((w) => w.orientation !== "none")
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position
        return a.orientation === "across" ? -1 : 1
      })

    // Find which word the cursor is in
    const currentWords = cellToWords.get(focusedPos) || []
    const currentWord = currentWords.find((w) => w.orientation === direction) || currentWords[0]
    if (!currentWord) return null

    const currentIdx = words.findIndex(
      (w) => w.position === currentWord.position && w.orientation === currentWord.orientation
    )

    // Search from next word onwards (wrapping)
    for (let offset = 1; offset <= words.length; offset++) {
      const w = words[(currentIdx + offset) % words.length]
      const cells = getWordCellPositions(w)
      for (const pos of cells) {
        if (editableCells.has(pos) && !userLetters[pos]) {
          return pos
        }
      }
      // If no empty cell in this word, try first editable
      for (const pos of cells) {
        if (editableCells.has(pos)) {
          return pos
        }
      }
    }
    return null
  }, [crossword, focusedPos, direction, cellToWords, editableCells, userLetters])

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!focusedPos || completed) return

    if (e.key === "Tab") {
      e.preventDefault()
      const next = findNextClueFirstEmpty()
      if (next) {
        setFocusedPos(next)
        // Set direction to match the next clue's orientation
        const words = cellToWords.get(next) || []
        if (words.length > 0) {
          setDirection(words[0].orientation as "across" | "down")
        }
      }
      return
    }

    if (e.key === "ArrowRight") {
      e.preventDefault()
      setDirection("across")
      const [r, c] = focusedPos.split("-").map(Number)
      // Right in RTL means column decreases... but visually ArrowRight goes to higher column
      const nextPos = `${r}-${c + 1}`
      if (editableCells.has(nextPos) || hintCells.has(nextPos)) setFocusedPos(nextPos)
      return
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      setDirection("across")
      const [r, c] = focusedPos.split("-").map(Number)
      const nextPos = `${r}-${c - 1}`
      if (editableCells.has(nextPos) || hintCells.has(nextPos)) setFocusedPos(nextPos)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setDirection("down")
      const [r, c] = focusedPos.split("-").map(Number)
      const nextPos = `${r + 1}-${c}`
      if (editableCells.has(nextPos) || hintCells.has(nextPos)) setFocusedPos(nextPos)
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setDirection("down")
      const [r, c] = focusedPos.split("-").map(Number)
      const nextPos = `${r - 1}-${c}`
      if (editableCells.has(nextPos) || hintCells.has(nextPos)) setFocusedPos(nextPos)
      return
    }

    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault()
      if (!editableCells.has(focusedPos)) return
      if (userLetters[focusedPos]) {
        // Clear current cell
        setUserLetters((prev) => {
          const next = { ...prev }
          delete next[focusedPos!]
          return next
        })
      } else {
        // Move back and clear that cell
        const prev = findNextEditable(focusedPos, direction, false)
        if (prev) {
          setFocusedPos(prev)
          setUserLetters((old) => {
            const next = { ...old }
            delete next[prev]
            return next
          })
        }
      }
      return
    }

    // Hebrew letter input
    if (e.key.length === 1 && isHebrewChar(e.key)) {
      e.preventDefault()
      if (!editableCells.has(focusedPos)) return
      setUserLetters((prev) => ({ ...prev, [focusedPos!]: e.key }))
      // Advance to next editable cell
      const next = findNextEditable(focusedPos, direction, true)
      if (next) setFocusedPos(next)
      return
    }
  }, [focusedPos, direction, completed, userLetters, editableCells, hintCells, findNextEditable, findNextClueFirstEmpty, cellToWords])

  // Cell click handler
  const handleCellClick = useCallback((pos: string) => {
    if (completed) return
    const grid = crossword?.grid
    if (!grid) return
    const [r, c] = pos.split("-").map(Number)
    const cell = grid[r]?.[c]
    if (!cell || cell.isBlocked) return

    if (focusedPos === pos) {
      // Toggle direction on same cell
      setDirection((d) => (d === "across" ? "down" : "across"))
    } else {
      setFocusedPos(pos)
    }
    // Focus the grid container for keyboard input
    gridRef.current?.focus()
  }, [focusedPos, crossword, completed])

  // Correct cells set (for green highlighting on completion)
  const correctCells = useMemo(() => {
    if (!completed) return new Set<string>()
    return editableCells
  }, [completed, editableCells])

  // Compute responsive cell size
  const cols = crossword?.layout_cols || crossword?.grid?.[0]?.length || 0
  const cellSize = Math.min(40, Math.floor((Math.min(600, typeof window !== "undefined" ? window.innerWidth - 48 : 600)) / Math.max(cols, 1)))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !crossword) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg text-muted-foreground">{error || "התשבץ לא נמצא"}</p>
        <Link to="/" className="text-sm text-[#C8963E] hover:underline">
          חזרה לדף הבית
        </Link>
      </div>
    )
  }

  const gridData = crossword.grid
  const layoutResult = crossword.layout_result || []
  const rowCount = crossword.layout_rows || gridData.length
  const colCount = crossword.layout_cols || gridData[0]?.length || 0

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={import.meta.env.BASE_URL + "cw.png"} alt="לוגו" className="w-8 h-8 rounded" />
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
              אחד מאוזן
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Title */}
        <h1
          className="text-2xl font-bold text-center mb-6"
          style={{ fontFamily: "'Frank Ruhl Libre', serif" }}
        >
          {crossword.title}
        </h1>

        {/* Completion banner */}
        {completed && (
          <div className="flex items-center justify-center gap-3 mb-6 py-3 px-6 bg-emerald-50 border border-emerald-200 rounded-lg">
            <PartyPopper className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-800 font-medium">כל הכבוד! פתרתם את התשבץ!</span>
            <PartyPopper className="w-5 h-5 text-emerald-600" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-8">
          {/* Grid */}
          <div className="flex justify-center">
            <div
              ref={gridRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              className="outline-none"
            >
              <CrosswordGrid
                grid={gridData}
                cols={colCount}
                rows={rowCount}
                layoutResult={layoutResult}
                highlightedCells={[]}
                onCellClick={handleCellClick}
                interactive={false}
                showLetters={false}
                cellSize={cellSize}
                solveMode={true}
                userLetters={userLetters}
                focusedPos={focusedPos}
                solveDirection={direction}
                hintCells={hintCells}
                wordCells={currentWordCells}
                correctCells={correctCells}
              />
            </div>
          </div>

          {/* Clues panel */}
          <div className="space-y-6">
            <SolveClues
              title="מאוזן"
              clues={crossword.clues_across}
              orientation="across"
              layoutResult={layoutResult}
              focusedPos={focusedPos}
              direction={direction}
              cellToWords={cellToWords}
              onClueClick={(word) => {
                const cells = getWordCellPositions(word)
                if (cells.length > 0) {
                  setFocusedPos(cells[0])
                  setDirection(word.orientation as "across" | "down")
                  gridRef.current?.focus()
                }
              }}
            />
            <SolveClues
              title="מאונך"
              clues={crossword.clues_down}
              orientation="down"
              layoutResult={layoutResult}
              focusedPos={focusedPos}
              direction={direction}
              cellToWords={cellToWords}
              onClueClick={(word) => {
                const cells = getWordCellPositions(word)
                if (cells.length > 0) {
                  setFocusedPos(cells[0])
                  setDirection(word.orientation as "across" | "down")
                  gridRef.current?.focus()
                }
              }}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

/** Get the cell positions (as "r-c" strings) for a layout word. */
function getWordCellPositions(w: LayoutWord): string[] {
  const cells: string[] = []
  for (let i = 0; i < w.answer.length; i++) {
    if (w.orientation === "across") {
      // After RTL flip, across words go right-to-left (startx - i)
      cells.push(`${w.starty - 1}-${w.startx - 1 - i}`)
    } else if (w.orientation === "down") {
      cells.push(`${w.starty - 1 + i}-${w.startx - 1}`)
    }
  }
  return cells
}

/** Clues panel for solve mode — highlights the active clue. */
function SolveClues({
  title,
  clues,
  orientation,
  layoutResult,
  focusedPos,
  direction,
  cellToWords,
  onClueClick,
}: {
  title: string
  clues: { number: number; clue: string; answerLength: string }[]
  orientation: "across" | "down"
  layoutResult: LayoutWord[]
  focusedPos: string | null
  direction: "across" | "down"
  cellToWords: Map<string, LayoutWord[]>
  onClueClick: (word: LayoutWord) => void
}) {
  // Find the currently active clue number
  const activeNumber = (() => {
    if (!focusedPos) return null
    const words = cellToWords.get(focusedPos) || []
    const word = words.find((w) => w.orientation === direction) || words.find((w) => w.orientation === orientation)
    return word?.position ?? null
  })()

  return (
    <div>
      <h3
        className="text-lg font-bold mb-3 pb-2 border-b border-border/60"
        style={{ fontFamily: "'Frank Ruhl Libre', serif" }}
      >
        {title}
      </h3>
      <div className="space-y-1.5">
        {clues.map((c) => {
          const isActive = activeNumber === c.number && direction === orientation
          const word = layoutResult.find(
            (w) => w.position === c.number && w.orientation === orientation
          )
          return (
            <div
              key={`${c.number}-${c.clue}`}
              className={[
                "flex gap-2 text-sm leading-relaxed rounded px-1.5 -mx-1.5 cursor-pointer transition-colors",
                isActive ? "bg-[#FEF9C3]" : "hover:bg-secondary/30",
              ].join(" ")}
              onClick={() => word && onClueClick(word)}
            >
              <span className="font-semibold text-muted-foreground min-w-[1.5rem] text-start">
                {c.number}.
              </span>
              <span>
                {c.clue}{" "}
                <span className="text-muted-foreground">{c.answerLength}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
