// ---------- sound: every effect and song is synthesized live with WebAudio (no audio files) ----------
const SOUND_KEY = "earthdoku-sound";
const snd = Object.assign({sfx:true, music:false, vol:.6}, store.get(SOUND_KEY) || {});
const sndSave = () => store.set(SOUND_KEY, snd);
let actx = null, master = null, musicBus = null;

// browsers only allow audio after a tap or key press, so the context starts lazily
function audio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    master = actx.createGain(); master.gain.value = snd.vol; master.connect(actx.destination);
    musicBus = actx.createGain(); musicBus.gain.value = .32; musicBus.connect(master);
  }
  if (actx.state === "suspended") actx.resume();
  return actx;
}
const hz = m => 440 * 2 ** ((m - 69) / 12);

// one chiptune note: square/triangle/sawtooth with a quick attack and decay
function tone(midi, t, dur, {type = "square", vol = .18, bus = master, slide = 0} = {}) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(hz(midi), t);
  if (slide) o.frequency.exponentialRampToValueAtTime(hz(midi + slide), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + .008);
  g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + dur + .02);
}
function noise(t, dur, vol = .25, bus = master) {
  const len = Math.max(1, Math.floor(actx.sampleRate * dur));
  const buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = actx.createBufferSource(), g = actx.createGain();
  s.buffer = buf; g.gain.value = vol;
  s.connect(g); g.connect(bus); s.start(t);
}

const SFX = {
  click: t => tone(84, t, .05, {vol:.08}),
  ok:    t => { tone(76, t, .09); tone(83, t + .08, .16); },
  bad:   t => { tone(45, t, .22, {type:"sawtooth", vol:.14, slide:-5}); },
  smash: t => { noise(t, .18, .3); tone(72, t + .02, .12); tone(79, t + .1, .12); tone(84, t + .18, .3); },
  win:   t => [72, 76, 79, 84, 79, 84].forEach((m, i) => tone(m, t + i * .11, i === 5 ? .5 : .12)),
  lose:  t => [67, 63, 60, 55].forEach((m, i) => tone(m, t + i * .16, .2, {type:"triangle", vol:.25})),
  level: t => [67, 71, 74, 79, 83, 86].forEach((m, i) => tone(m, t + i * .07, .14, {vol:.14})),
  reward:t => { [79, 83, 86, 91].forEach((m, i) => tone(m, t + i * .09, .2, {type:"triangle", vol:.28})); noise(t + .36, .1, .08); },
  tick:  t => tone(96, t, .03, {vol:.05}),
  open:  t => { tone(64, t, .06, {vol:.1}); tone(71, t + .05, .08, {vol:.1}); }
};
function sfx(name) {
  if (!snd.sfx || !SFX[name] || !audio()) return;
  SFX[name](actx.currentTime + .01);
}

