import { LOOK, applyEnvironment } from './stage.js';
import { masteryOf } from './mastery.js';
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { HEROES } from './heroes.js';
import { MAPS, DIFFICULTY } from './data.js';
import { THEMES } from './scenery.js';
import { buildHeroModel } from './models.js';
import { cfg, save, resetSettings, QUALITY } from './settings.js';
import { splash, headshot, mapArt } from './portraits.js';
import { initOnline, enterOnline } from './online.js';
import { SEASON, TRACK, MAX_TIER, passXp, tierProgress, heroOwned, heroTier, skinOwned, skinTier, skinsFor, dressed, equip, rewardInfo,
  COS_TYPES, cosById, cosOwned, equippedCos, equipCos, cosArt } from './pass.js';

// Front end: main menu → roster select → stage select → match. Settings overlay on top.

const $ = id => document.getElementById(id);
const hex = c => '#' + c.toString(16).padStart(6, '0');
let api = null, screen = 'main', settingsOpen = false, mode = 'lane';
const MODE_NAME = { lane: 'Lane Breaker', survivor: 'Survivor', hill: 'Hill Rush', online: 'Online' };
function setMode(m) {
  mode = m;
  $('rosterMode').textContent = MODE_NAME[m];
  $('stageMode').textContent = MODE_NAME[m];
  $('lockIn').classList.toggle('surv', m === 'survivor');
  $('lockIn').classList.toggle('hill', m === 'hill');
  $('lockIn').querySelector('small').textContent = m === 'survivor' ? 'Drop in as' : 'Lock in';
}

// ---------- main menu showcase (3D lineup behind the title) ----------
const show = { scene: null, cam: null, heroes: [], t: 0, featured: 0, featureT: 0 };
function buildShowcase() {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0xffe6c4);
  sc.fog = new THREE.Fog(0xffe6c4, 18, 46);
  sc.add(new THREE.HemisphereLight(0xfff6ea, 0xe0b48a, 1.8));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.4); sun.position.set(-6, 12, -8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); sun.shadow.camera.updateProjectionMatrix();
  sc.add(sun);
  // stage: striped disc, a sun behind
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d');
  for (let i = 0; i < 24; i++) { g.fillStyle = i % 2 ? '#ffd36b' : '#ffe9b0'; g.beginPath(); g.moveTo(256, 256); g.arc(256, 256, 256, i / 24 * Math.PI * 2, (i + 1) / 24 * Math.PI * 2); g.fill(); }
  g.fillStyle = '#ff5a36'; g.beginPath(); g.arc(256, 256, 70, 0, 7); g.fill();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshLambertMaterial({ map: tex }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(9.1, 9.4, 0.5, 64), new THREE.MeshLambertMaterial({ color: 0x1d2340 }));
  rim.position.y = -0.26; sc.add(rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0xf6d9b0 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; sc.add(ground);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshBasicMaterial({ color: 0xff8a5c, fog: false }));
  sunDisc.position.set(-4, 6, 26); sunDisc.rotation.y = Math.PI; sc.add(sunDisc);
  show.heroes = HEROES.map((d, i) => {
    const m = buildHeroModel(d, i % 2 ? 0xff5a36 : 0x2f5bff);
    const a = Math.PI * (0.18 + (i / (HEROES.length - 1)) * 0.64);
    m.root.position.set(Math.cos(a) * 5.6, 0, Math.sin(a) * 3 - 1);
    m.root.rotation.y = -m.root.position.x * 0.07;   // models face -z, toward the camera
    m.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    m.base = m.root.rotation.y; m.phase = i * 0.7;
    sc.add(m.root);
    return m;
  });
  show.cam = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  show.scene = sc;
}

