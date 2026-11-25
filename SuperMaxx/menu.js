import { LOOK, applyEnvironment } from './stage.js?v=20261126f';
import { masteryOf } from './mastery.js?v=20261126f';
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { HEROES, ARCHETYPES, archOf } from './heroes.js?v=20261126f';
import './personality.js?v=20261126f';
import { MAPS, DIFFICULTY } from './data.js?v=20261126f';
import { THEMES } from './scenery.js?v=20261126f';
import { cfg, save, resetSettings, QUALITY } from './settings.js?v=20261126f';
import { splash, headshot, mapArt } from './portraits.js?v=20261126f';
import { initOnline, enterOnline } from './online.js?v=20261126f';
import { enterSlots } from './slotmachine.js?v=20261126f';
import { initVault, enterVault, leaveVault, clipCount } from './vault.js?v=20261126f';
import { tokens as slotTokens } from './slots.js?v=20261126f';
import { CONTRACTS, contractOf, taskFrac, taskDone, statOf, tasksDone, openContracts } from './contracts.js?v=20261126f';
import { SEASON, TRACK, MAX_TIER, passXp, tierProgress, heroOwned, heroTier, skinOwned, skinTier, skinsFor, dressed, equip, rewardInfo,
  COS_TYPES, cosById, cosOwned, equippedCos, equipCos, cosArt, lockShort, lockLong, isSlotItem, isContractHero } from './pass.js?v=20261126f';

// Front end: main menu → roster select → stage select → match. Settings overlay on top.

const $ = id => document.getElementById(id);
const hex = c => '#' + c.toString(16).padStart(6, '0');
let api = null, screen = 'main', settingsOpen = false, mode = 'lane';
const MODE_NAME = { lane: 'Lane Breaker', survivor: 'Survivor', hill: 'Hill Rush', cart: 'Payload', online: 'Online' };
function setMode(m) {
  mode = m;
  $('rosterMode').textContent = MODE_NAME[m];
  $('stageMode').textContent = MODE_NAME[m];
  $('lockIn').classList.toggle('surv', m === 'survivor');
  $('lockIn').classList.toggle('hill', m === 'hill'); $('lockIn').classList.toggle('cart', m === 'cart');
  $('lockIn').querySelector('small').textContent = m === 'survivor' ? 'Drop in as' : 'Lock in';
}

