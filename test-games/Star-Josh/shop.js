// Niffo's shop: hats, trails and one-run boosts, paid for with shells.
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import * as MD from './models.js';
import { rng, todayKey } from './replay.js';

export const SHOP = [
  { id: 'party', kind: 'hat', name: 'PARTY HAT', icon: '🥳', price: 120, desc: 'For when you beat the mothership. Or just because.' },
  { id: 'propeller', kind: 'hat', name: 'PROPELLER CAP', icon: '🧢', price: 150, desc: 'Spins. Does nothing. Essential.' },
  { id: 'chef', kind: 'hat', name: 'CHEF\'S HAT', icon: '👨‍🍳', price: 180, desc: 'Guiseppe approved. Smells faintly of apple.' },
  { id: 'cowboy', kind: 'hat', name: 'COWBOY HAT', icon: '🤠', price: 200, desc: 'This sky ain\'t big enough for the two of us, Meta.' },
  { id: 'mortar', kind: 'hat', name: 'MORTARBOARD', icon: '🎓', price: 250, desc: 'Bastiaan\'s spare. Do not lose it.' },
  { id: 'viking', kind: 'hat', name: 'VIKING HELMET', icon: '⚔️', price: 300, desc: 'Lars swears it belonged to his great-great-grandfather.' },
  { id: 'halo', kind: 'hat', name: 'HALO', icon: '😇', price: 350, desc: 'You have never done anything wrong. Ever.' },
  { id: 'crown', kind: 'hat', name: 'ROYAL CROWN', icon: '👑', price: 450, desc: 'Fit for a crystal princess. Marloes is watching.' },
  { id: 'fish', kind: 'hat', name: 'A FISH', icon: '🐟', price: 90, desc: 'A fish. On your head. One of each, as always.' },
  { id: 'hearts', kind: 'trail', name: 'HEART TRAIL', icon: '💗', price: 200, desc: 'Leave a trail of love. Meta AI hates it.', col: [0xff3d7f, 0xff8fab] },
  { id: 'bubbles', kind: 'trail', name: 'BUBBLE TRAIL', icon: '🫧', price: 200, desc: 'Fresh from Niffo\'s river.', col: [0x9fd8ff, 0xffffff] },
  { id: 'fire', kind: 'trail', name: 'FIRE TRAIL', icon: '🔥', price: 260, desc: 'Daniel\'s favourite. Not fireproof.', col: [0xff5a1f, 0xffd23f] },
  { id: 'pixels', kind: 'trail', name: 'PIXEL TRAIL', icon: '👾', price: 260, desc: 'Straight out of Guiseppe\'s Apple Adventure.', col: [0x00f5d4, 0xff006e] },
  { id: 'rainbow', kind: 'trail', name: 'RAINBOW TRAIL', icon: '🌈', price: 400, desc: 'Every colour. One of each.', col: [0xff3d5a, 0xffd23f, 0x2ec27e, 0x2f5bff, 0x9b5de5] },
  { id: 'plating', kind: 'boost', name: 'EXTRA PLATING', icon: '🛡️', price: 80, desc: '+40 max shield for your next stage or run.' },
  { id: 'double', kind: 'boost', name: 'DOUBLE SHOT START', icon: '🔷', price: 60, desc: 'Start your next stage or run at Power II.' },
  { id: 'charged', kind: 'boost', name: 'CHARGED UP', icon: '⚡', price: 50, desc: 'Start your next stage or run with a full special.' },
  { id: 'revive', kind: 'boost', name: 'SECOND CHANCE', icon: '💖', price: 150, desc: 'Get shot down once, come back with half shield.' },
];
export const SHOP_BY = Object.fromEntries(SHOP.map(i => [i.id, i]));

// One item 40% off each day, the same for everyone.
export function dealOfDay() {
  const r = rng(+todayKey().replaceAll('-', '') * 7 + 3), list = SHOP.filter(i => i.kind !== 'boost');
  return list[Math.floor(r() * list.length)].id;
}
export const priceOf = id => Math.round(SHOP_BY[id].price * (dealOfDay() === id ? 0.6 : 1));

