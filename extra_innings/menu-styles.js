'use strict';
/* =========================================================
   MENU STYLES · the Silksong-style live diorama picker
   ‹ Style › arrows on the main menu (also ← → / A D / Q E,
   and LB / RB or the d-pad on a controller) swap the backdrop,
   light, particles and music on the spot. Locked styles show a
   padlock and a cryptic hint. The choice sticks (localStorage
   'selectedMenuTheme'). Seven painted scenes: Dugout, Geode
   Reverie, Storm Atrium, Eternal Chill, Sudden Death, Works On
   My Machine, Zennith Horizon. Music comes from the game's own
   synth engine (game/music.js). Loaded after app.js.
   ========================================================= */
const msHash = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
const PX = k => para.x * -k, PY = k => para.y * -k;

/* ---------- the seven dioramas ---------- */
const SCENES = {
  dugout(t) {
    const hz = H * 0.64;
    let g = cx.createRadialGradient(W * 0.5, hz, 0, W * 0.5, hz, W * 0.7);
    g.addColorStop(0, 'rgba(255,140,66,.38)'); g.addColorStop(1, 'rgba(255,140,66,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    // the scrapyard skyline far behind
    cx.fillStyle = '#2a1620'; cx.beginPath(); cx.moveTo(0, H);
    for (let x = -40; x <= W + 40; x += 28) cx.lineTo(x + PX(6), hz - 20 - msHash(x * 0.37) * 70 - (msHash(x) > 0.85 ? 60 : 0));
    cx.lineTo(W, H); cx.fill();
    const bx = W * 0.5 + PX(16), by = H * 0.8, bw = Math.min(W * 0.62, 780);
    cx.fillStyle = '#120a0e'; cx.fillRect(0, by, W, H - by);
    // the dugout: back wall, roof, posts
    cx.fillStyle = '#1e1218'; cx.fillRect(bx - bw / 2, by - 210, bw, 210);
    cx.fillStyle = '#2c1a20'; cx.beginPath(); cx.moveTo(bx - bw / 2 - 30, by - 210); cx.lineTo(bx + bw / 2 + 30, by - 210); cx.lineTo(bx + bw / 2 + 50, by - 236); cx.lineTo(bx - bw / 2 - 50, by - 236); cx.closePath(); cx.fill();
    cx.fillStyle = '#0d080b'; for (const k of [-0.5, 0.5]) cx.fillRect(bx + k * bw - 8, by - 210, 16, 210);
    // the bench
    const sw = bw * 0.72, sy = by - 64;
    cx.fillStyle = '#6a4428'; cx.fillRect(bx - sw / 2, sy, sw, 16); cx.fillStyle = '#4a2e1a'; cx.fillRect(bx - sw / 2, sy + 16, sw, 5);
    cx.fillRect(bx - sw / 2, sy - 52, sw, 12); cx.fillStyle = '#3a2214'; for (const k of [0.06, 0.5, 0.94]) cx.fillRect(bx - sw / 2 + k * sw - 6, sy, 12, 64);
    cx.strokeStyle = 'rgba(20,10,6,.6)'; cx.lineWidth = 1.5; for (let k = 1; k < 6; k++) { cx.beginPath(); cx.moveTo(bx - sw / 2 + k * sw / 6, sy); cx.lineTo(bx - sw / 2 + k * sw / 6, sy + 16); cx.stroke(); }
    // Nathan's flame-red bat leaning on the end
    cx.save(); cx.translate(bx + sw / 2 - 30, by); cx.rotate(-0.28);
    cx.fillStyle = '#0d0b10'; cx.fillRect(-9, -150, 18, 150); cx.fillStyle = '#e8361c'; cx.beginPath(); cx.moveTo(-4, 0); cx.lineTo(-8, -140); cx.quadraticCurveTo(0, -156, 8, -140); cx.lineTo(4, 0); cx.closePath(); cx.fill();
    cx.fillStyle = '#7a1a10'; cx.fillRect(-6, -8, 12, 8); cx.restore();
    // one warm stadium lamp, swinging
    const ang = Math.sin(t / 1500) * 0.2, lx0 = bx, ly0 = by - 236, L = 78, lx = lx0 + Math.sin(ang) * L, ly = ly0 + Math.cos(ang) * L;
    cx.strokeStyle = '#0d080b'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(lx0, ly0); cx.lineTo(lx, ly); cx.stroke();
    cx.save(); cx.globalCompositeOperation = 'lighter';
    cx.translate(lx, ly); cx.rotate(-ang);
    const cone = cx.createLinearGradient(0, 0, 0, by - ly + 40); cone.addColorStop(0, 'rgba(255,190,110,.32)'); cone.addColorStop(1, 'rgba(255,190,110,0)');
    cx.fillStyle = cone; cx.beginPath(); cx.moveTo(-14, 8); cx.lineTo(14, 8); cx.lineTo(240, by - ly + 40); cx.lineTo(-240, by - ly + 40); cx.closePath(); cx.fill();
    const bulb = cx.createRadialGradient(0, 10, 0, 0, 10, 90); bulb.addColorStop(0, 'rgba(255,220,150,.9)'); bulb.addColorStop(1, 'rgba(255,200,120,0)');
    cx.fillStyle = bulb; cx.fillRect(-90, -80, 180, 180); cx.restore();
    cx.save(); cx.translate(lx, ly); cx.rotate(-ang); cx.fillStyle = '#2a2a30'; cx.beginPath(); cx.moveTo(-8, -6); cx.lineTo(8, -6); cx.lineTo(18, 10); cx.lineTo(-18, 10); cx.closePath(); cx.fill(); cx.restore();
  },
  geode(t) {
    const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0c0718'); g.addColorStop(1, '#170c28'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#06040c';
    cx.beginPath(); cx.moveTo(0, 0); for (let x = 0; x <= W + 60; x += 60) cx.lineTo(x + PX(8), 30 + msHash(x + 3) * 110); cx.lineTo(W, 0); cx.fill();
    const beat = 0.5 + 0.5 * Math.sin(t / 600 * Math.PI);   // the Geode track runs at 100 bpm: one pulse a beat
    for (let i = 0; i < 11; i++) {
      const left = i < 5, x = left ? W * (0.04 + i * 0.09) : W * (0.52 + (i - 5) * 0.085), base = H - 20 - msHash(i + 9) * 40;
      const h = 120 + msHash(i) * H * 0.4, w = 34 + msHash(i + 4) * 50, a = (msHash(i + 2) - 0.5) * 0.5, col = i % 3 ? '179,136,255' : '100,230,170';
      cx.save(); cx.translate(x + PX(14 + i), base); cx.rotate(a);
      cx.shadowColor = `rgba(${col},.9)`; cx.shadowBlur = 20 + beat * 25;
      cx.fillStyle = `rgba(${col},${0.22 + beat * 0.22 * (i % 2 ? 1 : 0.6)})`;
      cx.beginPath(); cx.moveTo(-w / 2, 0); cx.lineTo(-w / 2, -h * 0.75); cx.lineTo(0, -h); cx.lineTo(w / 2, -h * 0.75); cx.lineTo(w / 2, 0); cx.closePath(); cx.fill();
      cx.shadowBlur = 0; cx.strokeStyle = `rgba(${col},.85)`; cx.lineWidth = 1.5; cx.stroke();
      cx.strokeStyle = 'rgba(255,255,255,.25)'; cx.beginPath(); cx.moveTo(-w * 0.15, -4); cx.lineTo(-w * 0.15, -h * 0.8); cx.lineTo(0, -h + 6); cx.stroke();
      cx.restore();
    }
    // anti-gravity stones drifting up
    for (let i = 0; i < 8; i++) {
      const y = H + 60 - ((t * (0.012 + msHash(i) * 0.012) + i * 157) % (H + 140)), x = W * msHash(i + 30) + Math.sin(t / 1600 + i) * 18 + PX(20);
      const r = 10 + msHash(i + 7) * 18;
      cx.save(); cx.translate(x, y); cx.rotate(t / 4000 + i);
      cx.fillStyle = '#2a2240'; cx.strokeStyle = 'rgba(179,136,255,.7)'; cx.lineWidth = 1.5; cx.beginPath();
      for (let k = 0; k < 7; k++) { const an = k / 7 * Math.PI * 2, rr = r * (0.75 + msHash(i * 7 + k) * 0.35); cx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
      cx.closePath(); cx.fill(); cx.stroke(); cx.restore();
    }
    cx.fillStyle = '#06040c'; cx.beginPath(); cx.moveTo(0, H); for (let x = 0; x <= W + 50; x += 50) cx.lineTo(x + PX(24), H - 24 - msHash(x * 1.3) * 26); cx.lineTo(W, H); cx.fill();
  },
  storm(t) {
    cx.fillStyle = '#0b0918'; cx.fillRect(0, 0, W, H);
    const ph = t % 4300, strike = ph < 220, flash = strike ? 1 - ph / 220 : 0;
    const wx = W * 0.5 + PX(10), ww = Math.min(W * 0.36, 440), top = H * 0.1, wh = H * 0.62;
    const arch = () => { cx.beginPath(); cx.moveTo(wx - ww / 2, top + wh); cx.lineTo(wx - ww / 2, top + ww / 2); cx.arc(wx, top + ww / 2, ww / 2, Math.PI, 0); cx.lineTo(wx + ww / 2, top + wh); cx.closePath(); };
    // the storm outside
    cx.save(); arch(); cx.clip();
    const sk = cx.createLinearGradient(0, top, 0, top + wh); sk.addColorStop(0, '#1a1636'); sk.addColorStop(1, '#2c2450'); cx.fillStyle = sk; cx.fillRect(wx - ww, top, ww * 2, wh);
    for (let i = 0; i < 9; i++) { cx.fillStyle = `rgba(10,8,22,${0.6 + msHash(i) * 0.3})`; cx.beginPath(); cx.ellipse(((i * 97 + t * 0.01) % (ww + 200)) + wx - ww / 2 - 100, top + 40 + msHash(i + 3) * wh * 0.5, 90, 34, 0, 0, 7); cx.fill(); }
    if (strike) {
      cx.strokeStyle = `rgba(200,170,255,${flash})`; cx.lineWidth = 3; cx.shadowColor = '#7c4dff'; cx.shadowBlur = 24;
      let x = wx - ww * 0.2 + msHash(Math.floor(t / 4300)) * ww * 0.4, y = top; cx.beginPath(); cx.moveTo(x, y);
      while (y < top + wh) { x += (msHash(y + t) - 0.5) * 50; y += 28; cx.lineTo(x, y); }
      cx.stroke(); cx.shadowBlur = 0;
    }
    // stained glass
    const cols = ['124,77,255', '60,90,200', '180,140,255', '242,193,78', '90,60,180'];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) {
      cx.fillStyle = `rgba(${cols[(r * 3 + c) % cols.length]},${0.18 + flash * 0.4})`;
      cx.fillRect(wx - ww / 2 + c * ww / 4, top + r * wh / 7, ww / 4, wh / 7);
    }
    cx.restore();
    // lead and stone
    cx.strokeStyle = '#06050c'; cx.lineWidth = 6;
    for (let c = 1; c < 4; c++) { cx.beginPath(); cx.moveTo(wx - ww / 2 + c * ww / 4, top + 20); cx.lineTo(wx - ww / 2 + c * ww / 4, top + wh); cx.stroke(); }
    for (let r = 1; r < 7; r++) { cx.beginPath(); cx.moveTo(wx - ww / 2, top + r * wh / 7); cx.lineTo(wx + ww / 2, top + r * wh / 7); cx.stroke(); }
    cx.lineWidth = 18; cx.strokeStyle = '#1a1626'; arch(); cx.stroke();
    // light thrown across the floor
    const lg = cx.createLinearGradient(0, top + wh, 0, H); lg.addColorStop(0, `rgba(124,77,255,${0.08 + flash * 0.4})`); lg.addColorStop(1, 'rgba(124,77,255,0)');
    cx.fillStyle = lg; cx.beginPath(); cx.moveTo(wx - ww / 2, top + wh); cx.lineTo(wx + ww / 2, top + wh); cx.lineTo(wx + ww * 1.1, H); cx.lineTo(wx - ww * 1.1, H); cx.closePath(); cx.fill();
    cx.fillStyle = '#07060e'; cx.fillRect(0, top + wh + 6, W, 3);
    if (flash) { cx.fillStyle = `rgba(124,77,255,${flash * 0.16})`; cx.fillRect(0, 0, W, H); }
  },
  chill(t) {
    const sx = W * 0.2 + PX(6), sy = H * 0.16;
    cx.save(); cx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 12; k++) { const a = t / 12000 + k / 12 * Math.PI * 2; cx.fillStyle = 'rgba(255,230,160,.06)'; cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(sx + Math.cos(a) * W, sy + Math.sin(a) * W); cx.lineTo(sx + Math.cos(a + 0.1) * W, sy + Math.sin(a + 0.1) * W); cx.fill(); }
    const sg = cx.createRadialGradient(sx, sy, 0, sx, sy, 160); sg.addColorStop(0, 'rgba(255,240,190,.9)'); sg.addColorStop(1, 'rgba(255,240,190,0)'); cx.fillStyle = sg; cx.fillRect(sx - 160, sy - 160, 320, 320);
    cx.restore();
    // a sea of clouds below the terrace
    for (let i = 0; i < 26; i++) { cx.fillStyle = `rgba(255,255,255,${0.7 + msHash(i) * 0.25})`; cx.beginPath(); cx.arc(((i * 83 + t * 0.008) % (W + 160)) - 80 + PX(8), H * 0.6 + msHash(i + 5) * 40, 50 + msHash(i + 2) * 40, 0, 7); cx.fill(); }
    // the sand terrace and its railing
    const ty = H * 0.72; cx.fillStyle = '#e6c88a'; cx.fillRect(0, ty, W, H - ty); cx.fillStyle = '#d4b070'; for (let i = 0; i < 40; i++) cx.fillRect(msHash(i) * W, ty + msHash(i + 50) * (H - ty), 3, 2);
    cx.fillStyle = '#8a6a4a'; cx.fillRect(0, ty - 34, W, 6); for (let x = 20; x < W; x += 70) cx.fillRect(x + PX(18), ty - 34, 6, 34);
    // the melted throne: a puddle and a stump of ice
    const mx = W * 0.32 + PX(22); cx.fillStyle = 'rgba(128,222,234,.45)'; cx.beginPath(); cx.ellipse(mx, ty + 40, 120, 18, 0, 0, 7); cx.fill();
    cx.fillStyle = 'rgba(191,239,255,.75)'; cx.fillRect(mx - 40, ty, 80, 36);
    // King Deniz's broken crown in the sand
    const kx = W * 0.5 + PX(26), ky = ty + 70; cx.fillStyle = '#bfefff'; cx.strokeStyle = '#2a6a8a'; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(kx - 40, ky); cx.lineTo(kx - 36, ky - 30); cx.lineTo(kx - 22, ky - 14); cx.lineTo(kx - 10, ky - 36); cx.lineTo(kx - 2, ky - 18); cx.lineTo(kx + 4, ky - 4); cx.lineTo(kx + 12, ky - 26); cx.lineTo(kx + 22, ky - 10); cx.lineTo(kx + 30, ky); cx.closePath(); cx.fill(); cx.stroke();
    // a steaming cup of herbal tea, on a low wooden table
    const cxp = kx + 110, cy = ty + 58; cx.fillStyle = '#7a5a3a'; cx.fillRect(cxp - 44, cy, 88, 7); cx.fillStyle = '#5a3e26'; cx.fillRect(cxp - 38, cy + 7, 6, 22); cx.fillRect(cxp + 32, cy + 7, 6, 22);
    cx.fillStyle = '#f3ead8'; cx.strokeStyle = '#3a2a1a'; cx.lineWidth = 2.5;
    cx.beginPath(); cx.moveTo(cxp - 16, cy - 24); cx.lineTo(cxp + 16, cy - 24); cx.lineTo(cxp + 12, cy); cx.lineTo(cxp - 12, cy); cx.closePath(); cx.fill(); cx.stroke();
    cx.beginPath(); cx.arc(cxp + 18, cy - 14, 6, -1.4, 1.4); cx.stroke();
    cx.strokeStyle = 'rgba(255,255,255,.7)'; cx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { cx.beginPath(); for (let s = 0; s < 10; s++) { const yy = cy - 30 - s * 5, xx = cxp - 8 + k * 8 + Math.sin(t / 400 + s * 0.6 + k) * 3; s ? cx.lineTo(xx, yy) : cx.moveTo(xx, yy); } cx.stroke(); }
    // the hammock, swaying
    const h1 = W * 0.72 + PX(30), h2 = W * 0.92 + PX(30), sway = Math.sin(t / 1300) * 8;
    cx.fillStyle = '#7a5a3a'; cx.fillRect(h1 - 5, ty - 120, 10, 140); cx.fillRect(h2 - 5, ty - 120, 10, 140);
    cx.fillStyle = '#e8361c'; cx.beginPath(); cx.moveTo(h1, ty - 100); cx.quadraticCurveTo((h1 + h2) / 2 + sway, ty - 20, h2, ty - 100); cx.quadraticCurveTo((h1 + h2) / 2 + sway, ty - 40, h1, ty - 100); cx.fill();
    cx.strokeStyle = '#ffd54f'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(h1, ty - 100); cx.quadraticCurveTo((h1 + h2) / 2 + sway, ty - 30, h2, ty - 100); cx.stroke();
  },
  sudden(t) {
    const mx = W * 0.68 + PX(4), my = H * 0.22, mr = Math.min(W, H) * 0.13;
    const mg = cx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2); mg.addColorStop(0, 'rgba(255,23,68,.45)'); mg.addColorStop(1, 'rgba(255,23,68,0)'); cx.fillStyle = mg; cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#c01030'; cx.beginPath(); cx.arc(mx, my, mr, 0, 7); cx.fill();
    cx.fillStyle = 'rgba(70,0,14,.45)'; for (const [a, b, r] of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.1, 0.4, 0.12]]) { cx.beginPath(); cx.arc(mx + a * mr, my + b * mr, r * mr, 0, 7); cx.fill(); }
    // the empty stadium bowl
    const hz = H * 0.58; cx.fillStyle = '#0c0508'; cx.beginPath(); cx.ellipse(W / 2 + PX(8), hz, W * 0.75, H * 0.16, 0, Math.PI, 0); cx.fill();
    for (let i = 0; i < 30; i++) { cx.fillStyle = `rgba(255,23,68,${0.15 + 0.4 * msHash(i + Math.floor(t / 900))})`; cx.fillRect(W * 0.1 + i * W * 0.027 + PX(8), hz - H * 0.13 + Math.abs(i - 15) * 3, 3, 3); }
    cx.fillStyle = '#09060d'; cx.fillRect(0, hz, W, H - hz);
    // the infield
    const px = W * 0.5 + PX(18), py = H * 0.84;
    cx.fillStyle = '#1a0a0e'; cx.beginPath(); cx.moveTo(px, hz + 20); cx.lineTo(px + W * 0.32, py - 30); cx.lineTo(px, py + 40); cx.lineTo(px - W * 0.32, py - 30); cx.closePath(); cx.fill();
    // three cursed trophies, slowly turning above the plate
    const list = [];
    for (let i = 0; i < 3; i++) { const a = t / 5200 + i / 3 * Math.PI * 2; list.push({ a, x: px + Math.cos(a) * W * 0.16, y: py - 130 + Math.sin(a) * 30 + Math.sin(t / 900 + i) * 8, s: 0.85 + 0.3 * (Math.sin(a) + 1) / 2 }); }
    const trophy = o => {
      cx.save(); cx.translate(o.x, o.y); cx.scale(o.s, o.s); cx.shadowColor = '#ff1744'; cx.shadowBlur = 18;
      cx.fillStyle = '#6a4a1a'; cx.strokeStyle = '#f2c14e'; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(-16, -28); cx.lineTo(16, -28); cx.quadraticCurveTo(14, 0, 4, 4); cx.lineTo(6, 18); cx.lineTo(-6, 18); cx.lineTo(-4, 4); cx.quadraticCurveTo(-14, 0, -16, -28); cx.closePath(); cx.fill(); cx.stroke();
      cx.fillRect(-12, 18, 24, 6); cx.restore();
    };
    list.filter(o => Math.sin(o.a) < 0).forEach(trophy);
    // the cracked golden home plate
    cx.save(); cx.translate(px, py); cx.shadowColor = '#f2c14e'; cx.shadowBlur = 30;
    cx.fillStyle = '#c9a33a'; cx.beginPath(); cx.moveTo(-40, -14); cx.lineTo(40, -14); cx.lineTo(40, 2); cx.lineTo(0, 22); cx.lineTo(-40, 2); cx.closePath(); cx.fill();
    cx.shadowBlur = 0; cx.strokeStyle = '#09060d'; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(-6, -14); cx.lineTo(4, -2); cx.lineTo(-4, 8); cx.lineTo(6, 20); cx.moveTo(4, -2); cx.lineTo(24, 0); cx.stroke(); cx.restore();
    list.filter(o => Math.sin(o.a) >= 0).forEach(trophy);
    // shadow wisps
    for (let i = 0; i < 6; i++) { cx.fillStyle = 'rgba(9,6,13,.55)'; cx.beginPath(); cx.ellipse(((i * 211 + t * 0.03) % (W + 300)) - 150, hz + 30 + msHash(i) * 120, 140, 18, 0, 0, 7); cx.fill(); }
    // red ash rising off the infield
    for (let i = 0; i < 40; i++) {
      const y = H - ((t * (0.02 + msHash(i) * 0.03) + i * 97) % (H + 40)), x = W * msHash(i + 60) + Math.sin(t / 1100 + i) * 14 + PX(12);
      cx.fillStyle = `rgba(255,${40 + (i % 3) * 30},60,${0.25 + 0.5 * (y / H)})`; cx.fillRect(x, y, 2 + (i % 2), 2 + (i % 2));
    }
    // a dark shadow pressing in from every edge
    const vg = cx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.3, W / 2, H * 0.55, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(5,2,4,0)'); vg.addColorStop(1, 'rgba(5,2,4,.85)'); cx.fillStyle = vg; cx.fillRect(0, 0, W, H);
  },
  machine(t) {
    cx.fillStyle = '#000308'; cx.fillRect(0, 0, W, H);
    const hz = H * 0.56, vx = W / 2 + PX(24), vy = hz + PY(6);
    cx.lineWidth = 1;
    for (let k = -14; k <= 14; k++) { cx.strokeStyle = 'rgba(0,229,255,.28)'; cx.beginPath(); cx.moveTo(vx, vy); cx.lineTo(vx + k * W * 0.12, H); cx.stroke(); }
    for (let k = 0; k < 14; k++) { const f = ((k + (t / 900) % 1) / 14), y = vy + (H - vy) * f * f; cx.strokeStyle = `rgba(0,229,255,${0.1 + f * 0.4})`; cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
    // the stadium, as a floating mesh
    const rot = t / 7000;
    for (let r = 0; r < 6; r++) { cx.strokeStyle = r % 2 ? 'rgba(0,255,140,.5)' : 'rgba(0,229,255,.6)'; cx.beginPath(); cx.ellipse(vx, hz - 30 - r * 16, W * 0.2 + r * 20, 34 + r * 7, 0, 0, 7); cx.stroke(); }
    for (let k = 0; k < 16; k++) {
      const a = rot + k / 16 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      cx.strokeStyle = s > 0 ? 'rgba(0,229,255,.55)' : 'rgba(0,229,255,.18)';
      cx.beginPath(); cx.moveTo(vx + c * W * 0.2, hz - 30 + s * 34); cx.lineTo(vx + c * (W * 0.2 + 100), hz - 110 + s * 69); cx.stroke();
    }
    // the tower, spinning
    const tx = W * 0.82 + PX(16), base = hz - 10;
    for (let l = 0; l < 7; l++) {
      const y0 = base - l * 44, y1 = y0 - 44, w0 = 46 - l * 5, w1 = 41 - l * 5;
      for (let k = 0; k < 4; k++) {
        const a = rot * 3 + k * Math.PI / 2, b = a + Math.PI / 2;
        cx.strokeStyle = 'rgba(0,255,140,.55)'; cx.beginPath();
        cx.moveTo(tx + Math.cos(a) * w0, y0 + Math.sin(a) * w0 * 0.3); cx.lineTo(tx + Math.cos(b) * w0, y0 + Math.sin(b) * w0 * 0.3);
        cx.moveTo(tx + Math.cos(a) * w0, y0 + Math.sin(a) * w0 * 0.3); cx.lineTo(tx + Math.cos(a) * w1, y1 + Math.sin(a) * w1 * 0.3); cx.stroke();
      }
    }
    // Josh's robot eye, blinking into view now and then
    const ep = t % 7000;
    if (ep < 700) {
      const ex = W * (0.2 + msHash(Math.floor(t / 7000)) * 0.4), ey = H * 0.3, a = Math.sin(ep / 700 * Math.PI);
      cx.save(); cx.globalAlpha = a * (Math.random() < 0.9 ? 1 : 0.3); cx.strokeStyle = '#00e5ff'; cx.lineWidth = 3; cx.shadowColor = '#00e5ff'; cx.shadowBlur = 20;
      cx.beginPath(); cx.arc(ex, ey, 46, 0, 7); cx.stroke(); cx.beginPath(); cx.arc(ex, ey, 30, 0, 7); cx.stroke();
      cx.fillStyle = '#00e5ff'; cx.beginPath(); cx.arc(ex + Math.sin(t / 200) * 8, ey, 11, 0, 7); cx.fill(); cx.restore();
    }
  },
  horizon(t) {
    const hz = H * 0.58, sx = W * 0.62 + PX(4), sy = hz - 10 - Math.min(40, t / 400);
    const sg = cx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.55); sg.addColorStop(0, 'rgba(255,236,170,.9)'); sg.addColorStop(0.12, 'rgba(255,215,0,.45)'); sg.addColorStop(1, 'rgba(255,215,0,0)');
    cx.fillStyle = sg; cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#fff6d0'; cx.beginPath(); cx.arc(sx, sy, 34, 0, 7); cx.fill();
    // the neighbourhood far off: roofs and trees
    cx.fillStyle = 'rgba(70,110,120,.55)'; cx.beginPath(); cx.moveTo(0, hz);
    for (let x = 0; x <= W + 30; x += 30) cx.lineTo(x + PX(6), hz - 10 - msHash(x * 0.71) * 26 - (msHash(x + 1) > 0.8 ? 18 : 0)); cx.lineTo(W, hz); cx.fill();
    // the field, mown in stripes
    const fg = cx.createLinearGradient(0, hz, 0, H); fg.addColorStop(0, '#6aa84a'); fg.addColorStop(1, '#3f7a2a'); cx.fillStyle = fg; cx.fillRect(0, hz, W, H - hz);
    for (let k = 0; k < 9; k++) { if (k % 2) continue; const y0 = hz + (H - hz) * Math.pow(k / 9, 1.6), y1 = hz + (H - hz) * Math.pow((k + 1) / 9, 1.6); cx.fillStyle = 'rgba(255,255,255,.06)'; cx.fillRect(0, y0, W, y1 - y0); }
    // the diamond
    const dx = W * 0.45 + PX(14), dy = hz + (H - hz) * 0.5;
    cx.fillStyle = '#c89a5a'; cx.beginPath(); cx.moveTo(dx, dy - 60); cx.lineTo(dx + 200, dy + 6); cx.lineTo(dx, dy + 80); cx.lineTo(dx - 200, dy + 6); cx.closePath(); cx.fill();
    cx.fillStyle = '#6aa84a'; cx.beginPath(); cx.moveTo(dx, dy - 36); cx.lineTo(dx + 140, dy + 8); cx.lineTo(dx, dy + 52); cx.lineTo(dx - 140, dy + 8); cx.closePath(); cx.fill();
    cx.fillStyle = '#ffffff'; for (const [bx, by] of [[0, -60], [200, 6], [0, 80], [-200, 6]]) cx.fillRect(dx + bx - 5, dy + by - 3, 10, 6);
    // everyone, chatting in the distance, up on a soft green hill
    const hc = W * 0.37 + PX(10), hr = W * 0.17, hy = hz + 34;
    cx.fillStyle = '#7cbf55'; cx.beginPath(); cx.ellipse(hc, hy, hr, 44, 0, Math.PI, 0); cx.fill();
    cx.fillStyle = 'rgba(255,255,255,.08)'; cx.beginPath(); cx.ellipse(hc - hr * 0.2, hy - 26, hr * 0.5, 12, 0, Math.PI, 0); cx.fill();
    const friends = [[-0.2, 1, 0], [-0.17, 0.92, 1], [-0.14, 1.08, 2], [-0.11, 0.86, 3], [-0.08, 1, 4], [-0.05, 0.96, 5], [-0.02, 1.04, 6]];
    for (const [ox, s, i] of friends) {
      const fx = W * 0.5 + W * ox + PX(10), k = Math.max(-1, Math.min(1, (fx - hc) / hr)), fy = hy - 44 * Math.sqrt(1 - k * k) + 4 + Math.sin(t / 900 + i) * 1.2, h = 34 * s;
      cx.fillStyle = 'rgba(30,50,40,.78)'; cx.fillRect(fx - 5, fy - h, 10, h); cx.beginPath(); cx.arc(fx, fy - h - 6, 6, 0, 7); cx.fill();
      if (i === 2) { cx.beginPath(); cx.moveTo(fx - 7, fy - h - 9); cx.lineTo(fx - 4, fy - h - 18); cx.lineTo(fx, fy - h - 11); cx.lineTo(fx + 4, fy - h - 18); cx.lineTo(fx + 7, fy - h - 9); cx.fill(); }
    }
    // the plain wooden Spare Bat, standing in the grass, and a ball beside it
    const bx = W * 0.8 + PX(34), by = H - 70;
    cx.fillStyle = 'rgba(20,40,10,.35)'; cx.beginPath(); cx.ellipse(bx + 60, by + 4, 80, 8, 0, 0, 7); cx.fill();
    cx.fillStyle = '#0d0b10'; cx.beginPath(); cx.moveTo(bx - 8, by); cx.lineTo(bx - 13, by - 200); cx.quadraticCurveTo(bx, by - 224, bx + 13, by - 200); cx.lineTo(bx + 8, by); cx.closePath(); cx.fill();
    cx.fillStyle = '#c9a36b'; cx.beginPath(); cx.moveTo(bx - 5, by); cx.lineTo(bx - 9, by - 198); cx.quadraticCurveTo(bx, by - 218, bx + 9, by - 198); cx.lineTo(bx + 5, by); cx.closePath(); cx.fill();
    cx.fillStyle = '#f3ead8'; cx.strokeStyle = '#0d0b10'; cx.lineWidth = 3; cx.beginPath(); cx.arc(bx + 40, by - 8, 11, 0, 7); cx.fill(); cx.stroke();
    cx.strokeStyle = '#e8361c'; cx.lineWidth = 1.6; cx.beginPath(); cx.arc(bx + 32, by - 8, 7, -1, 1); cx.stroke(); cx.beginPath(); cx.arc(bx + 48, by - 8, 7, 2.1, 4.2); cx.stroke();
    cx.fillStyle = '#4a8a2a'; for (let k = 0; k < 30; k++) { const gx = bx - 60 + k * 5; cx.beginPath(); cx.moveTo(gx, by + 2); cx.lineTo(gx + 2, by - 8 - msHash(k) * 8); cx.lineTo(gx + 4, by + 2); cx.fill(); }
  },
};
function drawThemeScene(t) { const f = SCENES[TH.scene]; if (f) try { f(t); } catch (e) { logErr('menu style: ' + TH.scene, e); } }