// ---------- main menu backdrop (3D scene behind the title) ----------
// Night on a neon rooftop: an empty glowing stage above a lit-up skyline,
// with a big moon, stars, sweeping searchlights and the odd firework.
const show = { scene: null, cam: null, t: 0, tick: [] };
const canvasTex = (w, h, draw) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const GLOW = canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
function buildShowcase() {
  const sc = new THREE.Scene(), add = o => (sc.add(o), o);
  sc.fog = new THREE.Fog(0x2a1650, 45, 160);
  // sky: deep indigo overhead, magenta and orange glow along the horizon
  const sky = canvasTex(8, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    [[0, '#0b0d2e'], [0.3, '#1d1a5a'], [0.42, '#5a2a8a'], [0.47, '#d44a8a'], [0.51, '#ff9a5c'], [0.55, '#2a1650'], [1, '#120c2a']].forEach(([s, c]) => gr.addColorStop(s, c));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  add(new THREE.Mesh(new THREE.SphereGeometry(140, 32, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, depthWrite: false })));
  // stars
  const sp = [];
  for (let i = 0; i < 700; i++) {
    const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.3;
    sp.push(Math.cos(a) * Math.cos(e) * 130, Math.sin(e) * 130, Math.sin(a) * Math.cos(e) * 130);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, map: GLOW, transparent: true, depthWrite: false, fog: false, sizeAttenuation: true })));
  show.tick.push(t => { stars.material.opacity = 0.75 + Math.sin(t * 1.7) * 0.2; });
  // moon with a soft halo
  const moon = add(new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshBasicMaterial({ color: 0xfff1c9, fog: false })));
  moon.position.set(-16, 19, 92); moon.rotation.y = Math.PI;
  const halo = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffc9e8, transparent: true, opacity: 0.55, fog: false, depthWrite: false })));
  halo.position.copy(moon.position); halo.position.z += 1; halo.scale.set(34, 34, 1);
  // skyline: rows of towers with lit windows, nearer rows darker and bigger
  const win = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#000000'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 4; y += 10) for (let x = 5; x < w - 4; x += 10) {
      const r = Math.random(); g.fillStyle = r < 0.42 ? (r < 0.12 ? '#9ef0ff' : '#ffd88a') : '#1a1538'; g.fillRect(x, y, 5, 6);
    }
  });
  const towerM = [0x1a1440, 0x241a55, 0x30206a].map(c => new THREE.MeshLambertMaterial({ color: c, emissive: 0xffffff, emissiveMap: win, emissiveIntensity: 0.9 }));
  const box = new THREE.BoxGeometry(1, 1, 1);
  for (const [row, z, n, hMin, hMax] of [[2, 75, 26, 14, 40], [1, 56, 20, 9, 28], [0, 38, 14, 5, 16]]) {
    for (let i = 0; i < n; i++) {
      const w = 3 + Math.random() * 5, h = hMin + Math.random() * (hMax - hMin), x = (i / (n - 1) - 0.5) * (z * 2.4) + (Math.random() - 0.5) * 4;
      const b = add(new THREE.Mesh(box, towerM[row])); b.scale.set(w, h, w); b.position.set(x, h / 2 - 3, z + Math.random() * 6);
      if (Math.random() < 0.35) {                                          // blinking aircraft light on the roof
        const l = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xff4466, transparent: true, depthWrite: false, fog: false })));
        l.position.set(x, h - 2.6, b.position.z); l.scale.setScalar(1.4); const ph = Math.random() * 6;
        show.tick.push(t => { l.material.opacity = Math.sin(t * 3 + ph) > 0.6 ? 1 : 0.1; });
      }
    }
  }
  // neon billboards floating among the towers
  const sign = (text, c1, c2, x, y, z, rot) => {
    const tex = canvasTex(512, 160, (g, w, h) => {
      g.fillStyle = 'rgba(16,10,40,.85)'; g.fillRect(0, 0, w, h);
      g.strokeStyle = c2; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
      g.font = 'italic 900 92px Futura, "Avenir Next", "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = c1; g.shadowBlur = 24; g.fillStyle = c1; g.fillText(text, w / 2, h / 2 + 4);
    });
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(12, 3.75), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, side: THREE.DoubleSide })));
    m.position.set(x, y, z); m.rotation.y = Math.PI + rot; const ph = Math.random() * 9;
    show.tick.push(t => { m.material.opacity = Math.sin(t * 9 + ph) > -0.96 ? 1 : 0.35; });   // the occasional flicker
  };
  sign('MAXX', '#ff5aa8', '#ffc93c', -30, 17, 50, -0.3);
  sign('GG!', '#5af0ff', '#9b5cff', 6, 19, 46, 0.1);
  // the stage: dark disc with a glowing grid, neon rim and a soft pool of light
  const grid = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#1c1638'; g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(90,240,255,.55)'; g.lineWidth = 3;
    for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, w); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,90,168,.5)'); r.addColorStop(0.5, 'rgba(155,92,255,.18)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
  const floor = add(new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ map: grid, roughness: 0.35, metalness: 0.2, emissive: 0xffffff, emissiveMap: grid, emissiveIntensity: 0.35 })));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  const rim = add(new THREE.Mesh(new THREE.CylinderGeometry(9.1, 9.4, 0.5, 64), new THREE.MeshStandardMaterial({ color: 0x120c2a, roughness: 0.5 }))); rim.position.y = -0.26;
  const neon = add(new THREE.Mesh(new THREE.TorusGeometry(9.15, 0.09, 8, 96), new THREE.MeshBasicMaterial({ color: 0xff5aa8 })));
  neon.rotation.x = -Math.PI / 2; neon.position.y = 0.02;
  const neon2 = add(new THREE.Mesh(new THREE.TorusGeometry(9.35, 0.06, 8, 96), new THREE.MeshBasicMaterial({ color: 0x5af0ff })));
  neon2.rotation.x = -Math.PI / 2; neon2.position.y = -0.4;
  show.tick.push(t => { const k = 0.5 + Math.sin(t * 2) * 0.5; neon.material.color.setHSL(0.92 - k * 0.12, 1, 0.66); });
  const roof = add(new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshLambertMaterial({ color: 0x17112e }))); roof.rotation.x = -Math.PI / 2; roof.position.y = -0.5;
  // searchlights sweeping the sky from behind the skyline
  const beamGeo = new THREE.CylinderGeometry(0.4, 4.5, 80, 24, 1, true); beamGeo.translate(0, 40, 0);
  [[-26, 0x5af0ff, 0], [8, 0xff5aa8, 2], [34, 0xffc93c, 4]].forEach(([x, c, ph]) => {
    const b = add(new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
    b.position.set(x, -2, 62);
    show.tick.push(t => { b.rotation.z = Math.sin(t * 0.35 + ph) * 0.55; b.rotation.x = -0.25 + Math.sin(t * 0.27 + ph) * 0.12; });
  });
  // fireworks: a burst of additive sparks every few seconds over the city
  const FW = 90, fwPos = new Float32Array(FW * 3), fwVel = new Float32Array(FW * 3);
  const fwGeo = new THREE.BufferGeometry(); fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPos, 3));
  const fw = add(new THREE.Points(fwGeo, new THREE.PointsMaterial({ size: 0.9, map: GLOW, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 })));
  let fwT = 2, fwAge = 9;
  show.tick.push((t, dt) => {
    fwT -= dt; fwAge += dt;
    if (fwT <= 0) {
      fwT = 3.5 + Math.random() * 3; fwAge = 0;
      const cx = (Math.random() - 0.5) * 50, cy = 18 + Math.random() * 10, cz = 60;
      fw.material.color.setHSL(Math.random(), 1, 0.65);
      for (let i = 0; i < FW; i++) {
        const a = Math.random() * Math.PI * 2, e = Math.acos(Math.random() * 2 - 1), v = 5 + Math.random() * 3;
        fwPos.set([cx, cy, cz], i * 3); fwVel.set([Math.sin(e) * Math.cos(a) * v, Math.cos(e) * v, Math.sin(e) * Math.sin(a) * v], i * 3);
      }
    }
    for (let i = 0; i < FW * 3; i += 3) { fwPos[i] += fwVel[i] * dt; fwPos[i + 1] += fwVel[i + 1] * dt; fwPos[i + 2] += fwVel[i + 2] * dt; fwVel[i + 1] -= 3 * dt; fwVel[i] *= 0.985; fwVel[i + 2] *= 0.985; }
    fwGeo.attributes.position.needsUpdate = true;
    fw.material.opacity = Math.max(0, 1 - fwAge / 2.2);
  });
  // lights: cool moonlight overall, a warm key so the heroes still read, neon rims from behind
  add(new THREE.HemisphereLight(0xb8b0ff, 0x3a2050, 1.5));
  const sun = add(new THREE.DirectionalLight(0xffe6d0, 2.3)); sun.position.set(-6, 12, -8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); sun.shadow.camera.updateProjectionMatrix();
  const pink = add(new THREE.DirectionalLight(0xff5aa8, 1.6)); pink.position.set(8, 5, 10);
  const cyan = add(new THREE.DirectionalLight(0x5af0ff, 1.3)); cyan.position.set(-8, 4, 10);
  show.cam = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
  show.scene = sc;
}

function frameShowcase(renderer, dt) {
  if (!show.scene) { buildShowcase(); show.scene.userData.look = { ...LOOK.plaza, env: 0.35 }; applyEnvironment(renderer, show.scene); }
  show.t += dt;
  for (const f of show.tick) f(show.t, dt);
  const w = innerWidth, h = innerHeight;
  show.cam.aspect = w / h; show.cam.updateProjectionMatrix();
  const a = Math.sin(show.t * 0.12) * 0.25;
  const off = w > 900 ? 3.4 : 0;                        // camera looks along +z, so +x shifts the view right on screen
  show.cam.position.set(off + Math.sin(a) * 15, 4.2, -15 + Math.cos(a) * 1.5);
  show.cam.lookAt(off + 0.6, 4.2, 12);                  // tilted up a little: more skyline, searchlights and fireworks
  renderer.render(show.scene, show.cam);
}

