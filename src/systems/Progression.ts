export type RunStats = { damage: number; cooldown: number; speed: number; pickupRadius: number; maxHp: number; hp: number };
export type Upgrade = { id: string; title: string; description: string; available: (stats: RunStats) => boolean; apply: (stats: RunStats) => void };

export const UPGRADES: Upgrade[] = [
  { id: 'damage', title: 'Reinforced rounds', description: 'Rust Pistol damage +1.', available: () => true, apply: s => { s.damage += 1; } },
  { id: 'rate', title: 'Quick chamber', description: 'Rust Pistol fires 20% faster.', available: s => s.cooldown > 0.09, apply: s => { s.cooldown = Math.max(0.08, s.cooldown / 1.2); } },
  { id: 'speed', title: 'Runner servos', description: 'Move speed +10% (up to 2× base).', available: s => s.speed < 470, apply: s => { s.speed = Math.min(470, s.speed * 1.1); } },
  { id: 'pickup', title: 'Salvage magnet', description: 'Pickup and attraction radius +20.', available: () => true, apply: s => { s.pickupRadius += 20; } },
  { id: 'hp', title: 'Reinforced plating', description: 'Maximum HP +1. Restore 1 HP.', available: () => true, apply: s => { s.maxHp += 1; s.hp = Math.min(s.maxHp, s.hp + 1); } },
  { id: 'repair', title: 'Repair canister', description: 'Restore 2 HP.', available: s => s.hp < s.maxHp, apply: s => { s.hp = Math.min(s.maxHp, s.hp + 2); } },
];

export class Progression {
  level = 1;
  xp = 0;
  totalXp = 0;
  get threshold(): number { return 5 + (this.level - 1) * 3; }
  gain(amount: number): void { this.xp += amount; this.totalXp += amount; }
  advance(): boolean {
    if (this.xp < this.threshold) return false;
    this.xp -= this.threshold;
    this.level++;
    return true;
  }
  choices(stats: RunStats, random = Math.random): Upgrade[] {
    const pool = UPGRADES.filter(upgrade => upgrade.available(stats));
    // Sample without replacement; every offer has three different valid effects.
    const offer: Upgrade[] = [];
    while (offer.length < 3 && pool.length) {
      offer.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    }
    return offer;
  }
}
