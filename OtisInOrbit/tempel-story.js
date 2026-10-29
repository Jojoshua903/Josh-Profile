import { THREE, scene, V3, puff, damp, toast } from './core.js?v=sub1';
import { play, shot, pan } from './cutscene.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { rocket, setRocket, updateWorld, FLAGS, TRAVEL, WRECK, BASE_AT, OTIS_AT, BYTE_AT, MURAL } from './tempel-world.js?v=sub1';
import { ZIG } from './tempel-terrain.js?v=sub1';
import { otis, setDrone, droneOff, noScan, noScanMsg, byteWhole, otisWell } from './tempel-npc.js?v=sub1';
import { updateTrials } from './tempel-trials.js?v=sub1';

export function setupStory(ctx) {
  const { P, drone, save, persist } = ctx;
  const BYTE = () => (ctx.LOOK.droneName || 'Byte');
  setDrone(drone);

  // the rocket only goes again once it's fixed
  TRAVEL.locked = () => !save.rocket;
  Object.defineProperty(TRAVEL, 'lockedMsg', {
    get() {
      const need = [];
      if (!otisWell()) need.push('Otis moet eerst beter worden');
      if (!byteWhole()) need.push(`${BYTE()} moet weer heel zijn`);
      return `De raket is kapot. ${need.join(' en ')}.`;
    },
  });

  // ---------- the crash ----------
  const bolts = [];
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xff2a4a, fog: false });
  function laser(from, to) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1, 6), boltMat);
    scene.add(m); bolts.push({ m, from: from.clone(), to: to.clone(), t: 0 });
    sfx.zap();
  }
  function updateBolts(dt) {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.t += dt * 1.6;
      const a = b.from.clone().lerp(b.to, Math.min(1, b.t)), c = b.from.clone().lerp(b.to, Math.min(1, b.t + 0.08));
      b.m.position.lerpVectors(a, c, 0.5); b.m.scale.set(1, Math.max(0.1, a.distanceTo(c)), 1);
      b.m.quaternion.setFromUnitVectors(V3(0, 1, 0), V3().subVectors(c, a).normalize());
      if (b.t >= 1) { scene.remove(b.m); bolts.splice(i, 1); }
    }
  }
  const SKY = V3(-40, 70, 60), HIT = V3(-10, 48, 30), LAND = V3(WRECK.x, 0.55, WRECK.z);
  function arrival() {
    const josh = () => ({ pos: V3(P.pos.x + 2.2, P.pos.y + 1.6, P.pos.z + 3.4), look: P.pos.clone().add(V3(0, 0.8, 0)) });
    const otisCam = shot(V3(OTIS_AT.x + 2, OTIS_AT.y + 1.4, OTIS_AT.z + 2.6), OTIS_AT.clone().add(V3(0, 0.3, 0)));
    const byteCam = shot(V3(BYTE_AT.x + 1.4, BYTE_AT.y + 1, BYTE_AT.z + 1.8), BYTE_AT.clone().add(V3(0, 0.1, 0)));
    play([
      {
        dur: 3,
        say: { who: BYTE().toUpperCase(), text: 'Daar is het! De basis van Kayo & Yara. We vliegen er gewoon heen en—' },
        start() { ctx.hideJosh = true; otis.root.visible = false; rocket.rotation.set(-0.5, 0, 0); },
        update(dt, k) { rocket.position.lerpVectors(SKY, HIT, k * 0.6); if (Math.random() < 0.7) puff(rocket.localToWorld(V3(0, -0.2, 0)), 2, 0xffd27a, 2, -2); },
        cam: () => ({ pos: rocket.position.clone().add(V3(6, 3, 10)), look: BASE_AT }),
      },
      {
        dur: 2.2,
        say: { who: 'KAYO', text: '*via een speaker* Indringer gedetecteerd. Afweersysteem: AAN. Miauw.' },
        start() { for (let i = 0; i < 4; i++) setTimeout(() => laser(BASE_AT, rocket.position.clone().add(V3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, 0))), i * 380); sfx.wake(); },
        update(dt, k) { rocket.position.lerpVectors(SKY, HIT, 0.6 + k * 0.4); updateBolts(dt); },
        cam: () => ({ pos: rocket.position.clone().add(V3(-8, 4, 12)), look: rocket.position }),
      },
      {
        dur: 2.6,
        start() { laser(BASE_AT, HIT); setTimeout(() => { ctx.shake(0.8); sfx.smash(); puff(rocket.position.clone(), 40, 0xff8a3d, 10, 2); }, 500); },
        update(dt, k) {
          updateBolts(dt);
          if (k < 0.2) return;
          const u = (k - 0.2) / 0.8;
          rocket.position.lerpVectors(HIT, LAND, u * u);
          rocket.rotation.x += dt * 9; rocket.rotation.z += dt * 5;
          if (Math.random() < 0.9) puff(rocket.position.clone(), 3, Math.random() < 0.5 ? 0x5a5a5a : 0xff8a3d, 3, 1);
        },
        cam: () => ({ pos: V3(-8, 14, 46), look: rocket.position }),
      },
      {
        dur: 1.8,
        start() {
          setRocket(false); rocket.position.set(WRECK.x, 0.55, WRECK.z);
          ctx.shake(1); sfx.smash(); sfx.land();
          puff(LAND.clone().add(V3(0, 0.5, 0)), 60, 0xd8a070, 14, 2);
          // three sparks fly off into the temple: Byte's parts
          for (const to of [V3(-24, 6, -0.4), V3(23.5, 8, 1.5), V3(0, 20, -44)]) for (let i = 0; i < 6; i++) setTimeout(() => puff(LAND.clone().lerp(to, i / 5), 4, 0x5ef2e0, 2, 1), i * 120);
        },
        cam: shot(V3(-6, 6, 40), V3(WRECK.x, 1, WRECK.z)),
      },
      { dur: 3.4, say: { who: 'JOSH', text: 'Au… au au au.' }, start() { ctx.hideJosh = false; otis.root.visible = true; P.pos.set(0, -0.4, 27.5); P.vel.set(0, 0, 0); }, cam: josh },
      { say: { who: 'OTIS', text: '*jankt*' }, cam: otisCam },
      { say: { who: 'JOSH', text: 'Otis! Je poot… blijf liggen, maatje. Niet bewegen.' }, cam: otisCam },
      { say: { who: 'JOSH', text: `En ${BYTE()}…? ${BYTE()}!` }, cam: byteCam },
      { say: { who: BYTE().toUpperCase(), text: '…bzzt… pro-propeller… lens… antenne… w-weg… alles… w…' }, cam: byteCam, start() { sfx.zap(); } },
      { say: { who: 'JOSH', text: `${BYTE()}? …Hij doet niks meer.` }, cam: byteCam },
      { dur: 4.4, say: { who: 'JOSH', text: 'Zijn onderdelen zijn de tempel in gevlogen. Een daar, een daar… en eentje helemaal bovenop die piramide.' }, cam: pan(V3(-4, 6, 36), V3(-24, 2, 0), V3(10, 14, 30), V3(0, ZIG.L4, -44)) },
      { dur: 3.6, say: { who: 'JOSH', text: 'Iemand heeft deze tempel lang geleden verlaten. Alles zit nog op slot… met puzzels.' }, cam: pan(V3(0, 4, 0), V3(MURAL.x, 4, MURAL.z), V3(-6, 5, -2), V3(MURAL.x, 3, MURAL.z)) },
      { say: { who: 'JOSH', text: `Oké. Eerst Otis helpen en ${BYTE()} weer in elkaar zetten. Dan maken we de raket. Dan gaan we terug. En dan winnen we.` }, cam: josh },
    ], () => { save.intro = true; persist(); ctx.resetCam(); toast(`${BYTE()} is kapot: je kunt niets kopiëren. Zoek zijn propeller!`); });
  }

  function launch(go) {
    const hatch = rocket.localToWorld(V3(1.2, 0, 1.3)); hatch.y = rocket.position.y;
    play([
      { dur: 1.8, start() { otis.walkTo(hatch, 4, () => otis.jump(6)); ctx.hideJosh = true; drone.g.visible = false; }, update(dt, k) { if (k > 0.75) otis.root.visible = false; }, cam: shot(V3(WRECK.x - 6, 4, WRECK.z + 8), V3(WRECK.x, 2.5, WRECK.z)) },
      { dur: 99, start: go, cam: () => ({ pos: V3(WRECK.x - 7, 3, WRECK.z + 10), look: rocket.position.clone().add(V3(0, 2, 0)) }) },
    ]);
  }
  function landed() { otis.root.visible = true; otis.walk = null; otis.place(OTIS_AT.x + 1.2, OTIS_AT.z + 0.6); otis.setMood('happy', 2); }

  function update(dt, t) {
    updateWorld(t, dt);
    updateTrials(dt, t, P);
    updateBolts(dt);
    for (const f of FLAGS) f.mat.color.setHex(save.cp && Math.hypot(save.cp[0] - f.pos.x, save.cp[2] - f.pos.z) < 0.5 ? 0x7dff9a : 0x9a948a);
  }
  void damp;
  return { start() { if (!save.intro) arrival(); }, restoreLight() {}, bossIntro() {}, bossWin() {}, launch, update, landed, droneOff, noScan, noScanMsg };
}
