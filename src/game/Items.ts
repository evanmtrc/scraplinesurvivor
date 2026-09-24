export const ITEMS={
  magnet:{name:'Scrap Magnet',rarity:0,unlock:'license',description:'+18 pickup radius per stack.',shape:'magnet',cap:5},
  patch:{name:'Patchwork Vest',rarity:0,unlock:'license',description:'+1 maximum HP and restore 1 HP per stack.',shape:'vest',cap:5},
  flywheel:{name:'Pocket Flywheel',rarity:0,unlock:'first_blood',description:'+8% global fire rate per stack.',shape:'gear',cap:5},
  scope:{name:'Cracked Scope',rarity:0,unlock:'apprentice',description:'+4 percentage points of critical chance per stack, up to 60%.',shape:'scope',cap:5},
  boots:{name:'Kinetic Soles',rarity:1,unlock:'runner',description:'Dash cooldown −0.2s per stack, down to 1.5s.',shape:'boots',cap:5},
  ration:{name:'Repair Moss',rarity:1,unlock:'scavenger',description:'Restore 1 HP every 18s. Each stack adds 1 HP to the pulse.',shape:'moss',cap:5},
  battery:{name:'Static Battery',rarity:1,unlock:'sweep',description:'Dashing blasts nearby enemies for 3 damage per stack in a radius of 100.',shape:'battery',cap:5},
  compass:{name:'Survey Compass',rarity:1,unlock:'survey',description:'+30% XP and 15% faster salvage scans per stack.',shape:'compass',cap:5},
  ice:{name:'Cryo Lantern',rarity:2,unlock:'elite',description:'Every 6s, chill enemies within 180 for 1.5s. Deal 2 damage per stack.',shape:'lantern',cap:5},
  thorns:{name:'Barbed Carapace',rarity:2,unlock:'scarred',description:'Taking damage retaliates for 4 damage per stack in a radius of 120.',shape:'shell',cap:5},
  spark:{name:'Storm Relay',rarity:2,unlock:'chain',description:'Critical hits arc to a nearby enemy for 35% of the hit per stack. Arcs cannot trigger more arcs.',shape:'relay',cap:3},
  siphon:{name:'Siphon Fang',rarity:2,unlock:'harvest',description:'Every 40 kills, restore 1 HP per stack.',shape:'fang',cap:5},
  prism:{name:'Prismatic Manifold',rarity:3,unlock:'engineer',description:'+1 round, pellet, chain target, drone, shell or beam for every weapon per stack.',shape:'prism',cap:3},
  cloak:{name:'Phase Mantle',rarity:3,unlock:'ghost',description:'Blocks a hit, then recharges in 20s. Extra stacks shorten recharge by 3s.',shape:'cloak',cap:3},
  reactor:{name:'Tyrant Heart',rarity:4,unlock:'tyrant',description:'Every 8s, erupt for 12 damage per stack in a radius of 220.',shape:'reactor',cap:3},
  phoenix:{name:'Phoenix Core',rarity:4,unlock:'home',description:'Once per run, a lethal hit instead restores 50% HP and grants 2s immunity.',shape:'phoenix',cap:1},
} as const;
export type ItemId=keyof typeof ITEMS;
export const ITEM_IDS=Object.keys(ITEMS) as ItemId[];
export const itemTexture=(id:ItemId)=>`item-${id}`;
