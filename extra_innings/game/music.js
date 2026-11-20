'use strict';
/* =========================================================
   MUSIC · a fully synthesized, layered soundtrack
   - every track has a CALM layer (always playing) and an ACTION
     layer (drums, guitars) that fades in when enemies spot Nathan
   - a look-ahead scheduler keeps loops seamless (no file gaps)
   - dialogue + catchphrases duck the music 20% for a second
   - massive hits cut the music for 0.2 s right before the CRACK
   - character leitmotifs play when someone starts talking
   The track is picked automatically from the zone, room and boss.
   ========================================================= */
const Music = (() => {
  let A = null, bus, duckG, cutG, motifL, noiseBuf, distCurve;
  let vol = 0.8, cur = null, fading = [], forced, spotT = -99, timer = null;
  // the live tempo/key push in a boss's last 30%: rate multiplies the BPM, keyShift moves every note
  let rate = 1, keyShift = 0, bossK = 1, musSend = null;
  try { const v = localStorage.getItem('mpz_music'); if (v !== null) vol = +v; } catch (e) { logErr("game/music.js:15", e); }
  const mtof = m => 440 * Math.pow(2, (m + keyShift - 69) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const at = (b, P) => P[b % P.length];

  function init() {
    if (bus) return true;
    const a = SFX.audio(); if (!a) return false;
    A = a; const c = a.ctx;
    bus = c.createGain(); bus.gain.value = vol;
    duckG = c.createGain(); cutG = c.createGain();
    bus.connect(duckG).connect(cutG).connect(a.out);
    // part of the music rings out in the same stadium room as the effects
    if (a.room) { musSend = c.createGain(); musSend.gain.value = 0.2; cutG.connect(musSend).connect(a.room); }
    noiseBuf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    distCurve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; distCurve[i] = (1 + 30) * x / (1 + 30 * Math.abs(x)); }
    motifL = layer(c, bus, 0.28); motifL.wet.gain.value = 0.35;
    return true;
  }
  // a layer = dry input + echo send, both through one fader
  function layer(c, out, delayT) {
    const fade = c.createGain(), dry = c.createGain(), wet = c.createGain(), dl = c.createDelay(2), fb = c.createGain(), lp = c.createBiquadFilter();
    dl.delayTime.value = Math.min(1.9, delayT); fb.gain.value = 0.38; lp.type = 'lowpass'; lp.frequency.value = 2400;
    dry.connect(fade); wet.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(fade); fade.connect(out);
    return { fade, dry, wet };
  }

  /* ---------- voices ---------- */
  function osc(L, type, f, t, dur, v, o = {}) {
    const c = A.ctx, os = c.createOscillator(), g = c.createGain();
    os.type = type; os.frequency.setValueAtTime(f, t);
    if (o.slide) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.det) os.detune.value = o.det;
    if (o.vib) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; lfo.connect(lg).connect(os.frequency); lfo.start(t); lfo.stop(t + dur + 0.1); }
    let n = os;
    if ((type === 'sawtooth' || type === 'square') && !o.lp && !o.bp) o = Object.assign({ lp: 3500 }, o);   // warmth: no fizzy edges
    if (o.dist) { const ws = c.createWaveShaper(); ws.curve = distCurve; n.connect(ws); n = ws; }
    if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t); if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur); fl.Q.value = o.q || 0.7; n.connect(fl); n = fl; }
    if (o.bp) { const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = o.bp; fl.Q.value = o.q || 2; n.connect(fl); n = fl; }
    const a = o.a || 0.005;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a);
    if (o.sus) { g.gain.setValueAtTime(v, t + Math.max(a, dur - (o.r || 0.1))); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
    else g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.01));
    n.connect(g); g.connect(L.dry); if (o.e) g.connect(L.wet);
    os.start(t); os.stop(t + dur + 0.05);
  }
  function nz(L, t, dur, v, type, freq, o = {}) {
    const c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    dur = Math.min(dur, 2.9);
    s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur); f.Q.value = o.q || 1;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + (o.a || 0.002));
    if (o.sus) { g.gain.setValueAtTime(v, t + dur * 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
    else g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g); g.connect(L.dry); if (o.e) g.connect(L.wet);
    s.start(t, Math.random(), dur + 0.05);
  }
  const V = {
    kick(L, t, v = 0.42) { osc(L, 'sine', 150, t, 0.28, v, { slide: 42 }); nz(L, t, 0.02, v * 0.25, 'highpass', 3000); },
    snare(L, t, v = 0.16) { nz(L, t, 0.16, v, 'bandpass', 1900, { q: 0.8 }); osc(L, 'triangle', 200, t, 0.08, v * 0.6, { slide: 140 }); },
    lofiSnare(L, t, v = 0.07) { nz(L, t, 0.22, v, 'lowpass', 2400); osc(L, 'triangle', 180, t, 0.06, v * 0.4); },
    clap(L, t, v = 0.11) { for (let k = 0; k < 3; k++) nz(L, t + k * 0.012, 0.1, v, 'bandpass', 1300, { q: 1.4 }); },
    hat(L, t, v = 0.025, open) { nz(L, t, open ? 0.22 : 0.035, v, 'highpass', 7500); },
    crash(L, t, v = 0.08) { nz(L, t, 1.6, v, 'highpass', 4200, { e: 1 }); },
    tom(L, t, f = 110, v = 0.3) { osc(L, 'sine', f, t, 0.34, v, { slide: f * 0.55 }); nz(L, t, 0.05, v * 0.2, 'lowpass', 900); },
    timp(L, t, m, v = 0.28) { osc(L, 'sine', mtof(m), t, 1.1, v, { slide: mtof(m) * 0.93 }); nz(L, t, 0.3, v * 0.25, 'lowpass', 320); },
    rim(L, t, v = 0.03) { osc(L, 'square', 1700, t, 0.02, v); },
    metal(L, t, v = 0.045) { osc(L, 'square', 1180, t, 0.15, v, { bp: 2400, q: 6, e: 1 }); osc(L, 'square', 1733, t, 0.1, v * 0.7, { bp: 3500, q: 6 }); nz(L, t, 0.05, v, 'highpass', 5000); },
    anvil(L, t, v = 0.045) { osc(L, 'triangle', 2200, t, 0.5, v, { e: 1 }); osc(L, 'square', 3310, t, 0.22, v * 0.45, { e: 1, lp: 6000 }); osc(L, 'sine', 95, t, 0.22, v * 4, { slide: 48 }); },
    pok(L, t, f = 880, v = 0.05) { osc(L, 'sine', f, t, 0.07, v, { slide: f * 0.7 }); },
    heart(L, t, v = 0.5) { osc(L, 'sine', 58, t, 0.18, v, { slide: 36 }); osc(L, 'sine', 52, t + 0.2, 0.22, v * 0.8, { slide: 32 }); },
    piano(L, t, m, d, v = 0.04, e) { const f = mtof(m); osc(L, 'triangle', f, t, d, v, { e }); osc(L, 'sine', f * 2, t, d * 0.6, v * 0.35, { e }); },
    pluck(L, t, m, d, v = 0.045, e) { osc(L, 'sawtooth', mtof(m), t, d, v, { lp: 3200, lpTo: 300, e }); },
    harpsi(L, t, m, v = 0.028, e) { osc(L, 'sawtooth', mtof(m), t, 0.35, v, { lp: 6000, lpTo: 900, e }); osc(L, 'square', mtof(m + 12), t, 0.12, v * 0.25, { lp: 5000 }); },
    bell(L, t, m, v = 0.03) { const f = mtof(m); osc(L, 'sine', f, t, 1.4, v, { e: 1 }); osc(L, 'sine', f * 2.76, t, 0.5, v * 0.35, { e: 1 }); },
    pad(L, t, ms, d, v = 0.012, type = 'sawtooth', lp = 900) { for (const m of ms) osc(L, type, mtof(m), t, d, v, { lp, a: d * 0.3, sus: 1, r: d * 0.3, det: rnd(-8, 8) }); },
    organ(L, t, ms, d, v = 0.016) { for (const m of ms) { const f = mtof(m); osc(L, 'square', f, t, d, v, { lp: 2400, a: 0.04, sus: 1, r: 0.15, e: 1 }); osc(L, 'square', f * 2, t, d, v * 0.45, { lp: 3600, a: 0.04, sus: 1, r: 0.15 }); osc(L, 'sine', f / 2, t, d, v * 0.9, { a: 0.04, sus: 1, r: 0.15 }); } },
    choir(L, t, ms, d, v = 0.02) { for (const m of ms) { const f = mtof(m); osc(L, 'sawtooth', f, t, d, v, { bp: 720, q: 5, a: d * 0.35, sus: 1, r: d * 0.35, vib: [5, f * 0.008], e: 1 }); osc(L, 'sawtooth', f * 1.003, t, d, v * 0.6, { bp: 1150, q: 6, a: d * 0.35, sus: 1, r: d * 0.35, vib: [5.6, f * 0.008] }); } },
    bass(L, t, m, d, v = 0.13, type = 'sawtooth') { osc(L, type, mtof(m), t, d, v, { lp: 700, lpTo: 180, q: 3 }); },
    sub(L, t, m, d, v = 0.18) { osc(L, 'sine', mtof(m), t, d, v, { a: 0.01, sus: 1, r: 0.08 }); },
    guitar(L, t, m, d, v = 0.035) { for (const k of [0, 7, 12]) osc(L, 'sawtooth', mtof(m + k), t, d, v, { dist: 1, lp: 2600, a: 0.004, sus: 1, r: 0.05 }); },
    lead(L, t, m, d, v = 0.028, type = 'square', e) { osc(L, type, mtof(m), t, d, v, { lp: 3400, a: 0.01, sus: 1, r: 0.06, vib: [5.5, mtof(m) * 0.006], e }); },
    violin(L, t, m, d, v = 0.02, e = 1) { osc(L, 'sawtooth', mtof(m), t, d, v, { lp: 3800, a: 0.04, sus: 1, r: 0.08, vib: [6.2, mtof(m) * 0.01], e }); },
    flute(L, t, m, d, v = 0.028) { osc(L, 'sine', mtof(m), t, d, v, { a: 0.06, sus: 1, r: 0.12, vib: [5, mtof(m) * 0.008], e: 1 }); nz(L, t, d * 0.5, v * 0.12, 'bandpass', mtof(m) * 2, { q: 6 }); },
    sitar(L, t, m, d, v = 0.03) { osc(L, 'sawtooth', mtof(m) * 1.03, t, d, v, { slide: mtof(m), bp: 1600, q: 3, e: 1 }); },
    accordion(L, t, ms, d, v = 0.012) { for (const m of ms) for (const det of [-14, 14]) osc(L, 'square', mtof(m), t, d, v, { det, lp: 1800, a: 0.08, sus: 1, r: 0.15 }); },
    chip(L, t, m, d, v = 0.02) { osc(L, 'square', mtof(m), t, d, v); },
    brass(L, t, ms, d, v = 0.022) { for (const m of ms) osc(L, 'sawtooth', mtof(m), t, d, v, { lp: 500, lpTo: 2400, a: 0.03, sus: 1, r: 0.1 }); },
    skank(L, t, ms, v = 0.016) { for (const m of ms) osc(L, 'square', mtof(m), t, 0.11, v, { lp: 2600 }); },
    wind(L, t, d, v = 0.02) { nz(L, t, d, v, 'bandpass', 500, { to: 1400, q: 3, a: d * 0.4, sus: 1 }); },
    rain(L, t, d, v = 0.007) { nz(L, t, d, v, 'highpass', 5200); },
  };

  /* ---------- shared pieces ---------- */
  const ROCK = (L, t, s, b, I, o = {}) => {   // a standard rock kit
    if (s === 0 || s === 8 || (o.push && s === 10)) V.kick(L, t);
    if (s === 4 || s === 12) V.snare(L, t);
    if (s % 2 === 0) V.hat(L, t, 0.03, s === 14);
    if (s === 0 && b % (o.crashEvery || 4) === 0) V.crash(L, t);
  };
  function industrialCalm(s, t, b, L, I, kind) {
    const R = at(b, [45, 41, 43, 40]), C = at(b, [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]]);
    if ([1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1][s]) V.bass(L, t, R - 12 + (s % 8 === 6 ? 12 : 0), I.sd * 0.9, 0.11);
    if (s === 3 || s === 11) V.metal(L, t);
    V.hat(L, t, s % 4 === 2 ? 0.025 : 0.012);
    if (s === 0 || s === 8) V.kick(L, t, 0.3);
    if (s === 0) V.pad(L, t, C, I.sd * 16, 0.011);
    if (kind === 'vents' && s === 0) V.wind(L, t, I.sd * 16, 0.03);
    if (kind === 'vents' && s === 6 && b % 2) V.metal(L, t, 0.03);
    if (kind === 'server' && Math.random() < 0.18) V.chip(L, t, 84 + ((Math.random() * 12) | 0), 0.04, 0.012);
  }
  function industrialAct(s, t, b, L, I, kind) {
    const R = at(b, [45, 41, 43, 40]);
    if (s % 4 === 0) V.kick(L, t, 0.45);
    if (s === 4 || s === 12) V.snare(L, t);
    if (s % 2) V.hat(L, t, 0.04);
    if ([0, 2, 3, 6, 8, 10, 11, 14].includes(s)) V.guitar(L, t, R, I.sd * 0.8, 0.032);
    if (s === 0 && b % 4 === 0) V.crash(L, t);
    const RIFF = b % 2 ? { 0: 69, 3: 72, 6: 74, 8: 72, 10: 76, 12: 74 } : { 0: 69, 3: 67, 6: 69, 10: 72, 12: 71 };
    if (RIFF[s]) V.lead(L, t, RIFF[s], I.sd * 2, 0.022);
    if (kind === 'server' && (s === 0 || s === 8)) V.lead(L, t, b % 2 ? 88 : 87, I.sd * 3, 0.014, 'sawtooth');   // the alarm
  }
  const ADAM_A = { 0: 76, 2: 79, 4: 81, 6: 83, 7: 81, 8: 79, 10: 76, 12: 74, 14: 76 };
  const ADAM_B = { 0: 76, 2: 79, 4: 81, 6: 86, 8: 83, 10: 81, 12: 79, 14: 78 };
  // Evil Adam's version: same rhythm, dropped an octave and bent into a dark mode
  const darken = M => Object.fromEntries(Object.entries(M).map(([k, m]) => [k, m - 12 - ([71, 83, 76, 81, 86].includes(m) ? 1 : 0)]));
  const EVIL_A = darken(ADAM_A), EVIL_B = darken(ADAM_B);

  /* ---------- the tracks ---------- */
  const TRACKS = {
    // Base Camp: warm lo-fi; the crew adds instruments as they move in
    camp: { bpm: 78, swing: 0.22, echo: 0.3,
      calm(s, t, b, L, I) {
        const C = at(b, [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]), D = typeof Save !== 'undefined' ? Save.data : {};
        if (s === 0 || s === 10) C.forEach(m => V.piano(L, t, m, s === 0 ? 1.6 : 0.9, 0.022));
        if (s === 0) V.bass(L, t, C[0] - 12, 0.6, 0.14, 'triangle'); if (s === 7) V.bass(L, t, C[2] - 12, 0.25, 0.1, 'triangle'); if (s === 10) V.bass(L, t, C[0] - 12, 0.4, 0.12, 'triangle');
        if (s === 0 || s === 9) V.kick(L, t, 0.3); if (s === 4 || s === 12) V.lofiSnare(L, t);
        if (s % 2 === 0) V.hat(L, t, 0.014, s === 14);
        if ([2, 6, 8, 14].includes(s)) V.pluck(L, t, C[[1, 2, 3, 2][[2, 6, 8, 14].indexOf(s)]] + 12, 0.5, 0.035, 1);   // acoustic guitar
        if (Math.random() < 0.3) V.hat(L, t, 0.004);                                                                 // vinyl crackle
        const MEL = b % 4 === 1 ? { 0: 72, 3: 71, 6: 67, 10: 69, 12: 64 } : b % 4 === 3 ? { 0: 69, 4: 67, 8: 64, 11: 62 } : {};
        if (MEL[s]) V.pluck(L, t, MEL[s], 0.7, 0.03, 1);
        if (D.lars && s === 0 && b % 2 === 0) V.accordion(L, t, [C[0] + 12, C[2] + 12], I.sd * 15, 0.01);        // Lars: accordion
        if (D.josh && b % 4 === 2 && s % 2 === 0) V.chip(L, t, C[(s / 2) % 4] + 24, 0.06, 0.012);                  // Josh: chiptune arp
        if ((D.up && D.up.tea) || D.teaDrunk) {                                                                      // Deniz's tea lounge
          if (b % 4 === 1 && s % 4 === 0) V.flute(L, t, [76, 74, 72, 69][s / 4], I.sd * 3.6, 0.022);
          if (b % 4 === 2 && (s === 0 || s === 6)) V.sitar(L, t, (s ? C[1] : C[0]) + 12, 1.1, 0.028);
        }
        if (D.fionnDead && b % 8 === 7 && s === 0) V.bell(L, t, C[3] + 24, 0.02);
      } },
    industrial: { bpm: 128, echo: 0.2, calm: (s, t, b, L, I) => industrialCalm(s, t, b, L, I), act: (s, t, b, L, I) => industrialAct(s, t, b, L, I) },
    vents: { bpm: 124, echo: 0.3, calm: (s, t, b, L, I) => industrialCalm(s, t, b, L, I, 'vents'), act: (s, t, b, L, I) => industrialAct(s, t, b, L, I) },
    server: { bpm: 138, echo: 0.2, calm: (s, t, b, L, I) => industrialCalm(s, t, b, L, I, 'server'), act: (s, t, b, L, I) => industrialAct(s, t, b, L, I, 'server') },
    // the Deep Quarry: cavern echoes and rhythmic hammer clanks
    quarry: { bpm: 92, echo: 0.55,
      calm(s, t, b, L, I) {
        const SC = [62, 64, 65, 67, 69, 71, 72];
        if (s === 0 && b % 2 === 0) V.pad(L, t, [38, 45], I.sd * 32, 0.03, 'sawtooth', 380);
        if ([0, 6, 11].includes(s)) V.pluck(L, t, SC[(b * 3 + s) % 7], 0.6, 0.03, 1);
        if (s === 0 || s === 8) { V.anvil(L, t); V.tom(L, t, 70, 0.2); }
        if (s === 3) V.metal(L, t, 0.025);
        if (s === 13 && b % 3 === 1) V.bell(L, t, 96, 0.012);   // a drip
      },
      act(s, t, b, L, I) {
        const R = at(b, [38, 38, 41, 36]);
        if ([0, 3, 6, 8, 11, 14].includes(s)) V.tom(L, t, [90, 110, 90, 75, 110, 130][[0, 3, 6, 8, 11, 14].indexOf(s)], 0.28);
        if (s === 4 || s === 12) V.snare(L, t);
        if (s % 2 === 0) V.bass(L, t, R, I.sd * 1.8, 0.12);
        if ([0, 3, 6, 10].includes(s)) V.guitar(L, t, R + 12, I.sd * 1.5, 0.026);
      } },
    // the Foundry & Daniel: circus punk with a ticking fuse
    foundry: { bpm: 168, echo: 0.15,
      calm(s, t, b, L, I) {
        const R = at(b, [48, 43, 48, 43, 41, 48, 43, 48]);
        if (s === 0 || s === 8) V.bass(L, t, R - 12, I.sd * 2, 0.14, 'square');
        if (s === 4 || s === 12) V.organ(L, t, [R + 12, R + 16, R + 19], I.sd * 1.4, 0.008);
        V.hat(L, t, 0.012); if (s % 4 === 2) V.rim(L, t);                          // tick, tick, tick
        const CIRCUS = b % 2 ? [74, 0, 72, 71, 72, 0, 67, 0, 69, 70, 71, 0, 72, 0, 0, 0] : [72, 71, 72, 75, 79, 0, 77, 76, 74, 0, 72, 71, 72, 0, 67, 0];
        if (CIRCUS[s]) V.lead(L, t, CIRCUS[s] + 12, I.sd * 0.9, 0.016, 'square');
      },
      act(s, t, b, L, I) {
        const R = at(b, [48, 43, 48, 43, 41, 48, 43, 48]);
        if (s === 0 || s === 6 || s === 8) V.kick(L, t); if (s === 4 || s === 12) V.snare(L, t); if (s % 2 === 0) V.hat(L, t, 0.035);
        if (s === 0 && b % 2 === 0) V.crash(L, t, 0.1);
        if (s % 2 === 0) V.guitar(L, t, R - 12 + 12, I.sd * 1.6, 0.03);
        if (I.boss && s === 14 && b % 2 === 1) { V.crash(L, t, 0.14); V.kick(L, t, 0.6); }   // Daniel: explosive cymbals
      } },
    // the Grand Concourse: echoing piano for open exploring
    concourse: { bpm: 88, echo: 0.55,
      calm(s, t, b, L, I) {
        const C = at(b, [[57, 60, 64, 71], [53, 57, 60, 67], [55, 59, 62, 69], [52, 55, 59, 64]]);
        if (s % 2 === 0) V.piano(L, t, C[(s / 2) % 4] + 12, 0.9, 0.026, 1);
        if (s === 0) { V.pad(L, t, C.slice(0, 3), I.sd * 16, 0.01, 'triangle', 1400); V.kick(L, t, 0.22); V.sub(L, t, C[0] - 24, I.sd * 8, 0.12); }
        if (s % 4 === 2) V.hat(L, t, 0.012);
      },
      act(s, t, b, L, I) { const C = at(b, [[57], [53], [55], [52]]); ROCK(L, t, s, b, I); if (s % 2 === 0) V.bass(L, t, C[0] - 24, I.sd * 1.6, 0.12); } },
    // Geode Caverns: sparkling crystal bells, floaty low-gravity pads
    geode: { bpm: 100, echo: 0.6,
      calm(s, t, b, L, I) {
        const C = at(b, [[52, 56, 59, 63], [54, 57, 61, 64], [49, 52, 56, 59], [54, 58, 61, 66]]);
        if ([0, 3, 6, 9, 12, 14].includes(s)) V.bell(L, t, C[[0, 3, 6, 9, 12, 14].indexOf(s) % 4] + 24, 0.022);
        if (s === 0) { V.pad(L, t, C, I.sd * 16, 0.012, 'triangle', 1800); V.sub(L, t, C[0] - 12, I.sd * 14, 0.1); }
      },
      act(s, t, b, L, I) {
        const C = at(b, [[52, 56, 59, 63], [54, 57, 61, 64], [49, 52, 56, 59], [54, 58, 61, 66]]);
        V.bass(L, t, C[s % 4] - 12, I.sd * 0.9, 0.07);
        if (s === 0 || s === 8) V.kick(L, t, 0.35); if (s === 12) V.snare(L, t, 0.12); V.hat(L, t, 0.014);
        const MEL = b % 2 ? { 0: 80, 4: 78, 8: 75, 12: 73 } : { 0: 75, 6: 76, 8: 78, 12: 80 };
        if (MEL[s]) V.lead(L, t, MEL[s], I.sd * 3.5, 0.016, 'sine', 1);
      } },
    // Storm Atrium: gothic pipe organ, wild violin, thunder drums
    storm: { bpm: 132, echo: 0.35,
      calm(s, t, b, L, I) {
        const C = at(b, [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]);
        if (s === 0) { V.organ(L, t, C, I.sd * 16, 0.012); V.sub(L, t, C[0] - 12, I.sd * 16, 0.12); }
        if (s === 0 || s === 8) V.violin(L, t, at(b * 2 + s / 8, [74, 72, 70, 69, 77, 76, 74, 73]), I.sd * 7.5, 0.016);
        if (b % 4 === 3 && s === 0) { V.tom(L, t, 46, 0.2); V.wind(L, t, 2.2, 0.05); }   // distant thunder
      },
      act(s, t, b, L, I) {
        const C = at(b, [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]);
        V.violin(L, t, C[s % 3] + 24 + (s % 6 === 5 ? 12 : 0), I.sd, 0.012, 0);
        if (s % 4 === 0) V.kick(L, t, 0.5); if (s === 4 || s === 12) V.snare(L, t, 0.2);
        if ([10, 11, 14, 15].includes(s)) V.tom(L, t, [140, 120, 100, 80][[10, 11, 14, 15].indexOf(s)], 0.3);
        if (s === 0 && b % 2 === 0) V.crash(L, t, 0.1);
      } },
    // Glacier Crown: cold regal harpsichord, glassy winter synths
    glacier: { bpm: 108, echo: 0.45,
      calm(s, t, b, L, I) {
        const C = at(b, [[57, 60, 64], [50, 53, 57], [52, 56, 59], [57, 60, 64]]);
        const i = [0, 1, 2, 1, 0, 1, 2, 3][s % 8];
        V.harpsi(L, t, (i === 3 ? C[0] + 12 : C[i]) + 12, 0.022);
        if (s % 4 === 0) V.harpsi(L, t, C[0] - 12, 0.026);
        if (s === 0) V.pad(L, t, [C[0] + 24, C[2] + 24], I.sd * 16, 0.006, 'sine', 4000);
      },
      act(s, t, b, L, I) {
        const C = at(b, [[57, 60, 64], [50, 53, 57], [52, 56, 59], [57, 60, 64]]);
        V.snare(L, t, s % 2 ? 0.04 : 0.08); if (s === 0) V.kick(L, t, 0.4);
        if (s === 0 || s === 8) V.timp(L, t, C[0] - 24);
        if (s === 0) V.brass(L, t, C, I.sd * 3, 0.02);
      } },
    // …and once the crown is off: chill reggae
    reggae: { bpm: 76, swing: 0.1, echo: 0.5,
      calm(s, t, b, L, I) {
        const C = at(b, [[55, 59, 62], [60, 64, 67], [62, 66, 69], [60, 64, 67]]);
        if (s === 8) { V.kick(L, t, 0.38); V.rim(L, t, 0.06); }                       // the one drop
        if (s % 2 === 0) V.hat(L, t, 0.02, s % 8 === 6);
        if (s === 4 || s === 12) V.skank(L, t, C.map(m => m + 12));
        if (s === 6 || s === 14) V.organ(L, t, [C[0] + 12], 0.08, 0.008);
        const BL = { 0: 0, 3: 7, 6: 12, 10: 10, 12: 7 };
        if (BL[s] !== undefined) V.bass(L, t, C[0] - 24 + BL[s], I.sd * 2.5, 0.16, 'triangle');
        if (b % 4 === 3 && [0, 4, 6, 8].includes(s)) V.lead(L, t, [74, 71, 69, 67][[0, 4, 6, 8].indexOf(s)], I.sd * 2, 0.018, 'triangle', 1);
      } },
    // the Gilded Stadium: orchestral choir, heavy stadium drums
    stadium: { bpm: 120, echo: 0.35,
      calm(s, t, b, L, I) {
        const C = at(b, [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]]);
        if (s === 0) { V.choir(L, t, C.map(m => m + 12), I.sd * 16, 0.016); V.pad(L, t, [C[0] - 12], I.sd * 16, 0.02, 'sawtooth', 700); V.timp(L, t, C[0] - 12); }
        if (s === 12 && b % 2) V.timp(L, t, C[0] - 12, 0.2);
        if (s === 0 || s === 2 || s === 8 || s === 10) V.kick(L, t, 0.22); if (s === 4 || s === 12) V.clap(L, t, 0.06);
      },
      act(s, t, b, L, I) {
        const C = at(b, [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]]);
        if ([0, 2, 8, 10].includes(s)) V.kick(L, t, 0.5); if (s === 4 || s === 12) V.clap(L, t, 0.16);
        if (b % 4 === 3 && s >= 12) V.snare(L, t, 0.12);
        if (s === 0 || s === 6) V.brass(L, t, C.map(m => m + 12), I.sd * 2.5, 0.02);
        if (s === 0) V.choir(L, t, [at(b, [69, 70, 72, 69])], I.sd * 16, 0.02);
      } },
    // the locker room / a court gone quiet: a hushed choir
    hush: { bpm: 70, echo: 0.5,
      calm(s, t, b, L, I) {
        const C = at(b, [[50, 53, 57], [46, 50, 53]]);
        if (s === 0) V.choir(L, t, C, I.sd * 16, 0.011);
        if (s === 0 && b % 2 === 0) V.sub(L, t, C[0] - 12, I.sd * 28, 0.07);
      } },
    // normal Adam: sporty synth-rock with tennis-ball bounce percussion
    adam: { bpm: 160, echo: 0.2,
      calm(s, t, b, L, I) {
        const C = at(b, [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]]), M = b % 2 ? ADAM_B : ADAM_A;
        if (M[s]) V.lead(L, t, M[s], I.sd * 1.8, 0.024);
        if (s % 2 === 0) V.bass(L, t, C[0] - 12, I.sd * 1.7, 0.11);
        if (s % 4 === 2) V.pok(L, t, s % 8 === 2 ? 880 : 660, 0.06);   // pok… pok…
        V.hat(L, t, 0.015);
      },
      act(s, t, b, L, I) { const C = at(b, [[52], [48], [55], [50]]); ROCK(L, t, s, b, I, { push: 1, crashEvery: 2 }); if (s % 2 === 0) V.guitar(L, t, C[0], I.sd * 1.6, 0.028); } },
    // Evil Adam: Adam's theme as dark orchestral metal
    evil: { bpm: 140, echo: 0.3,
      calm(s, t, b, L, I) {
        const C = at(b, [[40, 43, 47], [41, 45, 48], [40, 43, 47], [38, 41, 45]]), M = b % 2 ? EVIL_B : EVIL_A;
        if (s === 0) { V.choir(L, t, C.map(m => m + 24), I.sd * 16, 0.02); V.timp(L, t, C[0]); }
        if (s % 2 === 0) V.violin(L, t, C[0] + 12 + (s % 4 ? 7 : 0), I.sd * 1.8, 0.01, 0);
        if (M[s]) V.lead(L, t, M[s] + 12, I.sd * 1.8, 0.024, 'sawtooth');
      },
      act(s, t, b, L, I) {
        const C = at(b, [[40], [41], [40], [38]]);
        V.kick(L, t, 0.28);                                                   // double kick
        if (s === 4 || s === 12) V.snare(L, t, 0.2);
        if ([1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1][s]) V.guitar(L, t, C[0], I.sd * 0.7, 0.03);
        if (s === 0 && b % 2 === 0) V.crash(L, t, 0.1);
      } },
    // Deuce: a heartbeat and a roaring crowd
    duel: { bpm: 84, echo: 0.2,
      calm(s, t, b, L, I) {
        if (s % 4 === 0) V.heart(L, t);
        if (s === 0 && b % 2 === 0) for (let k = 0; k < 4; k++) nz(L, t + k * 0.2, 3, 0.02 + k * 0.007, 'bandpass', 500 + k * 300, { a: 0.6, sus: 1 });
        if (s === 0) V.pad(L, t, [64, 65], I.sd * 16, 0.004, 'sawtooth', 2000);
      } },
    // the Zennith Core: solo piano in the rain…
    rain: { bpm: 66, echo: 0.55,
      calm(s, t, b, L, I) {
        const C = at(b, [[45, 52, 57, 60], [41, 48, 53, 57], [48, 55, 60, 64], [43, 50, 55, 59]]);
        if (s === 0) { V.piano(L, t, C[0] - 12, 2.6, 0.04); V.piano(L, t, C[1] - 12, 2.6, 0.03); }
        if (s === 8) V.piano(L, t, C[2], 1.8, 0.026);
        const MEL = at(b, [{ 0: 76, 4: 74, 8: 72, 12: 71 }, { 0: 72, 6: 69, 8: 71, 12: 67 }, { 0: 72, 4: 74, 8: 76, 12: 79 }, { 0: 77, 6: 76, 8: 74, 12: 71 }]);
        if (MEL[s]) V.piano(L, t, MEL[s], 1.6, 0.04, 1);
        V.rain(L, t, I.sd * 1.3);
      } },
    // …that explodes into a heroic rock anthem when the crew jumps in
    anthem: { bpm: 150, echo: 0.25,
      calm(s, t, b, L, I) {
        const C = at(b, [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]]);
        ROCK(L, t, s, b, I, { push: 1 });
        if (s % 2 === 0) { V.guitar(L, t, C[0], I.sd * 1.7, 0.026); V.bass(L, t, C[0] - 12, I.sd * 1.7, 0.12); }
        const MEL = at(b, [{ 0: 76, 4: 74, 8: 72, 12: 74 }, { 0: 74, 6: 71, 8: 72, 12: 67 }, { 0: 72, 4: 74, 8: 76, 12: 79 }, { 0: 81, 6: 79, 8: 77, 12: 76 }]);
        if (MEL[s]) V.lead(L, t, MEL[s], I.sd * 3.6, 0.026, 'sawtooth');
        if (s === 0) V.choir(L, t, C.map(m => m + 12), I.sd * 16, 0.014);
      },
      act(s, t, b, L, I) {
        const MEL = at(b, [{ 0: 79, 4: 77, 8: 76, 12: 77 }, { 0: 77, 6: 74, 8: 76, 12: 71 }, { 0: 76, 4: 77, 8: 79, 12: 83 }, { 0: 84, 6: 83, 8: 81, 12: 79 }]);
        if (MEL[s]) V.lead(L, t, MEL[s], I.sd * 3.6, 0.016, 'square');   // a harmony a third up
        if (s % 2) V.hat(L, t, 0.03); if (s === 0 && b % 2 === 1) V.crash(L, t);
      } },
    victory: { bpm: 96, echo: 0.4,
      calm(s, t, b, L, I) {
        const C = at(b, [[50, 54, 57], [43, 47, 50], [45, 49, 52], [50, 54, 57]]);
        if (s % 2 === 0) V.pluck(L, t, C[(s / 2) % 3] + 12 + (s % 8 === 6 ? 12 : 0), 0.5, 0.03, 1);
        if (s === 4) V.bell(L, t, C[2] + 24, 0.02);
        if (s === 0 || s === 8) V.kick(L, t, 0.28); if (s === 4 || s === 12) V.lofiSnare(L, t, 0.08); if (s % 2 === 0) V.hat(L, t, 0.015);
        if (s === 0 || s === 10) V.bass(L, t, C[0] - 12, 0.5, 0.12, 'triangle');
        const MEL = at(b, [{ 0: 78, 4: 76, 8: 74 }, { 0: 74, 6: 71, 8: 74 }, { 0: 76, 4: 78, 8: 81 }, { 0: 78, 8: 74 }]);
        if (MEL[s]) V.flute(L, t, MEL[s], I.sd * 3.5, 0.022);
      } },
  };
  /* ---------- the computed layer: each zone picks its own notes from its own scale ----------
     On top of every composed track a quiet voice wanders through that zone's scale (a random walk,
     so it never repeats exactly): note n → 440 · 2^((n − 69) / 12) like everything else. */
  const SCALES = {
    minPent: [0, 3, 5, 7, 10], lydian: [0, 2, 4, 6, 7, 9, 11], harmMin: [0, 2, 3, 5, 7, 8, 11],
    whole: [0, 2, 4, 6, 8, 10], phrygDom: [0, 1, 4, 5, 7, 8, 10],
  };
  const deg = (root, S, d) => root + S[((d % S.length) + S.length) % S.length] + 12 * Math.floor(d / S.length);
  const walk = (I, lo, hi) => { I.gw = Math.max(lo, Math.min(hi, (I.gw === undefined ? lo + 2 : I.gw) + [-2, -1, -1, 1, 1, 2][(Math.random() * 6) | 0])); return I.gw; };
  // a two-operator FM bell: a sine whose pitch is wobbled by another sine 3.5× higher, the wobble dying fast
  function fm(L, t, m, d, v) {
    const c = A.ctx, f = mtof(m), car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.type = 'sine'; mod.type = 'sine'; car.frequency.value = f; mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + d * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    mod.connect(mg).connect(car.frequency); car.connect(g); g.connect(L.dry); g.connect(L.wet);
    car.start(t); mod.start(t); car.stop(t + d + 0.05); mod.stop(t + d + 0.05);
  }
  const GEN = {
    // the Scrapyard: warm minor pentatonic, plucked short like an acoustic guitar
    camp(s, t, b, L, I) { if ([2, 6, 11, 14].includes(s) && Math.random() < 0.55) V.pluck(L, t, deg(57, SCALES.minPent, walk(I, 0, 8)), 0.32, 0.013, 1); },
    industrial(s, t, b, L, I) { if ((s === 6 || s === 14) && Math.random() < 0.35) V.pluck(L, t, deg(57, SCALES.minPent, walk(I, 0, 7)), 0.3, 0.011, 1); },
    // the Geode Caverns: floating Lydian, high FM bells in a lot of room
    geode(s, t, b, L, I) { if (s % 4 === 2 && Math.random() < 0.6) fm(L, t, deg(76, SCALES.lydian, walk(I, 0, 9)), 1.6, 0.012); },
    // the Storm Atrium: fast arpeggios through the bar's chord, harmonic minor (the A major bar brings the C#)
    storm(s, t, b, L, I) {
      if (b % 2 === 0) return;
      const C = at(b, [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]);
      V.harpsi(L, t, C[s % 3] + 24 + (s >= 8 ? 12 : 0), 0.008, 1);
    },
    // the Glacier Crown: slow, thin whole-tone glints (when the crown breaks the track itself turns to reggae)
    glacier(s, t, b, L, I) { if ((s === 0 || s === 8) && Math.random() < 0.5) V.bell(L, t, deg(76, SCALES.whole, walk(I, 0, 7)), 0.012); },
    // Evil Adam: a 55 Hz sub on every beat and Phrygian dominant stabs
    evil(s, t, b, L, I) {
      if (s % 4 === 0) osc(L, 'sine', 55, t, 0.28, 0.14, { a: 0.006 });
      if ((s === 2 || s === 10) && Math.random() < 0.5) V.violin(L, t, deg(64, SCALES.phrygDom, walk(I, 0, 8)), I.sd * 2, 0.01, 1);
    },
  };

  // older names still used by story scripts
  const LEGACY = { choir: 'stadium', core: 'rain', coreWar: 'anthem' };

  /* ---------- leitmotifs: a short hook when someone starts talking ---------- */
  const seq = (fn, notes, gap) => notes.forEach((m, i) => fn(i * gap, m));
  const MOTIFS = {
    ADAM: (L, t) => { seq((d, m) => V.lead(L, t + d, m, 0.12, 0.03), [76, 79, 81, 83], 0.09); V.pok(L, t, 880); V.pok(L, t + 0.18, 660); },
    'EVIL ADAM': (L, t) => { seq((d, m) => V.lead(L, t + d, m, 0.22, 0.026, 'sawtooth'), [64, 67, 68, 71], 0.15); V.choir(L, t, [52, 55, 59], 1.4, 0.018); },
    DANIEL: (L, t) => { seq((d, m) => V.chip(L, t + d, m + 12, 0.08, 0.022), [72, 71, 72, 75, 79], 0.08); V.crash(L, t + 0.42, 0.08); },
    JOSH: (L, t) => seq((d, m) => V.chip(L, t + d, m, 0.06, 0.02), [72, 76, 79, 84, 88], 0.05),
    RENAS: (L, t) => seq((d, m) => V.pluck(L, t + d, m, 0.18, 0.03), [67, 71, 74, 79, 83], 0.04),
    LARS: (L, t) => { V.accordion(L, t, [60, 64, 67], 0.6, 0.012); V.anvil(L, t + 0.3, 0.03); },
    RESHMAN: (L, t) => { osc(L, 'sine', 220, t, 0.2, 0.06, { slide: 110 }); osc(L, 'sine', 160, t + 0.14, 0.22, 0.05, { slide: 90 }); },
    FIONN: (L, t) => seq((d, m) => V.bell(L, t + d, m, 0.022), [76, 83, 88], 0.12),
    MILO: (L, t) => { V.organ(L, t, [62, 65, 69], 0.8, 0.01); seq((d, m) => V.violin(L, t + d, m, 0.14, 0.016), [74, 77, 81], 0.1); },
    'KING DENIZ': (L, t) => seq((d, m) => V.harpsi(L, t + d, m, 0.026), [69, 72, 76, 81], 0.07),
    DENIZ: (L, t) => { V.skank(L, t, [62, 66, 69]); V.skank(L, t + 0.3, [62, 66, 69]); V.sub(L, t, 38, 0.5, 0.12); },
    ZENNITH: (L, t) => seq((d, m) => V.piano(L, t + d, m, 1, 0.035, 1), [69, 72, 71, 64], 0.32),
  };
  const motifAt = {};
  const CATCH = /MVP|WORKS ON MY MACHINE|KNEEL|BLORP|ROCK AND STONE|SLOWPOKE|MATCH POINT|OUT OF THE PARK|GRAND SLAM|LUCKY/i;

  /* ---------- choosing a track ---------- */
  const QUIET = new Set(['wait', 'wake', 'beaten', 'off', 'sleep']);
  function fighting() { const B = typeof Zone !== 'undefined' && Zone.boss; return !!(B && !B.dead && B.state && !QUIET.has(B.state) && B.hp > 0); }
  function pick() {
    if (forced !== undefined) return forced;
    if (typeof Zone === 'undefined' || typeof PAGE === 'undefined') return 'industrial';   // the Test Room
    if (!Zone.room) return null;
    const D = Save.data, z = PAGE.zoneHere(), id = Zone.room.id, B = Zone.boss, F = fighting();
    if (F && typeof Adam === 'function' && B instanceof Adam) return 'adam';
    switch (z) {
      case 'z1': return id === 'hub' ? 'camp' : F ? 'server' : 'industrial';
      case 'z2': return 'quarry';
      case 'z3': return 'vents';
      case 'z4': return 'foundry';
      case 'z5': return 'concourse';
      case 'z6': return 'geode';
      case 'z7': return 'storm';
      case 'z8': return D.denizDead || (B && B.state === 'off') ? 'reggae' : 'glacier';
      case 'z9':
        if (id === 't_court') {
          if (typeof EvilAdam === 'function' && B instanceof EvilAdam && B.state !== 'wait') return B.ph === 3 && F ? 'duel' : 'evil';
          return D.trueEnding ? 'victory' : 'hush';
        }
        if (id === 't_locker') return D.trueEnding ? 'victory' : 'hush';
        return D.trueEnding ? 'victory' : 'stadium';
      case 'z10': return D.zennithDead ? 'victory' : B && B.stage >= 1 ? 'anthem' : 'rain';
    }
    return 'concourse';
  }
  function actionTarget() {
    if (typeof Player === 'undefined' || typeof Enemies === 'undefined') return 0;
    if (fighting()) return 1;
    const now = A.ctx.currentTime, P = Player;
    if (typeof Story !== 'undefined' && Story.active) return now - spotT < 2.5 ? 1 : 0;
    if (!P.dead) {
      const cx = P.x + P.w / 2, cy = P.y + P.h / 2, B = typeof Zone !== 'undefined' ? Zone.boss : null;
      for (const e of Enemies) {
        if (e.dead || e === B || !e.harmful || !(e.hp > 0) || e.type === 'boss') continue;
        if (e.engaged || Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 400) { spotT = now; break; }
      }
    }
    return now - spotT < 3 ? 1 : 0;
  }

  const ROOMY = { geode: 0.38, quarry: 0.28, storm: 0.3, stadium: 0.3, hush: 0.34, evil: 0.26, rain: 0.3, concourse: 0.24, glacier: 0.26 };
  /* ---------- the look-ahead scheduler ---------- */
  function startTrack(name) {
    const T = TRACKS[name], c = A.ctx, now = c.currentTime, sd = 60 / T.bpm / 4;
    const out = c.createGain(); out.gain.setValueAtTime(0.0001, now); out.gain.exponentialRampToValueAtTime(1, now + 0.9); out.connect(bus);
    const inst = { name, T, out, sd, step: 0, next: now + 0.08, calm: layer(c, out, sd * 3), act: layer(c, out, sd * 3), actLv: 0, boss: false };
    inst.calm.wet.gain.value = T.echo; inst.act.wet.gain.value = T.echo * 0.5; inst.act.fade.gain.value = 0.0001;
    return inst;
  }
  function stopTrack(inst) {
    const c = A.ctx, now = c.currentTime;
    inst.out.gain.cancelScheduledValues(now); inst.out.gain.setValueAtTime(Math.max(0.0001, inst.out.gain.value), now); inst.out.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    inst.until = now + 1.2; inst.kill = now + 4; fading.push(inst);
  }
  function play(inst) {
    const s = inst.step % 16, b = (inst.step / 16) | 0, t = inst.next + (s % 2 ? (inst.T.swing || 0) * inst.sd : 0);
    try {
      inst.T.calm(s, t, b, inst.calm, inst);
      if (inst.T.act && inst.actLv > 0) inst.T.act(s, t, b, inst.act, inst);
      if (GEN[inst.name]) GEN[inst.name](s, t, b, inst.calm, inst);
    } catch (e) { logErr("game/music.js:438", e); /* a bad note never stops the game */ }
    inst.step++; inst.next += inst.sd;
  }
  function tick() {
    if (!init()) return;
    const c = A.ctx; if (c.state !== 'running') return;
    const want = pick(), now = c.currentTime;
    if ((cur ? cur.name : null) !== (want && TRACKS[want] ? want : null)) {
      if (cur) stopTrack(cur); cur = want && TRACKS[want] ? startTrack(want) : null;
      // how much room each place has: a crystal cathedral, a stadium, a tight vent
      if (cur) { try { SFX.room(ROOMY[cur.name] || 0.16); } catch (e) { /* */ } if (musSend) musSend.gain.setTargetAtTime(0.12 + cur.T.echo * 0.25, now, 0.5); }
    }
    if (cur) {
      cur.boss = fighting();
      // a boss under 30% HP: the tempo is pushed up live (120 → 145 BPM is ×1.21) and the key rises a half step
      const push = cur.boss && bossK < 0.3, goal = push ? 145 / 120 : 1;
      rate += (goal - rate) * 0.04; if (Math.abs(goal - rate) < 0.002) rate = goal;
      keyShift = push ? 1 : 0;
      cur.sd = 60 / (cur.T.bpm * rate) / 4;
      const a = cur.T.act ? actionTarget() : 0;
      if (a !== cur.actLv) { cur.actLv = a; cur.act.fade.gain.cancelScheduledValues(now); cur.act.fade.gain.setTargetAtTime(a ? 1 : 0.0001, now, a ? 0.3 : 1.1); }
      if (cur.next < now) cur.next = now + 0.02;   // the tab was asleep: pick up cleanly instead of bursting
    }
    const ahead = now + 0.16;
    if (cur) while (cur.next < ahead) play(cur);
    for (const f of fading) while (f.next < ahead && f.next < f.until) play(f);
    fading = fading.filter(f => { if (now > f.kill) { f.out.disconnect(); return false; } return true; });
  }

  /* ---------- hooks into the rest of the game (after every script has loaded) ---------- */
  addEventListener('load', () => {
    if (typeof addHitstop === 'function') {
      const h = addHitstop;
      addHitstop = function (t) { if (t >= 0.14) Music.cut(0.2); return h(t); };   // massive hits: a beat of silence before the CRACK
    }
    if (typeof pop === 'function') {
      const p = pop;
      pop = function (x, y, text, opts) { if (typeof text === 'string' && CATCH.test(text)) Music.duck(); return p(x, y, text, opts); };
    }
    if (typeof Story !== 'undefined' && Story.say) {
      const say = Story.say;
      // the first line of a scene ducks hard; the lines after it only lean the music back a little
      Story.say = function (who, text, anchor, opts) { if (!this.skipping) { if (!this.lastWho) Music.duck(); else Music.duck(0.2, 1); Music.motif(who); } return say.call(this, who, text, anchor, opts); };
    }
    // the boss bar tells the music how much fight is left (for the last-30% tempo push), and a boss's roar ducks it
    if (typeof BossBar !== 'undefined') {
      const set = BossBar.set, hide = BossBar.hide;
      BossBar.set = function (k) { bossK = typeof k === 'number' && isFinite(k) ? k : 1; return set.apply(this, arguments); };
      BossBar.hide = function () { bossK = 1; return hide.apply(this, arguments); };
    }
    if (typeof Story !== 'undefined' && Story.bossIntro) {
      const intro = Story.bossIntro;
      Story.bossIntro = function () { Music.duck(0.65, 0.6); return intro.apply(this, arguments); };
    }
    // a Music slider next to the pause menu's volume
    const vr = document.getElementById('vol');
    if (vr && vr.closest('.row') && !document.getElementById('musVol')) {
      const row = document.createElement('div'); row.className = 'row';
      row.innerHTML = `<label>Music</label><input type="range" id="musVol" min="0" max="100" value="${Math.round(vol * 100)}">`;
      vr.closest('.row').after(row);
      row.querySelector('input').addEventListener('input', e => { Music.volume = e.target.value / 100; });
    }
  });
  timer = setInterval(tick, 40);

  return {
    force(kind) { forced = kind === null ? null : (LEGACY[kind] || kind); },
    release() { forced = undefined; },
    // ducking: down to 35% in 0.08s, held for `dur`, then eased back to 100% (a boss roar, a scene starting, a Grand Slam)
    duck(amount = 0.65, dur = 0.6) {
      if (!bus) return; const now = A.ctx.currentTime, g = duckG.gain;
      g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.setTargetAtTime(1 - amount, now, 0.027); g.setTargetAtTime(1, now + 0.08 + dur, 0.2);
    },
    cut(dur = 0.2) {
      if (!bus) return; const now = A.ctx.currentTime, g = cutG.gain;
      g.cancelScheduledValues(now); g.setValueAtTime(0, now); g.setValueAtTime(0, now + dur); g.linearRampToValueAtTime(1, now + dur + 0.12);
    },
    // a smooth level change over `dur` seconds: 0 before a loading screen, ~0.4 under a menu, 1 to come back
    fadeTo(level = 0, dur = 0.4) {
      if (!bus) return; const now = A.ctx.currentTime, g = cutG.gain;
      g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(Math.max(0, level), now + dur);
    },
    // down and back up again: the music steps aside while a boss arena seals
    dip(dur = 0.4, hold = 0.25) {
      if (!bus) return; const now = A.ctx.currentTime, g = cutG.gain;
      g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + dur);
      g.setValueAtTime(0, now + dur + hold); g.linearRampToValueAtTime(1, now + dur * 2 + hold);
    },
    motif(who) {
      if (!bus || !MOTIFS[who]) return;
      const now = A.ctx.currentTime;
      if (motifAt[who] && now - motifAt[who] < 40) return;
      motifAt[who] = now; try { MOTIFS[who](motifL, now + 0.02); } catch (e) { logErr("game/music.js:498", e); }
    },
    get current() { return cur ? cur.name : null; },
    get volume() { return vol; },
    set volume(v) { vol = v; if (bus) bus.gain.setTargetAtTime(v, A.ctx.currentTime, 0.05); try { localStorage.setItem('mpz_music', v); } catch (e) { logErr("game/music.js:502", e); } },
  };
})();
