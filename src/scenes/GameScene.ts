import Phaser from 'phaser';
import { GameModel, type Entity, type Enemy } from '../game/GameModel';
import { createArt } from '../game/Art';
import { AudioBus } from '../game/AudioBus';
import { ENEMIES, LIMITS, WEAPONS, WORLD, type Mode } from '../game/content';
import { purchase, readSave, writeSave, type SaveData } from '../game/SaveData';
import { GameUI } from '../systems/GameUI';
import { SpritePool } from '../systems/SpritePool';
type Layer = { pool:SpritePool; sprites:Map<number,Phaser.GameObjects.Image> };
export class GameScene extends Phaser.Scene {
  private model!:GameModel;private save!:SaveData;private ui!:GameUI;private audio!:AudioBus;
  private body!:Phaser.GameObjects.Image;private boots!:Phaser.GameObjects.Image;
  private cursor!:Phaser.Types.Input.Keyboard.CursorKeys;private keys!:Record<'W'|'A'|'S'|'D',Phaser.Input.Keyboard.Key>;
  private layers:Record<string,Layer>={};private ground!:Phaser.GameObjects.Graphics;private fx!:Phaser.GameObjects.Graphics;private radar!:Phaser.GameObjects.Graphics;
  private floats:Phaser.GameObjects.Text[]=[];private label!:Phaser.GameObjects.Text;private uiClock=0;private dashQueued=false;private settled=false;private hitSeen=0;
  private stick={active:false,id:0,x:0,y:0,dx:0,dy:0};
  constructor(){super('Game');}
  create():void{
    createArt(this);this.drawWorld();this.save=readSave();this.audio=new AudioBus(this.save.muted);
    this.model=new GameModel('expedition',this.save.upgrades);this.model.state='briefing';
    this.ground=this.add.graphics().setDepth(1);this.fx=this.add.graphics().setDepth(12);this.radar=this.add.graphics().setScrollFactor(0).setDepth(30);
    for(const [name,texture,limit,depth] of [['enemies','crawler',LIMITS.enemies,5],['shots','bullet',LIMITS.projectiles+LIMITS.hostile,8],['pickups','xp',LIMITS.pickups,2],['chests','chest',20,3],['drones','saw',4,10],['shells','shell',20,10]] as const)this.layers[name]={pool:new SpritePool(this,texture,limit,depth),sprites:new Map()};
    this.boots=this.add.image(this.model.player.x,this.model.player.y,'boots').setDepth(8.5);
    this.body=this.add.image(this.model.player.x,this.model.player.y,'salvager').setDepth(9);
    this.cameras.main.setBounds(0,0,WORLD,WORLD).startFollow(this.body,true,0.14,0.14);
    this.label=this.add.text(840,118,'SECTOR MAP',{fontFamily:'monospace',fontSize:'9px',color:'#8aafad'}).setScrollFactor(0).setDepth(31);
    this.cursor=this.input.keyboard!.createCursorKeys();this.keys=this.input.keyboard!.addKeys('W,A,S,D') as typeof this.keys;
    const refresh=()=>{this.settle();this.ui.render(this.model,this.save);};
    this.ui=new GameUI({
      start:mode=>{this.audio.unlock();this.start(mode);},
      pause:()=>{this.model.pause();this.stick.active=false;this.cameras.main.shakeEffect.reset();refresh();},
      target:()=>{this.model.cycleTarget();refresh();},choose:index=>{this.model.choose(index);refresh();},reroll:()=>{this.model.reroll();refresh();},
      dash:()=>{this.audio.unlock();this.dashQueued=true;},
      mute:()=>{this.save.muted=!this.save.muted;this.audio.unlock();this.audio.setMuted(this.save.muted);this.persist();refresh();},
      motion:()=>{this.save.reducedMotion=!this.save.reducedMotion;this.cameras.main.shakeEffect.reset();this.persist();refresh();},
      fullscreen:()=>{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});else void document.documentElement.requestFullscreen?.().catch(()=>{});},
      hangar:()=>{if(this.model.state==='ended'||this.model.state==='briefing'){this.model.state='briefing';this.ui.resetView();}else this.model.end(false,'Returned with field salvage');refresh();},
      buy:id=>{if(purchase(this.save,id)){this.persist();this.audio.play('install');}},
    }, key=>this.textures.getBase64(key));
    const onKey=(event:KeyboardEvent)=>{
      this.audio.unlock();if(event.repeat)return;
      if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();this.model.pause();this.stick.active=false;this.cameras.main.shakeEffect.reset();}
      if(event.code==='Space'&&this.model.state==='running'){event.preventDefault();this.dashQueued=true;}
      if(event.code==='KeyT')this.model.cycleTarget();
      if(event.code==='KeyM'){this.save.muted=!this.save.muted;this.audio.setMuted(this.save.muted);this.persist();}
      if(event.code==='KeyR'&&this.model.state==='ended'){this.start(this.model.mode);return;}
      if(['Digit1','Digit2','Digit3'].includes(event.code))this.model.choose(Number(event.code.slice(-1))-1);
      refresh();
    };
    const blur=()=>{this.stick.active=false;this.dashQueued=false;if(this.model.state==='running'){this.model.pause();this.cameras.main.shakeEffect.reset();refresh();}};
    const visibility=()=>{if(document.hidden)blur();};
    const unlock=()=>this.audio.unlock();
    window.addEventListener('keydown',onKey);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);window.addEventListener('pointerdown',unlock);
    this.input.addPointer(1);
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.wasTouch&&p.x<480&&this.model.state==='running')this.stick={active:true,id:p.id,x:p.x,y:p.y,dx:0,dy:0};});
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.stick.active&&p.id===this.stick.id){const dx=p.x-this.stick.x,dy=p.y-this.stick.y,length=Math.max(36,Math.hypot(dx,dy));this.stick.dx=dx/length;this.stick.dy=dy/length;}});
    this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{if(p.id===this.stick.id)this.stick.active=false;});
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{window.removeEventListener('keydown',onKey);window.removeEventListener('blur',blur);window.removeEventListener('pointerdown',unlock);document.removeEventListener('visibilitychange',visibility);this.ui.destroy();this.audio.destroy();});
    this.draw();refresh();
  }
  private start(mode:Mode):void{
    const targeting=this.model.targeting;this.model=new GameModel(mode,this.save.upgrades);this.model.targeting=targeting;this.settled=false;this.dashQueued=false;this.stick.active=false;this.hitSeen=0;
    this.cameras.main.shakeEffect.reset();this.body.setPosition(this.model.player.x,this.model.player.y);this.cameras.main.centerOn(this.model.player.x,this.model.player.y);
    this.ui.resetView();this.draw();this.ui.render(this.model,this.save);this.audio.play('install');
  }
  private persist():void{if(!writeSave(this.save))this.model.notify('Browser storage unavailable — progress lasts for this session.');}
  private settle():void{
    if(this.model.state!=='ended'||this.settled)return;this.settled=true;
    this.save.bank+=this.model.banked;this.save.runs++;if(this.model.won)this.save.wins++;
    this.save.bestKills=Math.max(this.save.bestKills,this.model.kills);this.save.bestTime=Math.max(this.save.bestTime,Math.floor(this.model.elapsed));this.persist();
  }
  update(_time:number,delta:number):void{
    const x=Number(this.keys.D.isDown||this.cursor.right.isDown)-Number(this.keys.A.isDown||this.cursor.left.isDown),y=Number(this.keys.S.isDown||this.cursor.down.isDown)-Number(this.keys.W.isDown||this.cursor.up.isDown);
    this.model.tick(delta/1000,{x:x||(this.stick.active?this.stick.dx:0),y:y||(this.stick.active?this.stick.dy:0),dash:this.dashQueued});this.dashQueued=false;
    if(this.model.hitPulse>this.hitSeen&&!this.save.reducedMotion)this.cameras.main.shake(100,0.003);
    this.hitSeen=this.model.hitPulse;this.settle();
    for(const sound of this.model.sounds)this.audio.play(sound);this.model.sounds=[];
    this.draw();this.uiClock+=delta;
    if(this.uiClock>80||this.model.state!=='running'){this.uiClock=0;this.ui.render(this.model,this.save);}
  }
  private sync<T extends Entity>(name:string,entities:T[],style:(sprite:Phaser.GameObjects.Image,e:T)=>void):void{
    const layer=this.layers[name],live=new Set<number>();
    for(const entity of entities){live.add(entity.id);let sprite=layer.sprites.get(entity.id);if(!sprite){sprite=layer.pool.acquire(entity.x,entity.y);if(!sprite)continue;layer.sprites.set(entity.id,sprite);}sprite.setPosition(entity.x,entity.y);style(sprite,entity);}
    for(const [id,sprite] of layer.sprites)if(!live.has(id)){layer.pool.release(sprite);layer.sprites.delete(id);}
  }
  private draw():void{
    const m=this.model,p=m.player,time=m.elapsed;
    this.body.setPosition(p.x,p.y+(p.moving&&!this.save.reducedMotion?Math.sin(time*18)*0.7:0)).setRotation(p.angle+Math.PI/2).setAlpha(p.invulnerable>0&&Math.floor(time*16)%2?0.5:1);
    this.boots.setPosition(p.x,p.y).setRotation(p.moveAngle+Math.PI/2).setScale(1,p.moving&&!this.save.reducedMotion?1+Math.sin(time*18)*0.045:1).setAlpha(this.body.alpha);
    this.sync('enemies',m.enemies,(sprite,e)=>{
      sprite.setTexture(e.kind).setScale(e.elite?1.4:1).setRotation(e.kind==='shield'?time:Math.atan2(p.y-e.y,p.x-e.x)+Math.PI/2);
      if(e.flash>0)sprite.setTintFill(0xfff1d4);else sprite.clearTint();
      sprite.setVisible(Math.abs(e.x-p.x)<1000&&Math.abs(e.y-p.y)<700);
    });
    this.sync('shots',m.shots,(sprite,s)=>sprite.setTexture(s.hostile?'hostile':'bullet').setTint(s.color).setRotation(Math.atan2(s.vy,s.vx)).setScale(s.hostile?1:1.1,s.hostile?1:0.7));
    this.sync('pickups',m.pickups,(sprite,item)=>sprite.setTexture(item.kind).clearTint().setScale(item.kind==='xp'?Math.min(1.5,1+Math.log2(item.value)*0.1):1).setRotation(item.kind==='xp'?Math.sin(time*2+item.id)*0.12:0));
    this.sync('chests',m.chests,(sprite,c)=>sprite.setTexture('chest').clearTint().setScale(this.save.reducedMotion?1:1+Math.sin(time*4)*0.04));
    this.sync('shells',m.shells,(sprite,s)=>{const t=1-s.time/0.75;sprite.setPosition(s.fromX+(s.x-s.fromX)*t,s.fromY+(s.y-s.fromY)*t-Math.sin(t*Math.PI)*90).setRotation(time*9);});
    const saw=m.weapons.find(w=>w.id==='saw'),drones:Entity[]=[];
    if(saw){const count=1+Math.floor(saw.level/3),radius=70+saw.level*3;for(let i=0;i<count;i++)drones.push({id:i,x:p.x+Math.cos(time*2.8+i*Math.PI*2/count)*radius,y:p.y+Math.sin(time*2.8+i*Math.PI*2/count)*radius});}
    this.sync('drones',drones,sprite=>sprite.setRotation(time*11));
    this.ground.clear();this.fx.clear();
    for(const node of m.nodes){
      this.ground.lineStyle(1,node.done?0x335253:0x789b92,0.6).strokeCircle(node.x,node.y,64);
      this.ground.fillStyle(node.done?0x263f42:0x526855).fillRect(node.x-15,node.y-15,30,30);
      this.ground.lineStyle(2,node.done?0x3e615e:0xc1c795).strokeRect(node.x-12,node.y-12,24,24);
      if(!node.done){this.ground.fillStyle(0xbde0b9).fillRect(node.x-6,node.y-3,12,6);if(node.progress>0)this.ground.lineStyle(4,0xbbed9b).beginPath().arc(node.x,node.y,65,-Math.PI/2,-Math.PI/2+node.progress/4*Math.PI*2).strokePath();}
    }
    for(const c of m.chests)this.ground.lineStyle(1,0xf8d081,0.5+Math.sin(time*3)*0.2).strokeCircle(c.x,c.y,26);
    for(const s of m.shells){this.ground.lineStyle(1,0xffbc72,0.7).strokeCircle(s.x,s.y,s.radius);this.ground.fillStyle(0xffbc72,0.06).fillCircle(s.x,s.y,s.radius);}
    for(const e of m.enemies)this.drawEnemySignals(e);
    if(m.extraction){const e=m.extraction;this.ground.fillStyle(0x76ead5,0.08).fillCircle(e.x,e.y,66);this.ground.lineStyle(3,0x83e9d7).strokeCircle(e.x,e.y,66);this.ground.lineStyle(5,0xe1ffd8).beginPath().arc(e.x,e.y,70,-Math.PI/2,-Math.PI/2+e.progress/3*Math.PI*2).strokePath();this.ground.lineStyle(3,0x83e9d7).lineBetween(e.x-20,e.y,e.x+20,e.y).lineBetween(e.x,e.y-20,e.x,e.y+20);}
    let floatCount=0;
    for(const e of m.effects){const t=1-e.life/e.maxLife;
      if(e.kind==='ring'){this.fx.lineStyle(2,e.color,1-t).strokeCircle(e.x,e.y,e.radius*(0.3+t*0.7));}
      if(e.kind==='line'){this.fx.lineStyle(e.radius+4,e.color,(1-t)*0.2).lineBetween(e.x,e.y,e.tx,e.ty);this.fx.lineStyle(e.radius,e.color,1-t).lineBetween(e.x,e.y,e.tx,e.ty);}
      if(e.kind==='spark'){for(let i=0;i<3;i++){const a=e.id+i*2.1;this.fx.fillStyle(e.color,1-t).fillRect(e.x+Math.cos(a)*t*e.radius,e.y+Math.sin(a)*t*e.radius,3*(1-t)+1,3*(1-t)+1);}}
      if(e.kind==='number'&&floatCount<36){let text=this.floats[floatCount];if(!text){text=this.add.text(0,0,'',{fontFamily:'monospace',fontSize:'13px',stroke:'#0a1621',strokeThickness:3}).setOrigin(0.5).setDepth(13);this.floats.push(text);}text.setText(e.text).setPosition(e.x,e.y-t*22).setColor(`#${e.color.toString(16).padStart(6,'0')}`).setAlpha(1-t).setVisible(true);floatCount++;}
    }
    for(let i=floatCount;i<this.floats.length;i++)this.floats[i].setVisible(false);
    this.drawRadar();
  }
  private drawEnemySignals(e:Enemy):void{
    const g=this.ground,fx=this.fx;
    if(e.shielded)g.lineStyle(1,0x89bbff,0.4).strokeCircle(e.x,e.y,e.radius+5);
    if(e.kind==='shield'){g.fillStyle(0x6d9cdb,0.055).fillCircle(e.x,e.y,110);g.lineStyle(1,0x7bb2ec,0.28).strokeCircle(e.x,e.y,110);}
    if(e.elite){g.lineStyle(2,0xefc882,0.9).strokeCircle(e.x,e.y,e.radius+7);g.lineStyle(1,0xefc882,0.2).strokeCircle(e.x,e.y,e.radius+12);}
    if(e.hp<e.maxHp||e.elite){const width=e.kind==='tyrant'?70:e.elite?44:26,y=e.y-e.radius-12;fx.fillStyle(0x0a151b,0.85).fillRect(e.x-width/2,y,width,3);fx.fillStyle(e.elite?0xecc37c:0x9bb2ac).fillRect(e.x-width/2,y,width*Math.max(0,e.hp/e.maxHp),3);}
    if(e.windup<=0)return;
    const alpha=0.45+Math.sin(this.model.elapsed*22)*0.12;
    if(e.attack==='charge'){g.lineStyle(e.radius*1.2,0xf08b80,0.1).lineBetween(e.x,e.y,e.x+Math.cos(e.angle)*270,e.y+Math.sin(e.angle)*270);g.lineStyle(2,0xffa18c,alpha).lineBetween(e.x,e.y,e.x+Math.cos(e.angle)*270,e.y+Math.sin(e.angle)*270);}
    else if(e.attack==='explode'){const radius=e.elite?115:78;g.fillStyle(0xe37c5d,alpha*0.2).fillCircle(e.x,e.y,radius);g.lineStyle(2,0xffa18c,alpha).strokeCircle(e.x,e.y,radius);}
    else if(e.attack==='shot'){g.lineStyle(2,0xe8a26d,alpha).strokeCircle(e.x,e.y,e.radius+10);}
    else g.lineStyle(3,0xf9ba79,alpha).strokeCircle(e.x,e.y,e.radius+20+(1-e.windup)*20);
  }
  private drawRadar():void{
    const m=this.model,g=this.radar;g.clear();this.label.setVisible(m.state!=='briefing');if(m.state==='briefing')return;
    const x=840,y=12,size=102,scale=size/WORLD;
    g.fillStyle(0x07161e,0.88).fillRect(x,y,size,size);g.lineStyle(1,0x536e75,0.7).strokeRect(x,y,size,size);
    const dot=(px:number,py:number,color:number,r=2)=>g.fillStyle(color).fillCircle(x+px*scale,y+py*scale,r);
    const view=this.cameras.main.worldView;g.lineStyle(1,0x466b72,0.6).strokeRect(x+view.x*scale,y+view.y*scale,view.width*scale,view.height*scale);
    for(const n of m.nodes)if(!n.done)dot(n.x,n.y,0xbad5a0,2);
    for(const c of m.chests)dot(c.x,c.y,0xffd086,3);
    for(let i=0;i<m.enemies.length;i+=3){const e=m.enemies[i];dot(e.x,e.y,e.kind==='tyrant'?0xffc57d:e.elite?0xf9ce8b:0xb97564,e.kind==='tyrant'?3:1);}
    if(m.extraction)dot(m.extraction.x,m.extraction.y,0x91ffdc,4);dot(m.player.x,m.player.y,0xd8ffff,2.5);
    const destination=m.extraction??m.chests.reduce<{x:number;y:number}|null>((best,c)=>!best||Math.hypot(c.x-m.player.x,c.y-m.player.y)<Math.hypot(best.x-m.player.x,best.y-m.player.y)?c:best,null);
    if(destination){const px=destination.x-view.x,py=destination.y-view.y;if(px<30||px>930||py<90||py>460){const angle=Math.atan2(py-270,px-480),a=Math.min(1,420/Math.max(1,Math.abs(px-480)),170/Math.max(1,Math.abs(py-270))),cx=480+(px-480)*a,cy=270+(py-270)*a;g.fillStyle(m.extraction?0x91ffdc:0xffd086).fillTriangle(cx+Math.cos(angle)*9,cy+Math.sin(angle)*9,cx+Math.cos(angle+2.4)*7,cy+Math.sin(angle+2.4)*7,cx+Math.cos(angle-2.4)*7,cy+Math.sin(angle-2.4)*7);}}
    if(this.stick.active){g.lineStyle(2,0xb4e5d6,0.35).strokeCircle(this.stick.x,this.stick.y,36);g.fillStyle(0xb4e5d6,0.45).fillCircle(this.stick.x+this.stick.dx*30,this.stick.y+this.stick.dy*30,12);}
  }
  private drawWorld():void{
    const g=this.add.graphics().setDepth(0);g.fillStyle(0x1a272c).fillRect(0,0,WORLD,WORLD);g.lineStyle(1,0x34464b,0.32);
    for(let n=0;n<=WORLD;n+=64){g.lineBetween(n,0,n,WORLD);g.lineBetween(0,n,WORLD,n);}
    g.lineStyle(5,0xc88b5b,0.75).strokeRect(3,3,WORLD-6,WORLD-6);
    for(let n=0;n<WORLD;n+=80){g.lineStyle(3,0x9e845d,0.6).lineBetween(n,5,n+15,20).lineBetween(n,WORLD-5,n+15,WORLD-20);}
    for(let i=0;i<210;i++){const x=(i*587+191)%WORLD,y=(i*997+431)%WORLD;g.fillStyle(i%3?0x354547:0x755b47,0.55).fillRect(x,y,9+i%18,3+i%5);if(i%13===0){g.fillStyle(0x334347,0.6).fillRect(x,y,55,28);g.lineStyle(2,0x5a6255,0.5).strokeRect(x+4,y+4,47,20);g.fillStyle(0x84664c,0.4).fillRect(x+10,y+8,22,5);}}
    for(const [x,y,title] of [[700,700,'NORTH RELAY'],[2100,700,'THE RUST FIELDS'],[700,2400,'SOUTHERN SCAR'],[2250,2400,'DEAD SIGNAL']] as const)this.add.text(x,y,title,{fontFamily:'monospace',fontSize:'18px',color:'#536364'}).setAlpha(0.45).setDepth(0);
    g.lineStyle(2,0x65928e,0.18).strokeCircle(WORLD/2,WORLD/2,80).strokeCircle(WORLD/2,WORLD/2,86);
  }
}
