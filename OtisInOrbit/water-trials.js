import { THREE, scene, toon, addOutline, V3, puff, toast } from './core.js';
import { addCookie, cookies } from './cookies.js';
import { addSpeaker } from './bubbles.js';
import { getSave } from './save.js';
import * as sfx from './sfx.js';
import { WATER_HI, TOP, BEACH } from './water-terrain.js';
import { cycle, PINGO_AT, bergCookiePos } from './water-world.js';

// The challenges behind the cosmic cookies on the Waterplaneet that aren't just "get up there":
//   Pingo's visjes – eight fish frozen into the ice between the strand, the bay and the palace. Only at night.
//                    Grab the first and you have 20 seconds for the rest.
//   ijsgeesten     – three ice spirits come out at night: on the strand, on the lighthouse island and out on the
//                    ice towards the reef. Touch all three in ONE night. There's no ice from the strand to
//                    the lighthouse, so you'll be running the long way round (or freezing your own floes).
//   ijsberg        – its cookie is frozen into the top of the iceberg. At night the berg lies against the bay
//                    but the cookie's in ice; by day it's melted free, but the berg has drifted out to sea.
const { save, persist } = getSave('water');
const done = (k) => !!(save.trials && save.trials[k]);
function finish(k) { save.trials = { ...(save.trials || {}), [k]: true }; persist(); }
export const TRIAL_RARE = 2;          // cookies that only exist once a trial is done
const NAMES = { vis: 'Pingo’s visjes', geest: 'De drie ijsgeesten' };

// ---------- 1. Pingo's visjes ----------
const FISH_TIME = 20;
const FISH = [[-1.8, 7], [2, 14], [-2, 24], [-15, 33.5], [-22, 30.9], [-24.5, 16.1], [-19, 9.8], [-12, 1.6]];
const fishMat = toon(0xff9a3a), finMat = toon(0xe0603a);
const fish = FISH.map(([x, z], i) => {
  const g = new THREE.Group(); g.position.set(x, WATER_HI + 0.55, z); scene.add(g);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), fishMat); b.scale.set(1.5, 0.8, 0.6); addOutline(b, 1.1); g.add(b);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 4), finMat); tail.rotation.z = Math.PI / 2; tail.position.x = -0.55; g.add(tail);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0x1a1030 })); eye.position.set(0.28, 0.06, 0.15); g.add(eye);
  g.rotation.y = i * 1.3;
  return { g, x, z, got: false };
});
let fishRun = false, fishT = 0;
const fishLeft = () => fish.filter((f) => !f.got).length;
function resetFish(msg) { fishRun = false; for (const f of fish) f.got = false; if (msg) { toast(msg); sfx.hurt(); } }
function fishReward() { addCookie(PINGO_AT.x + 1.6, TOP + 1.2, PINGO_AT.z - 1.2, NAMES.vis); }

// ---------- 2. de drie ijsgeesten ----------
const GHOSTS = [V3(-9, TOP, 47), V3(30.5, TOP, -3), V3(0, WATER_HI, -42)];
const ghostMat = new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.8 });
const ghostOn = new THREE.MeshBasicMaterial({ color: 0x7affc8, transparent: true, opacity: 0.85 });
const ghosts = GHOSTS.map((at) => {
  const g = new THREE.Group(); g.position.copy(at); scene.add(g);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), ghostMat); head.position.y = 1.4; g.add(head);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1, 10), ghostMat); tail.rotation.x = Math.PI; tail.position.y = 0.8; g.add(tail);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0x1a1030 })); e.position.set(0.13 * s, 1.45, 0.35); g.add(e); }
  const l = new THREE.PointLight(0x9ae8ff, 4, 7, 2); l.position.y = 1.4; g.add(l);
  return { g, at, head, tail, l, on: false };
});
addSpeaker(ghosts[0].g, { y: 2.3, radius: 4, linger: 10, lines: () => (done('geest') ? ['*zweeft tevreden rond*'] : ['Hoeoeoe… wij zijn met z’n drieën. Eén hier, één bij de vuurtoren, één op het ijs bij het rif.', 'Raak ons alle drie aan in één nacht. Bij zonsopgang zijn we weg, en dan begin je opnieuw.']) });
let ghostNight = false;
function resetGhosts() { for (const g of ghosts) { g.on = false; g.head.material = g.tail.material = ghostMat; } }
function ghostReward() { addCookie(GHOSTS[0].x + 1.5, TOP + 1.2, GHOSTS[0].z, NAMES.geest); }

