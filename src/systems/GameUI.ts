import { ENEMIES, MODES, RARITIES, RARITY_COLORS, WEAPONS, WEAPON_IDS, formatTime, type Mode } from '../game/content';
import type { GameModel, Choice } from '../game/GameModel';
import { WORKSHOP, workshopCost, type SaveData, type WorkshopId } from '../game/SaveData';
import { ITEMS, ITEM_IDS, itemTexture, type ItemId } from '../game/Items';
import { ACHIEVEMENTS, achieved, WEAPON_UNLOCKS } from '../game/Progression';
import { WEAPON_MODS, modDescription } from '../game/Upgrades';
type Actions={start:(mode:Mode)=>void;pause:()=>void;target:()=>void;choose:(index:number)=>void;reroll:()=>void;dash:()=>void;mute:()=>void;motion:()=>void;map:()=>void;fullscreen:()=>void;hangar:()=>void;buy:(id:WorkshopId)=>void};
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',text=''):HTMLElementTagNameMap[K]=>{const node=document.createElement(tag);node.className=cls;node.textContent=text;return node;};
export class GameUI {
  private root=el('div');private hud=el('div','run-hud');private toolbar=el('div','toolbar');private belt=el('div','weapon-belt');
  private overlay=el('div','overlay');private toast=el('div','toast');private boss=el('div','boss-panel');
  private hp=el('strong');private xp=el('span');private clock=el('strong');private hpFill=el('i');private xpFill=el('i');private bossFill=el('i');private bossName=el('span');
  private targetButton:HTMLButtonElement;private dashButton:HTMLButtonElement;private bagButton:HTMLButtonElement;
  private key='';private beltKey='';private view='';private model!:GameModel;private save!:SaveData;private returnFocus:HTMLElement|null=null;
  constructor(private actions:Actions,private texture:(key:string)=>string){
    this.root.id='interface';
    const row=el('div','hud-stats');row.append(this.hp,this.clock);
    const health=el('div','meter health');health.setAttribute('aria-label','Health');health.append(this.hpFill);
    const xp=el('div','meter experience');xp.append(this.xpFill);this.hud.append(row,health,xp,this.xp);
    this.boss.append(this.bossName);const meter=el('div','meter boss-meter');meter.append(this.bossFill);this.boss.append(meter);
    this.targetButton=this.button('Aim N',actions.target);this.targetButton.dataset.target='';
    this.toolbar.append(this.targetButton,this.button('Pause',actions.pause));
    this.dashButton=this.button('Dash',actions.dash);this.dashButton.className='dash-button';this.dashButton.title='Dash [Space]';
    this.bagButton=this.button('Build',()=>{if(this.model.state==='running')this.actions.pause();this.inventory();});this.bagButton.className='bag-button';
    this.overlay.hidden=true;
    this.overlay.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      const buttons=Array.from(this.overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')),first=buttons[0],last=buttons.at(-1);
      if(!first||!last)return;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    this.root.append(this.hud,this.boss,this.belt,this.toast,this.toolbar,this.dashButton,this.bagButton);
    document.querySelector('#game')!.append(this.root,this.overlay);
  }
  render(model:GameModel,save:SaveData):void{
    this.model=model;this.save=save;
    const s=model.stats;
    this.hp.textContent=`${Number(s.hp.toFixed(1))} / ${s.maxHp} HP`;this.clock.textContent=formatTime(model.elapsed);
    this.hpFill.style.width=`${s.hp/s.maxHp*100}%`;this.xpFill.style.width=`${Math.min(1,model.xp/model.threshold)*100}%`;
    this.xp.textContent=`LV ${model.level}`;this.hud.title=`${Math.floor(model.xp)} / ${model.threshold} XP · ${model.scrap} scrap · ${model.kills} kills`;
    this.targetButton.textContent=`Aim ${model.targeting[0]}`;this.targetButton.title=`Target: ${model.targeting} [T]`;this.targetButton.setAttribute('aria-label',`Target: ${model.targeting}`);
    this.overlay.querySelectorAll('[data-target]').forEach(e=>e.textContent=`Target: ${model.targeting} [T]`);
    this.overlay.querySelectorAll('[data-mute]').forEach(e=>e.textContent=save.muted?'Sound: off [M]':'Sound: on [M]');
    this.overlay.querySelectorAll('[data-motion]').forEach(e=>e.textContent=`Reduced motion: ${save.reducedMotion?'on':'off'}`);
    this.overlay.querySelectorAll('[data-map]').forEach(e=>e.textContent=`Minimap: ${save.showMap?'on':'off'} [V]`);
    this.dashButton.textContent=model.player.dashCooldown>0?`Dash ${model.player.dashCooldown.toFixed(1)}s`:'Dash';this.dashButton.disabled=model.player.dashCooldown>0||model.state!=='running';
    const itemCount=Object.values(model.items).reduce((a,b)=>a+(b??0),0);this.bagButton.textContent=itemCount?`Build · ${itemCount}`:'Build';
    this.toast.textContent=model.toastTime>0?model.toast:model.unlockNotice;this.toast.hidden=(model.toastTime<=0&&model.unlockTime<=0)||model.state!=='running';
    this.root.classList.toggle('hurt',model.hitPulse>0.1&&!save.reducedMotion);this.root.classList.toggle('low-health',s.hp/s.maxHp<0.3);this.root.classList.toggle('in-hangar',model.state==='briefing');
    this.root.classList.toggle('reduced-motion',save.reducedMotion);this.overlay.classList.toggle('reduced-motion',save.reducedMotion);
    const boss=model.boss;this.boss.hidden=!boss&&!model.bossDefeated;
    if(boss){this.bossName.textContent=`SCRAP TYRANT · ${formatTime(Math.max(0,MODES[model.mode].deadline-model.elapsed))} TO EXTRACT`;this.bossFill.style.width=`${boss.hp/boss.maxHp*100}%`;}
    else if(model.bossDefeated){this.bossName.textContent=`EXTRACT · ${formatTime(Math.max(0,MODES[model.mode].deadline-model.elapsed))} LEFT`;this.bossFill.style.width=`${(model.extraction?.progress??0)/3*100}%`;}
    const beltKey=model.weapons.map(w=>`${w.id}:${w.mods.length}`).join('|');
    if(beltKey!==this.beltKey){this.beltKey=beltKey;this.belt.replaceChildren();for(const w of model.weapons){const slot=el('div','weapon-slot');slot.title=`${WEAPONS[w.id].name} · ${w.mods.length} upgrades`;slot.append(this.icon(`weapon-${w.id}`,WEAPONS[w.id].name),el('span','',String(w.mods.length)));this.belt.append(slot);}}
    const key=`${model.state}:${model.level}:${model.rerolls}:${model.choices.map(c=>`${c.id}:${c.rarity}`).join(',')}`;
    if(this.view)return;
    if(key!==this.key){this.key=key;if(model.state==='briefing')this.briefing();else if(model.state==='paused')this.pause();else if(model.state==='upgrade'||model.state==='chest')this.choices();else if(model.state==='ended')this.results();else this.hide();}
  }
  resetView():void{this.view='';this.key='';this.beltKey='';}
  closeSubview():boolean{if(!this.view)return false;this.view='';this.key='';this.render(this.model,this.save);return true;}
  private briefing():void{
    const panel=this.panel('Scrapline Survivor','Choose a sortie. Build your weapons. Bring something back.','hangar-panel');
    panel.prepend(el('div','eyebrow','FRONTIER OPERATIONS // BUILD 0.4.2'));
    const portrait=this.icon('salvager','Armored frontier salvager');portrait.className='salvager-portrait';panel.append(portrait);
    const modes=el('div','mode-grid');
    for(const mode of ['expedition','skirmish'] as Mode[]){const b=this.button('',()=>{this.resetView();this.actions.start(mode);});b.className='mode-card';b.append(el('span','eyebrow',mode==='expedition'?'01 / LONG RANGE':'02 / RAPID SORTIE'),el('strong','',MODES[mode].title),el('span','',MODES[mode].description));modes.append(b);}
    panel.append(modes,el('p','hangar-controls','WASD / arrows move · Space dashes · T changes targeting · Esc pauses'));
    const row=el('div','button-row');row.append(this.button(`Workshop · ${this.save.bank} scrap`,()=>this.workshop()),this.button('Armory & unlocks',()=>this.collection('weapons')),this.button('Field guide',()=>this.guide()));panel.append(row);
    panel.append(el('div','hangar-records',`${this.save.runs} runs · ${this.save.wins} extractions · ${ACHIEVEMENTS.filter(a=>achieved(this.save.progress,a.id)).length} / ${ACHIEVEMENTS.length} achievements`));
    (modes.firstElementChild as HTMLElement)?.focus();
  }
  private pause():void{
    const m=this.model,panel=this.panel('Paused',`${MODES[m.mode].title} · ${formatTime(m.elapsed)} · ${m.kills} kills · ${m.scrap} scrap`);
    panel.append(el('p','',`${m.bossSpawned?'Extraction closes in':'Tyrant arrives in'} ${formatTime(Math.max(0,(m.bossSpawned?MODES[m.mode].deadline:MODES[m.mode].bossAt)-m.elapsed))}.`));
    const resume=this.button('Resume [Esc]',this.actions.pause);resume.className='primary';panel.append(resume);
    const row=el('div','button-row');row.append(this.button('Loadout & items',()=>this.inventory()),this.button('Achievements',()=>this.collection('achievements')));panel.append(row);
    const settings=el('div','settings-grid');
    for(const [label,action,data] of [
      [`Target: ${m.targeting} [T]`,this.actions.target,'target'],[this.save.muted?'Sound: off [M]':'Sound: on [M]',this.actions.mute,'mute'],
      [`Reduced motion: ${this.save.reducedMotion?'on':'off'}`,this.actions.motion,'motion'],[`Minimap: ${this.save.showMap?'on':'off'} [V]`,this.actions.map,'map'],
    ] as const){const b=this.button(label,action);b.dataset[data]='';settings.append(b);}
    settings.append(this.button('Fullscreen',this.actions.fullscreen),this.button('End run & bank salvage',this.actions.hangar));panel.append(settings);resume.focus();
  }
  private choices():void{
    const item=this.model.state==='chest',panel=this.panel(item?'Item recovered':`Level ${this.model.level}`,item?'Crates contain passive items. This item lasts for the current run.':'Choose one. Weapon upgrades have rarity; weapons do not.','upgrade-panel');
    const cards=el('div',item?'cards single-card':'cards');this.model.choices.forEach((c,i)=>cards.append(this.choiceCard(c,i)));panel.append(cards);
    if(!item){const reroll=this.button(`Reroll upgrades · ${this.model.rerollCost} scrap (${this.model.scrap} available)`,this.actions.reroll);reroll.disabled=this.model.rerolls>=2||this.model.scrap<this.model.rerollCost;panel.append(reroll);}
    panel.append(el('div','choice-help',item?'CLICK TO COLLECT OR PRESS 1':'CLICK A CARD OR PRESS 1 / 2 / 3'));
    (cards.firstElementChild as HTMLElement)?.focus();
  }
  private choiceCard(c:Choice,index:number):HTMLButtonElement{
    const b=this.button('',()=>this.actions.choose(index));b.className='upgrade-card';b.style.setProperty('--rarity',c.rarity===null?'#8dd7cd':RARITY_COLORS[c.rarity]);
    b.append(el('span','card-key',`${index+1} / ${c.tag}`));
    if(c.item)b.append(this.icon(itemTexture(c.item),''));else if(c.weapon)b.append(this.icon(`weapon-${c.weapon}`,''));
    b.append(el('strong','',c.title),el('span','card-description',c.description),el('span','card-rarity',c.rarity===null?(c.kind==='equip'?'WEAPON':'TRAINING'):RARITIES[c.rarity].toUpperCase()));return b;
  }
  private results():void{
    const m=this.model,panel=this.panel(m.won?'Extraction complete':'Run ended',m.result,'results-panel');
    const grid=el('div','results-grid');for(const [label,value] of [['SURVIVED',formatTime(m.elapsed)],['ELIMINATED',String(m.kills)],['LEVEL',String(m.level)],['BANKED',`+${m.banked}`]]){const cell=el('div');cell.append(el('strong','',value),el('span','',label));grid.append(cell);}panel.append(grid);
    const row=el('div','button-row');row.append(this.button('Run again [R]',()=>{this.resetView();this.actions.start(m.mode);}),this.button('Inspect build',()=>this.inventory()),this.button('Hangar',()=>{this.resetView();this.actions.hangar();}));panel.append(row);(row.firstElementChild as HTMLElement)?.focus();
  }
  private inventory():void{
    this.view='inventory';const m=this.model,panel=this.panel('Your build',`${m.weapons.length} / 4 weapons · ${m.scrap} scrap · ${m.cores} cores`,'wide-panel');this.back(panel);
    panel.append(el('div','stat-summary',`Damage ×${m.stats.damage.toFixed(2)} · Rate ×${m.stats.rate.toFixed(2)} · Crit ${Math.round(m.stats.crit*100)}% · Armor ${Math.round(m.stats.armor*100)}% · Speed ${Math.round(m.stats.speed)}`));
    const weapons=el('div','inventory-grid');for(const w of m.weapons){const card=el('div','inventory-card');card.append(this.icon(`weapon-${w.id}`,''),el('strong','',WEAPONS[w.id].name),el('p','',WEAPONS[w.id].description));
      if(!w.mods.length)card.append(el('span','muted','No weapon upgrades installed.'));
      for(const installed of w.mods){const mod=WEAPON_MODS.find(m=>m.id===installed.id)!;const line=el('p','installed-mod',`${RARITIES[installed.rarity]} · ${mod.name}: ${modDescription(mod,installed.rarity)}`);line.style.color=RARITY_COLORS[installed.rarity];card.append(line);}weapons.append(card);
    }panel.append(weapons,el('h2','','Salvaged items'));
    const items=el('div','inventory-grid');for(const [id,count] of Object.entries(m.items) as [ItemId,number][]){const item=ITEMS[id],card=el('div','inventory-card');card.style.borderColor=RARITY_COLORS[item.rarity];card.append(this.icon(itemTexture(id),''),el('strong','',`${item.name} ×${count}`),el('span','card-rarity',RARITIES[item.rarity]),el('p','',item.description));if(id==='phoenix'&&m.phoenixUsed)card.append(el('span','muted','Revival used this run.'));items.append(card);}
    if(!items.childElementCount)items.append(el('p','','Open salvage crates and collect their item drops.'));panel.append(items);
  }
  private workshop():void{
    this.view='workshop';const panel=this.panel('Workshop',`${this.save.bank} banked scrap · Applies to your next run.`,'wide-panel');this.back(panel);
    const grid=el('div','cards');for(const item of WORKSHOP){const rank=this.save.upgrades[item.id],card=el('div','inventory-card');card.append(el('div','card-key',`RANK ${rank} / 3`),el('strong','',item.name),el('p','',item.description));const buy=this.button(rank>=3?'Fully upgraded':`Install · ${workshopCost(this.save,item.id)} scrap`,()=>{this.actions.buy(item.id);this.workshop();});buy.disabled=rank>=3||this.save.bank<workshopCost(this.save,item.id);card.append(buy);grid.append(card);}panel.append(grid);
  }
  private collection(section:'weapons'|'items'|'achievements'):void{
    this.view='collection';const panel=this.panel('Armory & unlocks','Achievement unlocks persist. Your weapons, upgrades and carried items reset each run.','wide-panel');this.back(panel);
    const tabs=el('div','collection-tabs');for(const id of ['weapons','items','achievements'] as const){const b=this.button(id[0].toUpperCase()+id.slice(1),()=>this.collection(id));b.classList.toggle('selected',id===section);tabs.append(b);}panel.append(tabs);
    const grid=el('div','collection-grid'),progress=this.save.progress;
    if(section==='weapons')for(const id of WEAPON_IDS){const weapon=WEAPONS[id],unlock=WEAPON_UNLOCKS[id],open=achieved(progress,unlock),card=el('div',`collection-card ${open?'':'locked'}`);card.append(this.icon(`weapon-${id}`,''),el('strong','',weapon.name),el('p','',weapon.description));card.append(this.unlockLine(unlock,open));grid.append(card);}
    if(section==='items')for(const id of ITEM_IDS){const item=ITEMS[id],open=achieved(progress,item.unlock),card=el('div',`collection-card ${open?'':'locked'}`);card.style.borderColor=RARITY_COLORS[item.rarity];card.append(this.icon(itemTexture(id),''),el('strong','',item.name),el('span','card-rarity',RARITIES[item.rarity]),el('p','',item.description),this.unlockLine(item.unlock,open));grid.append(card);}
    if(section==='achievements')for(const a of ACHIEVEMENTS){const open=achieved(progress,a.id),card=el('div',`collection-card ${open?'complete':''}`);const rewards=[...WEAPON_IDS.filter(id=>WEAPON_UNLOCKS[id]===a.id).map(id=>WEAPONS[id].name),...ITEM_IDS.filter(id=>ITEMS[id].unlock===a.id).map(id=>ITEMS[id].name)];card.append(el('strong','',`${open?'✓ ':''}${a.name}`),el('p','',a.description),el('span','unlock-line',`${Math.min(a.goal,Math.floor(progress[a.metric]))} / ${a.goal}`),el('p','',`Unlocks: ${rewards.join(', ')}`));grid.append(card);}
    panel.append(grid);
  }
  private unlockLine(id:string|null,open:boolean):HTMLElement{
    if(!id)return el('span','unlock-line','Starter weapon');const a=ACHIEVEMENTS.find(a=>a.id===id)!;
    return el('span','unlock-line',open?'Unlocked':`${a.description} ${Math.min(a.goal,Math.floor(this.save.progress[a.metric]))} / ${a.goal}`);
  }
  private guide():void{
    this.view='guide';const panel=this.panel('Field guide','Watch silhouettes, leave an escape lane, and follow attack warnings.','wide-panel');this.back(panel);
    const list=el('div','collection-grid');for(const [kind,enemy] of Object.entries(ENEMIES)){const card=el('div','collection-card');card.style.borderColor=`#${enemy.color.toString(16)}`;card.append(this.icon(kind,''),el('strong','',enemy.name),el('p','',enemy.description));list.append(card);}panel.append(list,el('p','','Green minimap markers are four-second salvage scans. Crates drop items on the ground. Defeat the Tyrant, then hold inside the cyan beacon for three seconds before the deadline. Toggle the minimap with V or in pause.'));
  }
  private back(panel:HTMLElement):void{const b=this.button('Back [Esc]',()=>this.closeSubview());b.className='back-button';panel.append(b);b.focus({preventScroll:true});}
  private hide():void{this.overlay.hidden=true;this.overlay.replaceChildren();this.root.inert=false;if(this.returnFocus?.isConnected)this.returnFocus.focus();}
  destroy():void{this.root.remove();this.overlay.remove();}
  private panel(title:string,summary:string,extra=''):HTMLDivElement{
    if(this.overlay.hidden)this.returnFocus=document.activeElement as HTMLElement;
    this.overlay.replaceChildren();this.overlay.hidden=false;this.root.inert=true;
    const panel=el('div',`panel ${extra}`);panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','panel-title');const heading=el('h1','',title);heading.id='panel-title';panel.append(heading,el('p','',summary));this.overlay.append(panel);return panel;
  }
  private icon(key:string,alt:string):HTMLImageElement{const img=el('img','item-icon');img.src=this.texture(key);img.alt=alt;return img;}
  private button(text:string,action:()=>void):HTMLButtonElement{const b=el('button','',text);b.type='button';b.addEventListener('click',action);return b;}
}
