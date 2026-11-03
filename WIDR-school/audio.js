// ---------- AUDIO: original visual-novel music and sound effects (pure Web Audio, works offline) ----------
const AUD={ctx:null, mus:null, sfx:null, rev:null, mood:null, song:null, stepN:0, next:0, timer:null};
SET.music = SET.music==null?0.55:SET.music; SET.sfxv = SET.sfxv==null?0.7:SET.sfxv;
const N2F=n=>{ const m=/^([A-G])(#|b)?(-?\d)$/.exec(n); const base={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0); return 440*Math.pow(2,(base+(+m[3]+1)*12-69)/12); };
function audioInit(){
  if(AUD.ctx) return; const C=window.AudioContext||window.webkitAudioContext; if(!C) return;
  const ctx=AUD.ctx=new C();
  AUD.mus=ctx.createGain(); AUD.sfx=ctx.createGain(); AUD.mus.gain.value=SET.music*0.5; AUD.sfx.gain.value=SET.sfxv*0.6;
  // small hall reverb from a generated impulse
  const len=ctx.sampleRate*2.6, ir=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2); }
  AUD.rev=ctx.createConvolver(); AUD.rev.buffer=ir; const rg=ctx.createGain(); rg.gain.value=.35; AUD.rev.connect(rg); rg.connect(ctx.destination);
  AUD.mus.connect(ctx.destination); AUD.sfx.connect(ctx.destination); AUD.mus.connect(AUD.rev);
  AUD.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate); const nd=AUD.noise.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1;
  AUD.timer=setInterval(schedule,90);
  if(AUD.want) playMood(AUD.want,true);
}
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{ audioInit(); if(AUD.ctx&&AUD.ctx.state==='suspended') AUD.ctx.resume(); },{capture:true}));
function setVolumes(){ if(!AUD.ctx) return; AUD.mus.gain.setTargetAtTime(SET.music*0.5,AUD.ctx.currentTime,.1); AUD.sfx.gain.setTargetAtTime(SET.sfxv*0.6,AUD.ctx.currentTime,.05); }

