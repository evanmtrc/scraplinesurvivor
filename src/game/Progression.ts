import type { WeaponId } from './content.js';
export type Progress = { deployments:number;kills:number;dashes:number;crates:number;elites:number;bosses:number;xp:number;upgrades:number;legendary:number;damageTaken:number;wins:number;maxLevel:number;longest:number };
export const emptyProgress = ():Progress => ({deployments:0,kills:0,dashes:0,crates:0,elites:0,bosses:0,xp:0,upgrades:0,legendary:0,damageTaken:0,wins:0,maxLevel:1,longest:0});
export type Achievement = {id:string;name:string;metric:keyof Progress;goal:number;description:string};
export const ACHIEVEMENTS:Achievement[] = [
  {id:'license',name:'Salvager license',metric:'deployments',goal:1,description:'Start your first run.'},
  {id:'first_blood',name:'Making a dent',metric:'kills',goal:10,description:'Defeat 10 enemies across runs.'},
  {id:'apprentice',name:'Field apprentice',metric:'maxLevel',goal:3,description:'Reach level 3 in a run.'},
  {id:'conductor',name:'Live circuit',metric:'maxLevel',goal:5,description:'Reach level 5 in a run.'},
  {id:'runner',name:'Slip through',metric:'dashes',goal:5,description:'Dash 5 times across runs.'},
  {id:'scavenger',name:'Finders keepers',metric:'crates',goal:1,description:'Open a salvage crate.'},
  {id:'demolition',name:'Heavy recovery',metric:'crates',goal:3,description:'Open 3 crates across runs.'},
  {id:'sweep',name:'Clean sweep',metric:'kills',goal:50,description:'Defeat 50 enemies across runs.'},
  {id:'survey',name:'Read the frontier',metric:'xp',goal:100,description:'Collect 100 XP across runs.'},
  {id:'elite',name:'Big game',metric:'elites',goal:1,description:'Defeat an elite.'},
  {id:'scarred',name:'Still standing',metric:'damageTaken',goal:5,description:'Take 5 points of damage across runs.'},
  {id:'chain',name:'Live wire',metric:'kills',goal:250,description:'Defeat 250 enemies across runs.'},
  {id:'harvest',name:'Field surgeon',metric:'kills',goal:500,description:'Defeat 500 enemies across runs.'},
  {id:'engineer',name:'Bespoke machinery',metric:'upgrades',goal:15,description:'Install 15 weapon upgrades across runs.'},
  {id:'ghost',name:'Ghost in the dust',metric:'dashes',goal:25,description:'Dash 25 times across runs.'},
  {id:'tyrant',name:'Break the crown',metric:'bosses',goal:1,description:'Defeat the Scrap Tyrant.'},
  {id:'home',name:'Return to sender',metric:'wins',goal:1,description:'Complete an extraction.'},
];
export const WEAPON_UNLOCKS:Record<WeaponId,string|null> = {pistol:null,scatter:'first_blood',arc:'conductor',saw:'runner',mortar:'demolition',rail:'tyrant'};
export function achieved(progress:Progress,id:string|null):boolean { const a=ACHIEVEMENTS.find(a=>a.id===id);return id===null||!!a&&progress[a.metric]>=a.goal; }
export function mergeProgress(base:Progress,run:Progress):Progress {
  const result=emptyProgress();
  for(const key of Object.keys(result) as (keyof Progress)[]) result[key]=key==='maxLevel'||key==='longest'?Math.max(base[key],run[key]):base[key]+run[key];
  return result;
}
