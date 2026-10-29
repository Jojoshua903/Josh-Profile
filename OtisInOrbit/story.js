import { THREE, scene, V3, puff, damp } from './core.js?v=sub1';
import { buildOtis } from './otis.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { play, shot, pan } from './cutscene.js?v=sub1';
import { groundAt } from './terrain.js?v=sub1';
import { lamps, rocket, chimneyHouse, ARENA_POS } from './world.js?v=sub1';
import { boss } from './boss.js?v=sub1';
import { setNpcLight, miloRoot, MILO_AT } from './npc.js?v=sub1';

// Everything that makes the Mistmaan feel alive: Otis, the cutscenes, little ambient animations.
export function setupStory(ctx) {
  const { P, josh, drone, save, persist } = ctx;
  const BYTE = () => (ctx.LOOK.droneName || 'Byte').toUpperCase();
  const tr = (s) => `${ctx.LOOK.droneName || 'Byte'} vertaalt: “${s}”`;

  // ---------- Otis ----------
  const otis = buildOtis(groundAt);
  const OTIS_HOME = V3(6.6, 0, 25.2);
  otis.place(OTIS_HOME.x, OTIS_HOME.z);
  let lit = false;
  addSpeaker(otis.root, {
    y: 1.7, radius: 5, linger: 12,
    lines: () => {
      const left = 7 - ctx.rare();
      if (left <= 0) return [`WOEF! WOEF!<small>${tr('Genoeg koekjes! Druk op E bij de raket.')}</small>`, '*kwispelt als een gek*'];
      if (lit) return [`Woef woef!<small>${tr('De accu zit er weer in. Nog ' + left + ' koekjes en we vliegen.')}</small>`, '*rolt door het stof*', '*kwispel kwispel*'];
      return ['Woef.', '*snuffelt aan de raket*', `Woef woef…<small>${tr('Nog ' + left + ' kosmische koekjes nodig.')}</small>`, '*krabt achter zijn oor*', `Grrr…<small>${tr('Die Lichtvreter. Bij dat rode lampje.')}</small>`];
    },
  });
  // whenever you come back to the rocket, Otis gets excited
  let otisNear = false;

  // ---------- ambient life ----------
  const mothMat = new THREE.MeshBasicMaterial({ color: 0xf4f0e6, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const mothGeo = new THREE.PlaneGeometry(0.12, 0.08);
  const moths = [];
  for (const l of lamps) {
    if (!l.flicker || l.flicker.parent !== scene) continue;
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(mothGeo, mothMat); scene.add(m);
      moths.push({ m, c: l.flicker.position, r: 0.35 + Math.random() * 0.4, sp: 2 + Math.random() * 3, ph: Math.random() * 7 });
    }
  }
  const wispTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(220,226,240,.55)'); g.addColorStop(1, 'rgba(220,226,240,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const wisps = [];
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: wispTex, transparent: true, depthWrite: false }));
    s.scale.set(9 + Math.random() * 6, 3 + Math.random() * 2, 1);
    s.position.set(-30 + Math.random() * 60, 2 + Math.random() * 6, 10 - Math.random() * 75);
    scene.add(s); wisps.push({ s, v: 0.6 + Math.random() * 0.8 });
  }
  const CHIMNEY = V3(22 + 0.875, chimneyHouse.top + 3.4, -54 - 0.7);
  let smokeT = 0, sparkT = 2;

  function updateAmbient(dt, t) {
    for (const m of moths) {
      const a = t * m.sp + m.ph;
      m.m.position.set(m.c.x + Math.cos(a) * m.r, m.c.y + Math.sin(a * 1.7) * 0.25, m.c.z + Math.sin(a) * m.r);
      m.m.rotation.set(Math.sin(t * 40 + m.ph) * 1.2, a, 0);
    }
    for (const w of wisps) {
      w.s.position.x += w.v * dt;
      if (w.s.position.x > 34) w.s.position.x = -34;
      w.s.material.opacity = lit ? Math.max(0, w.s.material.opacity - dt * 0.3) : 1;
    }
    smokeT -= dt;
    if (smokeT <= 0) { smokeT = 0.7; puff(CHIMNEY.clone(), 1, 0x9aa0b4, 0.3, 1.4); }
    sparkT -= dt;
    if (sparkT <= 0 && !lit) {                                    // the crashed rocket still sparks a bit
      sparkT = 1.5 + Math.random() * 3;
      puff(rocket.localToWorld(V3(0.6, 1.2, 0.9)), 4, 0xffd166, 2.5, 2);
    }
  }

  // ---------- helpers ----------
  const otisCam = (dx = 2.2, dy = 1.1, dz = 2.6) => () => {
    const o = otis.root.position;
    return { pos: V3(o.x + dx, o.y + dy, o.z + dz), look: V3(o.x, o.y + 0.7, o.z) };
  };
  const behindJosh = () => ({ pos: V3(P.pos.x + 1.5, P.pos.y + 2.6, P.pos.z + 6), look: V3(P.pos.x, P.pos.y + 1.2, P.pos.z - 6) });
  const TELESCOPE = V3(0, 30, -100);

  // ---------- intro: the crash ----------
  function intro() {
    const crashPos = rocket.position.clone(), crashRot = rocket.rotation.clone();
    const from = V3(-45, 70, -30);
    play([
      {
        dur: 2.6,
        start() {
          ctx.hideJosh = true; drone.g.visible = false; otis.root.visible = false;
          rocket.position.copy(from); rocket.rotation.set(0.9, 0, -0.9);
          P.pos.set(3, 0, 26.5); P.vel.set(0, 0, 0);
        },
        update(dt, k) {
          const e = k * k;
          rocket.position.lerpVectors(from, crashPos, e);
          rocket.rotation.x += dt * 3;
          if (Math.random() < 0.8) puff(rocket.position.clone(), 2, Math.random() < 0.5 ? 0xffa53d : 0x9aa0b4, 1, 0.3);
        },
        finish() {
          rocket.position.copy(crashPos); rocket.rotation.copy(crashRot);
          ctx.shake(0.7);
          puff(crashPos.clone().add(V3(0, 0.5, 0)), 30, 0xb8bcc8, 9, 3);
        },
        cam: () => ({ pos: V3(18, 4, 44), look: rocket.position.clone() }),
      },
      { dur: 0.9, cam: shot(V3(13, 3, 36), V3(4, 1.5, 22)) },
      {
        dur: 1.6,
        start() { otis.root.visible = true; otis.root.position.copy(rocket.localToWorld(V3(0, 2.5, 1))); otis.walk = null; otis.jump(5); },
        update(dt, k) {
          otis.root.position.x += (OTIS_HOME.x - otis.root.position.x) * damp(3, dt);
          otis.root.position.z += (OTIS_HOME.z - otis.root.position.z) * damp(3, dt);
          if (k > 0.45 && ctx.hideJosh) {
            ctx.hideJosh = false; drone.g.visible = true;
            P.pos.set(3, 0.5, 26.5); P.vel.set(0.5, 7, 2.5);
            puff(P.pos.clone(), 8, 0xb8bcc8, 3, 1);
          }
        },
        finish() { otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('shake', 1.2); ctx.hideJosh = false; drone.g.visible = true; },
        cam: shot(V3(12, 3, 34), V3(4.5, 1, 24)),
      },
      { say: { who: 'OTIS', text: 'Woef… woef woef?', sub: tr('Landing gelukt. Min of meer.') }, cam: otisCam(), start() { otis.setMood('bark', 1.2); } },
      { say: { who: BYTE(), text: 'Systeemcheck. Raket: gedeukt. Otis: oké. Josh: oké. Accu… accu?! De accu is weg!' }, cam: () => { const d = drone.g.position; return { pos: V3(d.x + 1.6, d.y + 0.4, d.z + 2.2), look: d.clone() }; } },
      {
        dur: 4.2,
        say: { who: 'OTIS', text: 'GRRR. Woef! Woef woef!', sub: tr('Daar! Iets heeft de accu meegenomen. Naar dat rode lampje!') },
        start() { otis.setMood('bark', 3); },
        cam: pan(V3(6, 3, 31), V3(4, 2, 20), V3(3, 7, 28), TELESCOPE),
      },
      { say: { who: BYTE(), text: 'Dan gaan we daarheen. Otis past op de raket. Kom op, Josh!' }, cam: behindJosh },
    ], () => {
      if (save.cp) { P.pos.fromArray(save.cp); P.vel.set(0, 0, 0); }   // already played before: back to your checkpoint
      save.intro = true; persist(); ctx.resetCam();
    });
  }

  // ---------- the Lichtvreter wakes up ----------
  function bossIntro() {
    boss.hold = true;
    const B = () => boss.pos.clone();
    play([
      {
        dur: 2.6,
        cam: () => { const b = B(); return { pos: V3(b.x + 8, b.y - 1, b.z + 11), look: b }; },
        update(dt, k) { if (k > 0.65) ctx.shake(0.25); },
      },
      { say: { who: BYTE(), text: 'Dat is hem. De Lichtvreter! Hij gloeit van al het licht dat hij heeft opgeslokt.' }, cam: () => { const b = B(); return { pos: V3(P.pos.x + 2, P.pos.y + 2.4, P.pos.z + 5), look: b }; } },
      { say: { who: BYTE(), text: 'Als hij neerploft is hij even duizelig. Dan steekt onze accu uit zijn kop. Daar springen!' }, cam: () => { const b = B(); return { pos: V3(P.pos.x - 2, P.pos.y + 2, P.pos.z + 5), look: b }; } },
    ], () => { boss.hold = false; ctx.resetCam(); });
  }

  // ---------- the light comes back ----------
  function bossWin() {
    const C = ARENA_POS;
    play([
      {
        dur: 5,
        start() { lit = true; setNpcLight(true); },
        cam: (k) => { const a = 0.4 + k * 1.4; return { pos: V3(C.x + Math.sin(a) * 30, C.y + 14, C.z + Math.cos(a) * 30), look: V3(C.x, C.y + 2, C.z - 6) }; },
      },
      { dur: 3, cam: pan(V3(-8, 26, -40), V3(0, 4, -30), V3(-6, 12, 0), V3(0, 2, -36)) },
      { say: { who: 'OTIS', text: 'WOEF WOEF WOEF!', sub: tr('De accu! Hij zit weer in de raket!') }, start() { otis.setMood('happy', 8); }, cam: otisCam(2.8, 1.4, 3) },
      { say: { who: 'MILO', text: 'Ik… ik wist het. Geen moment getwijfeld. Echt niet.' }, cam: () => ({ pos: V3(MILO_AT.x + 2.4, 2.2, MILO_AT.z + 3), look: V3(MILO_AT.x, 1.2, MILO_AT.z) }) },
    ], () => ctx.resetCam());
  }

  // ---------- take off ----------
  function launch(go) {
    const hatch = rocket.localToWorld(V3(1.2, 0, 1.3)); hatch.y = 0;
    play([
      {
        dur: 1.8,
        start() {
          otis.walkTo(hatch, 4, () => otis.jump(6));
          ctx.hideJosh = true; drone.g.visible = false;
          puff(P.pos.clone().add(V3(0, 0.8, 0)), 8, 0xffffff, 2, 1);
        },
        update(dt, k) { if (k > 0.75) otis.root.visible = false; },
        cam: shot(V3(13, 4, 32), V3(4, 2, 22)),
      },
      { dur: 99, start: go, cam: () => ({ pos: V3(15, 2, 38), look: rocket.position.clone().add(V3(0, 2, 0)) }) },
    ]);
  }

  function restoreLight() { lit = true; setNpcLight(true); }

  function update(dt, t) {
    updateAmbient(dt, t);
    const near = P.pos.distanceTo(otis.root.position) < 4;
    if (near && !otisNear && otis.mood === 'idle' && !otis.walk) otis.setMood(lit ? 'happy' : 'bark', 1.2);
    otisNear = near;
    otis.update(dt, t, P.pos);
  }

  function start() { if (!save.intro) intro(); }

  // back from another planet: Otis hops out of the rocket again
  function landed() { otis.root.visible = true; otis.walk = null; otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('happy', 2); }
  return { start, bossIntro, bossWin, launch, restoreLight, update, landed };
}
