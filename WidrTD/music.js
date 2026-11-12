// ===== WIDR TD: chiptune music (Web Audio sequencer) =====
const _ = null;
const store = {get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }};
const SONGS = {
  // Reward track: WIDR 64 menu theme, bouncy chiptune in G
  menu64: {bpm: 124, key: 67, lead: "square", bassWave: "square", leadVol: .06,
    chords: [[0, [0, 4, 7, 12]], [-5, [0, 4, 7, 12]], [-3, [0, 3, 7, 12]], [-7, [0, 4, 7, 11]]],
    melody: [12,_,16,_,19,_,24,_, 23,_,19,_,16,_,_,_,  14,_,17,_,21,_,19,17, 16,_,_,_,12,_,_,_,
             9,_,12,_,16,_,21,_, 19,_,16,_,12,_,14,_,  17,_,16,_,14,_,11,_, 12,_,_,_,_,_,_,_],
    bass: "1.1.o.1.1.1.o.1.", kick: "x...x...x...x...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x."},
  // Title screen: laid-back island groove in C
  menu: {bpm: 100, key: 60, lead: 'triangle', bassWave: 'triangle', leadVol: .09,
    chords: [[0, [0, 4, 7, 11]], [-3, [0, 3, 7, 10]], [5, [0, 4, 7, 11]], [7, [0, 4, 7, 10]]],
    melody: [16,_,_,_,14,_,12,_, 11,_,_,_,7,_,_,_,  12,_,_,_,9,_,7,_, 9,_,_,_,_,_,_,_,
             17,_,_,_,16,_,12,_, 9,_,_,_,12,_,_,_,  14,_,_,_,11,_,14,_, 19,_,_,_,_,_,_,_],
    bass: '1.......1...o...', kick: 'x.......x.......', snare: '............x...', hat: '..x...x...x...x.'},
  // Waves: upbeat A minor
  battle: {bpm: 138, key: 69, lead: 'square', bassWave: 'square', leadVol: .06,
    chords: [[0, [0, 3, 7, 12]], [-4, [0, 4, 7, 12]], [3, [0, 4, 7, 12]], [-2, [0, 4, 7, 12]]],
    melody: [12,_,10,_,7,_,12,_, 15,_,14,12,10,_,7,_,  8,_,7,_,5,_,8,_, 12,_,10,8,7,_,5,_,
             7,_,3,_,7,_,10,_, 12,_,15,_,14,_,12,_,  10,_,7,_,10,_,14,_, 12,10,7,_,_,_,_,_],
    bass: '1.1.1.1o1.1.1o1.', kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xx'},
  // Boss waves: driving D minor
  boss: {bpm: 152, key: 62, lead: 'sawtooth', bassWave: 'sawtooth', leadVol: .045,
    chords: [[0, [0, 3, 7, 12]], [-4, [0, 4, 7, 12]], [5, [0, 3, 7, 12]], [7, [0, 4, 7, 12]]],
    melody: [12,12,_,10,_,12,_,15, _,14,_,12,10,_,9,_,  8,8,_,7,_,8,_,12, _,10,_,8,7,_,5,_,
             7,_,10,_,12,_,15,_, 17,_,15,_,12,_,10,_,  11,_,14,_,19,_,14,_, 11,_,14,_,19,_,23,_],
    bass: '11.1o.1.11.1o.1o', kick: 'x.x.x..xx.x.x..x', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx'},
  // Music pack: RhymeRhythm stoep groove in F, swung hip-hop beat
  rhyme: {bpm: 92, key: 65, lead: "square", bassWave: "triangle", leadVol: .05,
    chords: [[0, [0, 3, 7, 10]], [-2, [0, 4, 7, 10]], [-4, [0, 4, 7, 11]], [-5, [0, 3, 7, 10]]],
    melody: [12,_,_,15,_,12,10,_, 12,_,_,_,7,_,10,_,  14,_,_,10,_,14,12,_, 10,_,_,_,_,_,7,_,
             8,_,_,12,_,8,7,_, 5,_,_,_,8,_,12,_,  10,_,12,_,15,_,14,_, 12,_,10,_,_,_,_,_],
    bass: "1..1..o.1.1...o.", kick: "x..x..x...x..x..", snare: "....x.......x...", hat: "x.xxx.xxx.xxx.xx"},
  // Music pack: boss remix, faster and heavier E minor
  bossRemix: {bpm: 168, key: 64, lead: "square", bassWave: "sawtooth", leadVol: .05,
    chords: [[0, [0, 3, 7, 12]], [-4, [0, 4, 7, 12]], [-2, [0, 4, 7, 12]], [-5, [0, 3, 7, 12]]],
    melody: [12,_,15,_,19,_,15,12, _,10,_,12,_,15,_,17,  19,_,17,_,15,_,12,_, 14,_,12,10,_,7,_,_,
             12,12,_,12,15,_,12,_, 10,10,_,10,14,_,10,_,  8,_,12,_,15,_,20,_, 19,_,15,_,12,_,10,_],
    bass: "1o1o1o1o1o1o1oo1", kick: "x.x.x.x.x.x.x.xx", snare: "....x..x....x.x.", hat: "xxxxxxxxxxxxxxxx"},
};

const Music = {
  on: store.get('widrtd_music') !== 'off',
  vol: +(store.get('widrtd_vol') || .6),
  song: null, want: null, step: 0, next: 0, timer: null, out: null, noise: null,
  ctx() {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    if (!this.out) {
      this.out = AC.createGain(); this.out.connect(AC.destination);
      const len = AC.sampleRate * .5, b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b;
    }
    this.out.gain.value = this.on ? this.vol * .5 : 0;
    return AC;
  },
  play(name) {
    this.want = name;
    if (!this.on) return;
    try { this.ctx(); } catch (e) { return; }
    // music packs from the Trophy Store replace the battle and boss songs
    const eq = typeof Meta !== 'undefined' && Meta.p ? Meta.p.equipped : {};
    if (name === 'battle' && eq.musicBattle) name = 'rhyme';
    if (name === 'boss' && eq.musicBoss) name = 'bossRemix';
    if (name === "menu" && eq.musicMenu) name = "menu64";
    if (this.song === SONGS[name]) return;
    this.song = SONGS[name]; this.step = 0; this.next = AC.currentTime + .08;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
  },
  setOn(v) {
    this.on = v; store.set('widrtd_music', v ? 'on' : 'off');
    if (v) { this.song = null; this.play(this.want || 'menu'); } else if (this.out) this.out.gain.value = 0;
  },
  setVol(v) { this.vol = v; store.set('widrtd_vol', v); if (this.out && this.on) this.out.gain.value = v * .5; },
  tick() {
    if (!this.song || !this.on) return;
    const s = this.song, dt = 60 / s.bpm / 4;
    while (this.next < AC.currentTime + .15) { this.playStep(s, this.step, this.next, dt); this.next += dt; this.step = (this.step + 1) % 64; }
  },
  playStep(s, step, t, dt) {
    const bar = (step / 16) | 0, i = step % 16, [root, tones] = s.chords[bar];
    const m = s.melody[step];
    if (m !== null) this.tone(t, s.key + m, dt * 1.8, s.lead, s.leadVol);
    // arpeggio
    this.tone(t, s.key - 12 + root + tones[i % tones.length], dt * .9, 'triangle', .035);
    const b = s.bass[i];
    if (b !== '.') this.tone(t, s.key - 24 + root + (b === 'o' ? 12 : 0), dt * 1.6, s.bassWave, s.bassWave === 'triangle' ? .14 : .07);
    if (s.kick[i] === 'x') this.kick(t);
    if (s.snare[i] === 'x') this.hit(t, 1500, .2, .12);
    if (s.hat[i] === 'x') this.hit(t, 7000, .05, .035);
  },
  tone(t, midi, dur, type, vol) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + .02);
  },
  kick(t) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + .12);
    g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.0001, t + .15);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + .17);
  },
  hit(t, freq, vol, dur) {
    const n = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    n.buffer = this.noise; f.type = 'highpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(this.out); n.start(t); n.stop(t + dur + .02);
  },
};