/* ---------- the extra particle types ---------- */
const _msFx = drawThemeFx;
drawThemeFx = function (t) {
  const fx = TH.fx;
  if (fx === 'petals') {
    for (let k = 0; k < 34; k++) {
      const x = ((k * 97 + t * (0.05 + (k % 4) * 0.012)) % (W + 60)) - 30, y = ((k * 131 + Math.sin(t / 900 + k) * 40 + t * 0.02) % (H + 40)) - 20;
      cx.save(); cx.translate(x, y); cx.rotate(t / 500 + k); cx.fillStyle = k % 3 ? 'rgba(255,170,190,.75)' : 'rgba(255,213,79,.75)'; cx.beginPath(); cx.ellipse(0, 0, 5, 2.4, 0, 0, 7); cx.fill(); cx.restore();
    }
  } else if (fx === 'code') {
    cx.font = '14px ui-monospace, Menlo, monospace';
    for (let c = 0; c < 36; c++) {
      const x = c * (W / 36) + 6, sp = 0.05 + msHash(c) * 0.08, head = (t * sp + msHash(c + 9) * H) % (H + 200);
      for (let r = 0; r < 10; r++) { const y = head - r * 18; if (y < 0 || y > H) continue; cx.fillStyle = r ? `rgba(${c % 3 ? "0,229,255" : "0,255,140"},${0.5 - r * 0.045})` : (c % 3 ? "rgba(200,255,255,.9)" : "rgba(200,255,220,.9)"); cx.fillText(msHash(c * 31 + r + Math.floor(t / 300)) > 0.5 ? '1' : '0', x, y); }
    }
  } else if (fx === 'fluff') {
    for (let k = 0; k < 30; k++) {
      const x = ((k * 113 + t * (0.025 + (k % 5) * 0.006)) % (W + 60)) - 30, y = H * 0.25 + ((k * 71 + Math.sin(t / 1300 + k) * 50) % (H * 0.7));
      cx.strokeStyle = 'rgba(255,255,255,.55)'; cx.lineWidth = 1;
      for (let s = 0; s < 6; s++) { const a = s / 6 * Math.PI * 2 + t / 2000; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); cx.stroke(); }
      cx.fillStyle = 'rgba(255,255,255,.85)'; cx.beginPath(); cx.arc(x, y, 1.4, 0, 7); cx.fill();
    }
  } else _msFx(t);
};

