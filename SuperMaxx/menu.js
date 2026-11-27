import { LOOK, applyEnvironment } from './stage.js?v=20261128e';
import { masteryOf } from './mastery.js?v=20261128e';
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { HEROES, ALL_HEROES, ARCHETYPES, archOf } from './heroes.js?v=20261128e';
import './personality.js?v=20261128e';
import { MAPS, DIFFICULTY } from './data.js?v=20261128e';
import { BOSS_LIST, bossOf } from './raid.js?v=20261128e';
import { storyMissions, storyDone, storyCount, GOAL, TYPE_ICON, MEDALS, MEDAL_ICON, medalOf, bestTime, parOf, medalCount, fmtTime } from './story.js?v=20261128e';
import { THEMES } from './scenery.js?v=20261128e';
import { cfg, save, resetSettings, QUALITY } from './settings.js?v=20261128e';
import { ACTIONS, FIXED, kb, keyLabel, rebind, resetBinds } from './keys.js?v=20261128e';
import { splash, headshot, mapArt } from './portraits.js?v=20261128e';
import { initOnline, enterOnline } from './online.js?v=20261128e';
import { enterSlots } from './slotmachine.js?v=20261128e';
import { initVault, enterVault, leaveVault, clipCount } from './vault.js?v=20261128e';
import { openHub } from './social.js?v=20261128e';
import { tokens as slotTokens, SEASON_HEROES } from './slots.js?v=20261128e';
import { playerLevel } from './level.js?v=20261128e';
import { openHowTo } from './howto.js?v=20261128e';
import { XH_STYLES, XH_COLORS, applyCrosshair } from './crosshair.js?v=20261128e';
import { CONTRACTS, contractOf, taskFrac, taskDone, statOf, tasksDone, openContracts, contractsLeft, contractUnlocked, contractDone } from './contracts.js?v=20261128e';
import { SEASON, SEASONS, NEXT_SEASON, TRACKS, seasonLive, seasonTier, seasonStartLabel, skinById, TRACK, MAX_TIER, passXp, tierProgress, heroOwned, heroTier, skinOwned, skinTier, skinsFor, dressed, equip, rewardInfo,
  COS_TYPES, cosById, cosOwned, equippedCos, equipCos, cosArt, lockShort, lockLong, isSlotItem, isContractHero } from './pass.js?v=20261128e';

// Front end: main menu → roster select → stage select → match. Settings overlay on top.

const $ = id => document.getElementById(id);
const hex = c => '#' + c.toString(16).padStart(6, '0');
let api = null, screen = 'main', settingsOpen = false, mode = 'lane';
const MODE_NAME = { lane: 'Lane Breaker', survivor: 'Survivor', hill: 'Hill Rush', cart: 'Payload', potato: 'Hot Potato', paint: 'Paint Party', raid: 'Boss Raid', story: 'Story', online: 'Online' };
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
  for (const s of ['main', 'roster', 'stage', 'pass', 'online', 'seasons', 'slots', 'contracts', 'vault', 'story']) $('scr-' + s).classList.toggle('on', s === name);
  if (name === 'main') clipCount().then(n => { $('mmClips').textContent = n || ''; $('mmClips').classList.toggle('on', n > 0); });
  if (name === 'vault') enterVault({ blip: f => api?.blip?.(f) });
  $('front').classList.remove('hidden');
  if (name === 'main') { refreshPassCard(); refreshLevel(); const t = slotTokens(); $('mmTok').textContent = t || ''; $('mmTok').classList.toggle('on', t > 0); const o = contractsLeft(); $('mmCt').textContent = o || ''; $('mmCt').classList.toggle('on', o > 0); const vn = vaultNews() || (NEXT_SEASON && NEXT_SEASON.start > Date.now()); $('mmVlt').textContent = vaultNews() ? '!' : '★'; $('mmVlt').classList.toggle('on', !!vn); }
  if (name === 'slots') enterSlots();
  if (name === 'contracts') enterContracts();
  if (name === 'roster') { enterRoster(); requestAnimationFrame(fitKit); }
  if (name === 'stage') enterStage();
  if (name === 'pass') enterPass();
  if (name === 'story') enterStory();
  const firstLook = name === 'roster' ? mode : name === 'story' ? 'story' : null;
  if (firstLook && !(cfg.seenHow ||= {})[firstLook] && firstLook !== 'online') { cfg.seenHow[firstLook] = 1; save(); setTimeout(() => openHowTo(firstLook), 350); }
  if (name === 'seasons') enterSeasons();
  if (name === 'online') enterOnline();
}

