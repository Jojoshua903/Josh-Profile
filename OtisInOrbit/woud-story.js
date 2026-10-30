import { THREE, scene, V3, puff, toast } from './core.js';
import { buildOtis } from './otis.js';
import { addSpeaker } from './bubbles.js';
import { play, shot, pan } from './cutscene.js';
import * as sfx from './sfx.js';
import { groundAt, ARENA, TREES, PILLAR } from './woud-terrain.js';
import { rocket, FLAGS, updateWorld, KITCHEN, BASE, GLAD_ANGLE, openGlad } from './woud-world.js';
import { boss, bonk, bossActive, BONK_REST } from './woud-boss.js';
import { setCtx, poundNPC } from './woud-npc.js';
import { updateTrials, setTrialCtx } from './woud-trials.js';

export function setupStory(ctx) {
  const { P, drone, save, persist } = ctx;
  const BYTE = () => (ctx.LOOK.droneName || 'Byte').toUpperCase();
  const tr = (s) => `${ctx.LOOK.droneName || 'Byte'} vertaalt: “${s}”`;
  setCtx(ctx); setTrialCtx(ctx);

  // ---------- Otis: so many trees. So, so many trees. ----------
  const otis = buildOtis(groundAt);
  const OTIS_HOME = V3(7, 0, 62);
  otis.place(OTIS_HOME.x, OTIS_HOME.z);
  addSpeaker(otis.root, { y: 1.7, radius: 5, linger: 12, lines: () => (boss.state === 'dead'
    ? ['Woef!', `Woef woef!<small>${tr('Eindelijk stil. Geen TOK TOK TOK meer.')}</small>`]
    : ['*snuffelt aan een boomwortel zo groot als een bank*', `Woef!<small>${tr('Al die bomen… en ze zijn allemaal van MIJ. Om tegenaan te plassen.')}</small>`, `Woef…<small>${tr('Ruikt naar curry. Ik ga hier nooit meer weg.')}</small>`, `Woef!<small>${tr('Druk op E bij de raket: dan kies je waar we heen vliegen.')}</small>`]) });

  // ---------- cutscenes ----------
  const atJosh = () => ({ pos: V3(P.pos.x + 2, P.pos.y + 2, P.pos.z + 4), look: P.pos.clone().add(V3(0, 1.2, 0)) });
  const C = V3(ARENA.x, ARENA.y, ARENA.z), K = KITCHEN;
  let tokT = 0;
  function arrival() {
    const land = rocket.position.clone();
    play([
      {
        dur: 2.8,
        start() { ctx.hideJosh = true; drone.g.visible = false; otis.root.visible = false; rocket.position.y = 60; },
        update(dt, k) { rocket.position.y = land.y + (60 - land.y) * Math.pow(1 - k, 2); if (Math.random() < 0.8) puff(rocket.localToWorld(V3(0, -0.2, 0)), 2, 0xffd27a, 2, -2); },
        finish() { rocket.position.copy(land); puff(land.clone().add(V3(0, 0.3, 0)), 40, 0xc8e8a0, 8, 1); ctx.shake(0.4); sfx.land(); },
        cam: () => ({ pos: V3(-8, 5, 82), look: rocket.position.clone().add(V3(0, 2, 0)) }),
      },
      {
        dur: 1.8,
        start() { otis.root.visible = true; otis.root.position.copy(rocket.localToWorld(V3(0, 2.5, 1))); otis.jump(5); ctx.hideJosh = false; drone.g.visible = true; P.pos.set(1, 1.7, 65); P.vel.set(-1, 7, -1); },
        update(dt) { otis.root.position.x += (OTIS_HOME.x - otis.root.position.x) * Math.min(1, dt * 3); otis.root.position.z += (OTIS_HOME.z - otis.root.position.z) * Math.min(1, dt * 3); },
        finish() { otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('happy', 1.5); },
        cam: shot(V3(-4, 4, 76), V3(3, 2, 64)),
      },
      { say: { who: 'OTIS', text: 'Woef! *kijkt omhoog… en omhoog… en omhoog*', sub: tr('Die bomen houden niet OP!') }, cam: shot(V3(10, 1, 66), V3(7, 4, 62)) },
      { dur: 4.8, say: { who: BYTE(), text: 'Bomen zo dik als een huis… en zo hoog als een flat. Daarboven, in de toppen: bruggen. Hutjes. Een heel dorp!' }, cam: pan(V3(0, 3, 70), V3(-20, 14, 46), V3(-6, 20, 60), V3(-8, 28, 6)) },
      {
        dur: 3.6, say: { who: BYTE(), text: 'En wat is dat geluid? TOK… TOK… TOK… Het komt van die reus daar.' },
        start() { [300, 700, 1100, 1500, 1900].forEach((d) => setTimeout(() => sfx.clank(), d)); },
        cam: pan(V3(0, 10, 40), V3(C.x, C.y + 8, C.z), V3(2, 16, 30), V3(C.x, C.y + 10, C.z)),
      },
      { say: { who: '???', text: 'Ruik jij dat ook? Dat is mijn curry! Kom hier, kom hier!' }, cam: shot(V3(K.x + 3, 2.6, K.z + 5), V3(K.x - 1, 1.2, K.z + 1)) },
      { say: { who: BYTE(), text: 'Daar staat iemand te koken. Bij die pan. Zullen we gaan kijken?' }, cam: atJosh },
    ], () => { save.intro = true; persist(); ctx.resetCam(); toast('Iemand kookt bij de pan naast de raket. Ga kijken!'); });
  }
  const bonkCam = () => { const b = bonk.position; return { pos: V3(b.x + (C.x - b.x) * -0.6 + 6, b.y + 3, b.z + 7), look: b.clone().add(V3(0, 2.4, 0)) }; };
  function bossIntro() {
    boss.hold = true;
    const hint = ctx.ability() === 'grijp' ? 'Josh, hou Grijp vast: als hij naar boven vlucht, moet je die stronk op!' : 'Josh, zorg dat je Grijp hebt! Er zit een eekhoorn beneden op de plank.';
    if (boss.met) { play([{ dur: 1.6, say: { who: 'BONK', text: 'JIJ weer? Tok tok, wegwezen!' }, cam: bonkCam }], () => { boss.hold = false; ctx.resetCam(); }); return; }
    boss.met = true;
    play([
      { dur: 2, cam: () => ({ pos: V3(C.x + 14, C.y + 7, C.z + 12), look: V3(C.x, C.y + 6, C.z) }) },
      { say: { who: 'BONK DE REUZENSPECHT', text: 'TOK TOK TOK! Hé! Dit is een BOUWPLAATS! Zie je mijn helm niet?' }, cam: bonkCam },
      { say: { who: BYTE(), text: 'Wat bouw je dan? Je hakt alleen maar gaten in de boom.' }, cam: atJosh },
      { say: { who: 'BONK DE REUZENSPECHT', text: 'Dat gaat jou niks aan! Ik ben ingehuurd. Door twee hele belangrijke katten. Hele GEHEIME katten.' }, cam: bonkCam },
      { say: { who: BYTE(), text: 'Kayo & Yara. Natuurlijk.' }, cam: atJosh },
      { say: { who: 'BONK DE REUZENSPECHT', text: 'Ik zeg niks! En niemand mag hier komen. Dus… WEG MET JE!' }, cam: bonkCam, start() { sfx.wake(); ctx.shake(0.4); } },
      { say: { who: BYTE(), text: hint }, cam: atJosh },
    ], () => { boss.hold = false; ctx.resetCam(); toast('Ontwijk zijn snavel. Zit hij vast? Spring op zijn kop!'); });
  }
  function bossWin() {
    const B = BASE, R = BONK_REST;
    const gladAt = V3(TREES.glad[0] + Math.sin(GLAD_ANGLE) * 6, 18, TREES.glad[1] + Math.cos(GLAD_ANGLE) * 6);
    play([
      { say: { who: 'BONK', text: 'Pff… oké. Oké! Je wint. Mijn helm zit scheef en mijn snavel doet pijn.' }, cam: shot(V3(R.x - 4, R.y + 3, R.z + 4), R.clone().add(V3(0, 2.5, 0))) },
      { say: { who: 'BONK', text: 'Kayo & Yara betaalden me in noten. ROTTE noten. Weet je wat? Ik vertel je alles.' }, cam: shot(V3(R.x - 4, R.y + 3, R.z + 4), R.clone().add(V3(0, 2.5, 0))) },
      { say: { who: 'BONK', text: 'Ik moest hun geheime basis bouwen. Daar, boven in de Gladde Boom. Ik heb hem zo glad gepoetst dat niemand erop kan klimmen.' }, cam: shot(V3(B.x + 16, B.y + 6, B.z + 20), B.clone().add(V3(0, 2, 0))) },
      {
        dur: 3.4, say: { who: 'BONK', text: 'Maar ik pik er wel even een trapje in. TOK TOK TOK TOK TOK!' },
        start() { openGlad(); for (let i = 0; i < 10; i++) setTimeout(() => { sfx.clank(); puff(gladAt.clone().add(V3(0, (i - 5) * 2, 0)), 4, 0xd8b080, 3, 1); }, 200 + i * 300); },
        cam: shot(V3(gladAt.x + Math.sin(GLAD_ANGLE) * 12, 16, gladAt.z + Math.cos(GLAD_ANGLE) * 12), gladAt),
      },
      { say: { who: 'BONK', text: 'Ze zijn er niet, hoor. Ze zijn al vertrokken. Maar ze lieten iets glimmends liggen…' }, cam: shot(V3(R.x - 4, R.y + 3, R.z + 4), R.clone().add(V3(0, 2.5, 0))) },
      { say: { who: BYTE(), text: 'Een geheime basis van Kayo & Yara! Misschien staat daar waar ze heen gaan!' }, cam: atJosh },
    ], () => { ctx.resetCam(); toast('De Gladde Boom heeft nu een trapje van gaatjes. Klim naar de geheime basis!'); });
  }
  function launch(go) {
    const hatch = rocket.localToWorld(V3(1.2, 0, 1.3)); hatch.y = rocket.position.y;
    play([
      { dur: 1.8, start() { otis.walkTo(hatch, 4, () => otis.jump(6)); ctx.hideJosh = true; drone.g.visible = false; }, update(dt, k) { if (k > 0.75) otis.root.visible = false; }, cam: shot(V3(-4, 4, 80), V3(4, 3, 68)) },
      { dur: 99, start: go, cam: () => ({ pos: V3(-6, 3, 82), look: rocket.position.clone().add(V3(0, 2, 0)) }) },
    ]);
  }
  function landed() { otis.root.visible = true; otis.walk = null; otis.place(OTIS_HOME.x, OTIS_HOME.z); otis.setMood('happy', 2); }

  // ---------- every frame ----------
  let prevPound = 0;
  function update(dt, t) {
    updateWorld(t, dt);
    updateTrials(dt, t, P);
    if (prevPound === 2 && P.pound === 0 && P.grounded) poundNPC(P.pos.clone());
    prevPound = P.pound;
    // fell off Bonk's tree in the middle of the fight
    if (bossActive() && P.pos.y < ARENA.y - 5 && !ctx.hideJosh) ctx.respawn('Je viel uit de Mammoetboom! Terug naar je laatste vlag');
    // Bonk drums on the Mammoetboom while you're not fighting him: you hear it from far away
    if (boss.state === 'sleep') {
      tokT -= dt;
      if (tokT <= 0) { tokT = 0.22; if (t % 5 < 1.1 && P.pos.distanceTo(C) < 45) sfx.clank(); }
    }
    for (const f of FLAGS) f.mat.color.setHex(save.cp && Math.hypot(save.cp[0] - f.pos.x, save.cp[2] - f.pos.z) < 0.5 && Math.abs(save.cp[1] - f.pos.y) < 1 ? 0x7dff9a : 0x9a948a);
    otis.update(dt, t, P.pos);
  }
  void THREE; void scene; void PILLAR;
  return { start() { if (!save.intro) arrival(); }, bossIntro, bossWin, restoreLight() { openGlad(); }, launch, update, landed };
}
