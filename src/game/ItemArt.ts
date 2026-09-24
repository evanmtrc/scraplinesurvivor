import Phaser from 'phaser';
import { ITEMS, ITEM_IDS, itemTexture } from './Items';
import { RARITY_COLORS } from './content';

/** Small, distinct silhouettes; generated once, shared by drops, menus and inventory. */
export function createItemArt(scene:Phaser.Scene):void {
  if(scene.textures.exists('item-magnet'))return;
  const g=scene.make.graphics({x:0,y:0});
  const rect=(c:number,x:number,y:number,w:number,h:number)=>g.fillStyle(c).fillRect(x,y,w,h);
  const disk=(c:number,x:number,y:number,r:number)=>g.fillStyle(c).fillCircle(x,y,r);
  const line=(c:number,w:number,x:number,y:number,tx:number,ty:number)=>g.lineStyle(w,c).lineBetween(x,y,tx,ty);
  for(const id of ITEM_IDS){
    const color=Number(RARITY_COLORS[ITEMS[id].rarity].replace('#','0x'));
    rect(0x07151c,1,1,30,30);g.lineStyle(1,color,0.65).strokeRect(1,1,30,30);
    switch(id){
      case 'magnet': g.lineStyle(6,0xaebbbb).beginPath().arc(16,16,8,0,Math.PI).strokePath();rect(0xdb8574,5,7,6,10);rect(0x8bd5dc,21,7,6,10);rect(0xf1f2dc,5,6,6,3);rect(0xf1f2dc,21,6,6,3);break;
      case 'patch':g.fillStyle(0x9e957b).fillTriangle(6,8,16,13,26,8);rect(0x9e957b,8,9,16,18);rect(0x354b50,14,10,4,17);rect(0xd2bf89,9,18,6,6);line(0x6b6657,1,10,19,14,23);break;
      case 'flywheel':for(let i=0;i<8;i++){const a=i*Math.PI/4;rect(0xb99e70,14+Math.cos(a)*9,14+Math.sin(a)*9,5,5);}disk(0xb99e70,16,16,9);disk(0x334a50,16,16,5);disk(0xe6d293,16,16,2);break;
      case 'scope':line(0x6f858d,7,8,24,23,9);disk(0xc3d1cb,12,20,7);disk(0x487c87,12,20,4);line(0xc9eece,1,8,20,16,20);line(0xc9eece,1,12,16,12,24);rect(0xa98d68,20,7,5,6);break;
      case 'boots':rect(0x789c81,7,6,7,16);rect(0x405d63,8,20,11,5);rect(0xd5eeb1,7,25,12,3);rect(0x789c81,18,5,6,13);rect(0xb8cf88,18,18,10,4);line(0xe4fbb9,2,3,16,6,13);break;
      case 'ration':rect(0x859997,8,9,16,18);rect(0xc4ccae,10,6,12,4);disk(0x74ae70,11,17,5);disk(0xa4dc8e,20,13,5);disk(0xcde5a9,18,20,4);rect(0x355744,15,11,2,13);break;
      case 'battery':rect(0x6e816f,8,7,16,20);rect(0xe2dc95,12,4,8,3);rect(0xc5d498,10,10,12,14);g.fillStyle(0x6c774c).fillTriangle(19,10,12,18,17,18).fillTriangle(15,16,20,16,13,24);break;
      case 'compass':disk(0xb4bc83,16,16,11);disk(0x284a50,16,16,8);g.fillStyle(0xe5e7ab).fillTriangle(18,7,12,18,17,16);g.fillStyle(0x71b6b0).fillTriangle(14,25,20,14,15,16);disk(0xe7edc0,16,16,2);break;
      case 'ice':line(0x9db5cc,2,11,8,16,4);line(0x9db5cc,2,16,4,21,8);rect(0x496777,8,9,16,17);rect(0x9cd9f4,11,12,10,10);rect(0xd8ffff,14,12,4,10);rect(0x8097b3,6,26,20,3);break;
      case 'thorns':g.fillStyle(0x969ebd).fillTriangle(16,5,5,25,27,25);g.fillStyle(0x526681).fillTriangle(16,9,10,23,22,23);for(let i=0;i<3;i++){g.fillStyle(0xd8d2e9).fillTriangle(6+i*8,18,3+i*8,10,11+i*8,18);}break;
      case 'spark':rect(0x536b94,7,10,18,15);rect(0x9dcbe0,8,22,16,4);for(let i=0;i<3;i++){line(0xb8d9fa,2,10+i*6,6,10+i*6,20);disk(0xe4ffff,10+i*6,6,2);}line(0x83e8f2,3,7,17,25,12);break;
      case 'siphon':g.fillStyle(0xcbdde0).fillTriangle(8,5,23,8,12,27);g.fillStyle(0x83bbcd).fillTriangle(15,9,23,8,12,27);disk(0x995677,21,21,4);disk(0xe3a3c3,20,20,2);break;
      case 'prism':g.fillStyle(0xa17dd4).fillTriangle(16,4,4,24,16,28);g.fillStyle(0xe2bbfa).fillTriangle(16,4,28,24,16,28);g.fillStyle(0x7de0df).fillTriangle(16,7,9,22,16,25);line(0xfdeed2,2,21,10,28,5);break;
      case 'cloak':g.fillStyle(0x9a80b9).fillTriangle(16,5,4,26,28,26);disk(0x4b4869,16,9,5);rect(0xcfb0e7,13,10,6,3);g.fillStyle(0x515776).fillTriangle(16,15,11,26,22,26);disk(0xe4d7ff,26,10,2);break;
      case 'reactor':rect(0x9b8055,5,9,22,17);rect(0xf4ca7b,9,5,14,23);disk(0x6c4942,16,16,8);disk(0xf5a661,16,16,6);disk(0xffedaf,16,16,3);for(const x of [3,26])rect(0xb69764,x,12,3,10);break;
      case 'phoenix':g.fillStyle(0xffb76b).fillTriangle(16,14,3,6,8,24).fillTriangle(16,14,29,6,24,24);g.fillStyle(0xf6d991).fillTriangle(16,6,11,22,21,22);g.fillStyle(0xffefc2).fillTriangle(16,11,12,20,20,20);line(0xffda80,2,16,21,16,28);break;
    }
    g.generateTexture(itemTexture(id),32,32);g.clear();
  }
  for(const id of ['pistol','scatter','arc','saw','mortar','rail']){
    const colors:Record<string,number>={pistol:0xffdf83,scatter:0xffab69,arc:0x87e9ef,saw:0xbbef9a,mortar:0xffc381,rail:0xd4a5ff};const c=colors[id];
    if(id==='saw'){g.lineStyle(3,c).strokeCircle(16,16,10);for(let i=0;i<8;i++){const a=i*Math.PI/4;line(c,3,16+Math.cos(a)*8,16+Math.sin(a)*8,16+Math.cos(a)*13,16+Math.sin(a)*13);}disk(0x577a70,16,16,5);}
    else if(id==='arc'){rect(0x456c78,9,16,14,10);for(const x of [9,16,23]){line(c,2,x,5,x,19);disk(c,x,5,2);}line(0xd6ffff,2,9,10,23,14);}
    else if(id==='mortar'){rect(0x718583,5,24,23,4);line(c,8,10,23,21,7);line(0x394f58,3,9,24,19,7);}
    else {rect(0x566e74,11,18,7,10);rect(c,7,10,id==='pistol'?18:21,7);rect(0x344d57,9,12,17,2);if(id==='scatter')rect(c,7,18,21,4);if(id==='rail'){rect(c,4,8,25,3);rect(0xf5dfff,21,11,7,5);}}
    g.generateTexture(`weapon-${id}`,32,32);g.clear();
  }
  g.destroy();
}
