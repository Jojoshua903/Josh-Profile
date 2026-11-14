import { THREE, G, V3, toon, basic, mk, clamp, frameDir, puff, banner, rOf } from './core.js?v=20261114b';
import { sfx } from './audio.js?v=20261114b';
import { P, healPlayer } from './player.js?v=20261114b';
import { coinRing, sign } from './worlds-common.js?v=20261114b';
import { textBoard } from './models.js?v=20261114b';
import { fbm } from './world.js?v=20261114b';

// MINI-GALAXY: the most Mario Galaxy thing there is. Every story planet gets a bounce pad near where you land,
// with four little planets floating above it, each with its own gravity. Bounce up, walk round a little planet to
// the side that faces the next one, and jump: its gravity grabs you. A golden star waits on the last one.
// (The gravity switch itself lives in player.js: planets with a `field` pull you in.)
const ang = (a, b) => Math.acos(clamp(a.dot(b), -1, 1));
const ws = (o) => o.ws || {};

// a spot near the spawn with nothing on the ground in the way, and nothing tall poking up into the planets
function findSpot(w) {
  const pl = w.main, R = pl.r, s = w.spawn.dir;
  const solids = pl.platforms.map((pf) => ({ n: pf.n, r: pf.r || Math.max(pf.hx || 0, pf.hz || 0) || 2, h: pf.h }));
  for (const deg of [16, 22, 28, 12, 34]) {
    for (let a = 0; a < 360; a += 30) {
      const d = frameDir(s, 90 - deg, a + deg * 7);
      const ok = solids.every((p) => { const dist = ang(p.n, d) * R; return dist > p.r + 3 && (p.h < 4 || dist > p.r + 16); })
        && w.npcs.every((n) => ang(n.dir, d) * R > 5) && (!w.rocket || ang(w.rocket.g.position.clone().sub(pl.c).normalize(), d) * R > 6);
      if (ok) return d;
    }
  }
  return null;
}

export function addMiniGalaxy(w, o = {}) {
  const main = w.main; if (!main || !w.spawn) return;
  const d0 = findSpot(w); if (!d0) return;
  const R = rOf(main, d0), up = d0.clone();   // (rOf: shaped planets are taller in places)
  main.field = main.field || 9;   // so you can drop back down to the big planet
  // the bounce pad and a sign
  w.addPlatform(main, { dir: d0, h: 0.35, r: 1.3, bounce: 22, color: 0xff7ad8, top: 0xffffff, puff: 0xffd36a });
  const side = new THREE.Vector3().crossVectors(up, Math.abs(up.y) < 0.9 ? V3(0, 1, 0) : V3(1, 0, 0)).normalize();
  sign(w, main, frameDir(d0, 90 - 3.6 / R * 57.3, 0), textBoard(o.nl ? '🌌 MINI-MELKWEG' : '🌌 MINI-GALAXY', 2.2, 0.8, '#ffd36a', '#2b2440'), 0.4, 1.8);
  // four little planets, each a hop away from the last, stepping up and curving round
  const COLS = [[0x7dd87a, 0x4a9a5a], [0xff9ac8, 0xc85a8a], [0x9fc8ff, 0x5a7ac8], [0xffd36a, 0xd8a03a]];
  const plan = [{ r: 2.5 }, { r: 2.2 }, { r: 2.6 }, { r: 3.0 }];
  let c = main.c.clone().addScaledVector(up, R + 6 + plan[0].r), t = side.clone();
  const mini = [];
  plan.forEach((p, i) => {
    if (i > 0) {
      t.applyAxisAngle(up, 0.9);   // curve round
      c = c.clone().addScaledVector(t, mini[i - 1].r + p.r + 4.2).addScaledVector(up, 1.8);
    }
    const [a, b] = COLS[i];
    const q = w.addPlanet({ c: c.clone(), r: p.r, seg: 32, atmo: a, atmoOp: 0.1, paint: (n, out) => out.setHex(fbm(n.clone().multiplyScalar(2.2), 2) > 0.52 ? a : b) });
    q.field = 4;
    mini.push(q);
    // a tiny tree or crystal on top, for looks
    const top = q.c.clone().sub(main.c).normalize();
    const g = new THREE.Group();
    if (i % 2) mk(new THREE.OctahedronGeometry(0.45), basic(a), 0, 0.5, 0, g, 1.08);
    else { mk(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 6), toon(0x6a4a2a), 0, 0.35, 0, g, 1.1); mk(new THREE.SphereGeometry(0.38, 10, 8), toon(a), 0, 0.85, 0, g, 1.08); }
    w.put(q, g, frameDir(top, 60, i * 90), 0);
    if (i < plan.length - 1) coinRing(w, q, top, 1.0, 4, 0.8);
  });
  // the golden star on the last one
  const last = mini[mini.length - 1], topL = last.c.clone().sub(main.c).normalize();
  coinRing(w, last, topL, 1.4, 6, 0.8);
  const st = ws(o);
  if (!st.mini) {
    const star = new THREE.Group();
    const s = mk(new THREE.OctahedronGeometry(0.55), toon(0xffd23a), 0, 0, 0, star, 1.1); s.scale.set(1, 1.3, 0.5);
    star.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), basic(0xffe27a, { transparent: true, opacity: 0.2, depthWrite: false })));
    w.addPickup(last, topL, 1.2, 'side', { model: star, radius: 1.4, spin: 3, onTake: () => {
      st.mini = true; if (o.persist) o.persist();
      sfx.rare(); banner(o.nl ? 'MINI-MELKWEG!' : 'MINI-GALAXY!', o.nl ? '+25 bouten · hartjes vol' : '+25 bolts · hearts refilled', '#ffd23a');
      G.coins += 25; if (G.onCoin) G.onCoin(); healPlayer(P.maxHp);
      puff(P.pos.clone().addScaledVector(P.up, 1), 30, 0xffd23a, 5, 2);
    } });
  }
  // a little whoosh when another planet's gravity grabs you, and a tip the first time you get close
  G.onGravity = () => { sfx.whoosh(); puff(P.pos.clone(), 8, 0xc8b0ff, 2, 0.5); };
  w.updaters.push(() => {
    if (P.planet !== main || G.cutscene || !G.toastOnce) return;
    if (ang(P.up, d0) * R < 5) G.toastOnce('mini', o.nl ? '🌌 Een mini-melkweg! Stuiter omhoog en spring van planeetje naar planeetje. Elk heeft zijn eigen zwaartekracht!' : '🌌 A mini-galaxy! Bounce up, then jump from planet to planet. Each one has its own gravity!');
  });
}
