'use strict';
/* =========================================================
   CONTROLLER SUPPORT · the finishing layer (every page)
   The game itself already reads the pad (game/core.js) and the
   in-game menus already answer to it. This file fills the gaps:
   · the main menu: PRESS ANY KEY, the studio splash, the menu
     list and every panel (Play, Settings, Trophies…) can be
     driven with the d-pad / left stick, A to pick, B to go back.
     Inside a panel a gold ring shows which button is selected,
     and it hops to the nearest one in the direction you push.
     Sliders (volume) move with left / right
   · button names that match YOUR controller: Xbox (A B X Y ·
     LB RB), PlayStation (✕ ○ □ △ · L1 R1) or Nintendo
     (B A Y X · L R), in the Controls screen and in every
     on-screen prompt. Prompts follow whatever you touched last
   · rumble: hits, big impacts and taking damage shake the pad
     (can be switched off in Settings → Controls → Controller)
   · plugging in / pulling out a controller pops a little note;
     losing it mid-run pauses the game
   Loaded last on index.html and on every story page.
   ========================================================= */
const PADX = {
  kind: 'xbox', name: '', mode: 'key', prev: [], rep: {}, lastBuzz: 0,
  rumble: localStorage.getItem('ei_rumble') !== '0',
  get pad() { const ps = navigator.getGamepads ? navigator.getGamepads() : []; return ps ? [...ps].find(Boolean) || null : null; },
};
const PADX_NAMES = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'L3', 'R3', 'D‑UP', 'D‑DOWN', 'D‑LEFT', 'D‑RIGHT', 'HOME'],
  ps: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'SHARE', 'OPTIONS', 'L3', 'R3', 'D‑UP', 'D‑DOWN', 'D‑LEFT', 'D‑RIGHT', 'PS'],
  // Nintendo pads in the browser's standard layout: the bottom face button is B, the right one A
  nin: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '−', '+', 'L3', 'R3', 'D‑UP', 'D‑DOWN', 'D‑LEFT', 'D‑RIGHT', 'HOME'],
};
const PADX_BRAND = { xbox: 'Xbox-style', ps: 'PlayStation', nin: 'Nintendo' };
function padKind(p) {
  const id = (p && p.id || '').toLowerCase();
  if (/054c|playstation|dualsense|dualshock|wireless controller/.test(id)) return 'ps';
  if (/057e|nintendo|pro controller|joy-con/.test(id)) return 'nin';
  return 'xbox';
}
function padSeen(p) {
  if (!p) return;
  const k = padKind(p);
  if (k !== PADX.kind || p.id !== PADX.name) { PADX.kind = k; PADX.name = p.id; padRelabel(); }
}
const padN = i => (i === null || i === undefined) ? '—' : (PADX_NAMES[PADX.kind][i] || 'BTN ' + i);

/* ---------- names: the Controls screen and every prompt ---------- */
(function () {
  if (typeof Bindings === 'undefined') return;
  Bindings.padName = padN;
  // no device given? use whatever was touched last
  Bindings.label = function (a, device) {
    const dev = device || (typeof Game !== 'undefined' && Game.lastInput) || PADX.mode;
    if (dev === 'pad') return padN((Bindings.pad[a] || []).find(b => b !== null && b !== undefined));
    return Bindings.keyName((Bindings.keys[a] || []).find(Boolean));
  };
})();
function padRelabel() {
  try {
    if (typeof Bindings !== 'undefined') Bindings.applyLabels();
    if (typeof renderControls === 'function' && document.getElementById('ctrlPane') && !(typeof listening !== 'undefined' && listening)) renderControls();
  } catch (e) { logErr('pad: relabel', e); }
}
function padMode(m) {
  if (PADX.mode === m) return;
  PADX.mode = m; document.body.classList.toggle('pad-mode', m === 'pad');
  if (m === 'key') padFocus(null);
  padRelabel();
}
addEventListener('keydown', e => { if (e.isTrusted) padMode('key'); }, true);
addEventListener('mousemove', () => padMode('key'), { passive: true });

