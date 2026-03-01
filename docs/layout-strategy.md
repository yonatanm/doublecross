# Layout Strategy — Multi-Variant Generation + Proposal Ranking

This document describes the core layout generation strategy in One Horizontal.
When the user clicks "יצירת תשבץ", the system generates multiple ranked proposals
rather than a single layout.

## Overview

```
Raw Clues → Variant Enumeration → Engine Calls (× attempts) → Scoring → Dedup → Top-K
```

Each click produces a **generation session** with up to K proposals (default 5).
The user navigates between proposals with arrows, and between sessions (generation runs)
with separate arrows.

## Variant Enumeration (וריאנטים)

Multi-word answers (e.g. "בית ספר") can be sent to the layout engine in two ways:

- **Split** (פיצול): each word is placed independently ("בית", "ספר")
- **Join** (איחוד): the words are concatenated ("ביתספר") and placed as one unit

For M multi-word answers, we enumerate 2^M input variants using a bitmask:
- Bit 0 = split, bit 1 = join
- Example with 2 multi-word answers: `00` (both split), `01`, `10`, `11` (both joined)

Capped at `maxVariants = 16` — covers M ≤ 4 fully. For M > 4, only the first 4
multi-word answers get full exploration; remaining are always split.

Single-word answers are unchanged across all variants.

## Engine Calls

For each variant, we call the layout engine `attemptsPerVariant` times (default 10).
Each attempt shuffles the word order randomly, producing a different layout.

Total engine passes = `min(2^M, maxVariants) × attemptsPerVariant`.

## Split Completeness Enforcement

When a multi-word answer is split, **ALL fragments must be placed** for the answer to
count as placed. If the engine places "תל" but not "אביב", both fragments are removed
from the layout and the original answer "תל אביב" appears in the unplaced clues list.

This is enforced in `buildGeneratorResult()` after the engine runs:
1. Count how many fragments each identifier (original clue) needs
2. Count how many were actually placed
3. If any identifier has `needed > 1` but `placed < needed`, remove all its fragments

This means split variants may have lower placement ratios than they would otherwise,
but the layouts they produce are always valid — no orphaned fragments.

## Scoring (ניקוד)

The layout engine produces a raw `LayoutScore` with:
- `placementRatio` — placed words / total engine-level words
- `density` — filled cells / total grid cells
- `interconnectedness` — crossing cells / filled cells
- `sizeRatio` — squareness (min dimension / max dimension)

### Adjusted Score

The engine's `placementRatio` counts engine-level words. For split variants, a
2-word answer creates 2 engine words, inflating the ratio. The strategy layer
recomputes placement relative to original clues:

- **Split answer**: "placed" only if ALL fragments were placed by the engine
- **Joined answer**: "placed" if the single concatenated word was placed

```
adjustedPlacementRatio = originalCluesPlaced / totalOriginalClues
```

The adjusted overall score uses the same weights as the engine (exported as
`DEFAULT_LAYOUT_WEIGHTS` from `layout-engine.ts`):

```
adjustedOverall = 0.35 × adjustedPlacementRatio
                + 0.25 × density
                + 0.25 × interconnectedness
                + 0.15 × sizeRatio
```

## Deduplication

Before ranking, grids are deduplicated by fingerprint:
`fingerprint = grid cells serialized as a string`

If two variants produce the same grid, only the higher-scoring one is kept.

## Ranking and Top-K

All unique results across all variants and attempts are sorted by `adjustedOverall`
descending. The top K (default 5) are returned as `RankedProposal[]`.

Each proposal includes:
- The full `GeneratorResult` (grid, clues, layout data)
- The `adjustedScore`
- A `variantLabel` describing which variant produced it (e.g. "הכל מפוצל", "בית ספר מאוחד")

## Performance

| Scenario | Variants | Attempts | Total passes | Est. time |
|----------|----------|----------|-------------|-----------|
| 15 words, 0 multi-word | 1 | 10 | 10 | ~30ms |
| 15 words, 2 multi-word | 4 | 10 | 40 | ~120ms |
| 25 words, 3 multi-word | 8 | 10 | 80 | ~560ms |
| 25 words, 5 multi-word | 16 (cap) | 10 | 160 | ~1.1s |

All under 2 seconds — no Web Worker needed.

## Editor UI Model

The editor uses a two-level navigation model:

- **Session** = one click of "יצירת תשבץ" → produces up to K proposals
- **Proposal** = one ranked layout within a session

Session history is capped at 20. Navigating forward past the last session triggers
a new generation. Each proposal has its own `highlightedCells` state.

## Files

- `src/lib/layout-strategy.ts` — orchestrator (variant enum, scoring, dedup, ranking)
- `src/lib/crossword-generator.ts` — `buildGeneratorResult()` (post-engine: RTL flip, grid build, split enforcement), `generateFromVariant()`, `VariantClue` type
- `src/lib/layout-engine.ts` — core placement engine (inline, ported from crossword-layout-generator)
- `src/types/crossword.ts` — `RankedProposal` type
- `src/pages/EditorPage.tsx` — sessions + proposal navigation UI