// ---------- roster ----------
// Hero select is a wall of portraits, a big showcase of the pick in the middle and its details on
// the right. The wall sorts by class (grouped by archetype), by name, or by most mastery; the
// archetype filter narrows any of them. Arrows and the keyboard step through what's showing.
let viewId = null, infoTab = 'kit', sort = cfg.rosterSort || 'role';
const SORTS = [['role', '🧩', 'Class', 'Grouped by class'], ['name', '🔤', 'Name', 'Alphabetical by callsign'], ['mastery', '🏅', 'Mastery', 'Most played first']];
const BY_ROLE = ARCHETYPES.flatMap(a => HEROES.filter(h => h.arch === a.id));
const orderOf = () => sort === 'name' ? [...HEROES].sort((a, b) => a.callsign.localeCompare(b.callsign))
  : sort === 'mastery' ? [...HEROES].sort((a, b) => heroOwned(b.id) - heroOwned(a.id) || masteryOf(b.id).xp - masteryOf(a.id).xp || a.callsign.localeCompare(b.callsign))
  : BY_ROLE;
let ORDER = BY_ROLE;
const pool = () => ORDER;                         // every hero always shows; sorting only reorders them
function renderArchBar() {
  $('sortBar').innerHTML = '<span>Sort</span>' + SORTS.map(([id, icon, name, desc]) => `<button class="${sort === id ? 'on' : ''}" data-sort="${id}" title="${desc}"><i>${icon}</i>${name}</button>`).join('');
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
  $('tiles').classList.toggle('solo', sort !== 'role');                    // one shelf showing: it gets the full width
  for (const g of $('tiles').querySelectorAll('.hs-grp')) {
    if (g.dataset.grp === 'flat') g.querySelector('h6 small').textContent = pool().length;
  }
  for (const t of $('tiles').querySelectorAll('.tile')) t.classList.toggle('sel', t.dataset.hero === viewId);
  // keep the pick in view: every shelf scrolls sideways
  const t = tileOf(viewId), row = t?.parentElement;
  if (row && (t.offsetLeft < row.scrollLeft || t.offsetLeft + t.offsetWidth > row.scrollLeft + row.clientWidth)) row.scrollLeft = t.offsetLeft - (row.clientWidth - t.offsetWidth) / 2;
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
        : contractOf(h.id) ? `<div class="hs-locked">📜 ${contractUnlocked(h.id) ? `Recruit ${h.callsign} by finishing their contract on the Contracts screen` : "Their contract arrives on the Contracts screen once a slot is free"}</div>` : `<div class="hs-locked">🔒 ${lockLong(h.id)}</div>`}
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
  $('hsPracticeName').textContent = own ? `Learn ${h.callsign}’s kit` : `Try ${h.callsign} before you unlock them`;
  $('lockIn').classList.toggle('locked', !own);
  $('lockIn').querySelector('small').textContent = !own ? (isContractHero(h.id) ? (contractUnlocked(h.id) ? 'Finish the contract' : 'Contract sealed') : isSlotItem(h.id) ? 'Win it at the slots' : `Reach tier ${heroTier(h.id)}`) : mode === 'survivor' ? 'Drop in as' : 'Lock in';
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
  if (!contractUnlocked(c.hero)) {                   // second wave: sealed until another contract is finished
    if (compact) return `<div class="hs-locked">✉️ Sealed contract · Finish another recruitment contract and this hero will send theirs.</div>`;
    return '';
  }
  const rows = c.tasks.map(t => {
    const ok = taskDone(t), v = Math.min(statOf(t.stat, c.hero), t.n);
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
// Only the contracts on offer get a card (three at a time); heroes already recruited sit in a strip underneath.
function enterContracts() {
  const open = CONTRACTS.filter(c => contractUnlocked(c.hero) && !contractDone(c.hero)), got = CONTRACTS.filter(c => contractDone(c.hero));
  const sealed = CONTRACTS.length - open.length - got.length;
  $('ctList').innerHTML = (open.length ? open.map(c => contractCard(c)).join('') : '<div class="ct-all">🎉 Every contract is signed. The whole kitchen staff, one spider and a night owl are on the team.</div>')
    + (got.length || sealed ? `<div class="ct-recruited"><span>Recruited</span>${got.map(c => { const h = HEROES.find(x => x.id === c.hero);
      return `<button data-play="${h.id}" style="--hc:${hex(h.color)}"><img alt="" data-ct="${h.id}"><b>${h.callsign}</b><i>Play ▸</i></button>`; }).join('') || '<em>No one yet. Finish a contract above!</em>'}
      ${sealed ? `<small>✉️ ${sealed} more ${sealed > 1 ? 'heroes are' : 'hero is'} waiting to send a contract</small>` : ''}</div>` : '');
  $('ctList').querySelectorAll('img[data-ct]').forEach((img, k) => setTimeout(() => { img.src = headshot(dressed(HEROES.find(x => x.id === img.dataset.ct))); }, 30 + k * 60));
}

// ---------- seasons: the name on the pass, the countdown to the next one, and the hall of fame ----------
document.body.dataset.season = SEASON.n;
const seasonTitle = s => `Season ${s.n} · ${s.name}`;
function untilLabel(s) {
  const ms = s.start - Date.now();
  if (ms <= 0) return 'now';
  const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.ceil(ms % 36e5 / 6e4);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}
// the player level badge under the logo
function refreshLevel() {
  const L = playerLevel();
  $('mmLevel').innerHTML = `<b><small>LV</small>${L.level}</b><span><i style="width:${(L.frac * 100).toFixed(1)}%"></i></span><em>${L.into.toLocaleString()} / ${L.need.toLocaleString()} XP · next level +1 token</em>`;
}
function refreshSeasonText() {
  $('pcSeason').textContent = `${seasonTitle(SEASON)} Pass`;
  $('passName').textContent = `${SEASON.name} Pass`;
  const N = NEXT_SEASON, soon = !!N && N.start > Date.now();
  $('pcSoon').classList.toggle('hidden', !soon);
  $('passSoon').classList.toggle('hidden', !soon);
  if (!soon) return;
  $('pcSoon').textContent = `${N.icon} Season ${N.n} in ${untilLabel(N)}`;
  $('passSoon').innerHTML = `<span style="font-size:22px">${N.icon}</span><span><b>${seasonTitle(N)}</b> opens ${seasonStartLabel(N)} (in ${untilLabel(N)}). ${N.blurb} Everything you earn here stays yours.</span>`;
}
setInterval(() => { if (screen === 'main' || screen === 'pass') refreshSeasonText(); }, 30000);
// what a finished (or not yet started) season's rewards look like as little chips
function rewardChip(r, got, tier) {
  const tg = tier ? `<em>T${tier}</em>` : '';
  if (r.type === 'hero') { const h = ALL_HEROES.find(x => x.id === r.id); return `<span class="${got ? '' : 'off'}"><img src="${headshot(h)}" alt="" style="--hc:${hex(h.color)}">${h.callsign}${tg}</span>`; }
  const s = skinById(r.id); if (!s) return '';
  const h = ALL_HEROES.find(x => x.id === s.hero);
  return `<span class="${got ? '' : 'off'}"><i style="--hc:${hex(s.color)}"></i>${s.name}${h ? ` · ${h.callsign}` : ''}${tg}</span>`;
}
// The Vault: a preview of the next season while it's on its way, the season running now, and
// every finished season with your final tier. A season moves in here the day the next one opens.
const VAULT_SEEN = 'supermaxx-vault-seen';
const vaultNews = () => { try { return SEASON.n > (+localStorage.getItem(VAULT_SEEN) || 1); } catch { return false; } };
function enterSeasons() {
  try { localStorage.setItem(VAULT_SEEN, SEASON.n); } catch {}
  const past = SEASONS.filter(s => seasonLive(s) && s.n < SEASON.n).reverse();
  const N = NEXT_SEASON && NEXT_SEASON.start > Date.now() ? NEXT_SEASON : null;
  const started = NEXT_SEASON && !N;                                     // it opened while the game was running
  const heroOf = id => ALL_HEROES.find(x => x.id === id);
  // the next season, as a preview: its heroes, its skins and what happens to this one
  let preview = '';
  if (N) {
    const tr = TRACKS[N.n] || [], heroes = tr.filter(r => r.type === 'hero'), skins = tr.filter(r => r.type === 'skin');
    preview = `<div class="ps-card soon preview"><div class="ps-head"><span class="ps-ico">${N.icon}</span><div><small class="pv-tag">Coming soon · preview</small><h3>${seasonTitle(N)}</h3>
        <small id="psCount">Opens ${seasonStartLabel(N)} · in ${untilLabel(N)}</small></div></div>
      <div class="ps-note">${N.blurb}</div>
      <div class="pv-heroes">${heroes.map(r => { const h = heroOf(r.id); return h ? `<div class="pv-hero" style="--hc:${hex(h.color)}">
        <div class="pv-pic"><img alt="" data-pv="${h.id}"></div><span class="pv-t">Tier ${r.tier}</span>
        <div class="pv-tx"><b>${h.callsign}</b><small>${h.name} · ${h.role}</small><p>${h.title}</p></div></div>` : ''; }).join('')}</div>
      <h4 class="pv-h">${skins.length} new skins on the pass</h4>
      <div class="ps-got">${skins.map(r => rewardChip(r, true, r.tier)).join('')}</div>
      <div class="pv-move">🏆 When ${seasonTitle(N)} opens, ${seasonTitle(SEASON)} moves into the Vault with your final tier. Everything you unlocked stays yours, and any of its heroes you haven’t earned (${(SEASON_HEROES[SEASON.n] || []).map(id => heroOf(id)?.callsign).join(', ')}) join the slot machine.</div></div>`;
  }
  // the season running now
  const cur = (() => {
    const t = seasonTier(SEASON.n), track = TRACKS[SEASON.n].filter(r => !r.cos), got = track.filter(r => r.tier <= t);
    return `<div class="ps-card now"><div class="ps-head"><span class="ps-ico">${SEASON.icon}</span><div><small class="pv-tag">Now playing</small><h3>${seasonTitle(SEASON)}</h3>
        <small>${got.length} of ${track.length} rewards earned${N ? ` · moves to the Vault ${seasonStartLabel(N)}` : started ? ' · moves to the Vault when you reload' : ''}</small></div>
        <div class="ps-final"><small>Tier</small><b>${t}</b></div></div>
      <div class="ps-got">${track.map(r => rewardChip(r, r.tier <= t, r.tier)).join('')}</div>
      ${N ? `<div class="ps-note">${track.length - got.length ? `${track.length - got.length} rewards left to earn before ${seasonStartLabel(N)}.` : 'Every reward earned. Nicely done.'}</div>` : ''}</div>`;
  })();
  const fresh = started ? `<div class="ps-card soon"><div class="ps-head"><span class="ps-ico">${NEXT_SEASON.icon}</span><div><h3>${seasonTitle(NEXT_SEASON)} is live!</h3>
      <small>Reload the game to start it. ${SEASON.name} moves into the Vault.</small></div></div></div>` : '';
  const cards = past.map(s => {
    const t = seasonTier(s.n), track = TRACKS[s.n].filter(r => !r.cos), got = track.filter(r => r.tier <= t), next = SEASONS[s.n];
    return `<div class="ps-card past"><div class="ps-head"><span class="ps-ico">${s.icon}</span><div><small class="pv-tag">In the Vault${next ? ` since ${seasonStartLabel(next)}` : ''}</small><h3>${seasonTitle(s)}</h3>
      <small>${got.length} of ${track.length} rewards earned</small></div><div class="ps-final"><small>Final tier</small><b>${t}</b></div></div>
      <div class="ps-got">${track.map(r => rewardChip(r, r.tier <= t, r.tier)).join('')}</div>
      <div class="ps-note">This season is over. Everything you earned is still yours to use${(SEASON_HEROES[s.n] || []).some(id => !heroOwned(id)) ? ', and the heroes you missed can now be won from the 🎰 slot machine' : ''}.</div></div>`;
  }).join('');
  $('psBody').innerHTML = `<div class="ps-list">${fresh}${preview}${cur}${cards}</div>`;
  $('psBody').querySelectorAll('img[data-pv]').forEach((img, k) => setTimeout(() => { img.src = splash(heroOf(img.dataset.pv)); }, 30 + k * 60));
}
setInterval(() => { const c = $('psCount'); if (screen === 'seasons' && c && NEXT_SEASON) c.textContent = `Opens ${seasonStartLabel(NEXT_SEASON)} · in ${untilLabel(NEXT_SEASON)}`; }, 30000);
// ---------- season pass ----------
function passSummary() {
  const pr = tierProgress(), next = TRACK.find(r => r.tier > pr.tier);      // skip over open tiers to the next real reward
  return { pr, next, info: next && rewardInfo(next) };
}
function refreshPassCard() {
  const { pr, info } = passSummary();
  refreshSeasonText();
  $('pcTier').textContent = pr.tier;
  $('pcBar').style.width = (pr.frac * 100) + '%';
  $('pcNext').textContent = info ? `Next: ${info.title} · ${info.sub}` : 'Pass complete. Every reward unlocked!';
}
function enterPass(keepScroll) {
  const { pr, next, info } = passSummary();
  $('passSeason').textContent = `Season ${SEASON.n}`;
  refreshSeasonText();
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
    <div class="art"><span>＋</span></div><div class="meta"><b>Open tier</b></div></div>`;
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
  if (mode === 'potato') return `one bomb, 3v3 ·${m.lanesLabel.split('·')[1]}`;
  if (mode === 'paint') return `paint the floor, 3v3 ·${m.lanesLabel.split('·')[1]}`;
  if (mode === 'raid') return `1 boss, 3 heroes ·${m.lanesLabel.split('·')[1]}`;
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
  renderBosses();
  showStage(MAPS.find(m => m.id === cfg.map) || MAPS[0], true);
}
// Boss Raid: pick which boss to fight, under the stage preview
function renderBosses() {
  const el = $('stgBoss');
  el.classList.toggle('hidden', mode !== 'raid');
  if (mode !== 'raid') return;
  const cur = bossOf(cfg.raidBoss), B = BOSS_LIST.find(b => b.id === cur);
  el.innerHTML = `<div class="sb-row">${BOSS_LIST.map(b => `<button class="${b.id === cur ? 'on' : ''}" data-boss="${b.id}" style="--bc:${hex(b.color)}"><span>${b.icon}</span><b>${b.name.replace(/^The /, '')}</b></button>`).join('')}</div>
    <p class="sb-desc"><b>${B.name}</b>, ${B.title}. ${B.blurb}</p>`;
  el.onclick = e => { const b = e.target.closest('[data-boss]'); if (!b) return; cfg.raidBoss = b.dataset.boss; save(); api?.blip?.(620); renderBosses(); };
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

// ---------- Story: a mission for every hero ----------
// The selected mission fills the screen over its map's artwork; the rail on the right lists
// every mission (filterable), with arrow keys / W-S to step through and Enter to begin.
let storyPick = null, storyFilter = 'all', styBgT = 0;
const MAP_NAME = id => MAPS.find(m => m.id === id)?.name || id;
const STY_FILTERS = [['all', 'All'], ['todo', 'To play'], ['done', 'Cleared'], ['gold', 'Gold'], ['locked', 'Locked']];
const styState = m => !heroOwned(m.hero) ? 'locked' : storyDone(m.hero) ? 'done' : 'todo';
const styShown = () => storyMissions().filter(m => storyFilter === 'all' || (storyFilter === 'gold' ? medalOf(m.hero) >= 3 : styState(m) === storyFilter));
function enterStory() {
  const list = storyMissions();
  storyPick = list.find(m => m.hero === storyPick) ? storyPick : (list.find(m => heroOwned(m.hero) && !storyDone(m.hero)) || list[0]).hero;
  const n = storyCount(), g = medalCount(3), s = medalCount(2), b = medalCount(1);
  $('styCount').textContent = `${n} of ${list.length} complete`;
  $('styProg').innerHTML = `<div class="sp-ring" style="--p:${(n / list.length * 100).toFixed(1)}"><b>${Math.round(n / list.length * 100)}%</b></div>
    <div class="sp-tx"><b>${n}<small>/${list.length}</small> stories told</b><span><i>🥇 ${g}</i><i>🥈 ${s - g}</i><i>🥉 ${b - s}</i></span></div>`;
  const count = f => list.filter(m => f === 'all' || (f === 'gold' ? medalOf(m.hero) >= 3 : styState(m) === f)).length;
  $('styFilter').innerHTML = STY_FILTERS.map(([k, l]) => `<button data-f="${k}" class="${storyFilter === k ? 'on' : ''}">${l}<i>${count(k)}</i></button>`).join('');
  $('styFilter').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; storyFilter = b.dataset.f; api?.blip?.(700); enterStory(); };
  renderStoryList();
  showMission();
}
function renderStoryList() {
  const all = storyMissions(), list = styShown();
  $('styGrid').innerHTML = list.length ? list.map(m => {
    const h = HEROES.find(x => x.id === m.hero), st = styState(m), md = medalOf(m.hero), no = all.indexOf(m) + 1;
    return `<button class="sty-row ${st} ${m.hero === storyPick ? 'on' : ''}" data-story="${m.hero}" style="--hc:${hex(h.color)}">
      <span class="no">${String(no).padStart(2, '0')}</span>
      <span class="pic"><img alt="" data-sty="${h.id}"></span>
      <span class="tx"><small>${h.callsign}</small><b>${m.title}</b><em>${m.stages.map(k => TYPE_ICON[k.type]).join('<i>›</i>')}</em></span>
      <span class="st">${st === 'locked' ? '🔒' : md ? MEDAL_ICON[md] : '<u>NEW</u>'}</span></button>`;
  }).join('') : `<p class="sty-none">No missions here yet.</p>`;
  $('styGrid').querySelectorAll('img[data-sty]').forEach((img, k) => setTimeout(() => { img.src = headshot(dressed(HEROES.find(x => x.id === img.dataset.sty))); }, 20 + k * 30));
  $('styGrid').onclick = e => { const c = e.target.closest('[data-story]'); if (c) pickStory(c.dataset.story); };
}
function pickStory(id, scroll) {
  if (id === storyPick) return;
  storyPick = id; api?.blip?.(620);
  for (const el of $('styGrid').children) el.classList.toggle('on', el.dataset.story === storyPick);
  if (scroll) $('styGrid').querySelector('.on')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  showMission();
}
function stepStory(d) {
  const list = styShown(); if (!list.length) return;
  const i = list.findIndex(m => m.hero === storyPick);
  pickStory(list[((i < 0 ? 0 : i + d) + list.length) % list.length].hero, true);
}
// the map behind the mission: rendered once per map, after the cursor settles
function storyBackdrop(m) {
  const img = $('styBgImg'), map = MAPS.find(x => x.id === m.map);
  clearTimeout(styBgT);
  if (!map) { img.classList.remove('in'); return; }
  if (img.dataset.map === map.id) return;
  img.classList.remove('in');
  styBgT = setTimeout(() => {
    if (storyMissions().find(x => x.hero === storyPick)?.map !== map.id) return;
    img.onload = () => img.classList.add('in');
    img.dataset.map = map.id; img.src = mapArt(map, 1280, 720);
  }, 240);
}
function showMission() {
  const all = storyMissions(), m = all.find(x => x.hero === storyPick); if (!m) return;
  const h = HEROES.find(x => x.id === m.hero), own = heroOwned(m.hero), done = storyDone(m.hero), md = medalOf(m.hero), no = all.indexOf(m) + 1;
  const el = $('styDetail');
  $('scr-story').style.setProperty('--hc', hex(h.color));
  storyBackdrop(m);
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  el.innerHTML = `
    <div class="sm-bd">
      <div class="sm-ch"><b>Chapter ${String(no).padStart(2, '0')}</b><span>${h.name}</span><span>📍 ${MAP_NAME(m.map)}</span></div>
      <h3>${m.title}</h3>
      <div class="sm-panels">${m.intro.map((p, j) => `<p style="--d:${0.08 + j * 0.09}s">${p}</p>`).join('')}</div>
      <div class="sm-route">${m.stages.map((k, j) => `<div class="sm-stop"><i>${TYPE_ICON[k.type]}</i><span><small>Part ${j + 1}${k.title ? ` · ${k.title}` : ''}</small>${GOAL[k.type](k)}</span></div>`).join('<div class="sm-link"></div>')}
        <div class="sm-link"></div><div class="sm-stop end ${done ? 'got' : ''}"><i>${done ? '🏆' : '🏁'}</i><span><small>${done ? 'Cleared' : 'Reward'}</small>${done ? 'Story complete' : 'First clear: +1 token'}</span></div></div>
      ${done ? `<div class="sm-ending"><small>How it ended</small>${m.outro}</div>` : ''}
      <div class="sm-medals">${[1, 2, 3].map(n => `<span class="${md >= n ? 'got' : ''}"><i>${MEDAL_ICON[n]}</i><b>${MEDALS[n]}</b><small>${n === 1 ? 'Finish the mission' : n === 2 ? '1 knockout or fewer' : `No knockouts, under ${fmtTime(parOf(m))}`}</small></span>`).join('')}</div>
      <div class="sm-foot">
        ${bestTime(m.hero) ? `<div class="sm-best"><small>Best time</small><b>${fmtTime(bestTime(m.hero))}</b>${md < 3 ? '<em>First gold: +1 token</em>' : ''}</div>` : ''}
        <button class="sty-go" id="styGo" ${own ? '' : 'disabled'}>${own ? (done ? 'Play again ▸' : 'Begin mission ▸') : `🔒 ${lockLong(h.id)}`}</button>
      </div>
    </div>`;
  $('styGo').onclick = () => {
    if (!own) return;
    api?.blip?.(880);
    cfg.storyId = m.hero; cfg.hero = m.hero; save();
    $('front').classList.add('hidden');
    api.onStart('story');
  };
}
// ---------- settings ----------
const SCHEMA = [
  { id: 'game', group: 'Gameplay', icon: '🎮', blurb: 'How matches feel', items: [
    { key: 'diff', label: 'Bot difficulty', hint: 'How sharp the bots aim and react', type: 'choice', options: Object.entries(DIFFICULTY).map(([k, d]) => [k, d.label]) },
    { key: 'dmgNumbers', label: 'Floating damage numbers', hint: 'Numbers pop off whatever you hit', type: 'toggle' },
    { key: 'voiceLines', label: 'Hero voice lines', hint: 'Quips on kills, abilities and spawns', type: 'toggle' },
    { key: 'idleReload', label: 'Reload when idle', hint: 'Tops up a part-empty magazine after a moment without shooting', type: 'toggle' },
    { key: 'objPins', label: 'Objective marker', hint: 'Pins the current objective, even when it’s off-screen', type: 'toggle' },
    { key: 'hitStop', label: 'Elimination hit-stop', hint: 'A split-second slow-down when you get a kill (offline)', type: 'toggle' },
    { key: 'killIcons', label: 'Kill and assist icons', hint: 'A skull where your eliminations go down, and a badge for assists', type: 'toggle' },
    { key: 'outlines', label: 'Enemy outlines', hint: 'A red rim on enemies, and see-through for a moment after they hit you', type: 'toggle' },
  ] },
  { id: 'controls', group: 'Controls', icon: '🖱️', blurb: 'Mouse and aiming', items: [
    { key: 'sens', label: 'Mouse sensitivity', hint: 'How far the camera turns per mouse move', type: 'range', min: 0.3, max: 3, step: 0.05, fmt: v => v.toFixed(2) },
    { key: 'invertY', label: 'Invert mouse Y', hint: 'Push the mouse forward to look down', type: 'toggle' },
  ] },
  { id: 'crosshair', group: 'Crosshair', icon: '🎯', blurb: 'Shape, colour and size', items: [
    { type: 'preview', key: 'xh', label: 'Preview', hint: 'How it looks in a match' },
    { key: 'xhStyle', label: 'Style', hint: 'The shape of the crosshair', type: 'choice', options: XH_STYLES },
    { key: 'xhColor', label: 'Colour', hint: 'Pick one that stands out on every map', type: 'choice', options: XH_COLORS },
    { key: 'xhSize', label: 'Size', hint: 'How big it is overall', type: 'range', min: 0.5, max: 2, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
    { key: 'xhThick', label: 'Thickness', hint: 'How thick the lines are', type: 'range', min: 1, max: 5, step: 0.5, fmt: v => v.toFixed(1) },
    { key: 'xhGap', label: 'Centre gap', hint: 'Space between the lines in the middle', type: 'range', min: 0, max: 8, step: 0.5, fmt: v => v.toFixed(1) },
    { key: 'xhAlpha', label: 'Opacity', hint: 'Lower lets you see through it', type: 'range', min: 0.3, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
    { key: 'xhDot', label: 'Centre dot', hint: 'A dot in the middle of any style', type: 'toggle' },
    { key: 'xhOutline', label: 'Dark outline', hint: 'Keeps it readable on bright backgrounds', type: 'toggle' },
  ] },
  { id: 'video', group: 'Video', icon: '🖥️', blurb: 'Looks and performance', items: [
    { key: 'fov', label: 'Field of view', hint: 'Wider shows more around you', type: 'range', min: 70, max: 110, step: 1, fmt: v => v + '°' },
    { key: 'quality', label: 'Render quality', hint: 'Lower runs smoother, higher looks sharper', type: 'choice', options: Object.entries(QUALITY).map(([k, q]) => [k, q.label]) },
    { key: 'shadows', label: 'Shadows', hint: 'Soft shadows under heroes and props', type: 'toggle' },
    { key: 'screenShake', label: 'Screen shake', hint: 'Shakes on blasts, slams and big hits', type: 'toggle' },
    { key: 'speedLines', label: 'Speed lines', hint: 'Streaks at the edges when sprinting, dashing or flung', type: 'toggle' },
    { key: 'deathFade', label: 'Death colour fade', hint: 'The world turns grey while you wait to respawn', type: 'toggle' },
    { key: 'perf', label: 'Performance overlay', hint: 'Frame rate in the corner (also F3)', type: 'toggle' },
  ] },
  { id: 'audio', group: 'Audio', icon: '🔊', blurb: 'Volume levels', items: [
    { key: 'volume', label: 'Master volume', hint: 'Everything at once', type: 'range', min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
    { key: 'music', label: 'Music', hint: 'Menu and stage soundtracks', type: 'range', min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
    { key: 'sfx', label: 'Sound effects', hint: 'Shots, abilities and hits', type: 'range', min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
  ] },
  { id: 'keys', group: 'Controls', icon: '⌨️', blurb: 'Change any key', items: [] },
];
let setTab = 'game', savedT = 0, resetArm = 0, capturing = null;     // capturing: the action waiting for a new key
const rangeFill = (it, v) => ((v - it.min) / (it.max - it.min) * 100).toFixed(1) + '%';

function renderSettings() {
  $('setNav').innerHTML = SCHEMA.map(s => `<button class="${s.id === setTab ? 'on' : ''}" data-stab="${s.id}"><i>${s.icon}</i><span><b>${s.group}</b><small>${s.blurb}</small></span></button>`).join('');
  const s = SCHEMA.find(x => x.id === setTab);
  const row = it => {
    const v = cfg[it.key], lab = `<div class="sr-l"><b>${it.label}</b><small>${it.hint}</small></div>`;
    if (it.type === 'preview') return `<div class="srow xh-row">${lab}<div class="xh-prev" id="xhPrev"></div></div>`;
    if (it.type === 'toggle') return `<div class="srow">${lab}<button class="tog ${v ? 'on' : ''}" data-key="${it.key}" data-type="toggle" aria-pressed="${!!v}"><i></i><em>${v ? 'On' : 'Off'}</em></button></div>`;
    if (it.type === 'choice') return `<div class="srow">${lab}<div class="seg">${it.options.map(([k, l]) => `<button class="${v === k ? 'on' : ''}" data-key="${it.key}" data-type="choice" data-val="${k}">${l}</button>`).join('')}</div></div>`;
    return `<div class="srow">${lab}<div class="rng"><input type="range" data-key="${it.key}" min="${it.min}" max="${it.max}" step="${it.step}" value="${v}" style="--p:${rangeFill(it, +v)}"><output>${it.fmt(+v)}</output></div></div>`;
  };
  $('setGrid').innerHTML = `<h3><i>${s.icon}</i>${s.group}</h3>` + (s.id === 'keys'
    ? `<p class="kb-hint">Click a key, then press the new one. Esc cancels. Taking a key another action uses swaps the two.</p>
      <div class="kbgrid">${ACTIONS.map(a => `<div class="kbrow"><span>${a.label}</span><button data-bind="${a.id}" class="${capturing === a.id ? 'cap' : kb(a.id) !== a.def ? 'changed' : ''}">${capturing === a.id ? 'Press a key…' : keyLabel(kb(a.id))}</button></div>`).join('')}
        ${FIXED.map(([k, l]) => `<div class="kbrow fixed"><span>${l}</span><kbd>${k}</kbd></div>`).join('')}</div>
      <button class="ghost kb-reset" data-bindreset>↺ Reset keys</button>`
    : `<div class="srows">${s.items.map(row).join('')}</div>`);
  applyCrosshair($("xhPrev"));
}
function setSetting(key, val) {
  cfg[key] = val; save();
  api?.onSettings?.(key);
  if (key.startsWith("xh")) applyCrosshair($("xhPrev"));
  const el = $('setSaved'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  clearTimeout(savedT); savedT = setTimeout(() => el.classList.remove('flash'), 1200);
}
export function openSettings() {
  settingsOpen = true; renderSettings();
  $('settings').classList.remove('hidden');
}
function closeSettings() {
  settingsOpen = false; capturing = null; $('settings').classList.add('hidden');
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
  $('modePotato').onclick = () => { setMode('potato'); go('roster'); };
  $('modeRaid').onclick = () => { setMode('raid'); go('roster'); };
  $('modePaint').onclick = () => { setMode('paint'); go('roster'); };
  $('modeStory').onclick = () => { api?.blip?.(760); go('story'); };
  // How to play: the ? on each mode button (it opens the card instead of starting the mode), and the buttons on the hero, stage and story screens
  document.querySelector('.m2-modes').addEventListener('click', e => { const q = e.target.closest('[data-how]'); if (!q) return; e.stopPropagation(); e.preventDefault(); api?.blip?.(700); openHowTo(q.dataset.how); }, true);
  document.querySelectorAll('[data-howto]').forEach(b => { b.onclick = () => { api?.blip?.(700); openHowTo(b.dataset.howto || mode); }; });
  $('modeOnline').onclick = () => go('online');
  $('modeAccount').onclick = () => { api?.blip?.(760); openHub(); };
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
  // every shelf scrolls sideways: let a normal mouse wheel do that too
  $('tiles').addEventListener('wheel', e => {
    const row = e.target.closest('.hs-row'), step = row && row.clientWidth / (sort === 'role' ? 5 : 9);
    if (!row || row.scrollWidth <= row.clientWidth + 1 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault(); row.scrollBy({ left: e.deltaY > 0 ? step : -step, behavior: 'smooth' });
  }, { passive: false });
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
  $('hsPractice').onclick = () => { api?.blip?.(760); $('front').classList.add('hidden'); api.onPractice(viewId); };
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
    const bd = e.target.closest('[data-bind]');
    if (bd) { capturing = capturing === bd.dataset.bind ? null : bd.dataset.bind; api?.blip?.(640); renderSettings(); return; }
    if (e.target.closest('[data-bindreset]')) { resetBinds(); capturing = null; api?.blip?.(420); renderSettings(); return; }
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
    if (settingsOpen && capturing) {                // waiting for a new key: this press is it
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.code !== 'Escape' && !rebind(capturing, e.code)) { api?.blip?.(160); return; }
      capturing = null; api?.blip?.(880); renderSettings(); return;
    }
    if (settingsOpen && e.code === 'Escape') { closeSettings(); return; }
    if ($('front').classList.contains('hidden') || settingsOpen) return;
    if (screen === 'roster') {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') stepHero(1);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') stepHero(-1);
      if (e.code === 'Enter') $('lockIn').click();
      if (e.code === 'Escape') go('main');
    } else if (screen === 'story') {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); stepStory(1); }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); stepStory(-1); }
      if (e.code === 'Enter') $('styGo')?.click();
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
    else if (screen === 'story' && e.code === 'Escape') go('main');
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
