import { THREE, scene, toon, addOutline, V3, puff, toast } from './core.js';
import { addCookie, cookies } from './cookies.js';
import { addSpeaker } from './bubbles.js';
import { getSave } from './save.js';
import * as sfx from './sfx.js';
import { BOAT, train, TRAIN_Y } from './regen-world.js';

// The challenges behind the cosmic cookies in the Regenstad:
//   plassen   – six big puddles in the streets. Ground-pound them all (SPLASH!) within 30 seconds of the first.
//   neonringen – five neon rings hang over the square. Fly through all of them within 12 seconds.
//               They're too far apart to just jump: you'll need Neon.
//   natte kat – a stray cat sits shivering in the alley by the canal. There's an umbrella on the hotel roof.
//   Smoezel   – a black alley cat pinched a fish from the snack bar. Catch it! It's faster than you when you're
//               close, but it gets out of breath.
//   patat     – Frits from the snack bar has hot chips for the hotel guest on the roof. 20 seconds before they're cold.
//   de trein  – the conductor on Station Plein bets you can't beat the tram to Station Hotel.
//   the boat  – a cookie rides on the roof of the tour boat (not a trial: it's just always moving).
const { save, gotSet, persist } = getSave('regen');
save.trials = save.trials || {};
const done = (k) => !!save.trials[k];
function finish(k) { save.trials[k] = true; persist(); }
export const TRIAL_RARE = 6;
const NAMES = { plas: 'Plons in alle plassen', ring: 'Door de neonringen', kat: 'Een paraplu voor de kat', smoezel: 'Smoezel gevangen', patat: 'Warme patat', trein: 'Sneller dan de trein' };
// these cookies were swapped for the trials above: don't let an old save count them
for (const n of ['Op het bioscoopbord', 'Op het kantoordak', 'Op de schotel van de flats']) if (gotSet.delete(n)) persist();

// a simple townsperson
function person(x, y, z, yaw, coat, extra) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; scene.add(g);
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 4, 10), toon(coat)); b.position.y = 0.7; addOutline(b, 1.06); g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), toon(0xf0c8a0)); h.position.y = 1.55; addOutline(h, 1.06); g.add(h);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0x1a1030 })); e.position.set(0.1 * s, 1.6, 0.25); g.add(e); }
  if (extra) extra(g);
  return g;
}
function catModel(color, eyes = 0x1a1030) {
  const g = new THREE.Group(); scene.add(g);
  const fur = toon(color);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), fur); b.position.y = 0.3; b.scale.set(1, 0.9, 1.3); addOutline(b, 1.08); g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), fur); h.position.set(0, 0.55, 0.32); addOutline(h, 1.08); g.add(h);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), fur); e.position.set(0.12 * s, 0.75, 0.32); g.add(e); const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: eyes })); eye.position.set(0.08 * s, 0.58, 0.52); g.add(eye); }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6), fur); tail.position.set(0, 0.55, -0.42); tail.rotation.x = -0.6; g.add(tail);
  return g;
}

// ---------- 1. puddles ----------
const PLAS_TIME = 30;
const PLASSEN = [[4, 0, 30], [-30, 0, 14], [24, 0, 12], [-20, 0, -4], [24, 0, -22], [-6, 0, -42]].map(([x, y, z]) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), new THREE.MeshBasicMaterial({ color: 0x3a6aaa, transparent: true, opacity: 0.85 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.03, z); scene.add(m);
  return { m, x, z, hit: false };
});
let plasT = 0;
export function trialPound(p) {
  if (done('plas')) return;
  for (const q of PLASSEN) {
    if (q.hit || Math.hypot(p.x - q.x, p.z - q.z) > 1.6 || p.y > 0.6) continue;
    q.hit = true; q.m.material.color.setHex(0x8ad8ff); sfx.pop();
    puff(V3(q.x, 0.4, q.z), 24, 0x8ad8ff, 6, 4);
    if (plasT <= 0) { plasT = PLAS_TIME; toast(`PLONS! Nog ${PLASSEN.length - 1} plassen, ${PLAS_TIME} seconden!`); }
    else { const left = PLASSEN.filter((r) => !r.hit).length; if (left) toast(`PLONS! Nog ${left}`); }
    if (PLASSEN.every((r) => r.hit)) { finish('plas'); plasT = 0; sfx.fanfare(); toast('Alle plassen! Er drijft iets in de laatste.'); plasReward(); }
  }
}
function plasReward() { const q = PLASSEN[PLASSEN.length - 1]; addCookie(q.x, 1.2, q.z, NAMES.plas); }

