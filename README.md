# kakha-portfolio

Interactive portfolio for Kakha Philauri. Static site, no backend.

- **Pipeline** — career drawn as an animated data pipeline on `<canvas>`. Click any node.
- **SQL console** — DuckDB-WASM runs in the browser over tables generated from the resume. Includes a toy Teradata → BigQuery translator.
- **Skills** — years of hands-on use per skill.
- **Terminal** — press `~` anywhere. `help`, `cat google.md`, `git log --graph`, `top`, `curl github` (live GitHub API), `leetcode`, `piano`, `climb`.

## Edit content

Everything comes from [`src/data.ts`](src/data.ts): experiences, skills, LeetCode snapshot, links. Change it and every view updates.

## Run

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Push to a GitHub repo (`kaxuna.github.io` for a root URL, or any repo name for `/repo/`).
2. Repo settings → Pages → Source: **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and deploys.

DuckDB-WASM (~5 MB) loads from jsDelivr only when the SQL tab opens, and is cached by the browser afterwards.

## Tools

- `npm run shots` — desktop + iPhone screenshots of every view via Playwright and the installed Chrome (needs `npm run dev` running).
- `npm run artifact` — single-file build in `dist-artifact/kakha-portfolio.html` for sandboxed previews (SQL tab disabled there).
