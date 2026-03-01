import type { Crossword } from "@/types/crossword"

export function openPrintWindow(crossword: Crossword) {
  const {
    title,
    grid,
    clues_across,
    clues_down,
    highlighted_cells,
    layout_result,
    layout_cols: cols,
    layout_rows: rows,
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

  // Build grid HTML: iterate rows, then columns in order (RTL handled by generator flip + LTR grid)
  let gridHtml = ""
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r]?.[c]
      if (!cell) continue

      const pos = `${r}-${c}`
      const isHighlighted = (highlighted_cells || []).includes(pos)

      // Find position label
      const word = (layout_result || []).find(
        (d) => d.starty === r + 1 && d.startx === c + 1
      )
      const label = word?.position

      if (cell.isBlocked) {
        gridHtml += `<span class="cell blocked"></span>`
      } else {
        const letter = isHighlighted && cell.letter ? cell.letter : ""
        gridHtml += `<span class="cell${isHighlighted ? " hint" : ""}">
          ${letter}
          ${label != null ? `<span class="num">${label}</span>` : ""}
        </span>`
      }
    }
  }

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
      margin-bottom: 16px;
      text-align: center;
    }
    .grid-container {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
    }
    .grid {
      display: inline-grid;
      grid-template-columns: repeat(${cols}, ${cellSize}px);
      direction: ltr;
    }
    .cell {
      width: ${cellSize}px;
      height: ${cellSize}px;
      border: 1.5px solid #1A1A1A;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      font-family: 'Frank Ruhl Libre', serif;
      font-size: ${fontSize}px;
      font-weight: 500;
    }
    .cell.blocked {
      background: #1A1A1A !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .cell.hint {
      background: white;
    }
    .num {
      position: absolute;
      top: 1px;
      right: 2px;
      font-size: ${numFontSize}px;
      font-family: 'Heebo', sans-serif;
      font-weight: 600;
      color: #666;
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
      .cell { border: 1.5px solid #000 !important; }
      .cell.blocked { background: #000 !important; }
    }
  </style>
</head>
<body>
  <h1>${title || ""}</h1>
  <div class="grid-container">
    <div class="grid">${gridHtml}</div>
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
