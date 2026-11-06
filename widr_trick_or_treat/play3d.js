// per-frame 3D update, picking, and the title-screen preview
import { THREE, buildChar, animChar, emojiSprite, emojiMat, setEmoji, tagSprite, setTag, floatSprite } from './chars3d.js';
import { R, W3, renderer, scene, camera, hemiL, sun, lantern, overlay, gl, stage } from './world3d.js';

const SKY_DAY = '#ffcf9e', SKY_NIGHT = '#b9a3e8', SKY_DARK = '#3a2a5c';
const HAZ_SCALE = {zennith: 1.35};
const iceGeo = new THREE.BoxGeometry(40, 58, 40);
const iceMat = new THREE.MeshToonMaterial({color: '#bff3ff', transparent: true, opacity: 0.45});

R.resize = () => {
  const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
};

function syncSet(map, list, make) {
  const live = new Set(list);
  for (const [k, g] of map) if (!live.has(k)) { g.parent && g.parent.remove(g); map.delete(k); }
  for (const k of list) if (!map.has(k)) { const g = make(k); if (g) map.set(k, g); }
}

R.render = () => {
  const now = performance.now(), t = now / 1000, dt = Math.min(0.05, (now - W3.lastT) / 1000); W3.lastT = now;
  if (!S || !W3.world) { renderer.render(scene, camera); return; }
  const k = Math.min(1, S.min / 180), dark = S.darkUntil > S.min || S.blackUntil > S.min, world = W3.world;
  const fog = S.fogUntil > S.min, black = S.blackUntil > S.min;

  /* player */
  const pl = W3.player;
  animChar(pl, P.x, P.y, t, dt);
  pl.userData.model.scale.setScalar(S.robinPower ? 1.4 : 1.15);
  const top = pl.userData.top * pl.userData.model.scale.x;
  W3.playerCos.position.set(14, top + 2, 0); W3.playerTag.position.y = top + 20;
  pl.visible = !(now < S.ghostUntil && Math.floor(now / 90) % 2);
  W3.shieldRing.visible = S.shield > 0; W3.shieldRing.rotation.z = t * 2;
  W3.powerRing.visible = !!S.robinPower; W3.powerRing.scale.setScalar(1 + Math.sin(t * 8) * 0.06);

  /* friends */
  for (const f of S.friends) {
    const g = W3.actors.get(f); if (!g) continue;
    animChar(g, f.x, f.y, t, dt);
    setTag(g.userData.tag, f.met ? '✓ ' + f.ch.name : f.ch.name);
  }
  const goon = W3.actors.get('goon'); if (goon) { goon.userData.bob.position.y = 6 + Math.sin(t * 2) * 5; goon.userData.model.rotation.y = Math.sin(t * 0.7) * 0.8; }

  /* pests */
  syncSet(W3.pickMap.haz || (W3.pickMap.haz = new Map()), S.hazards.filter(h => h.type !== 'house'), h => {
    const g = buildChar(h.ch, HAZ_SCALE[h.type] || 1.1); g.position.set(h.x, 0, h.y);
    const tg = tagSprite(h.ch.name, 13); tg.position.y = g.userData.top * g.userData.scale + 14; g.add(tg); g.userData.tag = tg;
    const ice = new THREE.Mesh(iceGeo, iceMat); ice.position.y = 29; ice.visible = false; g.add(ice); g.userData.ice = ice;
    world.add(g); return g;
  });
  for (const [h, g] of W3.pickMap.haz) {
    const frozen = now < h.frozen;
    animChar(g, h.x, h.y, frozen ? 0 : t, dt, !frozen);
    g.userData.ice.visible = frozen;
    setTag(g.userData.tag, h.ch.name + (h.loot ? ` 🍬${h.loot}` : ''));
    if (h.type === 'reshman') g.userData.model.position.y = Math.sin(t * 3) * 2;
  }

  /* street candy */
  syncSet(W3.pickMap.cand || (W3.pickMap.cand = new Map()), S.pickups, p => { const s = emojiSprite(CANDY[p.t].e, 20); world.add(s); return s; });
  for (const [p, s] of W3.pickMap.cand) s.position.set(p.x, 12 + Math.sin(t * 3 + p.x) * 3, p.y);

  /* floating "+N" text */
  syncSet(W3.floatMap, S.floats, f => { const s = floatSprite(f.txt); world.add(s); return s; });
  for (const [f, s] of W3.floatMap) { const a = (now - f.t) / 1200; s.position.set(f.x, 70 + a * 50, f.y); s.material.opacity = 1 - a; }

  /* houses */
  const reveal = now < S.revealUntil;
  const awake = new Map(); S.hazards.forEach(z => { if (z.type === 'house') awake.set(z.house, z); });
  for (const [h, o] of W3.H3) {
    const aw = awake.get(h);
    if (aw) {
      // the house is up on its legs and hunting
      const frozen = now < aw.frozen, tt = frozen ? 0 : t;
      o.mon.visible = true;
      const step = Math.sin(tt * 9);
      o.group.position.set(aw.x, 34 + Math.abs(step) * 7, aw.y);
      const want = Math.atan2(P.x - aw.x, P.y - aw.y) - (o.front === 1 ? 0 : Math.PI);
      let diff = want - o.group.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (!frozen) o.group.rotation.y += diff * Math.min(1, dt * (aw.returning ? 2 : 5));
      o.group.rotation.z = frozen ? 0 : Math.sin(tt * 4.5) * 0.07;
      o.group.rotation.x = frozen ? 0 : Math.sin(tt * 9) * 0.03;
      o.legs.forEach((l, i) => l.rotation.x = step * 0.6 * (i % 2 ? 1 : -1) * (i > 1 ? -1 : 1));
      o.wins.forEach(w => w.material = W3.WIN_RED);
      setEmoji(o.sign, frozen ? '🧊' : aw.returning ? '😴' : '👹');
      o.sign.position.y = o.base + Math.sin(t * 6) * 5;
      o.glow.visible = false; if (o.label) o.label.visible = false;
      continue;
    }
    if (o.mon.visible) {
      o.mon.visible = false; o.group.position.set(o.home.x, 0, o.home.z); o.group.rotation.set(0, 0, 0);
      o.wins.forEach(w => w.material = o.dark ? W3.WIN_OFF : W3.WIN_ON);
    }
    const near = hero.id === 'josh' && Math.hypot(h.cx - P.x, h.door.y - P.y) < 240;
    setEmoji(o.sign, W3.signFor(h, reveal || near));
    o.sign.position.y = o.base + Math.sin(t * 2 + h.cx * 0.01) * 3;
    o.sign.material.opacity = h.done && h.kind !== 'home' ? 0.55 : 1;
    const avail = !h.done && h.kind !== 'dark';
    o.pk.material = avail ? W3.PUMPKIN_ON : W3.PUMPKIN_OFF;
    o.glow.visible = avail && h.kind !== 'home';
    o.glow.material.opacity = 0.35 + k * 0.65;
    if (o.label) o.label.visible = !(h.done && h.kind !== 'home');
  }
  W3.WIN_ON.emissiveIntensity = black ? 0 : 0.3 + k * 1.1;
  W3.lampGlows.forEach(g => g.material.opacity = black ? 0 : 0.2 + k * 0.8);
  W3.WIN_RED.emissiveIntensity = 1.2 + Math.sin(t * 10) * 0.6;

  /* Byte, UFO, blast */
  const byteOn = now < S.byteUntil && S.byte;
  W3.byteG.visible = !!byteOn; if (byteOn) animChar(W3.byteG, S.byte.x, S.byte.y, t, dt);
  const u = W3.ufoG; u.visible = !!S.ufo;
  if (S.ufo) {
    u.position.set(S.ufo.x, 0, S.ufo.y); u.userData.body.position.y = 62 + Math.sin(t * 2) * 5; u.userData.body.rotation.y = t * 0.6;
    u.userData.lights.forEach((l, i) => l.material.emissive.set((Math.floor(t * 4) + i) % 2 ? '#ffd23f' : '#ff3b5c'));
  }
  const bf = S.blastFx, br = W3.blastRing;
  if (bf && now - bf.t < 500) { const a = (now - bf.t) / 500; br.visible = true; br.position.set(bf.x, 3, bf.y); br.scale.setScalar(Math.max(1, bf.r * a)); br.material.opacity = 1 - a; }
  else br.visible = false;

  /* rain */
  const storm = S.stormUntil > S.min; W3.rain.visible = storm;
  if (storm) {
    const rp = W3.rainPos;
    for (let i = 0; i < 700; i++) { const o = i * 6 + 1; rp[o] -= 900 * dt; rp[o + 3] -= 900 * dt; if (rp[o] < 0) W3.resetDrop(i, false); }
    W3.rain.geometry.attributes.position.needsUpdate = true;
  }

  /* light and sky through the evening */
  const sky = dark ? new THREE.Color(SKY_DARK) : W3.lerpC(SKY_DAY, SKY_NIGHT, k);
  if (storm) sky.lerp(new THREE.Color('#9aa6c0'), 0.4);
  if (fog) sky.lerp(new THREE.Color('#c8b8e0'), 0.7);
  scene.background = sky; scene.fog.color.copy(sky);
  hemiL.color = W3.lerpC('#fff1dc', '#d3c4ff', k);
  hemiL.intensity = dark ? 0.22 : 1.15 - k * 0.35;
  sun.color = W3.lerpC('#ffb070', '#a898ff', k);
  sun.intensity = dark ? 0.08 : 1.7 - k * 0.9;
  const flash = storm && Math.sin(t * 1.7) > 0.985;
  if (flash) hemiL.intensity += 1.6;
  lantern.position.set(P.x, 60, P.y + 10);
  lantern.distance = dark ? (S.items.includes('flash') ? 330 : 220) : 240;
  lantern.intensity = dark ? 2.6 : 0.2 + k * 0.9;

  /* camera */
  W3.camT.lerp(new THREE.Vector3(P.x, 0, P.y), Math.min(1, dt * 6));
  const d = W3.camD * (camera.aspect < 1 ? 1.45 : 1);
  camera.position.set(W3.camT.x, d * 0.82, W3.camT.z + d * 0.6);
  camera.lookAt(W3.camT.x, 10, W3.camT.z - 20);
  if (now < S.shakeUntil) { const a = Math.min(1, (S.shakeUntil - now) / 600) * 9; camera.position.x += rnd(-a, a); camera.position.y += rnd(-a, a); }
  scene.fog.near = fog ? d * 0.55 : d * 1.1; scene.fog.far = fog ? d * 1.45 : d * 3.2;
  sun.position.set(W3.camT.x - 300, 700, W3.camT.z + 260); sun.target.position.copy(W3.camT);

  /* full-screen tints */
  let bg = 'transparent';
  if (S.flash && now - S.flash < 260) bg = `rgba(255,59,92,${0.3 * (1 - (now - S.flash) / 260)})`;
  else if (now < S.scrambleUntil) bg = 'rgba(8,102,255,.10)';
  else if (S.heart < 320) {
    const pulse = 0.5 + 0.5 * Math.sin(t * (14 - S.heart / 40)), a = (1 - S.heart / 320) * (0.35 + pulse * 0.3);
    bg = `radial-gradient(ellipse at center, rgba(255,0,40,0) 45%, rgba(200,0,40,${a.toFixed(3)}) 100%)`;
  }
  overlay.style.background = bg;

  renderer.render(scene, camera);
};

