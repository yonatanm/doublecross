import { useRef, useState, useEffect, useCallback } from "react"
import { Bold, Underline } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

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

  // Use <b>/<u> tags instead of styled spans for formatting
  useEffect(() => {
    document.execCommand('styleWithCSS', false, 'false')
  }, [])

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

  const handleInput = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    isUserInput.current = true
    const text = serializeElement(el)
    onChange(text)
    // Rebuild DOM to ensure proper structure (one <div> per line) with <b>/<u> elements.
    syncDomFromValue(el, text, lineWarningsRef.current)
  }, [onChange])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyB' || e.code === 'KeyU')) {
      e.preventDefault()
      document.execCommand(e.code === 'KeyB' ? 'bold' : 'underline', false, undefined)
    }
    // After key processing, update cursor
    requestAnimationFrame(handleCursorChange)
  }, [handleCursorChange])

  const [isBold, setIsBold] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [focused, setFocused] = useState(false)
  const showPlaceholder = !value && !focused
  const fontStyle = { fontFamily: "'Heebo', sans-serif" }

  const updateFormattingState = useCallback(() => {
    setIsBold(document.queryCommandState('bold'))
    setIsUnderline(document.queryCommandState('underline'))
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', updateFormattingState)
    return () => document.removeEventListener('selectionchange', updateFormattingState)
  }, [updateFormattingState])

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
      <div className="flex gap-1 mb-1">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            isBold ? "bg-primary/10 text-primary" : "bg-transparent",
            "focus-visible:ring-0",
          )}
          onClick={() => document.execCommand('bold', false, undefined)}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            isUnderline ? "bg-primary/10 text-primary" : "bg-transparent",
            "focus-visible:ring-0",
          )}
          onClick={() => document.execCommand('underline', false, undefined)}
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </Button>
      </div>
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
        onKeyDown={(e) => { handleKeyDown(e); updateFormattingState() }}
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

// ── Serialization ──

/** Serialize the entire editor content to a string with whitelisted <b>/<u> HTML. */
function serializeElement(el: HTMLElement): string {
  return Array.from(el.children as HTMLCollectionOf<HTMLElement>).map(serializeLine).join('\n')
}

/** Serialize one line div to an HTML string, preserving <b>/<u> tags. */
function serializeLine(lineEl: HTMLElement): string {
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || '')
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as Element
    if (el.hasAttribute('data-warning-icon')) return ''
    const tag = el.tagName.toLowerCase()
    if (tag === 'b' || tag === 'u') {
      const inner = Array.from(el.childNodes).map(walk).join('')
      return `<${tag}>${inner}</${tag}>`
    }
    // Unknown element: flatten to text content
    return Array.from(el.childNodes).map(walk).join('')
  }
  return Array.from(lineEl.childNodes).map(walk).join('')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

/** Parse an HTML string into DOM nodes for a line div. */
function parseLineHtml(html: string): Node[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<root>${html}</root>`, 'text/html')
  const root = doc.body.querySelector('root')
  return root ? Array.from(root.childNodes) : []
}

function syncDomFromValue(
  el: HTMLElement,
  value: string,
  lineWarnings: boolean[],
) {
  const lines = value.split('\n')
  if (lines.length === 0) lines.push('')

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

  el.innerHTML = ''
  for (let i = 0; i < lines.length; i++) {
    const div = document.createElement('div')
    if (lineWarnings[i]) {
      div.appendChild(createWarningIcon())
    }
    const lineHtml = lines[i]
    if (!lineHtml || !lineHtml.trim()) {
      div.appendChild(document.createElement('br'))
    } else {
      const nodes = parseLineHtml(lineHtml)
      nodes.forEach(n => div.appendChild(n.cloneNode(true)))
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

/** Get the character offset of the cursor within a line (skipping warning icons). */
function getCharOffsetInLine(lineEl: Element, anchorNode: Node, anchorOffset: number): number {
  let offset = 0
  const walk = (node: Node): boolean => {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).hasAttribute('data-warning-icon'))
      return false
    if (node === anchorNode) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += anchorOffset
      }
      return true
    }
    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node.textContent || '').length
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
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).hasAttribute('data-warning-icon'))
      return null
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || '').length
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
