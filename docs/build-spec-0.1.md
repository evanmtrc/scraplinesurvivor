# Build Spec 0.1

## Locked prototype decisions

| Area | Decision | Initial value / behavior |
| --- | --- | --- |
| View | Top-down, camera follows player; fixed 960 × 540 logical canvas with fit scaling | Camera easing 0.14 |
| World | One bounded scrolling arena; repeated grid and deterministic dressing | 3200 × 3200 |
| Input | WASD and arrow keys; diagonal movement normalized | 235 world units/s |
| Starting weapon | Rust Pistol, automatic nearest target in range | 1 damage, 0.42 s cooldown, 410 range |
| First enemy | Crawler, simple direct pursuit and touch damage | 2 HP, 83 units/s, 1 XP |
| XP | Gem drops at kill location; short magnetic pull; contact pickup | 28 pickup radius, pull within 92 |
| Survival | Five HP; brief invulnerability after contact; restart on death | 0.75 s invulnerability |
| Spawn | Ring near edge of view, slowly faster over time | 1.2 s initial interval, 90 enemy cap |

The numbers are starting hypotheses for playtesting, not final balance claims. The 3200-unit arena approximates a broad traversable plain without streaming. The current spawn ring clamps at world edges, so edge behavior should be checked during testing.

## Next system decisions

- **Phase 2 (implemented):** XP thresholds start at 5 and grow by 3 each level; pause simulation for a three-choice level-up screen. Initial pool: pistol fire rate, pistol damage, move speed, pickup radius, max HP, and repair. Choices should state exact effects and avoid duplicates in the same offer.
- **Phase 3:** Add Scattergun, Arc Welder, Saw Drone, Mortar Pod, and Rail Spike. Limit equipped weapons to four; weapon-specific upgrades enter the choice pool only when the weapon is owned. Distinct targeting and silhouettes matter more than rarity at this stage.
- Keep enemy, weapon, and upgrade parameters in `src/data/`; add focused systems as behavior grows. Chests, elites, boss, meta progression, and rewarded ads belong to later phases.

## Phase 1 test script

1. Move in all eight directions and against world edges; confirm equal diagonal and straight speed.
2. Stand still, kite, and cross through a group; judge responsiveness, spawn readability, and contact fairness.
3. Watch nearest-target fire, kill several crawlers, and collect their gems; confirm the XP count rises once per gem.
4. Let HP reach zero, then press R; verify all counts and enemies reset.

Record time to first kill, time to first XP, and any movement or aim failures. The main question is whether the first 30 seconds feel responsive enough to justify Phase 2.

## Phase 2 playtest

- Pause with the button, Esc, and P; verify the timer, enemies, projectiles, and HP freeze. Switch tabs and return; resume should require an explicit action.
- Cycle targeting using the button and T; damaged enemies should attract Weakest priority, and equal priorities use nearest distance.
- Collect five XP; the first level-up must stop simulation and offer three different upgrades. Choose with a click or 1–3; confirm the new effect and the next XP threshold.
- Restart from pause and from death; all run stats and XP reset. The selected targeting preference stays for the next run.
