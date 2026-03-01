import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Save, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, AlertTriangle, Printer, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import CrosswordGrid from "@/components/CrosswordGrid"
import CluesDisplay from "@/components/CluesDisplay"
import { useCrossword, useSaveCrossword } from "@/hooks/useCrosswords"
import { useAuth } from "@/hooks/useAuth"
import { generateProposals } from "@/lib/layout-strategy"
import { openPrintWindow } from "@/lib/print-crossword"
import type { RawClue, Crossword, GeneratorResult, LayoutWord } from "@/types/crossword"

function parseRawClues(text: string): RawClue[] {
  if (!text.trim()) return []
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.includes("-"))
    .map((line) => {
      const idx = line.indexOf("-")
      return {
        answer: line.substring(0, idx).trim(),
        clue: line.substring(idx + 1).trim(),
      }
    })
    .filter((c) => c.answer.length > 0 && c.clue.length > 0)
}

function rawCluesToText(clues: RawClue[]): string {
  return clues.map((c) => `${c.answer}-${c.clue}`).join("\n")
}

interface Proposal {
  result: GeneratorResult
  highlightedCells: string[]
  adjustedScore: number
  variantLabel: string
}

export default function EditorPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editId = searchParams.get("id")
  const { isLoggedIn } = useAuth()

  const { data: existingCrossword, isLoading } = useCrossword(editId)
  const saveMutation = useSaveCrossword()

  const DEFAULT_CLUES = `חתול-בעל חיים ביתי שאוהב לישון
שמש-כוכב במרכז מערכת השמש
מחשב-מכשיר אלקטרוני לעיבוד מידע
ספר-אוסף דפים כרוכים
גשם-מים שיורדים מהשמיים
תפוח-פרי אדום או ירוק
כדורגל-משחק עם כדור ושתי שערים
מוזיקה-אמנות הצלילים
ארנב-בעל חיים עם אוזניים ארוכות
שולחן-רהיט לאכילה או עבודה
מטוס-כלי תעופה עם כנפיים
שעון-מכשיר למדידת זמן`

  const [title, setTitle] = useState("")
  const [status, setStatus] = useState<Crossword["status"]>("draft")
  const [difficulty, setDifficulty] = useState<Crossword["difficulty"]>("medium")
  const [rawCluesText, setRawCluesText] = useState(editId ? "" : DEFAULT_CLUES)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [activeProposalIndex, setActiveProposalIndex] = useState(-1)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showClues, setShowClues] = useState(true)
  const [focusedCells, setFocusedCells] = useState<string[]>([])

  // Derived state
  const activeProposal = activeProposalIndex >= 0 ? proposals[activeProposalIndex] ?? null : null
  const generatorResult = activeProposal?.result ?? null
  const highlightedCells = activeProposal?.highlightedCells ?? []

  // Load existing crossword
  useEffect(() => {
    if (existingCrossword) {
      setTitle(existingCrossword.title || "")
      setStatus(existingCrossword.status || "draft")
      setDifficulty(existingCrossword.difficulty || "medium")
      if (existingCrossword.raw_clues?.length) {
        setRawCluesText(rawCluesToText(existingCrossword.raw_clues))
      }
      if (existingCrossword.grid && existingCrossword.layout_result) {
        const result: GeneratorResult = {
          grid: existingCrossword.grid,
          clues_across: existingCrossword.clues_across,
          clues_down: existingCrossword.clues_down,
          unplacedClues: [],
          layout_result: existingCrossword.layout_result,
          rows: existingCrossword.layout_rows || existingCrossword.grid.length,
          cols: existingCrossword.layout_cols || existingCrossword.grid[0]?.length || 0,
        }
        setProposals([{
          result,
          highlightedCells: existingCrossword.highlighted_cells || [],
          adjustedScore: 0,
          variantLabel: "",
        }])
        setActiveProposalIndex(0)
      }
    }
  }, [existingCrossword])

  const generate = useCallback(() => {
    const rawClues = parseRawClues(rawCluesText)
    if (rawClues.length < 2) return

    setIsGenerating(true)
    // Double rAF ensures the browser paints the spinner before blocking
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const ranked = generateProposals(rawClues)
      setProposals(ranked.map((p) => ({
        result: p.result,
        highlightedCells: [],
        adjustedScore: p.adjustedScore,
        variantLabel: p.variantLabel,
      })))
      setActiveProposalIndex(0)
      setIsGenerating(false)
    }))
  }, [rawCluesText])

  // Keyboard arrow navigation for proposals
  useEffect(() => {
    if (proposals.length <= 1) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (e.key === "ArrowLeft") {
        setActiveProposalIndex((i) => Math.min(proposals.length - 1, i + 1))
      } else if (e.key === "ArrowRight") {
        setActiveProposalIndex((i) => Math.max(0, i - 1))
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [proposals.length])

  const toggleCell = (pos: string) => {
    if (activeProposalIndex < 0) return

    setProposals((prev) => {
      const updated = [...prev]
      const proposal = { ...updated[activeProposalIndex] }
      proposal.highlightedCells = proposal.highlightedCells.includes(pos)
        ? proposal.highlightedCells.filter((p) => p !== pos)
        : [...proposal.highlightedCells, pos]
      updated[activeProposalIndex] = proposal
      return updated
    })
  }

  const save = async () => {
    if (!title.trim()) return
    const rawClues = parseRawClues(rawCluesText)
    const data: Omit<Crossword, "id"> = {
      title,
      status,
      difficulty,
      grid_size: generatorResult?.cols || 0,
      grid: generatorResult?.grid || [],
      raw_clues: rawClues,
      clues_across: generatorResult?.clues_across || [],
      clues_down: generatorResult?.clues_down || [],
      highlighted_cells: highlightedCells,
      layout_result: generatorResult?.layout_result,
      layout_rows: generatorResult?.rows,
      layout_cols: generatorResult?.cols,
    }

    const id = await saveMutation.mutateAsync({ id: editId || undefined, data })
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
    if (!editId) {
      navigate(`/editor?id=${id}`, { replace: true })
    }
  }

  const handlePrint = () => {
    if (!generatorResult) return
    const cw: Crossword = {
      title,
      status,
      difficulty,
      grid_size: generatorResult.cols,
      grid: generatorResult.grid,
      raw_clues: parseRawClues(rawCluesText),
      clues_across: generatorResult.clues_across,
      clues_down: generatorResult.clues_down,
      highlighted_cells: highlightedCells,
      layout_result: generatorResult.layout_result,
      layout_rows: generatorResult.rows,
      layout_cols: generatorResult.cols,
    }
    openPrintWindow(cw)
  }

  const rawClues = parseRawClues(rawCluesText)
  const canGenerate = rawClues.length >= 2 && title.trim().length > 0

  // Compute which textarea lines are unplaced clues
  const unplacedClueTexts = new Set(generatorResult?.unplacedClues.map((c) => c.clue) ?? [])
  const textareaLines = rawCluesText.split("\n")
  const lineWarnings = textareaLines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.includes("-")) return false
    const clueText = trimmed.substring(trimmed.indexOf("-") + 1).trim()
    return unplacedClueTexts.has(clueText)
  })
  const hasUnplaced = lineWarnings.some(Boolean)

  // Scroll-sync refs for textarea ↔ indicator column
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const handleTextareaScroll = () => {
    if (textareaRef.current && indicatorRef.current) {
      indicatorRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  // Textarea line → grid cell highlighting
  // Build a map from raw clue index → layout words (using identifier field)
  const clueIndexToLayoutWords = useCallback(() => {
    if (!generatorResult) return new Map<number, LayoutWord[]>()
    const map = new Map<number, typeof generatorResult.layout_result>()
    for (const w of generatorResult.layout_result) {
      if (w.identifier === undefined) continue
      const group = map.get(w.identifier)
      if (group) group.push(w)
      else map.set(w.identifier, [w])
    }
    return map
  }, [generatorResult])

  const handleTextareaCursor = useCallback(() => {
    const el = textareaRef.current
    if (!el || !generatorResult) { setFocusedCells([]); return }
    const pos = el.selectionStart ?? 0
    // Find which raw clue line the cursor is on
    const lineIndex = el.value.substring(0, pos).split("\n").length - 1
    // Map textarea line index to raw clue index (skip blank/invalid lines)
    const lines = el.value.split("\n")
    let rawClueIdx = -1
    for (let i = 0; i <= lineIndex; i++) {
      const trimmed = lines[i]?.trim() || ""
      if (trimmed && trimmed.includes("-")) {
        rawClueIdx++
      }
    }
    const currentLine = lines[lineIndex]?.trim() || ""
    if (!currentLine || !currentLine.includes("-")) { setFocusedCells([]); return }

    // Look up layout words by identifier (= raw clue index)
    const map = clueIndexToLayoutWords()
    const words = map.get(rawClueIdx)
    if (!words) { setFocusedCells([]); return }

    const cells: string[] = []
    for (const w of words) {
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.orientation === "down" ? w.starty - 1 + i : w.starty - 1
        // After RTL flip, across words go right-to-left (startx - i)
        const c = w.orientation === "across" ? w.startx - 1 - i : w.startx - 1
        cells.push(`${r}-${c}`)
      }
    }
    setFocusedCells(cells)
  }, [generatorResult, clueIndexToLayoutWords])

  // Gallery scroll
  const galleryRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateGalleryScroll = useCallback(() => {
    const el = galleryRef.current
    if (!el) return
    const overflowing = el.scrollWidth > el.clientWidth
    if (!overflowing) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
    // Check if first/last child is fully visible to determine scroll arrows
    const children = el.children
    if (children.length === 0) return
    const containerRect = el.getBoundingClientRect()
    const firstRect = children[0].getBoundingClientRect()
    const lastRect = children[children.length - 1].getBoundingClientRect()
    setCanScrollRight(firstRect.right > containerRect.right + 1)
    setCanScrollLeft(lastRect.left < containerRect.left - 1)
  }, [])

  useEffect(() => {
    updateGalleryScroll()
  }, [proposals, updateGalleryScroll])

  const scrollGallery = (direction: "left" | "right") => {
    const el = galleryRef.current
    if (!el) return
    const children = Array.from(el.children) as HTMLElement[]
    if (children.length === 0) return
    const containerRect = el.getBoundingClientRect()

    if (direction === "right") {
      // Find first child whose right edge is beyond the container's right edge
      const target = children.find(c => c.getBoundingClientRect().right > containerRect.right + 1)
      target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" })
    } else {
      // Find last child whose left edge is before the container's left edge
      const target = [...children].reverse().find(c => c.getBoundingClientRect().left < containerRect.left - 1)
      target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" })
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        יש להתחבר כדי ליצור תשבצים
      </div>
    )
  }

  if (editId && isLoading) {
    return <div className="text-center py-20 text-muted-foreground">טוען...</div>
  }

  return (
    <div className="space-y-6">
      {/* Editor Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-1 max-w-sm">
            <Label htmlFor="title" className="text-xs text-muted-foreground mb-1.5 block">
              שם התשבץ
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="הזינו שם..."
              className="text-base"
              style={{ fontFamily: "'Frank Ruhl Libre', serif" }}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">סטטוס</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Crossword["status"])}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">טיוטה</SelectItem>
                <SelectItem value="published">פורסם</SelectItem>
                <SelectItem value="archived">ארכיון</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">רמת קושי</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Crossword["difficulty"])}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">קל</SelectItem>
                <SelectItem value="medium">בינוני</SelectItem>
                <SelectItem value="hard">קשה</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <Button
            onClick={save}
            disabled={!title.trim() || saveMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "שומר..." : "שמור"}
          </Button>
          {generatorResult && (
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              הדפס
            </Button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-4 py-2 text-sm">
          התשבץ נשמר בהצלחה
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-8 overflow-hidden">
        {/* Left Column: Clues Input */}
        <div className="space-y-4 min-w-0">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                הגדרות ({rawClues.length})
              </Label>
              <span className="text-xs text-muted-foreground">
                פורמט: תשובה-הגדרה (שורה לכל הגדרה)
              </span>
            </div>
            <div className="flex gap-0">
              {hasUnplaced && (
                <div
                  ref={indicatorRef}
                  className="overflow-hidden shrink-0 pt-2"
                  style={{ width: "22px" }}
                >
                  {textareaLines.map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center"
                      style={{ height: "calc(0.875rem * 1.625)" }}
                    >
                      {lineWarnings[i] && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <Textarea
                ref={textareaRef}
                value={rawCluesText}
                onChange={(e) => setRawCluesText(e.target.value)}
                onScroll={handleTextareaScroll}
                onSelect={handleTextareaCursor}
                onClick={handleTextareaCursor}
                onKeyUp={handleTextareaCursor}
                onBlur={() => setFocusedCells([])}
                placeholder={`חתול-בעל חיים ביתי\nשמש-כוכב מרכזי\nמים-נוזל חיים`}
                className="min-h-[300px] font-mono text-sm leading-relaxed resize-none flex-1"
                dir="rtl"
              />
            </div>
          </div>

          {/* Generate controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={generate}
              disabled={!canGenerate || isGenerating}
              className="gap-2"
            >
              {isGenerating ? "מייצר..." : "שבץ מילים"}
            </Button>

            {/* Proposal navigation arrows */}
            {proposals.length > 1 && (
              <>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setActiveProposalIndex((i) => Math.max(0, i - 1))}
                    disabled={activeProposalIndex <= 0}
                    title="הצעה קודמת"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setActiveProposalIndex((i) => Math.min(proposals.length - 1, i + 1))}
                    disabled={activeProposalIndex >= proposals.length - 1}
                    title="הצעה הבאה"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  הצעה {activeProposalIndex + 1} מתוך {proposals.length}
                </span>
              </>
            )}
          </div>

          {/* Thumbnail gallery strip */}
          {proposals.length > 1 && (
            <div className={`flex items-center gap-1 ${isGenerating ? "opacity-50 pointer-events-none" : ""}`}>
              <button
                onClick={() => scrollGallery("right")}
                disabled={!canScrollRight}
                className="shrink-0 p-1 rounded-full hover:bg-gray-100 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4 text-gray-500" />
              </button>
              <div
                ref={galleryRef}
                onScroll={updateGalleryScroll}
                className="flex gap-2 overflow-x-auto py-1 flex-1 min-w-0"
                style={{ scrollbarWidth: "none" }}
              >
                {proposals.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveProposalIndex(i)}
                    className={`shrink-0 cursor-pointer rounded-md p-1.5 transition-all ${
                      i === activeProposalIndex
                        ? "ring-2 ring-[#C8963E] bg-amber-50"
                        : "ring-1 ring-gray-200 hover:ring-gray-400"
                    }`}
                  >
                    <CrosswordGrid
                      grid={p.result.grid}
                      cols={p.result.cols}
                      rows={p.result.rows}
                      layoutResult={p.result.layout_result}
                      highlightedCells={p.highlightedCells}
                      onCellClick={() => {}}
                      interactive={false}
                      showNumbers={false}
                      showLetters={false}
                      cellSize={6}
                    />
                    <div className="text-[10px] text-muted-foreground text-center mt-1">
                      {Math.round(p.adjustedScore * 100)}%
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => scrollGallery("left")}
                disabled={!canScrollLeft}
                className="shrink-0 p-1 rounded-full hover:bg-gray-100 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}

          {/* Score & variant info */}
          {generatorResult && activeProposal && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>
                ציון כולל: {Math.round(activeProposal.adjustedScore * 100)}%
                {" · "}שובצו {rawClues.length > 0 ? Math.round(((rawClues.length - generatorResult.unplacedClues.length) / rawClues.length) * 100) : 0}% מההגדרות ({rawClues.length - generatorResult.unplacedClues.length}/{rawClues.length})
                {generatorResult.score && (
                  <>
                    {" · "}צפיפות: {Math.round(generatorResult.score.density * 100)}%
                    {" · "}הצלבות: {Math.round(generatorResult.score.interconnectedness * 100)}%
                  </>
                )}
              </div>
              {activeProposal.variantLabel && (
                <div>{activeProposal.variantLabel}</div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Grid Preview */}
        <div className="space-y-6 min-w-0">
          {generatorResult ? (
            <>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2
                    className="text-lg font-bold"
                    style={{ fontFamily: "'Frank Ruhl Libre', serif" }}
                  >
                    {title || "תצוגה מקדימה"}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    לחצו על תא כדי לסמן רמז
                  </span>
                </div>
                <div className="bg-card border rounded-lg p-4 inline-block max-w-full overflow-auto">
                  <CrosswordGrid
                    grid={generatorResult.grid}
                    cols={generatorResult.cols}
                    rows={generatorResult.rows}
                    layoutResult={generatorResult.layout_result}
                    highlightedCells={highlightedCells}
                    focusedCells={focusedCells}
                    onCellClick={toggleCell}
                    interactive={true}
                    showLetters={false}
                  />
                </div>
              </div>

              {/* Clues display */}
              <div>
                <button
                  onClick={() => setShowClues((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer mb-2"
                >
                  {showClues ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showClues ? "הסתר הגדרות" : "הצג הגדרות"}
                </button>
                {showClues && (
                  <CluesDisplay
                    cluesAcross={generatorResult.clues_across}
                    cluesDown={generatorResult.clues_down}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-dashed rounded-lg">
              <div className="text-4xl mb-3 opacity-20" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
                #
              </div>
              <p className="text-sm text-muted-foreground">
                הזינו הגדרות ולחצו "יצירת תשבץ"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
