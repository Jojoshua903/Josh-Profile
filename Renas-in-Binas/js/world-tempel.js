import { World, addStars, addBackdropPlanet, LL, V3, toon, basic, mk, THREE, sign, addRocket } from './worlds-common.js?v=20261111t';
import { fbm } from './world.js?v=20261111t';
import { buildJosh, buildOtis, textBoard } from './models.js?v=20261111t';
import { G, toast, banner, puff, surf, placeOn, orientOn } from './core.js?v=20261111t';
import { P } from './player.js?v=20261111t';
import { sfx } from './audio.js?v=20261111t';
import { play, orbitShot } from './cutscene.js?v=20261111t';
import { LANG } from './lang.js?v=20261111t';

// DE STERRENTEMPEL: this game's Godhome. Opens after the finale.
// Josh trained here before he saved the galaxy. RENAS-1 turned the scans of every boss Rênas beat into holograms:
// nobody gets hurt, they're only light, but they hit just as hard.
//   Hal der Hologrammen (Hall of Gods) - a statue per boss: fight it alone as Hologram, Opgeklommen or Stralend (one hit)
//   Four pantheon doors                - bosses back to back, hearts carry over, no healing in between
//   Bindings (on the doors)            - extra rules you pick yourself; every one you clear lights an orb on the door
// A door you clear without a single hit gets a crown, like the radiant doors in Godhome.
const L = (en, nl) => (LANG.cur === 'nl' ? nl : en);

export const GOD_BOSS = {
  0: ['DJ MIAUWTRON', '#ff5ab4'], 1: ['GRUIS', '#c89050'], 2: ['ZENNITH', '#5cc85a'], 3: ['DENIZ', '#9fe8ff'],
  4: ['LORCAN', '#5cd85a'], 5: ['KONING KOKOS', '#3aa84a'], 6: ['SMEUL', '#ff7a2a'], 7: ['GRUIZEL', '#e0b070'],
  8: ['MECHA-MIAUW 2.0', '#b8b8c8'], 9: ['KRAAK', '#3ab0d8'], 10: ['KONING BOE', '#9a7aff'], 11: ['TANDWIELTRON', '#ffd23a'],
};
export const HALL = [0, 1, 3, 4, 5, 6, 7, 9, 10, 8, 2, 11];   // the statues, in story order
export const PANTHEONS = [
  { en: 'Pantheon of the Cadet', nl: 'Pantheon van de Cadet', seq: [0, 1, 3, 4], col: '#9fe8ff' },
  { en: 'Pantheon of the Explorer', nl: 'Pantheon van de Ontdekker', seq: [5, 6, 7, 9], col: '#9aff6a' },
  { en: 'Pantheon of the Captain', nl: 'Pantheon van de Kapitein', seq: [10, 8, 2, 11], col: '#ffd23a' },
  { en: 'Pantheon of the Galaxy', nl: 'Pantheon van de Melkweg', seq: HALL, rest: [4, 8], col: '#ff9ae0' },   // every boss, with two rest stops
];
export const BINDS = [
  ['🛡️', 'Shield band', 'Schildband', 'Only 2 hearts', 'Maar 2 harten'],
  ['☄️', 'Comet band', 'Komeetband', 'No Komeetduik', 'Geen Komeetduik'],
  ['💔', 'Heart band', 'Hartband', 'Bosses drop no hearts', 'Bazen laten geen harten vallen'],
  ['⏩', 'Time band', 'Tijdband', 'Bosses are 25% faster', 'Bazen zijn 25% sneller'],
];
export const TIERS = [
  ['Hologram', 'Hologram', 'The boss as you know it', 'De baas zoals je hem kent'],
  ['Ascended', 'Opgeklommen', 'One extra hit and faster', 'Eén klap extra en sneller'],
  ['Radiant', 'Stralend', 'Ascended, and one hit means out', 'Opgeklommen, en één klap is eruit'],
];
const panDone = (s, n) => !!(s.god && s.god.pan[n] && s.god.pan[n].done);
export const panOpen = (s, n) => n === 0 || (n === 1 && panDone(s, 0)) || (n === 2 && panDone(s, 1) && !!s.cleared[11]) || (n === 3 && panDone(s, 0) && panDone(s, 1) && panDone(s, 2));
const panLock = (s, n) => (n === 1 ? L('Clear the Pantheon of the Cadet first', 'Haal eerst het Pantheon van de Cadet')
  : n === 2 ? (!panDone(s, 1) ? L('Clear the Pantheon of the Explorer first', 'Haal eerst het Pantheon van de Ontdekker') : L('Beat Tandwieltron on De Gouden Werkplaats first', 'Versla eerst Tandwieltron op De Gouden Werkplaats'))
  : L('Clear the first three pantheons first', 'Haal eerst de eerste drie pantheons'));