// ---------- screens ----------
function go(name) {
  if (screen === 'vault' && name !== 'vault') leaveVault();
  screen = name;
  for (const s of ['main', 'roster', 'stage', 'pass', 'online', 'seasons', 'slots', 'contracts', 'vault']) $('scr-' + s).classList.toggle('on', s === name);
  if (name === 'main') clipCount().then(n => { $('mmClips').textContent = n || ''; $('mmClips').classList.toggle('on', n > 0); });
  if (name === 'vault') enterVault({ blip: f => api?.blip?.(f) });
  $('front').classList.remove('hidden');
  if (name === 'main') { refreshPassCard(); $('modeTut')?.classList.toggle('fresh', !cfg.tutorialDone); const t = slotTokens(); $('mmTok').textContent = t || ''; $('mmTok').classList.toggle('on', t > 0); const o = openContracts(); $('mmCt').textContent = o || ''; $('mmCt').classList.toggle('on', o > 0); }
  if (name === 'slots') enterSlots();
  if (name === 'contracts') enterContracts();
  if (name === 'roster') { enterRoster(); requestAnimationFrame(fitKit); }
  if (name === 'stage') enterStage();
  if (name === 'pass') enterPass();
  if (name === 'online') enterOnline();
}

// ---------- roster ----------
// Hero select is a wall of portraits, a big showcase of the pick in the middle and its details on
// the right. The wall sorts by role (grouped by archetype), by name, or by most mastery; the
// archetype filter narrows any of them. Arrows and the keyboard step through what's showing.
let viewId = null, infoTab = 'kit', arch = cfg.rosterArch || 'all', sort = cfg.rosterSort || 'role';
const SORTS = [['role', '🧩', 'Role', 'Grouped by archetype'], ['name', '🔤', 'A–Z', 'Alphabetical by callsign'], ['mastery', '🏅', 'Mastery', 'Most played first']];
const BY_ROLE = ARCHETYPES.flatMap(a => HEROES.filter(h => h.arch === a.id));
const orderOf = () => sort === 'name' ? [...HEROES].sort((a, b) => a.callsign.localeCompare(b.callsign))
  : sort === 'mastery' ? [...HEROES].sort((a, b) => heroOwned(b.id) - heroOwned(a.id) || masteryOf(b.id).xp - masteryOf(a.id).xp || a.callsign.localeCompare(b.callsign))
  : BY_ROLE;
let ORDER = BY_ROLE;
const pool = () => arch === 'all' ? ORDER : ORDER.filter(h => h.arch === arch);
function renderArchBar() {
  const btn = (id, icon, name, n, color, desc) => `<button class="${arch === id ? 'on' : ''}" data-arch="${id}" style="--ac:${color}" title="${desc}"><i>${icon}</i>${name}<small>${n}</small></button>`;
  $('archBar').innerHTML = btn('all', '✦', 'All', HEROES.length, '#1d2340', 'Every hero')
    + ARCHETYPES.map(x => btn(x.id, x.icon, x.name, HEROES.filter(h => h.arch === x.id).length, hex(x.color), x.desc)).join('');
  $('sortBar').innerHTML = '<span>Sort</span>' + SORTS.map(([id, icon, name, desc]) => `<button class="${sort === id ? 'on' : ''}" data-sort="${id}" title="${desc}"><i>${icon}</i>${name}</button>`).join('');
}
function setArch(a) {
  if (a === arch) return;
  arch = a; cfg.rosterArch = a; save();
  renderArchBar();
  const L = pool(), keep = L.find(h => h.id === viewId);
  pickHero((keep || L.find(h => heroOwned(h.id)) || L[0]).id, true);
}
function setSort(s) {
  if (s === sort) return;
  sort = s; cfg.rosterSort = s; save();
  renderArchBar(); layoutWall();
  $('tiles').scrollTop = 0;
  markWall();
}
// Tiles are made once and moved between layouts, so their headshots never re-render.
const tileEls = {};
function layoutWall() {
  if (!tileEls[HEROES[0].id]) for (const h of HEROES) {
    const d = document.createElement('div');
    d.innerHTML = `<button class="tile" data-hero="${h.id}" style="--hc:${hex(h.color)}" title="${h.callsign} · ${h.role}"><img alt=""><b>${h.callsign}</b></button>`;
    tileEls[h.id] = d.firstElementChild;
  }
  ORDER = orderOf();
  const S = SORTS.find(x => x[0] === sort);
  const groups = sort === 'role'
    ? ARCHETYPES.map(a => ({ id: a.id, icon: a.icon, name: a.name, desc: a.desc, color: hex(a.color), hs: ORDER.filter(h => h.arch === a.id) }))
    : [{ id: 'flat', icon: S[1], name: sort === 'name' ? 'A to Z' : 'Most mastery', desc: S[3], color: '#1d2340', hs: ORDER }];
  const tiles = $('tiles');
  tiles.innerHTML = groups.map(g => `<div class="hs-grp" data-grp="${g.id}" style="--ac:${g.color}">
    <h6 title="${g.desc}"><i>${g.icon}</i>${g.name}<small>${g.hs.length}</small></h6><div class="hs-row"></div></div>`).join('');
  groups.forEach((g, i) => tiles.children[i].querySelector('.hs-row').append(...g.hs.map(h => tileEls[h.id])));
}
function enterRoster() {
  const first = !tileEls[HEROES[0].id];
  layoutWall();                                                     // re-sorts too, since mastery moves after matches
  // headshots render one per frame so the screen appears immediately
  if (first) ORDER.forEach((h, i) => setTimeout(() => refreshTile(h.id), 30 + i * 40));
  for (const h of HEROES) refreshTileLock(h.id);
  renderArchBar();
  const L = pool();
  const start = L.find(h => h.id === cfg.hero && heroOwned(h.id)) || L.find(h => heroOwned(h.id)) || L[0];
  viewId = null;
  pickHero(start.id, true);
}
const tileOf = id => tileEls[id];
function refreshTile(id) {
  const h = HEROES.find(x => x.id === id), t = tileOf(id);
  t.querySelector('img').src = headshot(dressed(h));
  t.style.setProperty('--hc', hex(dressed(h).color));
}
function refreshTileLock(id) {
  const t = tileOf(id), own = heroOwned(id);
  t.classList.toggle('locked', !own);
  t.querySelector('.lock')?.remove(); t.querySelector('.newb')?.remove();
  if (!own) t.insertAdjacentHTML('beforeend', `<span class="lock">🔒 ${lockShort(id)}</span>`);
  else if (heroTier(id) || isSlotItem(id) || isContractHero(id)) t.insertAdjacentHTML('beforeend', '<span class="newb">NEW</span>');
  // mastery: level badge, gold and diamond frames
  const m = masteryOf(id);
  t.querySelector('.mst')?.remove();
  if (own) t.insertAdjacentHTML('beforeend', `<span class="mst" style="--mc:${m.rank.color}" title="${m.rank.name} mastery · level ${m.level}">${m.level}</span>`);
  t.classList.toggle('m-gold', own && m.level >= 7 && m.level < 10); t.classList.toggle('m-diamond', own && m.level >= 10);
}
// Show the filtered heroes and mark the pick.
function markWall() {
  for (const g of $('tiles').querySelectorAll('.hs-grp')) {
    g.classList.toggle('off', sort === 'role' && arch !== 'all' && g.dataset.grp !== arch);
    if (g.dataset.grp === 'flat') g.querySelector('h6 small').textContent = pool().length;
  }
  for (const h of HEROES) tileEls[h.id].classList.toggle('off', sort !== 'role' && arch !== 'all' && h.arch !== arch);
  for (const t of $('tiles').querySelectorAll('.tile')) t.classList.toggle('sel', t.dataset.hero === viewId);
  const t = tileOf(viewId), box = $('tiles');
  if (t && (t.offsetTop < box.scrollTop || t.offsetTop + t.offsetHeight > box.scrollTop + box.clientHeight)) box.scrollTop = t.offsetTop - box.clientHeight / 2;
}
function stepHero(d) {
  const L = pool(), N = L.length, i = L.findIndex(h => h.id === viewId);
  pickHero(L[(i + d + N) % N].id);
}