// ---------- 2. neon rings ----------
const RING_TIME = 12;
const RINGS = [[-8, 2.8, 34], [-2, 3.2, 24], [7, 3, 18], [14, 3.6, 30], [22, 3.4, 36]].map(([x, y, z], i) => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.12, 8, 28), new THREE.MeshBasicMaterial({ color: 0xff4ad8 }));
  m.position.set(x, y, z); m.rotation.y = i * 0.6; scene.add(m);
  return { m, on: false };
});
let ringT = 0;
const ringSign = new THREE.Group(); ringSign.position.set(-10, 0, 38); scene.add(ringSign);
addSpeaker(ringSign, { y: 2.6, radius: 5, linger: 10, cond: () => !done('ring'), lines: ['Neonringen! Vlieg erdoorheen. Alle vijf binnen 12 seconden.', 'Te ver om te springen? Kopieer de neonmot bij de bioscoop.'] });

// ---------- 3. the wet cat ----------
const KAT_AT = V3(-22, 0, 12.2);
const UMBRELLA_AT = V3(33, 6.9, -10);
const kat = catModel(0xd8a060); kat.position.copy(KAT_AT); kat.rotation.y = Math.PI;
{
  // a soggy cardboard box behind it
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, 1), toon(0x8a6a4a)); box.position.set(0, 0.35, -0.8); kat.add(box);
}
function umbrella(color) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.4, 8, 1, true), toon(color)); top.material.side = THREE.DoubleSide; top.position.y = 1.2; g.add(top);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2), toon(0x3a3a4a)); stick.position.y = 0.6; g.add(stick);
  scene.add(g); return g;
}
const umb = umbrella(0xffd04a);
let carrying = !!save.umbrella && !done('kat');
addSpeaker(kat, { y: 1.3, radius: 4, linger: 10, lines: () => (done('kat') ? ['*spinnnn*', '*de kat zit lekker droog onder de paraplu*'] : ['*miauw…* *bibber*', '(De kat is doorweekt. Had iemand maar een paraplu…)']) });
function katReward() { addCookie(KAT_AT.x + 1.2, 1.2, KAT_AT.z, NAMES.kat); }

