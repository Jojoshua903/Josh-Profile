'use strict';
/* =========================================================
   RENAS'S PAID SCOOTER STOPS · fast travel with no menu box
   · every call bell is a Stadium Signpost. Locked: folded down,
     a blinking yellow toll meter on the post and Renas's
     cardboard sign (NO FREE RIDES — PAY TO UNLOCK). Walking past
     marks it on the map (grey scooter · cyan once paid).
   · ▲ at a locked post pays the toll once: bolts fly into the
     meter, KA-CHING, the sign flips upright with its zone plaque
     and Renas power-slides in for the first time. Too poor: the
     meter buzzes red and Renas yells over the intercom.
   · ▲ at an open post: Renas pulls up, Nathan hops on the back.
     ▲ / ▼ flip the signpost arrow between open stops, ENTER /
     SPACE / jump peels out, ESC / dash hops back off.
   · the ride: a 0.6 s wheelie peel-out, a 1.8 s tunnel up the
     inner Spire (attack / jump honks the airhorn), and a 0.7 s
     power-slide arrival where Nathan hops off
   · capacitors to Renas (Sibling Rivalry): every stop not yet
     bought costs half, the exhaust burns electric blue and
     Nathan leaves a speed trail after each drop-off
   · on the upper pages each stop also has the outfit locker,
     Deniz's kettle and Josh's fold-out workbench beside it
   Loaded on every story page after zone/caravan.js.
   ========================================================= */
const TOLLS = { z1: 0, z2: 100, z3: 125, z4: 150, z5: 200, z6: 250, z7: 300, z8: 350, z9: 500 };
const tollOf = id => { const p = TOLLS[id] || 0; return Save.data.q.rivalry === 'renas' ? Math.round(p / 2 / 5) * 5 : p; };
const trTurbo = () => Save.data.q.rivalry === 'renas';
const RIDE = { room: null, bell: null, R: null, dial: null, ride: false, fx: [], bark: null, trail: 0, pad: {}, arrive: null };
const trSeen = () => (Save.data.q.stopSeen = Save.data.q.stopSeen || {});
const trStops = here => Object.keys(ZONES).filter(id => !ZONES[id].secret && Save.data.bells[id] && id !== here);

/* ---------- little synth sounds through the game's own mixer ---------- */
function trTone(f, dur, type, v, slide, delay = 0) {
  const A = SFX.audio && SFX.audio(); if (!A) return;
  const { ctx: ac, out } = A, t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.02);
}
const trKaChing = () => { trTone(1318, 0.12, 'square', 0.05); trTone(1760, 0.5, 'triangle', 0.07, null, 0.08); trTone(2637, 0.4, 'sine', 0.04, null, 0.1); SFX.buy(); };
const trHonk = () => { for (const d of [0, 0.22]) { trTone(330, 0.18, 'sawtooth', 0.07, null, d); trTone(415, 0.18, 'sawtooth', 0.05, null, d); } };
const trBuzz = () => { trTone(110, 0.35, 'square', 0.05); SFX.deny(); };

/* ---------- where Renas parks: the side of the post with the most flat floor ---------- */
function trSide(b) {
  if (b.trSide) return b.trSide;
  const tx0 = Math.floor(b.x / TILE), r = Math.round(b.y / TILE);
  const score = s => { let n = 0; for (let k = 1; k <= 12; k++) { if (trFlat(tx0 + s * k, r)) n++; else break; } return n; };
  return (b.trSide = score(-1) > score(1) ? -1 : 1);
}
function trFlat(tx, r) { const g = tileAt(tx, r); return (g === 1 || g === 3) && tileAt(tx, r - 1) === 0 && tileAt(tx, r - 2) === 0 && tileAt(tx, r - 3) === 0; }
const trStopX = b => b.x + trSide(b) * 70;

/* ---------- the scooter: one per room, parked at its post ---------- */
function trScooter(b, from) {
  const side = trSide(b), x = trStopX(b);
  RIDE.R = { b, x, x0: from ? x + side * 900 : x, floor: b.y, dir: -side, st: from ? 'in' : 'idle', k: 0, rider: false, wheelie: 0, puff: 0, gog: 0 };
  if (from) { RIDE.R.x = RIDE.R.x0; SFX.scooter(); }
  return RIDE.R;
}
function trHideRenasNPC() { const n = NPCs.find(n => n.kind === 'renas' && !n.trSkip); if (n) n.trSkip = true; }

/* ---------- room changes: perks, arrivals, Renas at camp ---------- */
function trSync() {
  if (Zone.room !== RIDE.room) {
    RIDE.room = Zone.room; RIDE.R = null; RIDE.dial = null; RIDE.fx.length = 0;
    RIDE.bell = NPCs.find(n => n.kind === 'bell') || null;
    if (RIDE.arrive) {
      const b = NPCs.find(n => n.kind === 'bell' && n.zone === RIDE.arrive);
      if (b) { trScooter(b, true).rider = true; Player.hidden = true; Input.enabled = false; Player.invuln = Math.max(Player.invuln, 2); }
      else { Player.hidden = false; Input.enabled = true; RIDE.ride = false; window.EI_RIDE = false; }   // no post in this room: just drop him off
      RIDE.arrive = null;
    }
  }
  // a bench rest rebuilds the room's NPCs: follow the new signpost
  const nb = NPCs.find(n => n.kind === 'bell') || null;
  if (nb !== RIDE.bell) { RIDE.bell = nb; if (RIDE.R && nb && RIDE.R.b.zone === nb.zone) RIDE.R.b = nb; }
  if (RIDE.bell && PAGE.id !== 'z1' && !NPCs.some(n => n.trPerk)) trPerks(RIDE.bell);
}
function trPerks(b) {
  const D = Save.data, side = trSide(b), tx0 = Math.floor(b.x / TILE), r = Math.round(b.y / TILE);
  const want = [() => new OutfitLocker(0, 0)];
  if (D.denizDead) want.push(() => new TrKettle(0, 0));
  if (D.josh) want.push(() => new TrBench(0, 0));
  let k = 3;
  for (const make of want) {
    while (k <= 14 && !(trFlat(tx0 - side * k, r) && trFlat(tx0 - side * (k + 1), r))) k++;
    if (k > 14) break;
    const n = make(); n.x = (tx0 - side * k) * TILE + TILE / 2; n.y = r * TILE; n.trPerk = true; NPCs.push(n);
    k += 3;
  }
  if (!NPCs.some(n => n.trPerk)) NPCs.push({ trPerk: true, update() {}, draw() {} });   // nothing fits: don't try every frame
}

