import type { Crossword } from "@/types/crossword"

export function openPrintWindow(crossword: Crossword) {
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
    createdAt,
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
  const cellSizeMm = Math.min(cellFromHeight, cellFromWidth)
  // Convert mm to px (96dpi: 1mm ≈ 3.78px)
  const cellSize = Math.floor(cellSizeMm * 3.78)
  const fontSize = Math.max(10, Math.floor(cellSize * 0.45))
  const numFontSize = Math.max(6, Math.floor(cellSize * 0.22))

  // Build grid HTML as a <table> with border-collapse for uniform single borders
  let gridHtml = ""
  for (let r = 0; r < rows; r++) {
    gridHtml += "<tr>"
    for (let c = 0; c < cols; c++) {
      const cell = grid[r]?.[c]
      if (!cell || cell.isBlocked) {
        gridHtml += `<td class="blocked"></td>`
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

  const descriptionHtml = description ? `<p class="description">${description}</p>` : ""

  const dateParts: string[] = []
  if (createdAt) dateParts.push(`נוצר בתאריך: ${fmtDate(createdAt)}`)
  if (updatedAt) dateParts.push(`שונה לאחרונה: ${fmtDate(updatedAt)}`)
  const datesHtml = dateParts.length > 0
    ? `<div class="dates">${dateParts.join("  ·  ")}</div>`
    : ""

  // Build clues HTML
  const renderClues = (clues: typeof clues_across, heading: string) => {
    const items = clues
      .map((c) => `<div class="clue"><b>${c.number}.</b> ${c.clue} ${c.answerLength}</div>`)
      .join("")
    return `<div class="clue-col"><h3>${heading}</h3>${items}</div>`
  }

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
    .description {
      text-align: center;
      font-size: 14px;
      color: #555;
      margin-bottom: 4px;
    }
    .dates {
      text-align: center;
      font-size: 11px;
      color: #888;
      margin-bottom: 16px;
    }
    .grid-container {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
    }
    .grid {
      border-collapse: collapse;
      direction: ltr;
    }
    .grid td {
      width: ${cellSize}px;
      height: ${cellSize}px;
      text-align: center;
      vertical-align: middle;
      position: relative;
      font-family: 'Frank Ruhl Libre', serif;
      font-size: ${fontSize}px;
      font-weight: 500;
      padding: 0;
    }
    .grid td.cell {
      border: 1.5px solid #1A1A1A;
    }
    .grid td.blocked {
      border: none;
    }
    .grid td.hint {
      background: white;
    }
    .num {
      position: absolute;
      top: 1px;
      right: 2px;
      font-size: ${numFontSize}px;
      font-family: 'Heebo', sans-serif;
      font-weight: 700;
      color: #C82828;
    }
    .clues {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 8px;
    }
    .clue-col h3 {
      font-family: 'Frank Ruhl Libre', serif;
      font-size: 16px;
      font-weight: 700;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .clue {
      font-size: 13px;
      line-height: 1.6;
    }
    @media print {
      body { padding: 12px; }
      .grid td.cell { border-color: #000 !important; }
    }
  </style>
</head>
<body>
  <h1>${title || ""}</h1>
  ${descriptionHtml}
  ${datesHtml}
  <div class="grid-container">
    <table class="grid">${gridHtml}</table>
  </div>
  <div class="clues">
    ${renderClues(clues_across || [], "מאוזן")}
    ${renderClues(clues_down || [], "מאונך")}
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`

  const w = window.open("", "_blank")
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
