// ==========================================================
// music.js — "The Lantern Waltz": an original spooky waltz in
// D minor (3/4 time), sequenced bar by bar on the Web Audio clock.
// The hero hums the melody in their own voice — shaky in the dark,
// confident once a room's lights are on — and the arrangement
// brightens to D major in lit rooms.
// ==========================================================

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Chord voicings: bass root, alternate bass (fifth) and the "pah-pah" stab
const CHORDS = {
  Dm: { bass: 50, alt: 45, stab: [62, 65, 69] },
  Gm: { bass: 43, alt: 50, stab: [62, 67, 70] },
  A7: { bass: 45, alt: 52, stab: [61, 64, 67] },
  Bb: { bass: 46, alt: 53, stab: [62, 65, 70] },
  Edim: { bass: 40, alt: 46, stab: [64, 67, 70] },
  F: { bass: 41, alt: 48, stab: [65, 69, 72] },
  C7: { bass: 48, alt: 43, stab: [64, 67, 70] },
  FoverC: { bass: 48, alt: 41, stab: [65, 69, 72] },
};

// Melody per bar: [midi, beats] (0 = rest), three beats to a bar.
// A: the creeping main theme, with the chromatic D–C#–D "shiver"
const A1 = [
  ['Dm', [[69, 2], [65, 1]]],
  ['Dm', [[74, 1], [73, 1], [74, 1]]],
  ['Gm', [[70, 2], [67, 1]]],
  ['A7', [[64, 1], [67, 1], [73, 1]]],
  ['Dm', [[74, 2], [69, 1]]],
  ['Bb', [[77, 1], [76, 1], [74, 1]]],
  ['Edim', [[73, 1.5], [70, 0.5], [67, 1]]],
  ['A7', [[69, 2], [0, 1]]],
];
// A': the answer, climbing to the high G before settling home
const A2 = [
  ['Dm', [[69, 2], [65, 1]]],
  ['Dm', [[74, 1], [76, 1], [77, 1]]],
  ['Gm', [[79, 2], [77, 1]]],
  ['A7', [[76, 1], [74, 1], [73, 1]]],
  ['Dm', [[74, 1], [69, 1], [65, 1]]],
  ['Gm', [[67, 1], [70, 1], [74, 1]]],
  ['A7', [[73, 1], [76, 1], [69, 1]]],
  ['Dm', [[74, 2], [0, 1]]],
];
// B: the ballroom bridge in F, briefly hopeful
const B = [
  ['F', [[72, 1], [77, 2]]],
  ['C7', [[76, 2], [70, 1]]],
  ['Dm', [[74, 2], [69, 1]]],
  ['A7', [[73, 1], [76, 1], [79, 1]]],
  ['Bb', [[77, 2], [74, 1]]],
  ['FoverC', [[72, 1], [69, 1], [65, 1]]],
  ['Gm', [[67, 1], [70, 1], [74, 1]]],
  ['A7', [[73, 2], [0, 1]]],
];
const FORM = [...A1, ...A2, ...B, ...A2];
const PHRASE = 8;

// Lit rooms: the same tune in D major (F→F#, Bb→B, C→C#). Applied to
// melody, stabs and bass alike, Dm/Gm/Bb/F become D/G/Bm/F#m.
function brighten(m) {
  const pc = ((m % 12) + 12) % 12;
  return pc === 5 || pc === 10 || pc === 0 ? m + 1 : m;
}
const same = (m) => m;

// Arrangement per mood. `lead` plays the melody on an instrument when
// nobody is humming; `box` adds the music-box sparkle.
const MOODS = {
  menu: { bpm: 96, bright: false, box: true, lead: 'box', hum: false },
  select: { bpm: 112, bright: true, box: true, hum: true, nerves: 0, confidence: 0.9 },
  dark: { bpm: 104, bright: false, box: false, hum: true, nerves: 0.45, confidence: 0.3 },
  lit: { bpm: 120, bright: true, box: true, hum: true, nerves: 0.05, confidence: 1 },
  tense: { bpm: 138, bright: false, box: false, hum: true, nerves: 1, confidence: 0, tremolo: true },
  tug: { bpm: 150, bright: false, box: false, lead: 'organ', hum: false, tremolo: true },
};

