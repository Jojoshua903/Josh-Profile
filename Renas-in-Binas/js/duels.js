import { THREE, G, toon, basic, mk, clamp, puff, placeOn, orientOn, surf, frameDir, tangentTo, stepDir, toast, banner } from './core.js?v=20261112d';
import { tr } from './lang.js?v=20261112d';
import { sfx } from './audio.js?v=20261112d';
import { P, bouncePlayer, requestLock } from './player.js?v=20261112d';
import { makeMarker } from './fx.js?v=20261112d';

// DUELS: some locals don't send you on an errand, they challenge you to a mini game.
// task: { type: 'duel', game, ...settings, found, lost }
//   race   - first to the flag (to: dir, speed)
//   simon  - copy their moves on four coloured tiles (rounds: [3, 4, 5], colors)
//   grab   - grab more things than them before the time runs out (n, time, model, color)
//   tag    - catch them a few times before the time runs out (n, time, speed)
//   hop    - step on the tile that lights up, beat their score (target, time, model)
//   dodge  - don't get hit by what they throw for a while (time, every, model, color)
// One duel at a time. You win: onWin(). You lose (or walk off, or fall): onLose(text). Talk to them again for a rematch.

const arc = (pl, a, b) => Math.acos(clamp(a.dot(b), -1, 1)) * pl.r;
const latAt = (pl, d) => 90 - (d / pl.r) * (180 / Math.PI);
const COLS = [0xff3a5a, 0xffd23a, 0x5cd85a, 0x3aa8ff];
const NOTES = [523, 659, 784, 1047];
const NAMES = ['RED!', 'YELLOW!', 'GREEN!', 'BLUE!'];

// a little beep, so the simon tiles each have their own sound
function beep(i) { sfx.mumble({ p: NOTES[i], w: 'triangle', fs: 1.2, d: 0.22, range: 0, vib: 0, growl: 0, click: 0, every: 1, dry: 0.8, vol: 1.3 }, 'aeio'[i]); }

// SIMON PAD: four big buttons on screen (click them, or press 1 2 3 4) instead of walking onto the tiles
const padCss = `
#simonPad{position:fixed;left:50%;bottom:7vh;transform:translateX(-50%);display:flex;gap:14px;z-index:40;pointer-events:auto;font-family:inherit}
#simonPad button{width:118px;height:118px;border-radius:22px;border:5px solid #2b2440;color:#2b2440;font:800 17px/1.1 inherit;cursor:pointer;
  box-shadow:0 7px 0 #2b2440;transition:transform .08s,filter .08s,opacity .2s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
#simonPad button b{font-size:30px}
#simonPad button.lit{filter:brightness(1.45) saturate(1.2);transform:translateY(-6px) scale(1.08);box-shadow:0 13px 0 #2b2440,0 0 34px #fff}
#simonPad button:active{transform:translateY(5px);box-shadow:0 2px 0 #2b2440}
#simonPad.wait button{opacity:.55;cursor:default}
@media (max-width:640px){#simonPad button{width:78px;height:78px;font-size:12px}#simonPad button b{font-size:22px}}`;
function makePad(cols, names, onPress) {
  if (!document.getElementById('simonPadCss')) { const s = document.createElement('style'); s.id = 'simonPadCss'; s.textContent = padCss; document.head.appendChild(s); }
  const el = document.createElement('div'); el.id = 'simonPad'; el.className = 'wait';
  const btns = cols.map((c, i) => {
    const b = document.createElement('button'); b.type = 'button';
    b.style.background = '#' + new THREE.Color(c).getHexString();
    b.innerHTML = `<b>${i + 1}</b>${tr(names[i]).replace('!', '')}`;
    // don't let the click turn the camera or shoot through to the game
    for (const ev of ['mousedown', 'pointerdown']) b.addEventListener(ev, (e) => e.stopPropagation());
    b.addEventListener('click', (e) => { e.stopPropagation(); onPress(i); });
    el.appendChild(b); return b;
  });
  const key = (e) => { const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].indexOf(e.code); if (i >= 0 && !e.ctrlKey) onPress(i % 4); };
  addEventListener('keydown', key);
  document.body.appendChild(el);
  return {
    light: (i, on) => btns[i] && btns[i].classList.toggle('lit', on),
    wait: (on) => el.classList.toggle('wait', on),
    remove: () => { removeEventListener('keydown', key); el.remove(); },
  };
}