function pickHero(id, instant) {
  const L = pool();
  const h = L.find(x => x.id === id) || HEROES.find(x => x.id === id) || L[0];
  if (h.id === viewId && !instant) return;
  viewId = h.id;
  if (heroOwned(h.id)) { cfg.hero = h.id; save(); }
  markWall();
  showHero(h, instant);
  api?.blip?.(520 + ORDER.indexOf(h) * 30);
}

// Stats with real numbers: health, move speed, the range the hero likes to fight at, and
// rough damage per second from the main weapon.
const STATS = h => {
  const w = h.weapon, dps = Math.round(w.dmg * (w.pellets || 1) / (w.rate || 1));
  return [['Health', h.hp, h.hp / 260], ['Speed', h.speed.toFixed(1), h.speed / 8.4], ['Range', `${h.prefRange} m`, h.prefRange / 30], ['Damage', `${dps}/s`, dps / 110]];
};

function showHero(h, instant) {
  const d = dressed(h), own = heroOwned(h.id), a = archOf(h);
  const sp = $('splash');
  $('scr-roster').style.setProperty('--hc', hex(d.color));
  sp.style.setProperty('--hd', hex(d.palette.dark));
  sp.style.setProperty('--ht', hex(d.palette.trim));
  $('splashWord').textContent = h.callsign;
  $('splashImg').classList.remove('in');
  const set = () => {
    $('splashImg').src = splash(d);
    void $('splashImg').offsetWidth;
    $('splashImg').classList.add('in');
  };
  if (instant) setTimeout(set, 20); else set();
  // the name plate over the showcase
  $('hsPlate').innerHTML = `<span class="hs-arch" style="--ac:${hex(a.color)}">${a.icon} ${a.name}</span><h2>${h.callsign}</h2><small>${h.name} · ${h.role}</small>`;
  $('hsPlate').classList.remove('in'); void $('hsPlate').offsetWidth; $('hsPlate').classList.add('in');
  const skins = skinsFor(h.id);
  const cur = d.skinId || null;
  const ownedSkins = skins.filter(s => own && skinOwned(s.id)).length;
  const tab = (id, label) => `<button class="${infoTab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`;
  const pane = id => `data-pane="${id}" class="${infoTab === id ? 'on' : ''}"`;
  const m = own ? masteryOf(h.id) : null;
  $('info').innerHTML = `
    <header class="ih">
      ${own ? `<div class="mline" style="--mc:${m.rank.color}" title="${m.xp} mastery XP">
          <b>${m.rank.name} · Lv ${m.level}</b><i><em style="width:${Math.round(m.frac * 100)}%"></em></i><small>${m.max ? `🎰 ${m.into}/${m.need} to bonus token` : `${m.into}/${m.need}`}</small></div>`
        : contractOf(h.id) ? contractCard(contractOf(h.id), true) : `<div class="hs-locked">🔒 ${lockLong(h.id)}</div>`}
      <div class="hs-stats">${STATS(h).map(([k, v, f]) => `<div><small>${k}</small><b>${v}</b><i><em style="width:${Math.round(Math.min(1, f) * 100)}%"></em></i></div>`).join('')}</div>
    </header>
    <nav class="itabs">${tab('kit', 'Abilities')}${tab('story', 'Story')}${tab('skins', `Skins <i>${ownedSkins + 1}/${skins.length + 1}</i>`)}</nav>
    <div class="ibody">
      <section ${pane('kit')}>
        <ul class="kit">
          <li><kbd>LMB</kbd><div><b>${h.weapon.name}</b><small>${h.weapon.desc}</small></div></li>
          <li><kbd>Q</kbd><div><b>${h.q.name}</b><small>${h.q.desc}</small></div></li>
          <li><kbd>E</kbd><div><b>${h.ability.name}</b><small>${h.ability.desc}</small></div></li>
          <li class="ult"><kbd>F</kbd><div><b>${h.ult.name}</b><small>${h.ult.desc}</small></div></li>
          ${h.passive ? `<li class="pas"><kbd title="Passive">PAS</kbd><div><b>${h.passive.name}</b><small>${h.passive.desc}</small></div></li>` : ''}
        </ul>
      </section>
      <section ${pane('story')}>
        <div class="st-title"><small>Title</small><b>${h.title}</b></div>
        <blockquote>“${h.quote}”</blockquote>
        <p>${h.bio}</p>
      </section>
      <section ${pane('skins')}>
        <div class="skins">
          <button class="sk ${cur ? '' : 'on'}" data-skin="" style="--a:${hex(h.palette.main)};--b:${hex(h.palette.trim)}"><i></i><span>Classic</span></button>
          ${skins.map(s => { const ok = own && skinOwned(s.id); return `<button class="sk ${cur === s.id ? 'on' : ''} ${ok ? '' : 'locked'}" data-skin="${s.id}" title="${ok ? s.name : lockLong(s.id, true)}"
            style="--a:${hex(s.palette.main)};--b:${hex(s.palette.trim)}"><i></i><span>${s.name}</span>${ok ? '' : `<em>🔒 ${lockShort(s.id, true)}</em>`}</button>`; }).join('')}
        </div>
      </section>
    </div>`;
  $('info').classList.remove('in'); void $('info').offsetWidth; $('info').classList.add('in');
  fitKit();
  // re-check once the header and fonts settle, and whenever the panel changes size
  kitRO?.disconnect(); kitRO = new ResizeObserver(fitSoon); kitRO.observe($('info').querySelector('.ibody'));
  setTimeout(fitKit, 450); document.fonts?.ready.then(fitKit);
  $('lockName').textContent = own ? h.callsign : 'Locked';
  $('lockIn').classList.toggle('locked', !own);
  $('lockIn').querySelector('small').textContent = !own ? (isContractHero(h.id) ? 'Finish the contract' : isSlotItem(h.id) ? 'Win it at the slots' : `Reach tier ${heroTier(h.id)}`) : mode === 'survivor' ? 'Drop in as' : 'Lock in';
}

