# Frontier playtest checklist

## Fast browser pass

1. Hard refresh the Pages build if needed. Confirm **FRONTIER OPERATIONS // BUILD 0.3** in the hangar.
2. Open the field guide. Inspect eight regular enemy portraits plus the Tyrant. Scroll to the arsenal and return.
3. Start **Skirmish**. Check the armored salvager and the original movement feel in eight directions and near world edges.
4. Use dash to cross an enemy lane; confirm the cooldown and brief immunity. Cycle targeting with T and the button.
5. Pause with Esc/P/button. Enemies, projectiles, clock, and HP should freeze. Resume and switch tabs to check automatic pause. Change sound and reduced motion.
6. Collect XP. Choose with both a number key and a mouse click. Get four weapons; confirm no fifth weapon is offered. Try each weapon across several runs.
7. Watch the different enemy attack warnings. Prioritize a shield drone and inspect damage to its former allies. Kill a splitter and watch its skitters.
8. Hold near a green map marker to recover a cache. Kill an elite and collect its gold chest. Check quality rewards and reroll affordability/limit.
9. Fight the Tyrant at 2:00. Kill it, follow the cyan arrow, and hold extraction. In another run, verify timeout at 3:00.
10. Open results, inspect banked scrap, visit the workshop, buy an affordable upgrade, then start again. Confirm it applies to the next run and survives refresh.

## Longer pass

- Play a full Expedition with normal health from a fresh workshop. Record first upgrade time, deaths, build, level, boss kill time, and extraction outcome.
- Check whether later levels interrupt too often, whether weapons feel distinct, and whether shield/bomber/charger tells remain readable in dense packs.
- Inspect rendering frame rate and responsiveness on a lower-powered laptop and mobile landscape. Model simulation timing is not a browser performance measurement.
- Exercise a long run near corners, resize/fullscreen, touch movement plus Dash, rapid pause/resume, and browser audio muted/unmuted.
- Check menu overflow, text size, keyboard focus, and reduced motion with actual users.

## Automated coverage

Run `npm test` then `npm run build`. The full-run automated scenario starts with extra weapons and boosted health to reach late-game behavior reliably. It verifies simulation integrity under load; it does not certify normal-health difficulty, audio quality, rendering performance, or touch ergonomics.
