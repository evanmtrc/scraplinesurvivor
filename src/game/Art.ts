import Phaser from 'phaser';
export function createArt(scene: Phaser.Scene): void {
  if(scene.textures.exists('salvager'))return;
  const g=scene.make.graphics({x:0,y:0});
  const rect=(c:number,x:number,y:number,w:number,h:number)=>g.fillStyle(c).fillRect(x,y,w,h);
  const disk=(c:number,x:number,y:number,r:number)=>g.fillStyle(c).fillCircle(x,y,r);
  const line=(c:number,w:number,x:number,y:number,tx:number,ty:number)=>g.lineStyle(w,c).lineBetween(x,y,tx,ty);
  const save=(name:string,size=48)=>{g.generateTexture(name,size,size);g.clear();};
  // Directional salvager: backpack, armored shoulders, visor, gloves and weapon.
  g.fillStyle(0x071219,0.5).fillEllipse(24,29,36,27);
  rect(0x12232a,9,17,30,22);rect(0x887557,10,20,7,18);rect(0x455962,15,21,20,20);
  rect(0x214b52,15,17,20,22);rect(0x55bbb6,16,19,18,15);rect(0x8fe0d0,16,19,4,12);
  rect(0xc6a86d,8,17,8,10);rect(0xc6a86d,33,17,8,10);rect(0x364c56,8,28,7,7);rect(0x364c56,34,28,7,7);
  rect(0x0b1921,15,5,20,17);rect(0x739999,17,4,16,15);rect(0xa3c3b5,17,4,16,4);
  rect(0x172f3a,17,9,16,9);rect(0x76e8e3,18,10,14,5);rect(0xe1ffdf,18,10,4,3);
  rect(0xc18c52,33,7,6,15);rect(0x263941,34,1,4,12);rect(0xffda91,35,1,2,4);
  rect(0x182c34,21,32,9,4);rect(0xf0c077,22,32,3,3);save('salvager');
  rect(0x192d35,15,27,8,14);rect(0x192d35,26,27,8,14);rect(0x52686b,15,27,8,8);rect(0x52686b,26,27,8,8);rect(0xb19161,15,38,8,3);rect(0xb19161,26,38,8,3);save('boots');
  // Crawler: retain its rust-red, round silhouette with segmented legs and mandibles.
  for(let i=0;i<6;i++){const a=i*Math.PI/3;line(0x633f3b,4,24+Math.cos(a)*7,24+Math.sin(a)*7,24+Math.cos(a)*20,24+Math.sin(a)*17);}
  disk(0x402c31,24,25,15);disk(0xbc675b,24,23,12);disk(0xd0846c,21,20,7);rect(0x432b30,17,17,4,5);rect(0x432b30,28,17,4,5);rect(0xf6cd99,17,17,3,2);rect(0xf6cd99,28,17,3,2);line(0xe7a079,3,20,13,17,7);line(0xe7a079,3,28,13,31,7);save('crawler');
  for(let i=0;i<4;i++){const a=i*Math.PI/2+0.7;line(0x9d8051,2,24,24,24+Math.cos(a)*12,24+Math.sin(a)*12);}disk(0x5a493c,24,24,10);disk(0xd7b266,24,22,7);disk(0xffdf98,22,20,2);disk(0x372d2b,24,25,3);save('skitter');
  rect(0x382f34,7,8,34,33);rect(0x685a58,9,10,30,29);rect(0xb28375,12,12,24,23);rect(0xd0a08b,12,12,24,5);rect(0x493c43,5,14,8,18);rect(0x493c43,35,14,8,18);rect(0xe0b789,17,18,14,4);rect(0x423239,19,28,10,5);rect(0x887167,10,37,10,6);rect(0x887167,28,37,10,6);save('bruiser');
  g.fillStyle(0x40513c).fillEllipse(24,28,29,31);g.fillStyle(0x8eab67).fillEllipse(24,27,23,26);disk(0xb4cd80,19,25,5);disk(0xb4cd80,29,32,5);disk(0x425146,16,14,7);disk(0x425146,32,14,7);disk(0xd9de92,16,13,4);disk(0xd9de92,32,13,4);rect(0x405247,21,6,6,14);rect(0xe5ad77,22,4,4,5);save('spitter');
  for(let i=0;i<6;i++){const a=i*Math.PI/3;line(0x9e694f,3,24,24,24+Math.cos(a)*19,24+Math.sin(a)*16);}disk(0x664137,24,24,14);disk(0xcf8252,24,24,11);disk(0xffd284,24,24,7);disk(0xfff0b3,24,24,3);line(0x634b3c,3,22,12,30,6);disk(0xf5b379,30,6,3);save('bomber');
  for(let i=0;i<4;i++){const a=i*Math.PI/2;rect(0x3d5670,20+Math.cos(a)*15,20+Math.sin(a)*15,8,8);}g.lineStyle(3,0x709bd0).strokeCircle(24,24,15);disk(0x314b64,24,24,10);rect(0x8ec7ee,18,18,12,12);rect(0xd2f6f0,21,21,6,6);save('shield');
  g.fillStyle(0x5c3d4d).fillTriangle(24,2,6,39,42,39);g.fillStyle(0xb96f85).fillTriangle(24,6,11,34,37,34);g.fillStyle(0xedadac).fillTriangle(24,6,20,21,28,21);rect(0x362e3b,17,27,14,5);rect(0xf1cba8,19,27,10,2);save('charger');
  disk(0x504255,24,25,17);disk(0x9b80ab,17,29,11);disk(0xb29aba,31,28,10);disk(0x836e9c,24,15,10);disk(0xd2b3ce,17,27,4);disk(0xe6c5d5,31,26,3);rect(0x312a3f,19,11,3,4);rect(0x312a3f,27,11,3,4);save('splitter');
  // Tyrant: heavy industrial crab, four articulated outriggers and exposed reactor.
  for(const x of [15,94])for(const y of [27,77]){rect(0x29373f,x,y,19,29);rect(0x53606a,x+3,y+3,13,23);for(let i=0;i<4;i++)rect(0x172831,x+3,y+3+i*6,13,2);}
  rect(0x28333c,27,25,74,78);rect(0x856849,31,27,66,72);rect(0xb7905d,38,22,52,73);rect(0xe1b970,40,24,48,8);rect(0x423b36,46,35,36,45);disk(0x754f3e,64,57,17);disk(0xe59b59,64,57,12);disk(0xffe4a1,64,57,6);rect(0x1c2c35,28,12,14,44);rect(0x1c2c35,86,12,14,44);rect(0xd2aa6a,31,10,8,29);rect(0xd2aa6a,89,10,8,29);rect(0x557c81,43,91,42,8);rect(0x9cd6c9,48,94,32,3);save('tyrant',128);
  disk(0xffdf83,6,6,4);disk(0xffffff,5,5,2);save('bullet',12);
  disk(0xffaa7d,8,8,6);disk(0x8e423d,8,8,3);save('hostile',16);
  g.fillStyle(0x244c56).fillTriangle(8,0,0,8,8,16).fillTriangle(8,0,16,8,8,16);g.fillStyle(0x7cdbdf).fillTriangle(8,2,2,8,8,14).fillTriangle(8,2,14,8,8,14);line(0xd3ffdf,1,8,2,8,12);save('xp',16);
  rect(0x4e432d,2,2,12,12);rect(0xc6a15b,3,3,10,10);rect(0xf1d18b,5,4,6,3);save('scrap',16);
  rect(0x243f35,0,0,18,18);rect(0x9adb94,6,3,6,12);rect(0x9adb94,3,6,12,6);save('heal',18);
  g.lineStyle(4,0xd5a5f2).strokeCircle(10,10,7);rect(0xe5d0ff,4,3,4,6);rect(0xe5d0ff,12,3,4,6);save('magnet',20);
  rect(0x443d2a,1,7,30,21);rect(0xc2974f,3,9,26,17);rect(0xeecb7c,3,9,26,5);rect(0x584a32,8,8,3,20);rect(0x584a32,22,8,3,20);rect(0xffeab3,14,14,6,8);save('chest',32);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;g.fillStyle(0xd2ebba).fillTriangle(20+Math.cos(a)*18,20+Math.sin(a)*18,20+Math.cos(a+0.3)*10,20+Math.sin(a+0.3)*10,20+Math.cos(a-0.3)*10,20+Math.sin(a-0.3)*10);}disk(0x536964,20,20,11);disk(0xbbed9b,20,20,5);save('saw',40);
  disk(0x554730,8,8,7);disk(0xffbd77,8,8,4);save('shell',16);
  g.destroy();
}
