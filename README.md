# Scrapline Survivor — Frontier 0.3

A browser-first top-down survivor built with Phaser, TypeScript, and Vite. Assemble a four-weapon salvager, read the horde's attack warnings, defeat the Scrap Tyrant, and extract with your salvage.

**[Play in your browser](https://evanmtrc.github.io/scraplinesurvivor/)**

## What's playable

- **Expedition:** Tyrant arrives at 10 minutes; extraction closes at 12 minutes.
- **Skirmish:** accelerated enemy introductions and XP, Tyrant at 2 minutes, deadline at 3 minutes. A short way to test builds.
- **Six weapons / four slots:** Rust Pistol, Scattergun, Arc Welder, Saw Drone, Mortar Pod, and Rail Spike. Owned weapons reach level 8 and can gain quality from Common through Legendary.
- **Eight enemy types:** crawlers, skitters, bruisers, spitters, bombers, shield drones, chargers, and splitters. Distinct silhouettes and behaviors, stronger elites with guaranteed chests, and a multi-attack boss.
- **Salvage:** XP, scrap, repair drops, magnetic surges, three map caches, chest rewards, and paid chest rerolls.
- **Workshop:** bank salvage after a run for three capped starting upgrades. Records, workshop progress, sound, and reduced motion settings save in this browser.
- **Presentation:** armored salvager with a cyan visor and separate moving boots, procedural creature art, attack telegraphs, damage feedback, synthesized audio, minimap, objective arrows, and a visual field guide.

## Controls

| Action | Control |
| --- | --- |
| Move | WASD or arrow keys |
| Dash | Space or Dash button; 3-second cooldown |
| Target priority | T or Target button: nearest → weakest → strongest |
| Pause / resume | Esc, P, or Pause button |
| Choose upgrade | 1 / 2 / 3 or click a card |
| Toggle audio | M or pause-menu sound button |
| Retry after a run | R or Run again |
| Touch movement | Drag the left half of the game; use the Dash button |

Weapons attack automatically. Switching tabs pauses an active run; resume explicitly. Pause includes fullscreen, reduced motion, build stats, and ending a run to bank salvage. Touch controls are an initial implementation; landscape is recommended for the fixed 16:9 arena.

## Local development

Requires a Node.js version supported by Vite 7 (20.19+ or 22.12+).

```bash
npm ci
npm run dev
npm test
npm run build
```

`npm run build` checks TypeScript and creates `dist/`. There is no backend. Sprite art is generated in code and sound is synthesized after an input gesture. Clearing site data clears local workshop progress; it does not sync between devices. An active run is not saved across refreshes.

## Browser deployment

GitHub Pages is configured with **Settings → Pages → Source: GitHub Actions**. Pushes to `main` run the existing [Deploy game to GitHub Pages](https://github.com/evanmtrc/scraplinesurvivor/actions/workflows/pages.yml) workflow: install, tests, production build, and deployment. A manual run is available in Actions. No Jekyll or HTML starter workflow is needed.

## Checks and next work

`npm test` exercises the pure simulation: movement, target priorities, pause, dash immunity, XP carryover, weapon eligibility, all six weapons, swept hits, shields, splitting enemies, attack warnings, chest rerolls, elite loot, caps, extraction, timeout, and save validation. It also drives a deterministic full expedition through high enemy density with boosted test health. This is a correctness/performance check, not a human difficulty or browser frame-rate benchmark.

This build implements the core of design phases 3–6 plus a presentation pass. Balance, low-end/mobile performance, longer human playtests, and further content remain ongoing. See [current build spec](docs/build-spec-0.3.md), [architecture](docs/architecture.md), and [playtest checklist](docs/playtest.md). The [original prototype spec](docs/build-spec-0.1.md) is retained as history.
