import { parseClueMarkup } from "@/lib/clue-markup"

// unicode-bidi: isolate — prevents Chromium from bleeding bold/underline glyph runs
// into adjacent RTL text across the element boundary
const isolate = { unicodeBidi: "isolate" } as const

/** Renders clue text with inline marks (**bold**, __underline__) as real formatting. */
export default function MarkedText({ text }: { text: string }) {
  const segments = parseClueMarkup(text)
  return (
    <>
      {segments.map((s, i) =>
        s.bold && s.underline ? (
          <b key={i} style={isolate}><u style={isolate}>{s.text}</u></b>
        ) : s.bold ? (
          <b key={i} style={isolate}>{s.text}</b>
        ) : s.underline ? (
          <u key={i} style={isolate}>{s.text}</u>
        ) : (
          s.text
        ),
      )}
    </>
  )
}
