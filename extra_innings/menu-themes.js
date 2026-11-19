/* ---------------- Menu themes: apply + per-theme effects ---------------- */
let TH = Themes.current;
function applyThemeNow(t) {
  TH = t;
  const root = document.documentElement.style;
  Object.entries(t.css).forEach(([k, v]) => root.setProperty(k, v));
  document.body.dataset.theme = t.id;
}
// switching: the backdrop dips to black in 0.3 s and comes back up in the new diorama
function applyTheme(t, animate) {
  if (!animate || typeof gsap === 'undefined') { applyThemeNow(t); return; }
  let veil = document.getElementById('themeVeil');
  if (!veil) {
    veil = document.createElement('div'); veil.id = 'themeVeil';
    veil.style.cssText = 'position:fixed;inset:0;z-index:0;background:#000;opacity:0;pointer-events:none';
    const w = document.getElementById('world'); if (w) w.after(veil); else document.body.prepend(veil);
  }
  gsap.killTweensOf(veil);
  gsap.to(veil, { opacity: 1, duration: .3, ease: 'power1.in', onComplete: () => {
    applyThemeNow(t);
    gsap.to(veil, { opacity: 0, duration: .3, ease: 'power1.out' });
  } });
}
applyTheme(TH);

function drawThemeFx(t) {
  const fx = TH.fx;
  if (fx === 'eyes') {
    // Reshman hiding in the corner of your menu
    const blink = Math.sin(t / 900) > .97 || Math.sin(t / 1300 + 2) > .985;
    const jx = Math.sin(t / 60) * .8, x = W * .07, y = H - 95;
    cx.save(); cx.shadowColor = '#f3ead8'; cx.shadowBlur = 14; cx.fillStyle = '#f3ead8';
    for (const ox of [-7, 7]) { cx.beginPath(); cx.ellipse(x + ox + jx, y, 3, blink ? .5 : 5.5, 0, 0, 7); cx.fill(); }
    cx.restore();
  } else if (fx === 'scan') {
    cx.fillStyle = 'rgba(0,0,0,.16)';
    for (let y = 0; y < H; y += 4) cx.fillRect(0, y, W, 1.5);
    if (Math.random() < .02) { const gy = Math.random() * H; cx.fillStyle = 'rgba(80,220,120,.12)'; cx.fillRect(0, gy, W, 6 + Math.random() * 18); }
  } else if (fx === 'fire') {
    const fxp = W * .24, fy = H - 70, f = .3 + Math.sin(t / 90) * .04 + Math.sin(t / 37) * .03;
    const g = cx.createRadialGradient(fxp, fy, 0, fxp, fy, H * .55);
    g.addColorStop(0, `rgba(255,150,50,${f})`); g.addColorStop(1, 'rgba(255,150,50,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) {
      const h = 26 + Math.sin(t / 80 + i * 2) * 8, ox = (i - 1) * 11;
      cx.fillStyle = i === 1 ? '#ffd27a' : '#ff7a1a';
      cx.beginPath(); cx.moveTo(fxp + ox - 9, fy); cx.quadraticCurveTo(fxp + ox, fy - h * 1.5, fxp + ox + 9, fy); cx.fill();
    }
  } else if (fx === 'fireworks') {
    // the Foundry: bursts popping over the Spire
    for (let k = 0; k < 4; k++) {
      const cyc = 2600 + k * 700, p = ((t + k * 911) % cyc) / cyc, bx = W * (0.15 + ((k * 0.27 + Math.floor((t + k * 911) / cyc) * 0.37) % 0.7)), by = H * (0.18 + (k % 2) * 0.14);
      if (p > 0.55) continue;
      const r = 20 + p * 180, a = 1 - p / 0.55, col = ['255,74,160', '125,255,154', '242,193,78', '111,211,255'][k];
      for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2; cx.fillStyle = `rgba(${col},${a})`; cx.beginPath(); cx.arc(bx + Math.cos(an) * r, by + Math.sin(an) * r + p * p * 60, 2.5, 0, 7); cx.fill(); }
    }
  } else if (fx === 'shards') {
    // Geode Caverns: crystals drifting slowly upward
    for (let k = 0; k < 22; k++) {
      const x = (k * 137.7) % W, y = H - ((t / (40 + (k % 5) * 9) + k * 61) % (H + 40)), a = t / 1200 + k;
      cx.save(); cx.translate(x + Math.sin(t / 900 + k) * 12, y); cx.rotate(a); cx.fillStyle = k % 2 ? 'rgba(185,139,255,.5)' : 'rgba(155,227,200,.5)';
      cx.beginPath(); cx.moveTo(0, -7); cx.lineTo(4, 0); cx.lineTo(0, 7); cx.lineTo(-4, 0); cx.closePath(); cx.fill(); cx.restore();
    }
  } else if (fx === 'rain') {
    // Storm Atrium: slanted rain + the odd purple flash
    cx.strokeStyle = 'rgba(190,200,255,.22)'; cx.lineWidth = 1.4;
    for (let k = 0; k < 90; k++) { const x = ((k * 53 + t * 0.25) % (W + 80)) - 40, y = ((k * 97 + t * 0.9) % (H + 40)) - 20; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x - 7, y + 20); cx.stroke(); }
    if (Math.sin(t / 1700) > 0.985) { cx.fillStyle = 'rgba(217,184,255,.14)'; cx.fillRect(0, 0, W, H); }
  } else if (fx === 'snow') {
    // Glacier Crown: soft snowfall
    cx.fillStyle = 'rgba(240,250,255,.75)';
    for (let k = 0; k < 80; k++) { const x = ((k * 71 + Math.sin(t / 1000 + k) * 30 - t * 0.02) % W + W) % W, y = (k * 97 + t * (0.03 + (k % 4) * 0.012)) % H; cx.fillRect(x, y, 2 + (k % 2), 2 + (k % 2)); }
  } else if (fx === 'gold') {
    // the Gilded Stadium: gold confetti drifting down, the odd camera flash in the crowd
    for (let k = 0; k < 60; k++) {
      const x = ((k * 89 + Math.sin(t / 700 + k) * 40) % W + W) % W, y = (k * 113 + t * (0.04 + (k % 5) * 0.01)) % H;
      cx.save(); cx.translate(x, y); cx.rotate(t / 300 + k); cx.fillStyle = k % 3 ? 'rgba(242,193,78,.7)' : 'rgba(255,246,216,.7)'; cx.fillRect(-3, -1.5, 6, 3); cx.restore();
    }
    if (Math.sin(t / 230) > 0.995) { cx.fillStyle = 'rgba(255,255,255,.08)'; cx.fillRect(0, 0, W, H); }
  } else if (fx === 'sun') {
    // Extra Innings: warm sun rays over the neighborhood field
    const sx = W * 0.8, sy = H * 0.12;
    cx.save(); cx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 10; k++) {
      const a = t / 9000 + k / 10 * Math.PI * 2;
      cx.fillStyle = 'rgba(255,230,160,.05)'; cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(sx + Math.cos(a) * W, sy + Math.sin(a) * W); cx.lineTo(sx + Math.cos(a + 0.12) * W, sy + Math.sin(a + 0.12) * W); cx.fill();
    }
    const g = cx.createRadialGradient(sx, sy, 0, sx, sy, 140); g.addColorStop(0, 'rgba(255,240,190,.55)'); g.addColorStop(1, 'rgba(255,240,190,0)');
    cx.fillStyle = g; cx.fillRect(sx - 140, sy - 140, 280, 280); cx.restore();
  } else if (fx === 'grid') {
    cx.lineWidth = 1;
    for (let x = 0; x < W; x += 32) { cx.strokeStyle = x % 128 === 0 ? 'rgba(243,234,216,.09)' : 'rgba(243,234,216,.035)'; cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke(); }
    for (let y = 0; y < H; y += 32) { cx.strokeStyle = y % 128 === 0 ? 'rgba(243,234,216,.09)' : 'rgba(243,234,216,.035)'; cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
  }
}