function frameShowcase(renderer, dt) {
  if (!show.scene) { buildShowcase(); show.scene.userData.look = { ...LOOK.plaza, env: 0.6 }; applyEnvironment(renderer, show.scene); }
  show.t += dt;
  show.featureT -= dt;
  if (show.featureT <= 0) { show.featureT = 2.4; show.featured = (show.featured + 1) % show.heroes.length; }
  show.heroes.forEach((m, i) => {
    m.anim(dt, 0, show.t + m.phase);
    const f = i === show.featured;
    m.hop = (m.hop || 0) + ((f ? 1 : 0) - (m.hop || 0)) * Math.min(1, dt * 5);
    m.root.position.y = Math.abs(Math.sin(show.t * 6)) * 0.25 * m.hop;
    m.root.rotation.y = m.base + Math.sin(show.t * 0.8 + m.phase) * 0.15 + m.hop * Math.sin(show.t * 3) * 0.3;
    // the featured hero raises the weapon skyward; the rest keep their grip from anim()
    if (m.hop > 0.02) m.arms[0].rotation.x += (-2.4 - m.arms[0].rotation.x) * m.hop;
  });
  const w = innerWidth, h = innerHeight;
  show.cam.aspect = w / h; show.cam.updateProjectionMatrix();
  const a = Math.sin(show.t * 0.12) * 0.25;
  const off = w > 900 ? 3.4 : 0;                        // camera looks along +z, so +x shifts the lineup right on screen
  show.cam.position.set(off + Math.sin(a) * 15, 4.2, -15 + Math.cos(a) * 1.5);
  show.cam.lookAt(off + 0.6, 1.5, 1);
  renderer.render(show.scene, show.cam);
}

// ---------- screens ----------
function go(name) {
  screen = name;
  for (const s of ['main', 'roster', 'stage', 'pass', 'online']) $('scr-' + s).classList.toggle('on', s === name);
  $('front').classList.remove('hidden');
  if (name === 'main') { refreshPassCard(); $('modeTut')?.classList.toggle('fresh', !cfg.tutorialDone); }
  if (name === 'roster') enterRoster();
  if (name === 'stage') enterStage();
  if (name === 'pass') enterPass();
  if (name === 'online') enterOnline();
}

// ---------- roster ----------
const STAT = h => [
  ['Health', h.hp / 260], ['Speed', h.speed / 8.4],
  ['Range', h.prefRange / 28], ['Burst', Math.min(1, (h.weapon.dmg * (h.weapon.pellets || 1)) / (h.weapon.rate * 110))],
];
// The tile strip is a looping carousel: 8 slots visible, the selected hero sits in slot 4,
// and every step rotates the ring by one tile.
const VIS = 8, LEFT = 3;
let viewId = null, infoTab = 'kit';
function enterRoster() {
  const tiles = $('tiles');
  if (!tiles.children.length) {
    tiles.innerHTML = HEROES.map((h, i) => `
      <button class="tile" data-hero="${h.id}" style="--hc:${hex(h.color)}" title="${h.callsign} · ${h.role}">
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <img alt="">
        <b>${h.callsign}</b>
      </button>`).join('');
    // headshots render one per frame so the screen appears immediately
    HEROES.forEach((h, i) => setTimeout(() => refreshTile(h.id), 30 + i * 40));
    new ResizeObserver(() => layoutCarousel(0, true)).observe(tiles);
  }
  for (const h of HEROES) refreshTileLock(h.id);
  const start = heroOwned(cfg.hero) ? cfg.hero : HEROES[0].id;
  viewId = null;
  pickHero(start, true);
}
const tileOf = id => $('tiles').querySelector(`[data-hero="${id}"]`);
function refreshTile(id) {
  const h = HEROES.find(x => x.id === id), t = tileOf(id);
  t.querySelector('img').src = headshot(dressed(h));
  t.style.setProperty('--hc', hex(dressed(h).color));
}
function refreshTileLock(id) {
  const t = tileOf(id), own = heroOwned(id);
  t.classList.toggle('locked', !own);
  t.querySelector('.lock')?.remove(); t.querySelector('.newb')?.remove();
  if (!own) t.insertAdjacentHTML('beforeend', `<span class="lock">🔒 T${heroTier(id)}</span>`);
  else if (heroTier(id)) t.insertAdjacentHTML('beforeend', '<span class="newb">NEW</span>');
  // mastery: level badge, gold and diamond frames
  const m = masteryOf(id);
  t.querySelector('.mst')?.remove();
  if (own) t.insertAdjacentHTML('beforeend', `<span class="mst" style="--mc:${m.rank.color}" title="${m.rank.name} mastery · level ${m.level}">${m.level}</span>`);
  t.classList.toggle('m-gold', own && m.level >= 7 && m.level < 10); t.classList.toggle('m-diamond', own && m.level >= 10);
}

