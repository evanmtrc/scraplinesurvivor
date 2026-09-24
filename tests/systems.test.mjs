import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import ts from 'typescript';
const temp=await mkdtemp(join(process.cwd(),'.test-build-'));
try{
  await writeFile(join(temp,'package.json'),'{"type":"module"}');
  for(const name of ['content','Progression','Upgrades','Items','SaveData','GameModel']){
    const source=await readFile(new URL(`../src/game/${name}.ts`,import.meta.url),'utf8');
    await writeFile(join(temp,`${name}.js`),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
  }
  const load=name=>import(pathToFileURL(join(temp,`${name}.js`)));
  const {GameModel}=await load('GameModel'),{WEAPON_IDS,LIMITS,segmentDistance,MODES}=await load('content');
  const {parseSave,purchase}=await load('SaveData'),{emptyProgress,achieved,ACHIEVEMENTS}=await load('Progression');
  const {WEAPON_MODS,rollRarity}=await load('Upgrades'),{ITEMS,ITEM_IDS}=await load('Items');
  let checks=0;const test=(name,fn)=>{fn();checks++;console.log(`✓ ${name}`);};
  const unlocked=()=>Object.fromEntries(Object.keys(emptyProgress()).map(k=>[k,1000]));
  const weapon=(id,mods=[])=>({id,mods,clock:0});
  const seeded=(seed=734)=>{let n=seed;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};};
  const calm=(all=true)=>{const m=new GameModel('expedition',undefined,()=>0.99,all?unlocked():emptyProgress());m.spawnClock=1e6;m.eliteClock=1e6;m.bossSpawned=true;return m;};
  const step=(m,seconds,input={x:0,y:0,dash:false})=>{for(let i=0;i<Math.ceil(seconds/.05);i++)m.tick(.05,input);};
  const foe=(m,kind='bruiser',x=1700,y=1600,hp=1000)=>{const e=m.spawn(kind,false,{x,y});e.hp=e.maxHp=hp;return e;};
  const install=(m,id,rarity=0)=>{const mod=WEAPON_MODS.find(x=>x.id===id);m.state='upgrade';m.choices=[{id,kind:'weaponMod',weapon:mod.weapon,mod:id,rarity}];assert.equal(m.choose(0),true);};
  test('Base movement stays 235, normalized diagonals; pause freezes model',()=>{
    const a=calm(),b=calm();step(a,1,{x:1,y:0,dash:false});step(b,1,{x:1,y:1,dash:false});assert.ok(Math.abs(a.player.x-1835)<1e-6);assert.ok(Math.abs(Math.hypot(b.player.x-1600,b.player.y-1600)-235)<1e-6);
    a.pause();const snapshot=JSON.stringify(a);step(a,3,{x:1,y:0,dash:true});assert.equal(JSON.stringify(a),snapshot);
  });
  test('Expedition schedule scales 20% faster; Skirmish and boss timings stay fixed',()=>{
    const a=new GameModel('expedition'),b=new GameModel('skirmish');a.elapsed=b.elapsed=100;assert.equal(a.phaseTime,120);assert.equal(b.phaseTime,400);assert.equal(MODES.expedition.bossAt,600);assert.equal(MODES.skirmish.bossAt,120);
    a.elapsed=0;assert.equal(a.spawn('crawler').hp,2);a.elapsed=100;assert.equal(a.spawn('crawler').hp,2*(1+(120-75)/320));
  });
  test('Target modes select nearest, weakest and strongest',()=>{
    const m=calm(),near=foe(m,'bruiser',1650,1600,10),weak=foe(m,'crawler',1700,1600,2),strong=foe(m,'bruiser',1800,1600,40);
    assert.equal(m.target(410).id,near.id);m.cycleTarget();assert.equal(m.target(410).id,weak.id);m.cycleTarget();assert.equal(m.target(410).id,strong.id);
  });
  test('Achievement unlocks gate weapons and advance across runs without double counting',()=>{
    const m=calm(false);assert.deepEqual(m.unlockedWeapons(),['pistol']);m.kills=10;assert.ok(m.unlockedWeapons().includes('scatter'));m.metrics.dashes=5;assert.ok(m.unlockedWeapons().includes('saw'));m.level=5;assert.ok(m.unlockedWeapons().includes('arc'));m.metrics.crates=3;assert.ok(m.unlockedWeapons().includes('mortar'));m.metrics.bosses=1;assert.ok(m.unlockedWeapons().includes('rail'));
    const progress=m.progress();assert.deepEqual(m.progress(),progress);const next=new GameModel('skirmish',undefined,Math.random,progress);next.kills=7;assert.equal(next.progress().kills,17);assert.equal(next.progress().deployments,2);assert.equal(next.progress().maxLevel,5);
    assert.ok(ACHIEVEMENTS.every(a=>achieved(unlocked(),a.id)));
  });
  test('Level-up carries XP, gives owned weapon mods and gates equipment with no weapon rarity',()=>{
    const m=calm(false);m.xp=30;m.checkLevel();assert.equal(m.level,2);assert.equal(m.xp,25);assert.ok(m.choices.some(c=>c.kind==='weaponMod'));assert.ok(m.choices.every(c=>c.kind!=='equip'&&c.kind!=='item'));const frozen=JSON.stringify(m);step(m,2);assert.equal(JSON.stringify(m),frozen);
    while(m.state==='upgrade')m.choose(0);assert.equal(m.level,4);assert.equal(m.xp,6);assert.equal(m.choose(0),false);assert.ok(m.weapons.every(w=>!('rarity' in w)&&!('level' in w)));
    m.kills=10;const equip=m.offers().find(c=>c.kind==='equip');assert.equal(equip.weapon,'scatter');assert.equal(equip.rarity,null);
    m.weapons=WEAPON_IDS.slice(0,4).map(id=>weapon(id));for(let i=0;i<30;i++){const choices=m.offers();assert.equal(choices.length,3);assert.equal(new Set(choices.map(c=>c.id)).size,3);assert.ok(choices.every(c=>c.kind!=='equip'&&c.kind!=='item'));}
  });
  test('All 24 mods have five ordered tiers, change only their weapon and stop at stack limits',()=>{
    assert.equal(WEAPON_MODS.length,24);
    for(const mod of WEAPON_MODS){assert.equal(mod.values.length,5);assert.ok(mod.values.every((v,i)=>v>0&&(i===0||v>=mod.values[i-1])));
      const m=calm();m.weapons=WEAPON_IDS.map(id=>weapon(id));const owned=m.weapons.find(w=>w.id===mod.weapon),before=m.weaponStats(owned)[mod.stat];install(m,mod.id,4);assert.ok(m.weaponStats(owned)[mod.stat]>before);assert.equal(m.metrics.upgrades,1);assert.ok(m.weapons.filter(w=>w!==owned).every(w=>w.mods.length===0));
      for(let i=1;i<mod.cap;i++)install(m,mod.id,0);assert.ok(!m.offers().some(c=>c.mod===mod.id));
    }
    assert.deepEqual([.1,.6,.85,.95,.995].map(n=>rollRarity(()=>n)),[0,1,2,3,4]);const m=calm();m.level=12;assert.ok(m.offers().some(c=>c.kind==='weaponMod'&&c.rarity===4));
  });
  test('Every weapon hits; pistol pierces, rail adds beams, scatter exposes, mortar adds shells',()=>{
    for(const id of WEAPON_IDS){const m=calm();m.weapons=[weapon(id)];foe(m,'bruiser',1680);m.player.invulnerable=100;step(m,2);assert.ok(m.damageDealt>0,id);}
    const pistol=calm();pistol.weapons=[weapon('pistol')];install(pistol,'pistol_drill',0);const a=foe(pistol,'bruiser',1690),b=foe(pistol,'bruiser',1760);step(pistol,.4);assert.ok(a.hp<1000&&b.hp<1000);
    const rail=calm();rail.weapons=[weapon('rail')];install(rail,'rail_split',4);foe(rail);step(rail,.05);assert.equal(rail.effects.filter(e=>e.kind==='line').length,4);
    const scatter=calm();scatter.weapons=[weapon('scatter')];install(scatter,'scatter_shred',2);const exposed=foe(scatter,'bruiser',1700);step(scatter,.25);assert.ok(exposed.exposed>0&&exposed.exposureTime>0);
    const mortar=calm();mortar.weapons=[weapon('mortar')];install(mortar,'mortar_salvo',2);foe(mortar);step(mortar,.05);assert.equal(mortar.shells.length,3);
    assert.equal(segmentDistance(15,5,0,0,30,0),5);
  });
  test('Extra arc targets, slow duration, saw count and wide blades affect real combat',()=>{
    const arc=calm();arc.weapons=[weapon('arc')];install(arc,'arc_fork',2);install(arc,'arc_stasis',4);for(let i=0;i<5;i++)foe(arc,'bruiser',1680+i*45);step(arc,.05);assert.equal(arc.enemies.filter(e=>e.hp<1000).length,5);assert.ok(arc.enemies.every(e=>e.slow>2));
    const saw=calm();saw.weapons=[weapon('saw')];install(saw,'saw_swarm',4);install(saw,'saw_reach',4);assert.equal(saw.sawLayout().count,4);assert.equal(saw.sawLayout().radius,108);assert.equal(saw.sawLayout().size,34.5);
  });
  test('Crates physically drop only achievement-unlocked items; collecting shows one item',()=>{
    const m=calm(false);m.chests.push({id:900,x:1600,y:1600,tier:1});step(m,.05);assert.equal(m.chests.length,0);assert.equal(m.loot.length,1);assert.equal(m.metrics.crates,1);assert.equal(m.state,'running');assert.ok(achieved(m.progress(),ITEMS[m.loot[0].item].unlock));
    m.player.x=m.loot[0].x;m.player.y=m.loot[0].y;step(m,.05);assert.equal(m.state,'chest');assert.equal(m.choices.length,1);assert.equal(m.choices[0].kind,'item');assert.equal(m.reroll(),false);const id=m.choices[0].item;assert.equal(m.choose(0),true);assert.equal(m.itemCount(id),1);assert.equal(m.loot.length,0);
    for(const value of [.1,.6,.85,.95,.995]){const all=calm();all.random=()=>value;const rolled=all.rollItem(1);assert.equal(ITEMS[rolled].rarity,rollRarity(()=>value));}
    for(let i=0;i<100;i++){const fresh=calm(false);fresh.random=seeded(i);assert.ok(['magnet','patch'].includes(fresh.rollItem(3)));}
  });
  test('Salvage scans create item crates; compass accelerates scans',()=>{
    const m=calm();m.player.x=m.nodes[0].x;m.player.y=m.nodes[0].y;step(m,3);assert.equal(m.nodes[0].done,false);step(m,1.1);assert.equal(m.nodes[0].done,true);assert.equal(m.loot.length,1);
    const fast=calm();fast.collectItem('compass');fast.player.x=fast.nodes[0].x;fast.player.y=fast.nodes[0].y;step(fast,3.5);assert.equal(fast.nodes[0].done,true);
  });
  test('Upgrade rerolls cost 20 then 40; starting supplies cannot be banked as profit',()=>{
    const m=calm();m.state='upgrade';m.scrap=60;m.choices=m.offers();assert.equal(m.reroll(),true);assert.equal(m.scrap,40);assert.equal(m.reroll(),true);assert.equal(m.scrap,0);assert.equal(m.reroll(),false);
    const supplies=new GameModel('expedition',{plating:0,magnet:0,supplies:3});supplies.end(false,'Abort');assert.equal(supplies.banked,0);
  });
  test('Items apply stats, caps, pulse timers, dash effects, protection and one-use revival',()=>{
    assert.equal(ITEM_IDS.length,16);const m=calm();m.collectItem('magnet');assert.equal(m.stats.pickup,46);m.stats.hp=3;m.collectItem('patch');assert.equal(m.stats.maxHp,6);assert.equal(m.stats.hp,4);m.collectItem('flywheel');assert.equal(m.stats.rate,1.08);m.collectItem('scope');assert.equal(m.stats.crit,.09);m.collectItem('compass');assert.equal(m.stats.xpBonus,1.1);
    const dash=calm();dash.collectItem('boots');dash.collectItem('battery');dash.weapons=[];const e=foe(dash,'bruiser',1680);step(dash,.05,{x:1,y:0,dash:true});assert.equal(dash.player.dashCooldown,2.8);assert.ok(e.hp<1000);const hp=dash.stats.hp;dash.hurt(2);assert.equal(dash.stats.hp,hp);
    const pulse=calm();pulse.weapons=[];pulse.collectItem('ration');pulse.collectItem('ice');pulse.collectItem('reactor');pulse.stats.hp=2;const ice=foe(pulse,'bruiser',1770);pulse.player.invulnerable=100;step(pulse,6.1);assert.ok(ice.slow>0);step(pulse,12);assert.ok(pulse.stats.hp>=3&&pulse.damageDealt>12);
    const thorns=calm();thorns.weapons=[];thorns.collectItem('thorns');const t=foe(thorns,'bruiser',1680);thorns.hurt(1);assert.equal(t.hp,996);
    const shield=calm();shield.collectItem('cloak');shield.hurt(2);assert.equal(shield.stats.hp,5);assert.equal(shield.itemTimers.cloak,20);shield.player.invulnerable=0;shield.hurt(1);assert.equal(shield.stats.hp,4);
    const revive=calm();revive.collectItem('phoenix');revive.hurt(99);assert.equal(revive.state,'running');assert.equal(revive.phoenixUsed,true);assert.equal(revive.stats.hp,2.5);revive.collectItem('phoenix');assert.equal(revive.scrap,15);revive.player.invulnerable=0;revive.hurt(99);assert.equal(revive.state,'ended');
    const prism=calm();prism.collectItem('prism');assert.equal(prism.weaponStats(prism.weapons[0]).count,1);
  });
  test('Storm Relay cannot recurse; Siphon Fang heals on its kill milestone',()=>{
    const m=calm();m.stats.crit=1;m.collectItem('spark');const a=foe(m),b=foe(m,'bruiser',1740);m.damage(a,10);assert.equal(a.hp,980);assert.equal(b.hp,993);assert.equal(m.effects.filter(e=>e.kind==='line').length,1);
    const siphon=calm();siphon.collectItem('siphon');siphon.kills=39;siphon.stats.hp=2;siphon.damage(foe(siphon,'crawler',1700,1600,1),10);assert.equal(siphon.stats.hp,3);
  });
  test('Enemy shields, splits, telegraphs, elite drops and pickup caps remain intact',()=>{
    const m=calm();m.weapons=[];m.spawn('shield',false,{x:1780,y:1600});const e=foe(m,'bruiser',1750);step(m,.05);m.damage(e,4);assert.equal(e.hp,998);
    const split=calm();split.damage(foe(split,'splitter',1700,1600,1),100);assert.equal(split.enemies.filter(e=>e.kind==='skitter').length,3);
    const spitter=calm();spitter.weapons=[];foe(spitter,'spitter',1840).clock=0;step(spitter,1);assert.ok(spitter.shots.some(s=>s.hostile));
    const charge=calm();charge.weapons=[];const ram=foe(charge,'charger',1850);ram.clock=0;step(charge,.05);assert.ok(ram.windup>0&&ram.dash===0);step(charge,.85);assert.ok(ram.dash>0);
    const bomber=calm();bomber.weapons=[];foe(bomber,'bomber',1660).clock=0;step(bomber,1.1);assert.equal(bomber.stats.hp,3);
    const elite=calm();const el=elite.spawn('bruiser',true,{x:1700,y:1600});elite.damage(el,10000);assert.equal(elite.chests.length,1);assert.equal(elite.metrics.elites,1);
    const cap=calm();for(let i=0;i<LIMITS.pickups;i++)cap.drop('xp',0,0,1);cap.drop('xp',0,0,9);assert.equal(cap.pickups.length,LIMITS.pickups);assert.equal(cap.pickups.reduce((n,p)=>n+p.value,0),LIMITS.pickups+9);
  });
  test('Boss death unlocks rail/reactor, extraction unlocks phoenix, timeout ends a run',()=>{
    const m=new GameModel('expedition',undefined,()=>.99);m.elapsed=599.99;step(m,.05);assert.ok(m.boss);m.damage(m.boss,10000);assert.ok(m.unlockedWeapons().includes('rail'));assert.ok(achieved(m.progress(),ITEMS.reactor.unlock));m.player.x=m.extraction.x;m.player.y=m.extraction.y;m.player.invulnerable=100;step(m,3.1);assert.equal(m.won,true);assert.ok(achieved(m.progress(),ITEMS.phoenix.unlock));
    const timeout=calm();timeout.elapsed=719.99;step(timeout,.05);assert.equal(timeout.state,'ended');assert.equal(timeout.won,false);
  });
  test('Old saves migrate workshop and known records; malformed saves are safe',()=>{
    const old=parseSave(JSON.stringify({version:1,bank:145,bestKills:600,bestTime:640,runs:3,wins:1,upgrades:{plating:2,magnet:1,supplies:3},muted:true}));assert.equal(old.version,2);assert.equal(old.bank,145);assert.equal(old.upgrades.plating,2);assert.equal(old.progress.kills,600);assert.equal(old.progress.bosses,1);assert.equal(old.muted,true);assert.equal(old.showMap,false);
    for(const raw of ['broken','null','[]','42','{"progress":{"kills":"999"},"upgrades":{"plating":999}}'])assert.ok(Number.isFinite(parseSave(raw).progress.kills));
    const save=parseSave(null);save.bank=100;assert.equal(purchase(save,'plating'),true);assert.equal(save.bank,30);assert.equal(purchase(save,'plating'),false);assert.deepEqual(parseSave(JSON.stringify(old)),old);
  });
  // High-health deterministic run exercises late game correctness, not player difficulty.
  for(const mode of ['skirmish','expedition'])test(`Full ${mode} simulation, item collection and entity bounds`,()=>{
    const run=new GameModel(mode,undefined,seeded(),unlocked());run.stats.hp=run.stats.maxHp=100000;run.weapons=['pistol','arc','saw','mortar'].map(id=>weapon(id));let ticks=0;const started=performance.now();
    while(run.state!=='ended'&&ticks<15000){
      if(run.state==='upgrade'||run.state==='chest'){run.choose(run.choices.findIndex(c=>c.kind==='weaponMod'||c.kind==='item'));if(run.state==='upgrade'&&!run.choices.some(c=>c.kind==='weaponMod'))run.choose(0);continue;}
      const destination=run.extraction??run.loot[0]??run.chests[0]??run.pickups[0]??run.nodes.find(n=>!n.done)??{x:1600+Math.cos(run.elapsed/8)*280,y:1600+Math.sin(run.elapsed/8)*280};
      const dx=destination.x-run.player.x,dy=destination.y-run.player.y,d=Math.hypot(dx,dy)||1;run.tick(.05,{x:d>8?dx/d:0,y:d>8?dy/d:0,dash:false});ticks++;
      assert.ok(run.enemies.length<=LIMITS.enemies);assert.ok(run.pickups.length<=LIMITS.pickups);assert.ok(run.effects.length<=LIMITS.effects);assert.ok(run.shots.filter(s=>!s.hostile).length<=LIMITS.projectiles);assert.ok(run.shells.length<=20);assert.ok(Number.isFinite(run.stats.hp));assert.ok(run.weapons.every(w=>!('rarity' in w)));
    }
    assert.equal(run.state,'ended');assert.equal(run.bossSpawned,true);assert.ok(run.metrics.crates>0);console.log(`  ${ticks} ticks, ${run.kills} kills, level ${run.level}, ${Object.keys(run.items).length} items, ${run.won?'extracted':'timed out'}, ${Math.round(performance.now()-started)}ms`);
  });
  console.log(`${checks} system groups passed.`);
}finally{await rm(temp,{recursive:true,force:true});}
