/** Phase 1 values live here so feel changes do not require scene rewrites. */
export const BALANCE = {
  worldSize: 3200,
  player: { speed: 235, radius: 13, maxHp: 5, invulnerability: 0.75, pickupRadius: 28 },
  pistol: { damage: 1, cooldown: 0.42, range: 410, speed: 600, lifetime: 0.8, radius: 5 },
  crawler: { speed: 83, radius: 13, hp: 2, contactDamage: 1, xp: 1 },
  spawn: { firstDelay: 0.9, initialInterval: 1.2, minimumInterval: 0.48, maxEnemies: 90, distance: 430 },
  limits: { bullets: 70, gems: 120 },
} as const;
