# Frontier build 0.3

## Core loop

Deploy → kite and salvage → choose weapons/modules → defeat elites and recover chests → fight the Tyrant → hold extraction → invest banked scrap in the workshop.

The original movement baseline remains **235 units/s**, with normalized diagonal movement, a bounded 3200 × 3200 arena, and camera easing 0.14. Only selected speed upgrades change that baseline. Dash adds a 0.2-second burst with brief immunity and a 3-second cooldown.

| System | Current rule |
| --- | --- |
| Health | 5 base HP, 0.75-second damage immunity; armor capped at 56% |
| Level threshold | `5 + 3 × (level − 1) + floor(0.7 × max(0, level − 5)²)` |
| Early build | First level-up guarantees two new weapon options and one module |
| Weapons | Four simultaneous slots, six weapon identities, eight ranks each |
| Quality | Common, Uncommon, Rare, Epic, Legendary; chests improve quality |
| Chest rerolls | Up to two per chest, 20 then 40 run scrap |
| Salvage scans | Three map nodes; accumulate four seconds nearby, then recover a chest |
| Expedition | Boss at 600 seconds; extraction deadline 720 seconds |
| Skirmish | Enemy schedule ×4, collected XP ×2, boss at 120 seconds, deadline 180 seconds |
| Extraction | After boss defeat, remain in the cyan beacon for three seconds; progress decays outside |
| Banking | Remaining earned scrap + floor(kills / 10 + cores × 5), plus extraction bonus of 150 / 50 |
| Workshop | Three ranks each of +1 starting HP, +6 pickup radius, +10 starting run scrap |

## Arsenal

| Weapon | Role / scaling |
| --- | --- |
| Rust Pistol | Reliable automatic single-target fire |
| Scattergun | Five-pellet fan; extra pellet at ranks 3 and 6 |
| Arc Welder | Chained hits and brief slow; extra target every second rank |
| Saw Drone | Close-range orbit; extra drone at ranks 3 and 6; growing orbit radius |
| Mortar Pod | Delayed area strike; growing blast radius |
| Rail Spike | Long-range shot piercing every target along its line |

Weapon ranks increase damage and most attack rates. Upgrade cards calculate the relative increase for the current rank. Global modules modify damage, rate, speed, pickup radius, health, repair, critical chance, armor, and XP gain. Rarity adds 22% of the weapon's unmodified quality damage per tier.

## Hostile roster

| Enemy | Distinct behavior |
| --- | --- |
| Crawler | Direct pursuit; rust-colored segmented body |
| Skitter | Small, fast, often arrives in groups |
| Bruiser | Slow armored HP wall |
| Spitter | Keeps distance, telegraphs, fires a hostile bolt |
| Bomber | Approaches and warns before a local explosion; self-detonation drops no loot |
| Shield drone | Protects nearby allies with a visible blue aura |
| Charger | Locks a lane, winds up, then dashes |
| Splitter | Breaks into three skitters when killed |
| Scrap Tyrant | Cycles charge, radial barrage, and reinforcements; attacks faster below half health |

Elites are larger, marked by gold rings, have five times regular HP, and guarantee a chest plus cores and scrap. These are the initial implementations of phases 3–6; remaining work is primarily playtest-driven balance, performance profiling, content depth, and presentation refinement. Monetization is not part of this build.
