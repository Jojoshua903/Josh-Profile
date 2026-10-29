import { THREE, scene, toon, addOutline, V3, puff, damp, toast } from './core.js?v=sub1';
import { buildOtis } from './otis.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { play, shot, pan } from './cutscene.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { groundAt, ARENA } from './bos-terrain.js?v=sub1';
import { lamps, rocket, FLAGS, ghosts, LICHTJES, updateKnoppen, knopHook } from './bos-world.js?v=sub1';
import { boss } from './bos-boss.js?v=sub1';

export function setupStory(ctx) {
  const { P, drone, save, persist } = ctx;
  const BYTE = () => (ctx.LOOK.droneName || 'Byte').toUpperCase();
  const tr = (s) => `${ctx.LOOK.droneName || 'Byte'} vertaalt: “${s}”`;
  const WOEKER = V3(ARENA.x, 24, ARENA.z - 16);

  // ---------- Otis ----------
  const otis = buildOtis(groundAt);
  const OTIS_HOME = V3(9, 0, 47.5);
  otis.place(OTIS_HOME.x, OTIS_HOME.z);
  addSpeaker(otis.root, {
    y: 1.7, radius: 5, linger: 12,
    lines: ['Woef!', '*snuffelt aan een paddenstoel en niest*', `Woef woef.<small>${tr('Alles hier gloeit. Ook mijn neus, denk ik.')}</small>`, '*probeert een sporenwolkje te happen*', `Woef?<small>${tr('Druk op E bij de raket: dan kies je waar we heen vliegen.')}</small>`],
  });

  // ---------- fireflies ----------
  const flyMat = new THREE.MeshBasicMaterial({ color: 0xd8ff7a });
  const flies = [];
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), flyMat); scene.add(m);
    const area = [[0, 44, 18], [-48, 6, 14], [0, -16, 20], [50, 0, 10], [10, -70, 22]][i % 5];
    flies.push({ m, c: V3(area[0] + (Math.random() - 0.5) * area[2] * 2, 0, area[1] + (Math.random() - 0.5) * area[2] * 2), ph: Math.random() * 9 });
  }
  const waves = lamps.filter((l) => l.wave);

  // ---------- de zes lichtjes: light them all with Gloei before the first ones fade again ----------
  const LICHT_NAME = 'Alle lichtjes aan';
  const LIT_TIME = 30;
  const lantern = LICHTJES.map((p) => {
    const g = new THREE.Group(); g.position.copy(p); scene.add(g);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8), toon(0xe8dcc8)); st.position.y = 0.6; g.add(st);
    const mat = toon(0x3a3550);
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat); c.scale.y = 0.8; c.position.y = 1.15; addOutline(c, 1.06); g.add(c);
    const light = new THREE.PointLight(0x7af5ff, 0, 7, 2); light.position.y = 1.3; g.add(light);
    return { g, mat, light, t: 0 };
  });
  const lights = { done: !!save.lichtjes };
  if (lights.done) {
    lantern.forEach((l) => (l.t = 1e9));
    if (!save.got.includes(LICHT_NAME)) addCookie(4, 1.4, -18.5, LICHT_NAME);
  }
  function updateLanterns(dt) {
    let lit = 0;
    for (const l of lantern) {
      if (l.t > 0) l.t -= dt;
      if (!lights.done && P.ability === 'gloei' && l.t <= 0 && P.pos.distanceTo(l.g.position) < 2.4) {
        l.t = LIT_TIME; sfx.click(true); puff(l.g.position.clone().add(V3(0, 1.3, 0)), 10, 0x7af5ff, 3, 1);
        const n = lantern.filter((q) => q.t > 0).length;
        toast(n < 6 ? `Een lichtje gaat aan (${n}/6)` : 'Alle zes lichtjes branden!');
      }
      const k = l.t > 0 ? Math.min(1, l.t / 8) : 0;           // the last seconds it starts to dim
      l.mat.color.setHex(k ? 0x7af5ff : 0x3a3550); l.mat.emissive.setHex(k ? 0x1a6a7a : 0x000000);
      l.light.intensity = k * 6 * (0.85 + Math.random() * 0.15);
      if (l.t > 0) lit++;
    }
    if (!lights.done && lit === 6) {
      lights.done = true; save.lichtjes = true; persist();
      lantern.forEach((l) => (l.t = 1e9));
      addCookie(4, 1.4, -18.5, LICHT_NAME); puff(V3(4, 1.4, -18.5), 20, 0xb79cff, 4, 2);
    }
  }

  // ---------- hidden platforms show up around a glowing Josh ----------
  function updateGhosts(t) {
    for (const b of ghosts) {
      const d = Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z);
      const want = P.ability === 'gloei' && d < 11 ? 0.8 * Math.min(1, (12 - d) / 4) : 0.05 + Math.sin(t * 3 + b.pos.x) * 0.03;
      b.mesh.material.opacity += (want - b.mesh.material.opacity) * 0.15;
      b.mesh.visible = b.mesh.material.opacity > 0.01;
    }
  }

  // ---------- after the Woekerzwam: the forest air clears ----------
  function restoreLight() {
    scene.fog.color.setHex(0x3a3060); scene.fog.density = 0.0075;
    const h = scene.children.find((o) => o.isHemisphereLight); h.intensity = 1.6;
  }

  // ---------- cutscenes ----------
  const otisCam = () => { const o = otis.root.position; return { pos: V3(o.x + 2.2, o.y + 1.1, o.z + 2.6), look: V3(o.x, o.y + 0.7, o.z) }; };
  const behindJosh = () => ({ pos: V3(P.pos.x + 1.5, P.pos.y + 2.8, P.pos.z + 7), look: V3(P.pos.x, P.pos.y + 3, P.pos.z - 8) });
  function arrival() {
    const land = rocket.position.clone();
    play([
      {
        dur: 3,
        start() { ctx.hideJosh = true; drone.g.visible = false; otis.root.visible = false; rocket.position.y = 45; },
        update(dt, k) { rocket.position.y = 45 * Math.pow(1 - k, 2.2); if (Math.random() < 0.8) puff(rocket.localToWorld(V3(0, -0.2, 0)), 2, 0xffb45e, 2, -2); },
        finish() { rocket.position.copy(land); puff(land.clone().add(V3(0, 0.3, 0)), 20, 0xd8c8f0, 6, 1); ctx.shake(0.3); },
        cam: () => ({ pos: V3(-10, 4, 62), look: rocket.position.clone().add(V3(0, 2, 0)) }),
      },
      {
        dur: 1.6,
        start() { otis.root.visible = true; otis.root.position.copy(rocket.localToWorld(V3(0, 2.5, 1))); otis.jump(5); },
        update(dt, k) {
          otis.root.position.x += (OTIS_HOME.x - otis.root.position.x) * damp(3, dt);
          otis.root.position.z += (OTIS_HOME.z - otis.root.position.z) * damp(3, dt);
          if (k > 0.45 && ctx.hideJosh) { ctx.hideJosh = false; drone.g.visible = true; P.pos.set(3.5, 0.5, 47.5); P.vel.set(-1, 7, 1.5); }
        },
        finish() { otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('happy', 2); ctx.hideJosh = false; drone.g.visible = true; },
        cam: shot(V3(-4, 3, 58), V3(5, 1, 46)),
      },
      { say: { who: 'OTIS', text: 'Woef… hatsjoe!', sub: tr('Het ruikt hier naar paddenstoelen. En naar katten.') }, cam: otisCam },
      { dur: 4.5, say: { who: BYTE(), text: 'Kijk daar, helemaal aan de rand van het bos. Dat paarse ding is niet gezond.' }, cam: pan(V3(2, 4, 58), V3(0, 6, 30), V3(0, 18, 30), WOEKER) },
      { dur: 5, say: { who: BYTE(), text: 'Je kunt er via Lars’ dorpje in de kruinen komen, over het giftige moeras, of door de wortelheuvel. Kies maar.' }, cam: pan(V3(-24, 16, 30), V3(-50, 8, 4), V3(24, 18, 30), V3(44, 6, 0)) },
      { say: { who: BYTE(), text: 'Zie je die roze knoppen? Stamp erop. Dan gaat er iets groeien.' }, cam: behindJosh },
    ], () => { save.intro = true; persist(); ctx.resetCam(); });
  }
  function bossIntro() {
    if (boss.met) return;
    boss.met = true; boss.hold = true;
    play([
      { dur: 2.5, cam: pan(V3(ARENA.x + 10, 13, ARENA.z + 10), V3(ARENA.x, 14, ARENA.z - 10), V3(ARENA.x + 4, 16, ARENA.z + 4), WOEKER) },
      { say: { who: BYTE(), text: 'Dat is hem. De Woekerzwam.' }, cam: shot(V3(ARENA.x, 15, ARENA.z + 2), V3(ARENA.x, 20, ARENA.z - 16)) },
      { say: { who: 'DE WOEKERZWAM', text: 'SSSSSSPOREN… MIJN BOS… ALLES PAARS…' }, cam: shot(V3(ARENA.x + 3, 18, ARENA.z - 6), V3(ARENA.x, 20, ARENA.z - 14)) },
      { say: { who: BYTE(), text: 'Die gloeiende knollen die hij spuugt: spring erop voordat ze ontploffen, dan schieten ze terug in zijn gezicht!' }, cam: () => ({ pos: V3(P.pos.x + 1.5, P.pos.y + 3, P.pos.z + 6), look: V3(ARENA.x, 15, ARENA.z - 8) }) },
    ], () => { boss.hold = false; ctx.resetCam(); });
  }
  function bossWin() {
    restoreLight();
    play([
      { dur: 2.6, cam: pan(V3(ARENA.x + 8, 14, ARENA.z + 6), WOEKER, V3(ARENA.x + 2, 12, ARENA.z + 10), V3(ARENA.x, 12, ARENA.z - 14)) },
      { say: { who: BYTE(), text: 'Hij verschrompelt! Het is gewoon weer een paddenstoel.' }, cam: () => ({ pos: V3(P.pos.x + 2, P.pos.y + 2, P.pos.z + 4), look: P.pos.clone().add(V3(0, 1, 0)) }) },
      { say: { who: BYTE(), text: 'Kayo & Yara zijn hier ook alweer weg. Ze gaan steeds verder de ruimte in…' }, cam: () => ({ pos: V3(P.pos.x + 2, P.pos.y + 2, P.pos.z + 4), look: V3(P.pos.x, P.pos.y + 30, P.pos.z - 40) }) },
    ], () => ctx.resetCam());
  }
  // the first time you press a knop, the camera flies over to show what it changed
  const seenKnop = new Set(save.knoppen2 || []);
  knopHook.show = (k) => {
    if (seenKnop.has(k.id)) return;
    seenKnop.add(k.id); save.knoppen2 = [...seenKnop]; persist();
    const its = k.grp.items, c = V3();
    let grow = 1, spread = 0;
    for (const it of its) {
      c.add(V3(it.b.pos.x, (it.low + it.high) / 2, it.b.pos.z));
      grow = Math.max(grow, Math.max(1, it.high - it.low) / 5);
    }
    c.divideScalar(its.length);
    for (const it of its) spread = Math.max(spread, Math.hypot(it.b.pos.x - c.x, it.b.pos.z - c.z), Math.abs(it.high - it.low) / 2);
    const dir = V3(k.pos.x - c.x, 0, k.pos.z - c.z);
    if (dir.lengthSq() < 1) dir.set(0, 0, 1);
    dir.normalize();
    const dist = spread * 1.8 + 7;
    const end = c.clone().addScaledVector(dir, dist).add(V3(0, dist * 0.45, 0));
    const start = k.pos.clone().addScaledVector(dir, 4).add(V3(0, 3, 0));
    const steps = [
      { dur: 0.7, cam: pan(start, k.pos.clone().add(V3(0, 0.5, 0)), start.clone().add(V3(0, 1, 0)), c) },
      { dur: Math.min(4.5, grow + 0.8), start() { ctx.shake(0.2); }, cam: pan(start.clone().add(V3(0, 1, 0)), c, end, c) },
    ];
    // and then where it leads
    const goal = k.grp.goal;
    if (goal) {
      const gd = V3(end.x - goal.x, 0, end.z - goal.z).setLength(7);
      steps.push({ dur: 2.2, cam: pan(end, c, goal.clone().add(gd).add(V3(0, 4, 0)), goal) });
    }
    play(steps, () => ctx.resetCam());
  };
  function launch(go) {
    const hatch = rocket.localToWorld(V3(1.2, 0, 1.3)); hatch.y = 0;
    play([
      { dur: 1.8, start() { otis.walkTo(hatch, 4, () => otis.jump(6)); ctx.hideJosh = true; drone.g.visible = false; }, update(dt, k) { if (k > 0.75) otis.root.visible = false; }, cam: shot(V3(-4, 4, 58), V3(6, 2, 44)) },
      { dur: 99, start: go, cam: () => ({ pos: V3(-6, 2, 60), look: rocket.position.clone().add(V3(0, 2, 0)) }) },
    ]);
  }

  function update(dt, t) {
    updateKnoppen(dt);
    updateLanterns(dt);
    updateGhosts(t);
    for (const f of flies) {
      const a = t * 0.5 + f.ph;
      const x = f.c.x + Math.sin(a) * 2.5, z = f.c.z + Math.cos(a * 1.3) * 2.5;
      const g = groundAt(x, z, 0);
      f.m.position.set(x, (g > -Infinity ? g : 0) + 1 + Math.sin(t * 2 + f.ph) * 0.6, z);
      f.m.visible = Math.sin(t * 3 + f.ph * 5) > -0.6;
    }
    waves.forEach((l, i) => { l.wave.rotation.y = Math.sin(t * 3 + i) * 0.35; });
    const cp = save.cp;
    for (const f of FLAGS) f.mat.color.setHex(cp && Math.hypot(cp[0] - f.pos.x, cp[2] - f.pos.z) < 0.5 ? 0x7dff9a : 0x9a948a);
    otis.update(dt, t, P.pos);
  }
  function landed() { otis.root.visible = true; otis.walk = null; otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('happy', 2); }
  return { start() { if (!save.intro) arrival(); }, bossIntro, bossWin, restoreLight, launch, update, landed };
}
