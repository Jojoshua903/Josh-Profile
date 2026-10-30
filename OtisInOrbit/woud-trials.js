import { THREE, scene, toon, addOutline, V3, puff, toast } from './core.js';
import { addCookie } from './cookies.js';
import { addSpeaker } from './bubbles.js';
import { getSave } from './save.js';
import * as sfx from './sfx.js';
import { TREES, VR } from './woud-terrain.js';
import { RACE_STRIP, LIANAS, CLIMBS, BASE } from './woud-world.js';
import { boxes, block } from './woud-kit.js';
import { enemies } from './woud-enemies.js';

// The challenges behind the cosmic cookies in het Reuzenwoud:
//   Pit's race     – Pit the squirrel bets he's up the Kastanje before you. Talk to him at the bottom, and climb!
//   de eksters     – three magpies keep the owl on the Berk awake. Chase them off (jump on them).
//   het dwaallicht – a will-o'-the-wisp in the mist. Follow it (not too far behind!) and it opens the roots of
//                    a hidden hollow, deep in the mist.
//   de lianenrace  – from the Wilg to the Holle Boom, liana to liana, in 16 seconds.
// Plus cookies that are just hard to reach: the top of the Den, the Verre Kruin (glide there from the
// Mammoetboom), and the secret base in the Gladde Boom (after Bonk).
const { save, persist } = getSave('woud');
save.trials = save.trials || {};
const done = (k) => !!save.trials[k];
function finish(k) { save.trials[k] = true; persist(); }
export const TRIAL_RARE = 4;
const NAMES = { pit: 'Sneller dan Pit', ekster: 'De uil kan slapen', dwaal: 'Het dwaallicht', liaan: 'Lianenslinger' };
let ctx = null;
export function setTrialCtx(c) { ctx = c; }
const mk = (geo, mat, x, y, z, parent, ol = 1.06) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; if (ol) addOutline(m, ol); parent.add(m); return m; };
const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
const T = TREES, top = (k) => T[k][3];

addCookie(T.den[0], top('den') + 1.2, T.den[1], 'Top van de Den');
addCookie(T.verre[0], top('verre') + 1.2, T.verre[1], 'De Verre Kruin');
addCookie(BASE.x, BASE.y + 1.2, BASE.z + 1.8, 'De geheime basis');

// a squirrel (Pit, and the ones you can scan)
export function squirrel(g, fur = 0xc8783a) {
  const f = toon(fur), light = toon(0xf4dcc0);
  mk(new THREE.SphereGeometry(0.3, 12, 10), f, 0, 0.35, 0, g).scale.set(1, 1.15, 0.9);
  mk(new THREE.SphereGeometry(0.2, 10, 8), light, 0, 0.3, 0.16, g, 0).scale.set(0.8, 1.1, 0.6);
  mk(new THREE.SphereGeometry(0.22, 12, 10), f, 0, 0.78, 0.08, g);
  for (const s of [-1, 1]) { mk(new THREE.ConeGeometry(0.07, 0.18, 6), f, 0.12 * s, 1.0, 0.04, g, 0); mk(new THREE.SphereGeometry(0.045, 6, 4), ink, 0.09 * s, 0.82, 0.27, g, 0); }
  const tail = mk(new THREE.SphereGeometry(0.28, 10, 8), f, 0, 0.6, -0.38, g); tail.scale.set(0.7, 1.6, 0.7); tail.rotation.x = -0.4;
  return tail;
}

