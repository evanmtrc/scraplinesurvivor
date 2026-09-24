# Technical architecture

## Responsibilities

| File | Responsibility |
| --- | --- |
| `src/main.ts` | Phaser boot and 960 × 540 logical viewport, fit scaling |
| `src/game/content.ts` | Weapon/enemy definitions, modes, entity caps, geometry helpers |
| `src/game/GameModel.ts` | Renderer-independent simulation, director, combat, drops, levels, chests, objectives, run result |
| `src/game/SaveData.ts` | Versioned browser save validation, workshop prices, purchases |
| `src/game/Art.ts` | Procedural textures generated once; no downloaded assets |
| `src/game/AudioBus.ts` | Gesture-unlocked Web Audio cues with throttling, voice cap, mute |
| `src/scenes/GameScene.ts` | Input, camera, model update, rendering, audio dispatch, save settlement |
| `src/systems/GameUI.ts` | Native DOM HUD, focus-managed dialogs, hangar, guide, workshop |
| `src/systems/SpritePool.ts` | Sprite reuse and reset on acquisition |
| `tests/systems.test.mjs` | Deterministic simulation regression checks |

## Simulation

`GameModel.tick()` accepts elapsed seconds and a movement/dash input. It clamps a frame to 50 ms, then updates movement, encounter director, enemy behavior, weapon cooldowns, projectiles, delayed mortar shells, pickups, objectives, and progression. Time advances only in `running`; `briefing`, `paused`, `upgrade`, `chest`, and `ended` freeze simulation. UI and renderer derive from this model.

Randomness is injected into the constructor. Tests transpile the three pure TypeScript modules into a temporary directory and supply seeded RNGs. They need neither Phaser nor a browser. Rendering and input still require browser playtesting.

Entities live in capped arrays. Enemies use a local spatial grid for separation. Fast bullets use swept segment/circle collision to avoid passing through targets between frames. Shield drones reduce damage to nearby allies. Rendering reuses sprites, shares graphics layers, and caps floating damage labels at 36. Audio limits voices and frequent cues.

Enemy cap: 180; friendly projectiles: 200; hostile projectiles: 100; pickups: 220; effects: 180; mortar shells: 20. Bosses and elites can replace an ordinary enemy when the cap is full. Pickup overflow merges values rather than discarding XP. Ordinary enemies far outside the camera are recycled near the player. The model remains deliberately simple: no physics engine, pathfinding, terrain collision, networking, or destructible environment.

## UI and persistence

Native buttons support mouse, keyboard, and touch. Modal focus is trapped; run controls are disabled behind a modal. The scene clears transient touch/dash input on pause and pauses when focus or visibility is lost. Sound requires a browser input gesture. Reduced motion suppresses camera shake, damage vignette, character bobbing, and CSS transitions.

The save is localStorage key `scrapline-save-v1`. Parsing clamps numeric values and supplies defaults. Purchases validate funds and rank limits. Run rewards settle once, so revisiting results cannot bank twice. Starting supply scrap can pay rerolls but cannot be banked as free profit. Unavailable storage falls back to session memory with an in-game notification.

The Pages workflow tests and builds a static `dist/`. Vite's repository base path keeps asset URLs valid on GitHub Pages.
