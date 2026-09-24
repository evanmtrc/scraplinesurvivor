# Technical architecture

## Stack and layout

- **Phaser 3 + TypeScript + Vite:** browser canvas/WebGL game with a small static build.
- `src/main.ts`: game boot, renderer, and viewport.
- `src/scenes/GameScene.ts`: Phase 1 orchestration, input, camera, HUD, movement, targeting, hits, drops, and death.
- `src/data/balance.ts`: tunable prototype numbers.
- `src/systems/SpritePool.ts`: reuse of enemies, bullets, and pickup sprites.
- `docs/`: decisions and playtest notes.

## Update flow

The scene clamps the frame delta, moves the player, spawns and moves crawlers, fires at the nearest in-range target, moves projectiles and resolves circle hits, then attracts and collects gems. UI derives from scene state. Pooled sprites are hidden on release; active entities are kept in small typed arrays. Enemy count, projectile count, and gem count have explicit caps. There is no physics solver or pathfinding.

Phase 2 uses `Progression.ts` for XP and eligible upgrade choices, `targeting.ts` for automatic target selection, and `GameUI.ts` for keyboard-accessible controls and dialogs. A single run state gates simulation updates: running, paused, upgrade, or ended. Game time, damage, spawns, projectiles, and pickups stop outside running. Focus loss pauses a running game; an upgrade dialog remains pending. For Phase 3, replace the pistol-specific fire method with a weapon interface and per-weapon cooldown state. Keep one scene as the coordinator until complexity warrants scene splits. Use deterministic seeded random input for reproducible balance tests once upgrade randomness arrives.

## Build order

1. Phase 1 graybox (implemented): input → movement/camera → crawler spawn/chase → pistol targeting/hits → XP pickup → survival/restart.
2. Playtest the first 30 seconds and adjust `balance.ts`.
3. Phase 2 (implemented): XP thresholds and pause → three distinct choices → upgrades and timer pacing.
4. Phase 3: weapon abstraction → five additional weapons → four-slot cap → owned-weapon upgrades → visual clarity pass.

Deployable output is `dist/` after `npm run build`; no server state is required.