// ---------- 1. Pit's race up the Kastanje ----------
const KR = VR('kast'), PIT_A = RACE_STRIP.a + 0.3;
const PIT_HOME = V3(T.kast[0] + Math.sin(PIT_A) * (KR + 1.6), 0, T.kast[1] + Math.cos(PIT_A) * (KR + 1.6));
const pit = new THREE.Group(); pit.position.copy(PIT_HOME); pit.scale.setScalar(1.3); scene.add(pit);
const pitTail = squirrel(pit, 0xb8602a);
const pitBand = mk(new THREE.TorusGeometry(0.2, 0.04, 6, 14), toon(0xe0443a), 0, 0.92, 0.06, pit, 0); pitBand.rotation.x = Math.PI / 2;    // a red sweatband: he's a sporty squirrel
const RACE = { state: done('pit') ? 'won' : 'idle', y: 0, t: 0 };
addSpeaker(pit, { y: 1.8, radius: 5, linger: 10, lines: () => (RACE.state === 'won' ? ['Pff. Jij klimt als een eekhoorn. Dat is het grootste compliment dat ik ken.'] : ['Ik ben Pit! Snelste klimmer van het hele woud!', 'Wedden dat ik eerder boven in de Kastanje ben dan jij?']) });
function pitReward() { addCookie(T.kast[0] + 2, top('kast') + 1.2, T.kast[1] + 2, NAMES.pit); }
function startRace() {
  if (ctx.ability() !== 'grijp') { toast('PIT: Haha! Jij hebt niet eens klauwen! Scan eerst een eekhoorn, dan kun je klimmen.'); return; }
  RACE.state = 'go'; RACE.y = 0; RACE.t = 0; sfx.wake();
  toast('PIT: Op je plaatsen… klaar… AF! Wie het eerst boven is!');
}
function updatePit(dt, t, P) {
  const p = P.pos, H = top('kast');
  if (RACE.state === 'won') { pit.position.set(T.kast[0] - 2, H, T.kast[1] + 1); pit.rotation.y = t * 0.5; return; }
  if (RACE.state === 'idle') { pit.position.copy(PIT_HOME); pit.rotation.y = Math.atan2(p.x - pit.position.x, p.z - pit.position.z); pitTail.rotation.x = -0.4 + Math.sin(t * 4) * 0.2; return; }
  if (RACE.state === 'go') {
    RACE.t += dt; RACE.y += dt * 3.2;
    pit.position.set(T.kast[0] + Math.sin(PIT_A) * (KR + 0.3), RACE.y, T.kast[1] + Math.cos(PIT_A) * (KR + 0.3));
    pit.rotation.set(-Math.PI / 2, PIT_A + Math.PI, 0, 'YXZ');
    if (p.y > H - 0.3 && P.grounded && Math.hypot(p.x - T.kast[0], p.z - T.kast[1]) < KR) {
      RACE.state = 'won'; pit.rotation.set(0, 0, 0); finish('pit'); sfx.cosmic(); toast('Je bent eerder boven dan Pit! PIT: Wat?! Niemand is sneller dan ik!'); pitReward();
    } else if (RACE.y >= H) {
      RACE.state = 'lost'; RACE.t = 0; pit.rotation.set(0, 0, 0); sfx.hurt(); toast('PIT: Eerst! Hihi. Nog een keer? Kom me maar weer beneden halen.');
    } else if (RACE.t > 4 && p.y < 0.5 && P.grounded) {
      RACE.state = 'lost'; RACE.t = 0; pit.rotation.set(0, 0, 0); toast('PIT: Jij staat nog beneden! Ik win dus. Nog een keer?');
    }
  } else if (RACE.state === 'lost') {
    RACE.t += dt; pit.position.set(T.kast[0] + 2, H, T.kast[1] + 2);
    if (RACE.t > 3) RACE.state = 'idle';
  }
}

