import type { WeaponId } from './content.js';
export type ModStat='damage'|'rate'|'count'|'pierce'|'range'|'slow'|'blast'|'orbit'|'width'|'shred';
export type WeaponMod={id:string;weapon:WeaponId;name:string;stat:ModStat;values:number[];unit:string;cap:number;detail?:string};
const damage=[0.4,0.6,0.9,1.3,1.8],rate=[0.12,0.18,0.27,0.38,0.5],count=[2,3,5,7,10];
export const WEAPON_MODS:WeaponMod[]=[
  {id:'pistol_load',weapon:'pistol',name:'Hot loads',stat:'damage',values:damage,unit:'% bullet damage',cap:4},
  {id:'pistol_twin',weapon:'pistol',name:'Twin trigger',stat:'count',values:count,unit:' extra rounds per volley',cap:3},
  {id:'pistol_drill',weapon:'pistol',name:'Drill rounds',stat:'pierce',values:[1,2,3,4,6],unit:' additional targets pierced',cap:3},
  {id:'pistol_action',weapon:'pistol',name:'Clockwork action',stat:'rate',values:rate,unit:'% pistol fire rate',cap:4},
  {id:'scatter_payload',weapon:'scatter',name:'Packed shells',stat:'count',values:[4,6,10,14,20],unit:' pellets per blast',cap:3},
  {id:'scatter_choke',weapon:'scatter',name:'Long choke',stat:'range',values:[45,65,90,125,170],unit:' range; tighter pellet spread',cap:3},
  {id:'scatter_shred',weapon:'scatter',name:'Razor shot',stat:'shred',values:[0.12,0.18,0.25,0.35,0.5],unit:'% vulnerability on hit for 3 seconds',cap:3},
  {id:'scatter_breach',weapon:'scatter',name:'Breach charge',stat:'damage',values:damage,unit:'% pellet damage',cap:4},
  {id:'arc_fork',weapon:'arc',name:'Forked conductor',stat:'count',values:count,unit:' additional chain targets',cap:3},
  {id:'arc_reach',weapon:'arc',name:'Jump leads',stat:'range',values:[30,45,65,90,125],unit:' acquisition and chain range',cap:3},
  {id:'arc_stasis',weapon:'arc',name:'Stasis filament',stat:'slow',values:[0.35,0.5,0.8,1.2,1.8],unit:'s slow duration',cap:3},
  {id:'arc_voltage',weapon:'arc',name:'Overvoltage',stat:'damage',values:damage,unit:'% arc damage',cap:4},
  {id:'saw_swarm',weapon:'saw',name:'Drone rack',stat:'count',values:count,unit:' orbiting saw drones',cap:3},
  {id:'saw_reach',weapon:'saw',name:'Wide gyros',stat:'orbit',values:[8,12,18,25,35],unit:' orbit radius; blades grow by half as much',cap:3},
  {id:'saw_teeth',weapon:'saw',name:'Carbide teeth',stat:'damage',values:damage,unit:'% saw damage',cap:4},
  {id:'saw_drive',weapon:'saw',name:'Torque drive',stat:'rate',values:rate,unit:'% contact hit rate and orbit speed',cap:4},
  {id:'mortar_salvo',weapon:'mortar',name:'Salvo rack',stat:'count',values:count,unit:' additional shells per salvo',cap:3},
  {id:'mortar_blast',weapon:'mortar',name:'Blast casing',stat:'blast',values:[10,15,23,32,45],unit:' blast radius',cap:3},
  {id:'mortar_charge',weapon:'mortar',name:'Seismic charge',stat:'damage',values:[0.5,0.8,1.2,1.7,2.4],unit:'% shell damage',cap:4},
  {id:'mortar_loader',weapon:'mortar',name:'Belt loader',stat:'rate',values:rate,unit:'% salvo fire rate',cap:4},
  {id:'rail_split',weapon:'rail',name:'Beam splitter',stat:'count',values:count,unit:' additional piercing beams',cap:3},
  {id:'rail_lens',weapon:'rail',name:'Broad-spectrum lens',stat:'width',values:[3,5,8,12,18],unit:' beam hit radius',cap:3},
  {id:'rail_capacitor',weapon:'rail',name:'Capacitor bank',stat:'damage',values:damage,unit:'% beam damage',cap:4},
  {id:'rail_cycle',weapon:'rail',name:'Rapid induction',stat:'rate',values:rate,unit:'% beam fire rate',cap:4},
];
export function modDescription(mod:WeaponMod,rarity:number):string {
  const value=mod.values[rarity];return `+${mod.unit.startsWith('%')?Math.round(value*100):value}${mod.unit}.`;
}
export function rollRarity(random:()=>number,boost=0):number {
  const value=Math.min(0.999999,random()+boost);
  return value<0.5?0:value<0.78?1:value<0.93?2:value<0.99?3:4;
}
