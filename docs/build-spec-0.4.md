# Frontier 0.4 — weapons, items and unlocks

## UI and pacing

The arena HUD shows compact health/time/level, small weapon icons, and Build, Aim, Pause, and Dash controls. Empty slots, item descriptions, rarity labels, currency totals, and detailed statistics are in pause/build inspection. V toggles the minimap; it defaults off. Modal menus use the full browser viewport and reflow at 700px and 480px widths. Esc closes a submenu before it resumes a paused run.

Expedition's enemy scaling clock is `elapsed × 1.2`, accelerating introductions, spawn pressure and health progression by 20%. This applies to Expedition generally; the request followed three user playtests and is not an unlock after three runs. Skirmish retains `elapsed × 4` and its XP multiplier. Movement remains 235 units/s. Boss/extraction times stay 600/720 and 120/180 seconds respectively. A Tyrant warning occurs 15 seconds before arrival.

## Weapons and level-up upgrades

Weapons have **no rarity or automatic weapon level**. Rust Pistol is the starter; achievements unlock the other five for subsequent level-up equipment offers. Unlocks become eligible during the current run as soon as earned. Four weapon slots remain.

| Weapon | Unlock | Specific upgrade families |
| --- | --- | --- |
| Rust Pistol | Starter | Hot loads, Twin trigger, Drill rounds, Clockwork action |
| Scattergun | 10 cumulative kills | Packed shells, Long choke, Razor shot, Breach charge |
| Arc Welder | Reach level 5 | Forked conductor, Jump leads, Stasis filament, Overvoltage |
| Saw Drone | 5 cumulative dashes | Drone rack, Wide gyros, Carbide teeth, Torque drive |
| Mortar Pod | 3 opened crates | Salvo rack, Blast casing, Seismic charge, Belt loader |
| Rail Spike | Defeat the Tyrant | Beam splitter, Broad-spectrum lens, Capacitor bank, Rapid induction |

Each of the 24 modifier families has Common, Uncommon, Rare, Epic, and Legendary versions. Values are explicit in `Upgrades.ts`. Most families allow three selections; damage/rate families allow four. Bonuses add to that weapon's base multiplier. Level-up offers prioritize two eligible weapon modifiers, substituting one newly available weapon while slots remain, and a salvager training option. Capped families leave the pool. No item is offered on level-up.

Base rarity distribution is 50% Common, 28% Uncommon, 15% Rare, 6% Epic, 1% Legendary. Later levels shift rolls upward by at most six percentage points. Every twelfth level offers a Legendary modifier when an eligible family remains. Rerolls cost 20 then 40 run scrap, capped at two per level-up. Training choices retain health/movement/general-stat options and carry no rarity.

## Item-only salvage

Walking to a crate opens it and drops one textured item nearby. Walk over the item to inspect and collect it. Crates never grant a weapon or weapon upgrade and cannot be rerolled. Achievement eligibility is checked when the crate opens. Better crate tiers increase the chance of rarer eligible items. No item slot limit; individual stack limits prevent runaway effects. A capped duplicate recycles into 15 scrap. Items reset when a new run begins; their unlocks persist.

| Item | Rarity | Unlock | Effect |
| --- | --- | --- | --- |
| Scrap Magnet | Common | Start a run | +18 pickup radius per stack |
| Patchwork Vest | Common | Start a run | +1 max HP and heal 1 per stack |
| Pocket Flywheel | Common | 10 kills | +8% of base global fire rate per stack |
| Cracked Scope | Common | Level 3 | +4 critical percentage points per stack, capped at 60% |
| Kinetic Soles | Uncommon | 5 dashes | Dash cooldown −0.2s per stack |
| Repair Moss | Uncommon | Open 1 crate | Heal 1 HP per stack every 18s |
| Static Battery | Uncommon | 50 kills | Dash-triggered damage pulse |
| Survey Compass | Uncommon | 100 XP | More XP and faster cache scans |
| Cryo Lantern | Rare | Kill an elite | Periodic area chill and damage |
| Barbed Carapace | Rare | Take 5 damage | Retaliation pulse when hit |
| Storm Relay | Rare | 250 kills | Critical hits chain damage once to a nearby enemy |
| Siphon Fang | Rare | 500 kills | Heal every 40 kills |
| Prismatic Manifold | Epic | Install 15 weapon upgrades | Extra round/pellet/chain/drone/shell/beam for each weapon |
| Phase Mantle | Epic | 25 dashes | Recharging single-hit protection |
| Tyrant Heart | Legendary | Defeat the Tyrant | Large periodic reactor blast |
| Phoenix Core | Legendary | Extract once | One lethal-hit revival per run |

All items and weapons have procedural icon textures. The collection shows locked entries, requirements, exact progress, rarity for items, and current eligibility. Achievements count across both run modes, except highest-level goals which use the best run.

## Save migration

Workshop progress and currency are preserved. Existing best kills are credited as a known lower bound on cumulative kills; old runs/wins/time are also credited. Historical dashes, crates and upgrades were not recorded, so they are not invented. New progress is persisted periodically and when an achievement unlocks. Clearing browser site data clears this local save. No account/cloud sync is added.

## Validation boundary

Automated tests cover all modifier families, actual multi-shot/piercing/chaining/saw/salvo behavior, item stats and combat hooks, unlock gating, migration, item-only drops, pause, caps, boss/extraction and full deterministic runs. The full-run tests use boosted health to reach late combat reliably. They are not proof of normal-health balance or low-end rendering performance.