// ---------- 2. the owl on the Berk, and the magpies ----------
const OWL = V3(T.berk[0] - 1.2, top('berk'), T.berk[1] - 1.2);
const owl = new THREE.Group(); owl.position.copy(OWL); owl.scale.setScalar(1.4); scene.add(owl);
{
  const b = toon(0xa88a6a);
  mk(new THREE.SphereGeometry(0.4, 12, 10), b, 0, 0.5, 0, owl).scale.set(1, 1.15, 0.9);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.13, 8, 6), toon(0xffd04a), 0.15 * s, 0.75, 0.3, owl, 0); mk(new THREE.ConeGeometry(0.07, 0.2, 4), b, 0.22 * s, 1.02, 0.05, owl, 0); }
  owl.userData.eyes = [-1, 1].map((s) => mk(new THREE.SphereGeometry(0.06, 6, 4), ink, 0.15 * s, 0.75, 0.42, owl, 0));
  mk(new THREE.ConeGeometry(0.05, 0.14, 4), toon(0xffa040), 0, 0.64, 0.38, owl, 0).rotation.x = Math.PI / 2;
}
const magpies = done('ekster') ? [] : [[2.5, 0], [-2, 2.5], [0, -3]].map(([dx, dz]) => enemies.spawn('vleermuis', T.berk[0] + dx, T.berk[1] + dz, { y: top('berk'), color: 0x1a1a24, wing: 0xf4f4f4, eye: 0xffffff }));
const counted = new Set();
addSpeaker(owl, { y: 2, radius: 5, linger: 10, lines: () => (done('ekster') ? ['Zzzz… *oehoe*… zzzz.'] : ['Oehoe… ik ben zó moe. Die eksters laten me niet slapen.', 'Ze kakelen de hele dag! Spring op ze, alsjeblieft.']) });
function eksterReward() { addCookie(OWL.x + 1.6, OWL.y + 1.2, OWL.z + 1.6, NAMES.ekster); }
function updateOwl(dt, t) {
  const asleep = done('ekster');
  owl.userData.eyes.forEach((e) => (e.scale.y = asleep ? 0.15 : 1));
  owl.rotation.y = asleep ? 0 : Math.sin(t * 1.3) * 1.2;
  if (asleep) { for (const e of magpies) if (e.dead) e.deadT = 0; return; }
  for (const e of magpies) {
    if (!e.dead || counted.has(e)) continue;
    counted.add(e);
    const left = magpies.length - counted.size;
    if (left) toast(`Weg, ekster! Nog ${left}.`);
    else { finish('ekster'); sfx.cosmic(); toast('Alle eksters zijn weg. Het is stil in de Berk… de uil valt in slaap.'); eksterReward(); }
  }
}

// ---------- 3. the will-o'-the-wisp ----------
const PATH = [[-30, 30], [-36, 26], [-50, 25], [-58, 16], [-61, 4], [-55, -6], [-60, -16], [-61, -24]].map(([x, z]) => V3(x, 1.6, z));
export const DWAAL_END = V3(-61, 0, -27);
const wisp = new THREE.Group(); scene.add(wisp);
{
  mk(new THREE.SphereGeometry(0.35, 14, 10), new THREE.MeshBasicMaterial({ color: 0xd8fff0 }), 0, 0, 0, wisp, 0);
  mk(new THREE.SphereGeometry(0.6, 14, 10), new THREE.MeshBasicMaterial({ color: 0x9affd8, transparent: true, opacity: 0.3, depthWrite: false }), 0, 0, 0, wisp, 0);
  wisp.add(new THREE.PointLight(0x9affd8, 6, 9, 2));
}
// the roots round the hidden hollow: a cage with a roof, until the wisp opens it
const cage = [];
{
  const E = DWAAL_END;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; cage.push(block(E.x + Math.sin(a) * 2.6, 1.6, E.z + Math.cos(a) * 2.6, 0.8, 3.2, 0.8, 0x6a4a2a, 0x5a3a20)); }
  cage.push(block(E.x, 3.4, E.z, 6.2, 0.5, 6.2, 0x4a7a3a, 0x5a3a20));
}
const DW = { state: done('dwaal') ? 'done' : 'wait', i: 0, lost: 0 };
addSpeaker(wisp, { y: 1, radius: 4, linger: 6, cond: () => DW.state === 'wait', lines: ['*het lichtje zoemt en zweeft een stukje weg… en wacht op je*'] });
function openCage() { for (const b of cage) { const i = boxes.indexOf(b); if (i >= 0) boxes.splice(i, 1); scene.remove(b.mesh); } }
function dwaalReward() { addCookie(DWAAL_END.x + 0.8, 1.3, DWAAL_END.z + 0.8, NAMES.dwaal); }
if (DW.state === 'done') openCage();
function updateWisp(dt, t, P) {
  const p = P.pos;
  if (DW.state === 'done') { wisp.position.set(DWAAL_END.x, 2.6 + Math.sin(t * 2) * 0.2, DWAAL_END.z); return; }
  const bob = Math.sin(t * 3) * 0.25;
  if (DW.state === 'wait') {
    wisp.position.copy(PATH[0]).add(V3(0, bob, 0));
    if (p.distanceTo(wisp.position) < 3.5) { DW.state = 'lead'; DW.i = 1; DW.lost = 0; sfx.chime(); toast('Het dwaallicht zweeft weg… volg het! Niet te ver achterblijven.'); }
    return;
  }
  const far = Math.hypot(p.x - wisp.position.x, p.z - wisp.position.z);
  if (far > 7) DW.lost += dt; else DW.lost = 0;
  if (DW.lost > 3.5) { DW.state = 'wait'; sfx.hurt(); toast('Het dwaallicht is je kwijt… en vlucht terug naar het begin.'); return; }
  if (far < 6) {
    const goal = DW.i < PATH.length ? PATH[DW.i] : DWAAL_END.clone().setY(1.6);
    const d = goal.clone().sub(wisp.position).setY(0), L = d.length();
    wisp.position.addScaledVector(d, Math.min(1, (3.6 * dt) / (L || 1)));
    if (L < 0.3) {
      DW.i++;
      if (DW.i > PATH.length) {
        DW.state = 'done'; finish('dwaal'); openCage(); sfx.cosmic(); ctx.shake(0.3);
        puff(DWAAL_END.clone().add(V3(0, 1.5, 0)), 40, 0x9affd8, 5, 2);
        toast('De wortels kruipen opzij… een verborgen holletje!'); dwaalReward();
      }
    }
  }
  wisp.position.y = 1.6 + bob;
}