// ---------- 3. de ijsberg ----------
let bergCookie = null;
const BERG_NAME = 'In de ijsberg';

// ---------- every frame ----------
export function updateTrials(dt, t, P) {
  const night = cycle.n > 0.5;
  const p = P.pos;
  // fish: only out on the ice at night
  for (const f of fish) {
    f.g.visible = night && !f.got && !done('vis');
    if (!f.g.visible) continue;
    f.g.position.y = WATER_HI + 0.55 + Math.sin(t * 4 + f.x) * 0.1; f.g.rotation.y += dt * 1.5;
    if (Math.hypot(p.x - f.x, p.z - f.z) < 1.3 && Math.abs(p.y + 0.6 - f.g.position.y) < 1.4) {
      f.got = true; sfx.coin(); puff(f.g.position.clone(), 8, 0xff9a3a, 3, 1.5);
      if (!fishRun) { fishRun = true; fishT = FISH_TIME; toast(`Een visje! Nog ${fishLeft()} in ${FISH_TIME} seconden`); }
      else if (fishLeft()) toast(`Nog ${fishLeft()} visjes`);
      if (!fishLeft()) { fishRun = false; finish('vis'); sfx.fanfare(); toast('Alle visjes! Pingo legt een koekje bij zijn rots.'); fishReward(); }
    }
  }
  if (fishRun) {
    fishT -= dt;
    if (fishT <= 0) resetFish('Te laat! De visjes zwemmen terug onder het ijs. Pak er één om opnieuw te beginnen');
    else if (!night) resetFish('Het ijs smelt… de visjes zijn weg. Probeer het vannacht opnieuw');
  }
  // ghosts: out at night; at dawn they fade and reset
  if (night !== ghostNight) { ghostNight = night; if (!night && ghosts.some((g) => g.on) && !done('geest')) toast('De ijsgeesten verdwijnen in de ochtendzon. Volgende nacht opnieuw!'); resetGhosts(); }
  for (const g of ghosts) {
    g.g.visible = night && !done('geest');
    if (!g.g.visible) continue;
    g.g.position.y = g.at.y + Math.sin(t * 2 + g.at.x) * 0.25; g.g.rotation.y = t * 0.8;
    g.l.color.setHex(g.on ? 0x7affc8 : 0x9ae8ff);
    if (!g.on && Math.hypot(p.x - g.at.x, p.z - g.at.z) < 1.4 && Math.abs(p.y - g.at.y) < 2.2) {
      g.on = true; g.head.material = g.tail.material = ghostOn; sfx.checkpoint(); puff(g.g.position.clone().add(V3(0, 1.4, 0)), 14, 0x7affc8, 3, 1.5);
      const left = ghosts.filter((q) => !q.on).length;
      if (left) toast(`Hoeoeoe! Nog ${left} ijsgeest${left > 1 ? 'en' : ''} vannacht`);
      else { finish('geest'); sfx.fanfare(); toast('Alle drie de ijsgeesten! Er ligt iets op het strand.'); ghostReward(); }
    }
  }
  // the iceberg cookie rides along with the berg; while the berg's frozen you can't get at it
  if (!bergCookie) bergCookie = cookies.find((c) => c.name === BERG_NAME && !c.got) || null;
  if (bergCookie && !bergCookie.got) {
    const q = bergCookiePos();
    bergCookie.g.position.x = q.x; bergCookie.g.position.z = q.z;
    bergCookie.base = cycle.n > 0.25 ? -999 : q.y;     // encased: sunk out of reach (the ice block shows where it is)
    if (cycle.n > 0.25) bergCookie.g.position.y = q.y;
  }
}

// the iceberg cookie itself (made here so its position can follow the berg)
{ const q = bergCookiePos(); addCookie(q.x, q.y, q.z, BERG_NAME); }

// back after a refresh
export function restoreTrials(s, gotSet) {
  if (done('vis') && !gotSet.has(NAMES.vis)) fishReward();
  if (done('geest') && !gotSet.has(NAMES.geest)) ghostReward();
  void BEACH;
}
