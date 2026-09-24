# Frontier 0.4.1 playtest checklist

1. Open the deployed page and check **BUILD 0.4.1**. Existing workshop money/ranks should be intact.
2. Open **Armory & unlocks**. Inspect weapon requirements, all 16 item portraits and rarities, and achievement progress. New saves begin with the pistol; starting a run unlocks the first two crate items.
3. Start Skirmish. Check the compact HUD in a small window. Inspect Build, back to pause, then Esc to resume. Detailed inventory should never leave combat running under a menu.
4. Move in eight directions; dash; change targeting. Toggle the minimap with V. Move between tabs and confirm automatic pause. Pause settings remain reachable with keyboard focus.
5. Reach level-ups. Weapon equipment cards have no rarity. Weapon-specific modifiers have explicit rarity and effects. Equip four weapons, then confirm no fifth is offered. Use level-up rerolls; they cost 20 then 40 scrap.
6. Try extra pistol rounds and piercing, shotgun pellets/range/vulnerability, arc chains and longer slow, saw drone count and width, mortar salvos and blast radius, and rail extra beams/width. Check the installed modifier details in Build.
7. Complete a salvage scan or kill an elite. Walk to its crate: it must drop an item on the ground, with a texture matching the collection. Walk onto the item and collect the one-card reward. No weapon/modifier choices should appear here.
8. Verify item-specific effects across runs: dash blast, heal pulse, chill pulse, retaliation, critical arc, kill-count heal, extra projectiles, recharging shield, reactor and one-use revival. Use Build to see stack counts and a spent Phoenix Core.
9. Earn an achievement. Check that the unlock appears in the collection during the run and persists after refresh. Refresh ends the active run but should keep earned unlock progress.
10. Play Expedition. Compare pressure with 0.3: scaling is 20% faster, while movement and the ten-minute Tyrant arrival are unchanged. Check extraction countdown and timeout.
11. Test smaller desktop windows and phone landscape. Modals should scroll/reflow without clipped actions, while the HUD leaves the center open. Check actual browser rendering frame rate during dense combat.

`npm test` covers simulation and persistence rules. `npm run build` checks TypeScript and produces the Pages bundle. Tests with boosted health are not a normal-health difficulty benchmark.

## Maintenance regression checks

- Start both modes: 10 HP before workshop/item bonuses. Move in all directions while targets change; the body and boots stay upright.
- Open pause/Build/level-up while moving, release movement, then resume. Repeat touch release outside the canvas; no stale movement/dash should remain.
- Change sound/minimap settings while paused. Resume and confirm normal rendering and controls.
- Extraction always requires three seconds, even with Survey Compass. A reward at the deadline must not postpone timeout.
- Watch dense fights for missing replacement sprites, bullets failing at their last frame, and hits/rewards after death.