// ----- instruments -----
function env(g,t,a,peak,d,sus,r,end){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(Math.max(.0001,peak*sus),t+a+d); g.gain.setValueAtTime(Math.max(.0001,peak*sus),end); g.gain.exponentialRampToValueAtTime(.0001,end+r); }
function osc(type,f,t,end,out,detune){ const o=AUD.ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f,t); if(detune) o.detune.value=detune; o.connect(out); o.start(t); o.stop(end+.05); return o; }
const INST={
  keys(n,t,dur,v=.5,bus){ const c=AUD.ctx,f=N2F(n),g=c.createGain(),lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2600; g.connect(lp); lp.connect(bus||AUD.mus);
    env(g,t,.008,.22*v,.5,.25,.9,t+dur); osc('sine',f,t,t+dur+.9,g); const g2=c.createGain(); g2.gain.value=.25; g2.connect(g); osc('triangle',f*2,t,t+dur+.9,g2); },
  pluck(n,t,dur,v=.5){ const c=AUD.ctx,g=c.createGain(),lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(3200,t); lp.frequency.exponentialRampToValueAtTime(500,t+.25); g.connect(lp); lp.connect(AUD.mus);
    env(g,t,.004,.16*v,.18,.15,.25,t+Math.min(dur,.2)); osc('triangle',N2F(n),t,t+.6,g); },
  pad(notes,t,dur,v=.5){ const c=AUD.ctx,g=c.createGain(),lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900; g.connect(lp); lp.connect(AUD.mus);
    env(g,t,.6,.05*v,.3,.8,1.2,t+dur); notes.forEach(n=>{ osc('sawtooth',N2F(n),t,t+dur+1.2,g,-7); osc('sawtooth',N2F(n),t,t+dur+1.2,g,7); }); },
  bass(n,t,dur,v=.5){ const c=AUD.ctx,g=c.createGain(); g.connect(AUD.mus); env(g,t,.01,.28*v,.2,.6,.15,t+dur); osc('sine',N2F(n),t,t+dur+.2,g); },
  bell(n,t,dur,v=.5,bus){ const c=AUD.ctx,g=c.createGain(); g.connect(bus||AUD.mus); env(g,t,.003,.12*v,1.2,.01,.3,t+.05); osc('sine',N2F(n),t,t+1.6,g); const g2=c.createGain(); g2.gain.value=.4; g2.connect(g); osc('sine',N2F(n)*3.01,t,t+1.6,g2); },
  hat(t,v=.5){ const c=AUD.ctx,s=c.createBufferSource(),hp=c.createBiquadFilter(),g=c.createGain(); s.buffer=AUD.noise; hp.type='highpass'; hp.frequency.value=7000; s.connect(hp); hp.connect(g); g.connect(AUD.mus); env(g,t,.002,.08*v,.04,.01,.02,t+.03); s.start(t); s.stop(t+.12); },
  clap(t,v=.5){ const c=AUD.ctx,s=c.createBufferSource(),bp=c.createBiquadFilter(),g=c.createGain(); s.buffer=AUD.noise; bp.type='bandpass'; bp.frequency.value=1500; s.connect(bp); bp.connect(g); g.connect(AUD.mus); env(g,t,.002,.25*v,.12,.01,.05,t+.1); s.start(t); s.stop(t+.3); },
  cowbell(n,t,v=.5){ const c=AUD.ctx,g=c.createGain(),bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=N2F(n)*1.5; bp.Q.value=2; g.connect(bp); bp.connect(AUD.mus); env(g,t,.002,.2*v,.18,.05,.1,t+.12); osc('square',N2F(n),t,t+.4,g); osc('square',N2F(n)*1.48,t,t+.4,g); },
  b808(n,t,dur,v=.5){ const c=AUD.ctx,g=c.createGain(),ws=c.createWaveShaper(),cv=new Float32Array(256); for(let i=0;i<256;i++){const x=i/128-1; cv[i]=Math.tanh(x*2.5);} ws.curve=cv; g.connect(ws); ws.connect(AUD.mus);
    env(g,t,.005,.4*v,.6,.5,.3,t+dur); const o=osc('sine',N2F(n)*2,t,t+dur+.3,g); o.frequency.exponentialRampToValueAtTime(N2F(n),t+.09); },
};
// ----- songs: written for WidR, 16 steps per bar -----
const CH={Fmaj7:['F3','A3','C4','E4'],Em7:['E3','G3','B3','D4'],Dm7:['D3','F3','A3','C4'],Cmaj7:['C3','E3','G3','B3'],
  Bb:['Bb2','D3','F3','Bb3'],Gm7:['G2','Bb2','D3','F3'],Ebmaj7:['Eb3','G3','Bb3','D4'],F:['F2','A2','C3','F3'],
  Am:['A2','C3','E3','A3'],Fadd9:['F2','C3','G3','A3'],C:['C3','E3','G3','C4'],G:['G2','B2','D3','G3'],Dm:['D3','F3','A3','D4'],A:['A2','C#3','E3','A3'],Bbmaj7:['Bb2','D3','F3','A3']};