const TIER_COL = [0xa8a098, 0xc87a3a, 0xd8d8e8, 0xffd23a];
const hex = (c) => parseInt(c.slice(1), 16);
const tangent = (d, toward) => toward.clone().addScaledVector(d, -toward.dot(d)).normalize();

// a sign you can read from both sides
function board2(text, w, h, bg, fg) {
  const g = new THREE.Group();
  const a = textBoard(text, w, h, bg, fg); g.add(a);
  const b = textBoard(text, w, h, bg, fg); b.rotation.y = Math.PI; b.position.z = -0.01; g.add(b);
  return g;
}

export function buildTempel(ctx) {
  const s = ctx.save, gs = s.god || { hall: {}, pan: {} };
  const w = new World('tempel');
  Object.assign(w, {
    index: 15, title: 'De Sterrentempel', sub: L('Hologram bosses. No mercy.', 'Hologrambazen. Geen genade.'), friendName: 'Josh',
    park: true, quest: null,
    sky: 'radial-gradient(ellipse at 50% 25%,#3a2a6a 0%,#160c34 55%,#04020c 100%)',
    music: 'tempel', bossMusic: 'tempel', lights: [0xfff0e0, 0x4a3a6a],
  });
  w.boss = { g: new THREE.Group(), dead: true, reset() {}, start() {}, update() {} };   // main.js expects one
  addStars(w, 1400);
  addBackdropPlanet(w, V3(160, 120, -150), 26, 0xff9ae0);
  addBackdropPlanet(w, V3(-170, -60, 160), 14, 0x9fe8ff);

  const m1 = new THREE.Color(0xf2ece0), m2 = new THREE.Color(0xd8d0c4), m3 = new THREE.Color(0xbab2c8), gold = new THREE.Color(0xffd23a);
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 20, atmo: 0xfff2b8, atmoOp: 0.14,
    paint: (p, out) => {
      const n = fbm(p, 3);
      out.copy(Math.abs(n - 0.5) < 0.012 ? gold : n > 0.58 ? m1 : n > 0.42 ? m2 : m3);   // marble with golden veins
      if (Math.abs(p.y - 0.7) < 0.012 || Math.abs(p.y + 0.5) < 0.012) out.copy(gold);   // gold rings round the hall and round the doors
    },
  });
  w.main = pl;

  // ---------- where you start: the plaza, or back at the statue or door you just used ----------
  const from = ctx.godFrom; ctx.godFrom = null;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  if (from && from.statue !== undefined && from.statue >= 0) w.spawn = { dir: LL(45, from.statue * 30), fwd: V3(0, 1, 0) };
  if (from && from.door !== undefined) w.spawn = { dir: LL(-29, from.door * 90), fwd: V3(0, -1, 0) };
  addRocket(w, ctx, pl, LL(-4, -14));

  // ---------- the RENAS-1 projector at the north pole: it beams the holograms ----------
  const N = V3(0, 1, 0);
  w.addPlatform(pl, { dir: N, r: 2.4, h: 0.6, color: 0xd8d0c4, top: 0xffd23a });
  {
    const g = new THREE.Group();
    mk(new THREE.CylinderGeometry(0.7, 1.0, 1.2, 16), toon(0x2b2440), 0, 1.2, 0, g, 1.05);
    const lens = mk(new THREE.SphereGeometry(0.5, 16, 12), basic(0x5ef2e0), 0, 2.0, 0, g, 1.08);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 0.4, 7, 24, 1, true), basic(0x5ef2e0, { transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.y = 5.5; g.add(beam);
    const rings = [];
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.0 + i * 0.6, 0.05, 6, 32), basic(0x9fe8ff, { transparent: true, opacity: 0.6 })); r.rotation.x = Math.PI / 2; r.position.y = 3 + i * 1.6; g.add(r); rings.push(r); }
    placeOn(g, pl, N, 0.6); w.group.add(g);
    w.updaters.push((dt, t) => { rings.forEach((r, i) => { r.position.y = 3 + ((t * 0.8 + i * 1.6) % 4.8); r.material.opacity = 0.6 * (1 - (r.position.y - 3) / 4.8); }); lens.scale.setScalar(1 + Math.sin(t * 4) * 0.08); });
    w.addSolid(pl, N, 1.0, 2.4);
  }

  // ---------- Hal der Hologrammen: a statue for every boss ----------
  HALL.forEach((idx, k) => {
    const d = LL(52, k * 30), [name, col] = GOD_BOSS[idx], open = !!s.cleared[idx], tier = gs.hall[idx] || 0;
    w.addPlatform(pl, { dir: d, r: 1.1, h: 0.9, color: 0xe8e0d0, top: TIER_COL[tier] });
    const g = new THREE.Group();
    const c = open ? hex(col) : 0x5a5868;
    const holo = mk(new THREE.OctahedronGeometry(0.6), basic(c, { transparent: true, opacity: 0.8 }), 0, 2.3, 0, g, 1.1);
    holo.scale.y = 1.6;
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.25, 1.3, 16, 1, true), basic(c, { transparent: true, opacity: open ? 0.18 : 0.06, side: THREE.DoubleSide, depthWrite: false }));
    cone.position.y = 1.55; g.add(cone);
    for (let i = 0; i < tier; i++) mk(new THREE.SphereGeometry(0.13, 10, 8), basic(TIER_COL[tier]), (i - (tier - 1) / 2) * 0.4, 1.05, 0, g, 1.1);   // a star per difficulty you beat
    const bd = board2(open ? name : '???', 2.4, 0.5, '#2b2440', open ? col : '#8a8698'); bd.position.y = 3.6; g.add(bd);
    placeOn(g, pl, d, 0); orientOn(g, d, tangent(d, V3(0, -1, 0))); w.group.add(g);
    if (tier === 3) { const halo = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 6, 28), basic(0xffd23a)); halo.position.y = 3.15; halo.rotation.x = Math.PI / 2; g.add(halo); }
    w.updaters.push((dt, t) => { holo.rotation.y += dt * 1.4; holo.position.y = 2.3 + Math.sin(t * 2 + k) * 0.12; if (open) holo.material.opacity = 0.65 + Math.sin(t * 7 + k) * 0.15; });
    w.addInteract({
      planet: pl, pos: surf(pl, d, 1), radius: 2.7,
      prompt: () => (open ? `<kbd>E</kbd> ${name}` : `🔒 ${L('Beat this boss first', 'Versla deze baas eerst')}`),
      use: () => { if (open) ctx.godStatue(idx); else { sfx.warn(); toast(idx === 11 ? L('Beat Tandwieltron on De Gouden Werkplaats first', 'Versla eerst Tandwieltron op De Gouden Werkplaats') : L('Beat this boss first', 'Versla deze baas eerst')); } },
    });
  });
  sign(w, pl, LL(14, 6), board2(L('↑ Hall of Holograms', '↑ Hal der Hologrammen'), 3.2, 0.6, '#fff2b8', '#2b2440'), 0, 2.2);
  sign(w, pl, LL(-12, -6), board2(L('↓ The Pantheons', '↓ De Pantheons'), 2.8, 0.6, '#fff2b8', '#2b2440'), 0, 2.2);

  // ---------- the four pantheon doors ----------
  PANTHEONS.forEach((pn, n) => {
    const d = LL(-36, n * 90), open = panOpen(s, n), rec = gs.pan[n];
    const g = new THREE.Group();
    const stone = toon(open ? 0xf2ece0 : 0x8a8698), trim = toon(open ? 0xffd23a : 0x6a6678);
    for (const x of [-1.6, 1.6]) mk(new THREE.BoxGeometry(0.55, 4.2, 0.55), stone, x, 2.1, 0, g, 1.04);
    mk(new THREE.BoxGeometry(4.1, 0.5, 0.8), trim, 0, 4.35, 0, g, 1.04);
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 3.9), basic(open ? hex(pn.col) : 0x2b2440, { transparent: true, opacity: open ? 0.45 : 0.7, side: THREE.DoubleSide, depthWrite: false }));
    fill.position.y = 2.0; g.add(fill);
    // an orb per binding you cleared on this door, a big star for all four at once, a crown for no hits
    for (let b = 0; b < 4; b++) mk(new THREE.SphereGeometry(0.17, 10, 8), basic(rec && rec.b[b] ? 0xffd23a : 0x4a4658), -1.05 + b * 0.7, 4.85, 0, g, 1.1);
    if (rec && rec.all) mk(new THREE.OctahedronGeometry(0.35), basic(0xff9ae0), 0, 5.5, 0, g, 1.1);
    let crown = null;
    if (rec && rec.nohit) { crown = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 6, 24), basic(0xffd23a)); crown.position.y = rec.all ? 6.2 : 5.5; crown.rotation.x = Math.PI / 2; g.add(crown); }
    const bd = board2(`${['I', 'II', 'III', 'IV'][n]} · ${L(pn.en, pn.nl)}${rec && rec.done ? ' ✓' : ''}`, 4.6, 0.55, '#2b2440', open ? pn.col : '#8a8698'); bd.position.y = 3.65; bd.position.z = 0.45; g.add(bd);
    placeOn(g, pl, d, 0); orientOn(g, d, tangent(d, V3(0, 1, 0))); w.group.add(g);
    g.updateMatrixWorld(true);
    for (const x of [-1.6, 1.6]) w.addSolid(pl, g.localToWorld(V3(x, 0, 0)).sub(pl.c).normalize(), 0.4, 4.2);
    w.updaters.push((dt, t) => { if (open) fill.material.opacity = 0.38 + Math.sin(t * 2 + n) * 0.1; if (crown) crown.rotation.z += dt; });
    w.addInteract({
      planet: pl, pos: surf(pl, d, 1), radius: 3.0,
      prompt: () => (open ? `<kbd>E</kbd> ${L(pn.en, pn.nl)}` : `🔒 ${panLock(s, n)}`),
      use: () => { if (open) ctx.godDoor(n); else { sfx.warn(); toast(panLock(s, n), 2800); } },
    });
  });

  // ---------- Josh and Otis ----------
  const hallN = () => HALL.filter((i) => (gs.hall[i] || 0) > 0).length, panN = () => [0, 1, 2, 3].filter((n) => panDone(s, n)).length;
  const josh = w.addNPC(pl, buildJosh(), LL(5, 9), {
    name: 'Josh', bubbleY: 2.3,
    lines: () => (panDone(s, 3) ? [L('My little brother. Captain of the galaxy.', 'Mijn kleine broertje. Kapitein van de melkweg.'), L('Again? You are crazy. I love it.', 'Nog een keer? Jij bent gek. Geweldig.')]
      : [L('Statues up north, doors down south.', 'Beelden in het noorden, deuren in het zuiden.'), L('Holograms can’t hurt you. Much.', 'Hologrammen doen geen pijn. Bijna niet.'), L('I never got through door IV…', 'Door deur IV kwam ik nooit heen…')]),
    anim: (dt, t, n) => { n.model.head.rotation.y = Math.sin(t * 0.6) * 0.3; },
  });
  w.addNPC(pl, buildOtis(), LL(3.5, 13), { name: 'Otis', bubbleY: 1.4, lines: () => ['*WOOF!*', '*wags*', L('*sniffs a hologram*', '*snuffelt aan een hologram*')] });
  const talk = () => ctx.talkCam(josh);
  w.addInteract({
    planet: pl, pos: () => josh.g.position, radius: 2.4, prompt: () => `<kbd>E</kbd> ${L('talk to Josh', 'praat met Josh')}`,
    use: () => {
      P.talkTo = josh;
      const lines = panDone(s, 3)
        ? [['JOSH', L('You beat the Pantheon of the Galaxy. Every boss, back to back. I still can’t believe it.', 'Je hebt het Pantheon van de Melkweg gehaald. Alle bazen achter elkaar. Ik geloof het nog steeds niet.')],
          ['JOSH', L('Want a real challenge? Put on the bindings. A crown on a door means: not one hit.', 'Wil je echt een uitdaging? Doe de bindingen om. Een kroon op een deur betekent: geen enkele klap.')]]
        : [['JOSH', L('The statues: one boss at a time. Hologram is normal. Opgeklommen hits harder. Stralend: one hit and you are out.', 'De beelden: één baas tegelijk. Hologram is normaal. Opgeklommen slaat harder. Stralend: één klap en je ligt eruit.')],
          ['JOSH', L('The doors are the pantheons. Bosses back to back. Your hearts carry over, so be careful with them.', 'De deuren zijn de pantheons. Bazen achter elkaar. Je harten gaan mee naar de volgende, dus pas er goed op.')],
          ['JOSH', L('At a door you can put on bindings. Harder rules, but every one you clear lights an orb on that door.', 'Bij een deur kun je bindingen omdoen. Strengere regels, maar elke binding die je haalt laat een bol op die deur branden.')],
          ['JOSH', `${L('So far', 'Tot nu toe')}: ${hallN()} / ${HALL.length} ${L('statues', 'beelden')}, ${panN()} / 4 pantheons.`]];
      play(lines.map(([who, text]) => ({ say: { who, text }, cam: talk() })), () => {});
    },
  });

  w.hudText = (nl) => `🏛️ ${nl ? 'Beelden' : 'Statues'} <b>${hallN()} / ${HALL.length}</b> &nbsp;· 🚪 Pantheons <b>${panN()} / 4</b>`;
  const over = () => orbitShot(surf(pl, w.spawn.dir, 2), w.spawn.dir, 15, 8, 0.2);
  const say = (who, text, sub) => ({ say: { who, text, sub }, cam: who === 'JOSH' || who === 'OTIS' ? talk() : over() });
  w.arrive = () => {
    play([
      { dur: 3.2, title: [w.title, w.sub], cam: over() },
      say('RENAS-1', L('Sterrentempel reached. Hologram projectors online. Captain, I saved a scan of every boss you beat.', 'Sterrentempel bereikt. Hologramprojectoren aan. Kapitein, ik heb van elke baas die je versloeg een scan bewaard.')),
      say('JOSH', L('Welcome to De Sterrentempel, little brother. I trained here, before I saved the galaxy.', 'Welkom in De Sterrentempel, kleine broer. Hier heb ik getraind, voordat ik de melkweg redde.')),
      say('JOSH', L('RENAS-1 turned the scans into holograms. Nobody gets hurt, they’re only light. But they hit just as hard.', 'RENAS-1 heeft van die scans hologrammen gemaakt. Niemand raakt gewond, het is alleen licht. Maar ze slaan net zo hard.')),
      say('JOSH', L('Up north is the Hall of Holograms: one statue per boss. Down south are four doors, the pantheons. Bosses back to back, no break.', 'In het noorden staat de Hal der Hologrammen: één beeld per baas. In het zuiden zijn vier deuren, de pantheons. Bazen achter elkaar, geen pauze.')),
      say('JOSH', L('And the last door, the Pantheon of the Galaxy… I never got through that one.', 'En de laatste deur, het Pantheon van de Melkweg… daar ben ik zelf nooit doorheen gekomen.')),
      say('RÊNAS', L('You never got through it? Then I will. Captain’s orders.', 'Jij bent er nooit doorheen gekomen? Dan doe ik het. Bevel van de kapitein.')),
      say('OTIS', '*WOOF!*', L('(RENAS-1 translates: “LITTLE JOSH WILL WIN! THEN WE EAT!”)', '(RENAS-1 vertaalt: “KLEINE JOSH GAAT WINNEN! DAARNA ETEN!”)')),
    ], () => { toast(L('Statues up north, pantheon doors down south. Press E at one!', 'Beelden in het noorden, pantheondeuren in het zuiden. Druk E bij eentje!'), 3600); ctx.hud(); });
  };
  // back from a pantheon: Josh has something to say
  w.celebrate = (kind, g) => {
    if (kind === 'p4') {
      puff(P.pos.clone().addScaledVector(P.up, 1), 40, 0xffd23a, 6, 2);
      play([
        { dur: 2.4, title: [L('RADIANT CAPTAIN', 'STRALENDE KAPITEIN'), L('Pantheon of the Galaxy cleared', 'Pantheon van de Melkweg gehaald')], cam: over() },
        say('JOSH', L('Rênas… you did it. Twelve bosses in a row. The door I never got through.', 'Rênas… het is je gelukt. Twaalf bazen op een rij. De deur waar ik nooit doorheen kwam.')),
        say('RÊNAS', L('So that means I’m the best astronaut in the family now?', 'Dus nu ben ik de beste astronaut van de familie?')),
        say('JOSH', L('…Don’t tell Mom. But yes. Captain Rênas Binas.', '…Niet tegen mama zeggen. Maar ja. Kapitein Rênas Binas.')),
        say('OTIS', '*WOOF WOOF WOOF!*', L('(RENAS-1 translates: “FOOD TIME! FOOD TIME!”)', '(RENAS-1 vertaalt: “ETENSTIJD! ETENSTIJD!”)')),
      ], () => { sfx.rare(); banner(L('RADIANT CAPTAIN!', 'STRALENDE KAPITEIN!'), L('Try the bindings for the crown!', 'Probeer de bindingen voor de kroon!'), '#ffd23a'); ctx.hud(); });
      return;
    }
    const pn = PANTHEONS[g.n];
    play([say('JOSH', g.hit ? L(`The ${pn.en}, cleared! Look at the door, it’s shining for you.`, `Het ${pn.nl}, gehaald! Kijk naar de deur, die glimt voor jou.`)
      : L(`The ${pn.en} without ONE hit? That door gets a crown. Unreal.`, `Het ${pn.nl} zonder ÉÉN klap? Die deur krijgt een kroon. Niet normaal.`))], () => ctx.hud());
  };
  return w;
}
