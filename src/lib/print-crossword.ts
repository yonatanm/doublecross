import type { Crossword } from "@/types/crossword"

interface PrintOptions {
  separateClues?: boolean
  largeFont?: boolean
}

export function openPrintWindow(crossword: Crossword, options: PrintOptions = {}) {
  const { largeFont = false } = options
  const separateClues = options.separateClues || largeFont
  const headingFont = "'Frank Ruhl Libre', serif"
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
  const pageHeightMm = 263
  // Grid gets ~75% of page height, rest for title + clues
  const gridHeightMm = pageHeightMm * 0.65
  const gridWidthMm = pageWidthMm

  // Cell size limited by whichever dimension is tighter
  const cellFromHeight = gridHeightMm / rows
  const cellFromWidth = gridWidthMm / cols
  const maxCellMm = 6.5
  const cellSizeMm = Math.min(cellFromHeight, cellFromWidth, maxCellMm) * 0.95
  // Convert mm to px (96dpi: 1mm ≈ 3.78px)
  const cellSize = Math.floor(cellSizeMm * 3.78)
  const fontSize = Math.max(10, Math.floor(cellSize * 0.45))
  const numFontSize = Math.max(5, Math.floor(cellSize * 0.38))

  // Flood-fill from grid edges to find interior (enclosed) empty cells
  const findInterior = () => {
    const isEmpty = (r: number, c: number) => {
      const cell = grid[r]?.[c]
      return !cell || cell.isBlocked || !cell.letter
    }
    const exterior = new Set<string>()
    const queue: [number, number][] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r === 0 || r === rows - 1 || c === 0 || c === cols - 1) && isEmpty(r, c)) {
          const key = `${r},${c}`
          if (!exterior.has(key)) {
            exterior.add(key)
            queue.push([r, c])
          }
        }
      }
    }
    while (queue.length > 0) {
      const [r, c] = queue.shift()!
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr, nc = c + dc
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const key = `${nr},${nc}`
          if (!exterior.has(key) && isEmpty(nr, nc)) {
            exterior.add(key)
            queue.push([nr, nc])
          }
        }
      }
    }
    const allInterior = new Set<string>()
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (isEmpty(r, c) && !exterior.has(`${r},${c}`)) {
          allInterior.add(`${r},${c}`)
        }
      }
    }
    const visited = new Set<string>()
    const result = new Set<string>()
    for (const key of allInterior) {
      if (visited.has(key)) continue
      const component: string[] = []
      const q: string[] = [key]
      visited.add(key)
      while (q.length > 0) {
        const cur = q.shift()!
        component.push(cur)
        const [cr, cc] = cur.split(",").map(Number)
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nk = `${cr + dr},${cc + dc}`
          if (allInterior.has(nk) && !visited.has(nk)) {
            visited.add(nk)
            q.push(nk)
          }
        }
      }
      if (component.length <= 6) {
        for (const k of component) {
          const [cr, cc] = k.split(",").map(Number)
          result.add(`${cr}-${cc}`)
        }
      }
    }
    return result
  }
  const interiorCells = findInterior()

  // Build grid HTML as a <table> with border-collapse for uniform single borders
  let gridHtml = ""
  for (let r = 0; r < rows; r++) {
    gridHtml += "<tr>"
    for (let c = 0; c < cols; c++) {
      const cell = grid[r]?.[c]
      if (!cell || cell.isBlocked || !cell.letter) {
        const cls = interiorCells.has(`${r}-${c}`) ? "blocked-interior" : "blocked"
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

  // Build clues as a flat list of items, then split into two flowing columns
  // Build flat clues HTML — CSS columns will handle the 2-column flow
  const renderClueItems = (clues: typeof clues_across) =>
    clues.map((c) => `<div class="clue"><b>${c.number}. ${c.clue} <span dir="ltr" style="white-space:nowrap">${c.answerLength.replace(/,(?!\s)/g, ", ")}</span></b></div>`).join("")


  // When separateClues is true, grid fills the page and clues go on page 2
  // Recalculate cell size for separate mode — grid can use ~90% of page height
  let gridCellSize = cellSize
  let gridFontSize = fontSize
  let gridNumFontSize = numFontSize
  if (separateClues) {
    const fullGridHeightMm = pageHeightMm * (largeFont ? 0.92 : 0.88)
    const fullCellFromHeight = fullGridHeightMm / rows
    const fullCellFromWidth = gridWidthMm / cols
    const largeFontMaxCellMm = largeFont ? 10 : maxCellMm
    const fullCellSizeMm = Math.min(fullCellFromHeight, fullCellFromWidth, largeFontMaxCellMm) * 0.95
    gridCellSize = Math.floor(fullCellSizeMm * 3.78)
    gridFontSize = Math.max(10, Math.floor(gridCellSize * 0.45))
    gridNumFontSize = Math.max(6, Math.floor(gridCellSize * 0.38))
  }

  const cluesSection = `<div class="clues${separateClues ? " clues-page" : ""}">
    ${separateClues ? `<h1>${title || ""}</h1>` : ""}
    <div class="clues-grid">
      <div class="clues-col">
        <h3>מאוזן</h3>
        ${renderClueItems(clues_across || [])}
      </div>
      <div class="clues-col">
        <h3>מאונך</h3>
        ${renderClueItems(clues_down || [])}
      </div>
    </div>
  </div>`

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${title || "תשבץ"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&family=Heebo:wght@400;500;600&display=swap');
    @page { size: A4; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Heebo', sans-serif;
      width: 186mm;
      margin: 0 auto;
      padding: 12px 6mm 0;
      color: #1A1A1A;
      background: white;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    h1 {
      font-family: ${headingFont};
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
      font-family: ${headingFont};
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
      font-weight: 700;
      font-size: ${Math.floor(gridCellSize * (largeFont ? 0.55 : 0.7))}px;
    }
    .num {
      position: absolute;
      top: 0px;
      right: 1px;
      font-size: ${gridNumFontSize}px;
      font-family: 'Heebo', sans-serif;
      font-weight: 700;
      color: #1A1A1A;
    }
    .clues {
      margin-top: ${gridCellSize}px;
    }
    .clues-page {
      page-break-before: always;
      padding-top: 12px;
    }
    .clues-page h1 {
      margin-bottom: 8px;
    }
    .clues-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: ${largeFont ? "24px" : "16px"};
    }
    .clues h3 {
      font-family: ${headingFont};
      font-size: ${largeFont ? "22px" : "16px"};
      font-weight: 700;
      text-decoration: underline;
      padding-bottom: ${largeFont ? "6px" : "3px"};
      margin-bottom: ${largeFont ? "8px" : "4px"};
    }
    .clue {
      font-size: ${largeFont ? "20px" : "13px"};
      line-height: ${largeFont ? "1.7" : "1.5"};
      margin-bottom: ${largeFont ? "4px" : "2px"};
      break-inside: avoid;
    }
    @media print {
      body { width: 100%; padding: 0 6mm; }
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
