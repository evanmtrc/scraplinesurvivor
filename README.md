# Scrapline Survivor — Phase 1 graybox

A browser-first top-down auto-shooter prototype. Move with **WASD** or arrow keys. The Rust Pistol targets the nearest crawler automatically. Kill crawlers, collect XP, and see how long you survive. Press **R** after a run ends to retry.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` checks TypeScript and produces `dist/`.

## Test in a browser without installing anything

After GitHub Pages is enabled in **Settings → Pages → Build and deployment → Source: GitHub Actions**, merges to `main` deploy the game to `https://evanmtrc.github.io/scraplinesurvivor/`. The first deployment appears in the repository's **Actions** tab; use its deployment link once it succeeds. The published page is public.

## Scope

This is the Phase 1 feel test: movement, one auto-targeting weapon, one chasing enemy, spawn pacing, contact damage, XP drops and pickup, HUD, and restart. Shapes are generated in code. Phase 2 adds XP thresholds, three-choice level-ups, and timer progression; Phase 3 adds five distinct weapons and a four-slot cap. See [Build Spec 0.1](docs/build-spec-0.1.md) and [Architecture](docs/architecture.md).

No ads, external art, or account setup are involved. The game is intentionally a graybox and its balance values are provisional.
