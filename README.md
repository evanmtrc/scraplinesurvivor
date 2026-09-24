# Scrapline Survivor — Phase 2 survival loop

A browser-first top-down auto-shooter prototype. Move with **WASD** or arrow keys. The Rust Pistol fires automatically. Use the **Target** button or **T** to cycle nearest, weakest, and strongest enemies. Use **Pause**, **Esc**, or **P** to pause; switching tabs also pauses the run. Kill crawlers, collect XP, and see how long you survive. Press **R** after a run ends to retry.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` checks TypeScript and produces `dist/`.

## Test in a browser without installing anything

After GitHub Pages is enabled in **Settings → Pages → Build and deployment → Source: GitHub Actions**, merges to `main` deploy the game to `https://evanmtrc.github.io/scraplinesurvivor/`. GitHub may suggest Jekyll or HTML starter workflows; skip those. The existing [Deploy game to GitHub Pages](https://github.com/evanmtrc/scraplinesurvivor/actions/workflows/pages.yml) workflow builds the game. Use **Actions → Deploy game to GitHub Pages → Run workflow** (branch `main`) for a manual deploy. The published page is public.

## Scope

Phase 2 adds XP levels (5 XP initially, then +3 per threshold), three distinct upgrade choices, pause/resume, targeting controls, and growing spawn pressure. Extra XP carries forward and each choice applies once. Use **1 / 2 / 3** or click a card to choose. Movement starts at the original 235 units/s; speed changes only if a speed upgrade is selected. Shapes are generated in code. Phase 3 adds five distinct weapons and a four-slot cap. See [Build Spec 0.1](docs/build-spec-0.1.md) and [Architecture](docs/architecture.md).

No ads, external art, or account setup are involved. The game is intentionally a graybox and its balance values are provisional.

## Checks

`npm test` verifies XP carryover, upgrade eligibility, healing limits, and target selection. `npm run build` checks TypeScript and generates the deployable bundle.
