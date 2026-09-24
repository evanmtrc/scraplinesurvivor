import { ENEMIES, LIMITS, MODES, WEAPONS, WEAPON_IDS, WORLD, STARTING_HP, XP_GAIN_MULTIPLIER, segmentDistance, type EnemyKind, type Mode, type WeaponId } from './content.js';
import type { SaveData } from './SaveData.js';
import { achieved, emptyProgress, mergeProgress, WEAPON_UNLOCKS, type Progress } from './Progression.js';
import { ITEMS, ITEM_IDS, type ItemId } from './Items.js';
import { WEAPON_MODS, modDescription, rollRarity, type ModStat } from './Upgrades.js';
export type RunState = 'briefing' | 'running' | 'paused' | 'upgrade' | 'chest' | 'ended';
export type Entity = { id: number; x: number; y: number };
export type Enemy = Entity & { kind: EnemyKind; hp: number; maxHp: number; radius: number; elite: boolean; angle: number; clock: number; windup: number; attack: string; dash: number; flash: number; slow: number; shielded: boolean; sawHit: number; exposed:number; exposureTime:number };
export type Shot = Entity & { vx: number; vy: number; ttl: number; color: number; damage: number; hostile: boolean; radius: number; pierce:number; hits:Set<number>; shred:number };
export type Pickup = Entity & { kind: 'xp' | 'scrap' | 'heal' | 'magnet'; value: number };
export type Chest = Entity & { tier: number };
export type Node = Entity & { progress: number; done: boolean; alerted: boolean };
export type Weapon = { id: WeaponId; mods:{id:string;rarity:number}[]; clock: number };
export type ItemDrop = Entity & { item:ItemId };
export type WeaponStats = Record<ModStat,number>;
export type Effect = Entity & { kind: 'ring' | 'line' | 'number' | 'spark'; color: number; life: number; maxLife: number; radius: number; tx: number; ty: number; text: string };
export type Shell = Entity & { fromX: number; fromY: number; time: number; damage: number; radius: number };
export type Choice = { id: string; title: string; description: string; tag: string; rarity: number|null; kind: 'equip' | 'weaponMod' | 'module' | 'item'; weapon?: WeaponId; stat?: string; mod?:string; item?:ItemId };
export type Stats = { maxHp: number; hp: number; speed: number; pickup: number; damage: number; rate: number; crit: number; armor: number; xpBonus: number };
export type Input = { x: number; y: number; dash: boolean };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dist = (a: {x:number;y:number}, b:{x:number;y:number}) => Math.hypot(a.x - b.x, a.y - b.y);
const MOD_BY_ID = new Map(WEAPON_MODS.map(mod=>[mod.id,mod]));
const MODIFIERS = [
  ['damage', 'Overcharged cells', 'All weapon damage +30%.'], ['rate', 'Cooling manifold', 'All weapons fire 12% faster.'],
  ['speed', 'Runner servos', 'Move speed +10% (up to 2× base).'], ['pickup', 'Salvage magnet', 'Pickup and attraction radius +20.'],
  ['hp', 'Reinforced plating', 'Maximum HP +1. Restore 1 HP.'], ['repair', 'Repair canister', 'Restore 2 HP.'],
  ['crit', 'Optic calibrator', 'Critical hit chance +5 percentage points.'], ['armor', 'Impact mesh', 'Reduce incoming damage by another 8%.'],
  ['xp', 'Survey processor', 'XP collected +36%.'],
];
export class GameModel {
  state: RunState = 'running';
  player = { x: WORLD / 2, y: WORLD / 2, angle: -Math.PI / 2, moveAngle: -Math.PI / 2, moving: false, invulnerable: 0, dash: 0, dashCooldown: 0 };
  stats: Stats;
  weapons: Weapon[] = [{ id: 'pistol', mods:[], clock: 0.25 }];
  items:Partial<Record<ItemId,number>>={}; loot:ItemDrop[]=[]; metrics:Progress=emptyProgress();
  itemTimers={ration:18,ice:6,reactor:8,cloak:0}; phoenixUsed=false;
  enemies: Enemy[] = []; shots: Shot[] = []; pickups: Pickup[] = []; chests: Chest[] = []; effects: Effect[] = []; shells: Shell[] = [];
  nodes: Node[] = [];
  choices: Choice[] = []; sounds: string[] = [];
  elapsed = 0; kills = 0; level = 1; xp = 0; totalXp = 0; scrap = 0; cores = 0; damageDealt = 0;
  targeting: 'Nearest' | 'Weakest' | 'Strongest' = 'Nearest';
  toast = 'Sweep the frontier. Collect XP to assemble your build.'; toastTime = 5; unlockNotice='';unlockTime=0;
  bossSpawned = false; bossDefeated = false; extraction: { x: number; y: number; progress: number } | null = null;
  won = false; result = ''; banked = 0; hitPulse = 0;
  rerolls = 0;
  private weaponCache=new WeakMap<Weapon,{count:number;prism:number;stats:WeaponStats}>();
  private shotHits:Enemy[]=[];
  private supplyRemaining = 0; private uid = 1; private spawnClock = 0.9; private eliteClock: number; private eliteWarned = false; private bossWarned=false;
  constructor(public mode: Mode, upgrades: SaveData['upgrades'] = {plating:0,magnet:0,supplies:0}, public random = Math.random, private baseline:Progress=emptyProgress()) {
    this.baseline={...baseline};this.metrics.deployments=1;
    this.stats = { maxHp: STARTING_HP + upgrades.plating, hp: STARTING_HP + upgrades.plating, speed: 235, pickup: 28 + upgrades.magnet * 6, damage: 1, rate: 1, crit: 0.05, armor: 0, xpBonus: 1 };
    this.scrap = upgrades.supplies * 10; this.supplyRemaining = this.scrap;
    this.eliteClock = mode === 'skirmish' ? 22 : 60;
    this.nodes = [{id:this.uid++,x:1810,y:1360,progress:0,done:false,alerted:false},{id:this.uid++,x:950,y:1940,progress:0,done:false,alerted:false},{id:this.uid++,x:2290,y:2160,progress:0,done:false,alerted:false}];
  }
  get threshold(): number { return 5 + (this.level - 1) * 3 + Math.floor(Math.max(0, this.level - 5) ** 2 * 0.7); }
  get boss(): Enemy | undefined { return this.enemies.find(e => e.kind === 'tyrant' && e.hp > 0); }
  get rerollCost(): number { return 20 * (this.rerolls + 1); }
  get phaseTime(): number { return this.elapsed * (this.mode === 'skirmish' ? 4 : 1.2); }
  progress():Progress { return mergeProgress(this.baseline,{...this.metrics,kills:this.kills,xp:this.totalXp,maxLevel:this.level,longest:this.elapsed}); }
  unlockedWeapons():WeaponId[] {const p=this.progress();return WEAPON_IDS.filter(id=>achieved(p,WEAPON_UNLOCKS[id]));}
  itemCount(id:ItemId):number {return this.items[id]??0;}
  weaponStats(w:Weapon):WeaponStats {
    const prism=this.itemCount('prism'),cached=this.weaponCache.get(w);
    if(cached&&cached.count===w.mods.length&&cached.prism===prism)return cached.stats;
    const result:WeaponStats={damage:1,rate:1,count:prism,pierce:0,range:0,slow:0,blast:0,orbit:0,width:0,shred:0};
    for(const installed of w.mods){const mod=MOD_BY_ID.get(installed.id);if(mod)result[mod.stat]+=mod.values[installed.rarity];}
    result.shred=Math.min(0.75,result.shred);Object.freeze(result);this.weaponCache.set(w,{count:w.mods.length,prism,stats:result});return result;
  }
  sawLayout():{count:number;radius:number;size:number;speed:number} {const w=this.weapons.find(w=>w.id==='saw');if(!w)return {count:0,radius:73,size:17,speed:2.8};const s=this.weaponStats(w);return {count:1+s.count,radius:73+s.orbit,size:17+s.orbit/2,speed:2.8*s.rate};}
  pause(): void { if (this.state === 'running') this.state = 'paused'; else if (this.state === 'paused') this.state = 'running'; }
  cycleTarget(): void {
    if (this.state !== 'running' && this.state !== 'paused') return;
    const modes = ['Nearest', 'Weakest', 'Strongest'] as const;
    this.targeting = modes[(modes.indexOf(this.targeting) + 1) % modes.length];
  }
  notify(text: string, sound = 'notice'): void { this.toast = text; this.toastTime = 4.5; this.sound(sound); }
  sound(name: string): void { if (this.sounds.length < 24) this.sounds.push(name); }
  effect(kind: Effect['kind'], x: number, y: number, color: number, radius = 12, text = '', tx = x, ty = y): void {
    if (this.effects.length >= LIMITS.effects) this.effects.shift();
    const life = kind === 'number' ? 0.65 : kind === 'line' ? 0.16 : 0.4;
    this.effects.push({id:this.uid++,kind,x,y,color,radius,text,tx,ty,life,maxLife:life});
  }
  tick(delta: number, input: Input): void {
    if (this.state !== 'running'||!Number.isFinite(delta)||delta<=0) return;
    const dt = Math.min(delta,0.05);
    this.elapsed += dt; this.unlockTime=Math.max(0,this.unlockTime-dt); this.toastTime = Math.max(0, this.toastTime - dt); this.hitPulse = Math.max(0, this.hitPulse - dt * 3);
    this.effects = this.effects.filter(e => (e.life -= dt) > 0);
    const p = this.player;
    p.invulnerable = Math.max(0, p.invulnerable - dt); p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    const length = Math.hypot(input.x, input.y), nx = input.x / Math.max(1,length), ny = input.y / Math.max(1,length);
    p.moving = length > 0;
    if (p.moving) p.moveAngle = Math.atan2(ny,nx);
    if (input.dash && p.dashCooldown <= 0) { p.dash = 0.2; p.dashCooldown = Math.max(1.5,3-this.itemCount('boots')*0.2); this.metrics.dashes++;if(this.itemCount('battery'))this.itemPulse(100,3*this.itemCount('battery'),0xffd67b); p.invulnerable = Math.max(p.invulnerable,0.23); this.sound('dash'); }
    if (p.dash > 0) {
      p.x += Math.cos(p.moveAngle) * this.stats.speed * 3.2 * dt; p.y += Math.sin(p.moveAngle) * this.stats.speed * 3.2 * dt;
      p.dash -= dt; this.effect('spark',p.x,p.y,0x6bd3d0,9);
    } else { p.x += nx * this.stats.speed * dt; p.y += ny * this.stats.speed * dt; }
    p.x = clamp(p.x,18,WORLD-18); p.y = clamp(p.y,18,WORLD-18);
    this.director(dt); this.tickEnemies(dt);
    if (this.state !== 'running') return;
    this.tickItems(dt); this.tickWeapons(dt); this.tickShots(dt);
    if(this.state!=='running')return;
    this.tickShells(dt);
    if (this.state !== 'running') return;
    this.tickPickups(dt); this.tickObjectives(dt);
    if((this.state as RunState)==='ended')return;
    if(this.elapsed>=MODES[this.mode].deadline){this.end(false,'Extraction window missed');return;}
    if(this.state!=='running')return;
    this.checkLevel();
  }
  private director(dt: number): void {
    this.spawnClock -= dt;
    if (this.spawnClock <= 0) {
      const batch = Math.min(4,1 + Math.floor(this.phaseTime / 160));
      for (let i=0;i<batch;i++) {
        const pool = (Object.keys(ENEMIES) as EnemyKind[]).filter(k => k !== 'tyrant' && ENEMIES[k].intro <= this.phaseTime);
        const kind = this.random() < 0.42 ? 'crawler' : pool[Math.floor(this.random()*pool.length)];
        this.spawn(kind);
        if (kind === 'skitter') { this.spawn('skitter'); this.spawn('skitter'); }
      }
      this.spawnClock = Math.max(0.32,1.2 - this.phaseTime * 0.0017) * (this.bossDefeated ? 1.8 : 1);
    }
    this.eliteClock -= dt;
    if (!this.bossSpawned && this.eliteClock < 3 && !this.eliteWarned) { this.notify('ELITE SIGNAL — heavy salvage incoming', 'warning'); this.eliteWarned = true; }
    if (!this.bossSpawned && this.eliteClock <= 0) {
      const elites: EnemyKind[] = ['bruiser','spitter','charger','bomber'];
      this.spawn(elites[Math.floor(this.random()*elites.length)],true);
      this.eliteClock = this.mode === 'skirmish' ? 28 : 85; this.eliteWarned = false;
    }
    if(!this.bossSpawned&&!this.bossWarned&&this.elapsed>=MODES[this.mode].bossAt-15){this.bossWarned=true;this.notify('TYRANT SIGNAL — arrival in 15 seconds','warning');}
    if (!this.bossSpawned && this.elapsed >= MODES[this.mode].bossAt) {
      this.bossSpawned = true; this.spawn('tyrant'); this.notify('THE SCRAP TYRANT — defeat it to open extraction', 'boss');
    }
  }
  spawn(kind: EnemyKind, elite = false, at?: { x: number; y: number }): Enemy | undefined {
    if (this.enemies.length >= LIMITS.enemies) {
      if (kind !== 'tyrant' && !elite) return;
      const disposable = this.enemies.findIndex(e => !e.elite && e.kind !== 'tyrant');
      if (disposable >= 0) this.enemies.splice(disposable,1); else return;
    }
    let x = at?.x ?? 0, y = at?.y ?? 0;
    if (!at) for (let tries=0;tries<12;tries++) {
      const angle = this.random() * Math.PI * 2;
      x = clamp(this.player.x + Math.cos(angle)*620,30,WORLD-30); y = clamp(this.player.y + Math.sin(angle)*620,30,WORLD-30);
      if (dist({x,y},this.player) > 340) break;
    }
    const d = ENEMIES[kind];
    const hp = kind === 'tyrant' ? (this.mode === 'skirmish' ? 280 : d.hp) : d.hp * (1 + Math.max(0,this.phaseTime-75) / 320) * (elite ? 5 : 1);
    const enemy: Enemy = {id:this.uid++,x,y,kind,hp,maxHp:hp,radius:d.radius*(elite?1.4:1),elite,angle:0,clock:1+this.random(),windup:0,attack:'',dash:0,flash:0,slow:0,shielded:false,sawHit:0,exposed:0,exposureTime:0};
    this.enemies.push(enemy); return enemy;
  }
  private tickEnemies(dt: number): void {
    const shields = this.enemies.filter(e => e.kind === 'shield' && e.hp > 0);
    const grid = new Map<string, Enemy[]>();
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const key = `${Math.floor(e.x/56)},${Math.floor(e.y/56)}`;
      const cell = grid.get(key); if (cell) cell.push(e); else grid.set(key,[e]);
    }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.exposureTime=Math.max(0,e.exposureTime-dt);if(e.exposureTime===0)e.exposed=0;
      e.flash = Math.max(0,e.flash-dt); e.slow = Math.max(0,e.slow-dt); e.sawHit = Math.max(0,e.sawHit-dt);
      e.shielded = shields.some(s => s !== e && dist(s,e)<110);
      const dx = this.player.x-e.x, dy = this.player.y-e.y, distance = Math.hypot(dx,dy)||1;
      e.clock -= dt;
      if (e.windup > 0) { e.windup -= dt; if (e.windup <= 0) this.resolveAttack(e); }
      else if (e.dash > 0) { e.x += Math.cos(e.angle)*390*dt; e.y += Math.sin(e.angle)*390*dt; e.dash -= dt; }
      else {
        if (e.clock <= 0) {
          e.angle = Math.atan2(dy,dx);
          if (e.kind === 'spitter' && distance < 430) { e.attack='shot'; e.windup=0.65; e.clock=e.elite?1.8:3; }
          if (e.kind === 'charger' && distance < 440) { e.attack='charge'; e.windup=0.8; e.clock=3.6; }
          if (e.kind === 'bomber' && distance < 88) { e.attack='explode'; e.windup=0.9; e.clock=2; }
          if (e.kind === 'tyrant') { const index=Math.floor(this.elapsed/4)%3; e.attack=['charge','burst','summon'][index]; e.windup=1.1; e.clock=e.hp<e.maxHp/2?2.8:4; }
        }
        if (e.windup <= 0) {
          const retreat = e.kind === 'spitter' ? (distance<185?-0.7:distance<265?0:1) : 1;
          const speed = ENEMIES[e.kind].speed*(e.elite?1.15:1)*(e.slow>0?0.55:1);
          e.x += dx/distance*speed*dt*retreat; e.y += dy/distance*speed*dt*retreat;
        }
      }
      if (e.windup<=0 && e.dash<=0) {
        const cx=Math.floor(e.x/56),cy=Math.floor(e.y/56);
        for(let xx=cx-1;xx<=cx+1;xx++) for(let yy=cy-1;yy<=cy+1;yy++) for(const other of grid.get(`${xx},${yy}`)??[]) {
          if(other===e || other.hp<=0) continue;
          const sx=e.x-other.x,sy=e.y-other.y,d2=sx*sx+sy*sy,minimum=(e.radius+other.radius)*0.72;
          if(d2>0.01 && d2<minimum*minimum) {const d=Math.sqrt(d2),push=(minimum-d)*dt*2; e.x+=sx/d*push;e.y+=sy/d*push;}
        }
      }
      e.x=clamp(e.x,e.radius,WORLD-e.radius);e.y=clamp(e.y,e.radius,WORLD-e.radius);
      if (dist(e,this.player)<e.radius+13) this.hurt(e.kind==='tyrant'?2:1);
      if (this.state !== 'running') return;
      if (distance>1250 && !e.elite && e.kind!=='tyrant') { const a=this.random()*Math.PI*2;e.x=clamp(this.player.x+Math.cos(a)*620,30,WORLD-30);e.y=clamp(this.player.y+Math.sin(a)*620,30,WORLD-30); }
    }
    this.enemies = this.enemies.filter(e=>e.hp>0);
  }
  private resolveAttack(e: Enemy): void {
    if (e.attack==='charge') e.dash=e.kind==='tyrant'?0.7:0.5;
    if (e.attack==='shot') {
      const count=e.elite?3:1;
      for(let i=0;i<count;i++) this.shoot(e.x,e.y,e.angle+(i-(count-1)/2)*0.18,190,2.8,1,0xe8a26d,true,6);
    }
    if (e.attack==='burst') for(let i=0;i<14;i++) this.shoot(e.x,e.y,i*Math.PI/7+this.elapsed,165,4,1,0xf4a589,true,7);
    if (e.attack==='summon') for(let i=0;i<5;i++) this.spawn(i<3?'skitter':'crawler',false,{x:e.x+Math.cos(i*1.3)*70,y:e.y+Math.sin(i*1.3)*70});
    if (e.attack==='explode') {
      const radius=e.elite?115:78;this.effect('ring',e.x,e.y,0xff9b75,radius);
      if(dist(e,this.player)<radius+13)this.hurt(2);
      this.sound('explosion');e.hp=0;
    }
  }
  private target(range: number, origin = this.player): Enemy | undefined {
    let best:Enemy|undefined,near=Infinity;
    for(const e of this.enemies) {
      if(e.hp<=0)continue; const d=dist(e,origin);if(d>range)continue;
      const better=best&&(this.targeting==='Weakest'?e.hp<best.hp:this.targeting==='Strongest'&&e.hp>best.hp);
      if(!best||better||((this.targeting==='Nearest'||e.hp===best.hp)&&d<near)){best=e;near=d;}
    }return best;
  }
  private tickWeapons(dt:number):void {
    for(const w of this.weapons){
      const spec=WEAPONS[w.id],mod=this.weaponStats(w),power=spec.damage*mod.damage*this.stats.damage;
      if(w.id==='saw'){
        const saw=this.sawLayout();
        for(let i=0;i<saw.count;i++){
          const angle=this.elapsed*saw.speed+i*Math.PI*2/saw.count,x=this.player.x+Math.cos(angle)*saw.radius,y=this.player.y+Math.sin(angle)*saw.radius;
          for(const e of this.enemies)if(e.hp>0&&e.sawHit<=0&&Math.hypot(e.x-x,e.y-y)<e.radius+saw.size){this.damage(e,power);e.sawHit=0.4/(this.stats.rate*mod.rate);}
        }continue;
      }
      w.clock-=dt;if(w.clock>0)continue;
      const range=spec.range+mod.range,target=this.target(range);if(!target){w.clock=0;continue;}
      const angle=Math.atan2(target.y-this.player.y,target.x-this.player.x);this.player.angle=angle;
      w.clock=spec.cooldown/(this.stats.rate*mod.rate);
      if(w.id==='pistol'||w.id==='scatter'){
        const scatter=w.id==='scatter',count=(scatter?5:1)+mod.count;
        const spread=Math.min(scatter?0.13/(1+mod.range/200):0.07,(scatter?1.3:0.7)/Math.max(1,count-1));
        for(let i=0;i<count;i++)this.shoot(this.player.x,this.player.y,angle+(i-(count-1)/2)*spread,scatter?480:600,scatter?(range+13)/480:0.8,power,spec.color,false,4,mod.pierce,mod.shred);
      }
      if(w.id==='arc'){
        const hit=new Set<number>();let current:Enemy|undefined=target,from:{x:number;y:number}=this.player;
        for(let i=0;i<3+mod.count&&current;i++){
          hit.add(current.id);this.effect('line',from.x,from.y,spec.color,2,'',current.x,current.y);this.damage(current,power);current.slow=0.65+mod.slow;from=current;
          let next:Enemy|undefined,distance=165+mod.range;
          for(const e of this.enemies)if(e.hp>0&&!hit.has(e.id)&&dist(e,from)<distance){next=e;distance=dist(e,from);}current=next;
        }
      }
      if(w.id==='rail'){
        for(let i=0;i<1+mod.count;i++){
          const beamAngle=angle+(i-mod.count/2)*Math.min(0.12,1.2/Math.max(1,mod.count)),tx=this.player.x+Math.cos(beamAngle)*range,ty=this.player.y+Math.sin(beamAngle)*range;
          this.effect('line',this.player.x,this.player.y,spec.color,5+mod.width*0.4,'',tx,ty);
          for(const e of this.enemies)if(e.hp>0&&segmentDistance(e.x,e.y,this.player.x,this.player.y,tx,ty)<e.radius+5+mod.width)this.damage(e,power);
        }
      }
      if(w.id==='mortar'){
        const targets=this.enemies.filter(e=>e.hp>0&&dist(e,this.player)<range).sort((a,b)=>dist(a,target)-dist(b,target));
        for(let i=0;i<1+mod.count&&this.shells.length<LIMITS.shells;i++){
          const victim=targets[i%targets.length]??target;
          this.shells.push({id:this.uid++,x:victim.x,y:victim.y,fromX:this.player.x,fromY:this.player.y,time:0.75,damage:power,radius:70+mod.blast});
        }
      }
      this.sound(w.id);
    }
    this.enemies=this.enemies.filter(e=>e.hp>0);
  }
  private itemPulse(radius:number,damage:number,color:number,slow=0):void {
    this.effect('ring',this.player.x,this.player.y,color,radius);
    for(const e of this.enemies)if(e.hp>0&&dist(e,this.player)<radius+e.radius){this.damage(e,damage,false);e.slow=Math.max(e.slow,slow);}
  }
  private tickItems(dt:number):void {
    this.itemTimers.cloak=Math.max(0,this.itemTimers.cloak-dt);
    for(const id of ['ration','ice','reactor'] as const){
      const stacks=this.itemCount(id);if(!stacks)continue;
      this.itemTimers[id]-=dt;if(this.itemTimers[id]>0)continue;
      if(id==='ration'){this.stats.hp=Math.min(this.stats.maxHp,this.stats.hp+stacks);this.itemTimers[id]=18;this.effect('number',this.player.x,this.player.y-25,0xbbed9b,0,'REPAIR');}
      if(id==='ice'){this.itemPulse(180,2*stacks,0x91ceff,1.5);this.itemTimers[id]=6;}
      if(id==='reactor'){this.itemPulse(220,12*stacks,0xffcf78);this.itemTimers[id]=8;this.sound('explosion');}
    }
  }
  private shoot(x:number,y:number,angle:number,speed:number,ttl:number,damage:number,color:number,hostile=false,radius=4,pierce=0,shred=0): void {
    const limit=hostile?LIMITS.hostile:LIMITS.projectiles;
    let active=0;for(const shot of this.shots)if(shot.ttl>0&&shot.hostile===hostile&&++active>=limit)return;
    this.shots.push({id:this.uid++,x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,ttl,damage,color,hostile,radius,pierce,hits:new Set<number>(),shred});
  }
  private tickShots(dt:number):void {
    for(const s of this.shots) {
      if(s.ttl<=0)continue;
      const x=s.x,y=s.y,travel=Math.min(dt,s.ttl);s.x+=s.vx*travel;s.y+=s.vy*travel;s.ttl-=dt;
      if(s.hostile) { if(segmentDistance(this.player.x,this.player.y,x,y,s.x,s.y)<13+s.radius){this.hurt(s.damage);s.ttl=0;if(this.state!=='running')break;} }
      else {
        const hits=this.shotHits;hits.length=0;
        const left=Math.min(x,s.x),right=Math.max(x,s.x),top=Math.min(y,s.y),bottom=Math.max(y,s.y);
        for(const e of this.enemies){const radius=e.radius+s.radius;if(e.hp<=0||s.hits.has(e.id)||e.x<left-radius||e.x>right+radius||e.y<top-radius||e.y>bottom+radius)continue;if(segmentDistance(e.x,e.y,x,y,s.x,s.y)<radius)hits.push(e);}
        hits.sort((a,b)=>(a.x-x)**2+(a.y-y)**2-((b.x-x)**2+(b.y-y)**2));
        for(const e of hits){if(e.hp<=0)continue;s.hits.add(e.id);this.damage(e,s.damage);if(s.shred){e.exposed=Math.max(e.exposed,s.shred);e.exposureTime=3;}if(s.pierce--<=0){s.ttl=0;break;}}
      }
    }
    this.shots=this.shots.filter(s=>s.ttl>0);this.enemies=this.enemies.filter(e=>e.hp>0);
  }
  private tickShells(dt:number):void {
    for(const s of this.shells)if((s.time-=dt)<=0){this.effect('ring',s.x,s.y,0xffbd77,s.radius);this.sound('explosion');for(const e of this.enemies)if(e.hp>0&&dist(e,s)<s.radius+e.radius)this.damage(e,s.damage);}
    this.shells=this.shells.filter(s=>s.time>0);this.enemies=this.enemies.filter(e=>e.hp>0);
  }
  damage(e:Enemy,raw:number,allowProc=true):void {
    if(this.state!=='running'||e.hp<=0)return;const crit=allowProc&&this.random()<this.stats.crit;
    const damage=raw*(crit?2:1)*(e.shielded?0.5:1)*(1+e.exposed);e.hp-=damage;e.flash=0.09;this.damageDealt+=damage;
    if(crit||e.elite||e.kind==='tyrant')this.effect('number',e.x,e.y-20,crit?0xffdb85:0xe0eeee,0,`${Math.round(damage)}`);
    this.effect('spark',e.x,e.y,ENEMIES[e.kind].color,8);
    if(crit&&this.itemCount('spark')){const next=this.enemies.find(other=>other!==e&&other.hp>0&&dist(e,other)<160);if(next){this.effect('line',e.x,e.y,0x9deaff,2,'',next.x,next.y);this.damage(next,damage*0.35*this.itemCount('spark'),false);}}
    if(e.hp>0)return;
    this.kills++;
    if(this.itemCount('siphon')&&this.kills%40===0)this.stats.hp=Math.min(this.stats.maxHp,this.stats.hp+this.itemCount('siphon'));
 this.effect('ring',e.x,e.y,ENEMIES[e.kind].color,e.radius+6);
    this.drop('xp',e.x,e.y,ENEMIES[e.kind].xp*(e.elite?4:1));
    if(this.random()<0.24)this.drop('scrap',e.x+9,e.y,1+Number(e.elite)*9);
    if(this.random()<0.015&&this.stats.hp<this.stats.maxHp)this.drop('heal',e.x-9,e.y,1);
    if(this.random()<0.006)this.drop('magnet',e.x,e.y+9,1);
    if(e.kind==='splitter')for(let i=0;i<3;i++)this.spawn('skitter',false,{x:e.x+Math.cos(i*2.1)*20,y:e.y+Math.sin(i*2.1)*20});
    if(e.elite){this.metrics.elites++;this.cores++;this.scrap+=8;this.chests.push({id:this.uid++,x:e.x,y:e.y,tier:clamp(1+Math.floor(this.phaseTime/220),1,3)});this.notify('Elite down — recover the gold chest','chest');}
    if(e.kind==='tyrant') {
      this.metrics.bosses++;this.bossDefeated=true;this.cores+=3;this.extraction={x:clamp(this.player.x+220,100,WORLD-100),y:clamp(this.player.y-180,100,WORLD-100),progress:0};
      for(const shot of this.shots)if(shot.hostile)shot.ttl=0;this.shots=this.shots.filter(s=>!s.hostile);this.notify('EXTRACTION OPEN — hold inside the cyan beacon for 3 seconds','boss');
    }
  }
  hurt(raw:number):void {
    if(this.state!=='running'||this.player.invulnerable>0)return;
    if(this.itemCount('cloak')&&this.itemTimers.cloak<=0){this.itemTimers.cloak=20-(this.itemCount('cloak')-1)*3;this.player.invulnerable=0.3;this.effect('ring',this.player.x,this.player.y,0xce9cff,40);this.sound('arc');return;}
    const damage=Math.max(0.25,raw*(1-this.stats.armor));this.metrics.damageTaken+=Math.min(this.stats.hp,damage);
    this.stats.hp=Math.max(0,this.stats.hp-damage);
    this.player.invulnerable=0.75;this.hitPulse=1;this.sound('hurt');this.effect('ring',this.player.x,this.player.y,0xff877a,30);
    if(this.itemCount('thorns'))this.itemPulse(120,4*this.itemCount('thorns'),0xcba8ec);
    if(this.stats.hp<=0&&this.itemCount('phoenix')&&!this.phoenixUsed){this.phoenixUsed=true;this.stats.hp=this.stats.maxHp*0.5;this.player.invulnerable=2;this.notify('PHOENIX CORE — signal restored','victory');this.effect('ring',this.player.x,this.player.y,0xffcf78,160);}
    if(this.stats.hp<=0)this.end(false,'Salvager lost');
  }
  drop(kind:Pickup['kind'],x:number,y:number,value:number):void {
    if(this.pickups.length>=LIMITS.pickups){const existing=this.pickups.find(p=>p.kind===kind);if(existing)existing.value+=value;else if(kind==='xp'){const gained=value*XP_GAIN_MULTIPLIER*this.stats.xpBonus*(this.mode==='skirmish'?2:1);this.xp+=gained;this.totalXp+=gained;}else if(kind==='scrap')this.scrap+=value;else if(kind==='heal')this.stats.hp=Math.min(this.stats.maxHp,this.stats.hp+value);return;}
    this.pickups.push({id:this.uid++,kind,x,y,value});
  }
  private tickPickups(dt:number):void {
    for(let i=this.pickups.length-1;i>=0;i--){const p=this.pickups[i],d=dist(p,this.player);
      if(d<this.stats.pickup){
        if(p.kind==='xp'){const value=p.value*XP_GAIN_MULTIPLIER*this.stats.xpBonus*(this.mode==='skirmish'?2:1);this.xp+=value;this.totalXp+=value;this.sound('xp');}
        if(p.kind==='scrap')this.scrap+=p.value;
        if(p.kind==='heal'){this.stats.hp=Math.min(this.stats.maxHp,this.stats.hp+p.value);this.effect('number',this.player.x,this.player.y-24,0xbbed9b,0,'REPAIR');this.sound('heal');}
        if(p.kind==='magnet'){for(const gem of this.pickups)if(gem.kind==='xp'){gem.x=this.player.x+(this.random()-0.5)*15;gem.y=this.player.y+(this.random()-0.5)*15;}this.notify('Magnetic surge — all XP drawn in','level');}
        this.pickups.splice(i,1);
      }else if(d<this.stats.pickup+64){const step=Math.min(d,320*dt);p.x+=(this.player.x-p.x)/d*step;p.y+=(this.player.y-p.y)/d*step;}
    }
  }
  private tickObjectives(dt:number):void {
    for(const n of this.nodes)if(!n.done&&dist(n,this.player)<65){
      if(!n.alerted){n.alerted=true;this.notify('Salvage scan — hold nearby while the signal resolves');for(let i=0;i<4;i++)this.spawn('crawler');}
      n.progress+=dt*(1+0.15*this.itemCount('compass'));if(n.progress>=4){n.done=true;this.cores++;this.chests.push({id:this.uid++,x:n.x,y:n.y,tier:1});this.notify('Cache recovered — choose your salvage','chest');}
    }
    for(let i=this.chests.length-1;i>=0;i--)if(dist(this.chests[i],this.player)<40){
      const chest=this.chests[i];this.chests.splice(i,1);this.metrics.crates++;
      const item=this.rollItem(chest.tier);
      this.loot.push({id:this.uid++,x:clamp(chest.x+34,20,WORLD-20),y:chest.y,item});
      this.effect('ring',chest.x,chest.y,0xffd086,38);this.notify('Crate opened — recover the dropped item','chest');
    }
    for(let i=0;i<this.loot.length;i++)if(dist(this.loot[i],this.player)<23){
      const drop=this.loot.splice(i,1)[0],item=ITEMS[drop.item];
      this.state='chest';this.choices=[{id:`item-${drop.item}`,kind:'item',item:drop.item,title:item.name,rarity:item.rarity,description:this.itemCount(drop.item)>=item.cap?'Stack limit reached. Recycle this duplicate for 15 scrap.':item.description,tag:'RECOVERED ITEM'}];this.sound('chest');return;
    }
    if(this.extraction){if(dist(this.extraction,this.player)<66)this.extraction.progress+=dt;else this.extraction.progress=Math.max(0,this.extraction.progress-dt);if(this.extraction.progress>=3)this.end(true,'Extraction complete');}
  }
  private shuffle<T>(list:T[]):T[]{const copy=[...list];for(let i=copy.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
  rollItem(tier:number):ItemId {
    const progress=this.progress(),available=ITEM_IDS.filter(id=>achieved(progress,ITEMS[id].unlock));
    const eligible=available.filter(id=>this.itemCount(id)<ITEMS[id].cap);
    const pool=eligible.length?eligible:available;
    const rarity=rollRarity(this.random,Math.min(0.2,Math.max(0,tier-1)*0.06));
    const fitting=pool.filter(id=>ITEMS[id].rarity<=rarity);
    const bestTier=Math.max(...(fitting.length?fitting:pool).map(id=>ITEMS[id].rarity));
    const choices=pool.filter(id=>ITEMS[id].rarity===bestTier);
    return choices[Math.floor(this.random()*choices.length)]??'magnet';
  }
  offers():Choice[]{
    const owned=this.weapons.map(w=>w.id);
    const equipment:Choice[]=this.weapons.length<4?this.shuffle(this.unlockedWeapons().filter(id=>!owned.includes(id))).map(id=>({id:`equip-${id}`,title:WEAPONS[id].name,description:WEAPONS[id].description,tag:'EQUIP WEAPON',rarity:null,kind:'equip',weapon:id})):[];
    const mods=WEAPON_MODS.filter(mod=>{const w=this.weapons.find(w=>w.id===mod.weapon);return w&&w.mods.filter(m=>m.id===mod.id).length<mod.cap;});
    const upgrades:Choice[]=this.shuffle(mods).map((mod,i)=>{
      const rarity=i===0&&this.level%12===0?4:rollRarity(this.random,Math.min(0.06,Math.max(0,this.level-4)*0.002));
      return {id:mod.id,title:mod.name,description:modDescription(mod,rarity),tag:WEAPONS[mod.weapon].name.toUpperCase(),rarity,kind:'weaponMod',weapon:mod.weapon,mod:mod.id};
    });
    const modules:Choice[]=this.shuffle(MODIFIERS.filter(([id])=>!(id==='repair'&&this.stats.hp>=this.stats.maxHp)&&!(id==='speed'&&this.stats.speed>=470)&&!(id==='armor'&&this.stats.armor>=0.56)&&!(id==='crit'&&this.stats.crit>=0.6)&&!(id==='rate'&&this.stats.rate>=3))).map(([stat,title,description])=>({id:`module-${stat}`,title,description,tag:'SALVAGER TRAINING',rarity:null,kind:'module',stat}));
    const chosen:Choice[]=upgrades.slice(0,2);
    if(equipment.length)chosen.splice(1,1,equipment[0]);
    for(const choice of [...modules,...upgrades]){if(chosen.length>=3)break;if(!chosen.some(c=>c.id===choice.id))chosen.push(choice);}
    return this.shuffle(chosen);
  }
  collectItem(id:ItemId):void {
    const item=ITEMS[id];if(this.itemCount(id)>=item.cap){this.scrap+=15;return;}
    this.items[id]=this.itemCount(id)+1;
    if(id==='magnet')this.stats.pickup+=18;
    if(id==='patch'){this.stats.maxHp++;this.stats.hp=Math.min(this.stats.maxHp,this.stats.hp+1);}
    if(id==='flywheel')this.stats.rate=Math.min(3,this.stats.rate+0.08);
    if(id==='scope')this.stats.crit=Math.min(0.6,this.stats.crit+0.04);
    if(id==='compass')this.stats.xpBonus+=0.3;
    if(item.rarity===4)this.metrics.legendary++;
  }
  checkLevel():void {
    if(this.state!=='running'||this.xp<this.threshold)return;
    this.xp-=this.threshold;this.level++;this.rerolls=0;this.state='upgrade';this.choices=this.offers();this.sound('level');
  }
  choose(index:number):boolean {
    if((this.state!=='upgrade'&&this.state!=='chest')||!this.choices[index])return false;
    const c=this.choices[index];
    if(c.kind==='equip'&&c.weapon){if(this.weapons.length>=4||this.weapons.some(w=>w.id===c.weapon)||!this.unlockedWeapons().includes(c.weapon))return false;this.weapons.push({id:c.weapon,mods:[],clock:0.1});}
    if(c.kind==='weaponMod'&&c.weapon&&c.mod&&c.rarity!==null){
      const w=this.weapons.find(w=>w.id===c.weapon),mod=WEAPON_MODS.find(m=>m.id===c.mod&&m.weapon===c.weapon);
      if(!w||!mod||w.mods.filter(m=>m.id===c.mod).length>=mod.cap)return false;
      w.mods.push({id:c.mod,rarity:c.rarity});this.metrics.upgrades++;if(c.rarity===4)this.metrics.legendary++;
    }
    if(c.kind==='item'&&c.item)this.collectItem(c.item);
    if(c.kind==='module'){
      const s=this.stats;
      if(c.stat==='damage')s.damage+=0.3;if(c.stat==='rate')s.rate=Math.min(3,s.rate*1.12);if(c.stat==='speed')s.speed=Math.min(470,s.speed*1.1);
      if(c.stat==='pickup')s.pickup+=20;if(c.stat==='hp'){s.maxHp++;s.hp=Math.min(s.maxHp,s.hp+1);}if(c.stat==='repair')s.hp=Math.min(s.maxHp,s.hp+2);
      if(c.stat==='crit')s.crit=Math.min(0.6,s.crit+0.05);if(c.stat==='armor')s.armor=Math.min(0.56,s.armor+0.08);if(c.stat==='xp')s.xpBonus+=0.36;
    }
    this.choices=[];this.state='running';this.notify(`${c.title} installed`,'install');this.checkLevel();return true;
  }
  reroll():boolean {
    if(this.state!=='upgrade'||this.rerolls>=2||this.scrap<this.rerollCost)return false;
    this.supplyRemaining=Math.max(0,this.supplyRemaining-this.rerollCost);this.scrap-=this.rerollCost;this.rerolls++;this.choices=this.offers();this.sound('chest');return true;
  }
  end(won:boolean,reason:string):void {
    if(this.state==='ended')return;this.state='ended';this.won=won;this.result=reason;if(won)this.metrics.wins++;
    this.banked=Math.floor(Math.max(0,this.scrap-this.supplyRemaining)+this.kills/10+this.cores*5+(won?(this.mode==='skirmish'?50:150):0));this.sound(won?'victory':'defeat');
  }
}
