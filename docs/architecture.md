# Technical architecture

## Responsibilities

| File | Responsibility |
| --- | --- |
| `src/main.ts` | Phaser boot and 960 × 540 logical viewport, fit scaling |
| `src/game/content.ts` | Weapon/enemy definitions, modes, entity caps, geometry helpers |
| `src/game/GameModel.ts` | Renderer-independent simulation, director, combat, drops, levels, chests, objectives, run result |
| `src/game/Progression.ts` | Cumulative achievement metrics, unlock gates and per-run snapshot merging |
| `src/game/Upgrades.ts` | 24 weapon-specific modifier definitions, five tiers and rarity rolls |
| `src/game/Items.ts` | 16 passive item definitions, rarity, achievement gates and stack limits |
| `src/game/ItemArt.ts` | Shared item and weapon icon textures for drops, HUD and menus |
| `src/game/SaveData.ts` | Versioned browser save validation, workshop prices, purchases |
| `src/game/Art.ts` | Procedural textures generated once; no downloaded assets |
| `src/game/AudioBus.ts` | Gesture-unlocked Web Audio cues with throttling, voice cap, mute |
| `src/scenes/GameScene.ts` | Input, camera, model update, rendering, audio dispatch, save settlement |
| `src/systems/GameUI.ts` | Native DOM HUD, focus-managed dialogs, hangar, guide, workshop |
| `src/systems/SpritePool.ts` | Sprite reuse and reset on acquisition |
| `tests/systems.test.mjs` | Deterministic simulation regression checks |

## Simulation

`GameModel.tick()` accepts elapsed seconds and a movement/dash input. It clamps a frame to 50 ms, then updates movement, encounter director, enemy behavior, weapon cooldowns, projectiles, delayed mortar shells, pickups, objectives, and progression. Time advances only in `running`; `briefing`, `paused`, `upgrade`, `chest`, and `ended` freeze simulation. UI and renderer derive from this model.

Randomness is injected into the constructor. Tests transpile the pure TypeScript modules into a temporary directory and supply seeded RNGs. They need neither Phaser nor a browser. Rendering and input still require browser playtesting.

Entities live in capped arrays. Enemies use a local spatial grid for separation. Fast bullets use swept segment/circle collision to avoid passing through targets between frames. Shield drones reduce damage to nearby allies. Rendering reuses sprites, shares graphics layers, and caps floating damage labels at 36. Audio limits voices and frequent cues.

Enemy cap: 180; friendly projectiles: 200; hostile projectiles: 100; pickups: 220; effects: 180; mortar shells: 20. Bosses and elites can replace an ordinary enemy when the cap is full. Pickup overflow merges values rather than discarding XP. Ordinary enemies far outside the camera are recycled near the player. The model remains deliberately simple: no physics engine, pathfinding, terrain collision, networking, or destructible environment.

## UI and persistence

The small in-run HUD uses four weapon icons, compact health/time, and a Build button. The minimap is opt-in. Detailed item/weapon information is in pause. Modals are mounted outside the scaled arena so they can use the browser viewport on small screens. Native buttons support mouse, keyboard, and touch. Modal focus is trapped; run controls are disabled behind a modal. The scene clears transient touch/dash input on pause and pauses when focus or visibility is lost. Sound requires a browser input gesture. Reduced motion suppresses camera shake, damage vignette, character bobbing, and CSS transitions.

The save retains localStorage key `scrapline-save-v1`, with a version 2 payload. Older records preserve bank, workshop ranks, preferences and known best-run kills; only recorded history is credited to achievements. The model holds an immutable baseline plus current-run metrics. Merging snapshots repeatedly never double counts. New unlocks save immediately, normal progress every five seconds, and focus loss/end also save. Active-run inventory itself is not restored after reload. Parsing clamps numeric values and supplies defaults. Purchases validate funds and rank limits. Run rewards settle once, so revisiting results cannot bank twice. Starting supply scrap can pay level-up rerolls but cannot be banked as free profit. Unavailable storage falls back to session memory with an in-game notification.

The Pages workflow tests and builds a static `dist/`. Vite's repository base path keeps asset URLs valid on GitHub Pages.

## Upgrade and item boundaries

Weapons store only identity, cooldown, and installed modifiers. Modifiers store their own rarity and belong to exactly one weapon. Derived weapon stats drive both hit geometry and visible drone positions. Weapon slots remain capped at four; modifier families have per-run stack caps.

Crates generate one eligible item and leave a textured ground drop. Collection pauses for a one-card item reveal. Item stacks apply passive stats or explicit combat hooks; proc damage cannot recursively trigger critical chains. Phoenix revival is tracked separately from inventory count and cannot be refreshed by duplicates. Max-stack duplicates recycle into scrap. Items never appear in level-up choices, and weapon choices never appear in crate rewards.

## Maintenance 0.4.1

Base health is `STARTING_HP = 10`. The player body is an upright camera anchor; target angles control weapons only. Movement input is cleared when entering a modal, on focus loss, and at restart, including pointer release outside the canvas.

Weapon stat caches are keyed by weapon identity, installed-modifier count and Prism stacks; installed modifiers are append-only during a run. Projectile collision reuses candidate storage, rejects distant candidates with bounds checks, and checks the final partial lifetime segment. Sprite pools use a free list, and rendering releases expired IDs before acquiring replacements. Paused frames skip graphics/UI reconstruction; explicit actions still refresh the UI. Progress checks run at HUD cadence and identical save snapshots are not written again. Audio tables are shared and the twelve-voice limit is enforced.