const up=(n,o)=>n.replace(/-?\d$/,d=>+d+o);
const SONGS={
  menu:{bpm:70, bars:['Fmaj7','Em7','Dm7','Cmaj7'], play(i,t,s){ const bar=Math.floor(i/16)%4, st=i%16, ch=CH[this.bars[bar]];
    if(st===0) INST.pad(ch,t,s*16,.6); if(st===0) INST.bass(up(ch[0],-1),t,s*12,.5);
    const arp={0:0,3:1,6:2,8:3,11:2,14:1}; if(st in arp) INST.keys(up(ch[arp[st]],1),t,s*2,.5);
    const mel=[['A5',0],['G5',6],['E5',10],['F5',16],['E5',22],['C5',26],['D5',32],['F5',38],['A5',42],['G5',48],['E5',56]]; const k=i%64; mel.forEach(([n,at])=>{ if(at===k) INST.bell(n,t,s*4,.35); }); }},
  day:{bpm:100, bars:['Bb','Gm7','Ebmaj7','F'], play(i,t,s){ const bar=Math.floor(i/16)%4, st=i%16, ch=CH[this.bars[bar]];
    if(st%2===0) INST.pluck(up(ch[(st/2)%4],1+(st>=8?1:0)),t,s,.55);
    if(st===0||st===10) INST.bass(up(ch[0],0),t,s*3,.6); if(st===6) INST.bass(up(ch[2],-1),t,s*2,.4);
    if(st%4===2) INST.hat(t,.5); if(st===4||st===12) INST.hat(t,.9);
    const mel={0:'D5',4:'F5',8:'Eb5',12:'D5'}; if(bar%2===1 && mel[st]) INST.bell(mel[st],t,s*3,.3); }},
  tender:{bpm:62, bars:['Am','Fadd9','C','G'], play(i,t,s){ const bar=Math.floor(i/16)%4, st=i%16, ch=CH[this.bars[bar]];
    if(st===0) { INST.pad(ch.map(n=>up(n,1)),t,s*16,.5); INST.bass(up(ch[0],0),t,s*14,.4); }
    if(st===0||st===4||st===8||st===12) INST.keys(up(ch[[1,2,3,2][st/4]],1),t,s*4,.45);
    const mel={2:'E5',6:'C5',10:'D5',14:'B4'}; if(bar===1||bar===3) if(mel[st]) INST.keys(mel[st],t,s*4,.35); }},
  tense:{bpm:112, bars:['Dm','Dm','Bbmaj7','A'], play(i,t,s){ const bar=Math.floor(i/16)%4, st=i%16, ch=CH[this.bars[bar]];
    INST.pluck(up(ch[[0,2,1,2][st%4]],1),t,s,.5); if(st%4===0) INST.bass(up(ch[0],-1),t,s*2,.7); if(st===8) INST.clap(t,.35); if(st===0) INST.pad(ch,t,s*16,.4); }},
  phonk:{bpm:132, bars:['Dm','Dm','Bbmaj7','A'], play(i,t,s){ const bar=Math.floor(i/16)%4, st=i%16;
    const bl=['D2','D2','Bb1','A1'][bar]; if(st===0||st===7||st===10) INST.b808(bl,t,s*(st===0?6:3),.8);
    if(st===4||st===12) INST.clap(t,.7); INST.hat(t,st%4===2?.9:.35);
    const cb=['D5','F5','A5','C6','A5','F5','D5','E5'][Math.floor(st/2)]; if(st%2===0 && (st!==6)) INST.cowbell(cb,t,.5); }},
  festival:{bpm:116, bars:['C','G','Am','F'], play(i,t,s){ const bar=Math.floor(i/16)%4, st=i%16, ch=CH[this.bars[bar]];
    if(st%2===0) INST.pluck(up(ch[[0,1,2,3,2,1,0,1][st/2]],1),t,s,.6); if(st%4===0) INST.bass(up(ch[0],0),t,s*2,.6); if(st%2===1) INST.hat(t,.6); if(st===4||st===12) INST.clap(t,.4);
    const mel={0:'E5',3:'G5',6:'C6',8:'B5',11:'G5',14:'A5'}; if(mel[st]) INST.bell(mel[st],t,s*2,.35); }},
};
function schedule(){ if(!AUD.ctx||!AUD.song) return; const s=60/AUD.song.bpm/4, now=AUD.ctx.currentTime;
  if(AUD.next<now) AUD.next=now+.05;
  while(AUD.next<now+.3){ try{ AUD.song.play(AUD.stepN,AUD.next,s); }catch(e){} AUD.stepN++; AUD.next+=s; } }
