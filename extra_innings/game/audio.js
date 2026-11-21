'use strict';
/* =========================================================
   Synthesized sound effects (no audio files needed)
   · one shared "stadium" room: everything is sent a little into a
     procedural reverb (2s of white noise dying away exponentially),
     and the whole mix runs through a compressor so ten explosions
     at once don't crackle
   · sawtooth and square tones pass a warm lowpass (~3.2 kHz)
   · SFX.from(x): sounds made while an enemy, shot or ball updates
     are panned to where it is on screen, relative to Nathan
   ========================================================= */
const SFX = (() => {
  let ctx = null, master = null, sfx = null, vol = 0.7, sfxVol = 1, rvIn = null, rvSend = null, pan = 0;
  try { const v = localStorage.getItem('mpz_vol'); if (v !== null) vol = +v; const s = localStorage.getItem('mpz_sfx'); if (s !== null) sfxVol = +s; } catch (e) { logErr("game/audio.js:7", e); }

  // a 2-second impulse response: white noise with an exponential tail, a little different per ear
  function impulse(c, secs = 2, decay = 3.2) {
    const n = Math.round(c.sampleRate * secs), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-(i / c.sampleRate) * decay); }
    return b;
  }
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = vol * 0.55;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.22;
      master.connect(comp).connect(ctx.destination);
      // the room: anything connected to rvIn rings out in the reverb
      rvIn = ctx.createGain(); rvIn.gain.value = 1;
      const conv = ctx.createConvolver(), rvLP = ctx.createBiquadFilter(), rvOut = ctx.createGain();
      conv.buffer = impulse(ctx); rvLP.type = 'lowpass'; rvLP.frequency.value = 4200; rvOut.gain.value = 0.55;
      rvIn.connect(conv).connect(rvLP).connect(rvOut).connect(master);
      sfx = ctx.createGain(); sfx.gain.value = sfxVol; sfx.connect(master);   // effects + voices ride their own slider; music goes straight to master
      rvSend = ctx.createGain(); rvSend.gain.value = 0.18; sfx.connect(rvSend).connect(rvIn);
      return true;
    } catch (e) { logErr("game/audio.js:18", e); return false; }
  }
  // where a sound goes: through a stereo panner when it happened off to one side
  function outNode(t) {
    if (!pan || !ctx.createStereoPanner) return sfx;
    const p = ctx.createStereoPanner(); p.pan.setValueAtTime(pan, t); p.connect(sfx); return p;
  }

  function tone(freq, dur, type = 'square', v = 0.15, slideTo = null, delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o;
    if (type === 'sawtooth' || type === 'square') { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3200; f.Q.value = 0.5; o.connect(f); n = f; }   // warmth: no harsh edges
    n.connect(g).connect(outNode(t)); o.start(t); o.stop(t + dur + 0.02);
  }

  let noiseBuf = null;
  function noise(dur, v = 0.3, filter = 'highpass', freq = 800, decay = 3, delay = 0, freqTo = null) {
    if (!ctx) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = filter; f.frequency.setValueAtTime(freq, t);
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(outNode(t)); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const vary = (f, k = 0.1) => f * (1 + (Math.random() * 2 - 1) * k);   // ±10%: never the same step twice
  const zoneNow = () => { try { return typeof PAGE !== 'undefined' && PAGE.zoneHere ? PAGE.zoneHere() : null; } catch (e) { return null; } };

  /* every character's own little voice, one blip per syllable */
  const VOICE = {
    JOSH(t, i) {   // quick square 8-bit beeps with a digital stutter
      const f = 450 + Math.random() * 150; tone(f, 0.045, 'square', 0.03, null, t);
      if (Math.random() < 0.3) tone(f * 1.5, 0.02, 'square', 0.02, null, t + 0.03);
    },
    LARS(t) {      // a deep sawtooth grumble behind a heavy lowpass
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), at = ctx.currentTime + t;
      o.type = 'sawtooth'; o.frequency.setValueAtTime(90 + Math.random() * 40, at); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 2;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.16, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.085);
      o.connect(f).connect(g).connect(outNode(at)); o.start(at); o.stop(at + 0.1);
    },
    FIONN(t) {     // bright, excited jumps in pitch
      const f = 500 + Math.random() * 350; tone(f, 0.06, 'triangle', 0.05, f * (Math.random() < 0.5 ? 1.25 : 0.9), t);
    },
    DENIZ(t) {     // slow, soft sine, drenched in the room
      const o = ctx.createOscillator(), g = ctx.createGain(), at = ctx.currentTime + t;
      o.type = 'sine'; o.frequency.setValueAtTime(220 + Math.random() * 60, at);
      g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.05, at + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      o.connect(g); g.connect(sfx); g.connect(rvIn); o.start(at); o.stop(at + 0.18);
    },
    RESHMAN(t) {   // a water drop: a sine that leaps 140 → 520 Hz through a ringing filter
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), at = ctx.currentTime + t;
      o.type = 'sine'; o.frequency.setValueAtTime(140, at); o.frequency.exponentialRampToValueAtTime(520, at + 0.15);
      f.type = 'bandpass'; f.Q.value = 9; f.frequency.setValueAtTime(300, at); f.frequency.exponentialRampToValueAtTime(600, at + 0.15);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.32, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.17);
      o.connect(f).connect(g).connect(outNode(at)); g.connect(rvIn); o.start(at); o.stop(at + 0.2);
    },
  };
  VOICE['KING DENIZ'] = VOICE.DENIZ;
  const ping = () => { tone(1480, 0.3, 'sine', 0.07); tone(2210, 0.3, 'sine', 0.05); };
  const voiceOf = who => VOICE[String(who || '').toUpperCase()] || null;

  return {
    ensure,
    // the music engine (game/music.js) plays through the same master volume, and sends into the same room
    audio() { return ctx ? { ctx, out: master, room: rvIn } : null; },
    // how big the room is: a cathedral of crystal, or a tight vent
    room(wet) { if (rvSend) rvSend.gain.setTargetAtTime(wet, ctx.currentTime, 0.4); },
    // pan whatever plays next to world-x (null = centre again)
    from(x) {
      if (x === null || x === undefined || typeof Player === 'undefined' || typeof Player.x !== 'number') { pan = 0; return; }
      const v = (x - (Player.x + Player.w / 2)) / 600; pan = !isFinite(v) || Math.abs(v) < 0.05 ? 0 : Math.max(-0.8, Math.min(0.8, v));
    },
    // force a track ('stadium', 'duel', 'victory', … or null for silence); musicAuto() hands control back
    music(kind) { if (typeof Music !== 'undefined') Music.force(kind); },
    musicAuto() { if (typeof Music !== 'undefined') Music.release(); },
    get volume() { return vol; },
    set volume(v) { vol = v; if (master) master.gain.value = v * 0.55; try { localStorage.setItem('mpz_vol', v); } catch (e) { logErr("game/audio.js:54", e); } },
    get sfxVolume() { return sfxVol; },
    set sfxVolume(v) { sfxVol = v; if (sfx) sfx.gain.value = v; try { localStorage.setItem('mpz_sfx', v); } catch (e) { logErr("game/audio.js:56", e); } },
    jump()   { tone(240, 0.09, 'triangle', 0.018, 420); },
    djump()  { tone(380, 0.1, 'triangle', 0.018, 700); noise(0.08, 0.012, 'highpass', 3000); },
    walljump(){ tone(300, 0.08, 'triangle', 0.018, 560); noise(0.05, 0.02, 'bandpass', 1800); },
    land()   { noise(0.06, 0.06, 'lowpass', 400); },
    // a 0.03s scuff that sounds like the floor: dull earth, sharp crystal, ticking ice
    step() {
      const z = zoneNow();
      if (z === 'z1' || z === 'z2' || z === 'z12') noise(0.03, 0.03, 'lowpass', vary(520));
      else if (z === 'z6') { noise(0.03, 0.02, 'highpass', vary(3600)); tone(vary(2600), 0.03, 'sine', 0.006); }
      else if (z === 'z8') { noise(0.03, 0.02, 'bandpass', vary(5200)); tone(vary(3400), 0.02, 'triangle', 0.008); }
      else noise(0.03, 0.016, 'bandpass', vary(1200));
    },
    dash()   { noise(0.18, 0.08, 'bandpass', 2000); tone(600, 0.12, 'sine', 0.015, 220); },
    // layer 1, the swing: filtered noise sweeping 400 → 1200 Hz in 0.08s (a ringing metal edge on the max bat)
    swing(n) {
      const metal = typeof Player !== 'undefined' && Player.batLook === 'max';
      noise(0.08 + n * 0.01, 0.035, 'bandpass', 400 + n * 60, 3, 0, 1200 + n * 200);
      if (metal) { tone(2100 + n * 120, 0.12, 'triangle', 0.012, 2600); tone(3150, 0.08, 'sine', 0.006); }
    },
    // layer 2, the impact: a crack on contact plus a triangle that dives 220 → 45 Hz in 0.05s; heavier on the finisher
    hit(heavy) {
      noise(0.04, heavy ? 0.34 : 0.24, 'bandpass', 2600); tone(heavy ? 1900 : 2300, 0.03, 'square', 0.05, 700);
      tone(220, 0.05, 'triangle', heavy ? 0.42 : 0.3, 45);
      noise(0.12, heavy ? 0.22 : 0.14, 'highpass', 1100); tone(heavy ? 120 : 170, 0.14, 'sine', heavy ? 0.22 : 0.14, 50);
      if (heavy) noise(0.25, 0.14, 'lowpass', 300);
    },
    // layer 3, the sweet spot / parry: two sines ringing out like an aluminium bat
    ping,
    // gibberish speech for barks: one pitched syllable per beat (or the character's own voice)
    babble(pitch = 1, n = 4, up = false, who) {
      if (!ctx) return;
      const own = voiceOf(who);
      if (own) { for (let i = 0; i < n; i++) own(i * 0.085, i); return; }
      const base = 165 * pitch;
      for (let i = 0; i < n; i++) {
        const t = ctx.currentTime + i * 0.085, d = 0.075, f0 = base * (1 + (Math.random() - 0.5) * 0.3) * (up && i === n - 1 ? 1.35 : 1);
        const o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * (i === n - 1 ? (up ? 1.2 : 0.78) : 0.95), t + d);
        bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime([700, 1100, 1500, 900][(Math.random() * 4) | 0] * Math.sqrt(pitch), t);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(bp).connect(g).connect(outNode(t)); o.start(t); o.stop(t + d + 0.02);
        if (Math.random() < 0.5) noise(0.02, 0.05, 'highpass', 3500, 3, i * 0.085);
      }
    },
    // the Hype orb filling: a soft tone that climbs 300 → 600 Hz with the meter, and a major chord at full
    hypeTone(k) {
      if (!ctx) return;
      if (k >= 1) { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.6, 'sine', 0.035, null, i * 0.03)); return; }
      const f = 300 + 300 * Math.max(0, k); tone(f, 0.12, 'sine', 0.022); tone(f * 1.5, 0.08, 'sine', 0.008);
    },
    dummy()  { noise(0.1, 0.22, 'bandpass', 700); tone(110, 0.1, 'triangle', 0.18, 70); },
    pogo()   { tone(300, 0.12, 'triangle', 0.04, 760); noise(0.06, 0.06, 'highpass', 1500); },
    toss()   { tone(500, 0.08, 'triangle', 0.08, 760); },
    launch() { noise(0.3, 0.5, 'highpass', 1000); tone(150, 0.35, 'sine', 0.4, 40); tone(900, 0.25, 'sawtooth', 0.04, 2400); },
    // a high, bright PING: a clean parry
    deflect(){ ping(); tone(2600, 0.2, 'sine', 0.05, 2750); tone(1200, 0.12, 'square', 0.04, 2400); noise(0.05, 0.2, 'highpass', 4000); },
    hurt()   { tone(220, 0.3, 'sawtooth', 0.15, 60); noise(0.25, 0.3, 'lowpass', 600); },
    die()    { tone(300, 0.9, 'sawtooth', 0.15, 40); noise(0.9, 0.3, 'lowpass', 300); },
    healCharge(p) { tone(180 + p * 500, 0.06, 'triangle', 0.04); },
    heal()   { noise(0.7, 0.45, 'lowpass', 200); tone(80, 0.6, 'sine', 0.5, 30); tone(440, 0.4, 'square', 0.05, 880, 0.05); tone(660, 0.4, 'square', 0.05, 1320, 0.12); },
    enemyDie(){ noise(0.5, 0.4, 'lowpass', 800); tone(400, 0.4, 'square', 0.08, 50); },
    shoot()  { tone(900, 0.2, 'sine', 0.06, 300); },
    windup() { tone(200, 0.35, 'sawtooth', 0.04, 600); },
    bench()  { [523, 659, 784].forEach((f, i) => tone(f, 0.35, 'triangle', 0.08, null, i * 0.09)); },
    drill()  { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, 'square', 0.05, null, i * 0.07)); },
    ui()     { tone(660, 0.05, 'square', 0.04); },
    // ---- Zone 1: story, boss, shop ----
    crowd(dur = 2.6) { for (let i = 0; i < 6; i++) noise(dur - i * 0.2, 0.05 + i * 0.015, 'bandpass', 500 + i * 260, 3, i * 0.18); },
    bigCrack() { noise(0.6, 0.7, 'highpass', 700); noise(0.9, 0.5, 'lowpass', 180); tone(90, 0.9, 'sine', 0.6, 25); },
    thunder() { noise(1.6, 0.5, 'lowpass', 140); tone(55, 1.4, 'sawtooth', 0.12, 30); },
    roll()   { noise(1.8, 0.05, 'bandpass', 300); },
    groan()  { tone(170, 0.5, 'sawtooth', 0.05, 120); },
    staticBuzz(d = 0.5) { noise(d, 0.12, 'highpass', 3500); tone(60, d, 'square', 0.03); },
    blip()   { tone(1200 + Math.random() * 300, 0.025, 'square', 0.02); },
    // one syllable of dialogue: the character's own voice if they have one, else a pitched blip
    voice(pitch = 1, who) { const own = voiceOf(who); if (own) { own(0, 0); return; } tone(180 * pitch + Math.random() * 40, 0.05, 'triangle', 0.035); },
    slamWarn(){ tone(140, 0.6, 'sawtooth', 0.05, 300); },
    slam()   { noise(0.5, 0.6, 'lowpass', 220); tone(70, 0.5, 'sine', 0.6, 30); },
    laserCharge(){ tone(300, 1.0, 'sawtooth', 0.04, 1400); },
    laser()  { tone(1400, 1.2, 'sawtooth', 0.05, 900); noise(1.2, 0.12, 'highpass', 2500); },
    summon() { [300, 450, 600].forEach((f, i) => tone(f, 0.15, 'square', 0.05, f * 1.5, i * 0.08)); },
    plasma() { tone(2000, 0.9, 'sawtooth', 0.12, 200); noise(1.0, 0.6, 'highpass', 600); tone(60, 1.2, 'sine', 0.6, 25); },
    clang()  { tone(1800, 0.25, 'square', 0.07, 1500); tone(2400, 0.2, 'triangle', 0.06); noise(0.08, 0.2, 'highpass', 4000); },
    coin()   { tone(1320, 0.06, 'square', 0.035); tone(1760, 0.08, 'square', 0.03, null, 0.04); },
    unlock() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'square', 0.06, null, i * 0.09)); noise(0.8, 0.15, 'highpass', 3000, 3, 0.4); },
    gate()   { noise(0.7, 0.45, 'lowpass', 400); tone(110, 0.5, 'square', 0.08, 60); },
    kick()   { noise(0.2, 0.5, 'lowpass', 500); tone(130, 0.2, 'sine', 0.4, 60); },
    blorp()  { tone(220, 0.18, 'sine', 0.12, 110); tone(160, 0.2, 'sine', 0.1, 90, 0.12); },
    poof()   { noise(0.35, 0.25, 'bandpass', 900); },
    paper()  { noise(0.18, 0.15, 'highpass', 2500); },
    // the cloak snapping open: a crisp crack of fabric and a short puff of air
    snap()   { noise(0.04, 0.28, 'highpass', 3800); noise(0.09, 0.1, 'bandpass', 1600, 3, 0.015, 600); tone(900, 0.03, 'triangle', 0.03, 500); },
    buy()    { [880, 1175, 1568].forEach((f, i) => tone(f, 0.15, 'square', 0.05, null, i * 0.06)); },
    deny()   { tone(200, 0.2, 'square', 0.06, 150); },
    bossDie(){ noise(1.8, 0.6, 'lowpass', 300); tone(200, 1.6, 'sawtooth', 0.1, 30); },
    spike()  { noise(0.2, 0.3, 'highpass', 1600); tone(500, 0.2, 'sawtooth', 0.1, 120); },
    // ---- Phase 3 · Act I ----
    boom()   { noise(0.7, 0.7, 'lowpass', 600); noise(0.25, 0.4, 'highpass', 1800); tone(90, 0.6, 'sine', 0.6, 28); },
    smallBoom(){ noise(0.35, 0.4, 'lowpass', 900); tone(140, 0.3, 'sine', 0.3, 40); },
    // a crackling, sizzling fuse
    fuse()   { noise(0.5, 0.06, 'highpass', 5000); for (let i = 0; i < 6; i++) noise(0.03, 0.07 + Math.random() * 0.05, 'bandpass', 3000 + Math.random() * 3000, 3, i * 0.07 + Math.random() * 0.03); },
    purr()   { for (let i = 0; i < 5; i++) tone(48 + (i % 2) * 6, 0.11, 'sawtooth', 0.05, 40, i * 0.12); tone(620, 0.2, 'triangle', 0.03, 880, 0.6); },
    bell()   { [1046, 1568, 2093].forEach((f, i) => tone(f, 1.1 - i * 0.2, 'sine', 0.08, f * 0.995, i * 0.01)); tone(523, 1.2, 'triangle', 0.05); },
    scooter(){ tone(90, 0.9, 'sawtooth', 0.05, 160); tone(180, 0.9, 'square', 0.02, 320); noise(0.9, 0.06, 'bandpass', 2400); },
    wind()   { noise(0.6, 0.05, 'bandpass', 700); },
    serve()  { tone(1400, 0.08, 'square', 0.06, 700); noise(0.12, 0.3, 'highpass', 2600); },
    whoosh() { noise(0.25, 0.25, 'bandpass', 1500); tone(500, 0.2, 'sawtooth', 0.03, 1600); },
    rocket() { noise(0.6, 0.12, 'bandpass', 1200); tone(300, 0.6, 'sawtooth', 0.03, 1400); },
    firework(){ noise(0.4, 0.25, 'highpass', 2200); tone(1800 + Math.random() * 600, 0.3, 'sine', 0.03, 900); },
    confetti(){ for (let i = 0; i < 6; i++) tone(700 + i * 180, 0.1, 'square', 0.03, null, i * 0.05); noise(0.6, 0.15, 'highpass', 4000); },
    anvil()  { tone(2200, 0.35, 'square', 0.05, 2100); tone(3300, 0.25, 'triangle', 0.05); noise(0.05, 0.3, 'highpass', 5000); },
    dirt()   { noise(0.3, 0.12, 'lowpass', 300); },
    crystal(){ tone(2600, 0.25, 'triangle', 0.05, 3400); tone(1900, 0.3, 'sine', 0.04, null, 0.04); },
    tick()   { tone(1500, 0.03, 'square', 0.03); },
    // ---- the pause menu ----
    // a baseball thudding into a leather glove: soft, dry, low
    glove()  { noise(0.09, 0.32, 'lowpass', 520); tone(95, 0.12, 'sine', 0.3, 55); noise(0.05, 0.08, 'bandpass', 1800, 3, 0.01); },
    // a coach's clipboard page flipping over
    flip()   { noise(0.07, 0.07, 'bandpass', 3200); noise(0.11, 0.05, 'highpass', 2200, 3, 0.05); noise(0.04, 0.09, 'bandpass', 900, 3, 0.13); },
    // a helmet buckle / latch snapping shut
    latch()  { tone(2900, 0.035, 'square', 0.04, 2100); noise(0.03, 0.18, 'highpass', 5200); tone(1300, 0.05, 'triangle', 0.035, null, 0.025); },
    // the map: parchment sliding on a table, a pencil scratch, a pin popping out
    rustle() { noise(0.26, 0.035, 'bandpass', 1400 + Math.random() * 900, 2); },
    scratch() { noise(0.06, 0.09, 'highpass', 4200, 3); noise(0.08, 0.07, 'highpass', 3600, 3, 0.07); noise(0.05, 0.06, 'bandpass', 5200, 3, 0.16); },
    pinPop() { tone(880, 0.07, 'sine', 0.12, 260); noise(0.04, 0.14, 'highpass', 3000); },
    // a heart refilling at a bench: soft bell tones climbing a pentatonic step at a time
    // a new area: a soft wind swell under two bright bell notes
    arrive() {
      if (!ctx) return;
      const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      noise(0.01, 0.0001);   // makes sure the noise buffer exists
      s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 0.8;
      f.frequency.setValueAtTime(350, t); f.frequency.linearRampToValueAtTime(900, t + 1.2); f.frequency.linearRampToValueAtTime(450, t + 2.4);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 1.1); g.gain.linearRampToValueAtTime(0.0001, t + 2.4);
      s.connect(f).connect(g).connect(sfx); s.start(t); s.stop(t + 2.45);
      tone(1046, 1.4, 'sine', 0.035, null, 0.35); tone(1568, 1.2, 'sine', 0.025, null, 0.6); tone(523, 1.6, 'triangle', 0.02, null, 0.35);
    },
    chime(i = 0) { const f = 660 * Math.pow(2, [0, 2, 4, 7, 9, 12, 14, 16, 19, 21][i % 10] / 12); tone(f, 0.5, 'sine', 0.06); tone(f * 2, 0.3, 'sine', 0.015); }
  };
})();
