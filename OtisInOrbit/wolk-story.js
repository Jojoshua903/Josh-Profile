import { THREE, scene, V3, puff, toast } from './core.js?v=sub1';
import { buildOtis } from './otis.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { play, shot, pan } from './cutscene.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { groundAt, ARENA, ISLANDS } from './wolk-terrain.js?v=sub1';
import { rocket, FLAGS, updateWorld, WERKPLAATS, GATE, gate, openGate } from './wolk-world.js?v=sub1';
import { boss, ship, knoop, blow as bossBlow, KNOOP_DOCK } from './wolk-boss.js?v=sub1';
import { setCtx } from './wolk-npc.js?v=sub1';
import { updateTrials, setTrialCtx, blowTrials, meteorTrials, poundTrials, bath } from './wolk-trials.js?v=sub1';

export function setupStory(ctx) {
  const { P, drone, save, persist } = ctx;
  const BYTE = () => (ctx.LOOK.droneName || 'Byte').toUpperCase();
  const tr = (s) => `${ctx.LOOK.droneName || 'Byte'} vertaalt: “${s}”`;
  setCtx(ctx); setTrialCtx(ctx);

  // ---------- Otis: he LOVES it up here (so much air to sniff) ----------
  const otis = buildOtis(groundAt);
  const OTIS_HOME = V3(10.5, 0, 43.5);
  otis.place(OTIS_HOME.x, OTIS_HOME.z);
  addSpeaker(otis.root, { y: 1.7, radius: 5, linger: 12, lines: () => (boss.state === 'dead'
    ? ['Woef!', `Woef woef!<small>${tr('Geen kanonnen meer. Nu kan ik eindelijk rustig wolken happen.')}</small>`]
    : ['*hapt naar een wolkje*', `Woef!<small>${tr('Het smaakt naar niks. Lekker!')}</small>`, `Woef…<small>${tr('Niet naar beneden kijken. NIET naar beneden kijken.')}</small>`, `Woef!<small>${tr('Druk op E bij de raket: dan kies je waar we heen vliegen.')}</small>`]) });

  // ---------- cutscenes ----------
  const atJosh = () => ({ pos: V3(P.pos.x + 2, P.pos.y + 2, P.pos.z + 4), look: P.pos.clone().add(V3(0, 1.2, 0)) });
  const W = WERKPLAATS;
  const C = V3(ARENA.x, ARENA.y, ARENA.z);
  function arrival() {
    const land = rocket.position.clone();
    play([
      {
        dur: 2.6,
        start() { ctx.hideJosh = true; drone.g.visible = false; otis.root.visible = false; rocket.position.y = 50; },
        update(dt, k) { rocket.position.y = land.y + (50 - land.y) * Math.pow(1 - k, 2); if (Math.random() < 0.8) puff(rocket.localToWorld(V3(0, -0.2, 0)), 2, 0xffd27a, 2, -2); },
        finish() { rocket.position.copy(land); puff(land.clone().add(V3(0, 0.3, 0)), 40, 0xffffff, 8, 1); ctx.shake(0.4); sfx.land(); },
        cam: () => ({ pos: V3(-10, 6, 62), look: rocket.position.clone().add(V3(0, 2, 0)) }),
      },
      {
        dur: 1.8,
        start() { otis.root.visible = true; otis.root.position.copy(rocket.localToWorld(V3(0, 2.5, 1))); otis.jump(5); ctx.hideJosh = false; drone.g.visible = true; P.pos.set(3.5, 1.7, 43.5); P.vel.set(-1, 7, -1); },
        update(dt) { otis.root.position.x += (OTIS_HOME.x - otis.root.position.x) * Math.min(1, dt * 3); otis.root.position.z += (OTIS_HOME.z - otis.root.position.z) * Math.min(1, dt * 3); },
        finish() { otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('happy', 1.5); },
        cam: shot(V3(-4, 4, 56), V3(5, 2, 44)),
      },
      { say: { who: 'OTIS', text: 'Woef! *springt in een wolkje*', sub: tr('WOLKEN! Ik sta op een WOLK!') }, cam: shot(V3(13, 2, 47), V3(10.5, 0.7, 43.5)) },
      { dur: 4.6, say: { who: BYTE(), text: 'Eilanden van wolken… allemaal op een andere hoogte. En daaronder? Niks. Helemaal niks.' }, cam: pan(V3(-14, 10, 52), V3(-30, 2, 20), V3(20, 22, 40), V3(30, 8, -10)) },
      {
        dur: 4.2, say: { who: BYTE(), text: 'Wat is DAT? Een vliegend schip! Met… kanonnen?!' },
        start() { setTimeout(() => { sfx.smash(); puff(ship.position.clone(), 20, 0x9a9aa8, 5, 1); }, 1400); setTimeout(() => sfx.smash(), 2600); },
        cam: pan(V3(C.x - 16, C.y + 12, C.z + 30), ship.position.clone(), V3(C.x - 10, C.y + 10, C.z + 22), ship.position.clone()),
      },
      { say: { who: '???', text: 'HÉ! JULLIE DAAR! Bij die kapotte werkplaats!' }, cam: shot(V3(W.x + 4, W.y + 2.5, W.z + 6), V3(W.x, W.y + 1, W.z)) },
      { say: { who: BYTE(), text: 'Daar zwaait iemand. Bij dat schuurtje. Zullen we gaan kijken?' }, cam: atJosh },
    ], () => { save.intro = true; persist(); ctx.resetCam(); toast('Iemand zwaait bij de werkplaats. Ga kijken!'); });
  }
  const arenaCam = (dx, dy, dz, ly = 2) => () => ({ pos: V3(C.x + dx, C.y + dy, C.z + dz), look: V3(C.x, C.y + ly, C.z) });
  const shipCam = () => ({ pos: ship.position.clone().add(V3(0, 1, 0)).lerp(C, 0.25).add(V3(0, 2, 0)), look: knoop.getWorldPosition(V3()).add(V3(0, 2, 0)) });
  function bossIntro() {
    boss.hold = true;
    const hint = ctx.ability() === 'wervel' ? 'Je hebt een Wervelwind. Blaas zijn kogels terug, Josh!' : 'We hebben een Wervelwind nodig! De arend en de hoornvogel zitten hier bij de muur. Zweef + Galm!';
    if (boss.met) {
      play([{ dur: 1.6, say: { who: 'KNOOP', text: 'JIJ weer? Vuur!' }, cam: shipCam }], () => { boss.hold = false; ctx.resetCam(); });
      return;
    }
    boss.met = true;
    play([
      { dur: 2.2, cam: arenaCam(14, 7, 12, 4) },
      { say: { who: 'KAPITEIN KNOOP', text: 'Ahoi, landrot! Of… wolkrot. Wat doe jij op MIJN eiland?' }, cam: shipCam },
      { say: { who: 'KAPITEIN KNOOP', text: 'Alles wat ik kan zien is van MIJ. Die wolk, die wolk, en die wolk daar. En die jongen daar met zijn uitvindingen!' }, cam: shipCam },
      { say: { who: BYTE(), text: 'Daarom schiet je op Raaf en Oma Wolk? Omdat je denkt dat de lucht van jou is?' }, cam: atJosh },
      { say: { who: 'KAPITEIN KNOOP', text: 'Ik DENK het niet. Ik WEET het. Kanonnen: laden! VUUR!' }, cam: shipCam, start() { sfx.wake(); ctx.shake(0.4); } },
      { say: { who: BYTE(), text: hint }, cam: atJosh },
    ], () => { boss.hold = false; ctx.resetCam(); toast('Kanonskogels blijven even liggen voor ze ontploffen. Sta ernaast en druk op F (Wervelwind)!'); });
  }
  function bossWin() {
    play([
      { dur: 3, say: { who: 'KAPITEIN KNOOP', text: 'Mijn ballon… mijn mooie ballon… pfffffff.' }, cam: () => ({ pos: ship.position.clone().add(V3(-8, 4, 10)), look: ship.position.clone().add(V3(0, 3, 0)) }) },
      { say: { who: 'KAPITEIN KNOOP', text: 'Oké. Oké! De lucht is niet van mij. Hij is van… iedereen. Bah. Dat klinkt eigenlijk best gezellig.' }, cam: shot(V3(KNOOP_DOCK.x + 3, KNOOP_DOCK.y + 3, KNOOP_DOCK.z + 4), KNOOP_DOCK.clone().add(V3(0, 2, 0))) },
      { say: { who: 'KAPITEIN KNOOP', text: 'Weet je wat? Gebruik mijn kanon maar. Het schiet je naar het verste wolkje. Daar ligt iets dat glimt.' }, cam: shot(V3(KNOOP_DOCK.x + 3, KNOOP_DOCK.y + 3, KNOOP_DOCK.z + 4), KNOOP_DOCK.clone().add(V3(0, 2, 0))) },
      { say: { who: BYTE(), text: 'Raaf en Oma Wolk zullen blij zijn. Geen kanonnen meer!' }, cam: atJosh },
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

  // ---------- the mixes, as the planet sees them ----------
  let peak = P.pos.y;
  function blow(at) { bossBlow(at); blowTrials(at); }
  function meteor(at) {
    meteorTrials(at);
    bath(at, peak - at.y);
    if (gate.box && Math.hypot(at.x - GATE.x, at.z - GATE.z) < 4.2 && Math.abs(at.y - GATE.y) < 2) {
      openGate(); sfx.smash(); ctx.shake(0.8);
      puff(GATE.clone().add(V3(0, 1.5, 0)), 60, 0x6a6a88, 10, 3);
      toast('KRAK! De donderpoort ligt in gruzelementen. Op naar Kapitein Knoop!');
    }
  }

  // ---------- every frame ----------
  let prevPound = 0, gateHint = 0;
  function update(dt, t) {
    updateWorld(t, dt);
    updateTrials(dt, t, P);
    // a normal ground pound (Meteoor stamps come through meteor())
    if (prevPound === 2 && P.pound === 0 && P.grounded && ctx.ability() !== 'meteoor') poundTrials(P.pos.clone(), peak - P.pos.y);
    prevPound = P.pound;
    if (!P.grounded) peak = Math.max(peak, P.pos.y); else peak = P.pos.y;
    // the thunderstone gate
    gateHint -= dt;
    if (gate.box && gateHint <= 0 && P.pos.distanceTo(GATE) < 3.6) { gateHint = 10; toast(ctx.comboOn() ? 'Een poort van donderSteen. Daar moet een METEOOR op: Zwaar + Veer, en dan stampen!' : 'Een poort van donderSteen. Geen gewone stamp krijgt die kapot…'); }
    // through the clouds…
    if (!ctx.hideJosh && P.pos.y < -18) ctx.respawn('Je viel door de wolken! Terug naar je laatste vlag');
    for (const f of FLAGS) f.mat.color.setHex(save.cp && Math.hypot(save.cp[0] - f.pos.x, save.cp[2] - f.pos.z) < 0.5 ? 0x7dff9a : 0x9a948a);
    otis.update(dt, t, P.pos);
  }
  void ISLANDS; void scene; void THREE;
  return { start() { if (!save.intro) arrival(); }, bossIntro, bossWin, restoreLight() {}, launch, update, landed, blow, meteor };
}
