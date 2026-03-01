import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Save, ChevronRight, ChevronLeft, AlertTriangle, Printer } from "lucide-react"
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
import { generateCrosswordLayout } from "@/lib/crossword-generator"
import { openPrintWindow } from "@/lib/print-crossword"
import type { RawClue, Crossword, GeneratorResult } from "@/types/crossword"

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

interface HistoryEntry {
  result: GeneratorResult
  highlightedCells: string[]
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
  const [generatorResult, setGeneratorResult] = useState<GeneratorResult | null>(null)
  const [highlightedCells, setHighlightedCells] = useState<string[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load existing crossword
  useEffect(() => {
    if (existingCrossword) {
      setTitle(existingCrossword.title || "")
      setStatus(existingCrossword.status || "draft")
      setDifficulty(existingCrossword.difficulty || "medium")
      setHighlightedCells(existingCrossword.highlighted_cells || [])
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
        setGeneratorResult(result)
        setHistory([{ result, highlightedCells: existingCrossword.highlighted_cells || [] }])
        setHistoryIndex(0)
      }
    }
  }, [existingCrossword])

  const generate = useCallback(() => {
    const rawClues = parseRawClues(rawCluesText)
    if (rawClues.length < 2) return

    const result = generateCrosswordLayout(rawClues)
    setGeneratorResult(result)
    setHighlightedCells([])

    const entry: HistoryEntry = { result, highlightedCells: [] }
    const newHistory = [...history.slice(0, historyIndex + 1), entry]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [rawCluesText, history, historyIndex])

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1]
      setGeneratorResult(prev.result)
      setHighlightedCells(prev.highlightedCells)
      setHistoryIndex(historyIndex - 1)
    }
  }, [history, historyIndex])

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1]
      setGeneratorResult(next.result)
      setHighlightedCells(next.highlightedCells)
      setHistoryIndex(historyIndex + 1)
    } else {
      generate()
    }
  }, [history, historyIndex, generate])

  const toggleCell = (pos: string) => {
    const updated = highlightedCells.includes(pos)
      ? highlightedCells.filter((p) => p !== pos)
      : [...highlightedCells, pos]
    setHighlightedCells(updated)

    // Update current history entry
    if (historyIndex >= 0 && history[historyIndex]) {
      const newHistory = [...history]
      newHistory[historyIndex] = { ...newHistory[historyIndex], highlightedCells: updated }
      setHistory(newHistory)
    }
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
        {/* Left Column: Clues Input */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                הגדרות ({rawClues.length})
              </Label>
              <span className="text-xs text-muted-foreground">
                פורמט: תשובה-הגדרה (שורה לכל הגדרה)
              </span>
            </div>
            <Textarea
              value={rawCluesText}
              onChange={(e) => setRawCluesText(e.target.value)}
              placeholder={`חתול-בעל חיים ביתי\nשמש-כוכב מרכזי\nמים-נוזל חיים`}
              className="min-h-[300px] font-mono text-sm leading-relaxed resize-y"
              dir="rtl"
            />
          </div>

          {/* Generate controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={generate}
              disabled={!canGenerate}
              className="gap-2"
            >
              יצירת תשבץ
            </Button>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={goBack}
                disabled={historyIndex <= 0}
                title="הקודם"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goForward}
                disabled={!canGenerate}
                title="הבא"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            {historyIndex >= 0 && (
              <span className="text-xs text-muted-foreground">
                גרסה {historyIndex + 1} מתוך {history.length}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Grid Preview */}
        <div className="space-y-6">
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
                <div className="bg-card border rounded-lg p-4 inline-block">
                  <CrosswordGrid
                    grid={generatorResult.grid}
                    cols={generatorResult.cols}
                    rows={generatorResult.rows}
                    layoutResult={generatorResult.layout_result}
                    highlightedCells={highlightedCells}
                    onCellClick={toggleCell}
                    interactive={true}
                    showLetters={false}
                  />
                </div>
              </div>

              {/* Unplaced clues warning */}
              {generatorResult.unplacedClues.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
                  <div className="flex items-center gap-2 text-amber-800 text-sm font-medium mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    הגדרות שלא שובצו
                  </div>
                  <div className="space-y-0.5">
                    {generatorResult.unplacedClues.map((c, i) => (
                      <div key={i} className="text-sm text-amber-700">
                        {c.answer} — {c.clue}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clues display */}
              <CluesDisplay
                cluesAcross={generatorResult.clues_across}
                cluesDown={generatorResult.clues_down}
              />
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