// ---------- 4. Smoezel, the fish thief ----------
// He runs a loop: along the canal, up the cinema's fire escape, over its roof, down and back.
const SMOEZEL_PATH = [[17, 0, 12.5], [8, 0, 12.5], [2, 0, 17], [-11, 0, 15.6], [-11, 4, 20.6], [-14, 4, 20.6], [-22, 4, 18], [-24, 0, 14.6], [-14, 0, 12], [-4, 0, 12.5]].map(([x, y, z]) => V3(x, y, z));
const smoezel = catModel(0x2a2a34, 0x8aff6a);
const fish = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 6), toon(0x9ab8d8)); fish.rotation.z = Math.PI / 2; fish.position.set(0, 0.5, 0.58); smoezel.add(fish);
const SMOEZEL_HOME = V3(14, 0, 12.6);
const S = { state: done('smoezel') ? 'home' : 'sit', i: 0, k: 0, sprint: 0, rest: 0 };
smoezel.position.copy(S.state === 'home' ? SMOEZEL_HOME : SMOEZEL_PATH[0]);
addSpeaker(smoezel, { y: 1.1, radius: 4, linger: 4, lines: () => (S.state === 'home' ? ['*smak smak* (Frits gaf hem gewoon een visje.)'] : S.rest > 0 ? ['*hijg* *hijg*'] : ['Miauw! Mooi visje hè? Lekker van míj.']) });
function smoezelReward() { addCookie(SMOEZEL_HOME.x + 1.4, 1.2, SMOEZEL_HOME.z, NAMES.smoezel); }
function updateSmoezel(dt, t, p) {
  if (S.state === 'home') { smoezel.position.copy(SMOEZEL_HOME); fish.visible = false; smoezel.rotation.y = Math.PI; return; }
  const d = Math.hypot(p.x - smoezel.position.x, p.z - smoezel.position.z), dy = Math.abs(p.y - smoezel.position.y);
  if (S.state === 'sit') {
    smoezel.position.copy(SMOEZEL_PATH[0]); smoezel.rotation.y = Math.PI / 2;
    if (d < 3.5 && dy < 2) { S.state = 'run'; S.sprint = 0; toast('Die zwarte kat heeft een vis van de snackbar gepikt! Pak hem!'); sfx.wake(); }
    return;
  }
  if (d < 1.3 && dy < 1.4) {
    S.state = 'home'; finish('smoezel'); sfx.cosmic(); toast('Hebbes! Frits ruilt de vis wel voor een visje van gisteren.');
    puff(smoezel.position.clone().add(V3(0, 0.5, 0)), 20, 0x8aff6a, 4, 2); smoezelReward(); return;
  }
  // close by he bolts (faster than you!), but after a sprint he has to catch his breath
  let speed = d < 4.5 ? 7.8 : 3.4;
  if (S.rest > 0) { S.rest -= dt; speed = 0; }
  else if (d < 4.5) { S.sprint += dt; if (S.sprint > 2.6) { S.sprint = 0; S.rest = 1.3; } }
  const a = SMOEZEL_PATH[S.i], b = SMOEZEL_PATH[(S.i + 1) % SMOEZEL_PATH.length];
  const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  S.k += (speed * dt) / L;
  if (S.k >= 1) { S.k = 0; S.i = (S.i + 1) % SMOEZEL_PATH.length; return; }
  const hop = Math.abs(b.y - a.y) > 0.5 ? Math.sin(Math.PI * S.k) * 1.4 : 0;
  smoezel.position.set(a.x + (b.x - a.x) * S.k, a.y + (b.y - a.y) * S.k + hop, a.z + (b.z - a.z) * S.k);
  smoezel.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
  smoezel.rotation.z = speed ? Math.sin(t * 24) * 0.08 : 0;
}

// ---------- 5. hot chips for the hotel roof ----------
const FRITS_AT = V3(19.5, 0, 12.8), GAST_AT = V3(37, 6, -5);
const PATAT_TIME = 20;
person(FRITS_AT.x, FRITS_AT.y, FRITS_AT.z, Math.PI, 0xf4f4f4, (g) => { const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.3, 10), toon(0xf4f4f4)); hat.position.y = 1.9; g.add(hat); });
const gast = person(GAST_AT.x, GAST_AT.y, GAST_AT.z, -Math.PI / 2, 0x8ad8ff);
const patat = new THREE.Group(); scene.add(patat); patat.visible = false;
{
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 8), toon(0xe0443a)); cone.rotation.x = Math.PI; patat.add(cone);
  for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), toon(0xffd04a)); f.position.set((Math.random() - 0.5) * 0.2, 0.25, (Math.random() - 0.5) * 0.2); f.rotation.z = (Math.random() - 0.5) * 0.5; patat.add(f); }
}
let patatT = 0;
const fritsSpot = new THREE.Group(); fritsSpot.position.copy(FRITS_AT); scene.add(fritsSpot);
addSpeaker(fritsSpot, { y: 2.3, radius: 4.5, linger: 8, lines: () => (done('patat') ? ['Bedankt, maat! De gast op het hoteldak was er heel blij mee.'] : patatT > 0 ? ['Rennen! Koude patat is zielig.'] : ['Patatje voor de gast op het hoteldak! Wel snel, hij wordt koud.']) });
addSpeaker(gast, { y: 2.2, radius: 4, linger: 8, lines: () => (done('patat') ? ['*smikkel* Patat in de regen. Heerlijk.'] : ['Ik heb patat besteld bij de snackbar… Twintig minuten geleden.']) });
function patatReward() { addCookie(GAST_AT.x - 1.4, GAST_AT.y + 1.2, GAST_AT.z, NAMES.patat); }
function updatePatat(dt, t, p) {
  if (done('patat')) { patat.visible = true; patat.position.set(GAST_AT.x - 0.3, GAST_AT.y + 1.1, GAST_AT.z + 0.4); return; }
  if (patatT <= 0) {
    patat.visible = false;
    if (p.distanceTo(FRITS_AT) < 2.2) { patatT = PATAT_TIME; sfx.click(); toast(`Warme patat! Breng hem naar de gast op het hoteldak: ${PATAT_TIME} seconden`); }
    return;
  }
  const before = patatT; patatT -= dt;
  patat.visible = true; patat.position.set(p.x + 0.5, p.y + 1.1, p.z);
  if (Math.random() < 0.3) puff(patat.position.clone().add(V3(0, 0.4, 0)), 1, 0xffffff, 0.6, 1.5);   // steam
  for (const s of [10, 5]) if (before > s && patatT <= s) toast(`Nog ${s} seconden!`);
  if (p.distanceTo(GAST_AT) < 2) { patatT = 0; finish('patat'); sfx.cosmic(); toast('Precies op tijd! Nog lekker warm.'); patatReward(); return; }
  if (patatT <= 0) { sfx.hurt(); toast('De patat is koud geworden… Haal een nieuwe bij Frits.'); }
}