/* ---------- rumble ---------- */
function padBuzz(strong, weak, ms) {
  if (!PADX.rumble || PADX.mode !== 'pad' && !(typeof Game !== 'undefined' && Game.lastInput === 'pad')) return;
  const now = performance.now(); if (now - PADX.lastBuzz < 50) return; PADX.lastBuzz = now;
  const p = PADX.pad; if (!p) return;
  try {
    const A = p.vibrationActuator || (p.hapticActuators && p.hapticActuators[0]);
    if (A && A.playEffect) A.playEffect('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) }).catch(() => {});
    else if (A && A.pulse) A.pulse(Math.min(1, strong), ms);
  } catch (e) { /* this pad can't rumble */ }
}
if (typeof addShake === 'function') {
  const _padShake = addShake;
  addShake = function (a) {
    _padShake.apply(this, arguments);
    if (a >= 4) padBuzz(a / 22, a / 12, Math.min(320, 50 + a * 10));
  };
}
if (typeof Player !== 'undefined' && Player.hurt) {
  const _padHurt = Player.hurt;
  Player.hurt = function () {
    const was = this.hp, r = _padHurt.apply(this, arguments);
    if (this.hp !== was) { PADX.lastBuzz = 0; padBuzz(0.9, 0.6, 260); }
    return r;
  };
}

/* ---------- plugging in / pulling out ---------- */
function padNote(msg) {
  if (typeof toast === 'function' && document.getElementById('toast')) { toast(msg); return; }
  let n = document.getElementById('padNote');
  if (!n) {
    n = document.createElement('div'); n.id = 'padNote';
    n.style.cssText = 'position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:9999;padding:8px 18px;background:rgba(11,10,14,.92);color:#f3ead8;border:1px solid rgba(197,160,89,.7);border-radius:4px;font:13px Georgia,serif;letter-spacing:.14em;pointer-events:none;transition:opacity .3s';
    document.body.appendChild(n);
  }
  n.textContent = msg; n.style.opacity = '1';
  clearTimeout(n._t); n._t = setTimeout(() => { n.style.opacity = '0'; }, 2600);
}
addEventListener('gamepadconnected', e => {
  padSeen(e.gamepad);
  padNote(`🎮 ${PADX_BRAND[PADX.kind].toUpperCase()} CONTROLLER CONNECTED`);
  setTimeout(() => padBuzz(0.4, 0.4, 120), 100);
});
addEventListener('gamepaddisconnected', () => {
  padNote('🎮 CONTROLLER DISCONNECTED');
  if (PADX.pad) return;
  padMode('key');
  // mid-run: pause, so you don't get hit while you reach for the cable
  try {
    if (typeof started !== 'undefined' && started && typeof UI !== 'undefined' && !UI.modal && !(typeof Story !== 'undefined' && Story.active) && typeof setPaused === 'function') setPaused(true);
  } catch (e) { logErr('pad: unplug pause', e); }
});

/* ---------- the main menu (index.html only) ---------- */
const PADX_MENU = typeof leaveTitle === 'function' && !!document.getElementById('title');
const padCss = document.createElement('style');
padCss.textContent = `
.pad-focus{outline:2px solid #f2c14e !important;outline-offset:3px;box-shadow:0 0 0 4px rgba(13,11,16,.6),0 0 18px rgba(242,193,78,.55) !important;position:relative;z-index:1}
input[type=range].pad-focus{outline-offset:6px}
body.pad-mode{cursor:none}
`;
document.head.appendChild(padCss);

let padCur = null;
function padFocus(el) {
  if (padCur && padCur !== el) padCur.classList.remove('pad-focus');
  padCur = el;
  if (!el) return;
  el.classList.add('pad-focus');
  try { el.focus({ preventScroll: true }); } catch (e) { /* */ }
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  try { el.dispatchEvent(new MouseEvent('mouseenter')); } catch (e) { /* */ }
}
const PADX_SEL = 'button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"]),.df-card,.ckey,[data-action],[onclick]';
function padItems(root) {
  return [...root.querySelectorAll(PADX_SEL)].filter(el => {
    if (el.disabled || el.closest('[hidden],[aria-hidden="true"]')) return false;
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false;
    const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05;
  });
}
// the nearest item in the direction pushed (favouring things straight ahead)
function padStepFocus(root, dx, dy) {
  const items = padItems(root); if (!items.length) return;
  if (!padCur || !items.includes(padCur)) { padFocus(items.find(el => el.matches('.on,.sel,[aria-selected="true"]')) || items[0]); return; }
  const a = padCur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bd = Infinity;
  for (const el of items) {
    if (el === padCur) continue;
    const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const along = (bx - ax) * dx + (by - ay) * dy, side = Math.abs((bx - ax) * dy) + Math.abs((by - ay) * dx);
    if (along <= 2) continue;
    const d = along + side * 2.2;
    if (d < bd) { bd = d; best = el; }
  }
  if (best) { padFocus(best); try { Sfx.tick(); } catch (e) { /* */ } }
}
function padKey(key, code) {
  const t = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body;
  const o = { key, code, bubbles: true, cancelable: true };
  t.dispatchEvent(new KeyboardEvent('keydown', o)); t.dispatchEvent(new KeyboardEvent('keyup', o));
}
function padSlide(el, d) {
  const step = +el.step || 1, min = +el.min || 0, max = el.max === '' ? 100 : +el.max;
  el.value = Math.max(min, Math.min(max, +el.value + d * Math.max(step, (max - min) / 20)));
  el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
}
// a press, then auto-repeat while it is held (0.35 s, then every 0.11 s)
function padEdge(id, on, now) {
  const r = PADX.rep[id];
  if (!on) { delete PADX.rep[id]; return false; }
  if (!r) { PADX.rep[id] = now + 350; return true; }
  if (now >= r) { PADX.rep[id] = now + 110; return true; }
  return false;
}
function padMenuTick() {
  const p = PADX.pad, now = performance.now();
  if (p) {
    padSeen(p);
    const B = i => !!(p.buttons[i] && p.buttons[i].pressed), ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const btns = p.buttons.map(b => b.pressed);
    const fresh = i => btns[i] && !PADX.prev[i];
    if (btns.some(Boolean) || Math.hypot(ax, ay) > 0.5) padMode('pad');
    // the Controls screen is waiting for a button: leave the pad alone
    const binding = typeof listening !== 'undefined' && listening && listening.dev === 'pad';
    if (!binding) {
      const up = padEdge('u', B(12) || ay < -0.55, now), dn = padEdge('d', B(13) || ay > 0.55, now);
      const lf = padEdge('l', B(14) || ax < -0.55, now), rt = padEdge('r', B(15) || ax > 0.55, now);
      const ok = fresh(0), back = fresh(1);
      const title = document.getElementById('title'), wrap = document.getElementById('panelWrap');
      if (title && title.classList.contains('active')) { if (btns.some((v, i) => v && !PADX.prev[i])) padKey('Enter', 'Enter'); }
      else if (wrap && wrap.classList.contains('open')) {
        const root = document.getElementById('panel') || wrap;
        if (!padCur || !root.contains(padCur) || !padCur.isConnected) { padCur = null; if (up || dn || lf || rt) { padStepFocus(root, 0, 1); } }
        else {
          const slider = padCur.matches('input[type=range]');
          if (up) padStepFocus(root, 0, -1); if (dn) padStepFocus(root, 0, 1);
          if (lf) slider ? padSlide(padCur, -1) : padStepFocus(root, -1, 0);
          if (rt) slider ? padSlide(padCur, 1) : padStepFocus(root, 1, 0);
          if (ok && !slider) { const el = padCur; el.click(); setTimeout(() => { if (!el.isConnected) padCur = null; }, 0); }
        }
        if (back) padKey('Escape', 'Escape');
      } else if (typeof inMenu !== 'undefined' && inMenu) {
        padFocus(null);
        // left / right already flip the menu style (menu-styles.js)
        if (up) padKey('ArrowUp', 'ArrowUp'); if (dn) padKey('ArrowDown', 'ArrowDown');
        if (ok) padKey('Enter', 'Enter');
      } else if (ok || back) padKey('Enter', 'Enter');   // the studio splash and other skippable bits
    }
    PADX.prev = btns;
  }
  requestAnimationFrame(padMenuTick);
}
if (PADX_MENU) requestAnimationFrame(padMenuTick);
else (function padWatch() {
  // story pages: only keep the names and the prompts in step with the pad in hand
  const p = PADX.pad;
  if (p) { padSeen(p); if (p.buttons.some(b => b.pressed)) padMode('pad'); }
  if (typeof Game !== 'undefined' && Game.lastInput !== PADX.lastSeen) { PADX.lastSeen = Game.lastInput; padRelabel(); }
  setTimeout(padWatch, 250);
})();

/* ---------- Settings → Controls: rumble switch + which pad is plugged in ---------- */
if (typeof renderControls === 'function') {
  const _padRender = renderControls;
  renderControls = function () {
    _padRender.apply(this, arguments);
    try {
      if (typeof ctrlDevice === 'undefined' || ctrlDevice !== 'pad') return;
      const foot = document.querySelector('#ctrlPane .ctrl-foot'); if (!foot) return;
      const fixed = foot.querySelector('.ctrl-fixed');
      const p = PADX.pad;
      const L = a => padN((Bindings.pad[a] || []).find(i => i !== null && i !== undefined));
      if (fixed) fixed.innerHTML = `Fixed: left stick moves · right stick peeks the camera · ${padN(8)} inventory · ${padN(9)} pause` + (p ? ` · Detected: ${PADX_BRAND[padKind(p)]} controller` : " · No controller detected") +
        `<br>Hold ${L("dash")} to sprint · hold ${L("attack")} for a Slugger Swing · ${L("swap")} talks to people next to you · down + ${L("ball")} uses your gadget · ${L("map")}: tap map, hold to peek, double-tap for the Spire`;
      const b = document.createElement('button'); b.className = 'btn'; b.id = 'ctrlRumble';
      b.textContent = 'Rumble: ' + (PADX.rumble ? 'ON' : 'OFF');
      b.onclick = () => {
        PADX.rumble = !PADX.rumble; localStorage.setItem('ei_rumble', PADX.rumble ? '1' : '0');
        b.textContent = 'Rumble: ' + (PADX.rumble ? 'ON' : 'OFF');
        try { Sfx.tick(); } catch (e) { /* */ }
        if (PADX.rumble) { const m = PADX.mode; PADX.mode = 'pad'; PADX.lastBuzz = 0; padBuzz(0.6, 0.6, 180); PADX.mode = m; }
      };
      foot.insertBefore(b, foot.lastElementChild);
    } catch (e) { logErr('pad: controls', e); }
  };
}

/* =========================================================
   IN PLAY · the Silksong layout's extra rules (story pages)
   · B (○) always backs out of a menu, even though it heals in play
   · VIEW opens the inventory on its last tab (MENU still pauses)
   · Y swaps balls (tap cycles, hold opens the wheel), but next to
     someone you can talk to, or a bench, it talks / sits instead
   · down + RB uses your gadget, a shortcut next to LT
   · the map button: tap opens your zone's map, HOLD peeks (it
     closes when you let go), double-tap jumps to the whole Spire
   · hold dash (RT) after the dash to sprint: 35% faster on the
     ground, and the speed carries into a sprint jump
   · hold swing (X) for a Slugger Swing: a gold flash tells you
     it's ready, let go for a big finisher (2.2× damage, more knock-back)
   · right stick: peek the camera up / down to scout a drop
   The sprint and the Slugger Swing work on the keyboard too.
   ========================================================= */
const PADG = { prev: [], mapDown: 0, mapUp: 0, taps: 0, tower: false, yTalk: false, dashHeld: 0, sprint: false, dustT: 0, slug: { t: 0, ready: false, on: false } };
const padBtns = a => ((typeof Bindings !== 'undefined' && Bindings.pad[a]) || []).filter(i => i !== null && i !== undefined);
const padBusy = () => (typeof UI !== 'undefined' && UI.modal) || (typeof Story !== 'undefined' && Story.active);
function padTalkable() {
  if (typeof NPCs !== 'undefined' && NPCs.some(n => n.near && !n.gone && (n.interact || n.vendor || n.kind === 'bell'))) return true;
  return typeof LEVEL !== 'undefined' && !!LEVEL.benches && LEVEL.benches.some(b => b.near);
}
if (typeof Input !== 'undefined' && Input.pollPad && typeof Player !== 'undefined' && typeof PAGE !== 'undefined') {
  const _padPoll = Input.pollPad;
  Input.pollPad = function () {
    _padPoll.call(this);
    try {
      const p = PADX.pad; if (!p) { PADG.prev = []; return; }
      const now = p.buttons.map(b => !!b.pressed), prev = PADG.prev, fresh = i => now[i] && !prev[i];
      PADG.prev = now;
      const B = this.buffered, D = this.padDown, t = performance.now(), modal = UI.modal;
      const live = typeof started === 'undefined' || started;
      // B (○) backs out of any other menu (the inventory handles its own)
      if (modal && modal !== 'pmenu' && fresh(1)) B.add('dash');
      // VIEW: the inventory
      if (fresh(8) && PADMAP[8] === undefined && typeof pmOpen === 'function') {
        if (modal === 'pmenu') closeModal();
        else if (!modal && live && !Story.active) pmOpen(PM.tab && PM.tab !== 'map' ? PM.tab : 'tools', true);
      }
      // the map button: tap / hold-to-peek / double-tap for the whole Spire
      const mapB = padBtns('map');
      if (mapB.length && typeof pmOpen === 'function') {
        if (mapB.some(fresh)) {
          if (PADG.taps === 1 && t - PADG.mapUp < 280) {
            PADG.taps = 0; PADG.tower = true; B.delete('map');
            setTimeout(() => {
              if (UI.modal !== 'pmenu') pmOpen('map', true);
              requestAnimationFrame(() => requestAnimationFrame(() => { if (UI.modal === 'pmenu' && PM.tab === 'map' && PM.mapMode !== 'tower' && typeof mlToTower === 'function') mlToTower(); }));
            }, 0);
          } else {
            PADG.taps = 1; PADG.tower = false;
            if (!modal && live && !Story.active) { B.delete('map'); pmOpen('map', true); }   // straight open, no slow-mo: it's a quick look
          }
          PADG.mapDown = t;
        }
        if (!mapB.some(i => now[i]) && mapB.some(i => prev[i])) {
          PADG.mapUp = t;
          if (!PADG.tower && t - PADG.mapDown > 380 && UI.modal === 'pmenu' && PM.tab === 'map') { closeModal(); PADG.taps = 0; }
        }
      }
      if (modal || !live) return;
      // Y next to someone: talk / sit instead of swapping
      const swapB = padBtns('swap');
      if (swapB.some(fresh) && Player.onGround && padTalkable()) { PADG.yTalk = true; B.add('up'); }
      if (PADG.yTalk) { B.delete('swap'); D.delete('swap'); if (!swapB.some(i => now[i])) PADG.yTalk = false; }
      // down + RB: the gadget
      if (padBtns('ball').some(fresh) && D.has('down') && typeof arsQ === 'function' && arsQ().gadget) { B.delete('ball'); B.add('gadget'); }
    } catch (e) { logErr('pad: poll', e); }
  };

  /* ---------- the Slugger Swing: hold swing, let go ---------- */
  const SLG = PADG.slug;
  const _padHits = Player.checkHits;
  Player.checkHits = function () {
    if (!SLG.on) return _padHits.apply(this, arguments);
    const d = this.batDmg, k = TUNE.knockback;
    this.batDmg = (d || 1) * 2.2; TUNE.knockback = k * 1.6;
    try { return _padHits.apply(this, arguments); } finally { this.batDmg = d; TUNE.knockback = k; }
  };
  function slgFire(P) {
    P.startSwing(false, false);
    P.comboIdx = 3; P.attackType = 'fwd'; P.attackDur = 0.28; P.attackT = 0.28; P.attackCD = TUNE.attackCooldown * 1.6;
    SLG.on = true;
    addShake(5); padBuzz(0.5, 0.7, 150);
    const c = P.center();
    pop(c.x + P.facing * 30, P.y - 18, 'SLUGGER!', { size: 24, burst: false, color: GOLD, vy: -70 });
    burst(c.x + P.facing * 36, c.y, 12, { colors: [GOLD, '#fff3c8', BONE], maxSpeed: 320, angle: P.facing > 0 ? 0 : Math.PI, spread: 0.9 });
  }

  /* ---------- sprint, the charge, the right-stick peek ---------- */
  const _padUpd = Player.update;
  Player.update = function (dt) {
    const free = !this.dead && this.healT <= 0 && !this.hazard && Input.enabled && !padBusy();
    // sprint: dash held past the dash itself
    PADG.dashHeld = Input.down('dash') && free ? PADG.dashHeld + dt : 0;
    const ix = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    if (this.onGround) PADG.sprint = PADG.dashHeld > 0.22 && ix !== 0;
    else if (!Input.down('dash')) PADG.sprint = false;
    // the Slugger charge
    if (Input.down('attack') && free && this.dashT <= 0) {
      SLG.t += dt;
      if (SLG.t >= 0.55 && !SLG.ready) {
        SLG.ready = true; const c = this.center();
        ring(c.x, c.y, 10, 52, 0.3, GOLD, 3); SFX.ui(); padBuzz(0.15, 0.4, 80);
      }
    } else {
      if (SLG.ready && free && this.attackT <= 0.04) slgFire(this);
      SLG.t = 0; SLG.ready = false;
    }
    const base = TUNE.runSpeed, fast = base * 1.35;
    if (PADG.sprint) TUNE.runSpeed = fast;
    let r;
    try { r = _padUpd.call(this, dt); } finally { if (TUNE.runSpeed === fast) TUNE.runSpeed = base; }
    if (SLG.on && this.attackT <= 0) SLG.on = false;
    try {
      if (PADG.sprint && this.onGround && Math.abs(this.vx) > base * 1.05) {
        PADG.dustT -= dt;
        if (PADG.dustT <= 0) { PADG.dustT = 0.07; dust(this.x + this.w / 2, this.y + this.h, 1, -this.facing); }
      }
      const p = PADX.pad;
      if (p && !padBusy()) { const ry = p.axes[3] || 0; if (Math.abs(ry) > 0.5) Game.cam.lookY = ry < 0 ? -170 : 190; }
    } catch (e) { logErr('pad: feel', e); }
    return r;
  };
  // the charge glow on the bat hand
  (function () {
    const H = Game.hooks, o = H.front;
    H.front = function (cam) {
      if (o) o.call(H, cam);
      if (SLG.t < 0.18 || Player.dead) return;
      const c = Player.center(), x = c.x + Player.facing * 12, y = c.y - 4, k = Math.min(1, (SLG.t - 0.18) / 0.37);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const R = 10 + k * 22 + (SLG.ready ? Math.sin(Game.time * 18) * 4 : 0);
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, `rgba(255,236,170,${0.25 + k * 0.45})`); g.addColorStop(1, 'rgba(242,193,78,0)');
      ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
      ctx.restore();
      if (SLG.ready && Math.random() < 0.35) spawnParticle({ x: x + rand(-10, 10), y: y + rand(-10, 10), vx: rand(-40, 40), vy: rand(-90, -30), life: 0.3, size: 2, color: GOLD, type: 'spark' });
    };
  })();
}
