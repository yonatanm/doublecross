/**
 * Scrape crosswords from geek.co.il for user 2223.
 * Usage: npx tsx scripts/scrape-geek.ts
 * Output: scripts/geek-data.json
 */

const USER_URL = "https://geek.co.il/~mooffie/crossword/user/2223"
const BASE_URL = "https://geek.co.il"

interface GeekEntry {
  id: number
  title: string
  date: string // "YYYY-MM-DD HH:MM"
  url: string
  clues: { answer: string; clue: string }[]
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

function parseListingPage(html: string): Omit<GeekEntry, "clues">[] {
  const entries: Omit<GeekEntry, "clues">[] = []
  // Match table rows with crossword links and dates
  const rowRe = /<a\s+href="(\/~mooffie\/crossword\/(\d+))"[^>]*>([^<]+)<\/a>[\s\S]*?<td[^>]*>\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*<\/td>/g
  let m
  while ((m = rowRe.exec(html)) !== null) {
    entries.push({
      id: parseInt(m[2]),
      title: m[3].trim(),
      date: m[4].trim(),
      url: BASE_URL + m[1],
    })
  }
  return entries
}

function parseCluesFromPage(html: string): { answer: string; clue: string }[] {
  // Extract textarea content — look for the textarea after "צעד 1"
  const textareaRe = /<textarea[^>]*>([\s\S]*?)<\/textarea>/i
  const match = html.match(textareaRe)
  if (!match) return []

  const content = match[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")

  const clues: { answer: string; clue: string }[] = []

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim()
    if (!line) continue

    // Split on first " - " or "- " (some entries have no space before dash)
    const dashIdx = line.indexOf(" - ")
    const dashIdx2 = line.indexOf("- ")
    const idx = dashIdx !== -1 ? dashIdx : dashIdx2
    if (idx === -1) continue

    const answer = line.substring(0, idx).trim()
    let clueText = line.substring(idx + (dashIdx !== -1 ? 3 : 2)).trim()

    if (!answer || !clueText) continue

    // Skip reference-only clues: "ראו N מאוזן" / "ראו N מאונך"
    if (/^ראו\s+\d+\s+מא(וזן|ונך)/.test(clueText)) continue

    // Strip cross-references: "(יחד עם N מאוזן/מאונך)" or "(יחד עם...)" or partial variants
    clueText = clueText.replace(/\(יחד\s+עם[^)]*\)\s*/g, "").trim()

    // Strip trailing length suffix like (5, 3) or (4) — but keep Hebrew marks like (ש) (מ) (דו״ש)
    // Length suffix: digits/commas in parens, possibly followed by punctuation like ; or .
    clueText = clueText.replace(/\s*\(?\d+(?:,\s*\d+)*\s*\)[;.\s]*$/g, "").trim()
    clueText = clueText.replace(/\s*\(?\d+(?:,\s*\d+)*\s*\)[;.\s]*$/g, "").trim()

    if (!clueText) continue

    clues.push({ answer, clue: clueText })
  }

  return clues
}

async function main() {
  console.log("Fetching listing page...")
  const listingHtml = await fetchText(USER_URL)
  const entries = parseListingPage(listingHtml)
  console.log(`Found ${entries.length} crosswords`)

  const results: GeekEntry[] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    try {
      // Rate limit: 200ms between requests
      if (i > 0) await new Promise((r) => setTimeout(r, 200))

      const pageHtml = await fetchText(entry.url)
      const clues = parseCluesFromPage(pageHtml)

      if (clues.length === 0) {
        console.warn(`  [${i + 1}/${entries.length}] SKIP (no clues): "${entry.title}"`)
        continue
      }

      results.push({ ...entry, clues })
      console.log(`  [${i + 1}/${entries.length}] "${entry.title}" — ${clues.length} clues`)
    } catch (err) {
      console.error(`  [${i + 1}/${entries.length}] ERROR: "${entry.title}" — ${err}`)
    }
  }

  const outPath = new URL("./geek-data.json", import.meta.url).pathname
  const { writeFileSync } = await import("fs")
  writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8")
  console.log(`\nDone! Wrote ${results.length} crosswords to ${outPath}`)
}

main().catch(console.error)
