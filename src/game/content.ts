export const WORLD = 3200;
export const STARTING_HP = 10;
export const WEAPON_IDS = ['pistol', 'scatter', 'arc', 'saw', 'mortar', 'rail'] as const;
export type WeaponId = typeof WEAPON_IDS[number];
export const WEAPONS: Record<WeaponId, { name: string; short: string; color: number; cooldown: number; damage: number; range: number; description: string }> = {
  pistol: { name: 'Rust Pistol', short: 'PISTOL', color: 0xffdf83, cooldown: 0.42, damage: 1, range: 410, description: 'Fast, precise shots at your selected target.' },
  scatter: { name: 'Scattergun', short: 'SCATTER', color: 0xffab69, cooldown: 1.15, damage: 1.2, range: 275, description: 'A five-pellet fan that shreds nearby crowds.' },
  arc: { name: 'Arc Welder', short: 'ARC', color: 0x87e9ef, cooldown: 1.3, damage: 1.3, range: 280, description: 'Lightning chains through three enemies and slows them.' },
  saw: { name: 'Saw Drone', short: 'SAW', color: 0xbbef9a, cooldown: 0.45, damage: 1.4, range: 88, description: 'An orbiting blade protects your perimeter.' },
  mortar: { name: 'Mortar Pod', short: 'MORTAR', color: 0xffc381, cooldown: 2.1, damage: 4, range: 450, description: 'Lobs shells that explode across a wide area.' },
  rail: { name: 'Rail Spike', short: 'RAIL', color: 0xd4a5ff, cooldown: 1.7, damage: 3, range: 620, description: 'A piercing beam hits every enemy along its path.' },
};
export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as const;
export const RARITY_COLORS = ['#a8b8bb', '#a8dc92', '#84bdff', '#ce9cff', '#ffcf78'];
export type EnemyKind = 'crawler' | 'skitter' | 'bruiser' | 'spitter' | 'bomber' | 'shield' | 'charger' | 'splitter' | 'tyrant';
export const ENEMIES: Record<EnemyKind, { name: string; hp: number; speed: number; radius: number; xp: number; color: number; intro: number; description: string }> = {
  crawler: { name: 'Rust Crawler', hp: 2, speed: 83, radius: 13, xp: 1, color: 0xc96f60, intro: 0, description: 'Closes in steadily. Keep a route open.' },
  skitter: { name: 'Skitter Swarm', hp: 1, speed: 125, radius: 8, xp: 1, color: 0xd7b266, intro: 15, description: 'Small, quick packs. Area damage clears them.' },
  bruiser: { name: 'Ironback', hp: 12, speed: 48, radius: 22, xp: 4, color: 0xb28375, intro: 30, description: 'A slow armored wall. Circle around it.' },
  spitter: { name: 'Acid Spitter', hp: 5, speed: 64, radius: 14, xp: 2, color: 0xa3bd72, intro: 50, description: 'Keeps its distance and spits bright acid bolts.' },
  bomber: { name: 'Fuse Tick', hp: 4, speed: 105, radius: 12, xp: 2, color: 0xffad67, intro: 75, description: 'A flashing ring warns before its blast.' },
  shield: { name: 'Aegis Drone', hp: 9, speed: 56, radius: 16, xp: 4, color: 0x7faad7, intro: 105, description: 'Its blue aura halves damage to nearby allies.' },
  charger: { name: 'Needle Ram', hp: 7, speed: 65, radius: 15, xp: 3, color: 0xe097a6, intro: 135, description: 'A red line marks its charge. Sidestep it.' },
  splitter: { name: 'Brood Husk', hp: 9, speed: 56, radius: 18, xp: 3, color: 0xb49aca, intro: 165, description: 'Bursts into three skitters when defeated.' },
  tyrant: { name: 'The Scrap Tyrant', hp: 800, speed: 43, radius: 38, xp: 35, color: 0xf2b974, intro: 600, description: 'Charges, radial barrages, and summoned guards. Watch its tells.' },
};
export type Mode = 'expedition' | 'skirmish';
export const MODES = {
  expedition: { title: 'Expedition', bossAt: 600, deadline: 720, description: '10–12 minutes · Build, scavenge, defeat the Tyrant, extract.' },
  skirmish: { title: 'Skirmish', bossAt: 120, deadline: 180, description: '2–3 minutes · Faster XP and encounters for a short, full run.' },
};
export const LIMITS = { enemies: 180, projectiles: 200, hostile: 100, pickups: 220, effects: 180 };
export function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
export function formatTime(time: number): string { return `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`; }