// Shrink the ability list until all four rows fit the panel: smaller text first, then two
// columns, then smaller again. Only if nothing fits (a tiny window) does the panel scroll.
let kitRO = null, fitRaf = 0;
const fitSoon = () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitKit); };
function fitKit() {
  const body = $('info').querySelector('.ibody'), kit = body?.querySelector('.kit');
  if (!kit) return;
  // measure with the pane and rows at natural height: stretched ones always reach the bottom edge,
  // which made every size look like it overflowed
  kit.classList.add('fitting'); body.classList.add('fitting');
  try { sizeKit(body, kit); } finally { kit.classList.remove('fitting'); body.classList.remove('fitting'); }
}
function sizeKit(body, kit) {
  body.classList.remove('spill');
  if (!body.clientHeight || !kit.offsetParent) return;
  // everything in view, with a few pixels to spare so the last row never loses its bottom edge
  const fits = () => { const last = kit.lastElementChild; return body.scrollHeight <= body.clientHeight - 2 && (!last || last.getBoundingClientRect().bottom <= body.getBoundingClientRect().bottom - 3); };
  const wide = body.clientWidth >= 380;
  const tries = [[false, 1.8], [false, 1.65], [false, 1.5], [false, 1.38], [false, 1.26], [false, 1.2], [false, 1.1], [false, 1], [false, .92], [false, .85], ...(wide ? [[true, 1], [true, .92], [true, .85]] : []), [false, .78], [false, .72], ...(wide ? [[true, .78], [true, .7], [true, .62]] : []), [false, .66]];
  for (const [two, s] of tries) {
    kit.classList.toggle('two', two); kit.style.setProperty('--ks', s);
    if (fits()) return;
  }
  body.classList.add('spill');
}
let fitT = 0;
addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fitKit, 80); });

function pickSkin(skinId) {
  const h = HEROES.find(x => x.id === viewId);
  if (!heroOwned(h.id) || (skinId && !skinOwned(skinId))) { api?.blip?.(160); return; }
  equip(h.id, skinId || null);
  refreshTile(h.id);
  showHero(h, false);
  api?.blip?.(skinId ? 900 : 700);
}

// ---------- recruitment contracts ----------
const fmtN = n => n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'k' : String(n);
function contractCard(c, compact) {
  const h = HEROES.find(x => x.id === c.hero), done = tasksDone(c.hero), all = done === c.tasks.length;
  const rows = c.tasks.map(t => {
    const ok = taskDone(t), v = Math.min(statOf(t.stat), t.n);
    return `<li class="${ok ? 'ok' : ''}"><i>${ok ? '✓' : ''}</i><span>${t.label}</span><b>${fmtN(v)} / ${fmtN(t.n)}</b><u><em style="width:${taskFrac(t) > 0 ? Math.max(4, Math.round(taskFrac(t) * 100)) : 0}%"></em></u></li>`;
  }).join('');
  if (compact) return `<div class="ct-mini"><div class="ct-h"><span>📜 Recruitment contract</span><b>${done} / ${c.tasks.length}</b></div><ul class="ct-tasks">${rows}</ul></div>`;
  return `<article class="ct-card ${all ? 'done' : ''}" style="--hc:${hex(h.color)}">
    <div class="ct-pic"><img alt="" data-ct="${h.id}"><span class="ct-seal">${c.seal}</span>${all ? '<span class="ct-stamp">Recruited!</span>' : ''}</div>
    <div class="ct-body">
      <small class="ct-from">From ${c.from}</small>
      <h3>${h.callsign}</h3><em class="ct-role">${archOf(h).icon} ${h.role}</em>
      <p>${c.pitch}</p>
      <ul class="ct-tasks">${rows}</ul>
      <div class="ct-foot">${all ? `<button class="ct-go" data-play="${h.id}">Play ${h.callsign} ▸</button>` : `<span><b>${done} of ${c.tasks.length}</b> tasks done</span>`}</div>
    </div>
  </article>`;
}
function enterContracts() {
  $('ctList').innerHTML = CONTRACTS.map(c => contractCard(c)).join('');
  $('ctList').querySelectorAll('img[data-ct]').forEach((img, k) => setTimeout(() => { img.src = headshot(dressed(HEROES.find(x => x.id === img.dataset.ct))); }, 30 + k * 60));
}

