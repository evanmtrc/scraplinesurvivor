import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import ts from 'typescript';
const temp=await mkdtemp(join(process.cwd(),'.test-build-'));
try {
  await writeFile(join(temp,'package.json'),'{"type":"module"}');
  for(const name of ['content','SaveData','GameModel']){
    const source=await readFile(new URL(`../src/game/${name}.ts`,import.meta.url),'utf8');
    const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
    await writeFile(join(temp,`${name}.js`),outputText);
  }
  const {GameModel}=await import(pathToFileURL(join(temp,'GameModel.js')));
  const {WEAPON_IDS,LIMITS,segmentDistance}=await import(pathToFileURL(join(temp,'content.js')));
  const {parseSave,purchase}=await import(pathToFileURL(join(temp,'SaveData.js')));
  const seeded=()=>{let n=734;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};};
  const calm=()=>{const m=new GameModel('expedition',undefined,()=>0.99);m.spawnClock=1e6;m.eliteClock=1e6;m.bossSpawned=true;return m;};
  const step=(m,seconds,input={x:0,y:0,dash:false})=>{for(let i=0;i<Math.ceil(seconds/0.05);i++)m.tick(0.05,input);};
  const straight=calm(),diagonal=calm();step(straight,1,{x:1,y:0,dash:false});step(diagonal,1,{x:1,y:1,dash:false});
  assert.ok(Math.abs(straight.player.x-1600-235)<1e-6);assert.ok(Math.abs(Math.hypot(diagonal.player.x-1600,diagonal.player.y-1600)-235)<1e-6);
  straight.pause();const frozen=JSON.stringify(straight);step(straight,5,{x:1,y:0,dash:true});assert.equal(JSON.stringify(straight),frozen);straight.pause();
  const targeting=calm();const near=targeting.spawn('bruiser',false,{x:1650,y:1600});const weak=targeting.spawn('crawler',false,{x:1700,y:1600});const strong=targeting.spawn('bruiser',true,{x:1800,y:1600});
  assert.equal(targeting.target(410).id,near.id);targeting.cycleTarget();assert.equal(targeting.target(410).id,weak.id);targeting.cycleTarget();assert.equal(targeting.target(410).id,strong.id);targeting.cycleTarget();assert.equal(targeting.targeting,'Nearest');
  const scan=calm();scan.player.x=scan.nodes[0].x;scan.player.y=scan.nodes[0].y;step(scan,4.1);assert.equal(scan.nodes[0].done,true);assert.equal(scan.state,'chest');assert.equal(scan.cores,1);assert.equal(scan.choose(0),true);
  const dash=calm();dash.tick(0.05,{x:1,y:0,dash:true});assert.ok(dash.player.dashCooldown>0);const hp=dash.stats.hp;dash.hurt(2);assert.equal(dash.stats.hp,hp);
  const levels=calm();levels.xp=30;levels.checkLevel();assert.equal(levels.level,2);assert.equal(levels.xp,25);assert.equal(levels.choices.filter(c=>c.kind==='equip').length,2);
  const upgradeFrozen=JSON.stringify(levels);step(levels,1);assert.equal(JSON.stringify(levels),upgradeFrozen);
  while(levels.state==='upgrade')assert.equal(levels.choose(0),true);
  assert.equal(levels.level,4);assert.equal(levels.xp,6);assert.equal(levels.choose(0),false);
  levels.weapons=WEAPON_IDS.slice(0,4).map(id=>({id,level:8,rarity:4,clock:0}));
  for(let i=0;i<20;i++){const offer=levels.offers(i%2===0);assert.equal(offer.length,3);assert.equal(new Set(offer.map(c=>c.id)).size,3);assert.ok(offer.every(c=>c.kind!=='equip'&&c.kind!=='rank'&&c.kind!=='rarity'&&c.stat!=='repair'));}
  for(const id of WEAPON_IDS){const m=calm();m.weapons=[{id,level:1,rarity:0,clock:0}];const e=m.spawn('bruiser',false,{x:1680,y:1600});e.hp=100;e.maxHp=100;m.player.invulnerable=100;step(m,2);assert.ok(m.damageDealt>0,`${id} must hit an enemy`);}
  const pierce=calm();pierce.weapons=[{id:'rail',level:1,rarity:0,clock:0}];pierce.spawn('crawler',false,{x:1700,y:1600});pierce.spawn('crawler',false,{x:1770,y:1600});step(pierce,.05);assert.equal(pierce.kills,2);
  assert.equal(segmentDistance(15,0,0,0,30,0),0);assert.equal(segmentDistance(15,5,0,0,30,0),5);
  const shield=calm();shield.weapons=[];shield.spawn('shield',false,{x:1780,y:1600});const protectedEnemy=shield.spawn('bruiser',false,{x:1750,y:1600});step(shield,.05);const protectedHp=protectedEnemy.hp;shield.damage(protectedEnemy,4);assert.equal(protectedHp-protectedEnemy.hp,2);
  const split=calm();const husk=split.spawn('splitter',false,{x:1700,y:1600});split.damage(husk,100);assert.equal(split.enemies.filter(e=>e.kind==='skitter').length,3);
  const spitter=calm();spitter.weapons=[];const sp=spitter.spawn('spitter',false,{x:1840,y:1600});sp.clock=0;step(spitter,1);assert.ok(spitter.shots.some(s=>s.hostile));
  const charger=calm();charger.weapons=[];const ch=charger.spawn('charger',false,{x:1850,y:1600});ch.clock=0;step(charger,.05);assert.ok(ch.windup>0&&ch.dash===0);step(charger,.85);assert.ok(ch.dash>0);
  const bomber=calm();bomber.weapons=[];const bomb=bomber.spawn('bomber',false,{x:1660,y:1600});bomb.clock=0;step(bomber,1.1);assert.equal(bomber.stats.hp,3);
  const chest=calm();chest.state='chest';chest.scrap=60;chest.choices=chest.offers(true);assert.equal(chest.reroll(),true);assert.equal(chest.scrap,40);assert.equal(chest.reroll(),true);assert.equal(chest.scrap,0);assert.equal(chest.reroll(),false);
  const elite=calm();const el=elite.spawn('bruiser',true,{x:1700,y:1600});elite.damage(el,1000);assert.equal(elite.chests.length,1);assert.equal(elite.cores,1);
  const overflow=calm();for(let i=0;i<LIMITS.pickups;i++)overflow.drop('xp',0,0,1);overflow.drop('xp',0,0,9);assert.equal(overflow.pickups.length,LIMITS.pickups);assert.equal(overflow.pickups.reduce((sum,p)=>sum+p.value,0),LIMITS.pickups+9);
  const boss=new GameModel('expedition',undefined,()=>0.99);boss.elapsed=599.99;step(boss,.05);assert.ok(boss.boss);boss.damage(boss.boss,10000);assert.ok(boss.extraction);boss.player.x=boss.extraction.x;boss.player.y=boss.extraction.y;boss.player.invulnerable=100;step(boss,3.1);assert.equal(boss.won,true);assert.equal(boss.state,'ended');
  const timeout=calm();timeout.elapsed=719.99;step(timeout,.05);assert.equal(timeout.state,'ended');assert.equal(timeout.won,false);
  const supplies=new GameModel('expedition',{plating:0,magnet:0,supplies:3});supplies.end(false,'Abort');assert.equal(supplies.banked,0);
  assert.equal(parseSave('broken').bank,0);assert.equal(parseSave('{"bank":-5,"upgrades":{"plating":999}}').upgrades.plating,3);
  const save=parseSave(null);save.bank=100;assert.equal(purchase(save,'plating'),true);assert.equal(save.bank,30);assert.equal(purchase(save,'plating'),false);
  console.log('Passed: movement, target priorities, salvage scans, pause, dash immunity, XP carryover, slot limits, all six weapons, piercing, shields, splits, attack telegraphs, chest rerolls, elite loot, pickup caps, extraction, timeout and save validation.');
  // Exercise a whole expedition under high density with deterministic movement.
  const run=new GameModel('expedition',undefined,seeded());run.stats.hp=run.stats.maxHp=100000;run.weapons=['pistol','arc','saw','mortar'].map(id=>({id,level:4,rarity:1,clock:0}));
  let ticks=0;const started=performance.now();
  while(run.state!=='ended'&&ticks<15000){
    if(run.state==='upgrade'||run.state==='chest'){run.choose(0);continue;}
    const destination=run.extraction??run.pickups[0]??run.nodes.find(n=>!n.done)??{x:1600+Math.cos(run.elapsed/8)*280,y:1600+Math.sin(run.elapsed/8)*280};
    const dx=destination.x-run.player.x,dy=destination.y-run.player.y,d=Math.hypot(dx,dy)||1;
    run.tick(.05,{x:d>8?dx/d:0,y:d>8?dy/d:0,dash:false});ticks++;
    assert.ok(run.enemies.length<=LIMITS.enemies);assert.ok(run.pickups.length<=LIMITS.pickups);assert.ok(run.effects.length<=LIMITS.effects);assert.ok(Number.isFinite(run.stats.hp));assert.ok(run.weapons.length<=4);
  }
  assert.equal(run.state,'ended');assert.equal(run.bossSpawned,true);
  console.log(`Full expedition simulation: ${ticks} ticks, ${run.kills} kills, level ${run.level}, ${run.won?'extracted':'timed out'}, ${(performance.now()-started).toFixed(0)} ms.`);
} finally { await rm(temp,{recursive:true,force:true}); }
