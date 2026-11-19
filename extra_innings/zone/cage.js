'use strict';
/* =========================================================
   THE BATTING CAGE · Josh and Lars's chicken-wire cage at the east
   end of Base Camp, on the solid ground before the chasm, with the
   home-built Pitch-O-Matic 3000.
   Stand on the plate, press up, and bat back what it throws.
   3 strikes and you're out. The combo speeds the machine up.
     white fastball · blue curveball · red rapid volley (×3) ·
     Daniel's sabotage bomb (jump it, don't hit it) ·
     the Golden Money-Ball every 15th pitch (+50 bolts)
   Reach a 100 combo: the Slugger's Gold Bat badge and the
   secret trophy King of the Cage. Records: Save.data.q.cage.
   Loaded after zone/outfits.js; only active on the Zone 1 page.
   ========================================================= */
const CAGE = { x0: 227, x1: 243, plate: 229, machine: 242, floor: 62 };   // solid floor only: the chasm starts at tile 252
const CAGE_BOARD = [['Reshman', 5, 'hit one by accident and screamed'], ['Milo', 18, 'tried to use magic'], ['Lars', 35, ''], ['Adam', 60, 'the record']];
const cageQ = () => { const q = Save.data.q; return q.cage = q.cage || { best: 0, bestCombo: 0, prize: 0 }; };
// the Slugger's Gold Bat joins the badge loadout
if (typeof LOADOUT !== 'undefined' && !LOADOUT.some(b => b.id === 'goldbat'))
  LOADOUT.push({ id: 'goldbat', name: 'Slugger\'s Gold Bat', cost: 2, desc: 'A solid gold bat from the cage. Every swing hits 15% harder and shines.', from: 'The Batting Cage at Base Camp · a 100 combo' });
const _cgApply = applyUpgrades;
applyUpgrades = function () {
  _cgApply();
  if (typeof Loadout !== 'undefined' && Loadout.pinned('goldbat')) { Player.batDmgBase *= 1.15; Player.batDmg = Player.batDmgBase; }
};

class CageBall {
  constructor(kind, speed) {
    const x = (CAGE.machine - 0.6) * TILE, y = CAGE.floor * TILE - (kind === 'bomb' ? 14 : 34);
    Object.assign(this, { kind, x, y, vx: -speed, vy: 0, g: 0, r: kind === 'bomb' ? 9 : 7, state: 'fly', dead: false, t: 0, spin: 0 });
    if (kind === 'curve') {   // a high lob that dives at the plate
      const T = (x - CAGE.plate * TILE) / speed; this.g = 2600;
      this.vy = ((CAGE.floor * TILE - 34) - y - 0.5 * this.g * T * T) / T;
    }
    if (kind === 'bomb') this.g = 1800;
  }
  update(dt) {
    this.t += dt; this.spin += dt * 20;
    this.vy += this.g * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.kind === 'bomb' && this.state === 'fly' && this.y > CAGE.floor * TILE - this.r) { this.y = CAGE.floor * TILE - this.r; this.vy = -360; SFX.land(); }
    if (this.kind === 'bomb' && Math.random() < 0.6) spawnParticle({ x: this.x + 4, y: this.y - this.r - 4, vx: rand(-30, 30), vy: rand(-90, -30), life: 0.25, size: 2, color: Math.random() < 0.5 ? GOLD : EMBER, type: 'spark' });
    if (this.state === 'hit' && (this.x > CAGE.x1 * TILE + 60 || this.y < (CAGE.floor - 16) * TILE)) this.dead = true;
  }
  draw() {
    const col = { fast: '#f3ead8', curve: '#6fb8ff', volley: '#ff4a3a', gold: GOLD, bomb: '#1a1420' }[this.kind];
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.spin);
    if (this.kind === 'gold') { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22); g.addColorStop(0, 'rgba(242,193,78,.6)'); g.addColorStop(1, 'rgba(242,193,78,0)'); ctx.fillStyle = g; ctx.fillRect(-22, -22, 44, 44); }
    ctx.beginPath(); ctx.arc(0, 0, this.r, 0, 7); inked(col, 2.5);
    if (this.kind !== 'bomb') { ctx.strokeStyle = this.kind === 'volley' ? '#fff' : FLAME; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(-4, 0, 4.5, -1, 1); ctx.stroke(); ctx.beginPath(); ctx.arc(4, 0, 4.5, 2.1, 4.2); ctx.stroke(); }
    ctx.restore();
    if (this.kind === 'bomb') { ctx.strokeStyle = '#c9a36b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x + 3, this.y - this.r); ctx.quadraticCurveTo(this.x + 8, this.y - this.r - 6, this.x + 4, this.y - this.r - 10); ctx.stroke(); }
  }
}

