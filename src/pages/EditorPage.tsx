import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Check, Loader2, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, AlertTriangle, Printer, Eye, EyeOff, Pencil, Globe, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import CrosswordGrid from "@/components/CrosswordGrid"
import CluesDisplay from "@/components/CluesDisplay"
import GuidedTour from "@/components/GuidedTour"
import { useCrossword, useCrosswords, useSaveCrossword } from "@/hooks/useCrosswords"
import { useAuth } from "@/hooks/useAuth"
import { generateProposals } from "@/lib/layout-strategy"
import { openPrintWindow } from "@/lib/print-crossword"
import { useWalkthrough } from "@/hooks/useWalkthrough"
import type { RawClue, Crossword, GeneratorResult, LayoutWord } from "@/types/crossword"
import defaultCluesUrl from "@/data/default-clues.txt?url"

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

/** Simple deterministic hash of the answers list (order-independent). */
function answersHash(clues: RawClue[]): string {
  const sorted = clues.map((c) => c.answer).sort().join("|")
  let h = 0
  for (let i = 0; i < sorted.length; i++) {
    h = ((h << 5) - h + sorted.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
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
  const { isLoggedIn, user } = useAuth()

  const { data: existingCrossword, isLoading } = useCrossword(editId)
  const { data: allCrosswords } = useCrosswords()
  const saveMutation = useSaveCrossword()

  const [title, setTitle] = useState("")
  const [topic, setTopic] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<Crossword["status"]>("draft")
  const [difficulty, setDifficulty] = useState<Crossword["difficulty"]>("medium")
  const titleInitRef = useRef(!editId)
  const [rawCluesText, setRawCluesText] = useState("")
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [activeProposalIndex, setActiveProposalIndex] = useState(-1)
  const [proposalsHash, setProposalsHash] = useState("")
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const docIdRef = useRef<string | null>(editId)
  const initialLoadRef = useRef(!!editId)
  // localStorage-backed proposals cache (keyed by answers hash, scoped per document)
  const proposalsCache = useRef({
    _key: () => `proposals-cache:${docIdRef.current || "new"}`,
    _maxEntries: 5,
    _load(): Record<string, { proposals: Proposal[]; activeIndex: number }> {
      try { return JSON.parse(localStorage.getItem(this._key()) || "{}") } catch { return {} }
    },
    get(hash: string) {
      return this._load()[hash] ?? null
    },
    set(hash: string, entry: { proposals: Proposal[]; activeIndex: number }) {
      const data = this._load()
      data[hash] = entry
      // Evict oldest entries beyond cap
      const keys = Object.keys(data)
      if (keys.length > this._maxEntries) {
        for (const k of keys.slice(0, keys.length - this._maxEntries)) delete data[k]
      }
      try { localStorage.setItem(this._key(), JSON.stringify(data)) } catch { /* quota */ }
    },
  }).current
  const [isGenerating, setIsGenerating] = useState(false)
  const [showClues, setShowClues] = useState(false)
  const walkthrough = useWalkthrough("editor")
  const [focusedCells, setFocusedCells] = useState<string[][]>([])
  const [focusedClueKeys, setFocusedClueKeys] = useState<Set<string>>(new Set())

  // Set default title for new crosswords (deduplicated against existing titles)
  useEffect(() => {
    if (!titleInitRef.current) return
    if (!allCrosswords) return
    titleInitRef.current = false
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const base = `תשבץ-${dd}-${mm}-${d.getFullYear()}`
    const existingTitles = new Set(allCrosswords.map((cw) => cw.title))
    if (!existingTitles.has(base)) {
      setTitle(base)
      return
    }
    let idx = 1
    while (existingTitles.has(`${base}_${idx}`)) idx++
    setTitle(`${base}_${idx}`)
  }, [allCrosswords])

  // Derived state
  const activeProposal = activeProposalIndex >= 0 ? proposals[activeProposalIndex] ?? null : null
  const generatorResult = activeProposal?.result ?? null
  const highlightedCells = activeProposal?.highlightedCells ?? []

  // Load existing crossword (only on first fetch, not on auto-save refetches)
  const firestoreLoadedRef = useRef(false)
  useEffect(() => {
    if (firestoreLoadedRef.current) return
    if (existingCrossword) {
      firestoreLoadedRef.current = true
      initialLoadRef.current = true
      setTitle(existingCrossword.title || "")
      setTopic(existingCrossword.topic || "")
      setDescription(existingCrossword.description || "")
      setStatus(existingCrossword.status || "draft")
      setDifficulty(existingCrossword.difficulty || "medium")
      if (existingCrossword.raw_clues?.length) {
        setRawCluesText(rawCluesToText(existingCrossword.raw_clues))
      }
      // Restore all proposals if hash matches, otherwise just the active one
      const currentHash = existingCrossword.answers_hash || ""
      const savedHash = existingCrossword.proposals_hash || ""
      let restored = false

      if (savedHash && savedHash === currentHash && existingCrossword.saved_proposals) {
        try {
          const blob = JSON.parse(existingCrossword.saved_proposals)
          // Support both new format { proposals, activeIndex } and legacy array format
          const parsed: Proposal[] = Array.isArray(blob) ? blob : blob.proposals
          const savedIdx: number = Array.isArray(blob) ? 0 : (blob.activeIndex ?? 0)
          if (parsed.length > 0) {
            setProposals(parsed)
            setActiveProposalIndex(Math.min(savedIdx, parsed.length - 1))
            setProposalsHash(savedHash)
            restored = true
          }
        } catch { /* ignore bad data */ }
      }

      if (!restored && existingCrossword.grid && existingCrossword.layout_result) {
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
        setProposalsHash(currentHash)
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
      const newProposals = ranked.map((p) => ({
        result: p.result,
        highlightedCells: [],
        adjustedScore: p.adjustedScore,
        variantLabel: p.variantLabel,
      }))
      const hash = answersHash(rawClues)
      setProposals(newProposals)
      setActiveProposalIndex(0)
      setProposalsHash(hash)
      proposalsCache.set(hash, { proposals: newProposals, activeIndex: 0 })
      setIsGenerating(false)
    }))
  }, [rawCluesText])

  // Stash proposals when answers change, restore on undo (hash returns to a stashed value)
  const stashedHashes = useRef(new Set<string>())
  const justClearedRef = useRef(false)
  useEffect(() => {
    const currentHash = answersHash(parseRawClues(rawCluesText))

    if (proposalsHash && proposals.length > 0 && currentHash !== proposalsHash) {
      // Hash changed — stash current proposals and clear
      proposalsCache.set(proposalsHash, { proposals, activeIndex: activeProposalIndex })
      stashedHashes.current.add(proposalsHash)
      justClearedRef.current = true
      setProposals([])
      setActiveProposalIndex(-1)
      setProposalsHash("")
      return
    }

    if (proposals.length === 0 && !justClearedRef.current && currentHash && stashedHashes.current.has(currentHash)) {
      // Hash returned to a previously stashed value (undo) — restore
      const cached = proposalsCache.get(currentHash)
      if (cached) {
        setProposals(cached.proposals)
        setActiveProposalIndex(cached.activeIndex)
        setProposalsHash(currentHash)
        return
      }
    }

    justClearedRef.current = false
  }, [rawCluesText, proposalsHash, proposals.length, activeProposalIndex])

  // Keep localStorage cache in sync with current proposals state
  useEffect(() => {
    if (proposalsHash && proposals.length > 0 && activeProposalIndex >= 0) {
      proposalsCache.set(proposalsHash, { proposals, activeIndex: activeProposalIndex })
    }
  }, [proposals, activeProposalIndex, proposalsHash, proposalsCache])

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

  // Auto-save with debounce
  useEffect(() => {
    if (!title.trim()) return
    if (parseRawClues(rawCluesText).length === 0) return
    if (isGenerating) return
    if (initialLoadRef.current) {
      initialLoadRef.current = false
      setAutoSaveStatus("saved")
      return
    }

    setAutoSaveStatus("idle")
    clearTimeout(autoSaveTimerRef.current)

    autoSaveTimerRef.current = setTimeout(async () => {
      const proposal = activeProposalIndex >= 0 ? proposals[activeProposalIndex] : null
      const genResult = proposal?.result ?? null
      const hCells = proposal?.highlightedCells ?? []
      const rawClues = parseRawClues(rawCluesText)
      const data: Omit<Crossword, "id"> = {
        title,
        topic,
        description,
        status,
        difficulty,
        grid_size: genResult?.cols || 0,
        grid: genResult?.grid || [],
        raw_clues: rawClues,
        answers_hash: answersHash(rawClues),
        proposals_hash: proposalsHash,
        saved_proposals: proposals.length > 0 ? JSON.stringify({ proposals, activeIndex: activeProposalIndex }) : "",
        clues_across: genResult?.clues_across || [],
        clues_down: genResult?.clues_down || [],
        highlighted_cells: hCells,
        layout_result: genResult?.layout_result || [],
        layout_rows: genResult?.rows || 0,
        layout_cols: genResult?.cols || 0,
      }

      setAutoSaveStatus("saving")
      try {
        const id = await saveMutation.mutateAsync({ id: docIdRef.current || undefined, data })
        if (!docIdRef.current) {
          docIdRef.current = id
          navigate(`/editor?id=${id}`, { replace: true })
        }
        setAutoSaveStatus("saved")
      } catch (err) {
        console.error("Auto-save failed:", err)
        setAutoSaveStatus("idle")
      }
    }, 1500)

    return () => clearTimeout(autoSaveTimerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, topic, description, status, difficulty, rawCluesText, proposals, activeProposalIndex, isGenerating])

  const handlePrint = () => {
    if (!generatorResult) return
    const cw: Crossword = {
      title,
      topic,
      description,
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
      createdAt: existingCrossword?.createdAt,
      updatedAt: existingCrossword?.updatedAt,
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
    if (!el || !generatorResult) { setFocusedCells([]); setFocusedClueKeys(new Set()); return }
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
    if (!currentLine || !currentLine.includes("-")) { setFocusedCells([]); setFocusedClueKeys(new Set()); return }

    // Look up layout words by identifier (= raw clue index)
    const map = clueIndexToLayoutWords()
    const words = map.get(rawClueIdx)
    if (!words) { setFocusedCells([]); setFocusedClueKeys(new Set()); return }

    const groups: string[][] = []
    const keys = new Set<string>()
    for (const w of words) {
      keys.add(`${w.orientation}-${w.position}`)
      const wordCells: string[] = []
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.orientation === "down" ? w.starty - 1 + i : w.starty - 1
        // After RTL flip, across words go right-to-left (startx - i)
        const c = w.orientation === "across" ? w.startx - 1 - i : w.startx - 1
        wordCells.push(`${r}-${c}`)
      }
      groups.push(wordCells)
    }
    setFocusedCells(groups)
    setFocusedClueKeys(keys)
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
      <GuidedTour page="editor" open={walkthrough.isOpen} onClose={walkthrough.close} />
      {/* Editor Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-end gap-3 flex-1 min-w-0 flex-wrap">
          <div className="min-w-[180px] max-w-sm flex-1">
            <Label htmlFor="title" className="text-xs text-muted-foreground mb-1 block">
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
            <Label className="text-xs text-muted-foreground mb-1 block">נושא</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="חגים, טבע..."
              className="h-9 text-xs w-32"
            />
          </div>
          <div className="flex-1 min-w-[120px] max-w-xs">
            <Label className="text-xs text-muted-foreground mb-1 block">תיאור</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור קצר..."
              className="h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-end gap-2">
          {/* Status toggle */}
          <div className="flex gap-0.5 h-9 items-center">
            {([
              { value: "draft", label: "טיוטה", Icon: Pencil },
              { value: "published", label: "פורסם", Icon: Globe },
              { value: "archived", label: "ארכיון", Icon: Archive },
            ] as const).map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className={`flex items-center gap-1 px-2.5 h-8 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  status === value
                    ? "bg-secondary text-foreground border border-border"
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          {/* Auto-save status indicator */}
          <div className="flex items-center justify-center gap-1.5 text-xs h-9 w-16">
            {autoSaveStatus === "saving" && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">שומר...</span>
              </>
            )}
            {autoSaveStatus === "saved" && (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">נשמר</span>
              </>
            )}
          </div>
          <Button variant="outline" onClick={handlePrint} disabled={!generatorResult} className="gap-2" data-tour="print-area">
            <Printer className="w-4 h-4" />
            הדפס
          </Button>
        </div>
      </div>

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
            <div className="flex gap-0" data-tour="clues-textarea">
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
                onBlur={() => { setFocusedCells([]); setFocusedClueKeys(new Set()) }}
                placeholder={`חתול-בעל חיים ביתי\nבית_ספר-מקום ללמוד\nמים-נוזל חיים`}
                className="min-h-[300px] font-mono text-sm leading-relaxed resize-none flex-1"
                dir="rtl"
              />
            </div>
          </div>

          {/* Generate controls */}
          <div className="flex items-center gap-2 flex-wrap" data-tour="proposal-gallery">
            <Button
              onClick={generate}
              disabled={!canGenerate || isGenerating}
              className="gap-2"
              data-tour="generate-btn"
            >
              {isGenerating ? "מייצר..." : "שבץ מילים"}
            </Button>
            {import.meta.env.DEV && !rawCluesText.trim() && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={async () => {
                  const res = await fetch(defaultCluesUrl)
                  setRawCluesText((await res.text()).trim())
                }}
              >
                טען דוגמה
              </Button>
            )}

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

          {/* Score & variant info (dev or admin only) */}
          {proposals.length > 0 && generatorResult && activeProposal && (import.meta.env.DEV || user?.email === "yonatanm@gmail.com") && (
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
                <div className="bg-card border rounded-lg p-4 inline-block max-w-full overflow-auto" data-tour="crossword-grid">
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
                    focusedClueKeys={focusedClueKeys}
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
                {rawClues.length === 0
                  ? "יש להוסיף לפחות הגדרה אחת"
                  : "לחצו \"שבץ מילים\" ליצירת התשבץ"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
