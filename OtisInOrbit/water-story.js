import { THREE, scene, toon, addOutline, V3, puff, damp, toast } from './core.js';
import { buildOtis } from './otis.js';
import { addSpeaker } from './bubbles.js';
import { play, shot, pan } from './cutscene.js';
import * as sfx from './sfx.js';
import { groundAt, ARENA } from './water-terrain.js';
import { rocket, FLAGS, anim, updateWorld, cycle, untilChange, addFloe, boxes, DENIZ_AT, TOREN } from './water-world.js';
import { boss, frostHit } from './water-boss.js';
import { setAbilityProbe } from './water-npc.js';
import { updateTrials } from './water-trials.js';
import { enemies } from './water-enemies.js';

export function setupStory(ctx) {
  const { P, drone, save, persist } = ctx;
  const BYTE = () => (ctx.LOOK.droneName || 'Byte').toUpperCase();
  const tr = (s) => `${ctx.LOOK.droneName || 'Byte'} vertaalt: “${s}”`;
  const KETEL = V3(ARENA.x, 2, ARENA.z);
  setAbilityProbe(() => P.ability);

  // ---------- Otis: he does NOT like getting his paws wet ----------
  const otis = buildOtis(groundAt);
  const OTIS_HOME = V3(9, 0, 47.5);
  otis.place(OTIS_HOME.x, OTIS_HOME.z);
  const OTIS_BEFORE = ['Woef! Woef!', '*schudt zich uit, overal spetters*', `Woef?<small>${tr('Daar in het noorden, dat ruïne-eiland: daar woont Deniz, toch?')}</small>`, `Woef woef.<small>${tr('Wacht op de nacht. Dan bevriest de zee en hoef je niet te zwemmen.')}</small>`, `Woef!<small>${tr('Ik zwem niet. Honden zwemmen niet. Nou ja. Ik niet.')}</small>`];
  const OTIS_AFTER = ['Woef!', `Woef woef!<small>${tr('Het water is al minder warm. Brrr, lekker.')}</small>`, '*glijdt per ongeluk uit op een ijsschots*', `Woef?<small>${tr('Druk op E bij de raket: dan kies je waar we heen vliegen.')}</small>`];
  addSpeaker(otis.root, { y: 1.7, radius: 5, linger: 12, lines: () => (save.boss ? OTIS_AFTER : OTIS_BEFORE) });

  // ---------- Kayo & Yara on their saucer (same as on the Zon) ----------
  const saucer = new THREE.Group(); saucer.visible = false; scene.add(saucer);
  const cats = {};
  {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.1, 0.4, 24), toon(0xc8ccd4)); disc.castShadow = true; addOutline(disc, 1.04); saucer.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 6, 30), new THREE.MeshBasicMaterial({ color: 0x9b3bff })); rim.rotation.x = Math.PI / 2; saucer.add(rim);
    const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
    const cat = (name, x, furCol, eyeCol, patch) => {
      const g = new THREE.Group(); g.position.set(x, 0.2, 0); saucer.add(g);
      const f = toon(furCol);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), f); body.scale.set(0.9, 1, 1.1); body.position.y = 0.42; addOutline(body, 1.06); g.add(body);
      const head = new THREE.Group(); head.position.set(0, 0.98, 0.1); g.add(head);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), f); addOutline(h, 1.06); head.add(h);
      if (patch) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), toon(patch)); p.position.set(0.13, 0.1, 0.15); p.scale.set(1, 1, 0.6); head.add(p); }
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 4), f); e.position.set(0.18 * s, 0.3, 0); e.rotation.z = -0.3 * s; addOutline(e, 1.08); head.add(e);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: eyeCol })); eye.position.set(0.12 * s, 0.04, 0.27); eye.scale.y = 0.6; head.add(eye);
        const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.02), ink); pupil.position.set(0.12 * s, 0.04, 0.33); head.add(pupil);
      }
      const tail = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 6, 14, Math.PI * 1.3), f); tail.position.set(0, 0.5, -0.45); tail.rotation.y = Math.PI / 2; g.add(tail);
      cats[name] = { g, head, tail };
    };
    cat('kayo', -0.55, 0x3a3640, 0x7dff9a, null);
    cat('yara', 0.55, 0xf4ece0, 0xffd040, 0xe08a3a);
  }
  let saucerOn = false, saucerT = 0;
  const SAUCER_AT = V3(ARENA.x + 5, 9, ARENA.z - 3);

  function restoreLight() {}

  // ---------- cutscenes ----------
  const otisCam = () => { const o = otis.root.position; return { pos: V3(o.x + 2.2, o.y + 1.1, o.z + 2.6), look: V3(o.x, o.y + 0.7, o.z) }; };
  const behindJosh = () => ({ pos: V3(P.pos.x + 1.5, P.pos.y + 2.8, P.pos.z + 7), look: V3(P.pos.x, P.pos.y + 2, P.pos.z - 8) });
  const atJosh = () => ({ pos: V3(P.pos.x + 2, P.pos.y + 2, P.pos.z + 4), look: P.pos.clone().add(V3(0, 1.2, 0)) });
  function arrival() {
    const land = rocket.position.clone();
    play([
      {
        dur: 2.6,
        start() { ctx.hideJosh = true; drone.g.visible = false; otis.root.visible = false; rocket.position.y = 45; },
        update(dt, k) { rocket.position.y = land.y + (45 - land.y) * Math.pow(1 - k, 2); if (Math.random() < 0.8) puff(rocket.localToWorld(V3(0, -0.2, 0)), 2, 0xffd27a, 2, -2); },
        finish() { rocket.position.copy(land); puff(land.clone().add(V3(0, 0.3, 0)), 30, 0xf4e2b0, 8, 1); ctx.shake(0.4); sfx.land(); },
        cam: () => ({ pos: V3(-10, 5, 62), look: rocket.position.clone().add(V3(0, 2, 0)) }),
      },
      {
        dur: 1.8,
        start() { otis.root.visible = true; otis.root.position.copy(rocket.localToWorld(V3(0, 2.5, 1))); otis.jump(5); },
        update(dt, k) {
          otis.root.position.x += (OTIS_HOME.x - otis.root.position.x) * damp(3, dt);
          otis.root.position.z += (OTIS_HOME.z - otis.root.position.z) * damp(3, dt);
          if (k > 0.45 && ctx.hideJosh) { ctx.hideJosh = false; drone.g.visible = true; P.pos.set(3.5, 1.7, 47.5); P.vel.set(-1, 7, 1.5); }
        },
        finish() { otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('happy', 1.2); ctx.hideJosh = false; drone.g.visible = true; },
        cam: shot(V3(-4, 4, 58), V3(5, 2, 46)),
      },
      { say: { who: 'OTIS', text: 'Woef! Woef woef?', sub: tr('Water. Heel veel water. Waar is het ijs gebleven?') }, cam: otisCam },
      { say: { who: BYTE(), text: 'Dit was ooit de IJsplaneet. Deniz woonde hier in een paleis van ijs.' }, cam: behindJosh },
      { dur: 4.2, say: { who: BYTE(), text: 'Het water is warm. Iemand heeft magma van de zon hierheen gebracht, en het ijs is gesmolten.' }, cam: pan(V3(-12, 8, 30), V3(0, 0, 10), V3(12, 10, 20), V3(0, 1, -8)) },
      { dur: 4.2, say: { who: BYTE(), text: 'Maar de planeet draait. Overdag is het water laag: dan komen er zandbanken boven. ’s Nachts bevriest de zee.' }, cam: pan(V3(-30, 9, 40), V3(-20, -1, 30), V3(12, 9, 8), V3(22, -1, -2)) },
      { dur: 3.6, say: { who: BYTE(), text: 'En daar, op dat rif in het noorden… daar kookt iets.' }, cam: pan(V3(8, 10, -36), KETEL, V3(-6, 8, -42), KETEL) },
      { say: { who: BYTE(), text: 'Zwem niet te lang, het water is nog steeds ijskoud. Eerst Deniz zoeken: hij zit op de ruïne recht vooruit.' }, cam: behindJosh },
    ], () => { save.intro = true; persist(); ctx.resetCam(); });
  }
  const arenaCam = (dx, dy, dz, ly = 3) => () => ({ pos: V3(ARENA.x + dx, dy, ARENA.z + dz), look: V3(ARENA.x, ly, ARENA.z - 4) });
  const catCam = () => ({ pos: saucer.position.clone().add(V3(1.5, 0.6, 4.2)), look: saucer.position.clone().add(V3(0, 0.9, 0)) });
  function bossIntro() {
    if (boss.met) return;
    boss.met = true; boss.hold = true;
    play([
      { dur: 2.2, cam: arenaCam(10, 6, 14, 2) },
      { dur: 2, start() { saucerOn = true; saucerT = 0; saucer.visible = true; sfx.whir(); }, cam: catCam },
      { say: { who: 'YARA', text: 'Alweer dat jongetje. Hij komt overal.' }, cam: catCam },
      { say: { who: 'KAYO', text: 'Weet je wat ijs is, jongetje? Gratis. En wat is gratis? Saai.' }, cam: catCam },
      { say: { who: 'YARA', text: 'Wij smelten het, en verkopen dan ijsblokjes. Heel duur. Aan iedereen die het warm heeft.' }, cam: catCam },
      { say: { who: BYTE(), text: 'Dat slaat nergens op!' }, cam: atJosh },
      { say: { who: 'KAYO', text: 'Het slaat op geld. Kapitein, je gast is er.' }, cam: catCam },
      { dur: 2.4, say: { who: 'KAPITEIN KRAAK', text: 'ARRR! Niemand komt aan m’n ketel!' }, start() { saucerOn = 'leave'; saucerT = 0; ctx.shake(0.4); sfx.clank(); }, cam: arenaCam(3, 4, 7, 2) },
    ], () => { boss.hold = false; saucer.visible = false; saucerOn = false; ctx.resetCam(); toast('Laat hem tegen de rand stormen. Is hij oververhit? Bevries hem met F, spring erop en doe een ground pound!'); });
  }
  function bossWin() {
    play([
      { dur: 2.2, cam: arenaCam(9, 6, 10, 1) },
      { say: { who: BYTE(), text: 'De ketel is kapot. Het magma is koud en grijs.' }, cam: atJosh },
      { dur: 3.2, say: { who: BYTE(), text: 'Voel je dat? Het water wordt kouder. Deniz kan zijn paleis weer laten groeien.' }, cam: shot(V3(DENIZ_AT.x + 8, 7, DENIZ_AT.z + 12), V3(DENIZ_AT.x, 1, DENIZ_AT.z)) },
      { say: { who: BYTE(), text: 'Kayo & Yara zijn weer gevlucht. Maar ze laten steeds meer sporen achter.' }, cam: atJosh },
    ], () => ctx.resetCam());
  }
  function launch(go) {
    const hatch = rocket.localToWorld(V3(1.2, 0, 1.3)); hatch.y = rocket.position.y;
    play([
      { dur: 1.8, start() { otis.walkTo(hatch, 4, () => otis.jump(6)); ctx.hideJosh = true; drone.g.visible = false; }, update(dt, k) { if (k > 0.75) otis.root.visible = false; }, cam: shot(V3(-4, 5, 58), V3(6, 3, 44)) },
      { dur: 99, start: go, cam: () => ({ pos: V3(-6, 3, 60), look: rocket.position.clone().add(V3(0, 2, 0)) }) },
    ]);
  }

  // ---------- Vries: F shoots a frost bolt. It hits the crab, enemies, and freezes a floe on open water ----------
  const bolts = [];
  const boltGeo = new THREE.OctahedronGeometry(0.25), boltMat = new THREE.MeshBasicMaterial({ color: 0xbfeaff });
  const enemyApi = { damage: (f) => ctx.hurt(f), bounce() {}, toast };
  const iceUnder = (x, z) => boxes.some((b) => b.ice && x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z);
  function fire(ability) {
    if (ability !== 'vries') return false;
    const fwd = V3(Math.sin(P.facing), 0, Math.cos(P.facing));
    const from = P.pos.clone().add(V3(0, 1, 0));
    const m = new THREE.Mesh(boltGeo, boltMat); m.position.copy(from); scene.add(m);
    bolts.push({ m, v: fwd.clone().multiplyScalar(24), life: 0.6 });
    sfx.shrink();
    // a floe on the water ahead of you (closer when you're swimming, so you can climb onto it)
    const ahead = swimming ? 2.2 : 4.5;
    const x = P.pos.x + fwd.x * ahead, z = P.pos.z + fwd.z * ahead;
    if (groundAt(x, z, 1.2) < cycle.water && !iceUnder(x, z) && !(cycle.night && boxes.some((b) => b.ice && Math.hypot(b.pos.x - x, b.pos.z - z) < 2))) {
      addFloe(x, z); puff(V3(x, cycle.water + 0.4, z), 14, 0xe8f8ff, 4, 1.5); sfx.clank();
    }
    return true;
  }
  function updateBolts(dt) {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const s = bolts[i], q = s.m.position;
      q.addScaledVector(s.v, dt); s.life -= dt; s.m.rotation.y += dt * 10;
      if (Math.random() < 0.6) puff(q.clone(), 1, 0xe8f8ff, 1.2, 0.3);
      let hit = s.life <= 0 || groundAt(q.x, q.z, 0) > q.y;
      if (!hit && frostHit(q)) hit = true;
      if (!hit && enemies.zap(q, 0.5, enemyApi)) hit = true;
      if (hit) { puff(q.clone(), 8, 0xbfeaff, 3, 1); scene.remove(s.m); bolts.splice(i, 1); }
    }
  }

  // ---------- every frame ----------
  let swimming = false, cold = 0, coldWarned = false, wasNight = null, crackWarned = false;
  function update(dt, t) {
    for (const f of anim) f(t, dt);
    updateWorld(t, dt);
    updateTrials(dt, t, P);
    updateBolts(dt);
    // swimming: you float at the surface. It's slow, and it's cold
    const surf = cycle.water - 0.55;
    swimming = !ctx.hideJosh && P.pos.y < surf;
    if (swimming) {
      P.pos.y = surf; if (P.vel.y < 0) P.vel.y = 0;
      P.coyote = 0.12; P.pound = 0; P.airJump = P.airJump2 = false;
      const hs = Math.hypot(P.vel.x, P.vel.z);
      if (hs > 3.5) { P.vel.x *= 3.5 / hs; P.vel.z *= 3.5 / hs; }
      if (Math.random() < dt * 8) puff(P.pos.clone().add(V3(0, 0.5, 0)), 1, 0xffffff, 1.5, 0.6);
      cold += dt;
      if (cold > 2.5 && !coldWarned) { coldWarned = true; toast('Brrr! Het water is ijskoud. Snel eruit!'); }
      if (cold > 4.5) { cold = 0; coldWarned = false; sfx.hurt(); ctx.respawn('Brrr! Te koud. Terug naar je laatste checkpoint'); }
    } else if (P.grounded || P.pos.y > cycle.water) { cold = Math.max(0, cold - dt * 3); if (cold === 0) coldWarned = false; }
    // dusk and dawn
    if (wasNight !== null && cycle.night !== wasNight) toast(cycle.night ? 'De zon gaat onder… de zee bevriest!' : 'De zon komt op. Het ijs is gesmolten en het water zakt.');
    if (cycle.night && untilChange() < 5 && untilChange() > 0) { if (!crackWarned) { crackWarned = true; toast('Krak… het ijs begint te smelten!'); } } else crackWarned = false;
    wasNight = cycle.night;
    // the saucer with the cats
    if (saucerOn) {
      saucerT += dt;
      if (saucerOn === true) saucer.position.lerpVectors(SAUCER_AT.clone().add(V3(0, 14, -10)), SAUCER_AT, Math.min(1, saucerT / 1.6));
      else saucer.position.add(V3(dt * 6, dt * 10, -dt * 14));
      saucer.position.y += Math.sin(t * 2) * 0.01;
      saucer.rotation.y = Math.PI + Math.sin(t) * 0.2;
      for (const k in cats) { cats[k].tail.rotation.x = Math.sin(t * 3 + (k === 'kayo' ? 0 : 1)) * 0.3; cats[k].head.rotation.y = Math.sin(t * 0.8) * 0.2; }
    }
    for (const f of FLAGS) f.mat.color.setHex(save.cp && Math.hypot(save.cp[0] - f.pos.x, save.cp[2] - f.pos.z) < 0.5 ? 0x7dff9a : 0x9a948a);
    otis.update(dt, t, P.pos);
  }
  void TOREN;
  function landed() { otis.root.visible = true; otis.walk = null; otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('happy', 2); }
  return { start() { if (!save.intro) arrival(); }, bossIntro, bossWin, restoreLight, launch, update, landed, fire };
}