// ---------- 4. the liana race ----------
const LI = { state: done('liaan') ? 'done' : 'idle', t: 0 };
const first = CLIMBS.find((c) => c.r < 0.6 && Math.abs(c.x - LIANAS[0].x) < 0.01 && Math.abs(c.z - LIANAS[0].z) < 0.01);
const LIMIT = 16;
function liaanReward() { addCookie(T.hol[0] - 1.5, top('hol') + 1.2, T.hol[1] - 1.5, NAMES.liaan); }
function updateLiana(dt, P) {
  if (LI.state === 'done') return;
  const p = P.pos;
  if (LI.state === 'idle' && P.climb && P.climb.c === first) { LI.state = 'go'; LI.t = 0; sfx.chime(); toast(`Lianenrace! In ${LIMIT} seconden naar de Holle Boom!`); }
  if (LI.state !== 'go') return;
  const before = LI.t; LI.t += dt;
  for (const s of [10, 5]) if (LIMIT - before > s && LIMIT - LI.t <= s) toast(`Nog ${s} seconden!`);
  if (P.grounded && p.y > top('hol') - 0.3 && Math.hypot(p.x - T.hol[0], p.z - T.hol[1]) < VR('hol')) {
    LI.state = 'done'; finish('liaan'); sfx.cosmic(); toast(`Lianenslinger! In ${LI.t.toFixed(1)} seconden.`); liaanReward(); return;
  }
  if (LI.t > LIMIT || (P.grounded && p.y < 2)) { LI.state = 'idle'; sfx.hurt(); toast(LI.t > LIMIT ? 'Te laat! Begin weer bij de eerste liaan.' : 'In het mos gevallen! Begin weer bij de eerste liaan.'); }
}

// ---------- talking (Pit) ----------
export function trialWho(p) { return (RACE.state === 'idle' && p.distanceTo(pit.position) < 2.6) ? 'pit' : null; }
export function trialTalk(w) { if (w === 'pit') startRace(); }
export const trialPrompt = (w) => (w === 'pit' ? 'wedstrijd met Pit' : '');

export function updateTrials(dt, t, P) {
  if (!ctx) return;
  updatePit(dt, t, P);
  updateOwl(dt, t);
  updateWisp(dt, t, P);
  updateLiana(dt, P);
}
export function restoreTrials(s, gotSet) {
  if (done('pit') && !gotSet.has(NAMES.pit)) pitReward();
  if (done('ekster') && !gotSet.has(NAMES.ekster)) eksterReward();
  if (done('dwaal') && !gotSet.has(NAMES.dwaal)) dwaalReward();
  if (done('liaan') && !gotSet.has(NAMES.liaan)) liaanReward();
}
