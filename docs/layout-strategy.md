# Layout Strategy — Multi-Variant Generation + Proposal Ranking

This document describes the core layout generation strategy in One Horizontal.
When the user clicks "יצירת תשבץ", the system generates multiple ranked proposals
rather than a single layout.

## Overview

```
Raw Clues → Variant Enumeration → Engine Calls (× attempts) → Scoring → Dedup → Top-K
```

Each click produces up to K proposals (default 5), shown as a thumbnail gallery strip.
The user clicks a thumbnail or uses prev/next arrows to browse proposals.

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

For each variant, we call the layout engine `attemptsPerVariant` times (default 20),
each as an independent single-attempt run. Each attempt shuffles the word order
randomly, producing a different layout. All results are collected individually
(not reduced to a single best per variant) so the gallery has diverse proposals.

Total engine passes = `min(2^M, maxVariants) × attemptsPerVariant`.

## Layout Validity Enforcement

Two rules are enforced in `buildGeneratorResult()` after the engine runs, in this order:

### No islands (single connected component)

All placed words must form a single connected cluster. If the engine produces
disconnected islands, only the largest connected component is kept — words from
smaller islands are moved to the unplaced list.

Connectivity is checked at the word level: two words are connected if they share
at least one cell (i.e. they cross). BFS finds connected components; the largest
wins.

### Split completeness

When a multi-word answer is split, **ALL fragments must be placed** for the answer to
count as placed. If the engine places "תל" but not "אביב", both fragments are removed
from the layout and the original answer "תל אביב" appears in the unplaced clues list.

This runs after island removal so that fragments orphaned by island removal are caught.

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
descending. The top K (default 10) are returned as `RankedProposal[]`.

Each proposal includes:
- The full `GeneratorResult` (grid, clues, layout data)
- The `adjustedScore`
- A `variantLabel` describing which variant produced it (e.g. "הכל מפוצל", "בית ספר מאוחד")

## Performance

| Scenario | Variants | Attempts | Total passes | Est. time |
|----------|----------|----------|-------------|-----------|
| 15 words, 0 multi-word | 1 | 20 | 20 | ~60ms |
| 15 words, 2 multi-word | 4 | 20 | 80 | ~240ms |
| 25 words, 3 multi-word | 8 | 20 | 160 | ~1.1s |
| 25 words, 5 multi-word | 16 (cap) | 20 | 320 | ~2.2s |

Most under 2 seconds — may consider Web Worker for large inputs with many multi-word answers.

## Editor UI Model

Each click of "שבץ מילים" generates up to K (default 10) proposals sorted by score,
replacing any previous proposals. The user browses them via a thumbnail gallery strip
(mini crossword grids), prev/next arrows, or keyboard left/right arrows. Each proposal
has its own `highlightedCells` state. No session history — each generation is a fresh batch.

If any clues could not be placed, the editor shows:
- A warning banner in the header: "לא כל המילים נכנסו לתשבץ"
- Per-line warning icons (⚠) next to each unplaced clue in the textarea, with a tooltip on hover

Loading from Firestore creates a single-element proposals array.

## Files

- `src/lib/layout-strategy.ts` — orchestrator (variant enum, scoring, dedup, ranking)
- `src/lib/crossword-generator.ts` — `buildGeneratorResult()` (post-engine: island removal, split enforcement, RTL flip, grid build), `generateFromVariant()`, `VariantClue` type
- `src/lib/layout-engine.ts` — core placement engine (inline, ported from crossword-layout-generator)
- `src/types/crossword.ts` — `RankedProposal` type
- `src/pages/EditorPage.tsx` — proposal gallery UI with thumbnail strip