export const NIFFO_LINES = ['Rare wares! One of each!', 'Shells only. No refunds. No Meta coins.', 'Fionn gets the family discount. Full price.',
  'That one? Very rare. Found it in a river.', 'Browse all you like. Touching costs extra.', 'Today\'s deal won\'t last. Unlike my prices.'];
export const NIFFO_BUY = ['Pleasure doing business!', 'Excellent taste. Nearly as good as mine.', 'Sold! No take-backs.', 'Wear it with pride.'];
export const NIFFO_BROKE = ['Not enough shells, friend. Go fly a few stages.', 'Come back with more shells.', 'Credit? Ha. No.'];

const M = (c, o) => MD.M(c, o);
function cone(r, h, c) { return new THREE.Mesh(new THREE.ConeGeometry(r, h, 16), M(c)); }
function cyl(a, b, h, c) { return new THREE.Mesh(new THREE.CylinderGeometry(a, b, h, 18), M(c)); }
export function makeHat(id) {
  const g = new THREE.Group(), add = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
  if (id === 'party') { add(cone(0.28, 0.7, 0xff3d7f), 0, 0.35); add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M(0xffd23f)), 0, 0.72); }
  else if (id === 'propeller') { add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0x2f5bff))); add(cyl(0.02, 0.02, 0.25, 0x132044), 0, 0.42); const p = add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.12), M(0xffd23f)), 0, 0.55); g.userData.spin = p; }
  else if (id === 'chef') { add(cyl(0.3, 0.3, 0.3, 0xffffff), 0, 0.15); add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), M(0xffffff)), 0, 0.45).scale.set(1, 0.7, 1); }
  else if (id === 'cowboy') { add(cyl(0.65, 0.65, 0.05, 0x8b5e34)); add(cyl(0.3, 0.36, 0.35, 0x8b5e34), 0, 0.2); add(cyl(0.37, 0.37, 0.07, 0x3d2b1f), 0, 0.06); }
  else if (id === 'mortar') { add(cyl(0.32, 0.32, 0.2, 0x111111), 0, 0.1); const b = add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.9), M(0x111111)), 0, 0.22); b.rotation.y = Math.PI / 4; add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), M(0xffd23f)), 0.3, 0.05, 0.3); }
  else if (id === 'viking') { add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0x8d99ae, { metalness: 0.6, roughness: 0.3 }))); for (const s of [-1, 1]) { const h = add(cone(0.09, 0.5, 0xfff6e4), s * 0.42, 0.25); h.rotation.z = -s * 0.7; } }
  else if (id === 'halo') { const h = add(new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 8, 28), MD.glow(0xffd23f, 0.95)), 0, 0.35); h.rotation.x = Math.PI / 2; }
  else if (id === 'crown') { add(cyl(0.34, 0.34, 0.2, 0xffd23f), 0, 0.1); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(cone(0.07, 0.2, 0xffd23f), Math.cos(a) * 0.3, 0.3, Math.sin(a) * 0.3); } add(new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), MD.glow(0xb388ff, 0.95)), 0, 0.12, -0.34); }
  else if (id === 'fish') { const f = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), M(0x48cae4)), 0, 0.2); f.scale.set(0.6, 0.7, 1.6); const t = add(cone(0.2, 0.35, 0x2f8fb0), 0, 0.2, 0.55); t.rotation.x = Math.PI / 2; }
  g.traverse(o => { if (o.isMesh) o.material.flatShading = true; });
  return g;
}
// Sits the hat on the head if the model has one, otherwise on top of the model.
export function wearHat(model, id) {
  if (!id) return;
  const hat = makeHat(id), u = model.userData;
  if (u.head) { hat.position.set(0, 0.42, 0); u.head.add(hat); }
  else { const box = new THREE.Box3().setFromObject(model); hat.position.set(0, box.max.y - model.position.y, 0); hat.scale.setScalar(1.2); model.add(hat); }
  u.hat = hat;
}