function layoutCarousel(dir, instant) {
  const tiles = $('tiles'), N = HEROES.length;
  const sel = Math.max(0, HEROES.findIndex(h => h.id === viewId));
  const slot = tiles.clientWidth / VIS, tw = Math.max(60, slot - 10);
  tiles.style.setProperty('--tw', tw + 'px');
  const xf = k => {
    const c = k + LEFT - (VIS - 1) / 2;                 // distance from the middle of the strip
    return `translateX(${(k + LEFT) * slot + 5}px) translateZ(${-Math.abs(c) * 14}px) rotateY(${c * -5}deg)` + (k === 0 ? ' translateY(-12px)' : '');
  };
  HEROES.forEach((h, i) => {
    const t = tileOf(h.id);
    let k = ((i - sel) % N + N) % N; if (k >= N - LEFT) k -= N;      // -LEFT .. N-1-LEFT
    const vis = k >= -LEFT && k <= VIS - 1 - LEFT;
    const place = (kk, op, anim) => { t.style.transition = anim ? '' : 'none'; t.style.transform = xf(kk); t.style.opacity = op; };
    if (instant || t._k == null) place(k, vis ? 1 : 0, false);
    else if (vis && t._vis) place(k, 1, true);
    else if (vis) { place(dir > 0 ? VIS - LEFT : -LEFT - 1, 0, false); void t.offsetWidth; place(k, 1, true); }   // slides in from the edge
    else if (t._vis) place(dir > 0 ? -LEFT - 1 : VIS - LEFT, 0, true);                                            // slides out the other side
    else place(k, 0, false);
    t._k = k; t._vis = vis;
    t.style.pointerEvents = vis ? '' : 'none';
    t.classList.toggle('sel', k === 0);
  });
}
function stepHero(d) {
  const N = HEROES.length, i = HEROES.findIndex(h => h.id === viewId);
  pickHero(HEROES[(i + d + N) % N].id, false, d);
}

function pickHero(id, instant, dir) {
  const h = HEROES.find(x => x.id === id) || HEROES[0];
  const N = HEROES.length, from = HEROES.findIndex(x => x.id === viewId);
  if (dir == null && from >= 0) { const d = ((HEROES.indexOf(h) - from) % N + N) % N; dir = d <= N / 2 ? 1 : -1; }
  viewId = h.id;
  const own = heroOwned(h.id);
  if (own) { cfg.hero = h.id; save(); }
  layoutCarousel(dir || 1, instant && from < 0);
  showHero(h, instant);
  api?.blip?.(520 + HEROES.indexOf(h) * 30);
}

