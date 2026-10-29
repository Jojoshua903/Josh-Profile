import { THREE, scene, V3, puff, toast } from './core.js?v=sub1';
import { buildOtis } from './otis.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { play, shot, pan } from './cutscene.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { groundAt, ARENA, WATER_Y, CANAL, ROBIN_ROOF } from './regen-terrain.js?v=sub1';
import { rocket, FLAGS, updateWorld, ROBIN_AT, LIFT } from './regen-world.js?v=sub1';
import { boss, crow, mega, sky, MEGA, SEAT, startSky, endSky, flyStep, flyCam } from './regen-boss.js?v=sub1';
import { updateTrials, trialPound } from './regen-trials.js?v=sub1';

export function setupStory(ctx) {
  const { P, drone, save, persist } = ctx;
  const BYTE = () => (ctx.LOOK.droneName || 'Byte').toUpperCase();
  const tr = (s) => `${ctx.LOOK.droneName || 'Byte'} vertaalt: “${s}”`;

  // ---------- Otis: he hates rain ----------
  const otis = buildOtis(groundAt);
  const OTIS_HOME = V3(10.5, 0, 45);
  otis.place(OTIS_HOME.x, OTIS_HOME.z);
  addSpeaker(otis.root, { y: 1.7, radius: 5, linger: 12, lines: () => (save.robin === 'done'
    ? ['Woef!', `Woef woef!<small>${tr('Het is droog! Eindelijk droog!')}</small>`, '*schudt zich uit, voor de laatste keer*']
    : ['*schudt zich uit*', `Woef…<small>${tr('Ik ben nat. Ik ben zó nat.')}</small>`, `Woef?<small>${tr('Hoor jij dat? Daarboven huilt iemand.')}</small>`, `Woef!<small>${tr('Druk op E bij de raket: dan kies je waar we heen vliegen.')}</small>`]) });

  // ---------- cutscenes ----------
  const atJosh = () => ({ pos: V3(P.pos.x + 2, P.pos.y + 2, P.pos.z + 4), look: P.pos.clone().add(V3(0, 1.2, 0)) });
  const R = ROBIN_AT;
  function arrival() {
    const land = rocket.position.clone();
    play([
      {
        dur: 2.6,
        start() { ctx.hideJosh = true; drone.g.visible = false; otis.root.visible = false; rocket.position.y = 45; },
        update(dt, k) { rocket.position.y = land.y + (45 - land.y) * Math.pow(1 - k, 2); if (Math.random() < 0.8) puff(rocket.localToWorld(V3(0, -0.2, 0)), 2, 0xffd27a, 2, -2); },
        finish() { rocket.position.copy(land); puff(land.clone().add(V3(0, 0.3, 0)), 30, 0x8ab8ff, 8, 1); ctx.shake(0.4); sfx.land(); },
        cam: () => ({ pos: V3(-8, 5, 60), look: rocket.position.clone().add(V3(0, 2, 0)) }),
      },
      {
        dur: 1.8,
        start() { otis.root.visible = true; otis.root.position.copy(rocket.localToWorld(V3(0, 2.5, 1))); otis.jump(5); ctx.hideJosh = false; drone.g.visible = true; P.pos.set(3.5, 1.7, 44.5); P.vel.set(-1, 7, -1); },
        update(dt) { otis.root.position.x += (OTIS_HOME.x - otis.root.position.x) * Math.min(1, dt * 3); otis.root.position.z += (OTIS_HOME.z - otis.root.position.z) * Math.min(1, dt * 3); },
        finish() { otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('shake', 1.5); },
        cam: shot(V3(-4, 4, 56), V3(5, 2, 44)),
      },
      { say: { who: 'OTIS', text: 'Woef… *schudt zich uit*', sub: tr('Regen. Natuurlijk is het regen.') }, cam: shot(V3(13, 2, 48), V3(10.5, 0.7, 45)) },
      { dur: 4.4, say: { who: BYTE(), text: 'Een stad! Neon, een luchttrein, een kanaal… en het regent pijpenstelen.' }, cam: pan(V3(-10, 6, 50), V3(0, 4, 20), V3(10, 16, 40), V3(0, 6, -20)) },
      { dur: 4, say: { who: BYTE(), text: 'Wacht. Hoor je dat? Muziek. En… gesnik. Daarboven, op dat dak.' }, start() { sfx.note(0); setTimeout(() => sfx.note(-2), 500); setTimeout(() => sfx.note(-5), 1000); }, cam: pan(V3(R.x + 14, R.y + 4, R.z + 18), V3(R.x, R.y, R.z), V3(R.x + 6, R.y + 3, R.z + 8), V3(R.x, R.y + 1, R.z)) },
      { say: { who: BYTE(), text: 'Daar zit iemand te huilen. Het lijkt wel of het harder gaat regenen als hij harder huilt.' }, cam: atJosh },
      { say: { who: BYTE(), text: 'Zullen we gaan kijken? De luchttrein stopt overal. Of we klimmen gewoon.' }, cam: atJosh },
    ], () => { save.intro = true; persist(); ctx.resetCam(); toast('Iemand huilt op een dak in het noordwesten. Ga kijken!'); });
  }
  const C = V3(ARENA.x, ARENA.y, ARENA.z);
  const arenaCam = (dx, dy, dz, ly = 2) => () => ({ pos: V3(C.x + dx, C.y + dy, C.z + dz), look: V3(C.x, C.y + ly, C.z) });
  // Byte goes MEGA, then Josh jumps on
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  let growFrom = V3(), hopFrom = V3();
  const megaAt = () => V3(P.pos.x - 2.5, P.pos.y + 2.2, P.pos.z + 1);
  const grow = (dur, text) => ({
    dur, say: { who: BYTE(), text },
    start() { sky.grow = true; growFrom = drone.g.position.clone(); mega.g.position.copy(growFrom); mega.g.scale.setScalar(1); mega.g.rotation.set(0, Math.atan2(C.x - P.pos.x, C.z - P.pos.z) + Math.PI, 0); mega.g.visible = true; sfx.whir(); },
    update(dt, k) {
      const e = ease(k);
      mega.g.scale.setScalar(1 + (MEGA - 1) * e * (1 + Math.sin(k * 30) * 0.04 * (1 - k)));
      mega.g.position.lerpVectors(growFrom, megaAt(), e);
      mega.props.forEach((p, i) => (p.rotation.y += dt * (i ? 50 : -50)));
      if (Math.random() < 0.5) puff(mega.g.position.clone().add(V3((Math.random() - 0.5) * 4 * e, (Math.random() - 0.5) * 3 * e, (Math.random() - 0.5) * 4 * e)), 1, 0x5ef2e0, 3, 1);
    },
    finish() { ctx.shake(0.4); sfx.land(); },
    cam: () => ({ pos: P.pos.clone().add(V3(4, 3, 7)), look: mega.g.position.clone() }),
  });
  const hop = {
    dur: 1, start() { hopFrom = P.pos.clone(); sfx.jump(2); },
    update(dt, k) {
      const to = mega.g.position.clone().add(V3(0, SEAT, 0));
      P.pos.lerpVectors(hopFrom, to, k); P.pos.y += Math.sin(Math.PI * k) * 2.5; P.vel.set(0, 0, 0);
      mega.props.forEach((p, i) => (p.rotation.y += dt * (i ? 50 : -50)));
    },
    finish() { startSky(P); },
    cam: () => ({ pos: mega.g.position.clone().add(V3(6, 3, 9)), look: mega.g.position.clone() }),
  };
  function skyToast() { toast('Sturen: A/D · omhoog: W of Spatie · omlaag: S of Shift · lasers: F (ingedrukt houden)'); }
  function bossIntro() {
    boss.hold = true;
    if (boss.met) {
      play([grow(1.6, 'Terug de lucht in! MEGA-MODUS!'), hop], () => { boss.hold = false; skyToast(); });
      return;
    }
    boss.met = true;
    const up = V3(C.x, C.y + 16, C.z - 8);
    play([
      { dur: 2.2, cam: arenaCam(12, 6, 12, 2) },
      { say: { who: 'KRAAI KRIJS', text: 'KRAAA! Wie komt er op MIJN dak?' }, cam: arenaCam(5, 4, 7, 4) },
      { say: { who: 'KRAAI KRIJS', text: 'Alles wat glimt is van MIJ. Die zwarte schijf ook. Hij glimt zo mooi in de regen.' }, cam: arenaCam(5, 4, 7, 4) },
      { say: { who: BYTE(), text: 'Dat is Robin’s plaat! Die moet je teruggeven!' }, cam: atJosh },
      {
        dur: 2.6, say: { who: 'KRAAI KRIJS', text: 'Pak me dan, als je kan! Daarboven, in de storm, ben ík de baas! KRAAAA!' },
        start() { sfx.whir(); ctx.shake(0.4); growFrom = crow.position.clone(); },
        update(dt, k) { crow.position.lerpVectors(growFrom, up, ease(k)); crow.rotation.x = -0.5 * (1 - k); },
        cam: () => ({ pos: V3(C.x + 8, C.y + 3, C.z + 10), look: crow.position.clone() }),
      },
      { say: { who: BYTE(), text: 'Hij vliegt de storm in… Josh, weet je nog hoe ik in de Schrootmijn zo groot werd?' }, cam: atJosh },
      { say: { who: BYTE(), text: 'Dat kan ik nu zelf ook. En deze keer ben ík de baas over mezelf. Hou je vast!' }, cam: atJosh },
      grow(2.6, 'MEGA-MODUS!'),
      { say: { who: 'JOSH', text: 'WOOOW. Oké… ik spring erop!' }, cam: () => ({ pos: P.pos.clone().add(V3(3, 2, 6)), look: mega.g.position.clone() }) },
      hop,
    ], () => { boss.hold = false; skyToast(); });
  }
  function bossWin() {
    const land = V3(C.x - 3, C.y, C.z + 3);
    sky.park = land.clone().add(V3(0, 4, 0));
    play([
      { dur: 2.4, say: { who: 'KRAAI KRIJS', text: 'KRAAA… Jij vliegt sneller dan de bliksem. Dat vind ik… eigenlijk best glimmend.' }, cam: () => ({ pos: sky.pos.clone().add(V3(8, 4, 10)), look: sky.pos.clone() }) },
      { dur: 3, say: { who: BYTE(), text: 'Hij laat de plaat vallen… precies in zijn nest! Kom, we landen.' }, cam: arenaCam(6, 6, 9, 0.5) },
      {
        dur: 1.6,
        start() { endSky(); sky.grow = true; P.pos.copy(land); P.vel.set(0, 0, 0); growFrom = mega.g.position.clone(); sfx.whir(); },
        update(dt, k) {
          mega.g.scale.setScalar(MEGA + (1 - MEGA) * ease(k));
          mega.g.position.lerpVectors(growFrom, P.pos.clone().add(V3(0.75, 1.9, 0)), ease(k));
          if (Math.random() < 0.4) puff(mega.g.position.clone(), 1, 0x5ef2e0, 2, 1);
        },
        finish() { mega.g.visible = false; mega.g.scale.setScalar(1); sky.grow = false; },
        cam: atJosh,
      },
      { say: { who: BYTE(), text: 'Pfoe. Groot zijn is best vermoeiend. Breng jij de plaat naar Robin?' }, cam: atJosh },
    ], () => ctx.resetCam());
  }
  function launch(go) {
    const hatch = rocket.localToWorld(V3(1.2, 0, 1.3)); hatch.y = rocket.position.y;
    play([
      { dur: 1.8, start() { otis.walkTo(hatch, 4, () => otis.jump(6)); ctx.hideJosh = true; drone.g.visible = false; }, update(dt, k) { if (k > 0.75) otis.root.visible = false; }, cam: shot(V3(-2, 4, 56), V3(7, 3, 46)) },
      { dur: 99, start: go, cam: () => ({ pos: V3(-4, 3, 58), look: rocket.position.clone().add(V3(0, 2, 0)) }) },
    ]);
  }
  function landed() { otis.root.visible = true; otis.walk = null; otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('happy', 2); }

  // ---------- Neon: F in the air = a flash dash forward (once per jump) ----------
  P.dashT = 0;
  function fire(ability) {
    if (ability !== 'neon') return false;
    if (P.grounded) { toast('Neon werkt in de lucht: spring eerst, druk dan op F'); return true; }
    if (P.dashUsed) return true;
    P.dashUsed = true; P.dashT = 0.32;
    const f = V3(Math.sin(P.facing), 0, Math.cos(P.facing));
    P.vel.x = f.x * 17; P.vel.z = f.z * 17; P.vel.y = Math.max(P.vel.y, 2);
    P.long = true; P.pound = 0;            // keeps the speed in the air (like a long jump)
    sfx.zap(); puff(P.pos.clone().add(V3(0, 0.9, 0)), 10, 0xff4ad8, 3, 0.5);
    return true;
  }

  // ---------- every frame ----------
  let prevPound = 0;
  function update(dt, t) {
    updateWorld(t, dt, P);
    updateTrials(dt, t, P);
    // the dash: a pink trail; landing gives the dash back
    if (P.dashT > 0) { P.dashT -= dt; if (P.vel.y < 0) P.vel.y *= 0.5; puff(P.pos.clone().add(V3(0, 0.9, 0)), 2, 0xff4ad8, 1, 0.2); }
    if (P.grounded) P.dashUsed = false;
    // ground pounds for the puddles
    if (prevPound === 2 && P.pound === 0 && P.grounded) trialPound(P.pos);
    prevPound = P.pound;
    // the canal: deep, cold, full of rubbish
    if (!ctx.hideJosh && P.pos.y < WATER_Y - 0.3 && P.pos.z > CANAL.z0 && P.pos.z < CANAL.z1) {
      puff(P.pos.clone().add(V3(0, 1.2, 0)), 20, 0x8ab8ff, 5, 3); sfx.pop();
      ctx.respawn('PLONS! Het kanaal is te diep. Terug naar je laatste checkpoint');
    }
    for (const f of FLAGS) f.mat.color.setHex(save.cp && Math.hypot(save.cp[0] - f.pos.x, save.cp[2] - f.pos.z) < 0.5 ? 0x7dff9a : 0x9a948a);
    otis.update(dt, t, P.pos);
  }
  void ROBIN_ROOF; void LIFT; void scene; void THREE;
  return { start() { if (!save.intro) arrival(); }, bossIntro, bossWin, restoreLight() {}, launch, update, landed, fire,
    flying: () => sky.on, fly: (dt, inp) => flyStep(dt, inp, P), flyCam, droneOff: () => sky.on || sky.grow };
}
