'use strict';
/* =========================================================
   STORY: dialogue bubbles + scripted cutscenes
   ========================================================= */
// all-caps words that are names, not shouting
const NOT_SHOUTS = ['MVP', 'AI', 'TV', 'OK', 'DJ', 'HP', 'II', 'III'];
// '#rrggbb' → rgba() with a custom alpha, for tinting overlays to a speaker's colour
const hexA = (hex, a) => {
  const h = String(hex || '#f2c14e').replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16) || 0, g = parseInt(n.slice(2, 4), 16) || 0, b = parseInt(n.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
};
const Story = {
  active: false, skippable: false, skipHold: 0, skipping: false,
  waits: [], bubble: null, camTarget: null, letterbox: 0, tweens: [],
  intro: { black: 0, blackTarget: 0, flash: 0, bolt: 0, ball: null },
  jumbo: { on: false, flicker: 0 },
  beam: null,
  tagColors: { 'EVIL ADAM': '#7a1f6e', JOSH: '#2c6e6a', RESHMAN: '#000000', LARS: '#7a4a20', ADAM: '#3f7a2a', RENAS: '#c8561c', DANIEL: '#8a1c3a', FIONN: '#5a4a3a', MILO: '#4a3a8a', 'KING DENIZ': '#2a5a8a', DENIZ: '#c8561c' },
  // cinematic camera + overlays
  zoom: 1, zoomTarget: null, punchZ: 0, lines: 0, linesAt: null, card: null, bossCard: null, lastWho: null, motes: [], grain: null,
  key: { x: -1, y: -1, a: 0 },

  wait(sec) {
    if (this.skipping) return Promise.resolve();
    return new Promise(r => this.waits.push({ t: sec, r }));
  },
  say(who, text, anchor, opts = {}) {
    if (this.skipping) return Promise.resolve();
    const fresh = who !== this.lastWho; this.lastWho = who;
    return new Promise(r => { this.bubble = { who, text, anchor, shown: 0, r, voice: opts.voice || 1, color: opts.color || BONE, hold: 0, age: 0, pause: 0, fresh, plain: !!opts.plain, font: opts.font || null }; });
  },
  // camera: zoomTo(1.3) pushes in, zoomTo(null) hands back to the automatic cutscene framing
  zoomTo(z) { this.zoomTarget = z; },
  // frame two characters together (a over-the-shoulder two-shot), or one on its own
  twoShot(a, b, z = 1.24, lift = 70) {
    const ax = a.x + (a.w || 0) / 2, bx = b ? b.x + (b.w || 0) / 2 : ax, ay = Math.min(a.y, b ? b.y : a.y);
    this.camTarget = { x: (ax + bx) / 2, y: ay - lift }; this.zoomTo(z);
  },
  // a puff of shadow, for Reshman popping in and out of the dark
  shadowPuff(x, y, n = 26) {
    SFX.poof();
    burst(x, y, n, { colors: ['#000000', '#1a1420', '#2a2230'], maxSpeed: 260, type: 'puff', maxLife: 0.9, minSize: 6, maxSize: 14, drag: 2 });
    for (let k = 0; k < 10; k++) spawnParticle({ x: x + rand(-14, 14), y: y - rand(0, 24), vx: rand(-40, 40), vy: rand(-120, -40), life: rand(0.6, 1.1), size: rand(1.5, 2.5), color: 'rgba(243,234,216,.8)', type: 'dot' });
    ring(x, y, 6, 60, 0.4, 'rgba(26,20,32,.9)', 5);
  },
  punch(a = 0.08, shake = 8) { this.punchZ = Math.min(0.3, this.punchZ + a); if (shake) addShake(shake); },
  // a big story beat landing at world point (x, y): zoom punch, flash, radial speed lines, shockwave
  impact(x, y, col = GOLD) {
    this.punch(0.12, 16); this.lines = 1; this.linesAt = { x, y };
    Game.flashWhite = Math.max(Game.flashWhite, 0.8);
    ring(x, y, 12, 190, 0.55, col, 9); ring(x, y, 6, 110, 0.35, BONE, 5);
    burst(x, y, 34, { colors: [col, BONE, FLAME], minSpeed: 200, maxSpeed: 620, maxLife: 0.7, maxSize: 5, drag: 2.5 });
  },
  // chapter-style title card across the middle of the screen
  title(main, sub = '', dur = 3.4) {
    if (this.skipping) return Promise.resolve();
    this.card = { main, sub, t: 0, dur }; SFX.bell();
    return this.wait(dur);
  },
  // boss name splash, e.g. 'ADAM · THE RIVAL'
  bossIntro(name) {
    const [title, epithet] = name.split('·').map(s => s.trim());
    this.bossCard = { title, epithet: epithet || '', t: 0 };
    SFX.slam(); SFX.clang();
  },
  tween(obj, key, to, dur) {
    if (this.skipping) { obj[key] = to; return Promise.resolve(); }
    return new Promise(r => this.tweens.push({ obj, key, from: obj[key], to, dur, t: 0, r }));
  },
  async run(fn, skippable = false) {
    this.active = true; this.skippable = skippable; this.skipping = false; this.skipHold = 0; this.lastWho = null;
    Input.clear(); Player.vx = 0; Player.attackT = 0; Player.healT = 0; Player.dashT = 0;
    try { await fn(); }
    catch (e) {
      // a scene that dies half-way must not leave the black overlay up over a frozen screen
      logErr('scene failed', e);
      this.waits.forEach(w => w.r()); this.waits = [];
      this.tweens.forEach(tw => { tw.obj[tw.key] = tw.to; tw.r(); }); this.tweens = [];
      if (this.intro) Object.assign(this.intro, { black: 0, blackTarget: 0, flash: 0, bolt: 0, ball: null, memory: null, lids: 0 });
      if (this.bubble) { const r = this.bubble.r; this.bubble = null; r(); }
      this.card = null; this.lines = 0; this.bossCard = null; this.camTarget = null; this.zoomTarget = null;
      Input.enabled = true; Game.fadeTarget = 0;
      try { toast('SCENE FAILED · CHECK CONSOLE'); } catch (err) { logErr("zone/story.js:85", err); }
    } finally {
      this.active = false; this.skippable = false; this.skipping = false; this.camTarget = null; this.bubble = null;
      this.zoomTarget = null; this.lastWho = null; this.card = null;
      Input.clear();
    }
  },
  skip() {
    this.skipping = true;
    this.waits.forEach(w => w.r()); this.waits = [];
    this.tweens.forEach(tw => { tw.obj[tw.key] = tw.to; tw.r(); }); this.tweens = [];
    if (this.bubble) { const r = this.bubble.r; this.bubble = null; r(); }
  },
  advancePressed: false,
  update(dt) {
    for (let i = this.waits.length - 1; i >= 0; i--) { const w = this.waits[i]; w.t -= dt; if (w.t <= 0) { this.waits.splice(i, 1); w.r(); } }
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      tw.obj[tw.key] = lerp(tw.from, tw.to, e);
      if (k >= 1) { this.tweens.splice(i, 1); tw.r(); }
    }
    const held = Input.down('jump') || Input.down('attack');
    const adv = Input.pressed('jump') || Input.pressed('attack') || this.advancePressed;
    this.advancePressed = false;
    const b = this.bubble;
    if (b) {
      b.age += dt;
      if (b.pause > 0) b.pause -= dt;
      else {
        const before = Math.floor(b.shown);
        b.shown = Math.min(b.text.length, b.shown + dt * 44 * (held ? 3.5 : 1));   // hold to fast-forward
        const now = Math.floor(b.shown);
        if (now !== before && now % 2 === 0 && b.text[now] !== ' ') SFX.voice(b.voice);
        // a little breath after punctuation, so lines land with rhythm
        const ch = b.text[now - 1];
        if (now !== before && now < b.text.length && b.text[now] === ' ' && /[.!?…,—]/.test(ch)) b.pause = ch === ',' ? 0.07 : 0.22;
      }
      if (b.shown >= b.text.length) b.hold += dt;
      if (adv && b.hold < 0.05 && b.shown < b.text.length) b.shown = b.text.length;
      else if ((adv || (held && b.hold > 0.45)) && b.shown >= b.text.length) { this.bubble = null; b.r(); }   // held: lines roll on by themselves
    }
    // hold attack to skip (the intro, and any scene you've already watched)
    if (this.skippable) {
      if (Input.down('attack')) this.skipHold += dt; else this.skipHold = Math.max(0, this.skipHold - dt * 2);
      if (this.skipHold > 1.1) { this.skipHold = 0; this.skip(); }
    }
    this.letterbox = approach(this.letterbox, this.active ? 1 : 0, dt * 3);
    const I = this.intro;
    I.black = approach(I.black, I.blackTarget, dt * 0.8);
    I.flash = Math.max(0, I.flash - dt * 1.6); I.bolt = Math.max(0, I.bolt - dt * 1.2);
    if (I.ball) I.ball.t += dt;
    if (I.memory) I.memory.t += dt;
    if (this.jumbo.flicker > 0 && !this.jumbo.on) this.jumbo.flicker = Math.max(0, this.jumbo.flicker - dt * 2);
    if (this.beam) this.beam.t += dt;
    // cinematic camera: a gentle push-in while a scene plays, tighter when it frames something
    const flat = typeof Scene !== 'undefined' && Scene.on;
    const zt = this.zoomTarget !== null ? this.zoomTarget : this.active ? (this.camTarget ? 1.12 : 1.07) : 1;
    this.zoom += (zt - this.zoom) * (1 - Math.exp(-dt * 2.4));
    this.punchZ *= Math.exp(-dt * 6);
    // the key light follows whoever is talking, easing between speakers
    const kb = this.bubble, keyPt = kb ? this.toScreen(typeof kb.anchor === 'function' ? kb.anchor() : kb.anchor) : null;
    if (this.key.x < 0 && keyPt) { this.key.x = keyPt.x; this.key.y = keyPt.y; }
    if (keyPt) { const k = 1 - Math.exp(-dt * 5); this.key.x = lerp(this.key.x, keyPt.x, k); this.key.y = lerp(this.key.y, keyPt.y, k); }
    this.key.a = approach(this.key.a, keyPt ? 1 : 0, dt * 2.5);
    Game.zoom = flat ? 1 : Math.max(1, this.zoom + this.punchZ);
    // zoom about the characters' feet, so a push-in never shoves anyone down behind the letterbox
    const P = Player, feetY = this.camTarget ? this.camTarget.y + 70 : P.y + P.h;
    const fx = clamp((this.camTarget ? this.camTarget.x : P.x + P.w / 2) - Game.cam.x, VW * 0.15, VW * 0.85);
    const fy = clamp(feetY - Game.cam.y, VH * 0.2, VH);
    if (!Game.zoomF) Game.zoomF = { x: fx, y: fy };
    const kf = 1 - Math.exp(-dt * 4);
    Game.zoomF.x = lerp(Game.zoomF.x, fx, kf); Game.zoomF.y = lerp(Game.zoomF.y, fy, kf);
    this.lines = Math.max(0, this.lines - dt * 2.2);
    if (this.card) { this.card.t += dt; if (this.card.t > this.card.dur) this.card = null; }
    if (this.bossCard) { this.bossCard.t += dt; if (this.bossCard.t > 3.6) this.bossCard = null; }
    // drifting dust motes in the projector light
    if (this.letterbox > 0.3 && this.motes.length < 34 && Math.random() < dt * 14)
      this.motes.push({ x: rand(0, VW), y: rand(VH * 0.2, VH), vx: rand(-8, 8), vy: rand(-16, -5), r: rand(0.8, 2.4), ph: rand(0, 7), life: rand(4, 9) });
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i]; m.x += (m.vx + Math.sin(Game.time + m.ph) * 6) * dt; m.y += m.vy * dt; m.life -= dt;
      if (m.life <= 0 || this.letterbox < 0.05) this.motes.splice(i, 1);
    }
  },

  /* ---------- drawing ---------- */
  // dialogue now draws in screen space (drawDialogue, from drawScreen) so the cutscene camera can zoom freely
  drawBubble() {},
  toScreen(p) {
    const z = Game.zoom || 1, c = Game.cam, F = Game.zoomF || { x: VW / 2, y: VH / 2 };
    return { x: (p.x - c.x - F.x) * z + F.x, y: (p.y - c.y - F.y) * z + F.y };
  },
  // a character's face, drawn with their real sprite, clipped into a medallion
  drawPortrait(who, cx, cy, r, t) {
    const col = this.tagColors[who] || FLAME;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx + 3, cy + 4, r, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7);
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 2, cx, cy, r);
    g.addColorStop(0, '#fff3dc'); g.addColorStop(0.55, col); g.addColorStop(1, '#0d0b10');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    // sunburst rays behind the head
    ctx.globalAlpha = 0.18; ctx.fillStyle = BONE;
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + t * 0.3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a, a + 0.25); ctx.fill(); }
    ctx.globalAlpha = 1;
    const s = 2.1, headY = { LARS: -38, 'KING DENIZ': -50, DENIZ: -50, JOSH: -36, RESHMAN: -14 }[who] || -45;
    ctx.translate(cx - 2 * s, cy - headY * s + 4); ctx.scale(s, s);
    let drew = false;
    try { drew = this.portraitSprite(who, t); } catch (e) { logErr("zone/story.js:186", e); drew = false; }
    ctx.restore();
    if (!drew) {
      ctx.fillStyle = BONE; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.font = `${r}px ${DISPLAY_FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(who[0], cx, cy + 2); ctx.fillText(who[0], cx, cy + 2);
    }
    // specular sheen across the medallion, so the portrait reads as enamel
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
    const sh = ctx.createLinearGradient(cx - r, cy - r, cx + r * 0.4, cy + r * 0.7);
    sh.addColorStop(0, `rgba(255,255,255,${0.24 + Math.sin(t * 1.6) * 0.04})`); sh.addColorStop(0.55, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const sh2 = ctx.createLinearGradient(cx, cy + r * 0.2, cx, cy + r);
    sh2.addColorStop(0, 'rgba(0,0,0,0)'); sh2.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = sh2; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, 7); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(242,193,78,.8)'; ctx.stroke();
    ctx.restore();
  },
  portraitSprite(who, t) {
    switch (who) {
      case 'NATHAN': drawNathan(Object.assign({}, Player, { x: -Player.w / 2, y: -Player.h, facing: 1, lie: 0, invuln: 0, healT: 0, dashT: 0, attackT: 0, vx: 0, vy: 0, onGround: true, sx: 1, sy: 1, dead: false, shield: 0, noBat: true })); return true;
      case 'ADAM': drawAdam(0, 0, 1, t, { pose: 'idle' }); return true;
      case 'LARS': drawLars(0, 0, 1, t, { lamp: false }); return true;
      case 'RENAS': drawRenas(0, 0, 1, t, {}); return true;
      case 'DANIEL': drawDaniel(0, 0, 1, t, { rocket: false }); return true;
      case 'FIONN': drawFionn(0, 0, 1, t, {}); return true;
      case 'MILO': drawMilo(0, 0, 1, t, {}); return true;
      case 'KING DENIZ': drawDeniz(0, 0, 1, t, { crown: true }); return true;
      case 'DENIZ': drawDeniz(0, 0, 1, t, { hippie: true }); return true;
      case 'EVIL ADAM': if (typeof drawEvilAdam !== 'function') return false; drawEvilAdam(0, 0, 1, t, { pose: 'idle', aura: false }); return true;
      case 'JOSH': { const j = this._josh || (this._josh = new Josh(0, 0)); Object.assign(j, { x: -11, y: -46, facing: 1, vx: 0, phase: t, near: false, shop: false }); j.draw(); return true; }
      case 'RESHMAN':
        ctx.beginPath(); ctx.ellipse(0, -14, 15, 14, 0, 0, 7); ctx.fillStyle = '#000'; ctx.fill();
        if (Math.sin(t * 1.7) > -0.95) { ctx.fillStyle = BONE; ctx.beginPath(); ctx.ellipse(-5, -16, 2.6, 3.4, 0, 0, 7); ctx.ellipse(5, -16, 2.6, 3.4, 0, 0, 7); ctx.fill(); }
        return true;
      case 'ZENNITH': {
        // a dark, rain-slick orb with a cracked trophy at its heart and one pale eye
        const g = ctx.createRadialGradient(-3, -50, 1, 2, -45, 14);
        g.addColorStop(0, '#7a1f6e'); g.addColorStop(1, '#0d0510');
        ctx.beginPath(); ctx.arc(2, -45, 13, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d9b8ff'; ctx.stroke();
        ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(-3, -40); ctx.lineTo(7, -40); ctx.lineTo(5, -34); ctx.lineTo(-1, -34); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, -40); ctx.lineTo(1, -37); ctx.lineTo(3, -34); ctx.stroke();
        ctx.fillStyle = '#f3ead8'; ctx.beginPath(); ctx.ellipse(2, -49, 5, 1.2 + Math.abs(Math.sin(t * 0.8)) * 1.5, 0, 0, 7); ctx.fill();
        return true;
      }
    }
    return false;
  },
  drawDialogue() {
    const b = this.bubble; if (!b) return;
    const a = this.toScreen(typeof b.anchor === 'function' ? b.anchor() : b.anchor);
    const col = this.tagColors[b.who] || FLAME;
    ctx.save();
    const F = b.font || `17px ${SERIF_FONT}`;
    ctx.font = F;
    const lines = wrapText(b.text, 330), lh = 23;
    const w = Math.min(410, Math.max(180, Math.max(...lines.map(l => ctx.measureText(l).width)) + 56)), h = lines.length * lh + 40;
    const top = VH * 0.11 * this.letterbox + 40;
    const bx = clamp(a.x - w / 2, 20, VW - w - 20);
    let by = a.y - 34 - h, below = false;
    if (by < top) { by = Math.max(top, a.y + 46); below = true; }   // speaker near the top: hang the bubble underneath
    const tx = clamp(a.x, bx + 24, bx + w - 24), edge = below ? by : by + h;
    // pop in with a little overshoot
    const k = Math.min(1, b.age / 0.22), s = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
    ctx.translate(tx, edge); ctx.scale(s, s); ctx.translate(-tx, -edge);
    ctx.globalAlpha = Math.min(1, k * 2.5);
    // drop shadow in two layers, plus a coloured glow so the card floats off the scene
    ctx.fillStyle = 'rgba(5,3,8,.26)'; rr(bx + 16, by + 19, w, h, 9); ctx.fill();
    ctx.fillStyle = 'rgba(5,3,8,.5)'; rr(bx + 7, by + 8, w, h, 9); ctx.fill();
    rr(bx, by, w, h, 9); ctx.save(); ctx.lineWidth = 10; ctx.strokeStyle = hexA(col, 0.22); ctx.stroke(); ctx.restore();
    // paper body with a soft bottom shade and comic double-line
    rr(bx, by, w, h, 9); ctx.fillStyle = b.color; ctx.fill();
    const g = ctx.createLinearGradient(0, by, 0, by + h);
    g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(60,30,40,.16)');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    rr(bx + 5, by + 5, w - 10, h - 10, 6); ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(13,11,16,.2)'; ctx.stroke();
    // speaker-colour spine down the left edge, paper fibres and gilt corner ticks
    ctx.save(); rr(bx + 1, by + 1, w - 2, h - 2, 8); ctx.clip();
    const sg = ctx.createLinearGradient(0, by, 0, by + h);
    sg.addColorStop(0, hexA(col, 0.95)); sg.addColorStop(0.5, hexA(col, 0.55)); sg.addColorStop(1, hexA(col, 0.9));
    ctx.fillStyle = sg; ctx.fillRect(bx + 1, by, 7, h);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(bx + 1.5, by, 1.5, h);
    ctx.strokeStyle = 'rgba(13,11,16,.05)'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const yy = by + 13 + i * (h - 20) / 6;
      ctx.beginPath(); ctx.moveTo(bx + 11, yy); ctx.bezierCurveTo(bx + w * 0.32, yy - 2.5, bx + w * 0.64, yy + 2.5, bx + w - 9, yy); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(242,193,78,.7)'; ctx.lineWidth = 2; const tk = 10;
    for (const [cx2, cy2, dx, dy] of [[bx + w - 9, by + 9, -1, 1], [bx + 10, by + h - 9, 1, -1], [bx + w - 9, by + h - 9, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(cx2 + dx * tk, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + dy * tk); ctx.stroke();
    }
    // halftone dots in the corner
    ctx.fillStyle = 'rgba(13,11,16,.13)';
    for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) { const r = (i + j * 2) * 0.22; if (r < 0.3) continue; ctx.beginPath(); ctx.arc(bx + w - 12 - i * 7 - (j % 2) * 3.5, by + h - 10 - j * 6, Math.min(2.4, r), 0, 7); ctx.fill(); }
    // tail, aimed at the speaker
    const tipX = tx + clamp(a.x - tx, -26, 26) * 0.6, tipY = below ? by - 18 : by + h + 18;
    ctx.beginPath(); ctx.moveTo(tx - 11, edge); ctx.quadraticCurveTo(tx - 2, edge + (below ? -6 : 6), tipX, tipY); ctx.quadraticCurveTo(tx + 4, edge + (below ? -8 : 8), tx + 11, edge);
    ctx.fillStyle = b.color; ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx - 11, edge + (below ? -2 : 2)); ctx.quadraticCurveTo(tx - 2, edge + (below ? -6 : 6), tipX, tipY); ctx.quadraticCurveTo(tx + 4, edge + (below ? -8 : 8), tx + 11, edge + (below ? -2 : 2));
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    // portrait medallion + name tag
    const pr = 26, pcx = bx + 6, pcy = by - 4 + (b.shown < b.text.length ? Math.sin(Game.time * 26) * 1.2 : 0);
    ctx.font = `13px ${DISPLAY_FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const tagW = ctx.measureText(b.who).width + 26, tagX = pcx + pr - 4, tagY = by - 15;
    ctx.save(); ctx.translate(tagX, tagY); ctx.transform(1, 0, -0.18, 1, 0, 0);
    ctx.fillStyle = 'rgba(5,3,8,.5)'; ctx.fillRect(4, 4, tagW, 22);
    ctx.fillStyle = col; ctx.fillRect(0, 0, tagW, 22);
    const tg = ctx.createLinearGradient(0, 0, 0, 22);
    tg.addColorStop(0, 'rgba(255,255,255,.24)'); tg.addColorStop(0.45, 'rgba(255,255,255,0)'); tg.addColorStop(1, 'rgba(0,0,0,.3)');
    ctx.fillStyle = tg; ctx.fillRect(0, 0, tagW, 22);
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeRect(0, 0, tagW, 22);
    ctx.fillStyle = GOLD; ctx.fillRect(0, 18, tagW, 2);
    ctx.save(); ctx.translate(7, 11); ctx.rotate(Math.PI / 4); ctx.fillStyle = GOLD; ctx.fillRect(-3, -3, 6, 6); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-3, -3, 6, 6); ctx.restore();
    ctx.fillStyle = BONE; ctx.fillText(b.who, 16, 11);
    ctx.restore();
    this.drawPortrait(b.who, pcx, pcy, pr, Game.time);
    // rim light in the speaker's colour, pulsing gently while the line types out
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2.5;
    ctx.strokeStyle = hexA(col, 0.32 + 0.24 * Math.sin(Game.time * 2.2) + (b.shown < b.text.length ? 0.14 : 0));
    ctx.beginPath(); ctx.arc(pcx, pcy, pr + 2.5, 0, 7); ctx.stroke(); ctx.restore();
    if (b.fresh && b.age < 0.35) { ctx.beginPath(); ctx.arc(pcx, pcy, pr + (b.age / 0.35) * 16, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,240,220,${1 - b.age / 0.35})`; ctx.stroke(); }
    // text, word by word: SHOUTED words in red with a tremble, *actions* in italics
    ctx.textBaseline = 'top';
    let left = Math.floor(b.shown), wi = 0, inAct = false, caretX = bx + 36, caretY = by + 19;
    lines.forEach((l, li) => {
      let x = bx + 36;
      const y = by + 19 + li * lh;
      for (const word of l.split(' ')) {
        if (left <= 0) return;
        const vis = word.slice(0, left), bare = word.replace(/[^A-Za-z]/g, '');
        const shout = !b.plain && bare.length >= 2 && bare === bare.toUpperCase() && !NOT_SHOUTS.includes(bare);
        if (word.startsWith('*')) inAct = true;
        const act = inAct;
        if (/\*[.,!?…]*$/.test(word) && (word.length > 1 || !word.startsWith('*'))) inAct = false;
        ctx.font = act ? `italic ${F}` : F;
        ctx.fillStyle = act ? '#6a5470' : shout ? '#b3200c' : INK;
        const j = shout ? Math.sin(Game.time * 47 + wi * 2.3) * 0.9 : 0;
        ctx.fillText(vis, x + j, y + Math.cos(Game.time * 41 + wi) * Math.abs(j));
        caretX = x + ctx.measureText(vis).width + 2; caretY = y;
        ctx.font = F; x += ctx.measureText(word + ' ').width; left -= word.length + 1; wi++;
      }
    });
    // a blinking ink caret where the next word will land
    if (b.shown < b.text.length && Math.sin(Game.time * 11) > -0.15) { ctx.fillStyle = hexA(col, 0.85); ctx.fillRect(caretX, caretY + 1, 2, 17); }
    // progress through the line, drawn along the bottom of the card
    const prog = clamp(b.shown / b.text.length, 0, 1);
    ctx.fillStyle = 'rgba(13,11,16,.13)'; ctx.fillRect(bx + 12, by + h - 8, w - 24, 1.5);
    ctx.fillStyle = hexA(col, 0.85); ctx.fillRect(bx + 12, by + h - 8, (w - 24) * prog, 1.5);
    // waiting-for-you arrow
    if (b.shown >= b.text.length) {
      const bob = Math.abs(Math.sin(Game.time * 5)) * 4;
      ctx.beginPath(); ctx.moveTo(bx + w - 24, by + h - 20 + bob); ctx.lineTo(bx + w - 12, by + h - 20 + bob); ctx.lineTo(bx + w - 18, by + h - 13 + bob); ctx.closePath();
      ctx.fillStyle = FLAME; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
    }
    ctx.restore();
  },
  drawBeam() {
    const B = this.beam; if (!B) return;
    const r = ROOM.server.px, y = B.y, k = Math.min(1, B.t / 0.15), fade = B.t > 0.9 ? Math.max(0, 1 - (B.t - 0.9) / 0.6) : 1;
    if (fade <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const x0 = r.x + r.w - 20, x1 = lerp(x0, B.toX, k);
    const g = ctx.createLinearGradient(0, y - 26, 0, y + 26);
    g.addColorStop(0, 'rgba(111,211,255,0)'); g.addColorStop(0.5, `rgba(220,245,255,${fade})`); g.addColorStop(1, 'rgba(111,211,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x1, y - 26, x0 - x1, 52);
    ctx.fillStyle = `rgba(111,211,255,${0.35 * fade})`; ctx.fillRect(x1, y - 60, x0 - x1, 120);
    ctx.restore();
  },
  drawScreen() {
    const I = this.intro, L = this.letterbox;
    const flat = typeof Scene !== 'undefined' && Scene.on;
    if (L > 0.01) this.drawGrade(L);
    if (L > 0.01) this.drawKeyLight(L);
    if (this.lines > 0.01 && this.linesAt) this.drawSpeedLines();
    if (!flat) this.drawDialogue();
    // letterbox
    if (L > 0.01) this.drawBars(L);
    if (I.black > 0.001) { ctx.fillStyle = `rgba(5,3,8,${I.black})`; ctx.fillRect(0, 0, VW, VH); }
    if (I.memory) { this.drawMemory(I.memory); this.drawBars(L); }
    if (I.lids > 0.001) this.drawLids(I.lids);
    if (I.ball) {
      // a cracked baseball rolling across a wooden floor, under a single hanging work-light
      const fy = VH * 0.68;
      const fl = ctx.createLinearGradient(0, fy, 0, VH);
      fl.addColorStop(0, '#4a3020'); fl.addColorStop(1, '#1e130b');
      ctx.fillStyle = fl; ctx.fillRect(0, fy, VW, VH - fy);
      ctx.strokeStyle = '#1a100a'; ctx.lineWidth = 2;
      for (let x = 0; x < VW + 200; x += 120) { ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x - (x - VW / 2) * 0.35, VH); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(26,16,10,.45)'; ctx.lineWidth = 1;
      for (let i = 0; i < 26; i++) { const gx = (i * 173) % VW, gy = fy + 8 + (i * 61) % (VH - fy - 12); ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + 20, gy - 2, gx + 46, gy + 1); ctx.stroke(); }
      ctx.strokeStyle = '#1a100a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(VW, fy); ctx.stroke();
      const k = Math.min(1, I.ball.t / 2.2), e = 1 - Math.pow(1 - k, 3);
      const bx = lerp(-40, VW * 0.52, e), r = 26;
      // the work-light's pool
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cone = ctx.createRadialGradient(VW * 0.52, fy, 10, VW * 0.52, fy, VW * 0.42);
      cone.addColorStop(0, 'rgba(255,200,130,.32)'); cone.addColorStop(1, 'rgba(255,200,130,0)');
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(VW * 0.52 - 14, 0); ctx.lineTo(VW * 0.52 + 14, 0); ctx.lineTo(VW * 0.86, VH); ctx.lineTo(VW * 0.18, VH); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#0d0b10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(VW * 0.52, 0); ctx.lineTo(VW * 0.52, VH * 0.12 + Math.sin(I.ball.t * 1.3) * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(VW * 0.52, VH * 0.12 + 8, 10, Math.PI, 0); ctx.fillStyle = '#2b2733'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(VW * 0.52, VH * 0.12 + 10, 4, 0, 7); ctx.fillStyle = '#ffe2a8'; ctx.fill();
      // dust kicked up behind the ball
      if (k < 1) for (let i = 0; i < 6; i++) { const dx = bx - 30 - i * 16, a = (1 - i / 6) * (1 - k) * 0.4; ctx.fillStyle = `rgba(200,170,130,${a})`; ctx.beginPath(); ctx.arc(dx, fy - 4 - Math.sin(i + I.ball.t * 6) * 3, 6 + i * 2, 0, 7); ctx.fill(); }
      ctx.save(); ctx.translate(bx, fy - r); ctx.rotate(e * 9);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); inked(BONE, 3.5);
      ctx.strokeStyle = FLAME; ctx.lineWidth = 2.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(-22, 0, 18, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(22, 0, 18, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-6, -24); ctx.lineTo(2, -10); ctx.lineTo(-4, -2); ctx.lineTo(6, 8); ctx.lineTo(2, 20); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(bx, fy + 2, r * 0.9, 5, 0, 0, 7); ctx.fill();
    }
    if (I.flash > 0) { ctx.fillStyle = `rgba(255,248,240,${I.flash})`; ctx.fillRect(0, 0, VW, VH); }
    if (I.bolt > 0) {
      // dark, trophy-shaped lightning
      ctx.save(); ctx.globalAlpha = Math.min(1, I.bolt * 1.5);
      const cx = VW / 2;
      ctx.fillStyle = '#1a0820'; ctx.strokeStyle = '#b98bff'; ctx.lineWidth = 4; ctx.shadowColor = '#b98bff'; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.moveTo(cx - 120, 60); ctx.lineTo(cx + 120, 60); ctx.quadraticCurveTo(cx + 110, 220, cx + 14, 250);
      ctx.lineTo(cx + 40, 330); ctx.lineTo(cx - 10, 300); ctx.lineTo(cx + 30, 420); ctx.lineTo(cx - 40, 290); ctx.lineTo(cx - 6, 310); ctx.lineTo(cx - 14, 250);
      ctx.quadraticCurveTo(cx - 110, 220, cx - 120, 60); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - 130, 110, 34, -1.6, 1.6); ctx.moveTo(cx + 130, 76); ctx.arc(cx + 130, 110, 34, -1.6, 1.6, true); ctx.stroke();
      ctx.restore();
    }
    // full-screen ending scenes (Act III) draw over all this, then call drawOverlays themselves
    if (!flat) this.drawOverlays();
  },
  drawOverlays() {
    const L = this.letterbox, flat = typeof Scene !== 'undefined' && Scene.on;
    if (flat) { this.drawDialogue(); if (L > 0.01) this.drawBars(L); }
    if (this.card) this.drawCard(this.card);
    if (this.bossCard) this.drawBossCard(this.bossCard);
    const barY = VH - VH * 0.055 * L;
    if (this.skippable && !this.skipping) {
      ctx.font = `13px ${DISPLAY_FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(243,234,216,${0.45 + this.skipHold * 0.5})`;
      ctx.fillText('HOLD ' + Bindings.label('attack', Game.lastInput) + ' TO SKIP', 58, barY);
      ctx.strokeStyle = 'rgba(243,234,216,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(38, barY, 9, 0, 7); ctx.stroke();
      if (this.skipHold > 0) { ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.arc(38, barY, 9, -Math.PI / 2, -Math.PI / 2 + this.skipHold / 1.1 * Math.PI * 2); ctx.stroke(); }
    }
    if (this.bubble && this.bubble.shown >= this.bubble.text.length && L > 0.5) {
      ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(243,234,216,${0.45 + Math.sin(Game.time * 4) * 0.2})`;
      ctx.fillText(Bindings.label('jump', Game.lastInput) + '  CONTINUE  ▸', VW - 32, barY);
    }
  },
  // colour grade for scenes: warm-to-violet wash, heavier vignette, film grain and floating dust
  drawGrade(L) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const wash = ctx.createLinearGradient(0, 0, 0, VH);
    wash.addColorStop(0, `rgba(255,190,120,${0.35 * L})`); wash.addColorStop(1, `rgba(90,40,140,${0.4 * L})`);
    ctx.fillStyle = wash; ctx.fillRect(0, 0, VW, VH);
    ctx.globalCompositeOperation = 'source-over';
    const vg = ctx.createRadialGradient(VW / 2, VH * 0.48, VH * 0.25, VW / 2, VH * 0.48, VH * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(5,3,8,${0.45 * L})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
    // projector beam from the top-left
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createRadialGradient(VW * 0.18, -VH * 0.2, 10, VW * 0.18, -VH * 0.2, VH * 1.1);
    beam.addColorStop(0, `rgba(255,220,170,${0.07 * L})`); beam.addColorStop(1, 'rgba(255,220,170,0)');
    ctx.fillStyle = beam; ctx.fillRect(0, 0, VW, VH);
    for (const m of this.motes) {
      const a = Math.min(1, m.life / 1.5) * (0.35 + 0.35 * Math.sin(Game.time * 3 + m.ph)) * L;
      ctx.fillStyle = `rgba(255,226,180,${a})`; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // out-of-focus highlights drifting behind the frame: cheap depth of field
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const h = Math.sin(i * 41.3 + 7.1) * 43758.5, j = h - Math.floor(h);
      const x = ((j * VW + Game.time * (5 + j * 9)) % (VW + 220)) - 110;
      const y = VH * (0.12 + j * 0.74) + Math.sin(Game.time * 0.7 + i) * 12;
      const r = 16 + j * 44, al = (0.045 + j * 0.035) * L;
      const bg = ctx.createRadialGradient(x, y, r * 0.25, x, y, r);
      bg.addColorStop(0, `rgba(255,228,184,${al})`); bg.addColorStop(0.65, `rgba(255,198,150,${al * 0.55})`); bg.addColorStop(1, 'rgba(255,198,150,0)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    ctx.restore();
    // faint scanlines, sold as a projection artefact
    ctx.fillStyle = `rgba(8,4,12,${0.05 * L})`;
    for (let y = 0; y < VH; y += 4) ctx.fillRect(0, y, VW, 1);
    // chromatic fringe on the extreme edges
    const fr = ctx.createLinearGradient(0, 0, VW, 0);
    fr.addColorStop(0, `rgba(255,86,60,${0.10 * L})`); fr.addColorStop(0.22, 'rgba(255,86,60,0)');
    fr.addColorStop(0.78, 'rgba(70,180,255,0)'); fr.addColorStop(1, `rgba(70,180,255,${0.10 * L})`);
    ctx.fillStyle = fr; ctx.fillRect(0, 0, VW, VH);
    if (!this.grain) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'), d = g.createImageData(128, 128);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      g.putImageData(d, 0, 0); this.grain = ctx.createPattern(c, 'repeat');
    }
    ctx.globalAlpha = 0.05 * L; ctx.globalCompositeOperation = 'overlay';
    const ox = Math.floor(Game.time * 24) * 37 % 128, oy = Math.floor(Game.time * 24) * 53 % 128;
    ctx.translate(-ox, -oy); ctx.fillStyle = this.grain; ctx.fillRect(0, 0, VW + 128, VH + 128);
    ctx.restore();
  },
  // a soft, warm key light on the speaker: scenes read as if they were lit for camera
  drawKeyLight(L) {
    const K = this.key, b = this.bubble;
    if (!K || K.a < 0.01 || K.x < 0) return;
    const col = (b && this.tagColors[b.who]) || GOLD, flick = 0.94 + Math.sin(Game.time * 3.1) * 0.06;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(K.x, K.y - 6, 10, K.x, K.y - 6, 300);
    g.addColorStop(0, `rgba(255,236,196,${0.13 * K.a * L * flick})`);
    g.addColorStop(0.35, hexA(col, 0.09 * K.a * L * flick));
    g.addColorStop(0.7, hexA(col, 0.03 * K.a * L));
    g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g; ctx.fillRect(K.x - 300, K.y - 306, 600, 600);
    // a tighter core, so the face itself reads brightest
    const core = ctx.createRadialGradient(K.x, K.y - 6, 2, K.x, K.y - 6, 90);
    core.addColorStop(0, `rgba(255,246,226,${0.10 * K.a * L})`); core.addColorStop(1, 'rgba(255,246,226,0)');
    ctx.fillStyle = core; ctx.fillRect(K.x - 90, K.y - 96, 180, 180);
    ctx.restore();
  },
  drawBars(L) {
    const e = L * L * (3 - 2 * L), h = VH * 0.11 * e;
    for (const [y0, y1] of [[0, h], [VH - h, VH]]) {
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, y0 === 0 ? '#050308' : '#140d18'); g.addColorStop(1, y0 === 0 ? '#140d18' : '#050308');
      ctx.fillStyle = g; ctx.fillRect(0, y0, VW, y1 - y0);
    }
    // gold pinstripe with a light sweep running along it
    ctx.fillStyle = `rgba(242,193,78,${0.55 * e})`; ctx.fillRect(0, h - 2, VW, 1.5); ctx.fillRect(0, VH - h + 0.5, VW, 1.5);
    const sx = ((Game.time * 0.18) % 1.4 - 0.2) * VW, sw = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0);
    sw.addColorStop(0, 'rgba(255,240,200,0)'); sw.addColorStop(0.5, `rgba(255,240,200,${0.8 * e})`); sw.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = sw; ctx.fillRect(sx - 120, h - 2.5, 240, 2.5); ctx.fillRect(VW - sx - 120, VH - h, 240, 2.5);
    // soft bevel just inside each bar
    ctx.fillStyle = `rgba(255,236,199,${0.10 * e})`;
    ctx.fillRect(0, h, VW, 1); ctx.fillRect(0, VH - h - 1, VW, 1);
    // viewfinder corner marks, so the frame reads as camera
    ctx.save(); ctx.strokeStyle = `rgba(242,193,78,${0.38 * e})`; ctx.lineWidth = 2;
    const ck = 22, pd = 13;
    for (const [x, y, sx2, sy2] of [[pd, h + pd, 1, 1], [VW - pd, h + pd, -1, 1], [pd, VH - h - pd, 1, -1], [VW - pd, VH - h - pd, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x + sx2 * ck, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy2 * ck); ctx.stroke();
    }
    ctx.restore();
    // three inning diamonds centred in the top bar
    if (h > 10) {
      ctx.save(); ctx.translate(VW / 2, h * 0.55);
      for (let i = -1; i <= 1; i++) {
        ctx.fillStyle = `rgba(242,193,78,${(0.3 + 0.22 * Math.sin(Game.time * 1.6 + i)) * e})`;
        ctx.save(); ctx.translate(i * 26, 0); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore();
      }
      ctx.restore();
      // running film timecode in the lower bar
      const ff = Math.floor(Game.time * 60), mm = Math.floor(ff / 3600) % 60, ss = Math.floor(ff / 60) % 60, fr2 = ff % 60;
      ctx.save(); ctx.font = '11px ui-monospace, Menlo, monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(243,234,216,${0.32 * e})`;
      ctx.fillText(`00:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(fr2).padStart(2, '0')}`, VW - 34, VH - h * 0.5);
      ctx.restore();
    }
  },
  drawSpeedLines() {
    const p = this.toScreen(this.linesAt), a = this.lines, seed = Math.floor(Game.time * 20);
    ctx.save(); ctx.fillStyle = `rgba(13,11,16,${0.75 * a})`;
    for (let i = 0; i < 46; i++) {
      const h = Math.sin(i * 91.7 + seed * 13.1) * 43758.5, j = h - Math.floor(h);
      const ang = i / 46 * Math.PI * 2 + j * 0.12, r0 = 150 + j * 120 + (1 - a) * 160, r1 = VW, wdt = 0.012 + j * 0.018;
      ctx.beginPath(); ctx.moveTo(p.x + Math.cos(ang) * r0, p.y + Math.sin(ang) * r0);
      ctx.lineTo(p.x + Math.cos(ang - wdt) * r1, p.y + Math.sin(ang - wdt) * r1); ctx.lineTo(p.x + Math.cos(ang + wdt) * r1, p.y + Math.sin(ang + wdt) * r1);
      ctx.fill();
    }
    ctx.restore();
  },
  drawCard(c) {
    const t = c.t, a = Math.min(1, t / 0.5) * Math.min(1, (c.dur - t) / 0.6), cy = VH * 0.46;
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    // torn ink band
    ctx.beginPath(); ctx.moveTo(0, cy - 78);
    for (let x = 0; x <= VW; x += 24) ctx.lineTo(x, cy - 78 + Math.sin(x * 0.07) * 5 + Math.sin(x * 0.23) * 3);
    for (let x = VW; x >= 0; x -= 24) ctx.lineTo(x, cy + 78 + Math.sin(x * 0.05 + 2) * 5 + Math.sin(x * 0.31) * 3);
    ctx.closePath(); ctx.fillStyle = 'rgba(8,5,12,.86)'; ctx.fill();
    // halftone screen and a slow light sweep across the band
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,240,205,.055)';
    for (let y = cy - 76; y < cy + 76; y += 18) for (let x = ((y / 18) | 0) % 2 ? 9 : 0; x < VW; x += 18) ctx.fillRect(x, y, 2, 2);
    const lsp = ((t * 0.5) % 1) * (VW + 420) - 210;
    const lgr = ctx.createLinearGradient(lsp - 150, cy - 80, lsp + 150, cy + 80);
    lgr.addColorStop(0, 'rgba(255,240,200,0)'); lgr.addColorStop(0.5, `rgba(255,240,200,${0.10 * a})`); lgr.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = lgr; ctx.fillRect(0, cy - 78, VW, 156);
    ctx.restore();
    // gold rules growing outward
    const grow = Math.min(1, t / 1.1), rw = VW * 0.34 * (1 - Math.pow(1 - grow, 3));
    ctx.fillStyle = GOLD;
    ctx.fillRect(VW / 2 - rw, cy - 50, rw * 2, 2); ctx.fillRect(VW / 2 - rw, cy + 54, rw * 2, 2);
    for (const sx of [-1, 1]) { ctx.save(); ctx.translate(VW / 2 + sx * rw, cy - 49); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore(); ctx.save(); ctx.translate(VW / 2 + sx * rw, cy + 55); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (c.sub) { ctx.font = `14px ${DISPLAY_FONT}`; ctx.fillStyle = GOLD; if ('letterSpacing' in ctx) ctx.letterSpacing = '7px'; ctx.fillText(c.sub, VW / 2 + 3, cy - 30); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; }
    // the title stamps in letter by letter
    ctx.font = `58px ${DISPLAY_FONT}`;
    const total = ctx.measureText(c.main).width; let x = VW / 2 - total / 2;
    for (let i = 0; i < c.main.length; i++) {
      const ch = c.main[i], cw = ctx.measureText(ch).width, lk = clamp((t - 0.25 - i * 0.045) / 0.22, 0, 1);
      if (lk > 0) {
        const s = 1 + (1 - lk) * 1.6;
        ctx.save(); ctx.globalAlpha = a * lk; ctx.translate(x + cw / 2, cy + 14); ctx.scale(s, s);
        ctx.fillStyle = FLAME; ctx.fillText(ch, 4, 4);
        ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.strokeText(ch, 0, 0);
        ctx.fillStyle = BONE; ctx.fillText(ch, 0, 0);
        ctx.restore();
      }
      x += cw;
    }
    // embers drifting up through the band
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const h = Math.sin(i * 12.9898) * 43758.5, j = h - Math.floor(h), life = (t * (0.3 + j * 0.4) + j) % 1;
      ctx.fillStyle = `rgba(255,${140 + j * 80 | 0},60,${(1 - life) * a})`;
      ctx.beginPath(); ctx.arc(VW * (0.2 + j * 0.6) + Math.sin(t * 2 + i) * 12, cy + 70 - life * 150, 1.5 + j * 2, 0, 7); ctx.fill();
    }
    ctx.restore();
  },
  drawBossCard(c) {
    const t = c.t, out = Math.min(1, (3.6 - t) / 0.7), cy = VH * 0.73;
    ctx.save();
    // ink slash sweeping in from the left
    const sweep = 1 - Math.pow(1 - Math.min(1, t / 0.28), 3), x1 = VW * 1.1 * sweep;
    ctx.globalAlpha = out;
    ctx.beginPath(); ctx.moveTo(-40, cy - 46); ctx.lineTo(x1, cy - 62); ctx.lineTo(x1 - 60, cy + 54); ctx.lineTo(-40, cy + 64); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, VW, 0);
    g.addColorStop(0, 'rgba(8,5,12,.92)'); g.addColorStop(0.7, 'rgba(60,12,20,.85)'); g.addColorStop(1, 'rgba(8,5,12,0)');
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = FLAME; ctx.beginPath(); ctx.moveTo(-40, cy + 58); ctx.lineTo(x1 - 58, cy + 50); ctx.lineTo(x1 - 62, cy + 56); ctx.lineTo(-40, cy + 66); ctx.fill();
    // speed streaks
    ctx.fillStyle = 'rgba(243,234,216,.35)';
    for (let i = 0; i < 9; i++) { const yy = cy - 40 + i * 11, len = 60 + (i * 53 % 90), xx = ((t * 1400 + i * 211) % (VW + 300)) - 150; ctx.fillRect(xx, yy, len, 1.5); }
    // an angry red bloom behind the name, and hairline cracks in the plate
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const bloom = ctx.createRadialGradient(VW / 2, cy + 6, 10, VW / 2, cy + 6, 320);
    bloom.addColorStop(0, `rgba(232,54,28,${0.22 * out})`); bloom.addColorStop(1, 'rgba(232,54,28,0)');
    ctx.fillStyle = bloom; ctx.fillRect(VW / 2 - 320, cy - 160, 640, 340);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = `rgba(243,234,216,${0.10 * out})`; ctx.lineWidth = 1.2;
    for (const [x, y, len] of [[VW * 0.22, cy - 20, 90], [VW * 0.7, cy + 18, 120], [VW * 0.55, cy - 34, 70]]) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * 0.4, y + 9); ctx.lineTo(x + len * 0.7, y - 4); ctx.lineTo(x + len, y + 6); ctx.stroke();
    }
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (c.epithet) {
      ctx.font = `15px ${DISPLAY_FONT}`; ctx.fillStyle = GOLD; ctx.globalAlpha = out * clamp((t - 0.35) / 0.3, 0, 1);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
      ctx.fillText(c.epithet, VW / 2, cy - 32);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
    // the name slams in from the right with motion ghosts
    const nk = clamp((t - 0.15) / 0.3, 0, 1), ne = 1 - Math.pow(1 - nk, 4), nx = VW / 2 + (1 - ne) * VW * 0.6;
    ctx.font = `54px ${DISPLAY_FONT}`;
    for (let gI = 3; gI >= 1; gI--) { ctx.globalAlpha = out * nk * (0.12 * (4 - gI)) * (1 - ne * 0.7); ctx.fillStyle = FLAME; ctx.fillText(c.title, nx + gI * 26 * (1 - ne + 0.15), cy + 10); }
    ctx.globalAlpha = out * nk;
    ctx.fillStyle = FLAME; ctx.fillText(c.title, nx + 4, cy + 14);
    ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.strokeText(c.title, nx, cy + 10);
    ctx.fillStyle = BONE; ctx.fillText(c.title, nx, cy + 10);
    // impact flash where the name lands
    if (t > 0.42 && t < 0.7) { const f = 1 - (t - 0.42) / 0.28; ctx.globalAlpha = f * 0.8; ctx.fillStyle = '#fff6e0'; ctx.fillRect(0, cy - 62, VW, 128); }
    ctx.restore();
  },
  // the intro flashback: the Grand Final, on flickering sepia film
  drawMemory(m) {
    const t = m.t, hash = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
    const flick = 0.88 + hash(Math.floor(t * 18)) * 0.12, fade = Math.min(1, t / 0.6);
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(rand(-1.2, 1.2), rand(-0.8, 0.8));
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#140c08'); sky.addColorStop(0.5, '#4a3220'); sky.addColorStop(1, '#22160c');
    ctx.fillStyle = sky; ctx.fillRect(-4, -4, VW + 8, VH + 8);
    // floodlight towers pouring light onto the diamond
    for (const fx of [VW * 0.1, VW * 0.9]) {
      const dir = fx < VW / 2 ? 1 : -1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cone = ctx.createLinearGradient(fx, VH * 0.08, VW / 2, VH * 0.9);
      cone.addColorStop(0, 'rgba(255,226,160,.42)'); cone.addColorStop(1, 'rgba(255,226,160,0)');
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(fx - 30, VH * 0.09); ctx.lineTo(fx + 30, VH * 0.09); ctx.lineTo(VW / 2 + dir * 260, VH * 0.95); ctx.lineTo(VW / 2 - dir * 80, VH * 0.95); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#0e0805'; ctx.fillRect(fx - 4, VH * 0.08, 8, VH * 0.42); ctx.fillRect(fx - 36, VH * 0.05, 72, 30);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(255,240,200,${0.7 + hash(i + fx) * 0.3})`; ctx.beginPath(); ctx.arc(fx - 27 + (i % 4) * 18, VH * 0.05 + 8 + Math.floor(i / 4) * 13, 5, 0, 7); ctx.fill(); }
    }
    // the crowd, a bowl of bobbing heads, on their feet
    for (let row = 0; row < 5; row++) {
      const base = VH * (0.32 + row * 0.065);
      for (let x = -14, n = 0; x < VW + 14; x += 12 - row, n++) {
        const j = hash(n * 3.1 + row * 17), curve = Math.pow((x - VW / 2) / (VW / 2), 2) * -60;
        const y = base + curve - Math.max(0, Math.sin(t * (5 + j * 5) + j * 20)) * (3 + row);
        ctx.fillStyle = row % 2 ? '#1a100a' : '#24170e';
        ctx.beginPath(); ctx.arc(x + j * 5, y, 4.5 + row * 0.8, 0, 7); ctx.fill();
        ctx.fillRect(x + j * 5 - 5 - row * 0.8, y + 3, 10 + row * 1.6, 16);
        if (j > 0.78) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + j * 5 + 4, y + 6); ctx.lineTo(x + j * 5 + 9, y - 9 - Math.sin(t * 9 + n) * 3); ctx.stroke(); }
      }
    }
    // camera flashes popping in the stands
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const f = Math.floor(t * 7), h = hash(i * 7 + f);
      if (h < 0.72) continue;
      const fx = hash(i + f * 3) * VW, fy = VH * (0.28 + hash(i * 5 + f) * 0.3), g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 22);
      g.addColorStop(0, 'rgba(255,250,235,.95)'); g.addColorStop(1, 'rgba(255,250,235,0)');
      ctx.fillStyle = g; ctx.fillRect(fx - 22, fy - 22, 44, 44);
    }
    ctx.restore();
    // the field and the diamond
    ctx.fillStyle = '#33301a'; ctx.beginPath(); ctx.ellipse(VW / 2, VH * 1.02, VW * 0.7, VH * 0.26, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(220,200,160,.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(VW * 0.34, VH * 0.92); ctx.lineTo(VW * 0.5, VH * 0.82); ctx.lineTo(VW * 0.66, VH * 0.88); ctx.stroke();
    ctx.fillStyle = '#4a3a22'; ctx.beginPath(); ctx.ellipse(VW * 0.64, VH * 0.875, 46, 10, 0, 0, 7); ctx.fill();
    // the players, in old-film tones: Adam on the mound, Nathan at the plate
    ctx.filter = 'sepia(1) brightness(0.8) contrast(1.25)';
    ctx.save(); ctx.translate(VW * 0.64, VH * 0.875); ctx.scale(2.3, 2.3);
    drawAdam(0, 0, -1, t, { pose: t > 1.15 && t < 1.65 ? 'serve' : 'idle' });
    ctx.restore();
    ctx.save(); ctx.translate(VW * 0.33, VH * 0.93); ctx.scale(2.5, 2.5);
    drawNathan(Object.assign({}, Player, { x: -Player.w / 2, y: -Player.h, facing: 1, lie: 0, invuln: 0, healT: 0, dashT: 0, attackT: 0, vx: 0, vy: 0, onGround: true, sx: 1, sy: 1, dead: false, shield: 0, noBat: false }));
    ctx.restore();
    ctx.filter = 'none';
    // the pitch
    if (t > 1.45) {
      const k = Math.min(1, (t - 1.45) / 0.75), x = lerp(VW * 0.6, VW * 0.39, k), y = lerp(VH * 0.72, VH * 0.8, k) - Math.sin(k * Math.PI) * 26;
      for (let i = 1; i <= 5; i++) { ctx.fillStyle = `rgba(243,226,190,${0.12 * (6 - i)})`; ctx.beginPath(); ctx.arc(x + i * 9, y - i * 1.5, 6 - i * 0.6, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.arc(x, y, 6.5, 0, 7); ctx.fillStyle = '#f3e6c8'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#1a100a'; ctx.stroke();
    }
    // the film itself: sepia wash, flicker, scratches, specks, burnt corners
    ctx.fillStyle = `rgba(120,78,36,${0.22 + (1 - flick)})`; ctx.fillRect(-4, -4, VW + 8, VH + 8);
    ctx.strokeStyle = 'rgba(240,225,190,.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const sx = hash(Math.floor(t * 9) + i * 13) * VW; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + rand(-4, 4), VH); ctx.stroke(); }
    ctx.fillStyle = 'rgba(20,12,6,.55)';
    for (let i = 0; i < 10; i++) { const h = hash(Math.floor(t * 12) * 31 + i); if (h < 0.5) continue; ctx.beginPath(); ctx.arc(hash(i * 9 + h) * VW, hash(i * 4 + h * 7) * VH, 1 + h * 2, 0, 7); ctx.fill(); }
    const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.2, VW / 2, VH / 2, VH * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,2,.92)');
    ctx.fillStyle = vg; ctx.fillRect(-4, -4, VW + 8, VH + 8);
    // caption, typed onto the frame
    const cap = 'The Grand Final. Bottom of the ninth. One swing from the trophy.', n = Math.floor(clamp((t - 0.4) * 30, 0, cap.length));
    ctx.font = `italic 19px ${SERIF_FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(243,226,190,.9)';
    ctx.fillText(cap.slice(0, n), 60, VH * 0.86);
    ctx.font = `12px ${DISPLAY_FONT}`; ctx.fillStyle = 'rgba(242,193,78,.75)'; ctx.fillText('ONE NIGHT AGO', 60, VH * 0.86 - 26);
    ctx.restore();
  },
  // eyelids opening: Nathan coming to
  drawLids(k) {
    const h = VH / 2 * k;
    ctx.save();
    for (const top of [true, false]) {
      ctx.beginPath();
      if (top) { ctx.moveTo(0, 0); ctx.lineTo(VW, 0); ctx.lineTo(VW, h - 40 * k); ctx.quadraticCurveTo(VW / 2, h + 60 * k, 0, h - 40 * k); }
      else { ctx.moveTo(0, VH); ctx.lineTo(VW, VH); ctx.lineTo(VW, VH - h + 40 * k); ctx.quadraticCurveTo(VW / 2, VH - h - 60 * k, 0, VH - h + 40 * k); }
      ctx.closePath(); ctx.fillStyle = '#070308'; ctx.fill();
      // blood-red glow where the light leaks through
      ctx.lineWidth = 26; ctx.strokeStyle = `rgba(90,10,14,${0.5 * k})`; ctx.stroke();
    }
    ctx.restore();
  },

  /* ---------- Scripts ---------- */
  nathanHead() { return { x: Player.x + Player.w / 2, y: Player.y - (Player.lie ? -10 : 18) }; },
  jumboAnchor() { return { x: Z.jumbo.x + Z.jumbo.w / 2, y: Z.jumbo.y + Z.jumbo.h + 70 }; },

  playIntro() {
    return this.run(async () => {
      const I = this.intro;
      Player.lie = 1; Player.noBat = true; Player.facing = 1;
      I.black = 1; I.blackTarget = 1;
      await this.wait(0.5);
      await this.title('EXTRA INNINGS', 'THE NIGHT EVERYTHING CRACKED', 3.4);
      // Scene 1 · the flashback
      I.memory = { t: 0 };
      await this.wait(0.6);
      SFX.crowd(2.8); await this.wait(2.3);
      SFX.bigCrack(); SFX.thunder(); I.memory = null; I.flash = 1; I.bolt = 1.4; addShake(14); await this.wait(1.4);
      I.ball = { t: 0 }; SFX.roll(); await this.wait(2.8);
      I.ball = null; await this.wait(0.4);
      // Scene 2 · waking up: eyes crack open, blink, open
      I.lids = 1; I.black = 0; I.blackTarget = 0; this.zoom = 1.3; this.zoomTo(1.18);
      await this.tween(I, 'lids', 0.62, 0.9); await this.wait(0.25);
      await this.tween(I, 'lids', 0.95, 0.18);
      await this.tween(I, 'lids', 0, 0.8);
      SFX.groan(); await this.say('NATHAN', 'Ugh… my head…', () => this.nathanHead());
      this.zoomTo(null);
      await this.tween(Player, 'lie', 0, 0.7); Player.sx = 1.2; Player.sy = 0.8; dust(Player.x + 11, Player.y + Player.h, 6);
      await this.wait(0.4);
      Player.noBat = false; SFX.toss(); pop(Player.x + 30, Player.y - 4, 'GRAB', { size: 22, burst: false });
      await this.wait(0.5);
      for (let i = 0; i < 3; i++) { dust(Player.x + 11, Player.y + 20, 2); SFX.step(); await this.wait(0.18); }
      // Scene 3 · the jumbotron
      this.camTarget = { x: Z.jumbo.x + Z.jumbo.w / 2, y: Z.jumbo.y + Z.jumbo.h / 2 + 40 };
      this.zoomTo(1.2);
      await this.wait(1.1);
      SFX.staticBuzz(0.9);
      for (let i = 0; i < 6; i++) { this.jumbo.on = i % 2 === 0; this.jumbo.flicker = Math.random(); await this.wait(0.08); }
      this.jumbo.on = true; this.jumbo.flicker = 1; this.punch(0.05, 4);
      await this.wait(0.5);
      const ea = () => this.jumboAnchor();
      await this.say('EVIL ADAM', 'Welcome to the Grand Championship, boys.', ea, { voice: 0.6, color: '#e6d6ff' });
      await this.say('EVIL ADAM', 'No timeouts. No rain delays.', ea, { voice: 0.6, color: '#e6d6ff' });
      this.zoomTo(1.32);
      await this.say('EVIL ADAM', 'Beat the bracket from the bottom… or stay trapped here forever.', ea, { voice: 0.6, color: '#e6d6ff' });
      SFX.thunder(); this.punch(0.1, 10); this.lines = 0.8; this.linesAt = { x: Z.jumbo.x + Z.jumbo.w / 2, y: Z.jumbo.y + Z.jumbo.h / 2 };
      await this.say('EVIL ADAM', 'Match point.', ea, { voice: 0.5, color: '#e6d6ff' });
      // Scene 4 · cut out, back to Nathan
      SFX.staticBuzz(0.3); this.jumbo.on = false; this.jumbo.flicker = 1;
      await this.wait(0.9);
      this.camTarget = null; this.zoomTo(1.22); await this.wait(0.8);
      await this.say('NATHAN', 'Adam?! …No. That\'s not Adam.', () => this.nathanHead());
      await this.say('NATHAN', 'That\'s what Adam turns into if he never learns how to lose.', () => this.nathanHead());
      await this.say('NATHAN', 'And he\'s got the whole team locked in this tower. One floor each.', () => this.nathanHead());
      await this.say('NATHAN', 'Hang on, guys. I\'m coming up.', () => this.nathanHead());
      await this.say('NATHAN', 'MVP baby. Let\'s play ball.', () => this.nathanHead());
      this.punch(0.06, 5); pop(Player.x + 11, Player.y - 40, 'PLAY BALL!', { size: 34 });
      await this.wait(0.5);
    }, true).then(() => {
      // final state (also reached when skipped)
      Object.assign(this.intro, { black: 0, blackTarget: 0, flash: 0, bolt: 0, ball: null, memory: null, lids: 0 });
      this.jumbo.on = false; Player.lie = 0; Player.noBat = false;
      Save.data.introSeen = true; saveGame();
      zoneTitle('THE SCRAPYARD DUGOUT', 'Zone 1 · The Lower Bracket');
    });
  },

  // Reshman turns up in every zone and sells that zone's map (plus quills, compasses and pins)
  reshmanMeet(r) {
    const LINES = {
      z1: ['…blorp.', 'You can SEE me?! Nobody sees me.', 'I draw maps. I sell maps. Quills, compasses, pins too. Scrap Bolts only. …blorp.'],
      z2: ['…blorp. You followed me down here?', 'Sparks are a great hiding spot. Want a map of the quarry? It\'s only slightly singed.'],
      z3: ['…blorp. It\'s very windy.', 'My maps keep flying away. Buy one before it does.'],
      z4: ['…blorp. Everything in here explodes.', 'Including my last three maps. This one is fine. Probably.'],
      z12: ['…blorp. Finally, somewhere damp and dark. I love it here.', 'The old coach doesn\'t mind me. Map of the Bullpen? Mind the drips.'],
      z5: ['…blorp. Big room. Nowhere to hide.', 'I\'m hiding anyway. Maps of the Concourse and everything around it. Ask nicely.'],
      z6: ['…blorp. Don\'t tell the rock man I\'m here.', 'He tried to name me. I am not a rock.'],
      z7: ['…blorp. I\'m wet. Everything is wet.', 'The wizard says the storm is on purpose. It isn\'t.'],
      z8: ['…blorp. C-c-cold.', 'Buy a map. I need the bolts for socks.'],
      z9: ['…blorp. It\'s so BRIGHT up here. Nowhere to hide.', 'I\'m hiding behind a pillar. It\'s working. Map of the stadium? Last one I\'ll ever draw. Probably.'],
    };
    return this.run(async () => {
      const D = Save.data, first = !Object.keys(D.reshmanMet).length;
      r.startled = 0.6; SFX.blorp(); Player.facing = sgn(r.x - Player.x) || 1;
      D.reshmanMet[r.zone] = 1;
      if (r.zone === 'z1') D.reshman = true;
      if (r.zone === 'z2') D.reshman2 = true;
      saveGame();
      // he jolts, the camera snaps to him, and the shadows around him ripple
      this.twoShot(Player, r, 1.3, 50); this.punch(0.05, 3);
      this.shadowPuff(r.x, r.y - 6, 12);
      await this.wait(0.5);
      const h = () => r.head(), lines = first && r.zone !== 'z1' ? LINES.z1.slice(1) : LINES[r.zone];
      for (let i = 0; i < lines.length; i++) {
        if (i === lines.length - 1) this.zoomTo(1.42);   // lean in for the sales pitch
        await this.say('RESHMAN', lines[i], h, { voice: 0.5 });
      }
      // he unrolls a map with a flourish
      SFX.paper(); for (let k = 0; k < 8; k++) spawnParticle({ x: r.x + rand(-10, 10), y: r.y - 20, vx: rand(-60, 60), vy: rand(-160, -60), vr: rand(-6, 6), grav: 300, life: 0.9, size: rand(3, 5), color: k % 2 ? BONE : '#d9c9a8', type: 'debris' });
      await this.wait(0.4);
    }).then(() => { themeCheck(); toast('RESHMAN SELLS MAPS · PRESS ' + Bindings.label('up') + ' NEAR HIM TO TRADE'); });
  },

  /* ---------- Act II regulars at Base Camp ---------- */
  fionnCamp(n) {
    return this.run(async () => {
      const D = Save.data, P = Player, h = () => n.head(), nh = () => this.nathanHead(), v = { voice: 0.8 };
      P.facing = sgn(n.x - P.x) || 1; n.facing = sgn(P.x - n.x) || -1;
      this.twoShot(P, n, 1.22);
      if (!D.fionnQuest) {
        D.fionnQuest = true; saveGame();
        await this.say('FIONN', 'Ah. The rock-disrespecter. I\'ve forgiven you. Mostly.', h, v);
        this.zoomTo(1.32);
        await this.say('FIONN', 'There are fifty Lucky Pebbles hidden across this Spire. Every zone. Every nasty corner.', h, v);
        await this.say('FIONN', 'Bring them to me ten at a time. I\'ll make your heart sturdier and carve you a bat charm.', h, v);
        this.zoomTo(1.22);
        await this.say('NATHAN', 'You want me to go collect… rocks.', nh);
        this.zoomTo(1.42); this.punch(0.07, 6); SFX.slam();
        await this.say('FIONN', 'PEBBLES. Rocks are big. Pebbles are small. Honestly.', h, v);
        this.zoomTo(1.22);
      }
      const found = pebblesFound(), left = found - D.pebblesGiven;
      let batches = Math.min(CHARMS.length - D.charms, Math.floor(left / 10));
      if (batches <= 0) {
        if (D.charms >= CHARMS.length) await this.say('FIONN', 'All fifty. Every single one. I may weep. Go on, you\'re a geologist now. Honorary.', h, v);
        else await this.say('FIONN', `${found} found so far. I need ${10 - left % 10} more for the next batch. Check under things. And over things.`, h, v);
        return;
      }
      while (batches-- > 0) {
        const c = CHARMS[D.charms];
        D.pebblesGiven += 10; D.charms++; saveGame();
        SFX.crystal(); SFX.unlock(); burst(n.x, n.y - 40, 20, { colors: ['#9be36a', GOLD, BONE], maxSpeed: 360 });
        // ten pebbles arc from Nathan's pockets into Fionn's hands, then the charm flies back
        for (let k = 0; k < 10; k++) { const q = k / 10; spawnParticle({ x: lerp(P.x + 11, n.x, q), y: P.y + 10 - Math.sin(q * Math.PI) * 50, vx: (n.x - P.x) * 0.6, vy: -120, grav: 500, life: 0.5, size: 3.5, color: ['#8c7b6b', '#9be36a', '#5a4a3a'][k % 3], type: 'debris' }); SFX.tick(); await this.wait(0.05); }
        this.impact(P.x + 11, P.y + 10, '#9be36a');
        applyUpgrades(); P.hp = P.maxHp; HUD.hpPop = true;
        pop(P.x + 11, P.y - 30, '+1 MAX HP', { size: 30, color: '#9be36a', burstColor: '#2a4a2a' });
        await this.say('FIONN', `Ten pebbles! Splendid. Here: ${c.name}. ${c.desc}`, h, v);
      }
    }).then(() => { if (Save.data.charms) toast(`CHARMS ${Save.data.charms}/5 · MAX HP ${Player.maxHp} · PEBBLES ${pebblesFound()}/${PEBBLE_TOTAL}`); });
  },
  miloCamp(n) {
    const lines = ['Yes, the storm\'s still going. It\'s ON PURPOSE. Mostly.', 'Your dash has storm magic now. Red lasers? Just… go through them. Confidently.',
      'If you see my eyebrows anywhere, they\'re mine. Please return them.', 'Lasers in the old zones too, I bet. Little secrets behind them. Go look!'];
    return this.run(async () => {
      Player.facing = sgn(n.x - Player.x) || 1;
      this.twoShot(Player, n, 1.26);
      // a little crackle of storm off his staff
      SFX.thunder(); for (let k = 0; k < 8; k++) spawnParticle({ x: n.x + rand(-14, 14), y: n.y - rand(50, 80), vx: rand(-60, 60), vy: rand(-80, 40), life: 0.4, size: 2.5, color: k % 2 ? '#9fe6ff' : BONE, type: 'spark' });
      await this.say('MILO', lines[(n.talk = ((n.talk || 0) + 1)) % lines.length], () => n.head(), { voice: 1.2 });
    });
  },
  denizTea(n) {
    return this.run(async () => {
      const D = Save.data, P = Player, h = () => n.head(), v = { voice: 0.7 };
      P.facing = sgn(n.x - P.x) || 1;
      this.twoShot(P, n, 1.24);
      // steam curling off the teapot
      const steam = k => { for (let i = 0; i < k; i++) spawnParticle({ x: n.x + rand(10, 40), y: n.y - rand(20, 36), vx: rand(-10, 10), vy: rand(-50, -25), life: rand(1.2, 1.8), size: rand(6, 11), color: 'rgba(243,234,216,.35)', type: 'puff', drag: 1 }); };
      steam(6);
      if (!D.teaDrunk) {
        await this.say('DENIZ', 'Duuude. Sit, sit. Mint and chamomile. Grown it myself. Out of ice, somehow.', h, v);
        steam(6); this.twoShot(P, null, 1.4, 60);
        await this.say('NATHAN', '*sip* …Whoa. I feel… really calm. And kind of pumped?', () => this.nathanHead());
        // the calm settles over him in a soft blue glow
        SFX.heal(); ring(P.x + P.w / 2, P.y + P.h / 2, 10, 70, 0.8, '#9fe6ff', 4);
        for (let k = 0; k < 14; k++) spawnParticle({ x: P.x + rand(0, P.w), y: P.y + rand(0, P.h), vy: rand(-70, -30), life: rand(0.8, 1.3), size: rand(2, 3), color: k % 2 ? '#9fe6ff' : BONE, type: 'dot' });
        this.twoShot(P, n, 1.24);
        await this.say('DENIZ', 'That\'s the good vibes, man. They stick with you.', h, v);
        D.teaDrunk = true; D.up.tea = true; saveGame();
      } else {
        await this.say('DENIZ', ['More tea, bro? Peace and love.', 'I used to make people kneel. Now I make them comfy. Way better.', 'That crown was SO tight, man. No wonder I was cranky.'][(Math.random() * 3) | 0], h, v);
        P.hype = P.hypeMax || 99; SFX.heal(); pop(P.x + 11, P.y - 26, 'HYPE REFILLED', { size: 24, color: '#9fe6ff', burstColor: '#2a4a66' });
      }
    }).then(() => {
      if (Save.data.up.tea && !Save.data.teaCard) {
        Save.data.teaCard = true; saveGame();
        showCard('PASSIVE BUFF', 'HERBAL CALM', 'Deniz\'s herbal tea keeps working. Your Hype now slowly refills on its own, even when you\'re not fighting.', ['permanent buff', 'drink again to refill Hype']);
      }
    });
  },

  reshmanScene(r) {
    return this.run(async () => {
      r.startled = 0.6; SFX.blorp(); Player.facing = sgn(r.x - Player.x) || -1;
      Save.data.reshman = true; saveGame();
      this.twoShot(Player, r, 1.22, 50);
      await this.wait(0.4);
      const h = () => r.head();
      this.zoomTo(1.38);
      await this.say('RESHMAN', '…blorp.', h, { voice: 0.45 });
      this.zoomTo(1.5); this.punch(0.04, 0);
      await this.say('RESHMAN', 'You can\'t see me.', h, { voice: 0.5 });
      this.shadowPuff(r.x, r.y - 14); this.punch(0.06, 4);
      r.gone = true;
      NPCs.push(new MapPaper(r.x, r.y)); themeCheck();
      // pull back to watch the dropped map flutter down
      SFX.paper(); this.zoomTo(1.15);
      await this.wait(0.9);
    });
  },

  bossFinale(boss) {
    return this.run(async () => {
      BossBar.flash();
      const P = Player;
      // the server corners Nathan
      boss.fist = { x: clamp(P.x + P.w / 2, ROOM.server.px.x + 80, ROOM.server.px.x + ROOM.server.px.w - 80), y: P.y - 120, ph: 'aim', t: 99 };
      this.camTarget = { x: (P.x + boss.x + boss.w / 2) / 2, y: boss.y + 80 };
      SFX.slamWarn(); this.zoomTo(1.28); await this.wait(0.8);
      await this.say('NATHAN', 'Uh… timeout?', () => this.nathanHead());
      await this.wait(0.4);
      // plasma beam through the wall
      this.beam = { t: 0, y: boss.y + 118, toX: boss.x + boss.w / 2 };
      SFX.plasma(); Game.flashWhite = 0.9; addShake(18); addHitstop(0.1);
      this.impact(boss.x + boss.w / 2, boss.y + 118, '#6fd3ff'); this.zoomTo(1.1);
      await this.wait(0.3);
      boss.dying = 1; boss.fist = null;
      for (let i = 0; i < 8; i++) {
        burst(boss.x + rand(0, boss.w), boss.y + rand(20, boss.h - 20), 14, { colors: ['#6fd3ff', '#ffffff', GOLD, FLAME], maxSpeed: 520, grav: 600 });
        if (i % 2 === 0) { SFX.hit(true); addShake(8); this.punch(0.03, 0); }
        await this.wait(0.14);
      }
      SFX.bossDie(); enemyDie(boss); pop(boss.x + boss.w / 2, boss.y + 60, 'SYSTEM FAILURE!', { size: 52, life: 1.6 });
      this.impact(boss.x + boss.w / 2, boss.y + 80, FLAME);
      for (let i = 0; i < 40; i++) spawnParticle({ x: boss.x + rand(0, boss.w), y: boss.y + rand(0, boss.h), vx: rand(-60, 60), vy: rand(-260, -60), grav: 500, life: rand(0.8, 1.6), size: rand(3, 6), color: ['#6fd3ff', '#2b2733', GOLD][i % 3], type: 'spark', drag: 1 });
      BossBar.hide();
      this.beam = null;
      await this.wait(1.0);
      // Josh steps out
      const josh = new Josh(ROOM.server.px.x + ROOM.server.px.w - 40, boss.floorY);
      NPCs.push(josh); josh.walkTo = boss.x + boss.w / 2 + 60;
      this.camTarget = { x: josh.walkTo - 60, y: boss.floorY - 120 };
      this.zoomTo(1.22);
      await this.wait(1.5);
      josh.facing = -1;
      const jh = () => josh.head();
      await this.say('JOSH', 'Evil Adam really thought that garbage code could run a security system? Please.', jh, { voice: 1.3 });
      await this.say('NATHAN', 'Josh! He had you locked in the server room this whole time?', () => this.nathanHead());
      await this.say('JOSH', 'I built this laser out of pure spite.', jh, { voice: 1.3 });
      await this.say('NATHAN', 'I had it handled, by the way. Totally had it.', () => this.nathanHead());
      await this.say('JOSH', 'Sure. I\'m setting up shop at Base Camp, downstairs. Bring scrap.', jh, { voice: 1.3 });
      // floor grate gives way, arena unlocks
      openBossHole(); setBossDoor(false); SFX.gate(); addShake(8);
      dust(Z.bossHole.tx * TILE + 64, Z.bossHole.ty * TILE, 14);
      josh.walkTo = Z.bossHole.tx * TILE + 64;
      for (let i = 0; i < 60 && josh.walkTo !== null; i++) await this.wait(0.1);
      await this.wait(0.7);
      josh.gone = true;
      Save.data.bossDead = true; Save.data.josh = true; saveGame();
      toast('ROGUE SERVER DEFEATED · JOSH JOINED BASE CAMP'); themeCheck();
    });
  }
};
addEventListener('keydown', e => { if (Story.active && (e.code === 'Enter' || e.code === 'NumpadEnter')) Story.advancePressed = true; });
