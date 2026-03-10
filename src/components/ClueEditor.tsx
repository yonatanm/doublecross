import { useRef, useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface ClueEditorProps {
  value: string
  onChange: (value: string) => void
  lineWarnings: boolean[]
  onCursorLine?: (lineIndex: number) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
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

  const handleCursorChange = useCallback(() => {
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
  }, [onCursorLine])

  const handleKeyDown = useCallback(() => {
    // After key processing, update cursor
    requestAnimationFrame(handleCursorChange)
  }, [handleCursorChange])

  const [focused, setFocused] = useState(false)
  const showPlaceholder = !value && !focused
  const fontStyle = { fontFamily: "'Heebo', sans-serif" }

  return (
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

/** Build the text content of a line div: <b>answer</b>-clue or plain text */
function buildLineTextNodes(lineDiv: HTMLElement, text: string) {
  const dashIdx = text.indexOf("-")
  if (dashIdx > 0 && text.substring(0, dashIdx).trim().length > 0) {
    const b = document.createElement("b")
    b.textContent = text.substring(0, dashIdx)
    lineDiv.appendChild(b)
    lineDiv.appendChild(document.createTextNode(text.substring(dashIdx)))
  } else {
    lineDiv.appendChild(document.createTextNode(text))
  }
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

/** Place the cursor at a character offset within a line (skipping warning icons). */
function setCursorAtOffset(lineEl: Element, charOffset: number, sel: Selection) {
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
  const result = find(lineEl)
  if (result) {
    const range = document.createRange()
    range.setStart(result.node, result.offset)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  }
}

/** Extract plain text from a line element, skipping warning icons. */
function getLineText(line: HTMLElement): string {
  let text = ""
  for (const node of line.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || ""
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (!(node as Element).hasAttribute("data-warning-icon")) {
        text += node.textContent || ""
      }
    }
  }
  return text
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
      lines.push(getLineText(elem as HTMLElement))
    }
  }
  return lines.join("\n")
}

function syncDomFromValue(
  el: HTMLElement,
  value: string,
  lineWarnings: boolean[],
) {
  const lines = value.split("\n")
  if (lines.length === 0) lines.push("")

  // Save selection as (lineIndex, charOffset)
  const sel = window.getSelection()
  let savedLineIdx = -1
  let savedChar = -1
  if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
    let node: Node | null = sel.anchorNode!
    while (node && node.parentNode !== el) node = node.parentNode
    if (node) {
      savedLineIdx = Array.from(el.children).indexOf(node as Element)
      savedChar = getCharOffsetInLine(node as Element, sel.anchorNode!, sel.anchorOffset)
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
  if (savedLineIdx >= 0 && savedLineIdx < el.children.length && sel) {
    try {
      setCursorAtOffset(el.children[savedLineIdx] as Element, savedChar, sel)
    } catch {
      // Not critical
    }
  }
}