// ---------- music: three short original loops, picked by tab ----------
// each song: bpm, then lead / bass as [midi or 0 for rest, length in eighth notes]
const SONGS = {
  town: {bpm:112, lead:[[72,2],[76,1],[79,1],[77,2],[76,2],[74,2],[72,1],[74,1],[76,4],
                        [69,2],[72,1],[76,1],[74,2],[72,2],[71,2],[72,1],[74,1],[67,4],
                        [72,2],[76,1],[79,1],[81,2],[79,2],[77,2],[76,1],[74,1],[72,2],[0,2],
                        [77,2],[76,2],[74,2],[71,2],[72,6],[0,2]],
         bass:[[48,4],[48,4],[53,4],[55,4],[45,4],[45,4],[50,4],[43,4],[48,4],[48,4],[53,4],[48,4],[53,4],[55,4],[48,8]]},
  roam: {bpm:96, lead:[[64,3],[67,1],[69,2],[67,2],[64,2],[62,2],[60,4],
                       [62,3],[64,1],[67,2],[64,2],[62,8],
                       [64,3],[67,1],[69,2],[72,2],[71,2],[69,2],[67,4],
                       [69,2],[67,2],[64,2],[62,2],[60,8]],
         bass:[[45,8],[41,8],[43,8],[43,8],[45,8],[41,8],[43,8],[48,8]]},
  battle:{bpm:150, lead:[[69,1],[69,1],[72,1],[69,1],[76,2],[74,1],[72,1],[71,1],[71,1],[74,1],[71,1],[79,2],[77,1],[76,1],
                         [69,1],[69,1],[72,1],[69,1],[76,2],[77,1],[79,1],[81,2],[79,1],[77,1],[76,4],
                         [74,1],[74,1],[77,1],[74,1],[81,2],[79,1],[77,1],[76,1],[76,1],[79,1],[76,1],[83,2],[81,1],[79,1],
                         [81,1],[79,1],[77,1],[76,1],[74,1],[72,1],[71,1],[72,1],[69,6],[0,2]],
         bass:[[45,1],[57,1],[45,1],[57,1],[45,1],[57,1],[45,1],[57,1],[43,1],[55,1],[43,1],[55,1],[43,1],[55,1],[43,1],[55,1],
               [45,1],[57,1],[45,1],[57,1],[45,1],[57,1],[45,1],[57,1],[41,1],[53,1],[41,1],[53,1],[40,1],[52,1],[40,1],[52,1],
               [38,1],[50,1],[38,1],[50,1],[38,1],[50,1],[38,1],[50,1],[40,1],[52,1],[40,1],[52,1],[40,1],[52,1],[40,1],[52,1],
               [41,1],[53,1],[41,1],[53,1],[40,1],[52,1],[40,1],[52,1],[45,1],[57,1],[45,1],[57,1],[45,4]]}
};
const TAB_SONG = {grid:"town", list:"roam", geo:"roam", shop:"town", mini:"battle", tower:"battle", stats:"roam"};
const mus = {song:null, timer:null, next:0, li:0, bi:0, lt:0, bt:0};
function musicStop() { clearInterval(mus.timer); mus.timer = null; mus.song = null; }
function musicPlay(name) {
  if (!snd.music || !audio()) return;
  if (mus.song === name && mus.timer) return;
  musicStop();
  const s = SONGS[name]; if (!s) return;
  mus.song = name;
  const step = 60 / s.bpm / 2, start = actx.currentTime + .1;
  mus.li = mus.bi = 0; mus.lt = mus.bt = start;
  // schedule a little ahead so timers never cause gaps
  mus.timer = setInterval(() => {
    const until = actx.currentTime + .4;
    while (mus.lt < until) {
      const [m, n] = s.lead[mus.li++ % s.lead.length];
      if (m) tone(m, mus.lt, n * step * .9, {vol:.11, bus:musicBus});
      mus.lt += n * step;
    }
    while (mus.bt < until) {
      const [m, n] = s.bass[mus.bi++ % s.bass.length];
      if (m) tone(m, mus.bt, n * step * .85, {type:"triangle", vol:.3, bus:musicBus});
      mus.bt += n * step;
    }
  }, 120);
}
let curTab = "grid";
window.onTabSound = tab => { curTab = tab; if (snd.music) musicPlay(TAB_SONG[tab] || "town"); };

// ---------- header buttons ----------
$(".top").insertAdjacentHTML("beforeend",
  `<div class="sndBtns"><button id="sndSfx" aria-pressed="${snd.sfx}" title="Sound effects">🔊</button><button id="sndMusic" aria-pressed="${snd.music}" title="Music">🎵</button></div>`);
function drawSndBtns() {
  $("#sndSfx").textContent = snd.sfx ? "🔊" : "🔇";
  $("#sndSfx").setAttribute("aria-pressed", snd.sfx);
  $("#sndSfx").title = snd.sfx ? "Sound effects on" : "Sound effects off";
  $("#sndMusic").classList.toggle("off", !snd.music);
  $("#sndMusic").setAttribute("aria-pressed", snd.music);
  $("#sndMusic").title = snd.music ? "Music on" : "Music off";
}
$("#sndSfx").onclick = () => { snd.sfx = !snd.sfx; sndSave(); drawSndBtns(); sfx("click"); };
$("#sndMusic").onclick = () => {
  snd.music = !snd.music; sndSave(); drawSndBtns();
  if (snd.music) musicPlay(TAB_SONG[curTab] || "town"); else musicStop();
};
drawSndBtns();
// music saved as "on" starts with the first tap anywhere (browsers block autoplay)
const firstTouch = () => { if (snd.music) musicPlay(TAB_SONG[curTab] || "town"); removeEventListener("pointerdown", firstTouch); removeEventListener("keydown", firstTouch); };
addEventListener("pointerdown", firstTouch); addEventListener("keydown", firstTouch);
// quiet the music while the tab is hidden
document.addEventListener("visibilitychange", () => { if (!actx) return; document.hidden ? actx.suspend() : actx.resume(); });
