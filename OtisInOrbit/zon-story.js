import { THREE, scene, toon, addOutline, V3, puff, damp, toast } from './core.js';
import { buildOtis } from './otis.js';
import { addSpeaker } from './bubbles.js';
import { play, shot, pan } from './cutscene.js';
import * as sfx from './sfx.js';
import { groundAt, ARENA, MAGMA_Y } from './zon-terrain.js';
import { rocket, FLAGS, anim, updateRafts, RAFTS } from './zon-world.js';
import { boss } from './zon-boss.js';
import { setAbilityProbe, poundAt, wakeAll } from './zon-npc.js';
import { updateTrials, trialPound } from './zon-trials.js';

export function setupStory(ctx) {
  const { P, drone, save, persist } = ctx;
  const BYTE = () => (ctx.LOOK.droneName || 'Byte').toUpperCase();
  const tr = (s) => `${ctx.LOOK.droneName || 'Byte'} vertaalt: “${s}”`;
  const KROON = V3(ARENA.x, 2, ARENA.z);
  setAbilityProbe(() => P.ability);

  // ---------- Otis: his paws are hot ----------
  const otis = buildOtis(groundAt);
  const OTIS_HOME = V3(9, 0, 47.5);
  otis.place(OTIS_HOME.x, OTIS_HOME.z);
  const OTIS_BEFORE = ['Woef! Woef!', '*springt van poot naar poot: heet heet heet*', `Woef?<small>${tr('Adam zit daar onder die parasol. Volgens mij ziet hij niks.')}</small>`, `Woef woef.<small>${tr('Ik blijf bij de raket. Die staat tenminste stil.')}</small>`];
  const OTIS_AFTER = ['Woef!', `Woef woef!<small>${tr('De chinchillas springen weer! Ze springen zelfs over mij heen.')}</small>`, '*rolt door het zonnestof, net als de chinchillas*', `Woef?<small>${tr('Druk op E bij de raket: dan kies je waar we heen vliegen.')}</small>`];
  addSpeaker(otis.root, { y: 1.7, radius: 5, linger: 12, lines: () => (save.boss ? OTIS_AFTER : OTIS_BEFORE) });
  const waves = [];
  for (const f of FLAGS) waves.push(f);

  // ---------- Kayo & Yara: two cats on a little flying saucer ----------
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

  // ---------- after the boss ----------
  function restoreLight() { wakeAll(); }

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
        update(dt, k) { rocket.position.y = 45 * Math.pow(1 - k, 2); if (Math.random() < 0.8) puff(rocket.localToWorld(V3(0, -0.2, 0)), 2, 0xffd27a, 2, -2); },
        finish() { rocket.position.copy(land); puff(land.clone().add(V3(0, 0.3, 0)), 30, 0xf2c27a, 8, 1); ctx.shake(0.4); sfx.land(); },
        cam: () => ({ pos: V3(-10, 4, 62), look: rocket.position.clone().add(V3(0, 2, 0)) }),
      },
      {
        dur: 1.8,
        start() { otis.root.visible = true; otis.root.position.copy(rocket.localToWorld(V3(0, 2.5, 1))); otis.jump(5); },
        update(dt, k) {
          otis.root.position.x += (OTIS_HOME.x - otis.root.position.x) * damp(3, dt);
          otis.root.position.z += (OTIS_HOME.z - otis.root.position.z) * damp(3, dt);
          if (k > 0.45 && ctx.hideJosh) { ctx.hideJosh = false; drone.g.visible = true; P.pos.set(3.5, 0.5, 47.5); P.vel.set(-1, 7, 1.5); }
        },
        finish() { otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('shake', 1.2); ctx.hideJosh = false; drone.g.visible = true; },
        cam: shot(V3(-4, 3, 58), V3(5, 1, 46)),
      },
      { say: { who: 'OTIS', text: 'WOEF! Woef woef!', sub: tr('HEET! Mijn pootjes! Wie landt er nou op de ZON?!') }, cam: otisCam },
      { say: { who: BYTE(), text: 'Jij. Jij landt op de zon. Maar Adam is hier ergens, en hij stuurde een noodsignaal.' }, cam: behindJosh },
      { dur: 4.5, say: { who: BYTE(), text: 'Kijk: de grond drijft. Stukken korst varen over het magma en leggen af en toe aan.' }, cam: pan(V3(-8, 7, 40), V3(-12, 0, 22), V3(14, 7, 40), V3(14, 0, 18)) },
      { dur: 4, say: { who: BYTE(), text: 'Wacht tot er een vlot naast je ligt en stap over. Of spring. Niet in het magma vallen, dat is erg heet.' }, cam: pan(V3(-30, 10, 16), V3(-26, 0, 2), V3(-14, 12, -20), V3(-12, 0, -40)) },
      { dur: 4.5, say: { who: BYTE(), text: 'En helemaal achteraan, die gouden kroon… daar beweegt iets in het magma.' }, cam: pan(V3(0, 12, -30), KROON, V3(10, 9, -50), KROON) },
      { say: { who: BYTE(), text: 'Eerst Adam zoeken. Hij zit vast bij de parasol, links van de raket.' }, cam: behindJosh },
    ], () => { save.intro = true; persist(); ctx.resetCam(); });
  }
  const arenaCam = (dx, dy, dz, ly = 4) => () => ({ pos: V3(ARENA.x + dx, dy, ARENA.z + dz), look: V3(ARENA.x, ly, ARENA.z - 8) });
  const catCam = () => ({ pos: saucer.position.clone().add(V3(1.5, 0.6, 4.2)), look: saucer.position.clone().add(V3(0, 0.9, 0)) });
  function bossIntro() {
    if (boss.met) return;
    boss.met = true; boss.hold = true;
    play([
      { dur: 2.4, cam: arenaCam(10, 6, 12, 4) },
      { dur: 2, start() { saucerOn = true; saucerT = 0; saucer.visible = true; sfx.whir(); }, cam: catCam },
      { say: { who: 'KAYO', text: 'Kijk eens wie daar is, Yara. Het jongetje met de drone.' }, cam: catCam },
      { say: { who: 'YARA', text: 'En hij ruikt naar schroot. Ratjetoe heeft het verknald, hè?' }, cam: catCam },
      { say: { who: 'KAYO', text: 'Al die chinchillas werken nu voor ons. Ze rollen in zonnestof, en dat verkopen wij als glitter.' }, cam: catCam },
      { say: { who: 'YARA', text: 'Kassa! Miauw.' }, cam: catCam },
      { say: { who: BYTE(), text: 'Laat ze gaan! En Adam ook!' }, cam: atJosh },
      { say: { who: 'KAYO', text: 'Wij moeten verder. Speel maar even met ons huisdiertje.' }, cam: catCam },
      { dur: 2.2, say: { who: 'ZONNEVLAM-SLANG', text: 'SSSSSSSSSS…' }, start() { saucerOn = 'leave'; saucerT = 0; ctx.shake(0.4); }, cam: arenaCam(4, 4, 6, 6) },
    ], () => { boss.hold = false; saucer.visible = false; saucerOn = false; ctx.resetCam(); toast('Ontwijk de slang. Bijt hij in de vloer? Spring op zijn kop en doe een ground pound op het juweel!'); });
  }
  function bossWin() {
    wakeAll();
    play([
      { dur: 2.4, cam: arenaCam(9, 6, 10, 1) },
      { say: { who: BYTE(), text: 'De slang is weg. En het juweel is kapot: geen draai-ogen meer!' }, cam: atJosh },
      { dur: 3.2, say: { who: BYTE(), text: 'Kijk, op de vlotten: de chinchillas springen weer.' }, cam: () => { const r = RAFTS.stof; return { pos: V3(r.x + 6, 5, r.z + 9), look: V3(r.x, 1, r.z) }; } },
      { say: { who: BYTE(), text: 'Kayo & Yara zijn er wel weer vandoor. Maar we komen steeds dichterbij.' }, cam: atJosh },
    ], () => ctx.resetCam());
  }
  function launch(go) {
    const hatch = rocket.localToWorld(V3(1.2, 0, 1.3)); hatch.y = 0;
    play([
      { dur: 1.8, start() { otis.walkTo(hatch, 4, () => otis.jump(6)); ctx.hideJosh = true; drone.g.visible = false; }, update(dt, k) { if (k > 0.75) otis.root.visible = false; }, cam: shot(V3(-4, 4, 58), V3(6, 2, 44)) },
      { dur: 99, start: go, cam: () => ({ pos: V3(-6, 2, 60), look: rocket.position.clone().add(V3(0, 2, 0)) }) },
    ]);
  }

  // ---------- every frame ----------
  let prevPound = 0;
  function update(dt, t) {
    for (const f of anim) f(t, dt);
    updateRafts(t);
    // a ground pound wakes up a hypnotised chinchilla next to you
    if (prevPound === 2 && P.pound === 0 && P.grounded) { poundAt(P.pos); trialPound(P.pos); }
    updateTrials(dt, t, P);
    prevPound = P.pound;
    // magma: too hot to touch
    if (P.pos.y < MAGMA_Y + 0.15 && !ctx.hideJosh) {
      puff(P.pos.clone().add(V3(0, 0.5, 0)), 20, 0xffa040, 5, 2); sfx.hurt();
      ctx.respawn('Au, HEET! Terug naar je laatste checkpoint');
    }
    // the saucer with the cats
    if (saucerOn) {
      saucerT += dt;
      if (saucerOn === true) saucer.position.lerpVectors(SAUCER_AT.clone().add(V3(0, 14, -10)), SAUCER_AT, Math.min(1, saucerT / 1.6));
      else saucer.position.add(V3(dt * 6, dt * 10, -dt * 14));
      saucer.position.y += Math.sin(t * 2) * 0.01;
      saucer.rotation.y = Math.PI + Math.sin(t) * 0.2;
      for (const k in cats) { cats[k].tail.rotation.x = Math.sin(t * 3 + (k === 'kayo' ? 0 : 1)) * 0.3; cats[k].head.rotation.y = Math.sin(t * 0.8) * 0.2; }
    }
    waves.forEach((f, i) => { f.mat.color.setHex(save.cp && Math.hypot(save.cp[0] - f.pos.x, save.cp[2] - f.pos.z) < 0.5 ? 0x7dff9a : 0x9a948a); });
    otis.update(dt, t, P.pos);
  }
  function landed() { otis.root.visible = true; otis.walk = null; otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('happy', 2); }
  return { start() { if (!save.intro) arrival(); }, bossIntro, bossWin, restoreLight, launch, update, landed };
}
