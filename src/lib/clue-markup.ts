/**
 * Inline markup for clue (definition) text.
 *
 * Storage format (inside the clue string, after the "answer-" dash):
 *   **bold**   __underline__
 *
 * The format is plain-text safe: it is stored as-is in Firestore JSON and
 * never rendered via innerHTML — React renders parsed segments, and print
 * escapes each segment before wrapping it in <b>/<u> tags.
 */

export interface ClueSegment {
  text: string
  bold: boolean
  underline: boolean
}

export type ClueMark = "bold" | "underline"

/** Parse markup into formatted segments. Unclosed markers apply to end of text. */
export function parseClueMarkup(text: string): ClueSegment[] {
  const segments: ClueSegment[] = []
  let bold = false
  let underline = false
  let buf = ""
  const flush = () => {
    if (buf) {
      segments.push({ text: buf, bold, underline })
      buf = ""
    }
  }
  let i = 0
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      flush()
      bold = !bold
      i += 2
    } else if (text.startsWith("__", i)) {
      flush()
      underline = !underline
      i += 2
    } else {
      buf += text[i]
      i += 1
    }
  }
  flush()
  return segments
}

/** Serialize segments back to markup. Underline nests inside bold: **__text__** */
export function serializeClueSegments(segments: ClueSegment[]): string {
  // Merge adjacent segments with identical formatting
  const merged: ClueSegment[] = []
  for (const s of segments) {
    if (!s.text) continue
    const last = merged[merged.length - 1]
    if (last && last.bold === s.bold && last.underline === s.underline) {
      last.text += s.text
    } else {
      merged.push({ ...s })
    }
  }
  return merged
    .map((s) => {
      let t = s.text
      if (s.underline) t = `__${t}__`
      if (s.bold) t = `**${t}**`
      return t
    })
    .join("")
}

/** Plain text with all markers removed. */
export function stripClueMarkup(text: string): string {
  return parseClueMarkup(text)
    .map((s) => s.text)
    .join("")
}

/**
 * Toggle a mark over the plain-text range [start, end) of a single editor line.
 * Offsets are in rendered (marker-free) coordinates across the whole line.
 * Marks apply only to the clue region (after the first "answer-" dash);
 * the answer is always bold and is never touched.
 * If the entire affected range already has the mark, it is removed; otherwise added.
 */
export function toggleMarkInLine(
  line: string,
  start: number,
  end: number,
  mark: ClueMark,
): string {
  if (end <= start) return line
  const dashIdx = line.indexOf("-")
  const clueStart = dashIdx > 0 ? dashIdx + 1 : 0
  const prefix = dashIdx > 0 ? line.substring(0, dashIdx + 1) : ""
  const clue = dashIdx > 0 ? line.substring(dashIdx + 1) : line

  // Intersect selection with the clue region (clue-local coordinates)
  const s = Math.max(start, clueStart) - clueStart
  const e = Math.min(end, line.length) - clueStart
  if (e <= s) return line

  const segments = parseClueMarkup(clue)

  // Determine current state over [s, e): if fully marked, this toggle removes
  let covered = 0
  let markedCount = 0
  let pos = 0
  for (const seg of segments) {
    const segEnd = pos + seg.text.length
    const overlap = Math.min(e, segEnd) - Math.max(s, pos)
    if (overlap > 0) {
      covered += overlap
      if (seg[mark]) markedCount += overlap
    }
    pos = segEnd
  }
  const removing = covered > 0 && markedCount === covered

  // Rebuild: apply target state to the affected copies
  const result: ClueSegment[] = []
  pos = 0
  for (const seg of segments) {
    const segEnd = pos + seg.text.length
    const from = Math.max(s, pos)
    const to = Math.min(e, segEnd)
    if (from > pos) result.push({ ...seg, text: seg.text.substring(0, from - pos) })
    if (to > from) {
      result.push({
        ...seg,
        text: seg.text.substring(from - pos, to - pos),
        [mark]: !removing,
      })
    }
    if (segEnd > to) result.push({ ...seg, text: seg.text.substring(to - pos) })
    pos = segEnd
  }

  return prefix + serializeClueSegments(result)
}

/** True if every character of the clue region within [start, end) has the mark. */
export function rangeHasMark(
  line: string,
  start: number,
  end: number,
  mark: ClueMark,
): boolean {
  const dashIdx = line.indexOf("-")
  const clueStart = dashIdx > 0 ? dashIdx + 1 : 0
  const clue = dashIdx > 0 ? line.substring(dashIdx + 1) : line
  if (start === end) {
    // Collapsed: report state of the segment at the cursor
    const idx = Math.min(Math.max(start - clueStart, 0), Math.max(clue.length - 1, 0))
    let pos = 0
    for (const seg of parseClueMarkup(clue)) {
      if (idx < pos + seg.text.length) return seg[mark]
      pos += seg.text.length
    }
    return false
  }
  const s = Math.max(start, clueStart) - clueStart
  const e = Math.min(end, line.length) - clueStart
  if (e <= s) return false // selection doesn't intersect the clue region
  let covered = 0
  let markedCount = 0
  let pos = 0
  for (const seg of parseClueMarkup(clue)) {
    const segEnd = pos + seg.text.length
    const overlap = Math.min(e, segEnd) - Math.max(s, pos)
    if (overlap > 0) {
      covered += overlap
      if (seg[mark]) markedCount += overlap
    }
    pos = segEnd
  }
  return covered > 0 && markedCount === covered
}

const escapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

/** Render markup to safe HTML: each segment is escaped, then wrapped in <b>/<u>. */
export function clueMarkupToHtml(text: string): string {
  return parseClueMarkup(text)
    .map((s) => {
      let t = s.text.replace(/[&<>"']/g, (ch) => escapeMap[ch])
      if (s.underline) t = `<u>${t}</u>`
      if (s.bold) t = `<b>${t}</b>`
      return t
    })
    .join("")
}
