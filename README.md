# kaxuna.github.io

Portfolio of Kakha Philauri. Static site, no backend.

## `/` — Ten Stages (the game)

My career as a pixel-art side-scroller. Ten stages: a maths olympiad, Lund University, the COVID plot twist, Bank of Georgia, Azry, Bank of Georgia again, DevExperts, Google BigQuery, FixFox after hours, and a door to the next stage.

- `{ }` blocks hold achievements (resume bullets). Gems are skills. Bugs are for stomping.
- Keyboard: ← → move, ↑ / Space jump (hold for higher), L logbook, M sound. Touch controls appear on phones.
- The logbook shows everything as plain text, and the minimap jumps to any stage.
- Progress is saved in localStorage.

Code in `src/game/`. All content and level layouts live in [`src/game/content.ts`](src/game/content.ts); long texts come from [`src/data.ts`](src/data.ts). All art is original and drawn as character grids in `sprites.ts`.

## `/classic/` — the original portfolio

Interactive career pipeline, a DuckDB-WASM SQL console over the resume, and a terminal easter egg. Code in `src/classic/`. The pre-game version is also tagged `v1-pipeline` and kept on the `classic` branch.

## Develop

```bash
npm install
npm run dev
```

## Tools

- `npm run test:game` — Playwright play-test against the dev server on port 5174: checks every block and gem is reachable, screenshots every stage on desktop and iPhone, fails loudly on console errors.
- `npm run og` — renders `public/og.png` (link preview) from a real game frame.
- `npm run shots` — screenshots of the classic page.

## Deploy

Push to `main`. `.github/workflows/deploy.yml` builds both pages and publishes to GitHub Pages.
