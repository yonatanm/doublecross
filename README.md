# תשבצים — Tashbetzim

**A free, open-source Hebrew crossword builder and solver.**

Live at **[tashbetzim.co.il](https://tashbetzim.co.il/)**

---

Build Hebrew crosswords from scratch — type your clues and answers, auto-generate a grid, tweak it, print it, or share a link so anyone can solve it online. No login required to solve. No ads. No tracking. Just crosswords.

## What can you do with it?

- Write clue-answer pairs and generate a crossword grid automatically
- Pick from multiple layout proposals ranked by quality
- Highlight hint cells to help solvers
- Print to A4 — grid + clues, or grid and clues on separate pages
- Publish and share a solve link (works great in WhatsApp, Telegram, etc.)
- Solve published crosswords with keyboard-driven Hebrew input
- Confetti when you finish :)

## Tech

React + TypeScript + Vite, styled with Tailwind CSS and shadcn/ui. Firebase for auth and storage. Fully client-side — hosted on GitHub Pages.

## Getting started

```bash
npm install
npm run dev
```

You'll need a `.env.local` with your own Firebase config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Other commands:

| Command | What it does |
|---------|-------------|
| `npm run build` | Type-check + production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview the production build locally |

## Contributing

PRs and issues are welcome! This is a side project built with care — if you have ideas for making Hebrew crosswords better, I'd love to hear them.

## License

MIT — see [LICENSE](LICENSE).