// How each WIDR hero hums the waltz.
//   octave  shift from the written melody   formant/q  "mouth" filter
//   legato  fraction of each note held      breath     airy noise mix
//   grace   ornament style                  echo       reverb send
export const HUM_VOICES = {
  // the main hero: a plain, steady "mm-mm-mm"
  nathan: { wave: 'triangle', octave: -12, formant: 750, q: 1.1, gain: 0.15, vibRate: 5.2, vibCents: 18, attack: 0.05, legato: 0.92, breath: 0.02, echo: 0.25 },
  // tech whiz: tight and synthy, notes step between pitches like a sequencer
  josh: { wave: 'square', octave: -12, formant: 1100, q: 4, gain: 0.06, vibRate: 0, vibCents: 0, attack: 0.01, legato: 0.8, breath: 0, echo: 0.2, stepGlide: true, grace: 'blip', graceProb: 0.25 },
  // lightning wizard: a thin buzzy voice that trills on every long note
  milo: { wave: 'sawtooth', octave: 0, formant: 1400, q: 2.2, gain: 0.045, vibRate: 7, vibCents: 30, attack: 0.03, legato: 0.85, breath: 0.03, echo: 0.3, grace: 'trill', graceProb: 0.6 },
  // shadow being: a barely-there whisper, and only every other phrase
  reshman: { wave: 'sine', octave: -12, formant: 600, q: 0.8, gain: 0.05, vibRate: 4, vibCents: 10, attack: 0.12, legato: 0.95, breath: 0.6, breathFreq: 1800, echo: 0.5, restPhrases: true },
  // dwarf miner: a deep chesty rumble, booming the root at phrase ends
  lars: { wave: 'triangle', octave: -24, formant: 420, q: 1.4, gain: 0.2, vibRate: 4, vibCents: 25, attack: 0.07, legato: 0.95, breath: 0.03, echo: 0.2, bom: true },
  // bomber: punchy staccato "bom-bom-bom", with a boom to finish
  daniel: { wave: 'triangle', octave: -12, formant: 650, q: 1.3, gain: 0.17, vibRate: 0, vibCents: 0, attack: 0.015, legato: 0.5, breath: 0.04, echo: 0.2, accent: 1.35, boom: true },
  // duke of ice: a pure falsetto that glides between notes, drenched in echo
  deniz: { wave: 'sine', octave: 0, formant: 1600, q: 0.7, gain: 0.12, vibRate: 4.5, vibCents: 22, attack: 0.08, legato: 1.0, breath: 0.02, echo: 0.7, glide: 0.09 },
  // geologist: whistles it, with Irish-style cuts on the beat
  fionn: { wave: 'sine', octave: 12, formant: 3000, q: 0.5, gain: 0.08, vibRate: 6, vibCents: 12, attack: 0.02, legato: 0.75, breath: 0.12, breathFreq: 2600, echo: 0.3, grace: 'cut', graceProb: 0.45 },
  // gadget kid: rushes ahead, doubles long notes, gets bored mid-phrase
  renas: { wave: 'triangle', octave: 0, formant: 1000, q: 1.2, gain: 0.1, vibRate: 6, vibCents: 15, attack: 0.02, legato: 0.6, breath: 0.03, echo: 0.2, rush: 0.04, impatient: true },
};

const LOOKAHEAD = 0.12; // schedule each bar this far before it starts

export class WaltzDirector {
  constructor(engine) {
    this.e = engine;
    const ctx = engine.ctx;
    // dry and reverb-send buses, faded together so paused/queued notes go silent
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(engine.music);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0;
    this.wet.connect(engine.echo);
    this.mood = 'off';
    this.voiceId = 'nathan';
    this.bar = 0;
    this.nextBar = 0;
    this.prevHum = null;
    this.bored = false;
  }

  setHero(id) {
    if (HUM_VOICES[id]) this.voiceId = id;
  }

  setMood(mood) {
    if (mood === this.mood) return;
    const prev = this.mood;
    this.mood = mood;
    const t = this.e.ctx.currentTime;
    for (const g of [this.bus, this.wet]) {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(mood === 'off' ? 0 : 1, t, mood === 'off' ? 0.12 : 0.35);
    }
    if (prev === 'off' && mood !== 'off') {
      // a long break restarts the tune from the top; a short pause picks up where it left off
      if (this.nextBar < t - 2) this.bar = 0;
      this.nextBar = Math.max(t + 0.08, this.nextBar);
    }
    if ((prev === 'menu') !== (mood === 'menu') && prev !== 'off') this.bar = 0;
  }