function flagModel(color) {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8), toon(0xfff8ec), 0, 1.7, 0, g, 1.12);
  const f = mk(new THREE.BoxGeometry(1.3, 0.8, 0.06), toon(color), 0.68, 2.9, 0, g, 1.08);
  g.userData.flag = f;
  return g;
}

export function startDuel(w, loc, T, onWin, onLose) {
  const pl = w.main, npc = loc.npc, home = npc.dir.clone(), homeQ = npc.g.quaternion.clone();
  const grp = new THREE.Group(); w.group.add(grp);
  const games = {};
  const d = { t: 0, phase: 'count', count: 3.2, score: 0, them: 0, over: false };
  let npcDir = home.clone(), npcFwd = tangentTo(home, P.planet === pl ? P.up : frameDir(home, 0, 0));

  // the opponent runs around during some duels
  const moveNpc = (dir, fwd, hop = 0) => {
    npcDir.copy(dir); npcFwd.copy(fwd); npc.dir.copy(dir);
    placeOn(npc.g, pl, dir, hop); orientOn(npc.g, dir, fwd);
  };
  const stepNpc = (toward, speed, dt) => {
    const f = tangentTo(npcDir, toward);
    if (!isFinite(f.x) || f.lengthSq() < 0.5) return;
    npcFwd.lerp(f, 0.25).normalize();
    stepDir(npcDir, npcFwd, speed * dt, pl.r); npcFwd.addScaledVector(npcDir, -npcFwd.dot(npcDir)).normalize();
    moveNpc(npcDir, npcFwd, Math.abs(Math.sin(d.t * 12)) * 0.25);
  };
  npc.face = false;

  const end = (won, text) => {
    if (d.over) return; d.over = true;
    w.group.remove(grp); w.duel = null; loc.duel = null;
    // the grab things go for good, so rematches don't pile up hidden pickups
    if (S.items) { for (const pk of S.items) { pk.taken = true; w.group.remove(pk.obj); } w.pickups = w.pickups.filter((pk) => !S.items.includes(pk)); }
    if (S.pad) { S.pad.remove(); S.pad = null; G.duelPad = false; if (!document.pointerLockElement && G.state === 'play') requestLock(); }
    // they hop back home
    puff(npc.g.position.clone(), 10, 0xffffff, 3, 1);
    npc.dir.copy(home); placeOn(npc.g, pl, home, 0); npc.g.quaternion.copy(homeQ); npc.face = true;
    puff(npc.g.position.clone(), 10, 0xffffff, 3, 1);
    if (won) { sfx.win(); banner(T.winTitle || 'YOU WIN!', loc.name, '#7dffb0'); onWin(); }
    else { sfx.warn(); onLose(text); }
  };

  // ---------- set up each game ----------
  const S = {};
  if (T.game === 'race') {
    S.to = T.to.clone(); S.flag = flagModel(T.color ?? 0xff5ab4); placeOn(S.flag, pl, S.to, 0); grp.add(S.flag);
    S.mk = makeMarker(grp, 2.0, T.color ?? 0xff5ab4); S.mk.place(pl, S.to);
  }
  if (T.game === 'simon' || T.game === 'hop') {
    const n = T.game === 'simon' ? 4 : (T.tiles ?? 6), r = T.game === 'simon' ? 3.4 : 5.2, cols = T.colors || COLS;
    const base = home.clone(), a0 = T.angle ?? 30;
    S.tiles = [];
    for (let i = 0; i < n; i++) {
      const dir = frameDir(base, latAt(pl, r), a0 + (i / n) * 360);
      const m = makeMarker(grp, T.game === 'simon' ? 1.4 : 1.3, T.game === 'simon' ? cols[i] : (T.color ?? 0x5cd85a)); m.place(pl, dir);
      m.userData.fill.material.opacity = 0.12;
      S.tiles.push({ dir, m });
    }
  }
  if (T.game === 'simon') {
    S.round = 0; S.seq = []; S.showI = 0; S.showT = 0.8; S.at = 0; S.lit = -1; S.litT = 0; d.phase = 'count'; S.showing = true;
    // the mouse is set free so you can click the buttons (the game doesn't pause for that)
    S.pad = makePad(T.colors || COLS, T.names || NAMES, (i) => press(i));
    G.duelPad = true; if (document.pointerLockElement) document.exitPointerLock();
  }
  if (T.game === 'hop') { S.cur = -1; S.last = -1; S.curT = 0; S.prize = T.model ? T.model() : null; if (S.prize) grp.add(S.prize); }
  if (T.game === 'grab') {
    S.items = [];
    for (let i = 0; i < (T.n ?? 12); i++) {
      const dir = frameDir(home, latAt(pl, 3 + Math.random() * 9), Math.random() * 360);
      const pk = w.addPickup(pl, dir, 0.8, 'side', { model: T.model(), radius: 1.3, spin: 2, onTake: () => { d.score++; sfx.coin(); ctxHud(); } });
      pk.obj.visible = false; pk.taken = true;   // they appear on GO
      S.items.push(pk);
    }
  }
  if (T.game === 'tag') { S.cool = 1.0; S.burst = 0; S.wig = Math.random() * 6; }
  if (T.game === 'dodge') { S.next = 0.6; S.shots = []; }
  const ctxHud = () => { if (w.hudRefresh) w.hudRefresh(); };

  // ---------- the bar at the top of the screen ----------
  const left = () => Math.max(0, Math.ceil((T.time ?? 0) - d.t));
  w.duel = {
    hud: (n) => {
      const vs = `⚔️ ${n ? 'Duel met' : 'Duel with'} ${loc.name}`;
      if (d.phase === 'count') return `${vs} &nbsp;· ${n ? 'klaar?' : 'ready?'}`;
      if (T.game === 'race') return `${vs} &nbsp;· 🏁 ${n ? 'Eerst bij de vlag!' : 'First to the flag!'}`;
      if (T.game === 'simon') return `${vs} &nbsp;· ${S.showing ? (n ? '👀 Kijk goed…' : '👀 Watch closely…') : (n ? `🕺 Jouw beurt! Knop ${S.at + 1} van ${S.seq.length}` : `🕺 Your turn! Press ${S.at + 1} of ${S.seq.length}`)} &nbsp;<b>${n ? 'ronde' : 'round'} ${S.round + 1} / ${T.rounds.length}</b>`;
      if (T.game === 'grab') return `${vs} &nbsp;· ${n ? 'Jij' : 'You'} <b>${d.score}</b> – <b>${d.them}</b> ${loc.name} &nbsp;⏱ ${left()}`;
      if (T.game === 'tag') return `${vs} &nbsp;· ${n ? 'Gepakt' : 'Caught'} <b>${d.score} / ${T.n}</b> &nbsp;⏱ ${left()}`;
      if (T.game === 'hop') return `${vs} &nbsp;· <b>${d.score}</b> / ${T.target} &nbsp;⏱ ${left()}`;
      if (T.game === 'dodge') return `${vs} &nbsp;· ${n ? 'Hou vol!' : 'Hang on!'} ⏱ <b>${left()}</b>`;
      return vs;
    },
  };
  loc.duel = { stop: () => end(false, null), goal: () => (S.to ? surf(pl, S.to, 0.5) : npc.g.position) };

  // ---------- every frame ----------
  let hudT = 0;
  d.update = (dt) => {
    if (d.over) return;
    if (G.cutscene) return;
    hudT -= dt; if (hudT <= 0) { hudT = 0.25; ctxHud(); }
    if (P.dead) { end(false, T.lost); return; }
    if (P.planet !== pl) { end(false, null); return; }
    // walking far away gives up the duel (not during a race: that's the point)
    // (dodging means running around a lot, so that one gets more room, and you get a warning first)
    const far = arc(pl, P.up, home), max = T.game === 'dodge' ? 40 : 24;
    if (T.game !== 'race' && far > max - 6 && G.toastOnce) G.toastOnce('duelFar', 'Careful! Walk any further and you give up the duel.');
    if (T.game !== 'race' && far > max) { toast('You walked away from the duel…', 2000); end(false, null); return; }

    if (d.phase === 'count') {
      const before = Math.ceil(d.count); d.count -= dt; const now = Math.ceil(d.count);
      if (now !== before && now > 0) { toast(String(now), 700); sfx.move(); }
      if (d.count <= 0) {
        d.phase = 'go'; toast('GO!', 900); sfx.select();
        if (T.game === 'grab') for (const pk of S.items) { pk.taken = false; pk.obj.visible = true; puff(pk.obj.position.clone(), 4, T.color ?? 0xffd23a, 2, 0.5); }
        if (T.game === 'simon') nextRound();
      }
      return;
    }
    d.t += dt;
    games[T.game](dt);
  };

  // RACE: they run straight for the flag; you have to sprint (and jump over things) to get there first
  games.race = (dt) => {
    S.mk.pulse(d.t * 8); S.flag.userData.flag.rotation.y = Math.sin(d.t * 6) * 0.3;
    stepNpc(S.to, T.speed ?? 7.6, dt);
    if (arc(pl, P.up, S.to) < 1.8) { end(true); return; }
    if (arc(pl, npcDir, S.to) < 1.0) end(false, T.lost);
  };
  // SIMON: they show a sequence on the tiles, you step on them in the same order
  function nextRound() {
    S.seq = []; for (let i = 0; i < T.rounds[S.round]; i++) { let k; do k = Math.floor(Math.random() * 4); while (S.seq.length && k === S.seq[S.seq.length - 1]); S.seq.push(k); }
    S.showing = true; S.showI = 0; S.showT = 0.9; S.at = 0;
  }
  const flash = (i, time = 0.45) => { S.lit = i; S.litT = time; beep(i); puff(surf(pl, S.tiles[i].dir, 0.3), 8, (T.colors || COLS)[i], 3, 0.8, S.tiles[i].dir); };
  // you press a button (click or 1-4): only counts when it's your turn
  function press(i) {
    if (d.over || d.phase !== 'go' || S.showing || G.paused || G.cutscene) return;
    if (i === S.seq[S.at]) {
      flash(i, 0.3); S.at++; ctxHud();
      if (S.at >= S.seq.length) {
        S.round++;
        if (S.round >= T.rounds.length) { end(true); return; }
        sfx.quest(); toast(`Round ${S.round + 1}!`, 1200); S.showing = true; S.showI = 0; S.showT = 1.4; nextRoundSoon();
      }
    } else { sfx.hurt(); end(false, T.lost); }
  }
  games.simon = (dt) => {
    S.litT -= dt;
    S.tiles.forEach((tl, i) => { const on = i === S.lit && S.litT > 0; tl.m.userData.fill.material.opacity = on ? 0.85 : 0.12; tl.m.pulse(d.t * 3 + i); S.pad.light(i, on); });
    S.pad.wait(S.showing);
    if (S.showing) {
      // they dance to each tile in turn
      const k = S.seq[S.showI];
      if (k !== undefined) stepNpc(S.tiles[k].dir, 9, dt);
      S.showT -= dt;
      if (S.showT <= 0) {
        if (S.showI < S.seq.length) { const k = S.seq[S.showI]; flash(k, 0.7); toast(`${S.showI + 1}. ${tr((T.names || NAMES)[k])}`, 650); S.showI++; S.showT = T.speed ?? 0.75; }
        else { S.showing = false; toast('Your turn! Press the buttons in the same order (or keys 1 2 3 4).', 2400); }
      }
      return;
    }
    stepNpc(home, 5, dt);
  };
  const nextRoundSoon = () => { const r = S.round; S.seq = []; for (let i = 0; i < T.rounds[r]; i++) { let k; do k = Math.floor(Math.random() * 4); while (S.seq.length && k === S.seq[S.seq.length - 1]); S.seq.push(k); } S.at = 0; };
  // GRAB: things are scattered round them; they grab too
  games.grab = (dt) => {
    const live = S.items.filter((pk) => !pk.taken);
    if (live.length) {
      let best = null, bd = 1e9;
      for (const pk of live) { const dd = arc(pl, npcDir, pk.dir); if (dd < bd) { bd = dd; best = pk; } }
      stepNpc(best.dir, T.speed ?? 5.2, dt);
      if (bd < 0.9) { best.taken = true; best.obj.visible = false; d.them++; sfx.blip(380); puff(best.obj.position.clone(), 5, T.color ?? 0xffd23a, 2, 0.5); ctxHud(); }
    }
    if (!S.items.some((pk) => !pk.taken) || d.t >= T.time) {
      for (const pk of S.items) { pk.taken = true; pk.obj.visible = false; }
      if (d.score > d.them) end(true); else end(false, d.score === d.them ? T.tie || T.lost : T.lost);
    }
  };
  // TAG: they run away from you, zigzagging. Touch them!
  games.tag = (dt) => {
    S.cool -= dt; S.burst -= dt;
    const away = tangentTo(npcDir, P.up).negate();
    const side = new THREE.Vector3().crossVectors(npcDir, away).multiplyScalar(Math.sin(d.t * 2 + S.wig) * 0.8);
    const target = stepDir(npcDir.clone(), away.add(side).normalize(), 3, pl.r);
    // they stay near home: if they get too far, they curve back
    if (arc(pl, npcDir, home) > 14) target.copy(home);
    const close = arc(pl, P.up, npcDir);
    stepNpc(target, (S.burst > 0 ? 11 : close < 6 ? (T.speed ?? 6.4) : 3.5), dt);
    if (S.cool <= 0 && close < 1.5 && P.alt < 2) {
      d.score++; S.cool = 1.2; S.burst = 0.9; sfx.stomp(); puff(npc.g.position.clone(), 14, 0xffffff, 4, 1.2); ctxHud();
      toast(d.score >= T.n ? 'GOTCHA!' : `Gotcha! ${T.n - d.score} more!`, 1000);
      if (d.score >= T.n) { end(true); return; }
    }
    if (d.t >= T.time) end(false, T.lost);
  };
  // HOP: one tile lights up at a time. Get there before it goes out
  games.hop = (dt) => {
    S.curT -= dt;
    const win = Math.max(1.2, (T.window ?? 2.4) - d.t * 0.04);
    if (S.cur < 0 || S.curT <= 0) {
      let k; do k = Math.floor(Math.random() * S.tiles.length); while (k === S.cur || k === S.last); S.cur = k; S.curT = win; sfx.blip(900);
    }
    const tl = S.tiles[S.cur];
    S.tiles.forEach((x, i) => { x.m.userData.fill.material.opacity = i === S.cur ? 0.3 + 0.5 * (S.curT / win) : 0.08; x.m.pulse(i === S.cur ? d.t * 14 : 0); });
    if (S.prize) { placeOn(S.prize, pl, tl.dir, 0.6 + Math.sin(d.t * 6) * 0.15); S.prize.rotation.y += dt * 3; }
    stepNpc(tl.dir, 3.5, dt);   // they cheer you on, running after the light
    if (arc(pl, P.up, tl.dir) < 1.4 && P.alt < 2.5) {
      d.score++; S.last = S.cur; S.cur = -1; sfx.coin(); puff(surf(pl, tl.dir, 0.4), 10, T.color ?? 0x5cd85a, 3, 0.8, tl.dir); ctxHud();
      if (d.score >= T.target) { end(true); return; }
    }
    if (d.t >= T.time) end(false, T.lost);
  };
  // DODGE: they throw things at where you are; a red circle shows where it lands. One hit and you lose
  games.dodge = (dt) => {
    S.next -= dt;
    const close = arc(pl, npcDir, P.up);
    stepNpc(close < 7 ? stepDir(npcDir.clone(), tangentTo(npcDir, P.up).negate(), 3, pl.r) : P.up, 3, dt);
    if (S.next <= 0) {
      const every = Math.max(0.45, (T.every ?? 0.9) - d.t * 0.02);
      S.next = every;
      const lead = P.vt.clone().multiplyScalar(0.55);
      const at = stepDir(P.up.clone(), lead.lengthSq() > 1e-4 ? lead.clone().normalize() : tangentTo(P.up, npcDir), lead.length(), pl.r);
      const spot = Math.random() < 0.35 ? frameDir(at, latAt(pl, 1.5 + Math.random() * 2), Math.random() * 360) : at;
      const m = makeMarker(grp, 1.3, T.color ?? 0xff3a5a); m.place(pl, spot);
      const obj = T.model(); grp.add(obj);
      S.shots.push({ dir: spot, m, obj, t: 0, fly: T.fly ?? 1.0, from: npcDir.clone() });
      sfx.swing();
    }
    for (const s of S.shots) {
      s.t += dt; const k = Math.min(1, s.t / s.fly);
      const dir = s.from.clone().lerp(s.dir, k).normalize();
      placeOn(s.obj, pl, dir, 1.2 + Math.sin(k * Math.PI) * 5 * (1 - k * 0.2) - k * 1.2); s.obj.rotation.x += dt * 8;
      s.m.pulse(s.t * 12);
      if (k >= 1 && !s.done) {
        s.done = true; grp.remove(s.obj, s.m); puff(surf(pl, s.dir, 0.3), 10, T.color ?? 0xff3a5a, 3, 0.8, s.dir); sfx.thud();
        if (arc(pl, P.up, s.dir) < 1.25 && P.alt < 1.3) { bouncePlayer(10); end(false, T.lost); return; }
      }
    }
    S.shots = S.shots.filter((s) => !s.done);
    if (d.t >= T.time) end(true);
  };
  return d;
}

