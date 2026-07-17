/* ============================================================
   WIDR VALLEY — audio.js
   All sound is generated with the Web Audio API so the game stays
   a single self-contained repo (no binary asset downloads needed).
   Simple procedural music loops per area + one-shot SFX.
   ============================================================ */

const AudioMgr = {
  ctx: null,
  muted: false,
  musicNode: null,
  musicTimer: null,
  currentTrack: null,

  init(){
    if(this.ctx) return;
    try { this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }
    catch(e){ this.ctx = null; }
  },

  // resume on first user gesture (browsers require this)
  resume(){ if(this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },

  tone(freq, dur, type="sine", vol=0.15){
    if(!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  },

  // ---------- SFX ----------
  sfx(name){
    if(this.muted) return;
    switch(name){
      case "till":    this.tone(120, 0.12, "square", 0.12); break;
      case "water":   this.tone(300, 0.18, "sine", 0.1); break;
      case "plant":   this.tone(520, 0.1, "triangle", 0.12); break;
      case "harvest": this.tone(660,0.1,"square",0.14); this.tone(880,0.12,"square",0.1); break;
      case "chop":    this.tone(90, 0.14, "sawtooth", 0.15); break;
      case "mine":    this.tone(140,0.12,"square",0.14); break;
      case "hit":     this.tone(200,0.08,"sawtooth",0.18); break;
      case "coin":    this.tone(880,0.08,"square",0.12); this.tone(1180,0.1,"square",0.1); break;
      case "fish":    this.tone(400,0.15,"sine",0.12); this.tone(600,0.15,"sine",0.1); break;
      case "levelup": [523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.tone(f,0.2,"triangle",0.14),i*90)); break;
      case "quest":   [659,784,988].forEach((f,i)=>setTimeout(()=>this.tone(f,0.18,"square",0.13),i*80)); break;
      case "talk":    this.tone(440,0.05,"square",0.08); break;
      case "error":   this.tone(120,0.2,"sawtooth",0.14); break;
      case "sleep":   [392,330,262].forEach((f,i)=>setTimeout(()=>this.tone(f,0.4,"sine",0.12),i*160)); break;
    }
  },

  // ---------- Ambient music loops ----------
  // Each track = array of [freq, beats] played on a soft triangle.
  TRACKS: {
    farm:    [[262,1],[330,1],[392,1],[330,1],[294,1],[349,1],[440,1],[349,1]],
    village: [[349,1],[440,1],[523,1],[440,1],[392,1],[494,1],[587,1],[494,1]],
    forest:  [[220,2],[262,2],[196,2],[247,2]],
    beach:   [[294,2],[349,2],[392,2],[330,2]],
    mines:   [[131,2],[165,2],[147,2],[110,2]],
    river:   [[330,2],[392,1],[440,1],[349,2],[294,2]],
    market:  [[392,1],[494,1],[440,1],[523,1],[587,1],[494,1]],
    college: [[262,1],[294,1],[330,1],[349,1],[392,1],[349,1],[330,1],[294,1]],
    cave:    [[98,2],[110,2],[123,2],[110,2]],
    castle:  [[196,2],[262,2],[294,2],[233,2],[311,2]],
    festival:[[523,1],[587,1],[659,1],[587,1],[523,1],[440,1],[494,1],[523,1]],
    volcano: [[110,1],[147,1],[131,1],[98,1],[123,1],[87,1]],
    ruins:   [[147,2],[165,2],[131,2],[110,2],[98,2]],
  },

  playMusic(track){
    if(this.currentTrack === track) return;
    this.currentTrack = track;
    this.stopMusic();
    if(this.muted || !this.ctx) return;
    const seq = this.TRACKS[track] || this.TRACKS.farm;
    let i = 0;
    const beat = 420; // ms
    const step = ()=>{
      if(this.muted){ return; }
      const [f, b] = seq[i % seq.length];
      this.tone(f, (b*beat/1000)*0.9, "triangle", 0.05);
      // occasional harmony
      if(i%4===0) this.tone(f/2, (b*beat/1000)*0.9, "sine", 0.03);
      i++;
      this.musicTimer = setTimeout(step, b*beat);
    };
    step();
  },

  stopMusic(){ if(this.musicTimer){ clearTimeout(this.musicTimer); this.musicTimer=null; } },

  toggleMute(){
    this.muted = !this.muted;
    if(this.muted) this.stopMusic();
    else if(this.currentTrack){ const t=this.currentTrack; this.currentTrack=null; this.playMusic(t); }
    return this.muted;
  },
};

window.AudioMgr = AudioMgr;