  // the room's lights just came on: a bright flourish, then the tune restarts in D major
  lightsOn() {
    if (this.mood === 'off') return;
    const t = this.e.ctx.currentTime + 0.02;
    [62, 66, 69, 74, 78, 81, 86].forEach((m, i) => this.bell(t + i * 0.07, m, 0.07));
    const v = HUM_VOICES[this.voiceId];
    if (!v.restPhrases) {
      // a relieved little "ooh-hoo!"
      this.humNote(t + 0.3, 69, 0.18, v, 0, v.gain);
      this.humNote(t + 0.5, 74, 0.35, v, 0, v.gain * 1.1);
    }
    this.bar = 0;
  }

  update() {
    if (this.mood === 'off') return;
    const now = this.e.ctx.currentTime;
    if (this.nextBar < now - 0.25) this.nextBar = now + 0.06; // resync after a hidden tab / hiccup
    while (this.nextBar < now + LOOKAHEAD) {
      const beat = 60 / MOODS[this.mood].bpm;
      this.scheduleBar(this.bar, this.nextBar, beat);
      this.nextBar += beat * 3;
      this.bar++;
    }
  }

  // -----------------------------------------------------------------
  scheduleBar(i, t0, beat) {
    const mood = MOODS[this.mood];
    const [chordName, mel] = FORM[i % FORM.length];
    const ch = CHORDS[chordName];
    const map = mood.bright ? brighten : same;
    const barInPhrase = i % PHRASE;
    const phrase = Math.floor(i / PHRASE);
    if (barInPhrase === 0) this.bored = !!HUM_VOICES[this.voiceId].impatient && Math.random() < 0.3;

    // oom: bass on beat 1, alternating root and fifth
    this.bassNote(t0, map(i % 2 ? ch.alt : ch.bass), beat * (mood.tremolo ? 0.9 : 1.6), mood.bright ? 0.15 : 0.12);
    // pah-pah: chord stabs on beats 2 and 3
    const stab = ch.stab.map(map);
    this.stab(t0 + beat, stab, beat, mood.bright, mood.tremolo);
    this.stab(t0 + beat * 2, stab, beat, mood.bright, mood.tremolo);
    // music-box sparkle on the off-beats
    if (mood.box) {
      this.bell(t0 + beat * 1.5, stab[2] + 12, 0.025);
      this.bell(t0 + beat * 2.5, stab[1] + 12, 0.02);
    }
    // tense: a low tremolo under everything, plus a creeping half-step on beat 3
    if (mood.tremolo) {
      for (let k = 0; k < 6; k++) this.tremolo(t0 + k * beat * 0.5, map(ch.bass) + 12, beat * 0.4);
      if (i % 2) this.e.tone(midiToHz(stab[0] + 1), 'triangle', t0 + beat * 2.5, beat * 0.4, 0.03, this.bus);
    }

    // melody: timings within the bar
    let at = 0;
    const notes = mel.map(([m, b]) => {
      const n = { m: m ? map(m) : 0, at, len: b };
      at += b;
      return n;
    });
    if (mood.lead) {
      for (const n of notes) if (n.m) this.leadNote(mood.lead, t0 + n.at * beat, n.m, n.len * beat * 0.9);
    }
    if (mood.hum && this.shouldHum(phrase, barInPhrase)) {
      this.humBar(notes, t0, beat, mood, barInPhrase, map(ch.bass));
    } else if (mood.hum && this.bored && barInPhrase === 5) {
      this.hmph(t0 + beat * 0.5);
    }
  }

  shouldHum(phrase, barInPhrase) {
    const v = HUM_VOICES[this.voiceId];
    if (v.restPhrases && phrase % 2 === 1) return false;
    if (this.bored && barInPhrase >= 5) return false;
    return true;
  }