// little models for the duels
export const duelModels = {
  ball: () => { const g = new THREE.Group(); mk(new THREE.SphereGeometry(0.32, 12, 10), toon(0xfff8ec), 0, 0, 0, g, 1.1); mk(new THREE.TorusGeometry(0.32, 0.03, 5, 16), basic(0xe03a3a), 0, 0, 0, g, 0).rotation.y = Math.PI / 2; return g; },
  lemon: () => { const g = new THREE.Group(); const l = mk(new THREE.SphereGeometry(0.32, 12, 10), toon(0xffe14a), 0, 0, 0, g, 1.1); l.scale.set(1, 0.8, 0.8); mk(new THREE.SphereGeometry(0.1, 8, 6), toon(0x5cc84a), 0.3, 0.05, 0, g, 0); return g; },
  clover: () => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; mk(new THREE.SphereGeometry(0.22, 10, 8), toon(0x5cd85a), Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22, g, 1.1).scale.y = 0.4; } return g; },
  pearl: () => { const g = new THREE.Group(); mk(new THREE.SphereGeometry(0.3, 14, 10), toon(0xfff4f8), 0, 0, 0, g, 1.1); mk(new THREE.SphereGeometry(0.08, 8, 6), basic(0xffffff), -0.1, 0.12, 0.2, g, 0); return g; },
  rock: () => { const g = new THREE.Group(); mk(new THREE.DodecahedronGeometry(0.4, 0), toon(0x3a3038), 0, 0, 0, g, 1.1); mk(new THREE.SphereGeometry(0.2, 8, 6), basic(0xff7a2a), 0, 0, 0.25, g, 0); return g; },
};