/* ---------- perks beside the stops ---------- */
class TrKettle {
  constructor(x, y) { Object.assign(this, { kind: 'kettle', x, y, t: 0, near: false, gone: false }); }
  update(dt) { this.t += dt; const c = Player.center(); this.near = !Player.dead && Math.abs(c.x - this.x) < 28 && Math.abs(Player.y + Player.h - this.y) < 20; }
  interact() {
    if (Story.active) return;
    const q = Save.data.q;
    if (q.brew) { SFX.deny(); toast('"THE THERMOS IS ALREADY FULL, MAN. DRINK IT FIRST." · DENIZ'); return; }
    q.brew = 1; saveGame(); SFX.buy();
    for (let k = 0; k < 8; k++) spawnParticle({ x: this.x + rand(-6, 6), y: this.y - 30, vx: rand(-20, 20), vy: rand(-80, -40), life: 1, size: rand(3, 6), color: 'rgba(243,234,216,.5)', type: 'dot' });
    toast('CHILL BREW THERMOS REFILLED · "SMOOTH CORNERS, RENAS." · DENIZ');
  }
  draw() {
    const x = this.x, y = this.y, t = this.t;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.fillStyle = INK; ctx.fillRect(x - 14, y - 12, 4, 12); ctx.fillRect(x + 10, y - 12, 4, 12);   // a camping stove
    rr(x - 16, y - 16, 32, 5, 2); inked('#5c6470', 2);
    ctx.fillStyle = `rgba(111,211,255,${0.6 + Math.sin(t * 9) * 0.2})`; ctx.beginPath(); ctx.ellipse(x, y - 17, 8, 2, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y - 28, 12, 10, 0, 0, 7); inked('#c9a33a', 2.5);
    ctx.beginPath(); ctx.moveTo(x + 10, y - 30); ctx.lineTo(x + 19, y - 37); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - 39, 3, 0, 7); inked(INK, 1);
    ctx.strokeStyle = 'rgba(243,234,216,.45)'; ctx.lineWidth = 2;
    for (let k = 0; k < 2; k++) { const s = (t * 0.7 + k * 0.5) % 1; ctx.globalAlpha = 1 - s; ctx.beginPath(); ctx.moveTo(x + 19, y - 38 - s * 26); ctx.quadraticCurveTo(x + 25, y - 44 - s * 26, x + 19, y - 50 - s * 26); ctx.stroke(); }
    ctx.restore();
    if (this.near && !Story.active) gxPrompt(Save.data.q.brew ? 'CHILL BREW · FULL' : 'REFILL CHILL BREW', x, y - 66);
  }
}
class TrBench {
  constructor(x, y) { Object.assign(this, { kind: 'trbench', x, y, t: 0, near: false, gone: false }); }
  update(dt) { this.t += dt; const c = Player.center(); this.near = !Player.dead && Math.abs(c.x - this.x) < 34 && Math.abs(Player.y + Player.h - this.y) < 20; }
  interact() { if (!Story.active) openShop('josh'); }
  draw() {
    const x = this.x, y = this.y, t = this.t;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.lineTo(x + 14, y - 26); ctx.moveTo(x + 24, y); ctx.lineTo(x - 14, y - 26); ctx.stroke();   // folding legs
    rr(x - 28, y - 32, 56, 7, 2); inked('#6b4a30', 2.5);
    rr(x - 22, y - 50, 18, 15, 2); inked('#2d3b4a', 2);
    ctx.fillStyle = `rgba(111,211,255,${0.55 + Math.sin(t * 6) * 0.15})`; ctx.fillRect(x - 19, y - 47, 12, 9);
    ctx.fillStyle = INK; ctx.fillRect(x + 4, y - 38, 16, 4); ctx.fillRect(x + 16, y - 44, 3, 8);   // a soldering iron
    ctx.fillStyle = Math.sin(t * 5) > 0 ? '#ff8a2a' : '#ffd27a'; ctx.beginPath(); ctx.arc(x + 17, y - 45, 1.6, 0, 7); ctx.fill();
    ctx.font = `8px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = BONE; ctx.fillText('JOSH · FOLD-OUT', x, y - 54);
    ctx.restore();
    if (this.near && !Story.active) gxPrompt('JOSH\'S WORKBENCH', x, y - 74);
  }
}

/* ---------- the Stadium Signpost ---------- */
CallBell.prototype.update = function (dt) {
  this.t += dt; this.flip = Math.min(1, (this.flip === undefined ? (Save.data.bells[this.zone] ? 1 : 0) : this.flip) + (this.flipOn ? dt / 0.5 : 0));
  this.red = Math.max(0, (this.red || 0) - dt); this.flash = Math.max(0, (this.flash || 0) - dt); this.dflip = Math.max(0, (this.dflip || 0) - dt);
  const c = Player.center(), D = Save.data;
  this.near = !RIDE.ride && !RIDE.dial && Math.abs(c.x - this.x) < 46 && Math.abs(Player.y + Player.h - this.y) < 26;
  if (Math.abs(c.x - this.x) < 160 && Math.abs(Player.y + Player.h - this.y) < 60) {
    const fresh = !trSeen()[this.zone], free = D.chase && !TOLLS[this.zone] && !D.bells[this.zone];
    if (fresh || free) {
      trSeen()[this.zone] = 1;
      if (free) { D.bells[this.zone] = 1; this.flip = 1; }
      saveGame();
      toast(D.bells[this.zone] ? 'SCOOTER STOP · RENAS PICKS YOU UP HERE' : D.chase ? `SCOOTER STOP FOUND · LOCKED · ${tollOf(this.zone)} BOLTS TO OPEN` : 'A FOLDED-DOWN STADIUM SIGNPOST');
    }
  }
};
CallBell.prototype.draw = function () {
  const x = this.x, y = this.y, D = Save.data, t = Game.time, open = !!D.bells[this.zone], side = trSide(this);
  const k = this.flip === undefined ? (open ? 1 : 0) : this.flip, e = k * k * (3 - 2 * k), plate = this.zone === 'z9' ? 'VIP EXPRESS' : (ZONES[this.zone] ? ZONES[this.zone].name.replace(/^The /, '').toUpperCase() : 'STOP');
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the post
  ctx.fillStyle = INK; ctx.fillRect(x - 4, y - 112, 8, 112);
  ctx.fillStyle = '#6b6f7a'; ctx.fillRect(x - 2, y - 110, 4, 108);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y - 114, 5, 0, 7); ctx.fill();
  // the arrow board: hangs folded down the post until the toll is paid, then swings up level
  const ang = (1 - e) * 1.32, dir = RIDE.dial && RIDE.dial.b === this ? RIDE.R ? RIDE.R.dir : -side : -side;
  ctx.save(); ctx.translate(x, y - 104); ctx.scale(dir, 1); ctx.rotate(ang);
  const sq = this.dflip > 0 ? Math.abs(Math.cos((1 - this.dflip / 0.25) * Math.PI)) : 1;   // the arrow flips to the next stop
  ctx.scale(1, sq);
  ctx.beginPath(); ctx.moveTo(-14, -11); ctx.lineTo(80, -11); ctx.lineTo(94, 0); ctx.lineTo(80, 11); ctx.lineTo(-14, 11); ctx.closePath();
  inked(open && e > 0.5 ? '#1d2a3a' : '#4a4038', 2.5);
  if (open && e > 0.5) {
    ctx.save(); ctx.globalAlpha = (e - 0.5) * 2; ctx.shadowColor = '#6fe3ff'; ctx.shadowBlur = 10; ctx.strokeStyle = 'rgba(111,227,255,.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(78, -8); ctx.lineTo(89, 0); ctx.lineTo(78, 8); ctx.lineTo(-10, 8); ctx.closePath(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.scale(dir, 1); ctx.font = `10px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#bff3ff';
    const label = RIDE.dial && RIDE.dial.b === this ? (RIDE.dial.list.length ? ZONES[RIDE.dial.list[RIDE.dial.i]].name.replace(/^The /, '').toUpperCase() : 'NO OTHER STOPS') : plate;
    ctx.fillText(label.length > 18 ? label.slice(0, 17) + '…' : label, dir * 38, 0); ctx.restore();
  } else {
    ctx.strokeStyle = 'rgba(13,11,16,.4)'; ctx.lineWidth = 1.5; for (const sx of [20, 46, 70]) { ctx.beginPath(); ctx.moveTo(sx, -9); ctx.lineTo(sx + 4, 9); ctx.stroke(); }
  }
  ctx.restore();
  // the toll meter
  const mx = x + side * -2, my = y - 62;
  rr(mx - 10, my - 16, 20, 30, 3); inked(open ? '#5c6470' : '#e0b030', 2.5);
  const blink = open ? 1 : Math.sin(t * 5) > 0 ? 1 : 0.25;
  ctx.fillStyle = this.red > 0 ? (Math.sin(t * 40) > 0 ? '#ff3b30' : '#5a1a14') : open ? '#7dff9a' : `rgba(255,214,80,${blink})`;
  ctx.beginPath(); ctx.arc(mx, my - 8, 3.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#141018'; rr(mx - 7, my - 2, 14, 7, 1); ctx.fill();
  ctx.font = `7px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = this.red > 0 ? '#ff6a5a' : open ? '#7dff9a' : '#ffd650';
  ctx.fillText(this.red > 0 ? 'NO $' : open ? 'PAID' : String(tollOf(this.zone)), mx, my + 4);
  ctx.fillStyle = INK; ctx.fillRect(mx - 4, my + 9, 8, 2);                                                   // coin slot
  if (this.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,214,80,${this.flash})`; ctx.beginPath(); ctx.arc(mx, my, 26, 0, 7); ctx.fill(); ctx.restore(); }
  // Renas's cardboard sign, propped against the post
  if (!open || e < 1) {
    ctx.save(); ctx.globalAlpha = 1 - e; ctx.translate(x - side * 26, y); ctx.rotate(-side * 0.12);
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-20, -40); ctx.lineTo(21, -42); ctx.lineTo(22, 0); ctx.closePath(); inked('#b8925a', 2);
    ctx.font = `8px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#2a1a10';
    ctx.fillText('NO FREE', 0, -30); ctx.fillText('RIDES —', 0, -21); ctx.fillStyle = '#b8283c'; ctx.fillText('PAY TO', 0, -12); ctx.fillText('UNLOCK', 0, -3);
    ctx.restore();
  }
  ctx.restore();
  // the prompt
  if (this.near && !Story.active && !UI.modal) {
    const p = !D.chase ? 'RING' : open ? 'CALL RENAS' : `PAY ${tollOf(this.zone)} SCRAP BOLTS TO UNLOCK STOP`;
    ctx.save(); ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
    ctx.fillText('[ ' + Bindings.label('up', Game.lastInput) + ' ] ' + p, x, y - 140 + Math.sin(t * 4) * 2);
    ctx.restore();
  }
};

/* ---------- ▲ at the post: pay, call or board ---------- */
const _trRing = ringBell;
ringBell = function (b) {
  const D = Save.data;
  if (!D.chase) return _trRing(b);
  if (RIDE.ride || RIDE.dial || Story.active) return;
  if (!D.bells[b.zone]) { trPay(b); return; }
  if (RIDE.R && RIDE.R.b === b && RIDE.R.st === 'idle') { trBoard(); return; }
  if (!RIDE.R || RIDE.R.b !== b) { trScooter(b, true).then = 'board'; trHideRenasNPC(); }
};
function trPay(b) {
  const D = Save.data, price = tollOf(b.zone);
  if (D.bolts < price) {
    b.red = 0.9; trBuzz(); addShake(2);
    pop(b.x, b.y - 100, 'INSUFFICIENT FUNDS', { size: 22, burst: false, color: '#ff6a5a', vy: -40 });
    RIDE.bark = { who: 'RENAS · INTERCOM', text: 'Come back when your pockets aren\'t empty, rookie!', x: b.x, y: b.y - 150, t: 2.6 };
    return;
  }
  D.bolts -= price; D.bells[b.zone] = 1; saveGame();
  const c = Player.center();
  for (let k = 0; k < Math.min(14, 4 + Math.round(price / 40)); k++) RIDE.fx.push({ x: c.x, y: c.y - 10, tx: b.x, ty: b.y - 58, t: -k * 0.045, dur: 0.45, ox: rand(-60, 60), oy: rand(-90, -40) });
  setTimeout(() => {
    trKaChing(); b.flash = 0.6; addShake(3);
    pop(b.x, b.y - 96, 'KA-CHING!', { size: 34, color: GOLD });
    b.flipOn = true; SFX.unlock();
    toast(`SCOOTER STOP UNLOCKED · ${ZONES[b.zone] ? ZONES[b.zone].name.toUpperCase() : ''} · EVERY RIDE FROM HERE IS FREE`);
  }, 700);
  setTimeout(() => {
    if (Zone.room !== RIDE.room) return;
    trScooter(b, true).then = 'greet'; trHideRenasNPC();
  }, 1300);
}
function trBoard() {
  const R = RIDE.R; if (!R) return;
  const here = R.b.zone, list = trStops(here);
  R.st = 'board'; R.k = 0; R.rider = false; Input.enabled = false; Input.clear && Input.clear();
  Player.invuln = Math.max(Player.invuln, 1); SFX.jump();
  RIDE.dial = { b: R.b, list, i: 0, hopT: 0.25, at: performance.now() };
  if (!list.length) RIDE.bark = { who: 'RENAS', text: 'Nowhere else to go yet, rookie. Unlock another stop!', x: R.x, y: R.floor - 120, t: 2.4 };
  else RIDE.bark = { who: 'RENAS', text: ['Where to? Flip the sign.', 'Hold on tight. Not THAT tight.', 'Engine\'s warm. Pick a stop!'][(Math.random() * 3) | 0], x: R.x, y: R.floor - 120, t: 2 };
}
function trHopOff() {
  const R = RIDE.R; RIDE.dial = null;
  if (R) { R.rider = false; R.st = 'idle'; Player.x = R.x - R.dir * 40 - Player.w / 2; }
  Player.hidden = false; Player.vy = -260; Input.enabled = true; Input.clear && Input.clear(); SFX.land();
}
function trDialMove(d) {
  const T = RIDE.dial; if (!T || !T.list.length) return;
  T.i = (T.i + d + T.list.length) % T.list.length; T.b.dflip = 0.25; SFX.ui();
  if (RIDE.R) RIDE.R.rev = 0.4;
}
function trGo() {
  const T = RIDE.dial, R = RIDE.R; if (!T || !R || !T.list.length) { SFX.deny(); return; }
  RIDE.dial = null; RIDE.ride = T.list[T.i]; window.EI_RIDE = true;
  R.st = 'peel'; R.k = 0; R.gog = 1; SFX.scooter(); SFX.whoosh && SFX.whoosh();
}

/* ---------- input while Nathan is on the scooter (the game's own input is off) ---------- */
addEventListener('keydown', e => {
  if (!RIDE.dial && !RIDE.tunnel) return;
  if (e.key === 'F11') return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.repeat) return;
  const a = typeof KEYMAP !== 'undefined' ? KEYMAP[e.code] : null;
  if (RIDE.tunnel) { if (a === 'attack' || a === 'jump' || e.code === 'Space') RIDE.tunnel.honk(); return; }
  if (performance.now() - RIDE.dial.at < 300) return;
  if (a === 'up' || e.code === 'ArrowUp' || e.code === 'KeyW') trDialMove(-1);
  else if (a === 'down' || e.code === 'ArrowDown' || e.code === 'KeyS') trDialMove(1);
  else if (e.code === 'Enter' || e.code === 'Space' || a === 'jump') trGo();
  else if (e.code === 'Escape' || e.code === 'Backspace' || a === 'dash' || a === 'ball') trHopOff();
}, true);
function trPadPoll() {
  if (!RIDE.dial && !RIDE.tunnel) return;
  const g = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p) : null; if (!g) return;
  const B = i => !!(g.buttons[i] && g.buttons[i].pressed), ax = g.axes[1] || 0;
  const now = { up: B(12) || ax < -0.6, down: B(13) || ax > 0.6, go: B(0), back: B(1), honk: B(0) || B(2) };
  const P = RIDE.pad, edge = k => now[k] && !P[k];
  if (RIDE.tunnel) { if (edge('honk')) RIDE.tunnel.honk(); }
  else if (performance.now() - RIDE.dial.at > 300) {
    if (edge('up')) trDialMove(-1); else if (edge('down')) trDialMove(1); else if (edge('go')) trGo(); else if (edge('back')) trHopOff();
  }
  RIDE.pad = now;
}

/* ---------- every frame ---------- */
const _trTick = PAGE.tick;
PAGE.tick = function (dt) {
  if (_trTick) _trTick.call(this, dt);
  trSync(); trPadPoll();
  // safety net: Nathan is only ever hidden while he's on the scooter. If the scooter is gone
  // (a warp, a death or a bench mid-ride cleared it), put him back and hand over the controls.
  const onBoard = RIDE.tunnel || RIDE.arrive || RIDE.dial || (RIDE.R && (RIDE.R.rider || RIDE.R.st === 'board'));
  if (Player.hidden && !onBoard) {
    Player.hidden = false; RIDE.ride = false; window.EI_RIDE = false;
    if (!Story.active) { Input.enabled = true; Input.clear && Input.clear(); }
  }
  for (const f of RIDE.fx) f.t += dt; RIDE.fx = RIDE.fx.filter(f => f.t < f.dur);
  if (RIDE.bark) { RIDE.bark.t -= dt; if (RIDE.bark.t <= 0) RIDE.bark = null; }
  if (RIDE.trail > 0) {
    RIDE.trail -= dt;
    if (Player.onGround && Math.abs(Player.vx) > 40) for (let k = 0; k < 2; k++) spawnParticle({ x: Player.x + Player.w / 2 + rand(-6, 6), y: Player.y + Player.h - 2, vx: -Player.vx * 0.15, vy: rand(-30, -5), life: 0.45, size: rand(2, 4), color: Math.random() < 0.5 ? '#6fe3ff' : '#bff3ff', type: 'dot' });
  }
  const R = RIDE.R; if (!R) return;
  R.k += dt; R.rev = Math.max(0, (R.rev || 0) - dt);
  if (R.st === 'in') {
    // the power-slide: bursts in, drifts sideways to a stop in blue-white friction sparks
    const u = Math.min(1, R.k / 0.7), e = 1 - Math.pow(1 - u, 3);
    R.x = R.x0 + (trStopX(R.b) - R.x0) * e; R.drift = Math.sin(u * Math.PI) * 0.22;
    if (u > 0.35) for (let k = 0; k < 3; k++) spawnParticle({ x: R.x + R.dir * rand(-18, 18), y: R.floor - 2, vx: -R.dir * rand(120, 360), vy: rand(-200, -40), life: 0.35, size: rand(1.5, 3), color: Math.random() < 0.5 ? '#bff3ff' : '#ffffff', type: 'spark' });
    if (u >= 1) {
      R.st = 'idle'; R.k = 0; R.drift = 0; addShake(3); SFX.land();
      if (R.rider) {   // arriving with Nathan: he hops off onto the platform
        R.rider = false; Player.hidden = false;
        Player.x = R.x - R.dir * 44 - Player.w / 2; Player.y = R.floor - Player.h - 2; Player.vy = -300; Player.facing = -R.dir;
        Input.enabled = true; Input.clear && Input.clear(); SFX.jump();
        if (trTurbo()) RIDE.trail = 3;
        RIDE.bark = { who: 'RENAS', text: ['Last stop! Everybody off!', 'Told you. Mostly on time.', 'Tip your driver. In bolts.'][(Math.random() * 3) | 0], x: R.x, y: R.floor - 120, t: 1.8 };
        try { sessionStorage.removeItem('ei_ride'); } catch (e) { /* */ }
      }
      if (R.then === 'greet') RIDE.bark = { who: 'RENAS', text: 'Pleasure doing business with ya!', x: R.x, y: R.floor - 120, t: 2.4 };
      if (R.then === 'board') trBoard();
      R.then = null;
    }
  } else if (R.st === 'board') {
    if (R.k >= 0.25) { R.st = 'dial'; R.rider = true; Player.hidden = true; }
  } else if (R.st === 'peel') {
    // the wheelie peel-out: goggles down, front wheel up 15°, gone
    R.wheelie = Math.min(0.26, R.k / 0.18 * 0.26);
    const sp = R.k < 0.15 ? 0 : (R.k - 0.15) * 2600;
    R.x += R.dir * sp * dt;
    if (Math.random() < 0.8) spawnParticle({ x: R.x - R.dir * 26, y: R.floor - 10, vx: -R.dir * rand(40, 140), vy: rand(-50, -10), life: 0.6, size: rand(4, 8), color: trTurbo() ? 'rgba(111,227,255,.6)' : 'rgba(255,255,255,.6)', type: 'dot' });
    for (let k = 0; k < 2; k++) spawnParticle({ x: R.x - R.dir * 18, y: R.floor - 2, vx: -R.dir * rand(100, 300), vy: rand(-160, -40), life: 0.3, size: 2, color: trTurbo() ? '#6fe3ff' : Math.random() < 0.5 ? EMBER : GOLD, type: 'spark' });
    if (R.k >= 0.6 && !RIDE.tunnel) trTunnel(RIDE.ride);
  } else if (R.st === 'idle' || R.st === 'dial') {
    R.puff -= dt;
    if (R.puff <= 0) { R.puff = R.rev > 0 ? 0.08 : 0.5; spawnParticle({ x: R.x - R.dir * 26, y: R.floor - 10, vx: -R.dir * rand(10, 40), vy: rand(-30, -10), life: 0.9, size: rand(3, 6), color: trTurbo() ? 'rgba(111,227,255,.45)' : 'rgba(200,200,200,.4)', type: 'dot' }); }
    if (R.st === 'idle' && !R.rider && Math.abs(Player.center().x - R.x) > 900) RIDE.R = null;   // Renas zooms off once you've walked away
  }
};
// the same page: hop to the stop, then the arrival slide
const _trArrive = PAGE.arriveAtBell;
if (_trArrive) PAGE.arriveAtBell = function (id) { RIDE.arrive = id; RIDE.room = null; const r = _trArrive.call(this, id); trSync(); return r; };
if (ARRIVE.startsWith('bell-')) {
  RIDE.arrive = ARRIVE.slice(5);
  let fresh = false; try { const r = JSON.parse(sessionStorage.getItem('ei_ride') || 'null'); fresh = r && Date.now() - r.at < 15000; } catch (e) { /* */ }
  if (fresh) trTunnelTail();
}
// Renas at camp steps aside while his scooter is out
(function () {
  if (typeof QNPC === 'undefined') return;
  const d = QNPC.prototype.draw, u = QNPC.prototype.update;
  QNPC.prototype.draw = function () { if (this.trSkip && RIDE.R) return; this.trSkip = false; return d.apply(this, arguments); };
  QNPC.prototype.update = function (dt) { const r = u.apply(this, arguments); if (this.trSkip && RIDE.R) this.near = false; return r; };
})();

/* ---------- drawing the scooter, the rider, the bolts and the barks ---------- */
function trDrawRider(x, y, dir, t) {
  // Nathan on the back: one hand on Renas's shoulder, the bat held upright like a lance
  ctx.save(); ctx.translate(x - dir * 13, y - 12); ctx.scale(dir, 1); ctx.lineJoin = 'round';
  const L = NATHAN_LOOK || {};
  limb(-2, -14, 1.75, 13, L.pants2 || '#2a2a3a', 5); limb(3, -14, 1.4, 13, L.pants || '#3a3a4a', 5);
  rr(-9, -34, 18, 21, 6); inked(L.shirt || '#f3ead8', 3);
  limb(6, -30, -0.15, 13, L.sleeve || L.shirt || '#f3ead8', 4);                            // hand on Renas's shoulder
  const [hx, hy] = limb(-5, -30, Math.PI / 2 + 0.2, 9, L.sleeve || L.shirt || '#f3ead8', 4);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(-Math.PI / 2 + 0.08);                         // the bat, upright
  ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(30, -4.5); ctx.quadraticCurveTo(35, 0, 30, 4.5); ctx.lineTo(-6, 2); ctx.closePath(); inked('#c9a36b', 2.5);
  ctx.fillStyle = INK; ctx.fillRect(-8, -3, 4, 6); ctx.restore();
  ctx.beginPath(); ctx.arc(2, -43, 9.5, 0, 7); inked(L.skin || '#f3d7b8', 3);
  ctx.beginPath(); ctx.moveTo(-8, -44); ctx.quadraticCurveTo(-7, -55, 3, -55); ctx.quadraticCurveTo(12, -55, 11, -45); ctx.lineTo(16, -44); ctx.quadraticCurveTo(13, -48, 10, -47); ctx.closePath(); inked(L.cap || '#e8361c', 2.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(5, -43); ctx.lineTo(9, -44); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -38); ctx.quadraticCurveTo(7, -35, 10, -38); ctx.stroke();
  ctx.restore();
}
function trDrawScooter(R) {
  const t = Game.time, moving = R.st === 'in' || R.st === 'peel';
  const bounce = R.st === 'idle' || R.st === 'dial' ? (Math.sin(t * 34) > 0 ? -1 : 0) : 0;
  ctx.save();
  const pivot = R.x - R.dir * 16;
  ctx.translate(pivot, R.floor); ctx.rotate(-R.dir * (R.wheelie || 0) + R.dir * (R.drift || 0) * 0.3); ctx.translate(-pivot, -R.floor);
  if (R.rider || R.st === 'board') trDrawRider(R.x, R.floor + bounce, R.dir, t);
  drawRenas(R.x, R.floor + bounce, R.dir, t, { moving });
  if (R.gog) {   // goggles pulled down for the peel-out
    ctx.save(); ctx.translate(R.x, R.floor + bounce); ctx.scale(R.dir, 1);
    rr(-2, -49, 14, 5, 2); inked(trTurbo() ? '#6fe3ff' : '#ffd27a', 1.5); ctx.restore();
  }
  ctx.restore();
  if (trTurbo() && moving) {   // electric-blue exhaust
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(R.x - R.dir * 28, R.floor - 18, 0, R.x - R.dir * 28, R.floor - 18, 30); g.addColorStop(0, 'rgba(111,227,255,.7)'); g.addColorStop(1, 'rgba(111,227,255,0)');
    ctx.fillStyle = g; ctx.fillRect(R.x - R.dir * 28 - 30, R.floor - 48, 60, 60); ctx.restore();
  }
}
function trDrawBark(B) {
  const a = Math.min(1, B.t * 3);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
  ctx.font = `italic 15px ${SERIF_FONT}`; const w = Math.max(ctx.measureText(B.text).width, 90) + 28;
  ctx.fillStyle = 'rgba(11,13,19,.82)'; rr(B.x - w / 2, B.y - 30, w, 42, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(197,160,89,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = `9px ${DISPLAY_FONT}`; ctx.fillStyle = '#c5a059'; ctx.fillText(B.who.split('').join(' '), B.x, B.y - 15);
  ctx.font = `italic 15px ${SERIF_FONT}`; ctx.fillStyle = BONE; ctx.fillText('"' + B.text + '"', B.x, B.y + 3);
  ctx.restore();
}
(function wrapHooks() {
  const H = Game.hooks, back = H.back, top = H.top;
  H.back = function (cam) { if (back) back.call(H, cam); if (RIDE.R) trDrawScooter(RIDE.R); };
  H.top = function (cam) {
    if (top) top.call(H, cam);
    for (const f of RIDE.fx) {   // scrap bolts flying into the meter
      if (f.t < 0) continue;
      const u = f.t / f.dur, mx = (f.x + f.tx) / 2 + f.ox, my = Math.min(f.y, f.ty) + f.oy;
      const x = (1 - u) * (1 - u) * f.x + 2 * (1 - u) * u * mx + u * u * f.tx, y = (1 - u) * (1 - u) * f.y + 2 * (1 - u) * u * my + u * u * f.ty;
      ctx.save(); ctx.translate(x, y); ctx.rotate(f.t * 14);
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.lineTo(Math.cos(a) * 5, Math.sin(a) * 5); } ctx.closePath(); inked('#c9ccd4', 1.5);
      ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, 7); ctx.fillStyle = INK; ctx.fill(); ctx.restore();
    }
    if (RIDE.bark) trDrawBark(RIDE.bark);
    if (RIDE.dial && RIDE.R) {
      const b = RIDE.dial.b;
      ctx.save(); ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
      ctx.fillText(RIDE.dial.list.length ? `▲ ▼ ROUTE  ·  ENTER RIDE  ·  ESC HOP OFF` : 'ESC HOP OFF', b.x, b.y + 22);
      ctx.restore();
    }
  };
})();

/* ---------- phase 2: the Spire tunnel (1.8 s), then the real trip ---------- */
const TR_TINT = { z1: '242,193,78', z2: '255,138,42', z3: '160,200,220', z4: '232,54,28', z5: '111,211,255', z6: '185,139,255', z7: '159,230,255', z8: '191,239,255', z9: '255,215,0' };
function trTunnelCanvas() {
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483640;pointer-events:none';
  document.body.appendChild(cv);
  const dpr = Math.min(1.5, devicePixelRatio || 1), w = innerWidth, h = innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  return { cv, g, w, h };
}
function trTunnel(id) {
  const { cv, g, w, h } = trTunnelCanvas(), t0 = performance.now(), DUR = 1.8, tint = TR_TINT[id] || '242,193,78', turbo = trTurbo();
  const gag = Math.random() < 0.5 ? (Math.random() < 0.5 ? 'reshman' : 'cat') : null;
  const T = RIDE.tunnel = { honkT: 0, honk() { this.honkT = 0.5; trHonk(); } };
  RIDE.R = null;
  try { sessionStorage.setItem('ei_ride', JSON.stringify({ at: Date.now(), to: id, turbo })); } catch (e) { /* */ }
  let fired = false, last = t0;
  const frame = now => {
    const t = (now - t0) / 1000, dt = (now - last) / 1000; last = now; T.honkT = Math.max(0, T.honkT - dt);
    trTunnelFrame(g, w, h, Math.min(t, DUR), tint, turbo, T.honkT, gag);
    if (t < DUR) { requestAnimationFrame(frame); return; }
    if (fired) return;
    fired = true; RIDE.tunnel = null;
    Travel.list = [id]; travelTo(0);
    const samePage = ZONES[id].page === ZONES[PAGE.id].page;
    if (samePage) {
      RIDE.ride = false; window.EI_RIDE = false;
      setTimeout(() => { cv.style.transition = 'opacity .35s'; cv.style.opacity = '0'; setTimeout(() => cv.remove(), 400); }, 450);
    }
    // another page: the tunnel stays up until the browser moves on
  };
  requestAnimationFrame(frame);
}
function trTunnelTail() {   // the destination page picks the ride up where the last page left it
  const { cv, g, w, h } = trTunnelCanvas(), t0 = performance.now();
  let r = {}; try { r = JSON.parse(sessionStorage.getItem('ei_ride') || '{}'); } catch (e) { /* */ }
  const tint = TR_TINT[r.to] || '242,193,78';
  const frame = now => {
    const t = (now - t0) / 1000;
    trTunnelFrame(g, w, h, 1.25 + Math.min(t, 0.5), tint, !!r.turbo, 0, null, true);
    cv.style.opacity = String(Math.max(0, 1 - t / 0.45));
    if (t < 0.5) requestAnimationFrame(frame); else cv.remove();
  };
  requestAnimationFrame(frame);
}
function trTunnelFrame(g, w, h, t, tint, turbo, honk, gag, tail) {
  g.fillStyle = '#05060a'; g.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.5, sp = t * 1.6;
  // tunnel rings rushing past
  for (let k = 0; k < 14; k++) {
    const z = ((k / 14 - sp) % 1 + 1) % 1, s = 0.08 + z * z * 1.6;
    g.strokeStyle = `rgba(${tint},${0.08 + z * 0.35})`; g.lineWidth = 1 + z * 5;
    g.beginPath(); g.ellipse(cx, cy, w * 0.5 * s, h * 0.42 * s, 0, 0, 7); g.stroke();
  }
  // destination-coloured lights flashing by along the walls
  for (let k = 0; k < 10; k++) {
    const z = ((k / 10 - sp * 1.3) % 1 + 1) % 1, s = 0.1 + z * z * 1.5, side = k % 2 ? 1 : -1;
    const x = cx + side * w * 0.45 * s, y = cy + h * 0.25 * s, r = 2 + z * 9;
    g.fillStyle = `rgba(${tint},${0.3 + z * 0.7})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // speed lines
  g.strokeStyle = 'rgba(243,234,216,.18)'; g.lineWidth = 1.5;
  for (let k = 0; k < 26; k++) {
    const a = k * 2.4, z = ((k * 0.137 - t * 2.2) % 1 + 1) % 1, r0 = 40 + z * Math.max(w, h) * 0.6;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.7); g.lineTo(cx + Math.cos(a) * (r0 + 40 + z * 80), cy + Math.sin(a) * (r0 + 40 + z * 80) * 0.7); g.stroke();
  }
  // the scooter, from behind, Nathan on the back
  const bx = cx + Math.sin(t * 7) * 6, by = h * 0.74 + Math.sin(t * 31) * 1.5;
  if (honk > 0 || turbo) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const lg = g.createRadialGradient(bx, by - 70, 0, bx, by - 70, 260 + honk * 300); lg.addColorStop(0, `rgba(255,240,180,${0.18 + honk * 0.5})`); lg.addColorStop(1, 'rgba(255,240,180,0)');
    g.fillStyle = lg; g.fillRect(0, 0, w, h); g.restore();
  }
  g.fillStyle = turbo ? 'rgba(111,227,255,.8)' : 'rgba(255,255,255,.55)';
  for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(bx + rand(-14, 14), by + 12 + rand(0, 20), rand(4, 9), 0, 7); g.fill(); }
  g.fillStyle = '#050407';
  g.beginPath(); g.ellipse(bx, by, 16, 20, 0, 0, 7); g.fill();                                // rear wheel
  g.fillRect(bx - 30, by - 22, 60, 8);                                                     // deck
  g.beginPath(); g.ellipse(bx - 6, by - 60, 14, 22, 0, 0, 7); g.fill();                      // Renas
  g.beginPath(); g.arc(bx - 6, by - 92, 11, 0, 7); g.fill();
  g.beginPath(); g.ellipse(bx + 8, by - 52, 15, 24, 0, 0, 7); g.fill();                      // Nathan
  g.beginPath(); g.arc(bx + 9, by - 86, 12, 0, 7); g.fill();
  g.fillStyle = '#e8361c'; g.beginPath(); g.ellipse(bx + 9, by - 93, 12, 6, 0, Math.PI, 0); g.fill();   // the red cap
  g.fillStyle = '#050407'; g.save(); g.translate(bx + 22, by - 60); g.rotate(-0.1); g.fillRect(-3, -60, 6, 60); g.restore();     // the bat, held up like a lance
  g.fillStyle = honk > 0 ? '#fff6c8' : '#ff3b30'; g.beginPath(); g.arc(bx, by - 18, honk > 0 ? 5 : 3, 0, 7); g.fill();     // tail light
  if (gag === 'reshman' && t > 0.5 && t < 1.5) {
    g.fillStyle = '#050407'; g.fillRect(bx - 34, by - 40, 22, 16);
    g.fillStyle = '#fff'; g.shadowColor = '#bff3ff'; g.shadowBlur = 8;
    for (const ex of [-27, -19]) { g.beginPath(); g.ellipse(bx + ex, by - 34, 2.6, Math.sin(t * 9) > 0.85 ? 0.5 : 3, 0, 0, 7); g.fill(); }
    g.shadowBlur = 0; g.font = `italic 13px ${SERIF_FONT}`; g.textAlign = 'center'; g.fillStyle = '#bff3ff'; g.fillText('…blorp', bx - 23, by - 48);
  }
  if (gag === 'cat' && t > 0.4) {
    g.fillStyle = '#c8781c'; g.beginPath(); g.ellipse(bx + 14, by - 64, 8, 10, 0.3, 0, 7); g.fill();
    g.beginPath(); g.moveTo(bx + 8, by - 72); g.lineTo(bx + 10, by - 80); g.lineTo(bx + 14, by - 73); g.moveTo(bx + 15, by - 73); g.lineTo(bx + 19, by - 80); g.lineTo(bx + 20, by - 71); g.fill();
    g.strokeStyle = '#c8781c'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx + 20, by - 58); g.quadraticCurveTo(bx + 34, by - 54 + Math.sin(t * 20) * 4, bx + 40, by - 64); g.stroke();
  }
  if (honk > 0) {
    g.save(); g.globalAlpha = Math.min(1, honk * 3); g.font = `bold 46px Impact, sans-serif`; g.textAlign = 'center';
    g.lineWidth = 6; g.strokeStyle = '#0d0b10'; g.strokeText('HONK-HONK!', cx, h * 0.3); g.fillStyle = '#f2c14e'; g.fillText('HONK-HONK!', cx, h * 0.3); g.restore();
  }
  if (!tail) {
    g.save(); g.globalAlpha = Math.min(1, t * 3) * 0.6; g.font = `italic 13px ${SERIF_FONT}`; g.textAlign = 'center'; g.fillStyle = '#9e9689';
    g.fillText('attack / jump · honk the airhorn', cx, h * 0.93); g.restore();
  }
  const vg = g.createRadialGradient(cx, cy, Math.min(w, h) * 0.25, cx, cy, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
  if (t < 0.15 && !tail) { g.fillStyle = `rgba(0,0,0,${1 - t / 0.15})`; g.fillRect(0, 0, w, h); }
}