/* ---------- music: every style plays its own track through the game's synth ---------- */
Sfx.startDrone = function () {};   // the old menu drone made way for real tracks
const _msSetMusic = Sfx.setMusic;
Sfx.setMusic = function () { _msSetMusic.call(this); Music.volume = settings.music / 100; };
const _msSetVol = Sfx.setVol;
Sfx.setVol = function (...a) { const r = _msSetVol.apply(this, a); SFX.volume = settings.master / 100; SFX.sfxVolume = settings.sfx / 100; return r; };
const msWake = () => { SFX.ensure(); Music.force(TH.music || 'hush'); };
addEventListener('pointerdown', msWake, { once: true });
addEventListener('keydown', msWake, { once: true });
const _msApply = applyTheme;
applyTheme = function (t, animate) {
  _msApply(t, animate);
  if (SFX.audio()) Music.force(t.music || 'hush');
  if (typeof msRender === 'function') msRender();
};

/* ---------- the ‹ Style › picker on the main menu ---------- */
const MS = { idx: Math.max(0, Themes.LIST.indexOf(Themes.current)), padPrev: {} };
(function msBuild() {
  const menu = document.getElementById('menu'); if (!menu) return;
  const el = document.createElement('div'); el.className = 'style-pick'; el.id = 'stylePick';
  el.innerHTML = '<button class="sp-arrow" data-d="-1" aria-label="Previous style">‹</button><div class="sp-mid"><small id="spCount"></small><b id="spName"></b><span id="spHint"></span></div><button class="sp-arrow" data-d="1" aria-label="Next style">›</button>';
  menu.appendChild(el);
  el.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); msStep(+b.dataset.d); }));
})();
function msRender() {
  const T = Themes.LIST[MS.idx], open = Themes.unlocked().includes(T.id), on = Themes.current.id === T.id, el = document.getElementById('stylePick');
  if (!el) return;
  el.classList.toggle('locked', !open);
  document.getElementById('spCount').textContent = `MENU STYLE · ${MS.idx + 1} / ${Themes.LIST.length}${on ? ' · EQUIPPED' : ''}`;
  document.getElementById('spName').textContent = open ? T.name : '🔒 ???';
  document.getElementById('spHint').textContent = open ? (T.unlockText || 'The way it all started.') : (T.hint || T.how);
}
function msStep(d) {
  const n = Themes.LIST.length;
  MS.idx = (MS.idx + d + n) % n;
  const T = Themes.LIST[MS.idx];
  if (Themes.unlocked().includes(T.id)) { Themes.set(T.id); applyTheme(T, true); Sfx.select(); if (typeof renderThemes === 'function') renderThemes(); }
  else { Sfx.back(); msRender(); }
}
addEventListener('keydown', e => {
  if (typeof inMenu === 'undefined' || !inMenu || document.getElementById('panelWrap').classList.contains('open')) return;
  if (['ArrowLeft', 'a', 'A', 'q', 'Q'].includes(e.key)) { e.preventDefault(); msStep(-1); }
  if (['ArrowRight', 'd', 'D', 'e', 'E'].includes(e.key)) { e.preventDefault(); msStep(1); }
});
// controller: LB / RB or the d-pad flips styles, the right stick tilts the diorama
(function msPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [], p = pads && [...pads].find(Boolean);
  if (p && typeof inMenu !== 'undefined' && inMenu && !document.getElementById('panelWrap').classList.contains('open')) {
    for (const [i, d] of [[4, -1], [5, 1], [14, -1], [15, 1]]) { const on = !!(p.buttons[i] && p.buttons[i].pressed); if (on && !MS.padPrev[i]) msStep(d); MS.padPrev[i] = on; }
    const ax = p.axes[2] || 0, ay = p.axes[3] || 0;
    if (Math.abs(ax) > 0.15 || Math.abs(ay) > 0.15) { mouse.x = ax; mouse.y = ay; }
  }
  requestAnimationFrame(msPad);
})();
msRender();

