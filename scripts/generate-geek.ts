/**
 * Generate crossword grids for scraped geek.co.il data.
 * No Firebase needed — pure computation.
 *
 * Usage: npx tsx --tsconfig tsconfig.json -r tsconfig-paths/register scripts/generate-geek.ts
 * Input:  scripts/geek-data.json (from scrape-geek.ts)
 * Output: public/geek-ready.json (served by the web app for browser upload)
 */

import { readFileSync, writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

import { generateProposals } from "../src/lib/layout-strategy"
import type { RawClue } from "../src/types/crossword"

const __dirname = dirname(fileURLToPath(import.meta.url))

interface GeekEntry {
  id: number
  title: string
  date: string
  url: string
  clues: { answer: string; clue: string }[]
}

async function main() {
  const dataPath = resolve(__dirname, "geek-data.json")
  const entries: GeekEntry[] = JSON.parse(readFileSync(dataPath, "utf-8"))
  console.log(`Loaded ${entries.length} crosswords from geek-data.json`)

  const results: object[] = []
  let skipped = 0
  let failed = 0

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]

    const rawClues: RawClue[] = entry.clues.map((c) => ({
      answer: c.answer,
      clue: c.clue,
    }))

    if (rawClues.length < 2) {
      console.warn(`  [${i + 1}/${entries.length}] SKIP (too few clues): "${entry.title}"`)
      skipped++
      continue
    }

    try {
      const proposals = generateProposals(rawClues, {
        attemptsPerVariant: 20,
        topK: 1,
      })

      if (proposals.length === 0) {
        console.warn(`  [${i + 1}/${entries.length}] SKIP (no layout): "${entry.title}"`)
        failed++
        continue
      }

      const best = proposals[0].result
      const unplaced = best.unplacedClues.length
      const label = unplaced > 0 ? ` (${unplaced} unplaced)` : ""

      results.push({
        geekId: entry.id,
        title: entry.title,
        date: entry.date,
        geekUrl: `https://geek.co.il/~mooffie/crossword/${entry.id}`,
        raw_clues: rawClues,
        grid: best.grid,
        clues_across: best.clues_across,
        clues_down: best.clues_down,
        layout_result: best.layout_result,
        layout_rows: best.rows,
        layout_cols: best.cols,
        grid_size: Math.max(best.rows, best.cols),
      })

      console.log(`  [${i + 1}/${entries.length}] "${entry.title}" — ${best.clues_across.length}↔ ${best.clues_down.length}↕${label}`)
    } catch (err) {
      console.error(`  [${i + 1}/${entries.length}] ERROR: "${entry.title}" — ${err}`)
      failed++
    }
  }

  const outPath = resolve(__dirname, "..", "public", "geek-ready.json")
  writeFileSync(outPath, JSON.stringify(results), "utf-8")
  console.log(`\nDone! Generated: ${results.length}, Skipped: ${skipped}, Failed: ${failed}`)
  console.log(`Output: ${outPath}`)
}

main().catch(console.error)