// ---------- season pass ----------
function passSummary() {
  const pr = tierProgress(), next = TRACK.find(r => r.tier > pr.tier);      // skip over open tiers to the next real reward
  return { pr, next, info: next && rewardInfo(next) };
}
function refreshPassCard() {
  const { pr, info } = passSummary();
  $('pcTier').textContent = pr.tier;
  $('pcBar').style.width = (pr.frac * 100) + '%';
  $('pcNext').textContent = info ? `Next: ${info.title} · ${info.sub}` : 'Pass complete. Every reward unlocked!';
}
function enterPass(keepScroll) {
  const { pr, next, info } = passSummary();
  $('passSeason').textContent = `Season ${SEASON.n}`;
  $('pTier').textContent = pr.tier; $('pMax').textContent = `of ${MAX_TIER}`;
  $('pBar').style.width = '0%'; requestAnimationFrame(() => { $('pBar').style.width = (pr.frac * 100) + '%'; });
  $('pXp').textContent = pr.tier >= MAX_TIER ? `${passXp()} XP · maxed` : `${pr.into} / ${pr.need} XP to tier ${pr.tier + 1}`;
  const art = inf => inf.cos ? `<span class="pn-cos">${cosArt(inf.cos)}</span>` : `<img src="${headshot(inf.def)}" alt="" style="--hc:${hex(inf.def.color)}">`;
  $('pNext').innerHTML = info ? `${art(info)}<div><small>Tier ${next.tier} reward</small><b>${info.title}</b><span>${info.sub}</span></div>`
    : '<div><small>Season complete</small><b>All unlocked</b><span>Show them off.</span></div>';
  // your loadout: what's equipped in each cosmetic slot (click a card below to change it)
  const eq = equippedCos();
  $('pLoad').innerHTML = Object.entries(COS_TYPES).map(([t, T]) => {
    const c = cosById(eq[t]), ok = c && cosOwned(c.id);
    return `<span class="${ok ? 'on' : ''}"><i>${T.icon}</i><small>${T.label}</small><b>${ok ? c.name : 'None'}</b></span>`;
  }).join('');
  // one column per tier: the main reward, plus the bonus cosmetic underneath
  const tiers = [];
  TRACK.forEach((r, i) => { (tiers[r.tier - 1] ||= []).push([r, i]); });
  const card = (r, i, mini) => {
    const inf = rewardInfo(r), own = pr.tier >= r.tier, isNext = r.tier === pr.tier + 1;
    if (inf.cos) {
      const on = own && eq[inf.cos.type] === inf.cos.id;
      return `<div class="rw cos ${mini ? 'mini' : ''} ${own ? 'own' : 'lock'} ${isNext && !mini ? 'next' : ''} ${on ? 'equipped' : ''}" ${own ? `data-equip="${inf.cos.id}" title="${on ? 'Click to unequip' : 'Click to equip'}"` : ''}>
        ${mini ? '' : `<span class="rt">T${r.tier}</span>`}<span class="state">${on ? '★ Equipped' : own ? 'Equip' : '🔒'}</span>
        <div class="art">${cosArt(inf.cos)}</div>
        <div class="meta"><small>${inf.sub}</small><b>${inf.title}</b></div></div>`;
    }
    return `<div class="rw ${r.type === 'hero' ? 'hero' : ''} ${own ? 'own' : 'lock'} ${isNext ? 'next' : ''}" style="--hc:${hex(inf.def.color)}">
      ${r.type === 'hero' ? '<span class="ribbon">NEW HERO</span>' : ''}
      <span class="rt">T${r.tier}</span><span class="state">${own ? '✓ Owned' : '🔒'}</span>
      <div class="art"><img alt="" data-r="${i}"></div>
      <div class="meta"><small>${inf.sub}</small><b>${inf.title}</b></div></div>`;
  };
  const tr = $('track'), scroll = tr.scrollLeft;
  // tiers with no reward yet still get a column: an open slot for future rewards
  const open = t => `<div class="rw open ${pr.tier >= t ? 'own' : 'lock'} ${t === pr.tier + 1 ? 'next' : ''}"><span class="rt">T${t}</span>
    <div class="art"><span>＋</span></div><div class="meta"><small>Open tier</small><b>More soon</b></div></div>`;
  tr.innerHTML = Array.from({ length: MAX_TIER }, (_, t) => tiers[t] || []).map((list, t) => `<div class="tcol" style="animation-delay:${t * 0.02}s">${list.length ? list.map(([r, i], k) => card(r, i, k > 0)).join('') : open(t + 1)}</div>`).join('');
  tr.querySelectorAll('img[data-r]').forEach((img, k) => setTimeout(() => {
    img.src = headshot(rewardInfo(TRACK[+img.dataset.r]).def); img.classList.add('ok');
  }, keepScroll ? 0 : 40 + k * 35));
  const focus = tr.children[Math.max(0, pr.tier - 1)];
  tr.style.scrollBehavior = 'auto'; tr.scrollLeft = keepScroll ? scroll : focus ? focus.offsetLeft - 60 : 0; tr.style.scrollBehavior = '';
}
function toggleCos(id) {
  const c = cosById(id);
  if (!c || !cosOwned(id)) return;
  const on = equippedCos()[c.type] === id;
  equipCos(c.type, on ? null : id);
  api?.blip?.(on ? 500 : 900);
  enterPass(true);
}
// ---------- stage ----------
// One big preview for the highlighted stage and a list of light cards beside it. Only the stage
// you're looking at gets rendered, a moment after you settle on it.
let stageView = null, stageT = 0;
const modeChip = m => {
  if (mode === 'hill') { const spots = new Set(m.hills.map(p => p.join())).size; return `${spots} hill spot${spots > 1 ? 's' : ''} ·${m.lanesLabel.split('·')[1]}`; }
  if (mode === 'cart') return `1 cart track ·${m.lanesLabel.split('·')[1]}`;
  return m.lanesLabel;
};
function enterStage() {
  const h = dressed(HEROES.find(x => x.id === cfg.hero));
  $('stageHero').innerHTML = `<img src="${headshot(h)}" alt=""><span>Playing as <b>${h.callsign}</b></span>`;
  $('stageHero').style.setProperty('--hc', hex(h.color));
  $('cols').innerHTML = MAPS.map((m, i) => {
    const t = THEMES[m.theme];
    return `<button class="stg-card" data-map="${m.id}" style="--ma:${hex(m.accent)};--s1:${hex(t.skyTop)};--s2:${hex(t.skyBottom)}">
      <span class="num">0${i + 1}</span><span class="tx"><b>${m.name}</b><small>${modeChip(m)}</small></span><i>▸</i></button>`;
  }).join('');
  stageView = null;
  showStage(MAPS.find(m => m.id === cfg.map) || MAPS[0], true);
}
function showStage(m, now) {
  if (stageView === m.id) return;
  stageView = m.id;
  for (const c of $('cols').children) c.classList.toggle('on', c.dataset.map === m.id);
  const t = THEMES[m.theme], v = $('stgView');
  v.style.setProperty('--ma', hex(m.accent));
  v.style.background = `linear-gradient(180deg, ${hex(t.skyTop)}, ${hex(t.skyBottom)})`;
  $('stgChip').textContent = modeChip(m);
  $('stgName').textContent = m.name;
  $('stgDesc').textContent = m.desc;
  const facts = [[m.lanes.length, m.lanes.length > 1 ? 'lanes' : 'lane'], [m.towers.length * 2, 'towers'], [`${m.W * 2}×${m.L * 2}`, 'metres']];
  $('stgFacts').innerHTML = facts.map(([n, l]) => `<span><b>${n}</b>${l}</span>`).join('');
  const img = $('stgImg');
  img.classList.remove('in'); $('stgLoad').classList.add('on');
  clearTimeout(stageT);
  // wait for the cursor to settle so skimming the list doesn't render every stage
  stageT = setTimeout(() => {
    if (stageView !== m.id) return;
    img.onload = () => { if (stageView === m.id) { img.classList.add('in'); $('stgLoad').classList.remove('on'); } };
    img.src = mapArt(m, 1280, 720);
  }, now ? 60 : 220);
}
function deployStage(id) {
  cfg.map = id; save();
  $('front').classList.add('hidden');
  api.onStart(mode);
}

