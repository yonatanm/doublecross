# CLAUDE.md — One Horizontal (אחד מאוזן)

## What is this project?
A Hebrew RTL crossword puzzle builder web app. Users create crosswords by entering clue-answer pairs, auto-generate a grid layout, highlight hint cells, and print the result. 100% client-side, hosted on GitHub Pages.

## Commands
- `npm run dev` — start dev server
- `npm run build` — type-check + production build (output in `dist/`)
- `npm run lint` — ESLint
- `npm run preview` — preview production build locally

## Tech stack
- **Vite 6** + **React 19** + **TypeScript 5.8**
- **Tailwind CSS v4** + **shadcn/ui** (components in `src/components/ui/`)
- **Firebase v12** modular SDK (NOT compat) — auth + Firestore
- **react-router-dom v7** — routing with `basename="/doublecross/"`
- **@tanstack/react-query v5** — data fetching/caching
- **layout-engine** — inline crossword placement engine (in `src/lib/layout-engine.ts`, ported from crossword-layout-generator)
- **lucide-react** — icons

## Architecture
- `@/` import alias maps to `./src/*` (configured in tsconfig + vite.config)
- `base: '/doublecross/'` in vite.config.ts for GitHub Pages
- `dir="rtl"` on `<html>` — all UI is right-to-left Hebrew
- Firebase config loaded from `.env.local` via `VITE_FIREBASE_*` env vars
- Firestore collection name: `"crossword"` — complex fields (grid, clues, layout_result) are stored as JSON strings to avoid Firestore's nested array limitation
- Firestore queries use client-side sorting to avoid requiring composite indexes
- Auth: Google sign-in via AuthContext provider pattern
- **Ownership preservation**: `saveCrossword()` stamps the current user as owner (new documents only). `overwriteCrossword()` passes through whatever owner fields are in the crossword object — the caller (EditorPage auto-save) is responsible for including the original owner from `existingCrossword`
- Main content container uses `max-w-6xl px-6` matching the header for aligned edges

## Key directories
```
src/
├── types/          # TypeScript interfaces (Crossword, RawClue, RankedProposal, etc.)
├── lib/            # Utilities (firebase, firestore CRUD, layout engine/strategy/generator, print)
├── hooks/          # useAuth, useCrosswords (React Query)
├── pages/          # HomePage (listing), EditorPage (create/edit)
├── components/     # Header, CrosswordGrid, CluesDisplay, CrosswordCard
└── components/ui/  # shadcn/ui primitives (don't edit manually)
docs/
└── layout-strategy.md  # Detailed layout generation strategy documentation
```

## Coding conventions
- All user-facing text is in Hebrew
- Use `@/` path aliases for imports, never relative `../`
- Use shadcn/ui components from `@/components/ui/` for UI primitives
- Use lucide-react for icons
- Font stack: Frank Ruhl Libre (headings/serif), Heebo (body/sans)
- Light mode only — no dark theme
- The crossword grid uses CSS Grid with `direction: ltr` and natural column order (0..cols-1). RTL is handled by the generator's `startx` flip — do NOT reverse column iteration in the display
- Hebrew final letters (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ) are normalized in `cleanAnswer()`

## Important patterns
- **Layout strategy** (`src/lib/layout-strategy.ts`): orchestrates multi-variant generation — enumerates split/join combinations for multi-word answers (2^M bitmask, capped at 16), runs the engine with 20 independent single-attempt passes per variant (collecting all results individually), deduplicates grids, ranks by adjusted score, returns top-10 proposals. See `docs/layout-strategy.md` for full details
- **Crossword generator** (`src/lib/crossword-generator.ts`): `buildGeneratorResult()` handles post-engine processing — filters unplaced, enforces no-islands (keeps largest connected component only), enforces split completeness (all fragments of a split multi-word answer must be placed), applies RTL x-coordinate flip (`startx = cols + 1 - startx`), builds grid, renumbers positions. `generateFromVariant()` calls the engine and pipes through `buildGeneratorResult()`
- **Layout engine** (`src/lib/layout-engine.ts`): inline placement engine (ported from crossword-layout-generator). Multi-attempt with scoring. Exports `DEFAULT_LAYOUT_WEIGHTS` used by both engine and strategy layer
- **Print** (`src/lib/print-crossword.ts`): opens a new window with standalone HTML that auto-triggers `window.print()`. Highlighted cells show their letter on white background; other cells are empty. Uses `print-color-adjust: exact` to preserve black backgrounds. Cell size is computed dynamically to fill ~75% of A4 page
- **Editor proposals**: flat proposal gallery — each "שבץ מילים" click generates up to 10 proposals sorted by score, replacing any previous batch. Proposals shown as a thumbnail strip (mini grids, cellSize=6) with prev/next arrows + keyboard left/right. Each proposal has its own `highlightedCells`. Loading from Firestore creates a single proposal. Unplaced clues show a warning banner in the header + per-line ⚠ icons with tooltips in the textarea
- **Home page**: master-detail layout — list on the right (420px), crossword preview on the left (22px cells, no numbers). Preview shows all letters with `interactive={true}` + no-op click
- **CrosswordGrid** accepts `cellSize` (default 40) and `showNumbers` (default true) props for reuse across views
- **Cell position numbers**: red (#C82828), scaled with `0.55em` — consistent across editor, preview, and print

## Deployment
- **Live URL**: https://yonatanm.github.io/doublecross/
- **GitHub Pages** via Actions workflow: `.github/workflows/deploy.yml`
- Triggers on push to `master` (or manual `workflow_dispatch`)
- Build job: checkout → setup node 20 → `npm ci` → inject env from secrets → `npm run build` → upload `dist/` as pages artifact
- Deploy job: deploys the artifact to GitHub Pages
- **Repo secrets** (set via `gh secret set`):
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
- Firebase Console must have `yonatanm.github.io` in Authentication → Authorized domains

## Don't
- Don't use Firebase compat SDK — use modular imports only
- Don't add dark mode
- Don't edit files in `src/components/ui/` — those are managed by shadcn
- Don't commit `.env.local` (contains Firebase API keys)
