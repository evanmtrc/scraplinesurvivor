export const TARGET_MODES = ['Nearest', 'Weakest', 'Strongest'] as const;
export type TargetMode = typeof TARGET_MODES[number];
export type Target = { sprite: { x: number; y: number }; hp: number };

export function selectTarget<T extends Target>(enemies: T[], x: number, y: number, range: number, mode: TargetMode): T | undefined {
  let selected: T | undefined;
  let nearest = Infinity;
  for (const enemy of enemies) {
    const d = (enemy.sprite.x - x) ** 2 + (enemy.sprite.y - y) ** 2;
    if (d > range ** 2) continue;
    const betterHp = selected && (mode === 'Weakest' ? enemy.hp < selected.hp : mode === 'Strongest' && enemy.hp > selected.hp);
    const samePriority = !selected || mode === 'Nearest' || enemy.hp === selected.hp;
    if (!selected || betterHp || (samePriority && d < nearest)) { selected = enemy; nearest = d; }
  }
  return selected;
}