  humBar(notes, t0, beat, mood, barInPhrase, root) {
    const v = HUM_VOICES[this.voiceId];
    const nerves = mood.nerves || 0;
    const conf = mood.confidence || 0;
    const baseGain = v.gain * (0.75 + conf * 0.35) * (1 - nerves * 0.3);
    notes.forEach((n) => {
      if (!n.m) return;
      if (Math.random() < nerves * 0.18) return; // too scared to remember this note
      let t = t0 + n.at * beat - (v.rush || 0);
      let dur = n.len * beat * v.legato;
      let gain = baseGain;
      if (v.accent && n.at === 0) gain *= v.accent;

      if (v.impatient && n.len >= 2) {
        // can't sit still on a long note: hums it twice, double-time
        this.humNote(t, n.m, n.len * beat * 0.38, v, nerves, gain);
        this.humNote(t + n.len * beat * 0.5, n.m, n.len * beat * 0.38, v, nerves, gain * 0.9);
        return;
      }
      if (nerves > 0.6 && Math.random() < nerves * 0.3) {
        // nervous stutter: "m-mmm"
        this.humNote(t, n.m, 0.08, v, nerves, gain * 0.8);
        this.humNote(t + 0.13, n.m, Math.max(0.05, dur - 0.13), v, nerves, gain);
        return;
      }
      if (v.grace && Math.random() < v.graceProb * (0.4 + conf * 0.6)) {
        if (v.grace === 'cut') {
          this.humNote(t, n.m + 2, 0.05, v, 0, gain * 0.8);
          t += 0.05;
          dur -= 0.05;
        } else if (v.grace === 'blip') {
          this.humNote(t, n.m + 12, 0.04, v, 0, gain * 0.7);
          t += 0.04;
          dur -= 0.04;
        } else if (v.grace === 'trill' && n.len >= 2) {
          for (let q = 0, j = 0; q < dur - 0.06; q += 0.085, j++) this.humNote(t + q, n.m + (j % 2 ? 2 : 0), 0.08, v, nerves, gain);
          return;
        }
      }
      this.humNote(t, n.m, dur, v, nerves, gain);
    });

    if (barInPhrase === PHRASE - 1) {
      const tEnd = t0 + beat * 2;
      if (v.bom) this.humNote(tEnd, root, beat * 0.9, v, 0, baseGain * 1.2, true);
      if (v.boom) {
        this.humNote(tEnd, root, 0.22, v, 0, baseGain * 1.4, true);
        this.e.tone(midiToHz(root - 12), 'sine', tEnd, 0.3, 0.12, this.bus);
      }
      if (nerves > 0.6 && Math.random() < 0.5) this.gasp(tEnd + beat * 0.3);
    }
  }

  // one hummed note: oscillator → "mouth" filter → envelope, plus breath noise
  humNote(t, midi, dur, v, nerves, gain, raw = false) {
    const ctx = this.e.ctx;
    if (dur < 0.03 || t < ctx.currentTime) return;
    const wobble = (Math.random() * 2 - 1) * nerves * 22; // drifts off-key when scared
    const hz = midiToHz((raw ? midi : midi + v.octave) + wobble / 100);
    const o = ctx.createOscillator();
    o.type = v.wave;
    const linked = this.prevHum && t - this.prevHum.end < 0.25;
    if (v.glide && linked) {
      o.frequency.setValueAtTime(this.prevHum.hz, t);
      o.frequency.exponentialRampToValueAtTime(hz, t + Math.min(v.glide, dur * 0.4));
    } else if (v.stepGlide && linked) {
      o.frequency.setValueAtTime(this.prevHum.hz, t);
      o.frequency.setValueAtTime((this.prevHum.hz + hz) / 2, t + 0.025);
      o.frequency.setValueAtTime(hz, t + 0.05);
    } else {
      o.frequency.setValueAtTime(hz, t);
    }
    this.prevHum = { hz, end: t + dur };

    // vibrato eases in after the attack; wider and faster when scared
    const vibCents = v.vibCents * (1 + nerves * 2.5) + nerves * 15;
    let vib = null;
    if (vibCents > 0) {
      vib = ctx.createOscillator();
      vib.frequency.value = (v.vibRate || 5) * (1 + nerves * 0.5);
      const vg = ctx.createGain();
      vg.gain.setValueAtTime(0, t);
      vg.gain.linearRampToValueAtTime(hz * (Math.pow(2, vibCents / 1200) - 1), t + Math.min(0.2, dur * 0.5));
      vib.connect(vg).connect(o.frequency);
    }

    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = v.formant;
    f.Q.value = v.q;
    const g = ctx.createGain();
    const atk = Math.max(0.005, Math.min(v.attack, dur * 0.4));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + atk);
    g.gain.setValueAtTime(gain, t + Math.max(atk, dur * 0.7));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(this.bus);
    if (v.echo) {
      const s = ctx.createGain();
      s.gain.value = v.echo;
      g.connect(s).connect(this.wet);
    }
    o.start(t);
    o.stop(t + dur + 0.05);
    if (vib) {
      vib.start(t);
      vib.stop(t + dur + 0.05);
    }