/* ---------- clicking in 3D ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
gl.addEventListener('pointerdown', e => {
  if (!S || S.over || S.modal || S.busy) return;
  const r = gl.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (S.ufo && W3.ufoG.visible && ray.intersectObjects(W3.ufoG.userData.pick, true).length) return worldClick(S.ufo.x, S.ufo.y, null, true);
  const hh = ray.intersectObjects(W3.houseMeshes, false)[0];
  if (hh) return worldClick(hh.object.userData.house.cx, hh.object.userData.house.door.y, hh.object.userData.house, false);
  if (ray.ray.intersectPlane(groundPlane, hitP)) worldClick(hitP.x, hitP.z, null, false);
});
gl.addEventListener('wheel', e => { e.preventDefault(); W3.camD = clamp(W3.camD * (e.deltaY > 0 ? 1.08 : 0.93), 340, 1150); }, {passive: false});

/* ---------- title-screen 3D preview ---------- */
const pv = {r: new THREE.WebGLRenderer({antialias: true, alpha: true}), scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(34, 1, 1, 1000), g: null};
pv.r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); pv.r.setSize(112, 112);
pv.r.domElement.className = 'pv3d';
pv.scene.add(new THREE.HemisphereLight('#fff6e8', '#c8a878', 1.4));
const pvSun = new THREE.DirectionalLight('#ffd0a0', 1.6); pvSun.position.set(60, 120, 120); pv.scene.add(pvSun);
R.setPreview = (ch, cos) => {
  const top = document.querySelector('#heroCard .top'); if (!top) return;
  const old = top.querySelector('canvas'); if (old && old !== pv.r.domElement) old.replaceWith(pv.r.domElement);
  if (pv.g) pv.scene.remove(pv.g);
  pv.g = buildChar(ch, 1); pv.scene.add(pv.g);
  const c = emojiSprite(cos.e, 18); c.position.set(15, pv.g.userData.top + 2, 0); pv.g.add(c);
  const h = pv.g.userData.top + 14;
  pv.cam.position.set(0, h * 0.62, h * 2.15); pv.cam.lookAt(0, h * 0.45, 0);
};
(function pvLoop() {
  if (pv.g && document.getElementById('title').classList.contains('show')) {
    const t = performance.now() / 1000;
    pv.g.userData.model.rotation.y = Math.sin(t * 0.9) * 0.9;
    pv.g.userData.walk = t * 9; pv.g.userData.movedAt = t;
    const ud = pv.g.userData;
    ud.legs.forEach((l, i) => l.rotation.x = Math.sin(ud.walk) * 0.5 * (i % 2 ? 1 : -1));
    ud.bob.position.y = (ud.hover ? 6 : 0) + Math.abs(Math.sin(ud.walk)) * 2;
    pv.r.render(pv.scene, pv.cam);
  }
  requestAnimationFrame(pvLoop);
})();

/* ---------- boot ---------- */
stage.insertBefore(gl, document.getElementById('hud'));
stage.insertBefore(overlay, document.getElementById('hud'));
document.getElementById('cv').style.display = 'none';
R.ready = true;
R.resize();
if (typeof selHero !== 'undefined') R.setPreview(selHero, selCostume);
if (S && !S.over) R.build();