function playMood(m,force){
  AUD.want=m; if(!AUD.ctx) return; if(AUD.mood===m && !force) return;
  const g=AUD.mus.gain, now=AUD.ctx.currentTime; g.cancelScheduledValues(now); g.setTargetAtTime(.0001,now,.15);
  setTimeout(()=>{ AUD.mood=m; AUD.song=SONGS[m]||null; AUD.stepN=0; AUD.next=AUD.ctx.currentTime+.05; g.setTargetAtTime(SET.music*0.5,AUD.ctx.currentTime,.4); },450);
}
function moodForBg(bg,cast){
  const ids=(cast||[]).map(c=>c[0]);
  if(bg==='rooftop' && ids.includes('milo')) return 'phonk';
  return {night:'tender',rain:'tender',sunset:'tender',party:'festival',ice:'festival',black:'tender'}[bg]||'day';
}
// ----- sound effects -----
let lastBlip=0;
const SFX={
  blip(pitch){ if(!AUD.ctx) return; const t=AUD.ctx.currentTime; if(t-lastBlip<.055) return; lastBlip=t; const g=AUD.ctx.createGain(); g.connect(AUD.sfx); env(g,t,.003,.05,.03,.01,.02,t+.02); osc('triangle',pitch*(0.97+Math.random()*.06),t,t+.08,g); },
  click(){ if(!AUD.ctx) return; const t=AUD.ctx.currentTime; INST.bell('A5',t,.1,.6,AUD.sfx); INST.bell('E6',t+.05,.1,.4,AUD.sfx); },
  poof(){ if(!AUD.ctx) return; const c=AUD.ctx,t=c.currentTime,s=c.createBufferSource(),lp=c.createBiquadFilter(),g=c.createGain(); s.buffer=AUD.noise; lp.type='lowpass'; lp.frequency.setValueAtTime(6000,t); lp.frequency.exponentialRampToValueAtTime(300,t+.5); s.connect(lp); lp.connect(g); g.connect(AUD.sfx); env(g,t,.01,.5,.4,.01,.1,t+.4); s.start(t); s.stop(t+.7); },
  sparkle(){ if(!AUD.ctx) return; const t=AUD.ctx.currentTime; ['C6','E6','G6','B6','D7'].forEach((n,i)=>INST.bell(n,t+i*.06,.2,.5,AUD.sfx)); },
  rankup(){ if(!AUD.ctx) return; const t=AUD.ctx.currentTime; ['C5','E5','G5','C6','E6'].forEach((n,i)=>INST.keys(n,t+i*.09,.3,.9,AUD.sfx)); },
  cash(){ if(!AUD.ctx) return; const t=AUD.ctx.currentTime; INST.bell('B5',t,.2,.8,AUD.sfx); INST.bell('E6',t+.1,.4,.8,AUD.sfx); },
  buzz(){ if(!AUD.ctx) return; const t=AUD.ctx.currentTime; [0,.18].forEach(d=>{ const g=AUD.ctx.createGain(); g.connect(AUD.sfx); env(g,t+d,.005,.12,.1,.6,.03,t+d+.12); osc('square',170,t+d,t+d+.2,g); }); },
  thud(){ if(!AUD.ctx) return; const t=AUD.ctx.currentTime; INST.b808('A1',t,.2,.9); },
  whoosh(){ if(!AUD.ctx) return; const c=AUD.ctx,t=c.currentTime,s=c.createBufferSource(),bp=c.createBiquadFilter(),g=c.createGain(); s.buffer=AUD.noise; bp.type='bandpass'; bp.Q.value=.8; bp.frequency.setValueAtTime(400,t); bp.frequency.exponentialRampToValueAtTime(2400,t+.35); s.connect(bp); bp.connect(g); g.connect(AUD.sfx); env(g,t,.12,.12,.2,.01,.1,t+.3); s.start(t); s.stop(t+.6); },
  siren(){ if(!AUD.ctx) return; const c=AUD.ctx,t=c.currentTime,g=c.createGain(); g.connect(AUD.sfx); env(g,t,.05,.07,.1,1,.3,t+2.2); const o=osc('triangle',600,t,t+2.5,g); for(let i=0;i<5;i++){ o.frequency.linearRampToValueAtTime(900,t+i*.5+.25); o.frequency.linearRampToValueAtTime(600,t+i*.5+.5);} },
};
const VOICE_PITCH={natan:420,lars:560,adam:470,fionn:330,milo:300,mada:620,gian:700,goon:520,daniel:380,josh:500,reshman:280,officer:260,P:480};
