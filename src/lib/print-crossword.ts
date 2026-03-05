import type { Crossword } from "@/types/crossword"

interface PrintOptions {
  separateClues?: boolean
}

export function openPrintWindow(crossword: Crossword, options: PrintOptions = {}) {
  const { separateClues = false } = options
  const {
    title,
    description,
    grid,
    clues_across,
    clues_down,
    highlighted_cells,
    layout_result,
    layout_cols: cols,
    layout_rows: rows,
    updatedAt,
  } = crossword

  if (!grid || !cols || !rows) return

  // A4 portrait usable area (mm) with ~12mm margins
  const pageWidthMm = 186
  const pageHeightMm = 273
  // Grid gets ~75% of page height, rest for title + clues
  const gridHeightMm = pageHeightMm * 0.72
  const gridWidthMm = pageWidthMm

  // Cell size limited by whichever dimension is tighter
  const cellFromHeight = gridHeightMm / rows
  const cellFromWidth = gridWidthMm / cols
  const maxCellMm = 7
  const cellSizeMm = Math.min(cellFromHeight, cellFromWidth, maxCellMm) * 0.95
  // Convert mm to px (96dpi: 1mm ≈ 3.78px)
  const cellSize = Math.floor(cellSizeMm * 3.78)
  const fontSize = Math.max(10, Math.floor(cellSize * 0.45))
  const numFontSize = Math.max(4, Math.floor(cellSize * 0.22 * 2 * 0.75))

  // Check if a blocked cell has letter cells on all 4 sides
  const hasLetterAllSides = (r: number, c: number) => {
    const has = (nr: number, nc: number) => {
      const cell = grid[nr]?.[nc]
      return cell && !cell.isBlocked && !!cell.letter
    }
    return has(r - 1, c) && has(r + 1, c) && has(r, c - 1) && has(r, c + 1)
  }

  // Build grid HTML as a <table> with border-collapse for uniform single borders
  let gridHtml = ""
  for (let r = 0; r < rows; r++) {
    gridHtml += "<tr>"
    for (let c = 0; c < cols; c++) {
      const cell = grid[r]?.[c]
      if (!cell || cell.isBlocked || !cell.letter) {
        const cls = hasLetterAllSides(r, c) ? "blocked-interior" : "blocked"
        gridHtml += `<td class="${cls}"></td>`
      } else {
        const pos = `${r}-${c}`
        const isHighlighted = (highlighted_cells || []).includes(pos)
        const word = (layout_result || []).find(
          (d) => d.starty === r + 1 && d.startx === c + 1
        )
        const label = word?.position
        const letter = isHighlighted && cell.letter ? cell.letter : ""
        gridHtml += `<td class="cell${isHighlighted ? " hint" : ""}">
          ${letter}
          ${label != null ? `<span class="num">${label}</span>` : ""}
        </td>`
      }
    }
    gridHtml += "</tr>"
  }

  // Format timestamp { seconds } → "DD/MM/YYYY HH:MM"
  const fmtDate = (ts?: { seconds: number }) => {
    if (!ts) return ""
    const d = new Date(ts.seconds * 1000)
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const hh = String(d.getHours()).padStart(2, "0")
    const min = String(d.getMinutes()).padStart(2, "0")
    return `${dd}/${mm}/${d.getFullYear()} ${hh}:${min}`
  }

  const subParts: string[] = []
  if (description) subParts.push(description)
  if (updatedAt) subParts.push(`שונה לאחרונה: ${fmtDate(updatedAt)}`)
  const sublineHtml = subParts.length > 0
    ? `<div class="subline">${subParts.join("  ·  ")}</div>`
    : ""

  // Build clues HTML
  const renderClues = (clues: typeof clues_across, heading: string) => {
    const items = clues
      .map((c) => `<div class="clue"><b>${c.number}.</b> ${c.clue} ${c.answerLength}</div>`)
      .join("")
    return `<div class="clue-col"><h3>${heading}</h3>${items}</div>`
  }

  // When separateClues is true, grid fills the page and clues go on page 2
  // Recalculate cell size for separate mode — grid can use ~90% of page height
  let gridCellSize = cellSize
  let gridFontSize = fontSize
  let gridNumFontSize = numFontSize
  if (separateClues) {
    const fullGridHeightMm = pageHeightMm * 0.88
    const fullCellFromHeight = fullGridHeightMm / rows
    const fullCellFromWidth = gridWidthMm / cols
    const fullCellSizeMm = Math.min(fullCellFromHeight, fullCellFromWidth, maxCellMm) * 0.95
    gridCellSize = Math.floor(fullCellSizeMm * 3.78)
    gridFontSize = Math.max(10, Math.floor(gridCellSize * 0.45))
    gridNumFontSize = Math.max(4, Math.floor(gridCellSize * 0.22 * 2 * 0.75))
  }

  const cluesSection = `<div class="clues${separateClues ? " clues-page" : ""}">
    ${separateClues ? `<h1>${title || ""}</h1>` : ""}
    ${renderClues(clues_across || [], "מאוזן")}
    ${renderClues(clues_down || [], "מאונך")}
  </div>`

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${title || "תשבץ"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&family=Heebo:wght@400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Heebo', sans-serif;
      padding: 24px;
      color: #1A1A1A;
      background: white;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    h1 {
      font-family: 'Frank Ruhl Libre', serif;
      font-size: 22px;
      margin-bottom: 4px;
      text-align: center;
    }
    .subline {
      text-align: center;
      font-size: 12px;
      color: #777;
      margin-bottom: 12px;
    }
    .grid-container {
      display: flex;
      justify-content: center;
      margin-bottom: ${separateClues ? "0" : "24px"};
    }
    .grid {
      border-collapse: collapse;
      direction: ltr;
    }
    .grid td {
      width: ${gridCellSize}px;
      height: ${gridCellSize}px;
      text-align: center;
      vertical-align: middle;
      position: relative;
      font-family: 'Frank Ruhl Libre', serif;
      font-size: ${gridFontSize}px;
      font-weight: 500;
      padding: 0;
    }
    .grid td.cell {
      border: 1.5px solid #1A1A1A;
    }
    .grid td.blocked {
      border: none;
    }
    .grid td.blocked-interior {
      background: #1A1A1A;
      border: 1.5px solid #1A1A1A;
    }
    .grid td.hint {
      background: white;
    }
    .num {
      position: absolute;
      top: 1px;
      right: 2px;
      font-size: ${gridNumFontSize}px;
      font-family: 'Heebo', sans-serif;
      font-weight: 700;
      color: #1A1A1A;
    }
    .clues {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 6px;
    }
    .clues-page {
      page-break-before: always;
      padding-top: 12px;
    }
    .clues-page h1 {
      grid-column: 1 / -1;
      margin-bottom: 8px;
    }
    .clue-col h3 {
      font-family: 'Frank Ruhl Libre', serif;
      font-size: 14px;
      font-weight: 700;
      border-bottom: 1px solid #ccc;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }
    .clue {
      font-size: 11px;
      line-height: 1.35;
    }
    @media print {
      body { padding: 12px; }
      .grid td.cell { border-color: #000 !important; }
    }
  </style>
</head>
<body>
  <h1>${title || ""}</h1>
  ${sublineHtml}
  <div class="grid-container">
    <table class="grid">${gridHtml}</table>
  </div>
  ${cluesSection}
  <script>window.onload = () => window.print();</script>
</body>
</html>`

  const w = window.open("", "_blank")
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
