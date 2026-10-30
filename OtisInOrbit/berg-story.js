import { THREE, scene, toon, V3, puff, damp } from './core.js';
import { buildOtis } from './otis.js';
import { addSpeaker } from './bubbles.js';
import { play, shot, pan } from './cutscene.js';
import { groundAt, SUMMIT } from './berg-terrain.js';
import { lamps, rocket, waterfall, FLAGS, CRUMBLE, boxes, syncBox } from './berg-world.js';
import { boss } from './berg-boss.js';
import { setShake } from './berg-npc.js';

export function setupStory(ctx) {
  const { P, drone, save, persist } = ctx;
  setShake((s) => ctx.shake(s));
  const BYTE = () => (ctx.LOOK.droneName || 'Byte').toUpperCase();
  const tr = (s) => `${ctx.LOOK.droneName || 'Byte'} vertaalt: “${s}”`;

  // ---------- Otis ----------
  const otis = buildOtis(groundAt);
  const OTIS_HOME = V3(7.8, 0, 47.4);
  otis.place(OTIS_HOME.x, OTIS_HOME.z);
  addSpeaker(otis.root, {
    y: 1.7, radius: 5, linger: 12,
    lines: ['Woef!', '*kijkt omhoog naar het paarse licht op de top*', `Woef woef.<small>${tr('Ik pas op de raket. En op het kampvuur.')}</small>`, '*probeert een vlinder te vangen*', `Woef?<small>${tr('Met 12 kosmische koekjes vliegen we verder. Ik ruik daar… paddenstoelen.')}</small>`],
  });
  let otisNear = false;

  // ---------- vogels, vlinders ----------
  const wingMat = toon(0x3a3e4e);
  const birds = [];
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Group(); scene.add(b);
    const wings = [-1, 1].map((s) => {
      const p = new THREE.Group(); b.add(p);
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.22), wingMat); w.position.x = 0.35 * s; p.add(w);
      return { p, s };
    });
    birds.push({ b, wings, c: V3(-20 + Math.random() * 50, 0, -40 + Math.random() * 60), r: 15 + Math.random() * 20, y: 20 + Math.random() * 20, sp: 0.15 + Math.random() * 0.1, ph: Math.random() * 7 });
  }
  const flyCols = [0xff7a3d, 0xffd166, 0x14b8a6, 0xff7ab6];
  const flies = [];
  for (let i = 0; i < 14; i++) {
    const f = new THREE.Group(); scene.add(f);
    const mat = new THREE.MeshBasicMaterial({ color: flyCols[i % 4], side: THREE.DoubleSide });
    const wings = [-1, 1].map((s) => {
      const p = new THREE.Group(); f.add(p);
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.1, 8), mat); w.position.x = 0.1 * s; p.add(w);
      return { p, s };
    });
    flies.push({ f, wings, c: V3(-26 + Math.random() * 50, 0, -8 + Math.random() * 56), ph: Math.random() * 9 });
  }
  const waves = lamps.filter((l) => l.wave), ripples = lamps.filter((l) => l.ripple), beacon = (lamps.find((l) => l.beacon) || {}).beacon;
  let mistT = 0;

  function updateAmbient(dt, t) {
    for (const b of birds) {
      const a = t * b.sp + b.ph;
      b.b.position.set(b.c.x + Math.cos(a) * b.r, b.y + Math.sin(t * 0.7 + b.ph) * 1.5, b.c.z + Math.sin(a) * b.r);
      b.b.rotation.y = -a;
      const flap = Math.sin(t * 9 + b.ph) * 0.6;
      b.wings.forEach(({ p, s }) => (p.rotation.z = s * flap));
    }
    for (const f of flies) {
      const a = t * 0.8 + f.ph;
      const x = f.c.x + Math.sin(a) * 2, z = f.c.z + Math.cos(a * 1.3) * 2;
      f.f.position.set(x, groundAt(x, z, 0) + 0.8 + Math.sin(t * 3 + f.ph) * 0.4, z);
      f.f.rotation.y = a;
      f.wings.forEach(({ p, s }) => (p.rotation.y = s * Math.abs(Math.sin(t * 25 + f.ph)) * 1.2));
    }
    waves.forEach((l, i) => { l.wave.rotation.y = Math.sin(t * 3 + i) * 0.35; l.wave.scale.x = 1 + Math.sin(t * 6 + i) * 0.06; });
    ripples.forEach((l) => { l.ripple.position.x = l.x0 + ((t * 1.5 + l.seed) % 3); });
    if (beacon) beacon.material.opacity = 0.1 + Math.sin(t * 2) * 0.04;
    // the waterfall keeps falling, with spray at its foot
    waterfall.tex.offset.y = (t * 1.2) % 1;
    mistT -= dt;
    if (mistT <= 0) { mistT = 0.2; puff(waterfall.foot.clone().add(V3(0, 0, (Math.random() - 0.5) * 4)), 2, 0xffffff, 1.5, 1.5); }
    // the last checkpoint you touched flies a bright flag
    const cp = save.cp;
    for (const f of FLAGS) f.mat.color.setHex(cp && Math.hypot(cp[0] - f.pos.x, cp[2] - f.pos.z) < 0.5 ? 0xffd166 : 0x9a948a);
  }

  // ---------- cutscenes ----------
  const otisCam = (dx = 2.2, dy = 1.1, dz = 2.6) => () => {
    const o = otis.root.position;
    return { pos: V3(o.x + dx, o.y + dy, o.z + dz), look: V3(o.x, o.y + 0.7, o.z) };
  };
  const behindJosh = () => ({ pos: V3(P.pos.x + 1.5, P.pos.y + 2.8, P.pos.z + 7), look: V3(P.pos.x, P.pos.y + 3, P.pos.z - 8) });
  const TOP = V3(SUMMIT.x, SUMMIT.h + 2, SUMMIT.z);

  function arrival() {
    const land = rocket.position.clone();
    play([
      {
        dur: 3,
        start() { ctx.hideJosh = true; drone.g.visible = false; otis.root.visible = false; rocket.position.y = 45; },
        update(dt, k) {
          rocket.position.y = 45 * Math.pow(1 - k, 2.2);
          if (Math.random() < 0.8) puff(rocket.localToWorld(V3(0, -0.2, 0)), 2, 0xffb45e, 2, -2);
        },
        finish() { rocket.position.copy(land); puff(land.clone().add(V3(0, 0.3, 0)), 20, 0xe8e2d4, 6, 1); ctx.shake(0.3); },
        cam: () => ({ pos: V3(-10, 4, 64), look: rocket.position.clone().add(V3(0, 2, 0)) }),
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
      { say: { who: 'OTIS', text: 'Woef! Woef woef!', sub: tr('Wat een uitzicht! En het ruikt hier naar… geiten.') }, cam: otisCam() },
      {
        dur: 4.5,
        say: { who: BYTE(), text: 'Zie je dat paarse licht? Daar is de top. Daar wil je uiteindelijk zijn.' },
        cam: pan(V3(2, 4, 58), V3(0, 6, 30), V3(0, 14, 40), TOP),
      },
      {
        dur: 5,
        say: { who: BYTE(), text: 'Hoe je er komt mag je zelf weten. Door het bos en over de klifwand, door de oude mijn, of over de oostkam.' },
        cam: pan(V3(-20, 18, 30), V3(-44, 8, 0), V3(20, 22, 34), V3(46, 10, -10)),
      },
      { say: { who: BYTE(), text: 'En de geiten hier kletsen wat af. Luister maar goed, ze verklappen van alles.' }, cam: behindJosh },
    ], () => { save.intro = true; persist(); ctx.resetCam(); });
  }

  // ---------- de Lawinereus ----------
  const C = V3(SUMMIT.x, SUMMIT.h, SUMMIT.z);
  function bossIntro() {
    if (boss.met) return;          // the second try starts right away
    boss.met = true;
    boss.hold = true;
    play([
      { dur: 2, cam: pan(V3(C.x + 9, C.y + 3, C.z + 9), V3(C.x, C.y + 1, C.z), V3(C.x + 6, C.y + 2, C.z + 8), V3(C.x, C.y + 3, C.z)) },
      { say: { who: BYTE(), text: 'Eh… die berg sneeuw beweegt. Dat is geen berg sneeuw.' }, cam: shot(V3(C.x + 5, C.y + 2.5, C.z + 7), V3(C.x, C.y + 3.5, C.z)) },
      { say: { who: 'DE LAWINEREUS', text: 'GROMMMM. MIJN TOP. MIJN SNEEUW. WEG!' }, cam: shot(V3(C.x + 2.5, C.y + 4, C.z + 5), V3(C.x, C.y + 4.4, C.z)) },
      { say: { who: BYTE(), text: 'Als hij zich oprolt, laat hem dan tegen zo’n rotspilaar knallen. Valt hij om? Springen op dat kristal in zijn buik!' }, cam: () => ({ pos: V3(P.pos.x + 1.5, P.pos.y + 3, P.pos.z + 6), look: C.clone().add(V3(0, 2, 0)) }) },
    ], () => { boss.hold = false; ctx.resetCam(); });
  }
  function bossWin() {
    play([
      { dur: 2.4, cam: pan(V3(C.x + 8, C.y + 4, C.z + 8), V3(C.x, C.y, C.z), V3(C.x + 3, C.y + 8, C.z + 12), V3(C.x, C.y - 6, C.z - 10)) },
      { say: { who: BYTE(), text: 'Hij rolt helemaal naar beneden! De top is vrij.' }, cam: () => ({ pos: V3(P.pos.x + 2, P.pos.y + 2, P.pos.z + 4), look: P.pos.clone().add(V3(0, 1, 0)) }) },
    ], () => ctx.resetCam());
  }

  function launch(go) {
    const hatch = rocket.localToWorld(V3(1.2, 0, 1.3)); hatch.y = 0;
    play([
      {
        dur: 1.8,
        start() { otis.walkTo(hatch, 4, () => otis.jump(6)); ctx.hideJosh = true; drone.g.visible = false; },
        update(dt, k) { if (k > 0.75) otis.root.visible = false; },
        cam: shot(V3(-6, 4, 58), V3(5, 2, 45)),
      },
      { dur: 99, start: go, cam: () => ({ pos: V3(-8, 2, 60), look: rocket.position.clone().add(V3(0, 2, 0)) }) },
    ]);
  }

  // ---------- de brokkelbrug: once you step on, the planks drop one after another at 8.5 m/s ----------
  const bridge = { t: -1 };
  function updateBridge(dt) {
    if (bridge.t < 0) {
      if (P.grounded && CRUMBLE.includes(P.ground)) { bridge.t = 0; ctx.shake(0.15); }
      return;
    }
    bridge.t += dt;
    CRUMBLE.forEach((b, i) => {
      const due = bridge.t - (i * 2) / 8.5;
      if (due > 0 && !b.falling && due < 0.4) b.mesh.position.x = b.home.x + Math.sin(bridge.t * 70) * 0.06;    // shaking just before it goes
      if (due > 0.4 && !b.falling) {
        b.falling = true; b.vy = 0;
        boxes.splice(boxes.indexOf(b), 1);
        puff(b.pos.clone(), 5, 0xa07a50, 2, 0.5);
      }
      if (b.falling && b.mesh.visible) {
        b.vy -= 30 * dt; b.pos.y += b.vy * dt;
        if (b.pos.y < -20) b.mesh.visible = false;
      }
    });
    // everything gone and nobody on it any more: the bridge grows back
    if (bridge.t > 6 && !(P.pos.x > 63 && P.pos.x < 88 && Math.abs(P.pos.z - 14) < 2 && P.pos.y > 10)) {
      CRUMBLE.forEach((b) => {
        b.falling = false; b.pos.copy(b.home); b.mesh.visible = true; syncBox(b);
        if (!boxes.includes(b)) boxes.push(b);
      });
      bridge.t = -1;
    }
  }

  function update(dt, t) {
    updateAmbient(dt, t);
    updateBridge(dt);
    const near = P.pos.distanceTo(otis.root.position) < 4;
    if (near && !otisNear && otis.mood === 'idle' && !otis.walk) otis.setMood('happy', 1.2);
    otisNear = near;
    otis.update(dt, t, P.pos);
  }

  // back from another planet: Otis hops out of the rocket again
  function landed() { otis.root.visible = true; otis.walk = null; otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('happy', 2); }
  return { start() { if (!save.intro) arrival(); }, bossIntro, bossWin, launch, update, landed };
}