/* ---------- a few extra touches on top of the dioramas ---------- */
{
  const _dugout = SCENES.dugout, _geode = SCENES.geode;
  // the Dugout: dust drifting slowly through the lamp's cone
  SCENES.dugout = function (t) {
    _dugout(t);
    const bx = W * 0.5 + PX(16), by = H * 0.8, top = by - 200;
    cx.save(); cx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const y = top + ((t * (0.004 + msHash(i) * 0.006) + i * 53) % (by - top)), spread = 40 + (y - top) / (by - top) * 200;
      const x = bx + (msHash(i + 11) - 0.5) * 2 * spread + Math.sin(t / 1700 + i) * 10;
      cx.fillStyle = `rgba(255,214,150,${0.25 + msHash(i + 3) * 0.45})`; cx.beginPath(); cx.arc(x, y, 0.8 + msHash(i + 5) * 1.4, 0, 7); cx.fill();
    }
    cx.restore();
  };
  // the Geode Caverns: little glowing orbs bobbing between the crystals
  SCENES.geode = function (t) {
    _geode(t);
    cx.save(); cx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const x = W * (0.08 + msHash(i + 40) * 0.84) + PX(10 + (i % 3) * 6), y = H * (0.25 + msHash(i + 41) * 0.5) + Math.sin(t / (1400 + i * 90) + i) * 22;
      const r = 14 + msHash(i + 42) * 16, col = i % 2 ? '179,136,255' : '100,230,170', p = 0.6 + 0.4 * Math.sin(t / 800 + i * 1.7);
      const g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${0.55 * p})`); g.addColorStop(0.3, `rgba(${col},${0.22 * p})`); g.addColorStop(1, `rgba(${col},0)`);
      cx.fillStyle = g; cx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    cx.restore();
  };
}
