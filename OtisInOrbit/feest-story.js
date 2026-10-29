import { THREE, scene, V3, puff, toast } from './core.js?v=sub1';
import { buildOtis } from './otis.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { play, shot, pan } from './cutscene.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { groundAt, ARENA } from './feest-terrain.js?v=sub1';
import { rocket, FLAGS, updateWorld, BALLOON, NATHAN_AT, TUUT_AT, STAGE, HOLE, openHole, INST } from './feest-world.js?v=sub1';
import { boss, galmHit, MOMPEL_PARTY } from './feest-boss.js?v=sub1';
import { galmAt, takeBat } from './feest-npc.js?v=sub1';
import { updateTrials, galmGong } from './feest-trials.js?v=sub1';
import { enemies } from './feest-enemies.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { getSave } from './save.js?v=sub1';

export function setupStory(ctx) {
  const { P, drone, save, persist } = ctx;
  const BYTE = () => (ctx.LOOK.droneName || 'Byte').toUpperCase();
  const tr = (s) => `${ctx.LOOK.droneName || 'Byte'} vertaalt: “${s}”`;
  const STASH = 'Mompels geheime voorraad';

  // ---------- Otis: stays by the rocket. Nathan is very glad about that ----------
  const otis = buildOtis(groundAt);
  const OTIS_HOME = V3(9.5, 0, 45);
  // after the mole, Otis goes up to the party too: on the far side of the stage from Nathan
  const OTIS_PARTY = V3(STAGE.x - 7, 0, STAGE.z + 2.5);
  const otisHome = () => (save.boss ? OTIS_PARTY : OTIS_HOME);
  otis.place(otisHome().x, otisHome().z);
  addSpeaker(otis.root, { y: 1.7, radius: 5, linger: 12, lines: () => (save.boss
    ? ['Woef!', `Woef woef!<small>${tr('Wat een feest! Mag ik nu Nathan knuffelen?')}</small>`, `*kwispelt op de maat*`]
    : ['Woef!', `Woef?<small>${tr('Waarom wil die jongen niet dat ik hem knuffel?')}</small>`, `Woef woef.<small>${tr('Ik ruik katten. Ze zijn hier echt geweest.')}</small>`, `Woef!<small>${tr('Druk op E bij de raket: dan kies je waar we heen vliegen.')}</small>`]) });

  // ---------- cutscenes ----------
  const atJosh = () => ({ pos: V3(P.pos.x + 2, P.pos.y + 2, P.pos.z + 4), look: P.pos.clone().add(V3(0, 1.2, 0)) });
  const nathanCam = shot(V3(NATHAN_AT.x - 2.4, 2.2, NATHAN_AT.z - 3.6), NATHAN_AT.clone().add(V3(0, 1.4, 0)));
  function arrival() {
    const land = rocket.position.clone();
    play([
      {
        dur: 2.6,
        say: { who: BYTE(), text: 'Mijn nieuwe antenne piept… kattensporen! Kayo & Yara zijn hier geweest.' },
        start() { ctx.hideJosh = true; drone.g.visible = false; otis.root.visible = false; rocket.position.y = 45; },
        update(dt, k) { rocket.position.y = land.y + (45 - land.y) * Math.pow(1 - k, 2); if (Math.random() < 0.8) puff(rocket.localToWorld(V3(0, -0.2, 0)), 2, 0xffd27a, 2, -2); },
        finish() { rocket.position.copy(land); puff(land.clone().add(V3(0, 0.3, 0)), 30, 0xffb8d8, 8, 1); ctx.shake(0.4); sfx.land(); },
        cam: () => ({ pos: V3(-8, 5, 60), look: rocket.position.clone().add(V3(0, 2, 0)) }),
      },
      {
        dur: 1.8,
        start() { otis.root.visible = true; otis.root.position.copy(rocket.localToWorld(V3(0, 2.5, 1))); otis.jump(5); ctx.hideJosh = false; drone.g.visible = true; P.pos.set(2.5, 1.7, 44.5); P.vel.set(-1, 7, -1); },
        update(dt) { otis.root.position.x += (OTIS_HOME.x - otis.root.position.x) * Math.min(1, dt * 3); otis.root.position.z += (OTIS_HOME.z - otis.root.position.z) * Math.min(1, dt * 3); },
        finish() { otis.place(OTIS_HOME.x, OTIS_HOME.z); },
        cam: shot(V3(-4, 4, 56), V3(4, 2, 44)),
      },
      { dur: 4, say: { who: BYTE(), text: 'Kijk nou! Vlaggetjes, ballonnen, een taart van drie verdiepingen… iemand gaat hier een feest geven.' }, cam: pan(V3(-10, 8, 46), V3(0, 2, 28), V3(10, 10, 40), V3(-4, 4, 18)) },
      { dur: 2.2, say: { who: '???', text: 'HA-HA-HAAA… HATSJOEEE!!!' }, start() { sfx.sneeze(); }, cam: nathanCam },
      { say: { who: BYTE(), text: 'Josh! Dat is Nathan! De honkballer!' }, cam: nathanCam },
      { dur: 2.4, say: { who: 'OTIS', text: 'WOEF WOEF WOEF!', sub: tr('NATHAN! KNUFFELEN!') }, start() { otis.setMood('happy', 3); otis.walkTo(V3(NATHAN_AT.x - 1.5, 0, NATHAN_AT.z + 4), 6); sfx.bark(); }, cam: shot(V3(14, 3, 46), V3(12, 0.6, 40)) },
      { say: { who: 'NATHAN', text: 'NEE NEE NEE! Blijf daar! Ik ben allergisch voor honden! HATSJOE! En voor katten! HATSJOE!' }, cam: nathanCam, start() { sfx.sneeze(); } },
      { dur: 1.8, start() { otis.setMood('shake', 1.2); otis.walkTo(OTIS_HOME, 3); }, say: { who: 'OTIS', text: '*jankt zachtjes*' }, cam: shot(V3(14, 3, 46), V3(10, 0.6, 43)) },
      { say: { who: 'NATHAN', text: 'Sorry Otis. Je bent heel lief. Maar van ver weg. Ga maar even naar Opper-Toeter Tuut, Josh. Die legt het uit.' }, cam: nathanCam },
    ], () => { save.intro = true; persist(); ctx.resetCam(); otis.walk = null; otis.place(OTIS_HOME.x, OTIS_HOME.z); toast('Praat met Opper-Toeter Tuut in het dorp'); });
  }
  const C = V3(ARENA.x, ARENA.y, ARENA.z);
  const arenaCam = (dx, dy, dz, ly = 2) => () => ({ pos: V3(C.x + dx, C.y + dy, C.z + dz), look: V3(C.x, C.y + ly, C.z) });
  function bossIntro() {
    if (boss.met) return;
    boss.met = true; boss.hold = true;
    play([
      { dur: 2.2, say: { who: 'OPPER-TOETER TUUT', text: '*van beneden* TOEEET! Het Galmfeest is… GEOPEND!' }, cam: arenaCam(12, 6, 14, 1), start() { sfx.fanfare(); } },
      { dur: 2.2, start() { ctx.shake(0.8); sfx.smash(); }, say: { who: BYTE(), text: 'Wat is dat? Het podium… het schudt!' }, cam: arenaCam(6, 3, 8, 0.5) },
      { say: { who: 'MOMPEL', text: 'WIE MAAKT ER ZO’N HERRIE?!' }, cam: arenaCam(3, 3.4, 6, 2.8) },
      { say: { who: 'MOMPEL', text: 'Honderd jaar woon ik onder dit podium. Honderd jaar probeer ik te slapen. En elk jaar weer: TOET TOET BOEM BOEM!' }, cam: arenaCam(3, 3.4, 6, 2.8) },
      { say: { who: BYTE(), text: 'Hij hoort niet bij Kayo & Yara. Hij is gewoon… heel erg chagrijnig.' }, cam: atJosh },
      { say: { who: 'MOMPEL', text: 'Dit jaar is er GEEN feest. Dit jaar is het STIL. SSSSSST!' }, cam: arenaCam(2, 3, 5, 2.8) },
    ], () => { boss.hold = false; ctx.resetCam(); toast('Graaft hij? Doe een ground pound naast de hoop aarde (of toeter ertegen). Ligt hij op zijn rug: spring op zijn buik!'); });
  }
  function bossWin() {
    const M = MOMPEL_PARTY;
    const moleCam = shot(V3(M.x + 3.2, M.y + 3.4, M.z + 6), V3(M.x, M.y + 2.6, M.z));
    const confetti = () => { for (let i = 0; i < 8; i++) setTimeout(() => puff(V3(STAGE.x + (Math.random() - 0.5) * 16, STAGE.y + 6, STAGE.z + (Math.random() - 0.5) * 10), 30, [0xff4a8a, 0xffd04a, 0x4ad8ff, 0x8aff6a][i % 4], 8, -3), i * 280); };
    play([
      { dur: 2.4, say: { who: 'MOMPEL', text: 'Oké. OKÉ. Jullie winnen. *zakt op de planken*' }, cam: moleCam },
      { say: { who: 'MOMPEL', text: 'Honderd jaar… elk jaar dat feest boven mijn hoofd. En nooit… nooit heeft iemand gevraagd of ik mee wilde doen.' }, cam: moleCam },
      { say: { who: 'OPPER-TOETER TUUT', text: '*klimt het podium op* …Mompel? Woon jij daar al die tijd? Waarom heb je nooit iets gezegd?' }, cam: moleCam },
      { say: { who: 'MOMPEL', text: '*mompel* …ik kan toch niks spelen. Ik heb alleen maar graafklauwen.' }, cam: moleCam },
      { say: { who: 'OPPER-TOETER TUUT', text: 'Graafklauwen? Dan ben je perfect voor… de TAMBOERIJN!' }, cam: moleCam, start() { sfx.pop(); } },
      { dur: 2.2, say: { who: 'MOMPEL', text: '*rinkel* …*rinkel rinkel*' }, cam: moleCam, start() { sfx.jingle(); setTimeout(sfx.jingle, 300); setTimeout(sfx.jingle, 600); } },
      { say: { who: 'MOMPEL', text: '…Hm. Dat klinkt eigenlijk best leuk.' }, cam: moleCam },
      { say: { who: BYTE(), text: 'En er is taart! Drie verdiepingen!' }, cam: atJosh },
      { say: { who: 'MOMPEL', text: '…Taart? Voor mij? *neemt een hap* …MMMM.' }, cam: moleCam, start() { puff(V3(M.x + 2.4, M.y + 1, M.z + 0.6), 8, 0xffb8d8, 2, 1); } },
      { dur: 3.6, say: { who: 'OPPER-TOETER TUUT', text: 'Iedereen naar boven! Het Galmfeest is… ECHT BEGONNEN! TOET TOET TOET!' }, start() { confetti(); sfx.fanfare(); otis.walk = null; otis.place(OTIS_PARTY.x, OTIS_PARTY.z); otis.setMood('happy', 4); }, cam: arenaCam(14, 9, 17, 2) },
      { dur: 3, say: { who: 'OTIS', text: 'WOEF!', sub: tr('Ik sta aan deze kant. Nathan aan die kant. Iedereen blij.') }, start() { confetti(); }, cam: shot(V3(OTIS_PARTY.x + 3, STAGE.y + 2.4, OTIS_PARTY.z + 4), V3(OTIS_PARTY.x, STAGE.y + 0.8, OTIS_PARTY.z)) },
      { say: { who: 'MOMPEL', text: 'O, en Josh… in mijn hol onder het podium ligt nog iets. Dat heb ik ooit van een feest gepikt. Neem maar mee.' }, cam: moleCam, start() { openHole(); } },
    ], () => { ctx.resetCam(); stashCookie(); });
  }
  function stashCookie() { addCookie(HOLE.x, 1.2, HOLE.z - 1.6, STASH); }
  if (save.boss) { openHole(); if (!getSave('feest').gotSet.has(STASH)) stashCookie(); }
  function launch(go) {
    const hatch = rocket.localToWorld(V3(1.2, 0, 1.3)); hatch.y = rocket.position.y;
    play([
      { dur: 1.8, start() { otis.walkTo(hatch, 4, () => otis.jump(6)); ctx.hideJosh = true; drone.g.visible = false; }, update(dt, k) { if (k > 0.75) otis.root.visible = false; }, cam: shot(V3(-2, 4, 56), V3(6, 3, 46)) },
      { dur: 99, start: go, cam: () => ({ pos: V3(-4, 3, 58), look: rocket.position.clone().add(V3(0, 2, 0)) }) },
    ]);
  }
  function landed() { const h = otisHome(); otis.root.visible = true; otis.walk = null; otis.place(h.x, h.z); otis.setMood('happy', 2); }

  // ---------- Galm: F blasts a cone of sound ----------
  const blasts = [];
  const blastMat = new THREE.MeshBasicMaterial({ color: 0xff9ad8, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
  const enemyApi = { damage: (f) => ctx.hurt(f), bounce() {}, toast };
  function fire(ability) {
    if (ability !== 'galm') return false;
    const dir = V3(Math.sin(P.facing), 0, Math.cos(P.facing));
    const from = P.pos.clone();
    sfx.galm();
    // a few rings flying out in front of Josh
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 6, 24), blastMat.clone());
      m.position.copy(from).add(V3(0, 1, 0)); m.lookAt(m.position.clone().add(dir)); scene.add(m);
      blasts.push({ m, dir, t: -i * 0.08 });
    }
    galmAt(from, dir);
    galmGong(from, dir);
    for (let d = 1; d <= 7; d += 1.5) {
      const at = from.clone().addScaledVector(dir, d);
      if (galmHit(at, 2.6)) break;
      enemies.zap(at.clone().add(V3(0, 0.6, 0)), 1.4, enemyApi);
    }
    return true;
  }
  function updateBlasts(dt) {
    for (let i = blasts.length - 1; i >= 0; i--) {
      const b = blasts[i]; b.t += dt;
      if (b.t < 0) { b.m.visible = false; continue; }
      b.m.visible = true;
      b.m.position.addScaledVector(b.dir, dt * 16); const s = 1 + b.t * 5; b.m.scale.set(s, s, s);
      b.m.material.opacity = Math.max(0, 0.7 - b.t * 1.4);
      if (b.t > 0.5) { scene.remove(b.m); blasts.splice(i, 1); }
    }
  }

  // ---------- Nathan's bat: he whacks you up onto the balloon ----------
  let flight = null;
  const BASKET_TOP = () => V3(BALLOON.x, BALLOON.y + 0.8 + Math.sin(performance.now() / 1000 * 0.8) * 0.4, BALLOON.z);
  function updateFlight(dt) {
    if (!flight && takeBat()) {
      flight = { t: 0, from: P.pos.clone(), dur: 2.6, apex: 30 };
      sfx.smash(); ctx.shake(0.4); puff(P.pos.clone().add(V3(0, 1, 0)), 20, 0xffffff, 6, 2);
      toast('NATHAN: Aaaand… KLAP! Home run!');
    }
    if (!flight) return;
    flight.t += dt;
    const k = Math.min(1, flight.t / flight.dur), to = BASKET_TOP();
    P.pos.lerpVectors(flight.from, to, k);
    P.pos.y += Math.sin(k * Math.PI) * (flight.apex - (flight.from.y + to.y) / 2) * 0.9;
    P.vel.set(0, 0, 0); P.grounded = false; P.pound = 0;
    if (Math.random() < 0.6) puff(P.pos.clone().add(V3(0, 0.6, 0)), 1, 0xffffff, 1, 0.3);
    if (k >= 1) { P.pos.copy(to).add(V3(0, 0.4, 0)); flight = null; sfx.land(); }
  }

  // ---------- every frame ----------
  function update(dt, t) {
    updateWorld(t, dt, P);
    updateTrials(dt, t, P);
    updateBlasts(dt);
    updateFlight(dt);
    for (const f of FLAGS) f.mat.color.setHex(save.cp && Math.hypot(save.cp[0] - f.pos.x, save.cp[2] - f.pos.z) < 0.5 ? 0x7dff9a : 0x9a948a);
    otis.update(dt, t, P.pos);
  }
  void TUUT_AT; void INST;
  return { start() { if (!save.intro) arrival(); }, bossIntro, bossWin, restoreLight() {}, launch, update, landed, fire };
}
