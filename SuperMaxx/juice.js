import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { cfg } from './settings.js?v=20261128r';
import { burst, ring, startReload } from './units.js?v=20261128r';

// Game feel on top of the HUD: small things that make a match read smoother. Each one is a
// setting (Gameplay / Video), and everything here only touches the local player's view.
//   hit-stop        a split-second slow-down when you land an elimination (offline only)
//   crosshair bloom the crosshair kicks open on every shot and settles back
//   trailing health the bit of health you just lost lingers in white, then drains away
//   heal glow       the health bar glows when you're healed
//   low ammo        the magazine count turns red and pulses with a reload hint
//   idle reload     a part-empty magazine refills itself after a moment without shooting
//   speed lines     streaks at the edge of the screen when sprinting, dashing or flung
//   dust            puffs under your feet while sprinting, and a ring on hard landings
//   death fade      the world drains of colour while you're down, and a flash as you respawn
//   objective pin   a marker on the current objective, pinned to the screen edge when off-screen

const $ = id => document.getElementById(id);
let stopT = 0, stopK = 1, bloom = 0, ghost = 1, ghostHold = 0, lastFrac = 1, healT = 0, dustT = 0, wasAlive = true, deadFx = false;
const v3 = new THREE.Vector3();

// ---------- hit-stop ----------
export function hitStop(G, dur = 0.08, k = 0.18) {
  if (!cfg.hitStop || G?.net) return;                                  // online, the sim never slows
  stopT = Math.max(stopT, dur); stopK = Math.min(stopK, k);
}
// the slow-down, measured in real time so it always lasts the same
export function timeScale(raw) {
  if (stopT <= 0) { stopK = 1; return 1; }
  stopT -= raw;
  return stopK;
}

// ---------- crosshair ----------
export const shotBloom = (k = 0.35) => { bloom = Math.min(1, bloom + k); };
export const crossScale = () => 1 + bloom * 0.5;

// ---------- landing ----------
export function landDust(G, P, k) {
  if (k < 0.25) return;
  const at = P.pos.clone().setY(0.08);
  ring(G, at, 0xfff6e0, 0.8 + k * 1.8);
  burst(G, at.setY(0.3), 0xe8dcc0, 0.4 + k * 0.6);
}

// After a match ends or the player leaves, put everything back.
export function resetJuice() {
  stopT = 0; stopK = 1; bloom = 0; ghost = 1; ghostHold = 0; lastFrac = 1; wasAlive = true;
  $('view').style.filter = ''; deadFx = false;
  for (const id of ['speedFx', 'objPin']) $(id)?.classList.remove('on');
  $('ammo')?.classList.remove('low');
}