// ---------- 6. race the tram to Station Hotel ----------
const CONDUCTEUR_AT = V3(2.4, TRAIN_Y, 38.4), FINISH = V3(40, 0, 1);
const conducteur = person(CONDUCTEUR_AT.x, CONDUCTEUR_AT.y, CONDUCTEUR_AT.z, -Math.PI / 2, 0x2a3a8a, (g) => { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 12), toon(0x2a3a8a)); cap.position.y = 1.82; g.add(cap); });
const finishRing = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 28), new THREE.MeshBasicMaterial({ color: 0x8aff6a, side: THREE.DoubleSide }));
finishRing.rotation.x = -Math.PI / 2; finishRing.position.set(FINISH.x, 0.05, FINISH.z); scene.add(finishRing); finishRing.visible = false;
const R = { state: 'idle', prev: [train.x, train.z] };
addSpeaker(conducteur, { y: 2.2, radius: 4, linger: 10, lines: () => (done('trein') ? ['Sneller dan mijn trein! Dat heb ik nog nooit gezien.'] : ['Denk je dat je sneller bent dan mijn trein? Wacht hier op het perron.', 'Als hij vertrekt: rennen naar Station Hotel! Wie is er eerst?']) });
function treinReward() { addCookie(FINISH.x, 1.2, FINISH.z - 1.6, NAMES.trein); }
function updateRace(dt, t, p) {
  const atPlein = Math.hypot(train.x, train.z - 42) < 0.05;
  const leaving = Math.hypot(R.prev[0], R.prev[1] - 42) < 0.05 && !atPlein;
  R.prev = [train.x, train.z];
  if (done('trein')) { finishRing.visible = false; return; }
  const near = p.distanceTo(CONDUCTEUR_AT) < 4;
  if (R.state === 'idle' && near && atPlein) { R.state = 'ready'; toast('Op je plaats… wacht tot de trein vertrekt!'); }
  else if (R.state === 'ready') {
    if (!near) R.state = 'idle';
    else if (leaving) { R.state = 'go'; finishRing.visible = true; sfx.fanfare(); toast('GA! Ren naar Station Hotel, aan de overkant van de brug!'); }
  } else if (R.state === 'go') {
    finishRing.material.color.setHex(Math.sin(t * 10) > 0 ? 0x8aff6a : 0xffffff);
    if (Math.hypot(p.x - FINISH.x, p.z - FINISH.z) < 1.6 && p.y < 1.5) { R.state = 'idle'; finishRing.visible = false; finish('trein'); sfx.cosmic(); toast('Eerst! Sneller dan de trein!'); treinReward(); }
    else if (Math.hypot(train.x - 47, train.z + 6) < 0.3) { R.state = 'idle'; finishRing.visible = false; sfx.hurt(); toast('De trein was eerder! Probeer het nog eens vanaf Station Plein.'); }
  }
}

