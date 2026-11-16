// ==========================================================
// soundEngine.js — fully procedural Web Audio synth
// vacuum hum, footsteps, ghost shrieks, chimes, creaky doors,
// fireplace crackle, spooky ambience, and the hummed waltz (music.js).
// ==========================================================
import { CONFIG } from '../config.js';
import { WaltzDirector } from './music.js';

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ready = false;
    this.fireLevel = 0;
    this.tension = 0;
    this.waltz = null;
    this.musicMood = 'off';
    this.heroVoice = 'nathan';
    this.crackleTimer = 0;
    this.vacuum = null;
    this.tug = null;
    this.tickTimer = 0;
    this.unlockAttached = false;
  }

  init() {
    if (this.ctx) {
      this.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : CONFIG.audio.masterVolume;
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.ratio.value = 5;
    this.master.connect(this.compressor).connect(ctx.destination);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = CONFIG.audio.sfxVolume;
    this.sfx.connect(this.master);

    this.music = ctx.createGain();
    this.music.gain.value = CONFIG.audio.musicVolume;
    this.music.connect(this.master);

    // Shared reverb-ish echo for spooky tails
    this.echo = ctx.createDelay(1.0);
    this.echo.delayTime.value = 0.28;
    this.echoFb = ctx.createGain();
    this.echoFb.gain.value = 0.35;
    this.echoFilter = ctx.createBiquadFilter();
    this.echoFilter.type = 'lowpass';
    this.echoFilter.frequency.value = 2200;
    this.echo.connect(this.echoFilter).connect(this.echoFb).connect(this.echo);
    this.echoOut = ctx.createGain();
    this.echoOut.gain.value = 0.4;
    this.echoFilter.connect(this.echoOut).connect(this.master);

    // White noise buffer (2s)
    const len = ctx.sampleRate * 2;
    this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.buildVacuum();
    this.buildSpray();
    this.buildAmbience();
    this.waltz = new WaltzDirector(this);
    this.waltz.setHero(this.heroVoice);
    this.waltz.setMood(this.musicMood);
    this.ready = true;
    this.setMono(!!this.mono);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(m ? 0 : CONFIG.audio.masterVolume, t, 0.05);
  }

  // Options → Sound: Stereo / Mono (downmix at the output)
  setMono(m) {
    this.mono = m;
    if (!this.ctx) return;
    try {
      const dest = this.ctx.destination;
      dest.channelCount = m ? 1 : Math.min(2, dest.maxChannelCount || 2);
      dest.channelInterpretation = 'speakers';
    } catch (e) {
      /* some browsers lock the destination channel count */
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ---------------------------------------------------------------
  // helpers
  noiseSource() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    src.loopStart = Math.random();
    return src;
  }

  envGain(t, attack, peak, decay, dest = this.sfx) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(dest);
    return g;
  }

  tone(freq, type, t, dur, peak = 0.3, dest = this.sfx, attack = 0.005) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = this.envGain(t, attack, peak, dur, dest);
    o.connect(g);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
    return o;
  }

  // ---------------------------------------------------------------
  // Poltergust vacuum: continuous hum + filtered noise
  buildVacuum() {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.sfx);

    const noise = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 0.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.55;
    noise.connect(bp).connect(noiseGain).connect(out);

    const motor = ctx.createOscillator();
    motor.type = 'sawtooth';
    motor.frequency.value = 92;
    const motorLp = ctx.createBiquadFilter();
    motorLp.type = 'lowpass';
    motorLp.frequency.value = 420;
    const motorGain = ctx.createGain();
    motorGain.gain.value = 0.22;
    motor.connect(motorLp).connect(motorGain).connect(out);

    const whine = ctx.createOscillator();
    whine.type = 'triangle';
    whine.frequency.value = 760;
    const whineGain = ctx.createGain();
    whineGain.gain.value = 0.05;
    whine.connect(whineGain).connect(out);

    // wobble LFO for the tug-of-war struggle
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 7;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0;
    lfo.connect(lfoGain).connect(motor.frequency);
    // a second LFO path makes the suction filter wobble during the struggle
    const filterWobble = ctx.createGain();
    filterWobble.gain.value = 0;
    lfo.connect(filterWobble).connect(bp.frequency);
    lfo.connect(filterWobble).connect(whine.frequency);

    noise.start();
    motor.start();
    whine.start();
    lfo.start();
    this.vacuum = { out, bp, motor, whine, lfo, lfoGain, filterWobble, level: 0 };
  }

  setVacuum(active, intensity = 1, latched = false) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const v = this.vacuum;
    const target = active ? 0.32 * (0.6 + 0.4 * intensity) : 0;
    v.out.gain.setTargetAtTime(target, t, active ? 0.06 : 0.12);
    v.motor.frequency.setTargetAtTime(active ? 92 + 70 * intensity + (latched ? 25 : 0) : 60, t, 0.15);
    v.whine.frequency.setTargetAtTime(active ? 700 + 600 * intensity : 400, t, 0.2);
    v.bp.frequency.setTargetAtTime(active ? 700 + 1600 * intensity + (latched ? 900 : 0) : 500, t, 0.15);
    v.lfoGain.gain.setTargetAtTime(latched ? 22 : 0, t, 0.1);
    v.filterWobble.gain.setTargetAtTime(latched ? 520 : 0, t, 0.1);
    v.lfo.frequency.setTargetAtTime(latched ? 6 + intensity * 5 : 7, t, 0.2);
  }

  // ---------------------------------------------------------------
  // Wooden floorboard step. volume already includes the hero's noise stat
  // (Reshman ≈ 0.4); speed01 brightens and strengthens faster steps.
  footstep(volume = 1, wood = true, speed01 = 0.7) {
    if (!this.ready || volume <= 0.01) return;
    const t = this.ctx.currentTime;
    const spd = Math.max(0.2, Math.min(1, speed01));
    const vol = volume * (0.55 + 0.45 * spd);
    // heel thump
    const thump = this.ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(110 + spd * 40, t);
    thump.frequency.exponentialRampToValueAtTime(55, t + 0.07);
    const tg = this.envGain(t, 0.003, 0.16 * vol, 0.07);
    thump.connect(tg);
    thump.start(t);
    thump.stop(t + 0.12);
    // board scuff
    const n = this.noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = wood ? 500 + spd * 500 + Math.random() * 250 : 1400;
    const g = this.envGain(t, 0.004, 0.2 * vol, 0.06 + 0.04 * (1 - spd));
    n.connect(lp).connect(g);
    n.start(t);
    n.stop(t + 0.15);
    if (wood && Math.random() < 0.12 + 0.12 * spd) {
      // creaky floorboard
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(180 + Math.random() * 80, t);
      o.frequency.linearRampToValueAtTime(120 + Math.random() * 60, t + 0.25);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      bp.Q.value = 6;
      const g2 = this.envGain(t, 0.03, 0.05 * volume, 0.25);
      o.connect(bp).connect(g2);
      o.start(t);
      o.stop(t + 0.35);
    }
  }

  shriek(pitch = 1) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(500 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(1300 * pitch, t + 0.18);
    o.frequency.exponentialRampToValueAtTime(380 * pitch, t + 0.7);
    const vib = this.ctx.createOscillator();
    vib.frequency.value = 11;
    const vibG = this.ctx.createGain();
    vibG.gain.value = 40 * pitch;
    vib.connect(vibG).connect(o.frequency);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400 * pitch;
    bp.Q.value = 2;
    const g = this.envGain(t, 0.05, 0.16, 0.7);
    o.connect(bp).connect(g);
    g.connect(this.echo);
    o.start(t);
    vib.start(t);
    o.stop(t + 0.9);
    vib.stop(t + 0.9);
  }

  giggle() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const st = t + i * 0.09;
      const o = this.tone(900 + Math.random() * 300 - i * 60, 'square', st, 0.06, 0.05);
      o.frequency.exponentialRampToValueAtTime(600, st + 0.06);
    }
  }

  // Boo cackle: a wobbly, falling "heh-heh-heh-hoo"
  booLaugh() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const st = t + i * 0.11;
      const f = 620 - i * 55 + Math.random() * 40;
      const o = this.tone(f, 'triangle', st, i === 4 ? 0.28 : 0.08, 0.08, this.sfx, 0.01);
      o.frequency.exponentialRampToValueAtTime(f * (i === 4 ? 0.6 : 0.82), st + (i === 4 ? 0.28 : 0.08));
      this.tone(f * 2, 'sine', st, 0.06, 0.02, this.echo);
    }
  }

  // Game Boy Horror proximity beep: higher and brighter as a Boo gets closer
  radarBeep(closeness = 0) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const f = 880 + closeness * 660;
    this.tone(f, 'square', t, 0.05, 0.035 + closeness * 0.03, this.sfx, 0.002);
  }

  // Professor Patchnotes: a burst of keyboard clacks
  typing() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const st = t + i * 0.06 + Math.random() * 0.03;
      const n = this.noiseSource();
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.value = 2500 + Math.random() * 1500;
      const g = this.envGain(st, 0.001, 0.06, 0.025);
      n.connect(hp).connect(g);
      n.start(st);
      n.stop(st + 0.05);
    }
  }

  // ...and the happy "compiling" progress beeps (his tell)
  compile() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [76, 79, 83, 88].forEach((m, i) => this.tone(midiToHz(m), 'square', t + i * 0.12, 0.08, 0.05));
  }

  // failed build: a sour buzz (a fake tell — keep the light off)
  buildFail() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [0, 0.22].forEach((d) => {
      const o = this.tone(150, 'sawtooth', t + d, 0.18, 0.08);
      o.frequency.linearRampToValueAtTime(110, t + d + 0.18);
    });
  }

  // Pixel Pip's handheld: little chiptune bleeps
  chiptune() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const scale = [72, 74, 76, 79, 81, 84];
    for (let i = 0; i < 3; i++) this.tone(midiToHz(scale[Math.floor(Math.random() * scale.length)]), 'square', t + i * 0.08, 0.06, 0.03);
  }

  // ...and "fffft!" — blowing into the cartridge when the game crashes (his tell)
  blow() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const n = this.noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.linearRampToValueAtTime(1600, t + 0.5);
    bp.Q.value = 0.9;
    const g = this.envGain(t, 0.05, 0.16, 0.55);
    n.connect(bp).connect(g);
    n.start(t);
    n.stop(t + 0.7);
  }

  // a key pops out of a chest / gets picked up
  keyJingle() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [88, 91, 96, 91, 96, 100].forEach((m, i) => {
      this.tone(midiToHz(m), 'triangle', t + i * 0.06, 0.12, 0.06);
      this.tone(midiToHz(m + 12), 'sine', t + i * 0.06, 0.2, 0.025, this.echo);
    });
  }

  // ---------------------------------------------------------------
  // Elemental Medals: one looping noise voice, re-filtered per element
  buildSpray() {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.sfx);
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.Q.value = 0.8;
    const n = this.noiseSource();
    n.connect(filt).connect(out);
    n.start();
    // slow wobble: fire roars, water gurgles, ice crackles
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0;
    lfo.connect(lfoGain).connect(filt.frequency);
    lfo.start();
    this.spray = { out, filt, lfo, lfoGain, type: null };
  }

  setSpray(type) {
    if (!this.ready) return;
    const s = this.spray;
    const t = this.ctx.currentTime;
    if (type === s.type) return;
    s.type = type;
    if (!type) {
      s.out.gain.setTargetAtTime(0, t, 0.08);
      return;
    }
    const cfg = {
      fire: { f: 520, q: 0.7, lfo: 9, depth: 260, vol: 0.34 },
      water: { f: 2400, q: 1.6, lfo: 13, depth: 900, vol: 0.2 },
      ice: { f: 6200, q: 2.2, lfo: 23, depth: 2200, vol: 0.13 },
    }[type];
    s.filt.frequency.setTargetAtTime(cfg.f, t, 0.03);
    s.filt.Q.setTargetAtTime(cfg.q, t, 0.03);
    s.lfo.frequency.setTargetAtTime(cfg.lfo, t, 0.03);
    s.lfoGain.gain.setTargetAtTime(cfg.depth, t, 0.03);
    s.out.gain.setTargetAtTime(cfg.vol, t, 0.04);
  }

  // the Poltergust gulps up an element (rising slurp + a tell-tale tone)
  elementAbsorb(type = 'fire') {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const n = this.noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.35);
    n.connect(bp).connect(this.envGain(t, 0.02, 0.3, 0.4));
    n.start(t);
    n.stop(t + 0.5);
    const notes = { fire: [62, 69, 74], water: [65, 72, 77], ice: [76, 83, 88] }[type];
    notes.forEach((m, i) => this.tone(midiToHz(m), type === 'ice' ? 'sine' : 'triangle', t + 0.2 + i * 0.07, 0.25, 0.07, this.echo));
  }

  // a wick catches: soft "fwump" and a warm two-note glow
  candleLight() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const n = this.noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, t);
    lp.frequency.exponentialRampToValueAtTime(240, t + 0.3);
    n.connect(lp).connect(this.envGain(t, 0.01, 0.35, 0.32));
    n.start(t);
    n.stop(t + 0.4);
    this.tone(midiToHz(81), 'sine', t + 0.08, 0.5, 0.06, this.echo);
    this.tone(midiToHz(88), 'sine', t + 0.16, 0.6, 0.04, this.echo);
  }

  // the wrong element splashes off a ghost (or fizzles out)
  sizzle() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const n = this.noiseSource();
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;
    n.connect(hp).connect(this.envGain(t, 0.005, 0.22, 0.45));
    n.start(t);
    n.stop(t + 0.5);
  }

  // crisp mechanical switch click (on = higher, off = lower & duller)
  flashClick(on = true) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const st = t + i * 0.018;
      const n = this.noiseSource();
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = (on ? 4200 : 2600) - i * 900;
      bp.Q.value = 7;
      const g = this.envGain(st, 0.001, i === 0 ? 0.32 : 0.18, 0.018);
      n.connect(bp).connect(g);
      n.start(st);
      n.stop(st + 0.04);
    }
    this.tone(on ? 1900 : 1200, 'square', t, 0.012, 0.04);
  }

  // dramatic Strobulb burst: click, capacitor whine, bright chime
  flash() {
    if (!this.ready) return;
    this.flashClick(true);
    const t = this.ctx.currentTime + 0.02;
    const whine = this.ctx.createOscillator();
    whine.type = 'sawtooth';
    whine.frequency.setValueAtTime(900, t);
    whine.frequency.exponentialRampToValueAtTime(5200, t + 0.09);
    const wlp = this.ctx.createBiquadFilter();
    wlp.type = 'lowpass';
    wlp.frequency.value = 6000;
    const wg = this.envGain(t, 0.004, 0.06, 0.09);
    whine.connect(wlp).connect(wg);
    whine.start(t);
    whine.stop(t + 0.12);
    const pop = this.noiseSource();
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3000;
    const pg = this.envGain(t + 0.08, 0.002, 0.2, 0.14);
    pop.connect(hp).connect(pg);
    pop.start(t + 0.08);
    pop.stop(t + 0.3);
    // shimmering high chime with echo tail
    [96, 103, 108].forEach((m, i) => {
      this.tone(midiToHz(m), 'triangle', t + 0.08 + i * 0.03, 0.35, 0.07);
      this.tone(midiToHz(m), 'sine', t + 0.08 + i * 0.03, 0.5, 0.04, this.echo);
    });
  }

  // ghost stunned: rising sparkle + a startled ghost shriek
  stun() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [72, 76, 79, 84, 88].forEach((m, i) => this.tone(midiToHz(m), 'triangle', t + i * 0.04, 0.18, 0.12));
    this.shriek(1.5);
  }

  // eerie roaming ghost warble: detuned sines with slow vibrato
  warble(pitch = 1) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const dur = 1.2 + Math.random() * 0.6;
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.07, t + 0.3);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(this.sfx);
    out.connect(this.echo);
    const base = (330 + Math.random() * 120) * pitch;
    [0, 7].forEach((cents) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * 1.35, t + dur * 0.45);
      o.frequency.linearRampToValueAtTime(base * 0.8, t + dur);
      o.detune.value = cents;
      const vib = this.ctx.createOscillator();
      vib.frequency.value = 5.5 + Math.random() * 2;
      const vg = this.ctx.createGain();
      vg.gain.value = base * 0.04;
      vib.connect(vg).connect(o.frequency);
      o.connect(out);
      o.start(t);
      vib.start(t);
      o.stop(t + dur + 0.05);
      vib.stop(t + dur + 0.05);
    });
  }

  // heart-drain tick during tug-of-war; pitch climbs as the heart empties
  heartTick(hpFrac = 1) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const f = 520 + (1 - hpFrac) * 700;
    this.tone(f, 'square', t, 0.03, 0.06);
    this.tone(f * 0.5, 'triangle', t + 0.07, 0.04, 0.05);
  }

  // drive the rhythmic ticks from the game loop
  setTug(active, hpFrac = 1, opposition = 0) {
    this.tug = active ? { hpFrac, opposition } : null;
  }

  // results jingle, longer and brighter for better ranks
  rankFanfare(rank = 'C') {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const tier = Math.max(0, 'CBAS'.indexOf(rank)) * 2 + (rank === 'S' ? 1 : 0); // C=0, B=2, A=4, S=7
    const base = [60, 64, 67, 72];
    const extra = [76, 79, 84, 88];
    const mel = base.concat(extra.slice(0, Math.max(0, Math.floor(tier / 2))));
    mel.forEach((m, i) => {
      this.tone(midiToHz(m), 'square', t + i * 0.12, 0.14, 0.07);
      this.tone(midiToHz(m - 12), 'triangle', t + i * 0.12, 0.16, 0.08);
    });
    const end = t + mel.length * 0.12;
    const chord = tier >= 6 ? [72, 76, 79, 84] : tier >= 3 ? [67, 72, 76] : [60, 63, 67];
    chord.forEach((m) => {
      this.tone(midiToHz(m), 'square', end, 0.7, 0.05);
      this.tone(midiToHz(m), 'sine', end, 1.0, 0.04, this.echo);
    });
    if (tier >= 7) [96, 100, 103, 108].forEach((m, i) => this.tone(midiToHz(m), 'triangle', end + 0.2 + i * 0.06, 0.2, 0.05));
  }

  // unlock the AudioContext on the very first user gesture (autoplay-safe)
  attachUnlock() {
    if (this.unlockAttached) return;
    this.unlockAttached = true;
    const unlock = () => {
      this.init();
      this.resume();
      if (this.ctx && this.ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
        window.removeEventListener('touchstart', unlock, true);
      }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    window.addEventListener('touchstart', unlock, true);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.resume();
    });
  }

  chime(kind = 'coin') {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const seqs = {
      coin: [88, 93],
      bill: [81, 85, 88],
      pearl: [84, 88, 91, 96],
      gem: [84, 91, 96, 100, 103],
    };
    const seq = seqs[kind] || seqs.coin;
    seq.forEach((m, i) => {
      const g = this.tone(midiToHz(m), 'square', t + i * 0.055, 0.12, 0.07);
      this.tone(midiToHz(m + 12), 'sine', t + i * 0.055, 0.2, 0.04, this.echo);
      return g;
    });
  }

  // multi-catch fanfare: climbs higher for every extra ghost in one pull
  combo(n = 2) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const base = 76 + (n - 2) * 5;
    [0, 4, 7, 12, 16].slice(0, 3 + n).forEach((step, i) => {
      this.tone(midiToHz(base + step), 'square', t + i * 0.07, 0.16, 0.08);
      this.tone(midiToHz(base + step + 12), 'triangle', t + i * 0.07, 0.3, 0.05, this.echo);
    });
  }

  creak() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(140, t);
    for (let i = 1; i <= 8; i++) {
      o.frequency.linearRampToValueAtTime(110 + Math.random() * 90, t + i * 0.11);
    }
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100;
    bp.Q.value = 9;
    const g = this.envGain(t, 0.08, 0.22, 0.9);
    o.connect(bp).connect(g);
    g.connect(this.echo);
    o.start(t);
    o.stop(t + 1.1);
    // latch clunk
    const n = this.noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    const g2 = this.envGain(t, 0.003, 0.4, 0.12);
    n.connect(lp).connect(g2);
    n.start(t);
    n.stop(t + 0.2);
  }

  locked() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const n = this.noiseSource();
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 500;
      bp.Q.value = 3;
      const g = this.envGain(t + i * 0.09, 0.003, 0.3, 0.06);
      n.connect(bp).connect(g);
      n.start(t + i * 0.09);
      n.stop(t + i * 0.09 + 0.1);
    }
    this.tone(110, 'square', t, 0.25, 0.08);
  }

  unlock() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [67, 71, 74, 79].forEach((m, i) => this.tone(midiToHz(m), 'triangle', t + i * 0.08, 0.25, 0.14));
  }

  capture(big = false) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    // slurp
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(1800, t + 0.35);
    const g = this.envGain(t, 0.01, 0.15, 0.35);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.4);
    // fanfare
    const notes = big ? [72, 76, 79, 84, 79, 84, 88, 91] : [72, 76, 79, 84];
    notes.forEach((m, i) => {
      this.tone(midiToHz(m), 'square', t + 0.38 + i * 0.1, 0.16, 0.09);
      this.tone(midiToHz(m - 12), 'triangle', t + 0.38 + i * 0.1, 0.18, 0.1);
    });
  }

  hurt() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.3);
    const g = this.envGain(t, 0.004, 0.2, 0.32);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.4);
  }

  bossRoar() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let k = 0; k < 2; k++) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(70 + k * 7, t);
      o.frequency.linearRampToValueAtTime(140 + k * 9, t + 0.4);
      o.frequency.linearRampToValueAtTime(55, t + 1.3);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      const g = this.envGain(t, 0.1, 0.3, 1.2);
      o.connect(lp).connect(g);
      g.connect(this.echo);
      o.start(t);
      o.stop(t + 1.5);
    }
    const n = this.noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 400;
    const g2 = this.envGain(t, 0.1, 0.2, 1.0);
    n.connect(bp).connect(g2);
    n.start(t);
    n.stop(t + 1.3);
  }

  // Lord Snoozewell: a breathy snore (deep = the rumbling "tell")
  snore(deep = false) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const dur = deep ? 0.9 : 0.6;
    const n = this.noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(deep ? 260 : 420, t);
    lp.frequency.linearRampToValueAtTime(deep ? 160 : 300, t + dur);
    const g = this.envGain(t, dur * 0.4, deep ? 0.32 : 0.14, dur * 0.6);
    n.connect(lp).connect(g);
    n.start(t);
    n.stop(t + dur + 0.1);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(deep ? 55 : 80, t);
    o.frequency.linearRampToValueAtTime(deep ? 45 : 70, t + dur);
    const og = this.envGain(t, dur * 0.4, deep ? 0.08 : 0.03, dur * 0.6);
    const olp = this.ctx.createBiquadFilter();
    olp.type = 'lowpass';
    olp.frequency.value = 300;
    o.connect(olp).connect(og);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  // Madame Sonata: a haunting minor-key piano note
  pianoNote() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const scale = [57, 60, 62, 64, 65, 68, 69, 72];
    const midi = scale[Math.floor(Math.random() * scale.length)];
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    this.tone(f, 'triangle', t, 1.1, 0.12, this.sfx, 0.004);
    this.tone(f * 2, 'sine', t, 0.6, 0.04, this.sfx, 0.004);
  }

  chomp() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const n = this.noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const g = this.envGain(t, 0.005, 0.25, 0.09);
    n.connect(lp).connect(g);
    n.start(t);
    n.stop(t + 0.15);
    this.tone(90 + Math.random() * 30, 'sine', t, 0.1, 0.2);
  }

  plateThrow() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const n = this.noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(600, t);
    bp.frequency.exponentialRampToValueAtTime(2500, t + 0.3);
    bp.Q.value = 4;
    const g = this.envGain(t, 0.05, 0.15, 0.25);
    n.connect(bp).connect(g);
    n.start(t);
    n.stop(t + 0.4);
  }

  plateCrash() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const n = this.noiseSource();
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const g = this.envGain(t, 0.002, 0.28, 0.3);
    n.connect(hp).connect(g);
    n.start(t);
    n.stop(t + 0.4);
    [2900, 3700, 4400].forEach((f) => this.tone(f, 'sine', t, 0.25, 0.04));
  }

  thud() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.2);
    const g = this.envGain(t, 0.003, 0.4, 0.22);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.3);
  }

  rattle() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const n = this.noiseSource();
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 700 + Math.random() * 500;
      bp.Q.value = 5;
      const g = this.envGain(t + i * 0.06, 0.002, 0.12, 0.05);
      n.connect(bp).connect(g);
      n.start(t + i * 0.06);
      n.stop(t + i * 0.06 + 0.08);
    }
  }

  chestOpen() {
    if (!this.ready) return;
    this.creak();
    const t = this.ctx.currentTime + 0.35;
    [79, 83, 86, 91, 95].forEach((m, i) => this.tone(midiToHz(m), 'triangle', t + i * 0.07, 0.3, 0.1));
  }

  zap() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const n = this.noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3000 + Math.random() * 2000;
    bp.Q.value = 1.5;
    const g = this.envGain(t, 0.001, 0.08, 0.05);
    n.connect(bp).connect(g);
    n.start(t);
    n.stop(t + 0.08);
  }

  explosionPop() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const n = this.noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.5);
    const g = this.envGain(t, 0.002, 0.45, 0.5);
    n.connect(lp).connect(g);
    n.start(t);
    n.stop(t + 0.6);
  }

  blip() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.tone(880, 'square', t, 0.05, 0.06);
  }

  // cutscene dialogue: a soft syllable blip, pitched per speaker
  talk(pitch = 1, radio = false) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const f = (radio ? 520 : 330) * pitch * (0.92 + Math.random() * 0.16);
    this.tone(f, radio ? 'square' : 'triangle', t, 0.045, radio ? 0.025 : 0.04);
  }

  // distant thunder: a sharp crack, then a long low rumble
  thunder() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const crack = this.noiseSource();
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    crack.connect(hp).connect(this.envGain(t, 0.005, 0.18, 0.35));
    crack.start(t);
    crack.stop(t + 0.4);
    const rumble = this.noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(320, t);
    lp.frequency.exponentialRampToValueAtTime(70, t + 3.2);
    rumble.connect(lp).connect(this.envGain(t + 0.05, 0.25, 0.55, 3.2));
    rumble.start(t);
    rumble.stop(t + 3.6);
  }

  // Game Boy Horror call coming in: static burst + two-tone ring
  radio() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const n = this.noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 1.2;
    n.connect(bp).connect(this.envGain(t, 0.01, 0.16, 0.5));
    n.start(t);
    n.stop(t + 0.6);
    [0, 0.16, 0.32].forEach((d, i) => this.tone(i % 2 ? 988 : 1319, 'square', t + 0.1 + d, 0.09, 0.05));
  }

  confirm() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [76, 83, 88].forEach((m, i) => this.tone(midiToHz(m), 'square', t + i * 0.07, 0.12, 0.08));
  }

  pauseSound() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [84, 79, 84].forEach((m, i) => this.tone(midiToHz(m), 'square', t + i * 0.08, 0.08, 0.06));
  }

  victory() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const mel = [72, 72, 79, 79, 81, 81, 79, 77, 77, 76, 76, 74, 74, 72];
    mel.forEach((m, i) => {
      this.tone(midiToHz(m), 'square', t + i * 0.16, 0.16, 0.07);
      this.tone(midiToHz(m - 24), 'triangle', t + i * 0.16, 0.16, 0.08);
    });
  }

  // ---------------------------------------------------------------
  // Ambience: low drone + wind + fire crackle (the melody lives in music.js)
  buildAmbience() {
    const ctx = this.ctx;
    this.drone = ctx.createGain();
    this.drone.gain.value = 0.0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    this.droneLp = lp;
    this.drone.connect(lp).connect(this.music);
    [38, 38.08, 45].forEach((m) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midiToHz(m);
      const g = ctx.createGain();
      g.gain.value = 0.14;
      o.connect(g).connect(this.drone);
      o.start();
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 160;
    lfo.connect(lfoG).connect(lp.frequency);
    lfo.start();

    // wind
    const wind = this.noiseSource();
    const wbp = ctx.createBiquadFilter();
    wbp.type = 'bandpass';
    wbp.frequency.value = 500;
    wbp.Q.value = 0.6;
    const wg = ctx.createGain();
    wg.gain.value = 0.04;
    const wlfo = ctx.createOscillator();
    wlfo.frequency.value = 0.13;
    const wlfoG = ctx.createGain();
    wlfoG.gain.value = 260;
    wlfo.connect(wlfoG).connect(wbp.frequency);
    wind.connect(wbp).connect(wg).connect(this.music);
    wind.start();
    wlfo.start();

    // Fire crackle bed
    this.fireBus = ctx.createGain();
    this.fireBus.gain.value = 0;
    this.fireBus.connect(this.sfx);
    const fireNoise = this.noiseSource();
    const flp = ctx.createBiquadFilter();
    flp.type = 'lowpass';
    flp.frequency.value = 500;
    const fg = ctx.createGain();
    fg.gain.value = 0.25;
    fireNoise.connect(flp).connect(fg).connect(this.fireBus);
    fireNoise.start();
  }

  startAmbience() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    // the drone sits lower now that the waltz carries the tune
    this.drone.gain.setTargetAtTime(0.3, t, 1.5);
  }

  // which arrangement plays: 'menu' | 'select' | 'dark' | 'lit' | 'tense' | 'tug' | 'off'
  setMusic(mood) {
    this.musicMood = mood;
    if (this.waltz) this.waltz.setMood(mood);
  }

  // the hero who hums along
  setHero(id) {
    this.heroVoice = id;
    if (this.waltz) this.waltz.setHero(id);
  }

  musicLightsOn() {
    if (this.waltz && !this.muted) this.waltz.lightsOn();
  }

  setFire(level) {
    this.fireLevel = level;
    if (!this.ready) return;
    this.fireBus.gain.setTargetAtTime(level * 0.5, this.ctx.currentTime, 0.4);
  }

  setTension(level) {
    this.tension = level;
    if (!this.ready) return;
    this.droneLp.frequency.setTargetAtTime(380 + level * 700, this.ctx.currentTime, 0.5);
  }

  update(dt, playing) {
    if (!this.ready || this.muted) return;
    if (this.waltz) this.waltz.update();
    // rhythmic heart-drain ticks: faster as the ghost weakens and when you pull hard
    if (this.tug) {
      this.tickTimer -= dt;
      if (this.tickTimer <= 0) {
        const hp = Math.max(0, Math.min(1, this.tug.hpFrac));
        this.tickTimer = (0.18 + hp * 0.32) * (1 - this.tug.opposition * 0.35);
        this.heartTick(hp);
      }
    } else {
      this.tickTimer = 0;
    }
    if (this.fireLevel > 0.05) {
      this.crackleTimer -= dt;
      if (this.crackleTimer <= 0) {
        this.crackleTimer = 0.04 + Math.random() * 0.18;
        const t = this.ctx.currentTime;
        const n = this.noiseSource();
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1500 + Math.random() * 3000;
        const g = this.envGain(t, 0.001, 0.12 * this.fireLevel * Math.random(), 0.02 + Math.random() * 0.03);
        n.connect(hp).connect(g);
        n.start(t);
        n.stop(t + 0.08);
      }
    }
  }
}
