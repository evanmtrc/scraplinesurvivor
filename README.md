# Scrapline Survivor — Frontier 0.4.2

A browser-first top-down survivor built with Phaser, TypeScript, and Vite. Assemble a four-weapon salvager, read the horde's attack warnings, defeat the Scrap Tyrant, and extract with your salvage.

**[Play in your browser](https://evanmtrc.github.io/scraplinesurvivor/)**

## What's playable

- **Expedition:** enemy introductions, health growth, and spawn pressure use a 20% faster scaling clock. Tyrant still arrives at 10 minutes; extraction closes at 12 minutes.
- **Skirmish:** accelerated enemy introductions and XP, Tyrant at 2 minutes, deadline at 3 minutes. A short way to test builds.
- **Six weapons / four slots:** Rust Pistol, Scattergun, Arc Welder, Saw Drone, Mortar Pod, and Rail Spike. Weapons have no rarity. Five are unlocked through achievements; the Rust Pistol is the starter. Each weapon has four specific upgrade families, with Common–Legendary upgrade rolls.
- **Eight enemy types:** crawlers, skitters, bruisers, spitters, bombers, shield drones, chargers, and splitters. Distinct silhouettes and behaviors, stronger elites with guaranteed chests, and a multi-attack boss.
- **Salvage:** crates physically drop one passive item, never weapons or weapon upgrades. Sixteen achievement-unlocked items have fixed Common–Legendary rarities, distinct textures, stack limits, and effects such as dash blasts, critical chains, healing pulses, shields, and one-use revival. Rerolls now belong to level-up choices.
- **Workshop and achievements:** bank salvage for three capped starting upgrades. Seventeen achievements unlock weapons and item drop eligibility. Progress updates during runs and saves in this browser; existing workshop saves are migrated.
- **Presentation:** compact corner HUD, optional minimap, full loadout inspection in pause, responsive menus, item and weapon icons, enemy guide, and achievement collection. The armored salvager and creature style are preserved.

## Power tuning 0.4.2

All six weapons deal twice their previous base damage. Direct weapon damage upgrade bonuses also double, including Mortar's separate damage curve; Overcharged Cells now adds 30% global weapon damage.

Extra rounds, beams, chain targets, drones and shells grant **+2 / +3 / +5 / +7 / +10** across Common through Legendary. Scattergun pellet upgrades grant **+4 / +6 / +10 / +14 / +20**. Large volleys keep a bounded forward spread, and drone/shell pools accommodate the larger builds.

Base XP collection is **3×** in both modes, preserving Skirmish's additional 2× multiplier. Survey Processor now adds **36%** XP and Survey Compass **30%** XP per stack. These bonuses apply to the new tripled base and add together. Pickup-cap fallback awards use the same multiplier. Level thresholds are unchanged.

## Maintenance update 0.4.1

Starting health is now **10 HP**, plus workshop plating. The salvager remains upright while moving and targeting; only the boots animate. This update fixes input cleanup, final-segment bullet collisions, post-death damage, extraction timing, and reward/timeout edge cases. It also caches weapon modifiers, reuses collision buffers and sprite slots, and avoids repeated paused rendering and unchanged save writes. No new gameplay systems are added.

The regression suite now includes 27 groups, 16 seeded normal-health runs, full-length simulations, and audio/sprite-pool lifecycle checks. These tests do not certify a bug-free game or a particular browser frame rate.

## Controls

| Action | Control |
| --- | --- |
| Move | WASD or arrow keys |
| Dash | Space or Dash button; 3-second cooldown |
| Target priority | T or Target button: nearest → weakest → strongest |
| Pause / resume | Esc, P, or Pause button |
| Choose upgrade | 1 / 2 / 3 or click a card |
| Toggle audio | M or pause-menu sound button |
| Toggle minimap | V or pause-menu map button |
| Inspect build | Build button or pause → Loadout & items |
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

`npm run build` checks TypeScript and creates `dist/`. There is no backend. Sprite art is generated in code and sound is synthesized after an input gesture. Clearing site data clears local workshop and achievement progress; it does not sync between devices. An active run is not saved across refreshes.

## Browser deployment

GitHub Pages is configured with **Settings → Pages → Source: GitHub Actions**. Pushes to `main` run the existing [Deploy game to GitHub Pages](https://github.com/evanmtrc/scraplinesurvivor/actions/workflows/pages.yml) workflow: install, tests, production build, and deployment. A manual run is available in Actions. No Jekyll or HTML starter workflow is needed.

## Checks and next work

`npm test` exercises achievement gates, migration, item-only crate drops, all 24 weapon upgrades and item effects, plus the pure simulation: movement, target priorities, pause, dash immunity, XP carryover, weapon eligibility, all six weapons, swept hits, shields, splitting enemies, attack warnings, upgrade rerolls, elite loot, caps, extraction, timeout, and save validation. It also drives a deterministic full expedition through high enemy density with boosted test health. This is a correctness/performance check, not a human difficulty or browser frame-rate benchmark.

This build implements the core of design phases 3–6 plus a presentation pass. Balance, low-end/mobile performance, longer human playtests, and further content remain ongoing. See [current build spec](docs/build-spec-0.4.md), [architecture](docs/architecture.md), and [playtest checklist](docs/playtest.md). The [original prototype spec](docs/build-spec-0.1.md) is retained as history.
