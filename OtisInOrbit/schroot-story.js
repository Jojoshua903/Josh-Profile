import { THREE, scene, V3, puff, damp, toast } from './core.js?v=sub1';
import { buildOtis } from './otis.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { play, shot, pan } from './cutscene.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { groundAt, ARENA, PLATEAU_H } from './schroot-terrain.js?v=sub1';
import { lamps, rocket, FLAGS, anim, POWER, FAN, PRESS, ROBOT, BROKEN_PART, SHED, SINKERS } from './schroot-world.js?v=sub1';
import { boss } from './schroot-boss.js?v=sub1';
import { setAbilityProbe, fionnPower } from './schroot-npc.js?v=sub1';

export function setupStory(ctx) {
  const { P, drone, save, persist } = ctx;
  const BYTE = () => (ctx.LOOK.droneName || 'Byte').toUpperCase();
  const tr = (s) => `${ctx.LOOK.droneName || 'Byte'} vertaalt: “${s}”`;
  const TOP = V3(ARENA.x, PLATEAU_H + 4, ARENA.z - 10);
  setAbilityProbe(() => P.ability);

  // ---------- Otis ----------
  const otis = buildOtis(groundAt);
  const OTIS_HOME = V3(9, 0, 47.5);
  otis.place(OTIS_HOME.x, OTIS_HOME.z);
  const OTIS_BEFORE = ['Woef…', '*snuffelt aan een oude band*', `Woef.<small>${tr('Ik heb echt héél voorzichtig geland. Echt.')}</small>`, `Woef woef?<small>${tr('Zonder stuwkop komen we nergens. Fionn heeft er misschien een.')}</small>`];
  const OTIS_AFTER = ['Woef!', `Woef woef!<small>${tr('De stuwkop zit erop. We kunnen weer weg!')}</small>`, '*kwispelt naar de raket*', `Woef?<small>${tr('Druk op E bij de raket: dan kies je waar we heen vliegen.')}</small>`];
  addSpeaker(otis.root, { y: 1.7, radius: 5, linger: 12, lines: () => (save.boss ? OTIS_AFTER : OTIS_BEFORE) });
  const waves = lamps.filter((l) => l.wave);

  // ---------- after the boss: the rocket is repaired ----------
  function restoreLight() { BROKEN_PART.visible = false; rocket.rotation.set(0, -0.4, 0); }

  // ---------- Vonk: walk up to a power box and its machine comes back to life ----------
  const POWER_SHOTS = {
    poort: ['De poort van de fabriek gaat open!', V3(39, 9.5, 20), V3(42, 8, 10)],
    ventilator: ['De ventilator blaast weer!', V3(43, 11, 7), V3(38, 8, 3)],
    robot: ['De oude robot wordt wakker!', V3(42, 10, 6), V3(46, 8, 1)],
    kabelbaan: ['De kabelbaan naar De Top rijdt weer!', V3(48, 19, 2), V3(34, 15, -30)],
    lift: ['De lift naar het dak doet het weer!', V3(28, 12, 10), V3(34, 10, 4)],
  };
  const powered = new Set(save.power || []);
  for (const p of POWER) if (powered.has(p.id)) p.set(true, true);
  const hinted = new Set();
  function updatePower() {
    for (const p of POWER) {
      if (p.on) { p.zapped = false; continue; }
      // walking past one just tells you what it needs; a spark (F, with Vonk) switches it on
      const d = Math.hypot(P.pos.x - p.pos.x, P.pos.z - p.pos.z);
      const hk = p.id + (P.ability === 'vonk' ? '+' : '');
      if (d < 2.6 && Math.abs(P.pos.y - p.pos.y) < 2 && !hinted.has(hk)) {
        hinted.add(hk);
        toast(P.ability === 'vonk' ? 'Schiet een vonk in de kast: druk op F' : 'Deze kast is helemaal dood. Er moet stroom in…');
      }
      if (!p.zapped) continue;
      p.zapped = false;
      if (p.id === 'fionn') {
        if (!fionnPower()) { toast('Fionn: Ho, nog niet! Er hangt nog geen schotel op mijn dak.'); continue; }
      }
      p.set(true); powered.add(p.id); save.power = [...powered]; persist();
      sfx.zap(); puff(p.pos.clone().add(V3(0, 1.4, 0)), 16, 0xffe14a, 4, 2);
      if (!POWER_SHOTS[p.id]) continue;
      const [msg, from, look] = POWER_SHOTS[p.id];
      toast(msg);
      play([{ dur: 2.4, start() { ctx.shake(0.2); sfx.whir(); }, cam: pan(from, look, from.clone().add(V3(0, 1.5, 0)), look) }], () => ctx.resetCam());
    }
  }
  // the robot hands you its cookie
  const robot = { k: 0, gave: false };
  function giveRobotCookie() {
    if (robot.gave) return;
    robot.gave = true;
    const at = ROBOT.at.clone().add(V3(-0.6, 1.6, 1.2));
    if (!save.got.includes(ROBOT.name)) { addCookie(at.x, at.y, at.z, ROBOT.name); puff(at.clone(), 18, 0xb79cff, 4, 2); }
  }
  if (ROBOT.on) { robot.k = 1; giveRobotCookie(); }
  function updateRobot(dt, t) {
    if (!ROBOT.on) return;
    robot.k = Math.min(1, robot.k + dt / 1.5);
    const { head, arm, eyeMat } = ROBOT.parts, e = robot.k * robot.k * (3 - 2 * robot.k);
    head.rotation.x = 0.5 * (1 - e) + Math.sin(t * 1.5) * 0.05 * e; head.rotation.z = 0.3 * (1 - e);
    arm.rotation.x = -1.2 * e + Math.sin(t * 2) * 0.1 * e;
    eyeMat.color.setHex(e > 0.3 ? 0xffe14a : 0x2a2e34);
    if (robot.k >= 1) giveRobotCookie();
  }
  // the fan's updraft
  function updateFan(dt) {
    if (!FAN.on) return;
    FAN.blades.rotation.y += dt * 18;
    if (Math.random() < 0.5) puff(V3(FAN.x + (Math.random() - 0.5) * 2, 0.6, FAN.z + (Math.random() - 0.5) * 2), 1, 0xffffff, 1, -4);
    if (Math.hypot(P.pos.x - FAN.x, P.pos.z - FAN.z) < 1.6 && P.pos.y < FAN.top) P.vel.y = Math.max(P.vel.y, 11);
  }
  // the press: standing under it when it comes down hurts
  function updatePress() {
    const h = PRESS.head; if (!PRESS.falling) return;
    const bottom = h.pos.y - 0.6;
    if (Math.abs(P.pos.x - PRESS.x) < 1.5 && Math.abs(P.pos.z - PRESS.z) < 1.5 && P.pos.y < bottom && P.pos.y + 1.6 > bottom - 0.3) {
      ctx.hurt(h.pos.clone().add(V3(Math.random() - 0.5, 0, Math.random() - 0.5)));
    }
  }

  // ---------- cutscenes ----------
  const otisCam = () => { const o = otis.root.position; return { pos: V3(o.x + 2.2, o.y + 1.1, o.z + 2.6), look: V3(o.x, o.y + 0.7, o.z) }; };
  const behindJosh = () => ({ pos: V3(P.pos.x + 1.5, P.pos.y + 2.8, P.pos.z + 7), look: V3(P.pos.x, P.pos.y + 3, P.pos.z - 8) });
  const atJosh = () => ({ pos: V3(P.pos.x + 2, P.pos.y + 2, P.pos.z + 4), look: P.pos.clone().add(V3(0, 1.2, 0)) });
  function arrival() {
    const land = rocket.position.clone(), partAt = BROKEN_PART.position.clone();
    play([
      {
        dur: 2.6,
        start() { ctx.hideJosh = true; drone.g.visible = false; otis.root.visible = false; rocket.position.y = 45; BROKEN_PART.visible = false; },
        update(dt, k) { rocket.position.y = 45 * Math.pow(1 - k, 2); if (Math.random() < 0.8) puff(rocket.localToWorld(V3(0, -0.2, 0)), 2, k > 0.6 ? 0x5a5a62 : 0xffb45e, 2, -2); },
        finish() { rocket.position.copy(land); puff(land.clone().add(V3(0, 0.3, 0)), 30, 0xd9a878, 8, 1); ctx.shake(0.7); sfx.smash(); },
        cam: () => ({ pos: V3(-10, 4, 62), look: rocket.position.clone().add(V3(0, 2, 0)) }),
      },
      {
        dur: 1.2,
        start() { BROKEN_PART.visible = true; BROKEN_PART.position.copy(land).add(V3(0, 1, 0)); sfx.clank(); },
        update(dt, k) { BROKEN_PART.position.lerpVectors(land, partAt, k); BROKEN_PART.position.y = 1 + Math.sin(k * Math.PI) * 3 - k * 0.65; BROKEN_PART.rotation.x += dt * 10; },
        finish() { BROKEN_PART.position.copy(partAt); BROKEN_PART.rotation.set(1.3, 0.4, 0.2); puff(partAt.clone(), 10, 0x5a5a62, 3, 1); },
        cam: shot(V3(2, 3, 56), V3(8, 1, 46)),
      },
      {
        dur: 1.6,
        start() { otis.root.visible = true; otis.root.position.copy(rocket.localToWorld(V3(0, 2.5, 1))); otis.jump(5); },
        update(dt, k) {
          otis.root.position.x += (OTIS_HOME.x - otis.root.position.x) * damp(3, dt);
          otis.root.position.z += (OTIS_HOME.z - otis.root.position.z) * damp(3, dt);
          if (k > 0.45 && ctx.hideJosh) { ctx.hideJosh = false; drone.g.visible = true; P.pos.set(3.5, 0.5, 47.5); P.vel.set(-1, 7, 1.5); }
        },
        finish() { otis.place(OTIS_HOME.x, OTIS_HOME.z); ctx.hideJosh = false; drone.g.visible = true; },
        cam: shot(V3(-4, 3, 58), V3(5, 1, 46)),
      },
      { say: { who: 'OTIS', text: 'Woef… *kuch*', sub: tr('Ik heb hem echt héél voorzichtig geland. Echt.') }, cam: otisCam },
      { say: { who: BYTE(), text: 'De stuwkop is aan gort. Zonder stuwkop komen we nergens meer.' }, cam: shot(V3(11, 2, 50), partAt) },
      { dur: 4, say: { who: BYTE(), text: 'Op een schroothoop moet toch íémand wonen die onderdelen heeft…' }, cam: pan(V3(-6, 4, 56), V3(-14, 2, 44), V3(-18, 5, 52), SHED.clone().add(V3(0, 2, 0))) },
      { dur: 4.5, say: { who: BYTE(), text: 'En kijk daar, helemaal achteraan op De Top. Iemand heeft daar een hele berg schroot neergegooid.' }, cam: pan(V3(0, 8, 30), V3(10, 10, -30), V3(4, 24, 20), TOP) },
      { dur: 5.5, say: { who: BYTE(), text: 'Vijf hopen schroot, allemaal met bruggen verbonden. En overal daartussen: olie. Daar wil je niet in.' }, cam: pan(V3(-34, 20, 34), V3(-42, 4, 4), V3(34, 20, 34), V3(42, 6, 4)) },
      { say: { who: BYTE(), text: 'Eerst maar eens iemand zoeken die een stuwkop heeft.' }, cam: behindJosh },
    ], () => { save.intro = true; persist(); ctx.resetCam(); });
  }
  const mechCam = (dx, dy, dz) => () => ({ pos: V3(ARENA.x + dx, PLATEAU_H + dy, ARENA.z + dz), look: V3(ARENA.x, PLATEAU_H + 4, ARENA.z - 10) });
  function bossIntro() {
    if (boss.met) return;
    boss.met = true; boss.hold = true;
    play([
      { dur: 2.4, cam: pan(V3(ARENA.x + 8, PLATEAU_H + 5, ARENA.z + 4), V3(ARENA.x, PLATEAU_H + 3, ARENA.z - 10), V3(ARENA.x + 3, PLATEAU_H + 4, ARENA.z - 4), V3(ARENA.x, PLATEAU_H + 3.2, ARENA.z - 10)) },
      { say: { who: 'RATJETOE', text: 'Ho ho! Wie hebben we daar? Kayo & Yara zeiden al dat er een jongen met een drone zou komen.' }, cam: shot(V3(ARENA.x + 2, PLATEAU_H + 4, ARENA.z - 6), V3(ARENA.x, PLATEAU_H + 3.4, ARENA.z - 10)) },
      { say: { who: 'RATJETOE', text: 'Mooie drone heb je. Met wat schroot eromheen wordt dat een reus!' }, cam: shot(V3(ARENA.x + 2, PLATEAU_H + 4, ARENA.z - 6), V3(ARENA.x, PLATEAU_H + 3.4, ARENA.z - 10)) },
      { say: { who: BYTE(), text: 'Josh… er zit iets… in mijn systeem… *BLIEP*' }, start() { boss.hacked = true; sfx.hack(); ctx.shake(0.3); }, cam: atJosh },
      { dur: 4, start() { boss.build = true; }, cam: pan(V3(ARENA.x + 10, PLATEAU_H + 3, ARENA.z), V3(ARENA.x, PLATEAU_H + 3, ARENA.z - 10), V3(ARENA.x + 6, PLATEAU_H + 6, ARENA.z - 1), V3(ARENA.x, PLATEAU_H + 5, ARENA.z - 10)) },
      { say: { who: 'RATJETOE', text: 'HAHA! Kijk hem groeien! Jouw drone IS nu de Schrootmech!' }, cam: mechCam(4, 6, -1) },
      { say: { who: BYTE(), text: 'DOELWIT… GEVONDEN… Josh, ik kan niet stoppen! Ren!' }, cam: mechCam(2, 4, -3) },
    ], () => { boss.hold = false; ctx.resetCam(); toast('Zonder Byte geen krachten. Pak schroot op. Zit zijn vuist vast? Kijk naar hem en gooi met E!'); });
  }
  function bossWin() {
    restoreLight();
    play([
      { dur: 2.4, cam: pan(V3(ARENA.x + 9, PLATEAU_H + 6, ARENA.z + 6), V3(ARENA.x, PLATEAU_H + 1, ARENA.z - 4), V3(ARENA.x + 4, PLATEAU_H + 4, ARENA.z + 8), V3(ARENA.x, PLATEAU_H + 1, ARENA.z - 4)) },
      { say: { who: 'RATJETOE', text: '(in de verte) Kayo & Yara gaan dit NIET leuk vinden!' }, cam: shot(V3(ARENA.x, PLATEAU_H + 5, ARENA.z), V3(ARENA.x, PLATEAU_H + 2, ARENA.z - 30)) },
      { say: { who: BYTE(), text: 'Wat… is er gebeurd? Ik was ineens zo GROOT. En waarom ruik ik naar olie?' }, cam: atJosh },
      { say: { who: BYTE(), text: 'Kijk, tussen het schroot: Fionns stuwkop! Pak hem, dan vliegt de raket weer.' }, cam: atJosh },
    ], () => ctx.resetCam());
  }
  function launch(go) {
    const hatch = rocket.localToWorld(V3(1.2, 0, 1.3)); hatch.y = 0;
    play([
      { dur: 1.8, start() { otis.walkTo(hatch, 4, () => otis.jump(6)); ctx.hideJosh = true; drone.g.visible = false; }, update(dt, k) { if (k > 0.75) otis.root.visible = false; }, cam: shot(V3(-4, 4, 58), V3(6, 2, 44)) },
      { dur: 99, start: go, cam: () => ({ pos: V3(-6, 2, 60), look: rocket.position.clone().add(V3(0, 2, 0)) }) },
    ]);
  }

  function update(dt, t) {
    for (const f of anim) f(t, dt);
    // the conveyor belt carries you back towards the landing heap
    if (P.grounded && P.ground && P.ground.belt) P.pos.addScaledVector(P.ground.belt, dt);
    // sinking drums: they fill up while you stand on them and float back up when you're off
    for (const s of SINKERS) {
      const on = P.grounded && P.ground === s.b;
      s.load = on ? Math.min(2.5, s.load + dt) : Math.max(0, s.load - dt * (s.load > 1.2 ? 0.5 : 1.2));
      s.lid.color.setHex(s.load > 0.3 && Math.sin(t * 20) > 0 ? 0xff3a3a : 0xf0b030);
    }
    updatePower();
    updateRobot(dt, t);
    updateFan(dt);
    updatePress();
    waves.forEach((l, i) => { l.wave.rotation.y = Math.sin(t * 3 + i) * 0.35; });
    const cp = save.cp;
    for (const f of FLAGS) f.mat.color.setHex(cp && Math.hypot(cp[0] - f.pos.x, cp[2] - f.pos.z) < 0.5 ? 0x7dff9a : 0x9a948a);
    if (!save.boss && Math.random() < dt * 3) puff(BROKEN_PART.position.clone().add(V3(0, 0.4, 0)), 1, 0x5a5a62, 0.5, 1.5);
    otis.update(dt, t, P.pos);
  }
  function landed() { otis.root.visible = true; otis.walk = null; otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('happy', 2); }
  return { start() { if (!save.intro) arrival(); }, bossIntro, bossWin, restoreLight, launch, update, landed };
}
