export type WorkshopId = 'plating' | 'magnet' | 'supplies';
export type SaveData = { version: 1; bank: number; bestKills: number; bestTime: number; wins: number; runs: number; upgrades: Record<WorkshopId, number>; muted: boolean; reducedMotion: boolean };
export const WORKSHOP: { id: WorkshopId; name: string; description: string; cost: number }[] = [
  { id: 'plating', name: 'Hull reinforcement', description: '+1 starting HP per rank. Maximum 3.', cost: 70 },
  { id: 'magnet', name: 'Magnetic coupler', description: '+6 starting pickup radius per rank. Maximum 3.', cost: 50 },
  { id: 'supplies', name: 'Supply cache', description: '+10 in-run scrap per rank. Maximum 3.', cost: 60 },
];
const safeNumber = (value: unknown, cap = 100000000) => typeof value === 'number' && Number.isFinite(value) ? Math.min(cap, Math.max(0, Math.floor(value))) : 0;
export function parseSave(raw: string | null): SaveData {
  let d: any = {};
  try { d = JSON.parse(raw ?? '{}') ?? {}; } catch { /* Corrupt saves start clean. */ }
  return { version: 1, bank: safeNumber(d.bank), bestKills: safeNumber(d.bestKills), bestTime: safeNumber(d.bestTime, 720), wins: safeNumber(d.wins), runs: safeNumber(d.runs), upgrades: { plating: safeNumber(d.upgrades?.plating, 3), magnet: safeNumber(d.upgrades?.magnet, 3), supplies: safeNumber(d.upgrades?.supplies, 3) }, muted: d.muted === true, reducedMotion: d.reducedMotion === true };
}
export function workshopCost(save: SaveData, id: WorkshopId): number { return WORKSHOP.find(x => x.id === id)!.cost * (save.upgrades[id] + 1); }
export function purchase(save: SaveData, id: WorkshopId): boolean {
  const cost = workshopCost(save, id);
  if (save.upgrades[id] >= 3 || save.bank < cost) return false;
  save.bank -= cost; save.upgrades[id]++; return true;
}
export function readSave(): SaveData {
  try {
    const raw = localStorage.getItem('scrapline-save-v1');
    const save = parseSave(raw);
    if (!raw) save.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    return save;
  } catch { return parseSave(null); }
}
export function writeSave(save: SaveData): boolean {
  try { localStorage.setItem('scrapline-save-v1', JSON.stringify(save)); return true; } catch { return false; }
}