// ---------- settings ----------
const SCHEMA = [
  { id: 'game', group: 'Gameplay', icon: '🎮', blurb: 'How matches feel', items: [
    { key: 'diff', label: 'Bot difficulty', hint: 'How sharp the bots aim and react', type: 'choice', options: Object.entries(DIFFICULTY).map(([k, d]) => [k, d.label]) },
    { key: 'dmgNumbers', label: 'Floating damage numbers', hint: 'Numbers pop off whatever you hit', type: 'toggle' },
    { key: 'voiceLines', label: 'Hero voice lines', hint: 'Quips on kills, abilities and spawns', type: 'toggle' },
  ] },
  { id: 'controls', group: 'Controls', icon: '🖱️', blurb: 'Mouse and aiming', items: [
    { key: 'sens', label: 'Mouse sensitivity', hint: 'How far the camera turns per mouse move', type: 'range', min: 0.3, max: 3, step: 0.05, fmt: v => v.toFixed(2) },
    { key: 'invertY', label: 'Invert mouse Y', hint: 'Push the mouse forward to look down', type: 'toggle' },
  ] },
  { id: 'video', group: 'Video', icon: '🖥️', blurb: 'Looks and performance', items: [
    { key: 'fov', label: 'Field of view', hint: 'Wider shows more around you', type: 'range', min: 70, max: 110, step: 1, fmt: v => v + '°' },
    { key: 'quality', label: 'Render quality', hint: 'Lower runs smoother, higher looks sharper', type: 'choice', options: Object.entries(QUALITY).map(([k, q]) => [k, q.label]) },
    { key: 'shadows', label: 'Shadows', hint: 'Soft shadows under heroes and props', type: 'toggle' },
    { key: 'screenShake', label: 'Screen shake', hint: 'Shakes on blasts, slams and big hits', type: 'toggle' },
    { key: 'perf', label: 'Performance overlay', hint: 'Frame rate in the corner (also F3)', type: 'toggle' },
  ] },
  { id: 'audio', group: 'Audio', icon: '🔊', blurb: 'Volume levels', items: [
    { key: 'volume', label: 'Master volume', hint: 'Everything at once', type: 'range', min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
    { key: 'music', label: 'Music', hint: 'Menu and stage soundtracks', type: 'range', min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
    { key: 'sfx', label: 'Sound effects', hint: 'Shots, abilities and hits', type: 'range', min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
  ] },
  { id: 'keys', group: 'Key guide', icon: '⌨️', blurb: 'What every key does', items: [] },
];
const KEYS = [['WASD', 'Move'], ['Mouse', 'Aim'], ['LMB', 'Fire'], ['Space', 'Jump'], ['Shift', 'Sprint'], ['Q', 'Ability 1'], ['E', 'Ability 2'], ['F', 'Ultimate'],
  ['R', 'Reload'], ['T', 'Spray'], ['Tab', 'Scoreboard'], ['Esc', 'Pause'], ['F3', 'Performance']];
let setTab = 'game', savedT = 0, resetArm = 0;
const rangeFill = (it, v) => ((v - it.min) / (it.max - it.min) * 100).toFixed(1) + '%';

function renderSettings() {
  $('setNav').innerHTML = SCHEMA.map(s => `<button class="${s.id === setTab ? 'on' : ''}" data-stab="${s.id}"><i>${s.icon}</i><span><b>${s.group}</b><small>${s.blurb}</small></span></button>`).join('');
  const s = SCHEMA.find(x => x.id === setTab);
  const row = it => {
    const v = cfg[it.key], lab = `<div class="sr-l"><b>${it.label}</b><small>${it.hint}</small></div>`;
    if (it.type === 'toggle') return `<div class="srow">${lab}<button class="tog ${v ? 'on' : ''}" data-key="${it.key}" data-type="toggle" aria-pressed="${!!v}"><i></i><em>${v ? 'On' : 'Off'}</em></button></div>`;
    if (it.type === 'choice') return `<div class="srow">${lab}<div class="seg">${it.options.map(([k, l]) => `<button class="${v === k ? 'on' : ''}" data-key="${it.key}" data-type="choice" data-val="${k}">${l}</button>`).join('')}</div></div>`;
    return `<div class="srow">${lab}<div class="rng"><input type="range" data-key="${it.key}" min="${it.min}" max="${it.max}" step="${it.step}" value="${v}" style="--p:${rangeFill(it, +v)}"><output>${it.fmt(+v)}</output></div></div>`;
  };
  $('setGrid').innerHTML = `<h3><i>${s.icon}</i>${s.group}</h3>` + (s.id === 'keys'
    ? `<div class="keygrid">${KEYS.map(([k, l]) => `<div><kbd>${k}</kbd><span>${l}</span></div>`).join('')}</div>`
    : `<div class="srows">${s.items.map(row).join('')}</div>`);
}
function setSetting(key, val) {
  cfg[key] = val; save();
  api?.onSettings?.(key);
  const el = $('setSaved'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  clearTimeout(savedT); savedT = setTimeout(() => el.classList.remove('flash'), 1200);
}
export function openSettings() {
  settingsOpen = true; renderSettings();
  $('settings').classList.remove('hidden');
}
function closeSettings() {
  settingsOpen = false; $('settings').classList.add('hidden');
  api?.onSettingsClosed?.();
}
export const settingsVisible = () => settingsOpen;

// ---------- wiring ----------
export function initMenu(opts) {
  api = opts;
  $('modeLane').onclick = () => { setMode('lane'); go('roster'); };
  $('modeSurv').onclick = () => { setMode('survivor'); go('roster'); };
  $('modeHill').onclick = () => { setMode('hill'); go('roster'); };
  $('modeCart').onclick = () => { setMode('cart'); go('roster'); };
  $('modeTut').onclick = () => { api?.blip?.(880); $('front').classList.add('hidden'); api.onStart('tutorial'); };
  $('modeTut').classList.toggle('fresh', !cfg.tutorialDone);
  $('modeOnline').onclick = () => go('online');
  $('modeSeasons').onclick = () => { api?.blip?.(760); go('seasons'); };
  $('modeSlots').onclick = () => { api?.blip?.(760); go('slots'); };
  $('modeContracts').onclick = () => { api?.blip?.(760); go('contracts'); };
  $('modeVault').onclick = () => { api?.blip?.(760); go('vault'); };
  initVault();
  $('ctList').onclick = e => { const b = e.target.closest('[data-play]'); if (!b) return; cfg.hero = b.dataset.play; save(); api?.blip?.(900); go('roster'); };
  initOnline({ go, screen: () => screen, blip: f => api?.blip?.(f), start: m => api.onStartOnline(m), pickHero: () => { setMode('online'); go('roster'); } });
  document.querySelectorAll('[data-open-settings]').forEach(b => { b.onclick = openSettings; });
  document.querySelectorAll('[data-back]').forEach(b => { b.onclick = () => go(b.dataset.back); });
  $('tiles').onclick = e => { const t = e.target.closest('.tile'); if (t) pickHero(t.dataset.hero); };
  $('archBar').onclick = e => { const b = e.target.closest('[data-arch]'); if (b) { api?.blip?.(700); setArch(b.dataset.arch); } };
  $('sortBar').onclick = e => { const b = e.target.closest('[data-sort]'); if (b) { api?.blip?.(760); setSort(b.dataset.sort); } };
  $('carL').onclick = () => stepHero(-1);
  $('carR').onclick = () => stepHero(1);
  $('info').addEventListener('click', e => {
    const b = e.target.closest('.sk'); if (b) return pickSkin(b.dataset.skin);
    const t = e.target.closest('[data-tab]');
    if (t) {
      infoTab = t.dataset.tab;
      $('info').querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === t));
      $('info').querySelectorAll('[data-pane]').forEach(x => x.classList.toggle('on', x.dataset.pane === infoTab));
      fitKit();
      api?.blip?.(640);
    }
  });
  $('passCard').onclick = () => { api?.blip?.(760); go('pass'); };
  $('track').addEventListener('click', e => { const c = e.target.closest('[data-equip]'); if (c) toggleCos(c.dataset.equip); });
  $('track').addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); $('track').scrollLeft += e.deltaY; } }, { passive: false });
  $('lockIn').onclick = () => {
    if (!heroOwned(viewId)) { api?.blip?.(150); $('lockIn').classList.remove('nope'); void $('lockIn').offsetWidth; $('lockIn').classList.add('nope'); return; }
    api?.blip?.(880);
    if (mode === 'survivor') { $('front').classList.add('hidden'); api.onStart('survivor'); }
    else if (mode === 'online') go('online');
    else go('stage');
  };
  $('cols').onclick = e => {
    const c = e.target.closest('.stg-card'); if (!c) return;
    if (stageView === c.dataset.map) { api?.blip?.(880); return deployStage(c.dataset.map); }   // clicking the stage being previewed plays it
    api?.blip?.(520); showStage(MAPS.find(m => m.id === c.dataset.map), true);
  };
  $('cols').onmouseover = e => { const c = e.target.closest('.stg-card'); if (c && stageView !== c.dataset.map) { api?.blip?.(300 + [...$('cols').children].indexOf(c) * 80); showStage(MAPS.find(m => m.id === c.dataset.map)); } };
  $('stgGo').onclick = () => { api?.blip?.(880); deployStage(stageView); };
  $('setNav').addEventListener('click', e => {
    const b = e.target.closest('[data-stab]'); if (!b || b.dataset.stab === setTab) return;
    setTab = b.dataset.stab; api?.blip?.(640); renderSettings();
  });
  $('setGrid').addEventListener('click', e => {
    const b = e.target.closest('button[data-key]'); if (!b) return;
    e.preventDefault();
    if (b.dataset.type === 'toggle') setSetting(b.dataset.key, !cfg[b.dataset.key]);
    else setSetting(b.dataset.key, b.dataset.val);
    api?.blip?.(b.dataset.type === 'toggle' && !cfg[b.dataset.key] ? 420 : 760);
    renderSettings();
  });
  $('setGrid').addEventListener('input', e => {
    const k = e.target.dataset.key; if (!k) return;
    const it = SCHEMA.flatMap(s => s.items).find(i => i.key === k);
    setSetting(k, +e.target.value);
    e.target.style.setProperty('--p', rangeFill(it, +e.target.value));
    e.target.nextElementSibling.textContent = it.fmt(+e.target.value);
  });
  $('setDone').onclick = closeSettings; $('setX').onclick = closeSettings;
  $('settings').addEventListener('click', e => { if (e.target === $('settings')) closeSettings(); });     // click outside the sheet
  // reset asks twice, so a stray click can't wipe your setup
  $('setReset').onclick = () => {
    const b = $('setReset');
    if (!resetArm) { resetArm = setTimeout(() => { resetArm = 0; b.classList.remove('arm'); b.textContent = '↺ Reset to defaults'; }, 2600); b.classList.add('arm'); b.textContent = 'Click again to reset'; api?.blip?.(300); return; }
    clearTimeout(resetArm); resetArm = 0; b.classList.remove('arm'); b.textContent = '↺ Reset to defaults';
    resetSettings(); renderSettings(); ['quality', 'shadows', 'fov', 'volume', 'music', 'sfx'].forEach(k => api?.onSettings?.(k));
    setSetting('diff', cfg.diff);
  };
  addEventListener('keydown', e => {
    if (settingsOpen && e.code === 'Escape') { closeSettings(); return; }
    if ($('front').classList.contains('hidden') || settingsOpen) return;
    if (screen === 'roster') {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') stepHero(1);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') stepHero(-1);
      const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code);                 // 1-5: All and each archetype
      if (n >= 0) { api?.blip?.(700); setArch(['all', ...ARCHETYPES.map(a => a.id)][n]); }
      if (e.code === 'Enter') $('lockIn').click();
      if (e.code === 'Escape') go('main');
    } else if (screen === 'stage') {
      const i = MAPS.findIndex(m => m.id === stageView);
      if (e.code === 'Escape') go('roster');
      if (e.code === 'ArrowDown' || e.code === 'KeyS') showStage(MAPS[(i + 1) % MAPS.length], true);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') showStage(MAPS[(i - 1 + MAPS.length) % MAPS.length], true);
      if (e.code === 'Enter') deployStage(stageView);
    }
    else if (screen === 'pass' && e.code === 'Escape') go('main');
    else if (screen === 'seasons' && e.code === 'Escape') go('main');
    else if (screen === 'contracts' && e.code === 'Escape') go('main');
    else if (screen === 'slots' && e.code === 'Escape') go('main');
    else if (screen === 'vault' && e.code === 'Escape') go('main');
    else if (screen === 'main' && e.code === 'Enter') { setMode('lane'); go('roster'); }
  });
  go('main');
}

export function showMenu(name = 'main') { go(name); }
export function menuFrame(renderer, dt) {
  if ($('front').classList.contains('hidden') || screen !== 'main') return false;
  frameShowcase(renderer, dt);
  return true;
}
