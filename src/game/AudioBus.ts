const NOTES:Record<string,[number,number,number,OscillatorType]>={pistol:[190,70,0.05,'square'],scatter:[100,35,0.12,'sawtooth'],arc:[650,150,0.13,'sawtooth'],rail:[900,95,0.19,'triangle'],mortar:[150,50,0.12,'triangle'],explosion:[80,20,0.28,'sawtooth'],xp:[850,1350,0.055,'sine'],heal:[440,880,0.2,'sine'],dash:[350,80,0.13,'triangle'],hurt:[140,50,0.2,'square'],level:[520,1050,0.4,'sine'],chest:[650,1300,0.35,'triangle'],install:[440,880,0.22,'sine'],warning:[220,240,0.4,'square'],boss:[110,65,0.6,'sawtooth'],victory:[440,1760,0.7,'triangle'],defeat:[220,45,0.65,'triangle'],notice:[380,570,0.2,'sine']};
/** Small synthesized cues; no downloads and no sound before a player gesture. */
export class AudioBus {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private last = new Map<string,number>();
  private voices = 0;
  constructor(public muted = false) {}
  unlock(): void {
    try {
      if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.muted?0:0.18;this.master.connect(this.context.destination);}
      if(this.context.state==='suspended')void this.context.resume().catch(()=>{});
    } catch { /* Audio is optional in restricted browsers. */ }
  }
  setMuted(value:boolean):void{this.muted=value;if(this.context&&this.master)this.master.gain.setTargetAtTime(value?0:0.18,this.context.currentTime,0.03);}
  play(name:string):void {
    if(!this.context||!this.master||this.context.state!=='running'||this.muted||this.voices>=12)return;
    const now=this.context.currentTime;if(now-(this.last.get(name)??-10)<(name==='xp'?0.1:0.045))return;this.last.set(name,now);

    const [start,end,duration,type]=NOTES[name]??NOTES.notice;
    const oscillator=this.context.createOscillator(),envelope=this.context.createGain();oscillator.type=type;
    oscillator.frequency.setValueAtTime(start,now);oscillator.frequency.exponentialRampToValueAtTime(end,now+duration);
    envelope.gain.setValueAtTime(0.0001,now);envelope.gain.exponentialRampToValueAtTime(name==='xp'?0.13:0.23,now+0.005);envelope.gain.exponentialRampToValueAtTime(0.0001,now+duration);
    oscillator.connect(envelope);envelope.connect(this.master);this.voices++;oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();this.voices--;};oscillator.start(now);oscillator.stop(now+duration+0.02);
  }
  destroy():void{void this.context?.close().catch(()=>{});this.context=null;this.master=null;}
}
