import { useRef, useState, useEffect, useCallback } from "react"
import { Bold, Underline } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  parseClueMarkup,
  serializeClueSegments,
  toggleMarkInLine,
  rangeHasMark,
  type ClueMark,
  type ClueSegment,
} from "@/lib/clue-markup"

interface ClueEditorProps {
  value: string
  onChange: (value: string) => void
  lineWarnings: boolean[]
  onCursorLine?: (lineIndex: number) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
}

/** A selection endpoint in (lineIndex, plainCharOffset) coordinates. */
interface SelPoint {
  line: number
  offset: number
}

export default function ClueEditor({
  value,
  onChange,
  lineWarnings,
  onCursorLine,
  onBlur,
  placeholder,
  className,
}: ClueEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isUserInput = useRef(false)
  const lineWarningsRef = useRef(lineWarnings)
  lineWarningsRef.current = lineWarnings
  const valueRef = useRef(value)
  valueRef.current = value

  // Sync DOM from value prop (only when change is external)
  useEffect(() => {
    if (isUserInput.current) {
      isUserInput.current = false
      return
    }
    const el = editorRef.current
    if (!el) return
    syncDomFromValue(el, value, lineWarnings)
  }, [value, lineWarnings])

  const handleInput = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    isUserInput.current = true
    const text = extractText(el)
    onChange(text)
    // Rebuild DOM to ensure proper structure (one <div> per line) with bold + warning icons.
    // Handles browser quirks where text ends up as bare text nodes outside <div> wrappers.
    syncDomFromValue(el, text, lineWarningsRef.current)
  }, [onChange])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    document.execCommand("insertText", false, text)
  }, [])

  /** Current selection as two SelPoints (anchor, focus), or null if outside the editor. */
  const getSelectionPoints = useCallback((): { anchor: SelPoint; focus: SelPoint } | null => {
    const el = editorRef.current
    if (!el) return null
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    if (!sel.anchorNode || !sel.focusNode) return null
    if (!el.contains(sel.anchorNode) || !el.contains(sel.focusNode)) return null
    const anchor = getSelPoint(el, sel.anchorNode, sel.anchorOffset)
    const focus = getSelPoint(el, sel.focusNode, sel.focusOffset)
    if (!anchor || !focus) return null
    return { anchor, focus }
  }, [])

  const [markState, setMarkState] = useState<{ bold: boolean; underline: boolean }>({
    bold: false,
    underline: false,
  })

  /** Recompute toolbar button state from the current selection. */
  const updateMarkState = useCallback(() => {
    const pts = getSelectionPoints()
    if (!pts) {
      setMarkState({ bold: false, underline: false })
      return
    }
    const lines = valueRef.current.split("\n")
    const [start, end] = orderPoints(pts.anchor, pts.focus)
    const collapsed = start.line === end.line && start.offset === end.offset
    let bold = false
    let underline = false
    let any = false
    for (let li = start.line; li <= end.line && li < lines.length; li++) {
      const line = lines[li]
      const s = li === start.line ? start.offset : 0
      const e = li === end.line ? end.offset : parseClueMarkup(line).reduce((n, s) => n + s.text.length, 0)
      if (!collapsed && e <= s) continue
      any = true
      if (li === start.line) {
        bold = rangeHasMark(line, s, e, "bold")
        underline = rangeHasMark(line, s, e, "underline")
      } else {
        bold = bold && rangeHasMark(line, s, e, "bold")
        underline = underline && rangeHasMark(line, s, e, "underline")
      }
      if (collapsed) break
    }
    setMarkState(any ? { bold, underline } : { bold: false, underline: false })
  }, [getSelectionPoints])

  /** Toggle a mark over the current selection (Word-style: fully marked → remove). */
  const toggleMark = useCallback(
    (mark: ClueMark) => {
      const el = editorRef.current
      if (!el) return
      const pts = getSelectionPoints()
      if (!pts) return
      const [start, end] = orderPoints(pts.anchor, pts.focus)
      if (start.line === end.line && start.offset === end.offset) return // collapsed: no-op
      const lines = extractText(el).split("\n")
      for (let li = start.line; li <= end.line && li < lines.length; li++) {
        const s = li === start.line ? start.offset : 0
        const e = li === end.line ? end.offset : parseClueMarkup(lines[li]).reduce((n, s) => n + s.text.length, 0)
        lines[li] = toggleMarkInLine(lines[li], s, e, mark)
      }
      const text = lines.join("\n")
      isUserInput.current = true
      onChange(text)
      syncDomFromValue(el, text, lineWarningsRef.current, pts)
      updateMarkState()
    },
    [getSelectionPoints, onChange, updateMarkState],
  )

  const handleCursorChange = useCallback(() => {
    updateMarkState()
    if (!onCursorLine) return
    const el = editorRef.current
    if (!el) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const anchor = sel.anchorNode
    if (!anchor || !el.contains(anchor)) return
    // Walk up to find the direct child div
    let node: Node | null = anchor
    while (node && node.parentNode !== el) node = node.parentNode
    if (!node) return
    const idx = Array.from(el.children).indexOf(node as Element)
    if (idx >= 0) onCursorLine(idx)
  }, [onCursorLine, updateMarkState])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.code === "KeyB") {
          e.preventDefault()
          toggleMark("bold")
          return
        }
        if (e.code === "KeyU") {
          e.preventDefault()
          toggleMark("underline")
          return
        }
      }
      // After key processing, update cursor
      requestAnimationFrame(handleCursorChange)
    },
    [handleCursorChange, toggleMark],
  )

  const [focused, setFocused] = useState(false)
  const showPlaceholder = !value && !focused
  const fontStyle = { fontFamily: "'Heebo', sans-serif" }

  const markButton = (
    mark: ClueMark,
    Icon: typeof Bold,
    title: string,
  ) => (
    <button
      type="button"
      title={title}
      aria-pressed={markState[mark]}
      onMouseDown={(e) => e.preventDefault() /* keep editor selection */}
      onClick={() => toggleMark(mark)}
      className={cn(
        "p-1.5 rounded border transition-colors",
        markState[mark]
          ? "bg-accent border-border text-foreground"
          : "border-transparent text-muted-foreground hover:bg-accent/50",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )

  return (
    <div>
      <div className="flex gap-1 mb-1" dir="ltr">
        {markButton("bold", Bold, "הדגשה (Ctrl+B)")}
        {markButton("underline", Underline, "קו תחתון (Ctrl+U)")}
      </div>
      <div className="relative">
        {showPlaceholder && placeholder && (
          <div
            className="absolute top-2 right-3 text-sm text-muted-foreground pointer-events-none leading-normal"
            style={fontStyle}
          >
            {placeholder.split("\n").map((line, i) => (
              <div key={i} className="mb-1.5">{line}</div>
            ))}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          dir="rtl"
          onInput={handleInput}
          onPaste={handlePaste}
          onClick={handleCursorChange}
          onMouseUp={handleCursorChange}
          onKeyUp={handleCursorChange}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.() }}
          onKeyDown={handleKeyDown}
          className={cn(
            // Match shadcn textarea styles
            "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
            "min-h-[300px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs",
            "transition-[color,box-shadow] outline-none focus-visible:ring-[3px]",
            // Custom styles — line-height tight for wrapped text, spacing between defs via child div margin
            "whitespace-pre-wrap overflow-y-auto leading-normal [&>div]:mb-1.5",
            className,
          )}
          style={fontStyle}
        />
      </div>
    </div>
  )
}

// ── DOM helpers ──

function createWarningIcon(): HTMLSpanElement {
  const span = document.createElement("span")
  span.setAttribute("data-warning-icon", "true")
  span.setAttribute("contenteditable", "false")
  span.setAttribute("title", "מילה זו לא נכנסה לתשבץ")
  span.style.cssText =
    "display:inline-flex;align-items:center;margin-left:4px;user-select:none;vertical-align:middle;"
  span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`
  return span
}

/** Append formatted clue segments as nested <b>/<u> elements (bold outer, underline inner). */
function appendSegments(lineDiv: HTMLElement, clue: string) {
  for (const seg of parseClueMarkup(clue)) {
    let node: Node = document.createTextNode(seg.text)
    if (seg.underline) {
      const u = document.createElement("u")
      u.style.unicodeBidi = "isolate"
      u.appendChild(node)
      node = u
    }
    if (seg.bold) {
      const b = document.createElement("b")
      b.style.unicodeBidi = "isolate"
      b.appendChild(node)
      node = b
    }
    lineDiv.appendChild(node)
  }
}

/** Build the text content of a line div: <b>answer</b>-clue (clue keeps inline marks) */
function buildLineTextNodes(lineDiv: HTMLElement, text: string) {
  const dashIdx = text.indexOf("-")
  if (dashIdx > 0 && text.substring(0, dashIdx).trim().length > 0) {
    const b = document.createElement("b")
    // Isolate: without it, Chromium bleeds the bold glyph run into the trailing RTL text
    b.style.unicodeBidi = "isolate"
    b.textContent = text.substring(0, dashIdx)
    lineDiv.appendChild(b)
    lineDiv.appendChild(document.createTextNode("-"))
    appendSegments(lineDiv, text.substring(dashIdx + 1))
  } else {
    appendSegments(lineDiv, text)
  }
}

/** Serialize a line element back to "answer-clue" text with inline marks in the clue. */
function serializeLine(line: HTMLElement): string {
  let preDash = ""
  let pastDash = false
  // Marks collected before any dash (incomplete lines) so they survive round-trip
  const preSegments: ClueSegment[] = []
  const segments: ClueSegment[] = []
  const pushSegment = (list: ClueSegment[], text: string, bold: boolean, underline: boolean) => {
    if (!text) return
    const last = list[list.length - 1]
    if (last && last.bold === bold && last.underline === underline) {
      last.text += text
    } else {
      list.push({ text, bold, underline })
    }
  }
  const walk = (node: Node, bold: boolean, underline: boolean) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (el.hasAttribute("data-warning-icon")) return
      const b = bold || el.tagName === "B" || el.tagName === "STRONG"
      const u = underline || el.tagName === "U"
      for (const child of node.childNodes) walk(child, b, u)
      return
    }
    if (node.nodeType !== Node.TEXT_NODE) return
    let text = node.textContent || ""
    if (!pastDash) {
      const di = text.indexOf("-")
      if (di >= 0) {
        preDash += text.substring(0, di)
        pastDash = true
        text = text.substring(di + 1)
      } else {
        preDash += text
        pushSegment(preSegments, text, bold, underline)
        return
      }
    }
    pushSegment(segments, text, bold, underline)
  }
  for (const child of line.childNodes) walk(child, false, false)
  if (!pastDash) return serializeClueSegments(preSegments)
  return preDash + "-" + serializeClueSegments(segments)
}

/** Order two selection points in document order. */
function orderPoints(a: SelPoint, b: SelPoint): [SelPoint, SelPoint] {
  return a.line < b.line || (a.line === b.line && a.offset <= b.offset) ? [a, b] : [b, a]
}

/** Map a DOM position to a SelPoint (line index + plain char offset, skipping warning icons). */
function getSelPoint(el: HTMLElement, node: Node, offset: number): SelPoint | null {
  let lineNode: Node | null = node
  while (lineNode && lineNode.parentNode !== el) lineNode = lineNode.parentNode
  if (!lineNode) return null
  const line = Array.from(el.children).indexOf(lineNode as Element)
  if (line < 0) return null
  return { line, offset: getCharOffsetInLine(lineNode as Element, node, offset) }
}

/** Get the character offset of the cursor within a line (skipping warning icons). */
function getCharOffsetInLine(lineEl: Element, anchorNode: Node, anchorOffset: number): number {
  let offset = 0
  const walk = (node: Node): boolean => {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).hasAttribute("data-warning-icon"))
      return false
    if (node === anchorNode) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += anchorOffset
      }
      return true
    }
    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node.textContent || "").length
      return false
    }
    for (const child of node.childNodes) {
      if (walk(child)) return true
    }
    return false
  }
  walk(lineEl)
  return offset
}

/** Find the DOM text position at a plain char offset within a line (skipping warning icons). */
function findTextPosition(lineEl: Element, charOffset: number): { node: Node; offset: number } | null {
  let remaining = charOffset
  const find = (node: Node): { node: Node; offset: number } | null => {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).hasAttribute("data-warning-icon"))
      return null
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || "").length
      if (remaining <= len) return { node, offset: remaining }
      remaining -= len
      return null
    }
    for (const child of node.childNodes) {
      const result = find(child)
      if (result) return result
    }
    return null
  }
  return find(lineEl)
}

function extractText(el: HTMLElement): string {
  if (el.children.length === 0) return el.textContent || ""
  // Handle mixed content: bare text nodes (browser quirk) + <div> elements
  const lines: string[] = []
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ""
      if (text.trim()) lines.push(text)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elem = node as Element
      if (elem.tagName === "BR") continue
      lines.push(serializeLine(elem as HTMLElement))
    }
  }
  return lines.join("\n")
}

function syncDomFromValue(
  el: HTMLElement,
  value: string,
  lineWarnings: boolean[],
  restoreSelection?: { anchor: SelPoint; focus: SelPoint },
) {
  const lines = value.split("\n")
  if (lines.length === 0) lines.push("")

  // Save selection as (lineIndex, charOffset) pair
  let saved: { anchor: SelPoint; focus: SelPoint } | undefined = restoreSelection
  if (!saved) {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && sel.anchorNode && sel.focusNode &&
        el.contains(sel.anchorNode) && el.contains(sel.focusNode)) {
      const anchor = getSelPoint(el, sel.anchorNode, sel.anchorOffset)
      const focus = getSelPoint(el, sel.focusNode, sel.focusOffset)
      if (anchor && focus) saved = { anchor, focus }
    }
  }

  el.innerHTML = ""
  for (let i = 0; i < lines.length; i++) {
    const div = document.createElement("div")
    if (lineWarnings[i]) {
      div.appendChild(createWarningIcon())
    }
    buildLineTextNodes(div, lines[i])
    if (!div.textContent) {
      div.appendChild(document.createElement("br"))
    }
    el.appendChild(div)
  }

  // Restore selection
  if (saved) {
    const sel = window.getSelection()
    if (!sel) return
    try {
      const aPos = saved.anchor.line < el.children.length
        ? findTextPosition(el.children[saved.anchor.line] as Element, saved.anchor.offset)
        : null
      const fPos = saved.focus.line < el.children.length
        ? findTextPosition(el.children[saved.focus.line] as Element, saved.focus.offset)
        : null
      if (aPos && fPos) {
        sel.setBaseAndExtent(aPos.node, aPos.offset, fPos.node, fPos.offset)
      }
    } catch {
      // Not critical
    }
  }
}