function showHero(h, instant) {
  const d = dressed(h), own = heroOwned(h.id);
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
  const skins = skinsFor(h.id);
  const cur = d.skinId || null;
  const ownedSkins = skins.filter(s => own && skinOwned(s.id)).length;
  const tab = (id, label) => `<button class="${infoTab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`;
  const pane = id => `data-pane="${id}" class="${infoTab === id ? 'on' : ''}"`;
  $('info').innerHTML = `
    <header class="ih">
      <div class="ihname">
        <div class="chip ${own ? '' : 'pass'}">${own ? h.role : `🔒 Season pass · tier ${heroTier(h.id)}`}</div>
        <h2>${h.callsign}</h2>
        <div class="who" title="${h.name} · ${h.title}">${h.name} <span>·</span> ${h.title}</div>
        ${own ? (() => { const m = masteryOf(h.id); return `<div class="mline" style="--mc:${m.rank.color}" title="${m.xp} mastery XP">
          <b>${m.rank.name} · Lv ${m.level}</b><i><em style="width:${Math.round(m.frac * 100)}%"></em></i><small>${m.max ? 'Mastered' : `${m.into}/${m.need}`}</small></div>`; })() : ''}
      </div>
      <div class="statbars">${STAT(h).map(([k, v]) => `<div><span>${k}</span><i><em style="width:${Math.round(Math.min(1, v) * 100)}%"></em></i></div>`).join('')}</div>
    </header>
    <nav class="itabs">${tab('kit', 'Abilities')}${tab('story', 'Story')}${tab('skins', `Skins <i>${ownedSkins + 1}/${skins.length + 1}</i>`)}</nav>
    <div class="ibody">
      <section ${pane('kit')}>
        <ul class="kit">
          <li><kbd>LMB</kbd><div><b>${h.weapon.name}</b><small>${h.weapon.desc}</small></div></li>
          <li><kbd>Q</kbd><div><b>${h.q.name}</b><small>${h.q.desc}</small></div></li>
          <li><kbd>E</kbd><div><b>${h.ability.name}</b><small>${h.ability.desc}</small></div></li>
          <li class="ult"><kbd>F</kbd><div><b>${h.ult.name}</b><small>${h.ult.desc}</small></div></li>
        </ul>
      </section>
      <section ${pane('story')}>
        <blockquote>“${h.quote}”</blockquote>
        <p>${h.bio}</p>
      </section>
      <section ${pane('skins')}>
        <div class="skins">
          <button class="sk ${cur ? '' : 'on'}" data-skin="" style="--a:${hex(h.palette.main)};--b:${hex(h.palette.trim)}"><i></i><span>Classic</span></button>
          ${skins.map(s => { const ok = own && skinOwned(s.id); return `<button class="sk ${cur === s.id ? 'on' : ''} ${ok ? '' : 'locked'}" data-skin="${s.id}" title="${ok ? s.name : 'Season pass tier ' + skinTier(s.id)}"
            style="--a:${hex(s.palette.main)};--b:${hex(s.palette.trim)}"><i></i><span>${s.name}</span>${ok ? '' : `<em>🔒 T${skinTier(s.id)}</em>`}</button>`; }).join('')}
        </div>
      </section>
    </div>`;
  $('info').classList.remove('in'); void $('info').offsetWidth; $('info').classList.add('in');
  $('lockName').textContent = own ? h.callsign : 'Locked';
  $('lockIn').classList.toggle('locked', !own);
  $('lockIn').querySelector('small').textContent = !own ? `Reach tier ${heroTier(h.id)}` : mode === 'survivor' ? 'Drop in as' : 'Lock in';
}

function pickSkin(skinId) {
  const h = HEROES.find(x => x.id === viewId);
  if (!heroOwned(h.id) || (skinId && !skinOwned(skinId))) { api?.blip?.(160); return; }
  equip(h.id, skinId || null);
  refreshTile(h.id);
  showHero(h, false);
  api?.blip?.(skinId ? 900 : 700);
}

