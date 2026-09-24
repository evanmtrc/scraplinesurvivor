import { ENEMIES, MODES, RARITIES, RARITY_COLORS, WEAPONS, WEAPON_IDS, formatTime, type Mode } from '../game/content';
import type { GameModel, Choice } from '../game/GameModel';
import { WORKSHOP, workshopCost, type SaveData, type WorkshopId } from '../game/SaveData';
type Actions = { start: (mode:Mode)=>void; pause:()=>void; target:()=>void; choose:(index:number)=>void; reroll:()=>void; dash:()=>void; mute:()=>void; motion:()=>void; fullscreen:()=>void; hangar:()=>void; buy:(id:WorkshopId)=>void };
const element = <K extends keyof HTMLElementTagNameMap>(tag:K,cls='',text=''):HTMLElementTagNameMap[K] => {const e=document.createElement(tag);e.className=cls;e.textContent=text;return e;};
export class GameUI {
  private root=element('div'); private toolbar=element('div','toolbar'); private overlay=element('div','overlay');
  private hud=element('div','run-hud'); private belt=element('div','weapon-belt'); private toast=element('div','toast'); private boss=element('div','boss-panel');
  private hp=element('strong'); private xp=element('span'); private clock=element('strong'); private level=element('strong'); private objective=element('div','objective');
  private hpFill=element('i');private xpFill=element('i');private bossFill=element('i');private bossName=element('span');
  private targetButton:HTMLButtonElement; private dashButton:HTMLButtonElement; private key=''; private beltKey=''; private view='';
  private model!:GameModel;private save!:SaveData;private returnFocus:HTMLElement|null=null;
  constructor(private actions:Actions, private texture:(key:string)=>string){
    this.root.id='interface';
    const label=element('div','hud-label','SCRAPLINE / FRONTIER');
    const stats=element('div','hud-stats');stats.append(this.hp,this.level,this.clock);
    const health=element('div','meter health');health.setAttribute('aria-label','Health');health.append(this.hpFill);
    const experience=element('div','meter experience');experience.append(this.xpFill);
    const progress=element('div','xp-line');progress.append(this.xp,this.objective);
    this.hud.append(label,stats,health,experience,progress);
    this.boss.append(this.bossName);const bossMeter=element('div','meter boss-meter');bossMeter.append(this.bossFill);this.boss.append(bossMeter);
    this.targetButton=this.button('',actions.target);this.targetButton.dataset.target='';
    this.toolbar.append(this.targetButton,this.button('Pause [Esc]',actions.pause));
    this.dashButton=this.button('Dash [Space]',actions.dash);this.dashButton.className='dash-button';
    const controls=element('div','control-hint','WASD / ARROWS · MOVE     SPACE · DASH');
    this.overlay.hidden=true;
    this.overlay.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      const buttons=Array.from(this.overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));const first=buttons[0],last=buttons.at(-1);if(!first||!last)return;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    this.root.append(this.hud,this.boss,this.belt,controls,this.toast,this.toolbar,this.dashButton,this.overlay);
    document.querySelector('#game')!.append(this.root);
  }
  render(model:GameModel,save:SaveData):void{
    this.model=model;this.save=save;
    const s=model.stats;
    this.hud.querySelector('.hud-label')!.textContent=model.bossSpawned?`${model.bossDefeated?'EXTRACTION OPEN':'DEFEAT THE TYRANT'} · ${formatTime(Math.max(0,MODES[model.mode].deadline-model.elapsed))} REMAINING`:`${MODES[model.mode].title.toUpperCase()} / TYRANT SIGNAL IN ${formatTime(Math.max(0,MODES[model.mode].bossAt-model.elapsed))}`;
    this.hp.textContent=`${Number(s.hp.toFixed(1))} / ${s.maxHp} HP`;this.level.textContent=`LV ${model.level}`;this.clock.textContent=formatTime(model.elapsed);
    this.hpFill.style.width=`${s.hp/s.maxHp*100}%`;this.xpFill.style.width=`${Math.min(1,model.xp/model.threshold)*100}%`;
    this.xp.textContent=`${Math.floor(model.xp)} / ${model.threshold} XP`;
    this.objective.textContent=`${model.scrap} SCRAP · ${model.cores} CORES`;
    const targetText=`Target: ${model.targeting} [T]`;
    this.targetButton.textContent=targetText;this.overlay.querySelectorAll('[data-target]').forEach(e=>e.textContent=targetText);
    this.overlay.querySelectorAll('[data-mute]').forEach(e=>e.textContent=save.muted?'Sound: off [M]':'Sound: on [M]');
    this.overlay.querySelectorAll('[data-motion]').forEach(e=>e.textContent=save.reducedMotion?'Reduced motion: on':'Reduced motion: off');
    this.dashButton.textContent=model.player.dashCooldown>0?`Dash · ${model.player.dashCooldown.toFixed(1)}s`:'Dash [Space]';
    this.dashButton.disabled=model.player.dashCooldown>0||model.state!=='running';
    this.toast.textContent=model.toast;this.toast.hidden=model.toastTime<=0||model.state!=='running';
    this.root.classList.toggle('hurt',model.hitPulse>0.1&&!save.reducedMotion);this.root.classList.toggle('low-health',s.hp/s.maxHp<0.3);
    this.root.classList.toggle('in-hangar',model.state==='briefing');
    this.root.classList.toggle('reduced-motion',save.reducedMotion);
    const boss=model.boss;this.boss.hidden=!boss;
    if(boss){this.bossName.textContent=`THE SCRAP TYRANT · ${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;this.bossFill.style.width=`${boss.hp/boss.maxHp*100}%`;}
    this.root.classList.toggle('boss-active',!!boss);
    const beltKey=model.weapons.map(w=>`${w.id}:${w.level}:${w.rarity}`).join('|');
    if(beltKey!==this.beltKey){this.beltKey=beltKey;this.belt.replaceChildren();for(const w of model.weapons){const slot=element('div','weapon-slot');slot.style.setProperty('--rarity',RARITY_COLORS[w.rarity]);slot.append(element('strong','',WEAPONS[w.id].short),element('span','',`LV ${w.level} · ${RARITIES[w.rarity]}`));this.belt.append(slot);}for(let i=model.weapons.length;i<4;i++)this.belt.append(element('div','weapon-slot empty','EMPTY SLOT'));}
    const key=`${model.state}:${model.level}:${model.rerolls}:${model.choices.map(c=>c.id).join(',')}`;
    if(this.view)return;
    if(key!==this.key){this.key=key;if(model.state==='briefing')this.briefing();else if(model.state==='paused')this.pause();else if(model.state==='upgrade'||model.state==='chest')this.choices();else if(model.state==='ended')this.results();else this.hide();}
  }
  resetView():void{this.view='';this.key='';this.beltKey='';}
  private briefing():void{
    const panel=this.panel('Scrapline Survivor','A salvager, a hostile frontier, and one way out.','hangar-panel');
    panel.prepend(element('div','eyebrow','FRONTIER OPERATIONS // BUILD 0.3'));
    const portrait=element('img','salvager-portrait');portrait.src=this.texture('salvager');portrait.alt='Armored frontier salvager with a cyan visor';panel.append(portrait);
    const modes=element('div','mode-grid');
    for(const mode of ['expedition','skirmish'] as Mode[]){const b=this.button('',()=>{this.resetView();this.actions.start(mode);});b.className='mode-card';b.append(element('span','mode-label',mode==='expedition'?'01 / LONG RANGE':'02 / RAPID SORTIE'),element('strong','',MODES[mode].title),element('span','',MODES[mode].description));modes.append(b);}
    panel.append(modes,element('p','hangar-controls','Move with WASD or arrows. Space dashes. Weapons aim and attack automatically.'));
    const buttons=element('div','button-row');buttons.append(this.button(`Workshop · ${this.save.bank} scrap`,()=>this.workshop()),this.button('Field guide',()=>this.guide()));panel.append(buttons);
    panel.append(element('div','hangar-records',`${this.save.runs} RUNS   /   ${this.save.wins} EXTRACTIONS   /   BEST ${this.save.bestKills} KILLS`));
    (modes.firstElementChild as HTMLElement)?.focus();
  }
  private pause():void{
    const panel=this.panel('Paused',`${MODES[this.model.mode].title} · ${formatTime(this.model.elapsed)} · ${this.model.kills} kills`);
    panel.append(element('div','stat-summary',`Damage ×${this.model.stats.damage.toFixed(2)}   •   Rate ×${this.model.stats.rate.toFixed(2)}\nCrit ${Math.round(this.model.stats.crit*100)}%   •   Armor ${Math.round(this.model.stats.armor*100)}%   •   Speed ${Math.round(this.model.stats.speed)}`));
    const resume=this.button('Resume [Esc]',this.actions.pause);resume.className='primary';panel.append(resume);
    const buttons=element('div','settings-grid');
    const target=this.button('',this.actions.target);target.dataset.target='';target.textContent=`Target: ${this.model.targeting} [T]`;
    const mute=this.button(this.save.muted?'Sound: off [M]':'Sound: on [M]',this.actions.mute);mute.dataset.mute='';
    const motion=this.button(this.save.reducedMotion?'Reduced motion: on':'Reduced motion: off',this.actions.motion);motion.dataset.motion='';
    buttons.append(target,mute,motion,this.button('Fullscreen',this.actions.fullscreen));panel.append(buttons,this.button('End run & bank salvage',this.actions.hangar));resume.focus();
  }
  private choices():void{
    const chest=this.model.state==='chest';
    const panel=this.panel(chest?'Salvage recovered':`Level ${this.model.level}`,chest?'Choose one reward. Your run is paused.':'Choose one upgrade. Your run is paused.','upgrade-panel');
    panel.prepend(element('div','eyebrow',chest?'TECH CACHE // FIELD RECOVERY':`${this.model.weapons.length} / 4 WEAPON SLOTS`));
    const cards=element('div','cards');
    this.model.choices.forEach((choice,index)=>cards.append(this.choiceCard(choice,index)));
    panel.append(cards);
    if(chest){const reroll=this.button(`Reroll · ${this.model.rerollCost} scrap (${this.model.scrap} available)`,this.actions.reroll);reroll.disabled=this.model.rerolls>=2||this.model.scrap<this.model.rerollCost;panel.append(reroll);}
    panel.append(element('div','choice-help','CLICK A CARD OR PRESS 1 / 2 / 3'));
    (cards.firstElementChild as HTMLElement)?.focus();
  }
  private choiceCard(choice:Choice,index:number):HTMLButtonElement{
    const b=this.button('',()=>this.actions.choose(index));b.className='upgrade-card';b.style.setProperty('--rarity',RARITY_COLORS[choice.rarity]);
    b.append(element('span','card-key',`0${index+1} / ${choice.tag}`),element('strong','',choice.title),element('span','card-description',choice.description),element('span','card-rarity',choice.kind==='module'?'MODULE':RARITIES[choice.rarity].toUpperCase()));return b;
  }
  private results():void{
    const m=this.model,panel=this.panel(m.won?'Extraction complete':'Run ended',m.result,'results-panel');
    panel.prepend(element('div','eyebrow',m.won?'SALVAGER RECOVERED // SUCCESS':'SIGNAL LOST // SALVAGE SECURED'));
    const grid=element('div','results-grid');for(const [label,value] of [['SURVIVED',formatTime(m.elapsed)],['ELIMINATED',String(m.kills)],['BUILD LEVEL',String(m.level)],['BANKED SCRAP',`+${m.banked}`]]){const stat=element('div');stat.append(element('strong','',value),element('span','',label));grid.append(stat);}panel.append(grid);
    const buttons=element('div','button-row');buttons.append(this.button('Run again [R]',()=>{this.resetView();this.actions.start(m.mode);}),this.button(`Workshop · ${this.save.bank} scrap`,()=>this.workshop()),this.button('Hangar',()=>{this.resetView();this.actions.hangar();}));panel.append(buttons);(buttons.firstElementChild as HTMLElement)?.focus();
  }
  private workshop():void{
    this.view='workshop';const panel=this.panel('Workshop',`${this.save.bank} banked scrap · Upgrades apply to your next run.`,'upgrade-panel');
    const grid=element('div','cards');
    for(const item of WORKSHOP){const rank=this.save.upgrades[item.id],cost=workshopCost(this.save,item.id);const card=element('div','workshop-card');card.append(element('div','card-key',`RANK ${rank} / 3`),element('strong','',item.name),element('p','',item.description));const buy=this.button(rank>=3?'Fully upgraded':`Install · ${cost} scrap`,()=>{this.actions.buy(item.id);this.workshop();});buy.disabled=rank>=3||this.save.bank<cost;card.append(buy);grid.append(card);}panel.append(grid,this.button('Back',()=>{this.view='';this.key='';this.render(this.model,this.save);}));
    panel.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }
  private guide():void{
    this.view='guide';const panel=this.panel('Field guide','Read silhouettes, watch attack warnings, and keep a path open.','guide-panel');
    const back=this.button('Back',()=>{this.view='';this.key='';this.render(this.model,this.save);});back.className='guide-back';panel.append(back,element('h2','','Hostile signals'));const list=element('div','guide-grid');
    for(const [kind,enemy] of Object.entries(ENEMIES)){const card=element('div','guide-item');card.style.borderColor=`#${enemy.color.toString(16).padStart(6,'0')}`;const icon=element('img','enemy-portrait');icon.src=this.texture(kind);icon.alt='';card.append(icon,element('strong','',enemy.name),element('span','',enemy.description));list.append(card);}panel.append(list,element('h2','','Salvager arsenal'));
    panel.append(element('p','','Gold rings mark elites: tougher enemies with guaranteed chests. Green map markers are salvage scans—hold nearby for 4 seconds. Defeat the Tyrant, then hold inside the cyan extraction beacon for 3 seconds before the deadline.'));
    const arsenal=element('div','guide-grid');for(const id of WEAPON_IDS){const card=element('div','guide-item');card.append(element('strong','',WEAPONS[id].name),element('span','',WEAPONS[id].description));arsenal.append(card);}panel.append(arsenal);back.focus({preventScroll:true});panel.scrollTop=0;
  }
  private hide():void{this.overlay.hidden=true;this.overlay.replaceChildren();this.toolbar.inert=false;if(this.returnFocus?.isConnected)this.returnFocus.focus();}
  destroy():void{this.root.remove();}
  private panel(title:string,summary:string,extra=''):HTMLDivElement{
    if(this.overlay.hidden)this.returnFocus=document.activeElement as HTMLElement;
    this.overlay.replaceChildren();this.overlay.hidden=false;this.toolbar.inert=true;
    const panel=element('div',`panel ${extra}`);panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','panel-title');
    const heading=element('h1','',title);heading.id='panel-title';panel.append(heading,element('p','',summary));this.overlay.append(panel);return panel;
  }
  private button(text:string,action:()=>void):HTMLButtonElement{const b=element('button','',text);b.type='button';b.addEventListener('click',action);return b;}
}
