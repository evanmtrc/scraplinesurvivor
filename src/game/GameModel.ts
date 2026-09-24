import { ENEMIES, LIMITS, MODES, RARITIES, WEAPONS, WEAPON_IDS, WORLD, segmentDistance, type EnemyKind, type Mode, type WeaponId } from './content.js';
import type { SaveData } from './SaveData.js';
export type RunState = 'briefing' | 'running' | 'paused' | 'upgrade' | 'chest' | 'ended';
export type Entity = { id: number; x: number; y: number };
export type Enemy = Entity & { kind: EnemyKind; hp: number; maxHp: number; radius: number; elite: boolean; angle: number; clock: number; windup: number; attack: string; dash: number; flash: number; slow: number; shielded: boolean; sawHit: number };
export type Shot = Entity & { vx: number; vy: number; ttl: number; color: number; damage: number; hostile: boolean; radius: number };
export type Pickup = Entity & { kind: 'xp' | 'scrap' | 'heal' | 'magnet'; value: number };
export type Chest = Entity & { tier: number };
export type Node = Entity & { progress: number; done: boolean; alerted: boolean };
export type Weapon = { id: WeaponId; level: number; rarity: number; clock: number };
export type Effect = Entity & { kind: 'ring' | 'line' | 'number' | 'spark'; color: number; life: number; maxLife: number; radius: number; tx: number; ty: number; text: string };
export type Shell = Entity & { fromX: number; fromY: number; time: number; damage: number; radius: number };
export type Choice = { id: string; title: string; description: string; tag: string; rarity: number; kind: 'equip' | 'rank' | 'rarity' | 'module' | 'scrap'; weapon?: WeaponId; stat?: string };
export type Stats = { maxHp: number; hp: number; speed: number; pickup: number; damage: number; rate: number; crit: number; armor: number; xpBonus: number };
export type Input = { x: number; y: number; dash: boolean };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dist = (a: {x:number;y:number}, b:{x:number;y:number}) => Math.hypot(a.x - b.x, a.y - b.y);
const MODIFIERS = [
  ['damage', 'Overcharged cells', 'All weapon damage +15%.'], ['rate', 'Cooling manifold', 'All weapons fire 12% faster.'],
  ['speed', 'Runner servos', 'Move speed +10% (up to 2× base).'], ['pickup', 'Salvage magnet', 'Pickup and attraction radius +20.'],
  ['hp', 'Reinforced plating', 'Maximum HP +1. Restore 1 HP.'], ['repair', 'Repair canister', 'Restore 2 HP.'],
  ['crit', 'Optic calibrator', 'Critical hit chance +5 percentage points.'], ['armor', 'Impact mesh', 'Reduce incoming damage by another 8%.'],
  ['xp', 'Survey processor', 'XP collected +12%.'],
];
export class GameModel {
  state: RunState = 'running';
  player = { x: WORLD / 2, y: WORLD / 2, angle: -Math.PI / 2, moveAngle: -Math.PI / 2, moving: false, invulnerable: 0, dash: 0, dashCooldown: 0 };
  stats: Stats;
  weapons: Weapon[] = [{ id: 'pistol', level: 1, rarity: 0, clock: 0.25 }];
  enemies: Enemy[] = []; shots: Shot[] = []; pickups: Pickup[] = []; chests: Chest[] = []; effects: Effect[] = []; shells: Shell[] = [];
  nodes: Node[] = [];
  choices: Choice[] = []; sounds: string[] = [];
  elapsed = 0; kills = 0; level = 1; xp = 0; totalXp = 0; scrap = 0; cores = 0; damageDealt = 0;
  targeting: 'Nearest' | 'Weakest' | 'Strongest' = 'Nearest';
  toast = 'Sweep the frontier. Collect XP to assemble your build.'; toastTime = 7;
  bossSpawned = false; bossDefeated = false; extraction: { x: number; y: number; progress: number } | null = null;
  won = false; result = ''; banked = 0; hitPulse = 0;
  chestTier = 0; rerolls = 0;
  private supplyRemaining = 0; private uid = 1; private spawnClock = 0.9; private eliteClock: number; private eliteWarned = false;
  constructor(public mode: Mode, upgrades: SaveData['upgrades'] = {plating:0,magnet:0,supplies:0}, public random = Math.random) {
    this.stats = { maxHp: 5 + upgrades.plating, hp: 5 + upgrades.plating, speed: 235, pickup: 28 + upgrades.magnet * 6, damage: 1, rate: 1, crit: 0.05, armor: 0, xpBonus: 1 };
    this.scrap = upgrades.supplies * 10; this.supplyRemaining = this.scrap;
    this.eliteClock = mode === 'skirmish' ? 22 : 60;
    this.nodes = [{id:this.uid++,x:1810,y:1360,progress:0,done:false,alerted:false},{id:this.uid++,x:950,y:1940,progress:0,done:false,alerted:false},{id:this.uid++,x:2290,y:2160,progress:0,done:false,alerted:false}];
  }
  get threshold(): number { return 5 + (this.level - 1) * 3 + Math.floor(Math.max(0, this.level - 5) ** 2 * 0.7); }
  get boss(): Enemy | undefined { return this.enemies.find(e => e.kind === 'tyrant' && e.hp > 0); }
  get rerollCost(): number { return 20 * (this.rerolls + 1); }
  get phaseTime(): number { return this.elapsed * (this.mode === 'skirmish' ? 4 : 1); }
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
    if (this.state !== 'running') return;
    const dt = clamp(delta, 0, 0.05);
    this.elapsed += dt; this.toastTime = Math.max(0, this.toastTime - dt); this.hitPulse = Math.max(0, this.hitPulse - dt * 3);
    this.effects = this.effects.filter(e => (e.life -= dt) > 0);
    const p = this.player;
    p.invulnerable = Math.max(0, p.invulnerable - dt); p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    const length = Math.hypot(input.x, input.y), nx = input.x / Math.max(1,length), ny = input.y / Math.max(1,length);
    p.moving = length > 0;
    if (p.moving) p.moveAngle = Math.atan2(ny,nx);
    if (input.dash && p.dashCooldown <= 0) { p.dash = 0.2; p.dashCooldown = 3; p.invulnerable = Math.max(p.invulnerable,0.23); this.sound('dash'); }
    if (p.dash > 0) {
      p.x += Math.cos(p.moveAngle) * this.stats.speed * 3.2 * dt; p.y += Math.sin(p.moveAngle) * this.stats.speed * 3.2 * dt;
      p.dash -= dt; this.effect('spark',p.x,p.y,0x6bd3d0,9);
    } else { p.x += nx * this.stats.speed * dt; p.y += ny * this.stats.speed * dt; }
    p.x = clamp(p.x,18,WORLD-18); p.y = clamp(p.y,18,WORLD-18);
    this.director(dt); this.tickEnemies(dt);
    if (this.state !== 'running') return;
    this.tickWeapons(dt); this.tickShots(dt); this.tickShells(dt);
    if (this.state !== 'running') return;
    this.tickPickups(dt); this.tickObjectives(dt);
    if (this.state !== 'running') return;
    this.checkLevel();
    if (this.elapsed >= MODES[this.mode].deadline && this.state === 'running') this.end(false, 'Extraction window missed');
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
    const hp = kind === 'tyrant' ? (this.mode === 'skirmish' ? 280 : d.hp) : d.hp * (1 + this.phaseTime / 320) * (elite ? 5 : 1);
    const enemy: Enemy = {id:this.uid++,x,y,kind,hp,maxHp:hp,radius:d.radius*(elite?1.4:1),elite,angle:0,clock:1+this.random(),windup:0,attack:'',dash:0,flash:0,slow:0,shielded:false,sawHit:0};
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
  private tickWeapons(dt: number): void {
    for(const w of this.weapons) {
      const spec=WEAPONS[w.id],power=spec.damage*(1+(w.level-1)*0.28)*(1+w.rarity*0.22)*this.stats.damage;
      if(w.id==='saw') {
        const count=1+Math.floor(w.level/3),radius=70+w.level*3;
        for(let i=0;i<count;i++) {const angle=this.elapsed*2.8+i*Math.PI*2/count,x=this.player.x+Math.cos(angle)*radius,y=this.player.y+Math.sin(angle)*radius;
          for(const e of this.enemies) if(e.hp>0&&e.sawHit<=0&&Math.hypot(e.x-x,e.y-y)<e.radius+17){this.damage(e,power);e.sawHit=0.4/this.stats.rate;}
        }continue;
      }
      w.clock-=dt;if(w.clock>0)continue;
      const target=this.target(spec.range);if(!target){w.clock=0;continue;}
      const angle=Math.atan2(target.y-this.player.y,target.x-this.player.x);this.player.angle=angle;
      w.clock=spec.cooldown/(this.stats.rate*(1+(w.level-1)*0.045));
      if(w.id==='pistol'){this.shoot(this.player.x,this.player.y,angle,600,0.8,power,spec.color);this.sound('pistol');}
      if(w.id==='scatter'){const count=5+Math.floor(w.level/3);for(let i=0;i<count;i++)this.shoot(this.player.x,this.player.y,angle+(i-(count-1)/2)*0.13,480,0.6,power,spec.color);this.sound('scatter');}
      if(w.id==='arc') {
        const hit=new Set<number>();let current:Enemy|undefined=target,from:{x:number;y:number}=this.player;
        for(let i=0;i<3+Math.floor(w.level/2)&&current;i++) {
          hit.add(current.id);this.effect('line',from.x,from.y,spec.color,2,'',current.x,current.y);this.damage(current,power);current.slow=0.65;from=current;
          let next:Enemy|undefined,distance=165;for(const e of this.enemies)if(e.hp>0&&!hit.has(e.id)&&dist(e,from)<distance){next=e;distance=dist(e,from);}current=next;
        }this.sound('arc');
      }
      if(w.id==='rail') {
        const tx=this.player.x+Math.cos(angle)*spec.range,ty=this.player.y+Math.sin(angle)*spec.range;
        this.effect('line',this.player.x,this.player.y,spec.color,5,'',tx,ty);
        for(const e of this.enemies)if(e.hp>0&&segmentDistance(e.x,e.y,this.player.x,this.player.y,tx,ty)<e.radius+5)this.damage(e,power);
        this.sound('rail');
      }
      if(w.id==='mortar'&&this.shells.length<20){this.shells.push({id:this.uid++,x:target.x,y:target.y,fromX:this.player.x,fromY:this.player.y,time:0.75,damage:power,radius:65+w.level*5});this.sound('mortar');}
    }
    this.enemies=this.enemies.filter(e=>e.hp>0);
  }
  private shoot(x:number,y:number,angle:number,speed:number,ttl:number,damage:number,color:number,hostile=false,radius=4): void {
    const limit=hostile?LIMITS.hostile:LIMITS.projectiles;
    if(this.shots.filter(s=>s.hostile===hostile).length>=limit)return;
    this.shots.push({id:this.uid++,x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,ttl,damage,color,hostile,radius});
  }
  private tickShots(dt:number):void {
    for(const s of this.shots) {
      const x=s.x,y=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;s.ttl-=dt;
      if(s.ttl<=0)continue;
      if(s.hostile) { if(segmentDistance(this.player.x,this.player.y,x,y,s.x,s.y)<13+s.radius){this.hurt(s.damage);s.ttl=0;if(this.state!=='running')break;} }
      else for(const e of this.enemies)if(e.hp>0&&segmentDistance(e.x,e.y,x,y,s.x,s.y)<e.radius+s.radius){this.damage(e,s.damage);s.ttl=0;break;}
    }
    this.shots=this.shots.filter(s=>s.ttl>0);this.enemies=this.enemies.filter(e=>e.hp>0);
  }
  private tickShells(dt:number):void {
    for(const s of this.shells)if((s.time-=dt)<=0){this.effect('ring',s.x,s.y,0xffbd77,s.radius);this.sound('explosion');for(const e of this.enemies)if(e.hp>0&&dist(e,s)<s.radius+e.radius)this.damage(e,s.damage);}
    this.shells=this.shells.filter(s=>s.time>0);this.enemies=this.enemies.filter(e=>e.hp>0);
  }
  damage(e:Enemy,raw:number):void {
    if(e.hp<=0)return;const crit=this.random()<this.stats.crit;
    const damage=raw*(crit?2:1)*(e.shielded?0.5:1);e.hp-=damage;e.flash=0.09;this.damageDealt+=damage;
    if(crit||e.elite||e.kind==='tyrant')this.effect('number',e.x,e.y-20,crit?0xffdb85:0xe0eeee,0,`${Math.round(damage)}`);
    this.effect('spark',e.x,e.y,ENEMIES[e.kind].color,8);
    if(e.hp>0)return;
    this.kills++; this.effect('ring',e.x,e.y,ENEMIES[e.kind].color,e.radius+6);
    this.drop('xp',e.x,e.y,ENEMIES[e.kind].xp*(e.elite?4:1));
    if(this.random()<0.24)this.drop('scrap',e.x+9,e.y,1+Number(e.elite)*9);
    if(this.random()<0.015&&this.stats.hp<this.stats.maxHp)this.drop('heal',e.x-9,e.y,1);
    if(this.random()<0.006)this.drop('magnet',e.x,e.y+9,1);
    if(e.kind==='splitter')for(let i=0;i<3;i++)this.spawn('skitter',false,{x:e.x+Math.cos(i*2.1)*20,y:e.y+Math.sin(i*2.1)*20});
    if(e.elite){this.cores++;this.scrap+=8;this.chests.push({id:this.uid++,x:e.x,y:e.y,tier:clamp(1+Math.floor(this.phaseTime/220),1,3)});this.notify('Elite down — recover the gold chest','chest');}
    if(e.kind==='tyrant') {
      this.bossDefeated=true;this.cores+=3;this.extraction={x:clamp(this.player.x+220,100,WORLD-100),y:clamp(this.player.y-180,100,WORLD-100),progress:0};
      for(const shot of this.shots)if(shot.hostile)shot.ttl=0;this.shots=this.shots.filter(s=>!s.hostile);this.notify('EXTRACTION OPEN — hold inside the cyan beacon for 3 seconds','boss');
    }
  }
  hurt(raw:number):void {
    if(this.state!=='running'||this.player.invulnerable>0)return;
    this.stats.hp=Math.max(0,this.stats.hp-Math.max(0.25,raw*(1-this.stats.armor)));
    this.player.invulnerable=0.75;this.hitPulse=1;this.sound('hurt');this.effect('ring',this.player.x,this.player.y,0xff877a,30);
    if(this.stats.hp<=0)this.end(false,'Salvager lost');
  }
  drop(kind:Pickup['kind'],x:number,y:number,value:number):void {
    if(this.pickups.length>=LIMITS.pickups){const existing=this.pickups.find(p=>p.kind===kind);if(existing)existing.value+=value;else if(kind==='xp'){const gained=value*this.stats.xpBonus*(this.mode==='skirmish'?2:1);this.xp+=gained;this.totalXp+=gained;}else if(kind==='scrap')this.scrap+=value;else if(kind==='heal')this.stats.hp=Math.min(this.stats.maxHp,this.stats.hp+value);return;}
    this.pickups.push({id:this.uid++,kind,x,y,value});
  }
  private tickPickups(dt:number):void {
    for(let i=this.pickups.length-1;i>=0;i--){const p=this.pickups[i],d=dist(p,this.player);
      if(d<this.stats.pickup){
        if(p.kind==='xp'){const value=p.value*this.stats.xpBonus*(this.mode==='skirmish'?2:1);this.xp+=value;this.totalXp+=value;this.sound('xp');}
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
      n.progress+=dt;if(n.progress>=4){n.done=true;this.cores++;this.chests.push({id:this.uid++,x:n.x,y:n.y,tier:1});this.notify('Cache recovered — choose your salvage','chest');}
    }
    for(let i=0;i<this.chests.length;i++)if(dist(this.chests[i],this.player)<40){
      this.chestTier=this.chests[i].tier;this.chests.splice(i,1);this.rerolls=0;this.state='chest';this.choices=this.offers(true);this.sound('chest');return;
    }
    if(this.extraction){if(dist(this.extraction,this.player)<66)this.extraction.progress+=dt;else this.extraction.progress=Math.max(0,this.extraction.progress-dt);if(this.extraction.progress>=3)this.end(true,'Extraction complete');}
  }
  private shuffle<T>(list:T[]):T[]{const copy=[...list];for(let i=copy.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
  private rankDescription(w:Weapon):string {
    const next=w.level+1,damage=Math.round(28/(1+(w.level-1)*0.28));
    const speed=Math.round(4.5/(1+(w.level-1)*0.045));
    const extras:Partial<Record<WeaponId,string>>={
      scatter:next%3===0?' +1 pellet.':'',arc:next%2===0?' +1 chain target.':'',
      saw:` Orbit radius +3.${next%3===0?' +1 saw drone.':''}`,mortar:' Blast radius +5.',
    };
    return `Level ${w.level} → ${next}. Damage +${damage}%.${w.id==='saw'?'':` Fire rate +${speed}%.`}${extras[w.id]??''}`;
  }
  offers(chest=false):Choice[]{
    const owned=this.weapons.map(w=>w.id),newWeapons=this.weapons.length<4?this.shuffle(WEAPON_IDS.filter(id=>!owned.includes(id))).map(id=>({id:`equip-${id}`,title:WEAPONS[id].name,description:WEAPONS[id].description,tag:chest?'SALVAGED WEAPON':'NEW WEAPON',rarity:chest?this.chestTier:0,kind:'equip' as const,weapon:id})):[];
    const upgrades=this.shuffle(this.weapons.filter(w=>chest?w.rarity<4:w.level<8)).map(w=>({id:`${chest?'rarity':'rank'}-${w.id}`,title:WEAPONS[w.id].name,description:chest?`Upgrade to ${RARITIES[Math.min(4,w.rarity+1)]} quality. Damage +${Math.round(22/(1+w.rarity*0.22))}%.`:this.rankDescription(w),tag:chest?'QUALITY UPGRADE':'WEAPON UPGRADE',rarity:chest?Math.min(4,w.rarity+1):w.rarity,kind:chest?'rarity' as const:'rank' as const,weapon:w.id}));
    const modules:Choice[]=this.shuffle(MODIFIERS.filter(([id])=>!(id==='repair'&&this.stats.hp>=this.stats.maxHp)&&!(id==='speed'&&this.stats.speed>=470)&&!(id==='armor'&&this.stats.armor>=0.56)&&!(id==='crit'&&this.stats.crit>=0.6)&&!(id==='rate'&&this.stats.rate>=3))).map(([stat,title,description])=>({id:`module-${stat}`,title,description,tag:'SALVAGER MODULE',rarity:0,kind:'module' as const,stat}));
    const chosen:Choice[]=[];
    if(!chest&&this.level===2&&newWeapons.length){chosen.push(...newWeapons.slice(0,2),modules[0]);return chosen;}
    if(upgrades.length)chosen.push(upgrades[0]);
    if(newWeapons.length&&(chest||this.random()<0.65))chosen.push(newWeapons[0]);
    if(chest){modules.push({id:'scrap',title:'Scrap reserve',description:'Gain 35 scrap for rerolls or the workshop.',tag:'SALVAGE',rarity:0,kind:'scrap'});}
    for(const c of [...modules,...upgrades,...newWeapons]){if(chosen.length>=3)break;if(!chosen.some(x=>x.id===c.id))chosen.push(c);}
    return this.shuffle(chosen);
  }
  checkLevel():void {
    if(this.state!=='running'||this.xp<this.threshold)return;
    this.xp-=this.threshold;this.level++;this.state='upgrade';this.choices=this.offers();this.sound('level');
  }
  choose(index:number):boolean {
    if((this.state!=='upgrade'&&this.state!=='chest')||!this.choices[index])return false;
    const c=this.choices[index];
    if(c.kind==='equip'&&c.weapon){if(this.weapons.length>=4||this.weapons.some(w=>w.id===c.weapon))return false;this.weapons.push({id:c.weapon,level:1,rarity:c.rarity,clock:0.1});}
    if(c.kind==='rank'&&c.weapon){const w=this.weapons.find(w=>w.id===c.weapon);if(w)w.level=Math.min(8,w.level+1);}
    if(c.kind==='rarity'&&c.weapon){const w=this.weapons.find(w=>w.id===c.weapon);if(w)w.rarity=Math.min(4,w.rarity+1);}
    if(c.kind==='scrap')this.scrap+=35;
    if(c.kind==='module'){
      const s=this.stats;
      if(c.stat==='damage')s.damage+=0.15;if(c.stat==='rate')s.rate=Math.min(3,s.rate*1.12);if(c.stat==='speed')s.speed=Math.min(470,s.speed*1.1);
      if(c.stat==='pickup')s.pickup+=20;if(c.stat==='hp'){s.maxHp++;s.hp=Math.min(s.maxHp,s.hp+1);}if(c.stat==='repair')s.hp=Math.min(s.maxHp,s.hp+2);
      if(c.stat==='crit')s.crit=Math.min(0.6,s.crit+0.05);if(c.stat==='armor')s.armor=Math.min(0.56,s.armor+0.08);if(c.stat==='xp')s.xpBonus+=0.12;
    }
    this.choices=[];this.state='running';this.notify(`${c.title} installed`,'install');this.checkLevel();return true;
  }
  reroll():boolean {
    if(this.state!=='chest'||this.rerolls>=2||this.scrap<this.rerollCost)return false;
    this.supplyRemaining=Math.max(0,this.supplyRemaining-this.rerollCost);this.scrap-=this.rerollCost;this.rerolls++;this.choices=this.offers(true);this.sound('chest');return true;
  }
  end(won:boolean,reason:string):void {
    if(this.state==='ended')return;this.state='ended';this.won=won;this.result=reason;
    this.banked=Math.floor(Math.max(0,this.scrap-this.supplyRemaining)+this.kills/10+this.cores*5+(won?(this.mode==='skirmish'?50:150):0));this.sound(won?'victory':'defeat');
  }
}