// ---------- season pass ----------
function passSummary() {
  const pr = tierProgress(), next = TRACK.find(r => r.tier === pr.tier + 1);
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
  tr.innerHTML = tiers.map((list, t) => `<div class="tcol" style="animation-delay:${t * 0.02}s">${list.map(([r, i], k) => card(r, i, k > 0)).join('')}</div>`).join('');
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
function enterStage() {
  const h = dressed(HEROES.find(x => x.id === cfg.hero));
  $('stageHero').innerHTML = `<img src="${headshot(h)}" alt=""><span>Playing as <b>${h.callsign}</b></span>`;
  $('stageHero').style.setProperty('--hc', hex(h.color));
  const cols = $('cols');
  if (!cols.children.length) {
    cols.innerHTML = MAPS.map((m, i) => {
      const t = THEMES[m.theme];
      return `<button class="col" data-map="${m.id}" style="--ma:${hex(m.accent)};background-image:linear-gradient(180deg, ${hex(t.skyTop)}, ${hex(t.skyBottom)})">
        <div class="shot"></div>
        <div class="veil"></div>
        <div class="num">0${i + 1}</div>
        <div class="meta">
          <div class="chip">${m.lanesLabel}</div>
          <h3>${m.name}</h3>
          <p>${m.desc}</p>
          <span class="go">Deploy ▸</span>
        </div>
        <div class="loading">Surveying the area…</div>
      </button>`;
    }).join('');
    MAPS.forEach((m, i) => setTimeout(() => {
      const col = cols.children[i];
      col.querySelector('.shot').style.backgroundImage = `url(${mapArt(m)})`;
      col.classList.add('ready');
    }, 80 + i * 120));
  }
  for (const c of cols.children) c.classList.toggle('sel', c.dataset.map === cfg.map);
  // the same stages host Hill Rush; relabel the chip with how many spots the ring visits
  MAPS.forEach((m, i) => {
    const spots = new Set(m.hills.map(p => p.join())).size;
    cols.children[i].querySelector('.chip').textContent = mode === 'hill' ? `${spots} hill spot${spots > 1 ? 's' : ''} ·${m.lanesLabel.split('·')[1]}` : m.lanesLabel;
  });
}

// ---------- settings ----------
const SCHEMA = [
  { group: 'Gameplay', items: [
    { key: 'diff', label: 'Bot difficulty', type: 'choice', options: Object.entries(DIFFICULTY).map(([k, d]) => [k, d.label]) },
    { key: 'dmgNumbers', label: 'Floating damage numbers', type: 'toggle' },
    { key: 'voiceLines', label: 'Hero voice lines', type: 'toggle' },
  ] },
  { group: 'Controls', items: [
    { key: 'sens', label: 'Mouse sensitivity', type: 'range', min: 0.3, max: 3, step: 0.05, fmt: v => v.toFixed(2) },
    { key: 'invertY', label: 'Invert mouse Y', type: 'toggle' },
  ] },
  { group: 'Video', items: [
    { key: 'fov', label: 'Field of view', type: 'range', min: 70, max: 110, step: 1, fmt: v => v + '°' },
    { key: 'quality', label: 'Render quality', type: 'choice', options: Object.entries(QUALITY).map(([k, q]) => [k, q.label]) },
    { key: 'shadows', label: 'Shadows', type: 'toggle' },
    { key: 'screenShake', label: 'Screen shake', type: 'toggle' },
    { key: 'perf', label: 'Performance overlay (F3)', type: 'toggle' },
  ] },
  { group: 'Audio', items: [
    { key: 'volume', label: 'Master volume', type: 'range', min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
    { key: 'music', label: 'Music', type: 'range', min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
    { key: 'sfx', label: 'Sound effects', type: 'range', min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
  ] },
];
const KEYS = [['WASD', 'Move'], ['Mouse', 'Aim'], ['LMB', 'Fire'], ['Space', 'Jump'], ['Shift', 'Sprint'], ['Q', 'Ability 1'], ['E', 'Ability 2'], ['F', 'Ultimate'], ['R', 'Reload'], ['Tab', 'Scoreboard'], ['Esc', 'Pause']];

function renderSettings() {
  $('setGrid').innerHTML = SCHEMA.map(s => `
    <section><h4>${s.group}</h4>${s.items.map(it => {
      const v = cfg[it.key];
      if (it.type === 'toggle') return `<label class="srow"><span>${it.label}</span><button class="tog ${v ? 'on' : ''}" data-key="${it.key}" data-type="toggle"><i></i></button></label>`;
      if (it.type === 'choice') return `<div class="srow"><span>${it.label}</span><div class="seg">${it.options.map(([k, l]) => `<button class="${v === k ? 'on' : ''}" data-key="${it.key}" data-type="choice" data-val="${k}">${l}</button>`).join('')}</div></div>`;
      return `<label class="srow"><span>${it.label}</span><div class="rng"><input type="range" data-key="${it.key}" min="${it.min}" max="${it.max}" step="${it.step}" value="${v}"><output>${it.fmt(+v)}</output></div></label>`;
    }).join('')}</section>`).join('') + `
    <section class="keys"><h4>Controls</h4><div class="keygrid">${KEYS.map(([k, l]) => `<div><kbd>${k}</kbd>${l}</div>`).join('')}</div></section>`;
}
function setSetting(key, val) {
  cfg[key] = val; save();
  api?.onSettings?.(key);
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
  $('modeTut').onclick = () => { api?.blip?.(880); $('front').classList.add('hidden'); api.onStart('tutorial'); };
  $('modeTut').classList.toggle('fresh', !cfg.tutorialDone);
  $('modeOnline').onclick = () => go('online');
  initOnline({ go, screen: () => screen, blip: f => api?.blip?.(f), start: m => api.onStartOnline(m), pickHero: () => { setMode('online'); go('roster'); } });
  document.querySelectorAll('[data-open-settings]').forEach(b => { b.onclick = openSettings; });
  document.querySelectorAll('[data-back]').forEach(b => { b.onclick = () => go(b.dataset.back); });
  $('tiles').onclick = e => { const t = e.target.closest('.tile'); if (t) pickHero(t.dataset.hero); };
  $('carL').onclick = () => stepHero(-1);
  $('carR').onclick = () => stepHero(1);
  $('info').addEventListener('click', e => {
    const b = e.target.closest('.sk'); if (b) return pickSkin(b.dataset.skin);
    const t = e.target.closest('[data-tab]');
    if (t) {
      infoTab = t.dataset.tab;
      $('info').querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === t));
      $('info').querySelectorAll('[data-pane]').forEach(x => x.classList.toggle('on', x.dataset.pane === infoTab));
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
    const c = e.target.closest('.col'); if (!c) return;
    cfg.map = c.dataset.map; save();
    $('front').classList.add('hidden');
    api.onStart(mode);
  };
  $('cols').onmouseover = e => { const c = e.target.closest('.col'); if (c && !c.classList.contains('hov')) { for (const o of $('cols').children) o.classList.toggle('hov', o === c); api?.blip?.(300 + [...$('cols').children].indexOf(c) * 80); } };
  $('setGrid').addEventListener('click', e => {
    const b = e.target.closest('button[data-key]'); if (!b) return;
    e.preventDefault();
    if (b.dataset.type === 'toggle') setSetting(b.dataset.key, !cfg[b.dataset.key]);
    else setSetting(b.dataset.key, b.dataset.val);
    renderSettings();
  });
  $('setGrid').addEventListener('input', e => {
    const k = e.target.dataset.key; if (!k) return;
    const it = SCHEMA.flatMap(s => s.items).find(i => i.key === k);
    setSetting(k, +e.target.value);
    e.target.nextElementSibling.textContent = it.fmt(+e.target.value);
  });
  $('setDone').onclick = closeSettings;
  $('setReset').onclick = () => { resetSettings(); renderSettings(); ['quality', 'shadows', 'fov', 'volume', 'music', 'sfx'].forEach(k => api?.onSettings?.(k)); };
  addEventListener('keydown', e => {
    if (settingsOpen && e.code === 'Escape') { closeSettings(); return; }
    if ($('front').classList.contains('hidden') || settingsOpen) return;
    if (screen === 'roster') {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') stepHero(1);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') stepHero(-1);
      if (e.code === 'Enter') $('lockIn').click();
      if (e.code === 'Escape') go('main');
    } else if (screen === 'stage' && e.code === 'Escape') go('roster');
    else if (screen === 'pass' && e.code === 'Escape') go('main');
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
