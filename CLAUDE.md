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
- **react-router-dom v7** — routing with `basename="/one-horizontal/"`
- **@tanstack/react-query v5** — data fetching/caching
- **crossword-layout-generator** — CJS module for grid layout
- **lucide-react** — icons

## Architecture
- `@/` import alias maps to `./src/*` (configured in tsconfig + vite.config)
- `base: '/one-horizontal/'` in vite.config.ts for GitHub Pages
- `dir="rtl"` on `<html>` — all UI is right-to-left Hebrew
- Firebase config loaded from `.env.local` via `VITE_FIREBASE_*` env vars
- Firestore collection name: `"crossword"` — complex fields (grid, clues, layout_result) are stored as JSON strings to avoid Firestore's nested array limitation
- Firestore queries use client-side sorting to avoid requiring composite indexes
- Auth: Google sign-in via AuthContext provider pattern

## Key directories
```
src/
├── types/          # TypeScript interfaces (Crossword, RawClue, etc.)
├── lib/            # Utilities (firebase, firestore CRUD, crossword generator, print)
├── hooks/          # useAuth, useCrosswords (React Query)
├── pages/          # HomePage (listing), EditorPage (create/edit)
├── components/     # Header, CrosswordGrid, CluesDisplay, CrosswordCard
└── components/ui/  # shadcn/ui primitives (don't edit manually)
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
- **Crossword generator** (`src/lib/crossword-generator.ts`): shuffles clues, calls `crossword-layout-generator`, applies RTL x-coordinate flip (`startx = cols + 1 - startx`), renumbers positions
- **Print** (`src/lib/print-crossword.ts`): opens a new window with standalone HTML that auto-triggers `window.print()`. Highlighted cells show their letter on white background; other cells are empty. Uses `print-color-adjust: exact` to preserve black backgrounds. Cell size is computed dynamically to fill ~75% of A4 page
- **Editor undo/redo**: history array of `{result, highlightedCells}` entries with an index pointer

## Deployment
- **Live URL**: https://yonatanm.github.io/one-horizontal/
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