// ---------- every frame ----------
// o: { sprintA, mouseDown, raw } (raw is the real frame time, before hit-stop)
export function juiceFrame(G, P, camera, dt, o) {
  if (!G || !P) return;
  bloom = Math.max(0, bloom - o.raw * 4);
  const frac = Math.max(0, P.hp / P.maxHp);
  // trailing health
  if (frac < ghost) { if (frac < lastFrac) ghostHold = 0.45; if ((ghostHold -= o.raw) <= 0) ghost = Math.max(frac, ghost - o.raw * 0.7); }
  else ghost = frac;
  $('hpGhost').style.width = (100 * ghost).toFixed(2) + '%';
  if (frac > lastFrac + 0.004 && P.alive && wasAlive) healT = 0.5;
  healT = Math.max(0, healT - o.raw);
  $('vitals').classList.toggle('healed', healT > 0);
  lastFrac = frac;

  // low ammo, and refilling a part-empty magazine after a moment of not shooting
  const mag = P.def.weapon.mag, lowAmmo = P.alive && P.reloadT <= 0 && !(P.noReloadT > 0) && mag > 2 && P.ammo <= Math.max(1, Math.ceil(mag * 0.25));
  $('ammo').classList.toggle('low', lowAmmo);
  if (cfg.idleReload && P.alive && !o.mouseDown && P.chargeStart == null && P.reloadT <= 0 && P.ammo < mag && P.ammo > 0
    && G.time - (P.lastShotT ?? -9) > 1.8 && !P.beamOn) startReload(P);

  // speed lines
  const spd = Math.hypot(P.vel.x, P.vel.z);
  let rush = 0;
  if (P.alive && cfg.speedLines) {
    rush = Math.max(o.sprintA * Math.min(1, spd / 9) * 0.45, P.dashT > 0 ? 1 : 0, P.knockT > 0 && !P.onGround ? 0.8 : 0,
      !P.onGround ? Math.min(0.7, Math.max(0, -P.vel.y - 10) / 14) : 0, P.model?.flying ? 0.35 : 0);
  }
  const sf = $('speedFx');
  sf.style.opacity = rush.toFixed(2);
  sf.classList.toggle('on', rush > 0.02);

  // sprint dust
  if (P.alive && P.onGround && o.sprintA > 0.6 && spd > 6 && (dustT -= dt) <= 0) {
    dustT = 0.2;
    burst(G, v3.set(P.pos.x - P.vel.x * 0.04, 0.2, P.pos.z - P.vel.z * 0.04).clone(), 0xe8dcc0, 0.28);
  }

  // death fade, and a flash on respawn
  const down = !P.alive && !G.over && cfg.deathFade;
  if (down !== deadFx) { deadFx = down; $('view').style.filter = down ? 'grayscale(.8) brightness(.82) contrast(1.05)' : ''; }
  if (P.alive && !wasAlive && !G.over) {
    const f = $('spawnFx'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    ring(G, P.pos.clone().setY(0.1), 0x7af0ff, 2.2); burst(G, P.pos.clone().setY(1), 0x7af0ff, 1);
  }
  wasAlive = P.alive;

  objectivePin(G, P, camera);
}

// ---------- objective pin ----------
function objectiveOf(G, P) {
  const S = G.story;
  if (G.mode === 'raid' && G.raid?.boss?.alive) return { p: G.raid.boss.pos, y: 6, icon: '👑', label: G.raid.def?.name };
  if (S && S.K && !S.rest) {
    if (S.pointer) return { p: S.pointer, y: 1.5, icon: S.K.type === 'race' ? '🏁' : S.K.type === 'deliver' ? '📦' : '✨' };
    if (S.obj?.alive) return { p: S.obj.pos, y: 5, icon: '🛡️' };
    const t = S.towers?.filter(t => t.alive).sort((a, b) => a.pos.distanceTo(P.pos) - b.pos.distanceTo(P.pos))[0];
    if (t) return { p: t.pos, y: 5, icon: '💥' };
    return null;
  }
  if (G.mode === 'hill' && G.hill?.pos) return { p: G.hill.pos, y: 1.5, icon: '⛳' };
  if (G.mode === 'cart' && G.cart?.pos) return { p: G.cart.pos, y: 2, icon: '🚂' };
  if (G.mode === 'ball' && G.ball && G.ball.wait <= 0) return { p: G.ball.pos, y: 2.4, icon: '⚽' };
  return null;
}
function objectivePin(G, P, camera) {
  const el = $('objPin');
  const o = cfg.objPins && P.alive && !G.over ? objectiveOf(G, P) : null;
  if (!o) { el.classList.remove('on'); return; }
  const d = Math.hypot(o.p.x - P.pos.x, o.p.z - P.pos.z);
  v3.set(o.p.x, (o.p.y || 0) + o.y, o.p.z).project(camera);
  const behind = v3.z > 1;
  let x = v3.x, y = v3.y;
  if (behind) { x = -x; y = -y; }
  const W = innerWidth, H = innerHeight, m = 46;
  let sx = (x * 0.5 + 0.5) * W, sy = (-y * 0.5 + 0.5) * H;
  const onScreen = !behind && sx > m && sx < W - m && sy > m && sy < H - m;
  // right on top of it: hide the pin so it doesn't cover the fight
  if (onScreen && d < 4) { el.classList.remove('on'); return; }
  let ang = 0;
  if (!onScreen) {
    const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy;
    const k = Math.min((W / 2 - m) / Math.abs(dx || 1e-3), (H / 2 - m) / Math.abs(dy || 1e-3));
    sx = cx + dx * k; sy = cy + dy * k; ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
  }
  el.classList.add('on'); el.classList.toggle('edge', !onScreen);
  el.style.transform = `translate(${sx.toFixed(0)}px,${sy.toFixed(0)}px)`;
  el.style.setProperty('--ang', ang.toFixed(0) + 'deg');
  const html = `<span class="pi">${o.icon}</span><b>${Math.round(d)}m</b><i></i>`;
  if (el._h !== html) { el._h = html; el.innerHTML = html; }
}

// ---------- kill confirms and assists ----------
// A badge pops up where the enemy went down: a skull for a kill (gold with a crown for a
// headshot, with the multikill count), and a smaller blue one for an assist.
const SKULL = '<svg viewBox="0 0 24 24"><path d="M12 2.5c-4.9 0-8.5 3.4-8.5 8 0 2.6 1.2 4.6 3 5.8V19c0 .8.7 1.5 1.5 1.5h1V18h1.5v2.5h3V18H15v2.5h1c.8 0 1.5-.7 1.5-1.5v-2.7c1.8-1.2 3-3.2 3-5.8 0-4.6-3.6-8-8.5-8zM8.6 14.2a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zm6.8 0a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM12 16.6l-1.2-2h2.4z"/></svg>';
export function killIcon(camera, pos, kind = 'kill', label = '') {
  const box = $('kIcons'); if (!box || !cfg.killIcons) return;
  v3.copy(pos).project(camera);
  if (v3.z > 1) v3.set(0, 0.15, 0);                                      // behind you (a splash kill): show it over the crosshair
  const x = Math.max(40, Math.min(innerWidth - 40, (v3.x * 0.5 + 0.5) * innerWidth)), y = Math.max(50, Math.min(innerHeight - 50, (-v3.y * 0.5 + 0.5) * innerHeight));
  const el = document.createElement('div');
  el.className = 'kIcon ' + kind;
  el.style.left = x.toFixed(0) + 'px'; el.style.top = y.toFixed(0) + 'px';
  el.innerHTML = `<span>${kind === 'assist' ? '+' : SKULL}</span>${label ? `<small>${label}</small>` : ''}`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 1300);
  while (box.children.length > 5) box.firstChild.remove();
}