const Cage = {
  on: false, balls: [], strikes: 0, combo: 0, points: 0, pitches: 0, nextT: 0, queue: [], flash: 0, msg: '', msgT: 0, saved: [],
  canStart() { return !this.on && !Story.active && !UI.modal; },
  start() {
    if (!this.canStart()) return;
    const P = Player;
    Object.assign(this, { on: true, balls: [], strikes: 0, combo: 0, points: 0, pitches: 0, nextT: 1.6, queue: [], flash: 0 });
    // the hub's critters wait outside
    this.saved = Enemies.filter(e => !e.dead && e !== Zone.boss); for (const e of this.saved) { const i = Enemies.indexOf(e); if (i >= 0) Enemies.splice(i, 1); }
    P.reset({ x: GX_T(CAGE.plate, CAGE.floor).x, y: CAGE.floor * TILE }, true); P.facing = 1;
    SFX.bell(); SFX.music('anthem'); this.say('PLAY BALL!');
  },
  stop() {
    if (!this.on) return;
    this.on = false; this.balls = []; SFX.musicAuto();
    for (const e of this.saved) if (!e.dead) Enemies.push(e); this.saved = [];
    const q = cageQ(), D = Save.data, P = Player, rec = this.points > q.best;
    q.best = Math.max(q.best, this.points); q.bestCombo = Math.max(q.bestCombo, this.bestRun || 0);
    pop(P.x + P.w / 2, P.y - 40, `${this.points} POINTS`, { size: 40, color: GOLD });
    let line = rec ? `NEW CAGE RECORD · ${this.points}` : `CAGE · ${this.points} POINTS · BEST ${q.best}`;
    if (this.points > 60 && rec) line += ' · ADAM\'S RECORD IS HISTORY';
    toast(line); saveGame();
    if ((this.bestRun || 0) >= 100 && !q.prize) {
      q.prize = 1; (D.q.badges = D.q.badges || {}).goldbat = 1; if (typeof Loadout !== 'undefined') Loadout.gained('goldbat');
      if (typeof tGive === 'function') tGive('king_cage');
      applyUpgrades(); saveGame();
      setTimeout(() => showCard('BATTING CAGE · 100 COMBO', 'SLUGGER\'S GOLD BAT', 'Josh and Lars hand over a solid gold bat, still warm from the forge. Pin it as a badge: every swing hits 15% harder.', ['badge · 2 notches']), 900);
    }
    this.bestRun = 0;
  },
  say(t) { this.msg = t; this.msgT = 1.1; },
  strike(why) {
    if (this.strikes >= 3) return;   // already out: balls still in the air don't count
    this.strikes++; this.combo = 0; this.flash = 0.35; SFX.deny(); addShake(5);
    this.say(this.strikes >= 3 ? 'STRIKE THREE!' : `STRIKE ${this.strikes}! · ${why}`);
    if (this.strikes >= 3) setTimeout(() => this.stop(), 900);
  },
  pitch() {
    const c = this.combo, n = ++this.pitches, sp = Math.min(980, 520 + c * 5);
    if (n % 15 === 0) { this.balls.push(new CageBall('gold', sp * 1.1)); return 1.4; }
    const r = Math.random();
    if (c >= 10 && r < 0.12) { this.balls.push(new CageBall('bomb', 380 + c * 2)); SFX.fuse(); this.say('DANIEL!? A BOMB!'); return 1.5; }
    if (c >= 15 && r < 0.3) { this.queue = [0, 0.22, 0.44]; this.flash = 0.25; SFX.slamWarn(); return 2.0; }
    if (c >= 5 && r < 0.55) { this.balls.push(new CageBall('curve', sp * 0.75)); return Math.max(0.75, 1.55 - c * 0.012); }
    this.balls.push(new CageBall('fast', sp)); return Math.max(0.6, 1.45 - c * 0.012);
  },
  update(dt) {
    if (!this.on) return;
    const P = Player;
    // keep Nathan at the plate (he can still jump)
    const px = GX_T(CAGE.plate, CAGE.floor).x - P.w / 2; if (Math.abs(P.x - px) > 1) { P.x = px; P.vx = 0; }
    P.facing = 1;
    this.msgT -= dt; this.flash = Math.max(0, this.flash - dt);
    if (this.strikes < 3) {
      if (this.queue.length) { for (let i = this.queue.length - 1; i >= 0; i--) { this.queue[i] -= dt; if (this.queue[i] <= 0) { this.queue.splice(i, 1); this.balls.push(new CageBall('volley', Math.min(1100, 760 + this.combo * 4))); SFX.serve(); } } }
      else if ((this.nextT -= dt) <= 0) { this.nextT = this.pitch(); SFX.serve(); }
    }
    const swinging = P.attackT > 0 && P.attackType !== 'launch', hb = swinging ? P.hitbox() : null, hurt = P.hurtbox();
    for (const b of this.balls) {
      b.update(dt);
      if (b.state !== 'fly' || this.strikes >= 3) continue;
      const box = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
      if (hb && overlap(hb, box)) {
        if (b.kind === 'bomb') { b.dead = true; explode(b.x, b.y, 60, 0, { friendly: false, small: true, word: 'BOOM!' }); this.strike('NEVER HIT THE BOMB'); continue; }
        b.state = 'hit'; b.vx = rand(900, 1300); b.vy = rand(-650, -300); b.g = 600;
        this.combo++; this.points++; this.bestRun = Math.max(this.bestRun || 0, this.combo);
        SFX.hit(this.combo % 10 === 0); addHitstop(0.04); addShake(3);
        burst(b.x, b.y, 10, { colors: [BONE, GOLD], maxSpeed: 300 });
        if (b.kind === 'gold') { Save.data.bolts += 50; HUD.boltBump = true; SFX.coin(); pop(b.x, b.y - 30, '+50 BOLTS!', { size: 32, color: GOLD }); }
        else pop(b.x, b.y - 24, this.combo % 10 === 0 ? `COMBO ×${this.combo}!` : 'CRACK!', { size: this.combo % 10 === 0 ? 30 : 22, color: this.combo % 10 === 0 ? GOLD : BONE });
        continue;
      }
      if (b.kind === 'bomb' && overlap(hurt, box)) { b.dead = true; explode(b.x, b.y, 60, 0, { friendly: false, small: true, word: 'BOOM!' }); this.strike('JUMP THE BOMBS'); continue; }
      if (b.x < (CAGE.x0 + 0.5) * TILE) { b.dead = true; if (b.kind === 'bomb') { this.say('DODGED!'); SFX.whoosh(); } else this.strike('MISSED IT'); }
    }
    this.balls = this.balls.filter(b => !b.dead);
    if (Zone.room.id !== 'hub' || P.dead) { this.on = false; this.balls = []; SFX.musicAuto(); for (const e of this.saved) Enemies.push(e); this.saved = []; }
  },
  drawBack() {
    if (Zone.room.id !== 'hub') return;
    const y0 = (CAGE.floor - 6) * TILE, y1 = CAGE.floor * TILE, x0 = CAGE.x0 * TILE, x1 = CAGE.x1 * TILE, t = Game.time;
    ctx.save();
    // chicken wire
    ctx.strokeStyle = 'rgba(184,188,196,.28)'; ctx.lineWidth = 1;
    for (let x = x0; x <= x1; x += 12) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + 30, y1); ctx.moveTo(x + 30, y0); ctx.lineTo(x, y1); ctx.stroke(); }
    ctx.strokeStyle = '#3a3340'; ctx.lineWidth = 5; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    // neon tubes
    for (let k = 0; k < 3; k++) { const on = this.on || Math.sin(t * 3 + k) > -0.7; ctx.fillStyle = on ? (this.flash > 0 ? '#ff4a3a' : '#6fd3ff') : '#2a3a4a'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = on ? 14 : 0; ctx.fillRect(x0 + 40 + k * (x1 - x0 - 80) / 2 - 40, y0 + 6, 80, 5); }
    ctx.shadowBlur = 0;
    // home plate
    const px = GX_T(CAGE.plate, CAGE.floor).x; ctx.fillStyle = BONE; ctx.beginPath(); ctx.moveTo(px - 14, y1 - 1); ctx.lineTo(px + 14, y1 - 1); ctx.lineTo(px + 14, y1 - 4); ctx.lineTo(px, y1 - 7); ctx.lineTo(px - 14, y1 - 4); ctx.closePath(); ctx.fill();
    // the Pitch-O-Matic 3000
    const mx = CAGE.machine * TILE;
    rr(mx - 22, y1 - 58, 44, 58, 4); inked(this.flash > 0 ? '#8a2a2a' : '#5a6a7a', 3);
    ctx.beginPath(); ctx.arc(mx - 6, y1 - 40, 13, 0, 7); inked('#3a3340', 3);
    ctx.save(); ctx.translate(mx - 6, y1 - 40); ctx.rotate(t * (this.on ? 12 : 1)); ctx.fillStyle = GOLD; ctx.fillRect(-11, -2, 22, 4); ctx.restore();
    rr(mx - 30, y1 - 38, 10, 8, 2); inked('#2a2a30', 2);
    ctx.font = `8px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('PITCH-O-MATIC 3000', mx, y1 - 64);
    // the scoreboard on the back wall
    rr(mx - 70, y0 + 18, 70, 34, 3); inked('#141c16', 3);
    ctx.font = `11px ${DISPLAY_FONT}`; ctx.fillStyle = '#ffd27a'; ctx.fillText(`PTS ${this.on ? this.points : cageQ().best}`, mx - 35, y0 + 32);
    ctx.fillStyle = '#ff8a6a'; ctx.fillText(this.on ? '●'.repeat(this.strikes) + '○'.repeat(Math.max(0, 3 - this.strikes)) : 'BEST', mx - 35, y0 + 46);
    // the chalkboard outside the cage
    const bx = x0 - 6 * TILE + 8, by = y0 + 4;
    rr(bx, by, 5 * TILE - 16, 92, 3); inked('#1e2a22', 3);
    ctx.textAlign = 'left'; ctx.font = `10px ${DISPLAY_FONT}`; ctx.fillStyle = 'rgba(243,234,216,.85)'; ctx.fillText('CREW RECORDS', bx + 8, by + 14);
    const board = CAGE_BOARD.concat([['Nathan', cageQ().best, '']]).sort((a, b) => b[1] - a[1]);
    ctx.font = `italic 10px ${SERIF_FONT}`;
    board.forEach(([n, s], i) => { ctx.fillStyle = n === 'Nathan' ? GOLD : 'rgba(243,234,216,.75)'; ctx.fillText(`${i + 1}. ${n}`, bx + 8, by + 30 + i * 12); ctx.textAlign = 'right'; ctx.fillText(String(s), bx + 5 * TILE - 26, by + 30 + i * 12); ctx.textAlign = 'left'; });
    ctx.restore();
  },
  drawFront() {
    if (Zone.room.id !== 'hub') return;
    for (const b of this.balls) b.draw();
    if (!this.on && !Story.active) {
      const px = GX_T(CAGE.plate, CAGE.floor).x, c = Player.center();
      if (Math.abs(c.x - px) < 30 && Math.abs(Player.y + Player.h - CAGE.floor * TILE) < 14) gxPrompt('BATTING PRACTICE', px, CAGE.floor * TILE - 96);
    }
  },
  drawScreen() {
    if (!this.on) return;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(8,5,12,.72)'; rr(VW / 2 - 170, 64, 340, 54, 6); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = this.flash > 0 ? FLAME : GOLD; ctx.stroke();
    ctx.font = `11px ${DISPLAY_FONT}`; ctx.fillStyle = GOLD; ctx.fillText('THE BATTING CAGE · PITCH-O-MATIC 3000', VW / 2, 76);
    ctx.font = `22px ${DISPLAY_FONT}`; ctx.fillStyle = BONE;
    ctx.fillText(`COMBO ×${this.combo}`, VW / 2 - 90, 100); ctx.fillText(`${this.points} PTS`, VW / 2 + 10, 100);
    ctx.fillStyle = FLAME; ctx.fillText('●'.repeat(this.strikes) + '○'.repeat(Math.max(0, 3 - this.strikes)), VW / 2 + 110, 100);
    if (this.msgT > 0) { ctx.font = `30px ${DISPLAY_FONT}`; ctx.globalAlpha = Math.min(1, this.msgT * 3); ctx.fillStyle = this.msg.startsWith('STRIKE') ? FLAME : GOLD; ctx.fillText(this.msg, VW / 2, 160); }
    ctx.restore();
  },
};
Gaunt.add({
  id: 'cage', page: 'z1',
  update(dt) { Cage.update(dt); },
  draw_back() { Cage.drawBack(); },
  draw_top() { Cage.drawFront(); },
  draw_screen() { Cage.drawScreen(); },
});
// press up on the plate to start
const _cgInteract = PAGE.interact;
PAGE.interact = function (dt, c, feet) {
  if (_cgInteract) _cgInteract.call(this, dt, c, feet);
  if (PAGE.id !== 'z1' || Zone.room.id !== 'hub' || Cage.on) return;
  const px = GX_T(CAGE.plate, CAGE.floor).x;
  if (Input.pressed('up') && Player.onGround && Math.abs(c.x - px) < 30 && Math.abs(feet - CAGE.floor * TILE) < 14) Cage.start();
};
// no rooms changing mid-inning
const _cgLock = PAGE.lockRoom;
PAGE.lockRoom = () => Cage.on || !!(_cgLock && _cgLock());