// ---------- the boat cookie ----------
const BOAT_NAME = 'Op de rondvaartboot';
const boatCookie = addCookie(BOAT.x, BOAT.roof + 1.1, BOAT.z, BOAT_NAME);

// ---------- every frame ----------
export function updateTrials(dt, t, P) {
  const p = P.pos;
  // puddles
  if (plasT > 0) { plasT -= dt; if (plasT <= 0 && !done('plas')) { PLASSEN.forEach((q) => { q.hit = false; q.m.material.color.setHex(0x3a6aaa); }); toast('Te laat! De plassen lopen weer vol. Probeer het opnieuw.'); sfx.hurt(); } }
  for (const q of PLASSEN) if (!q.hit) q.m.scale.setScalar(1 + Math.sin(t * 3 + q.x) * 0.04);
  // rings
  for (const r of RINGS) {
    r.m.visible = !done('ring'); if (done('ring')) continue;
    r.m.rotation.y += dt * 0.8;
    if (!r.on && p.clone().add(V3(0, 0.8, 0)).distanceTo(r.m.position) < 1.3) {
      r.on = true; r.m.material.color.setHex(0x8aff6a); sfx.note(RINGS.filter((q) => q.on).length * 2);
      if (ringT <= 0) { ringT = RING_TIME; toast(`Ring! Nog 4 in ${RING_TIME} seconden`); }
      const left = RINGS.filter((q) => !q.on).length;
      if (!left) { finish('ring'); ringT = 0; sfx.fanfare(); toast('Door alle neonringen!'); RINGS.forEach((q) => (q.m.visible = false)); ringReward(); }
    }
  }
  if (ringT > 0) { ringT -= dt; if (ringT <= 0 && !done('ring')) { RINGS.forEach((q) => { q.on = false; q.m.material.color.setHex(0xff4ad8); }); toast('Te laat! De ringen gaan weer uit.'); sfx.hurt(); } }
  // umbrella and cat
  if (done('kat')) { umb.position.set(KAT_AT.x, 0, KAT_AT.z - 0.1); }
  else if (carrying) {
    umb.position.set(p.x, p.y + 0.8, p.z);
    if (p.distanceTo(KAT_AT) < 1.6) { carrying = false; save.umbrella = false; finish('kat'); sfx.cosmic(); toast('De kat zit droog! *spinnn*'); katReward(); }
  } else {
    umb.position.copy(UMBRELLA_AT).add(V3(0, Math.sin(t * 2) * 0.1, 0));
    if (p.clone().add(V3(0, 0.8, 0)).distanceTo(UMBRELLA_AT.clone().add(V3(0, 0.6, 0))) < 1.4) { carrying = true; save.umbrella = true; persist(); sfx.click(); toast('Een paraplu! Wie zou die nodig hebben?'); }
  }
  kat.rotation.z = done('kat') ? 0 : Math.sin(t * 30) * 0.03;      // shivering
  updateSmoezel(dt, t, p);
  updatePatat(dt, t, p);
  updateRace(dt, t, p);
  // the boat cookie rides along on the cabin roof
  if (!boatCookie.got) { boatCookie.g.position.x = BOAT.x; boatCookie.g.position.z = BOAT.z; }
}
function ringReward() { addCookie(RINGS[4].m.position.x, 1.2, RINGS[4].m.position.z, NAMES.ring); }

// back after a refresh
export function restoreTrials(s, gotSet) {
  if (done('plas') && !gotSet.has(NAMES.plas)) plasReward();
  if (done('ring') && !gotSet.has(NAMES.ring)) ringReward();
  if (done('kat') && !gotSet.has(NAMES.kat)) katReward();
  if (done('smoezel') && !gotSet.has(NAMES.smoezel)) smoezelReward();
  if (done('patat') && !gotSet.has(NAMES.patat)) patatReward();
  if (done('trein') && !gotSet.has(NAMES.trein)) treinReward();
  carrying = !!save.umbrella && !done('kat');
}