    if (v.breath > 0) {
      const n = this.e.noiseSource();
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = v.breathFreq || 1200;
      bp.Q.value = 0.8;
      const ng = ctx.createGain();
      const peak = gain * v.breath * 3;
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + atk);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(bp).connect(ng).connect(this.bus);
      n.start(t);
      n.stop(t + dur + 0.05);
    }
  }

  // a frightened little intake of breath with a squeak
  gasp(t) {
    const ctx = this.e.ctx;
    const n = this.e.noiseSource();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const g = this.e.envGain(t, 0.01, 0.05, 0.12, this.bus);
    n.connect(hp).connect(g);
    n.start(t);
    n.stop(t + 0.2);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(620, t + 0.04);
    o.frequency.exponentialRampToValueAtTime(1150, t + 0.14);
    const og = this.e.envGain(t + 0.04, 0.01, 0.04, 0.1, this.bus);
    o.connect(og);
    o.start(t + 0.04);
    o.stop(t + 0.2);
  }

  // Renas gives up halfway through a phrase
  hmph(t) {
    const ctx = this.e.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(240, t + 0.2);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = this.e.envGain(t, 0.02, 0.09, 0.2, this.bus);
    o.connect(f).connect(g);
    o.start(t);
    o.stop(t + 0.3);
  }

  // --- instruments ----------------------------------------------------
  bassNote(t, m, dur, gain) {
    this.e.tone(midiToHz(m), 'triangle', t, dur, gain, this.bus, 0.01);
    this.e.tone(midiToHz(m - 12), 'sine', t, dur, gain * 0.6, this.bus, 0.01);
  }

  stab(t, notes, beat, bright, staccato) {
    const dur = staccato ? beat * 0.22 : bright ? beat * 0.8 : beat * 0.4;
    for (const m of notes) {
      if (bright) {
        // music-box chord: fundamental plus a soft octave
        this.e.tone(midiToHz(m), 'sine', t, dur, 0.035, this.bus, 0.004);
        this.e.tone(midiToHz(m + 12), 'sine', t, dur * 0.6, 0.012, this.bus, 0.004);
      } else {
        // muffled pizzicato in the dark
        const ctx = this.e.ctx;
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(midiToHz(m), t);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 900;
        const g = this.e.envGain(t, 0.005, 0.04, dur, this.bus);
        o.connect(f).connect(g);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    }
  }

  // inharmonic bell: fundamental plus a 2.76× partial that dies away fast
  bell(t, m, gain) {
    const hz = midiToHz(m);
    this.e.tone(hz, 'sine', t, 0.9, gain, this.bus, 0.003);
    this.e.tone(hz * 2.76, 'sine', t, 0.25, gain * 0.35, this.bus, 0.003);
    const s = this.e.envGain(t, 0.003, gain * 0.5, 0.6, this.wet);
    const o = this.e.ctx.createOscillator();
    o.frequency.setValueAtTime(hz, t);
    o.connect(s);
    o.start(t);
    o.stop(t + 0.7);
  }

  tremolo(t, m, dur) {
    const ctx = this.e.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(midiToHz(m), t);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 520;
    const g = this.e.envGain(t, 0.01, 0.03, dur, this.bus);
    o.connect(f).connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  leadNote(kind, t, m, dur) {
    if (kind === 'box') {
      this.bell(t, m + 12, 0.05);
    } else {
      // reedy ghost organ for the tug-of-war
      const ctx = this.e.ctx;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 800;
      const g = this.e.envGain(t, 0.03, 0.025, dur, this.bus);
      f.connect(g);
      for (const d of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(midiToHz(m - 12), t);
        o.detune.value = d;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    }
  }
}