/* ---------------- Options → Themes tab ---------------- */
// each card shows a real snapshot of its own diorama: the backdrop is painted once per style on the
// menu canvas (the next frame paints over it before anything is shown) and shrunk into the card
const THUMBS = new Map();
function themeThumb(t) {
  if (THUMBS.has(t.id)) return THUMBS.get(t.id);
  const tw = 320, th = Math.round(tw * H / W), c = document.createElement('canvas'); c.width = tw; c.height = th;
  const keepTH = TH, px = para.x, py = para.y;
  try {
    TH = t; para.x = 0; para.y = 0;
    cx.save(); cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.shadowBlur = 0;
    const g = cx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, t.sky[0]); g.addColorStop(.55, t.sky[1]); g.addColorStop(1, t.sky[2]);
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    const at = 9000 + (t.id.length * 1337) % 4000;   // a moment where the lamp swings and the stones float mid-air
    if (t.scene && typeof drawThemeScene === 'function') drawThemeScene(at);
    else {
      drawSpire(0, 0, 1.0, t.tower, true);
      cx.fillStyle = t.ground; cx.beginPath(); cx.moveTo(0, H);
      for (let x = 0; x <= W + 40; x += 40) cx.lineTo(x, H - (60 + 40 * Math.sin(x * .013) + 30 * Math.sin(x * .041 + 1)));
      cx.lineTo(W, H); cx.fill();
    }
    drawThemeFx(at);
    cx.restore();
    c.getContext('2d').drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, tw, th);
  } catch (e) { logErr('theme thumb: ' + t.id, e); }
  finally { TH = keepTH; para.x = px; para.y = py; }
  THUMBS.set(t.id, c);
  return c;
}
function renderThemes() {
  const pane = $('#themePane'); if (!pane) return;
  const un = Themes.unlocked(), cur = Themes.current.id;
  pane.innerHTML = `<p class="theme-intro">Reach major moments in the story to unlock new menu styles. <b>${Themes.LIST.filter(t => un.includes(t.id)).length} / ${Themes.LIST.length}</b> unlocked.</p>
    <div class="themes">${Themes.LIST.map(t => {
      const open = !t.future && un.includes(t.id);
      return `<button class="theme ${open ? '' : 'locked'} ${t.id === cur ? 'on' : ''}" data-id="${t.id}" ${open ? '' : 'disabled'}>
        <span class="tsw" data-th="${t.id}">${open ? '' : '<b>🔒</b>'}${t.id === cur ? '<em class="teq">EQUIPPED</em>' : ''}</span>
        <strong>${open ? t.name : '???'}</strong>
        <small>${open ? (t.unlockText || t.how) : (t.hint || t.how)}</small>
      </button>`;
    }).join('')}</div>`;
  $$('#themePane .tsw[data-th]').forEach(s => { const c = themeThumb(Themes.byId(s.dataset.th)); if (c) s.prepend(c.cloneNode ? copyCanvas(c) : c); });
  $$('#themePane .theme:not(.locked)').forEach(b => b.onclick = () => {
    if (b.classList.contains('on')) return;
    Themes.set(b.dataset.id); applyTheme(Themes.byId(b.dataset.id), true); Sfx.select(); renderThemes();
  });
}
// a canvas can only sit in one place, so each card gets its own copy
function copyCanvas(c) { const d = document.createElement('canvas'); d.width = c.width; d.height = c.height; d.getContext('2d').drawImage(c, 0, 0); return d; }
addEventListener('resize', () => THUMBS.clear());

/* announce themes unlocked since the last visit */
function announceThemes() {
  const fresh = Themes.newForMenu();
  if (!fresh.length) return;
  const badge = document.createElement('div');
  badge.className = 'theme-toast';
  badge.innerHTML = `<small>NEW MENU STYLE UNLOCKED!</small><b>${fresh.map(t => t.name).join(' · ')}</b><span>Options · Themes</span>`;
  document.body.appendChild(badge);
  setTimeout(() => badge.classList.add('show'), 50);
  setTimeout(() => { badge.classList.remove('show'); setTimeout(() => badge.remove(), 600); }, 5200);
  const opt = document.querySelector('.mi[data-action="options"] .mi-meta');
  if (opt) opt.innerHTML = '<span class="new-pip">NEW</span> Themes unlocked';
}
