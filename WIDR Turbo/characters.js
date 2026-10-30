import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// ---------- model helpers ----------
// Driver space: torso centred at the origin, head centre at y 0.85, steering wheel at (0, 0.05, 0.85).
const INK = 0x1d1a2f, SKIN = 0xffd7b0;
const cache = new Map();
const M = (c, o = {}) => { const key = 'l' + c + JSON.stringify(o); if (!cache.has(key)) cache.set(key, new THREE.MeshLambertMaterial({color:c, ...o})); return cache.get(key); };
const BM = (c, o = {}) => { const key = 'b' + c + JSON.stringify(o); if (!cache.has(key)) cache.set(key, new THREE.MeshBasicMaterial({color:c, ...o})); return cache.get(key); };
function mk(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0){
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m;
}
const S = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);
const HALF = r => new THREE.SphereGeometry(r, 18, 10, 0, Math.PI*2, 0, Math.PI/2);
const LOWER = r => new THREE.SphereGeometry(r, 18, 10, 0, Math.PI*2, Math.PI/2, Math.PI/2);
const C = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
const BX = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const TOR = (r, t, arc = Math.PI*2, s = 20) => new THREE.TorusGeometry(r, t, 8, s, arc);
const UP = new THREE.Vector3(0, 1, 0);
function limb(parent, a, b, r, mat){
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const m = mk(parent, C(r, r, d.length(), 8), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m;
}
function group(parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0){ const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, rz); parent.add(g); return g; }
export function textSprite(txt, {fg = '#1d1a2f', bg = null, size = 0.5, font = 64, w = 128, h = 128} = {}){
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  let cy = h/2 + 4;
  if (bg){
    x.fillStyle = bg; x.strokeStyle = '#1d1a2f'; x.lineWidth = 8;
    x.beginPath(); x.roundRect(6, 6, w-12, h-40, 26); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(w*0.25, h-36); x.lineTo(w*0.2, h-6); x.lineTo(w*0.42, h-36); x.fill();
    cy = (h-34)/2 + 6;
  }
  x.font = `bold ${font}px Arial Rounded MT Bold, Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = fg; x.fillText(txt, w/2, cy);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:t, depthWrite:false})); s.scale.set(size*w/h, size, 1); s.castShadow = false; return s;
}

// eyes, brows and mouth on a sphere head centred at (0, cy, 0) with radius R
function face(g, o, cy = 0.85, R = 0.6, lift = 0){
  const k = R / 0.6, ink = BM(INK), white = BM(0xffffff);
  const zs = (dx, dy) => Math.sqrt(Math.max(0, R*R - dx*dx - dy*dy));
  const eye = 0.07*k + lift, brow = 0.24*k + lift, mouth = -0.17*k + lift, dx = 0.21*k;
  if (o.eyes !== false) [-1, 1].forEach(s => {
    const x = s*dx;
    if (o.wink && s > 0) mk(g, TOR(0.1*k, 0.03*k, Math.PI, 10), ink, x, cy + eye - 0.03*k, zs(x, eye) + 0.02*k);
    else {
      mk(g, S(0.12*k, 12, 10), white, x, cy + eye, zs(x, eye) - 0.05*k);
      mk(g, S(0.065*k, 10, 8), ink, x + (o.look || 0)*0.03, cy + eye, zs(x, eye) + 0.045*k);
    }
    if (o.brows){
      const rz = o.brows === 'angry' ? s*0.35 : o.brows === 'sad' ? -s*0.35 : o.brows === 'cheeky' && s > 0 ? 0.3 : 0;
      mk(g, BX(0.22*k, 0.055*k, 0.05*k), M(o.browColor ?? o.hair ?? INK), x, cy + brow + (o.brows === 'cheeky' && s > 0 ? 0.05*k : 0), zs(x, brow) + 0.01*k, 0, 0, rz);
    }
  });
  const mz = zs(0, mouth);
  switch (o.mouth){
    case 'smile': mk(g, TOR(0.15*k, 0.035*k, Math.PI, 12), ink, 0, cy + mouth + 0.04*k, mz, 0, 0, Math.PI); break;
    case 'grin':
      mk(g, new THREE.CircleGeometry(0.19*k, 16, Math.PI, Math.PI), ink, 0, cy + mouth + 0.05*k, mz + 0.04*k);
      mk(g, BX(0.3*k, 0.05*k, 0.01), white, 0, cy + mouth + 0.02*k, mz + 0.05*k); break;
    case 'frown': mk(g, TOR(0.13*k, 0.035*k, Math.PI, 12), ink, 0, cy + mouth - 0.06*k, mz); break;
    case 'cry': { const c = mk(g, new THREE.CircleGeometry(0.15*k, 16), ink, 0, cy + mouth, mz + 0.04*k); c.scale.y = 0.75; break; }
    case 'smirk': mk(g, TOR(0.13*k, 0.035*k, Math.PI*0.8, 12), ink, 0.05*k, cy + mouth + 0.03*k, mz, 0, 0, Math.PI + 0.25); break;
  }
}
function hair(g, o){
  if (!o.hair) return;
  const hm = M(o.hair);
  mk(g, HALF(0.63), hm, 0, 0.9, -0.05, -0.32);
  if (o.hairStyle === 'messy') for (let i = 0; i < 7; i++){ const a = i/7*Math.PI*2; mk(g, S(0.18, 8, 6), hm, Math.cos(a)*0.38, 1.32 + (i % 2)*0.08, Math.sin(a)*0.32 - 0.12); }
  if (o.hairStyle === 'spiky') for (let i = 0; i < 8; i++){ const a = i/8*Math.PI*2; mk(g, new THREE.ConeGeometry(0.14, 0.45, 6), hm, Math.cos(a)*0.3, 1.42, Math.sin(a)*0.28 - 0.1, Math.sin(a)*0.7, 0, -Math.cos(a)*0.7); }
  if (o.hairStyle === 'bun'){ mk(g, S(0.28), hm, 0, 1.42, -0.36); mk(g, TOR(0.16, 0.05), M(0xff7ccf), 0, 1.36, -0.3, 1); }
}
function person(g, o){
  const skin = o.skin ?? SKIN, shirt = M(o.shirt), w = o.wide ?? 1;
  mk(g, C(0.55, 0.65, 1.0, 14), shirt).scale.set(w, 1, o.chubby ? 1.2 : 1);
  mk(g, S(0.6, 18, 14), M(skin), 0, 0.85, 0);
  face(g, o); hair(g, o);
  const hand = M(o.gloves ?? skin), sx = 0.5*w;
  const L = o.lh || [-0.36, 0.12, 0.8], R = o.rh || [0.36, 0.12, 0.8];
  [[-1, L], [1, R]].forEach(([s, h]) => { limb(g, [s*sx, 0.3, 0.05], h, 0.15, shirt); mk(g, S(0.15, 10, 8), hand, ...h); });
  if (o.ears !== false) [-1, 1].forEach(s => mk(g, S(0.12, 8, 6), M(skin), s*0.6, 0.85, 0));
}
const wizardHat = (g, col, band, y = 1.05) => {
  mk(g, C(0.95, 0.95, 0.06, 24), M(col), 0, y, 0);
  const cone = mk(g, new THREE.ConeGeometry(0.66, 1.5, 18), M(col), 0, y + 0.75, -0.05, -0.15);
  mk(g, TOR(0.64, 0.06), M(band), 0, y + 0.08, 0, Math.PI/2);
  return cone;
};

// ---------- characters ----------
// mods: speed, accel, handling, weight, off-road (added to the kart's 1-5 stats)
export const CHARS = [
  {id:'nathan', name:'Nathan', title:'Baseball Slugger', color:0xff3b3b, star:true,
   desc:'The main character. A big-swinging slugger who never backs down from a pitch.',
   mods:[1,0,0,0,0], cd:16, ability:{name:'Home Run', icon:'⚾', desc:'Swings his bat in a full circle. Spins out every racer close to him and knocks away nearby bananas and shells.'},
   build:{body:'classic', wheels:'standard', paint:0xff3b3b, accent:0xffffff},
   draw(g){
     person(g, {shirt:0xffffff, mouth:'grin', brows:'flat', browColor:0x4a2a14});
     mk(g, HALF(0.68), M(0xff3b3b), 0, 0.93, 0, -0.05);
     mk(g, BX(0.78, 0.06, 0.42), M(0xff3b3b), 0, 0.97, 0.62, 0.12);
     mk(g, S(0.26, 12, 8), M(0xff3b3b), 0.62, 0.8, 0.05).scale.set(0.5, 1, 1);
     [-0.21, 0.21].forEach(x => mk(g, BX(0.15, 0.04, 0.02), BM(INK), x, 0.81, 0.58));
     const num = textSprite('1', {fg:'#ff3b3b', size:0.5, font:96}); num.position.set(0, 0.12, 0.7); g.add(num);
     mk(g, C(0.62, 0.62, 0.1, 14), M(0xff3b3b), 0, -0.25, 0);
     const bat = group(g, 0.55, 0.45, -0.25, -0.9, 0, -0.45);
     mk(bat, C(0.14, 0.05, 1.7, 10), M(0xc8915a), 0, 0.85, 0); mk(bat, S(0.08), M(0xc8915a), 0, 0, 0);
     return [];
   }},
  {id:'ash', name:'Ash', title:'Little Pitcher', color:0x3c8dff,
   desc:'Nathan’s little brother. Small, quick, and he can throw a fastball faster than a kart.',
   mods:[-1,1,1,-1,0], cd:11, scale:0.82, ability:{name:'Fastball', icon:'🥎', desc:'Fires a straight, very fast baseball down the track. Hard to dodge, but it doesn’t home in.'},
   build:{body:'buggy', wheels:'tiny', paint:0x3c8dff, accent:0xffffff},
   draw(g){
     person(g, {shirt:0x3c8dff, hair:0x5a3416, mouth:'grin', brows:'flat', lh:[-0.42, 0.22, 0.75]});
     mk(g, HALF(0.65), M(0x3c8dff), 0, 0.95, 0);
     mk(g, BX(0.6, 0.06, 0.45), M(0x3c8dff), 0, 1.0, -0.62, -0.1);
     mk(g, S(0.08), M(0xffffff), 0, 1.6, 0);
     const glove = mk(g, S(0.3, 12, 10), M(0x9a5a2b), -0.45, 0.3, 0.82); glove.scale.set(1, 1, 0.6);
     const ball = mk(g, S(0.15), M(0xffffff), -0.42, 0.45, 0.95);
     mk(g, TOR(0.15, 0.015), BM(0xff3b3b), -0.42, 0.45, 0.95, 0, 0.5);
     return [t => { ball.position.y = 0.45 + Math.abs(Math.sin(t*2.5))*0.25; }];
   }},
  {id:'ati', name:'Ati', title:'The Strict Mom', color:0xd94fd0,
   desc:'Nobody wins an argument with Ati. Her slipper always finds its target, no matter how far ahead you are.',
   mods:[0,-1,0,2,0], cd:18, ability:{name:'Flying Slipper', icon:'🩴', desc:'Throws her slipper at the racer in 1st place (2nd if she’s leading). It chases them down the whole track.'},
   build:{body:'bathtub', wheels:'wood', paint:0xd94fd0, accent:0xffffff},
   draw(g){
     person(g, {shirt:0xd94fd0, hair:0x3a2216, hairStyle:'bun', mouth:'frown', brows:'angry', rh:[0.72, 1.05, 0.25]});
     mk(g, BX(0.85, 0.65, 0.05), M(0xffffff), 0, -0.05, 0.6);
     mk(g, BX(0.3, 0.2, 0.05), M(0xffd23f), 0, -0.1, 0.63);
     [-0.21, 0.21].forEach(x => mk(g, TOR(0.12, 0.025), BM(INK), x, 0.92, 0.6));
     mk(g, BX(0.18, 0.025, 0.02), BM(INK), 0, 0.93, 0.62);
     [-1, 1].forEach(s => mk(g, S(0.06), M(0xffc21f), s*0.62, 0.72, 0.05));
     const sl = group(g, 0.75, 1.2, 0.25, -0.5, 0, -0.3);
     mk(sl, BX(0.3, 0.06, 0.7), M(0xff7ccf), 0, 0, 0); mk(sl, BX(0.32, 0.12, 0.2), M(0xffb6dc), 0, 0.07, 0.12);
     return [t => { sl.rotation.z = -0.3 + Math.sin(t*9)*0.25; }];
   }},
  {id:'daniel', name:'Daniel', title:'Demolition Bomber', color:0xff7a1f,
   desc:'Demolition expert. If it’s in his way, it’s coming down.',
   mods:[1,0,-1,1,0], cd:15, ability:{name:'Demolition Bomb', icon:'💣', desc:'Lobs a bomb up the track that explodes after a moment. Everyone in the blast spins out, including Daniel if he’s too close.'},
   build:{body:'monster', wheels:'monster', paint:0xff7a1f, accent:0x1d1a2f},
   draw(g){
     person(g, {shirt:0xff7a1f, mouth:'grin', brows:'angry', browColor:0x3a2216, lh:[-0.7, 0.95, 0.3]});
     mk(g, HALF(0.68), M(0xffd23f), 0, 0.95, 0); mk(g, C(0.84, 0.84, 0.05, 20), M(0xffd23f), 0, 0.96, 0.05);
     mk(g, BX(0.12, 0.2, 1.2), M(0xffc21f), 0, 1.5, 0);
     mk(g, BX(0.95, 0.12, 0.1), BM(INK), 0, 1.12, 0.52);
     [-0.2, 0.2].forEach(x => mk(g, C(0.13, 0.13, 0.08, 12), M(0x66ccff), x, 1.12, 0.58, Math.PI/2));
     [-0.25, 0.25].forEach(x => mk(g, BX(0.08, 0.9, 0.02), M(0xdfe6ee), x, 0, 0.64));
     mk(g, BX(1.0, 0.08, 0.02), M(0xdfe6ee), 0, -0.2, 0.64);
     mk(g, S(0.38), M(0x2a2a33), -0.75, 1.3, 0.3);
     mk(g, C(0.04, 0.04, 0.25, 6), M(0xc8915a), -0.75, 1.72, 0.3);
     const spark = mk(g, S(0.1, 8, 6), BM(0xffd23f), -0.75, 1.88, 0.3);
     return [t => spark.scale.setScalar(0.7 + Math.random()*0.8)];
   }},
  {id:'dean', name:'Dean', title:'Breakdancer Gamer', color:0x8a5cff,
   desc:'Breakdancer by day, top-ranked gamer by night. Perfect reflexes, smooth moves.',
   mods:[0,1,1,-1,0], cd:14, ability:{name:'Windmill', icon:'🌀', desc:'Breaks into a spinning windmill: knocks out anyone right next to him, gets a short boost and a moment of protection.'},
   build:{body:'speedster', wheels:'gold', paint:0x8a5cff, accent:0x3cff8a},
   draw(g){
     person(g, {shirt:0x8a5cff, mouth:'grin', brows:'flat'});
     mk(g, TOR(0.42, 0.15), M(0x8a5cff), 0, 0.48, -0.2, Math.PI/2 - 0.4);
     mk(g, HALF(0.66), M(0x1fb5a6), 0, 0.97, 0); mk(g, TOR(0.62, 0.09), M(0x16877c), 0, 1.0, 0, Math.PI/2);
     mk(g, S(0.16, 10, 8), M(0xffffff), 0, 1.66, 0);
     mk(g, TOR(0.7, 0.05, Math.PI, 16), M(INK), 0, 0.88, 0);
     [-1, 1].forEach(s => { mk(g, C(0.2, 0.2, 0.15, 14), M(INK), s*0.68, 0.86, 0, 0, 0, Math.PI/2); mk(g, TOR(0.17, 0.03), BM(0x3cff8a), s*0.76, 0.86, 0, 0, Math.PI/2); });
     limb(g, [-0.7, 0.8, 0.1], [-0.25, 0.68, 0.62], 0.025, M(INK)); mk(g, S(0.06), BM(0x3cff8a), -0.22, 0.68, 0.64);
     return [t => { g.rotation.z = Math.sin(t*6)*0.06; g.position.y += 0; }];
   }},
  {id:'deniz', name:'Deniz', title:'Ice Wizard', color:0x7fd8ff, perk:'iceGrip',
   desc:'A frost wizard who never slips. Icy roads feel like normal tarmac to him.',
   mods:[0,0,1,0,-1], cd:17, ability:{name:'Blizzard', icon:'❄️', desc:'Freezes every racer just ahead of him in a block of ice for a few seconds. Perk: full grip on icy tracks.'},
   build:{body:'bubble', wheels:'slick', paint:0x7fd8ff, accent:0xffffff},
   draw(g){
     person(g, {shirt:0x4fa8e8, hair:0xeaf6ff, mouth:'smirk', brows:'flat', rh:[0.8, 0.5, 0.35]});
     mk(g, new THREE.ConeGeometry(0.85, 1.1, 16, 1, true), M(0x4fa8e8, {side:THREE.DoubleSide}), 0, -0.05, 0);
     wizardHat(g, 0x2f7bff, 0xbff3ff);
     const flake = group(g, 0, 1.45, 0.55, -0.4);
     for (let i = 0; i < 3; i++) mk(flake, BX(0.36, 0.05, 0.02), BM(0xffffff), 0, 0, 0, 0, 0, i*Math.PI/3);
     mk(g, C(0.06, 0.06, 2.4, 8), M(0xdfe6ee), 0.85, 0.6, 0.35);
     const crys = mk(g, new THREE.OctahedronGeometry(0.3), M(0xbff3ff, {emissive:0x2a8fbf}), 0.85, 1.95, 0.35);
     const orb = group(g, 0, 1.0, 0);
     [0, 1].forEach(i => mk(orb, new THREE.OctahedronGeometry(0.12), M(0xbff3ff, {emissive:0x2a8fbf}), Math.cos(i*Math.PI)*1.0, 0.2, Math.sin(i*Math.PI)*1.0));
     return [t => { crys.rotation.y = t*2; orb.rotation.y = t*1.5; }];
   }},
  {id:'dih', name:'Dih', title:'Cheeky Worm', color:0xff9ab0,
   desc:'A cheeky little worm with a big grin. Light as a feather and impossible to pin down.',
   mods:[-1,1,1,-2,1], cd:14, ability:{name:'Burrow', icon:'🪱', desc:'Digs underground for 3 seconds with a burst of speed. Nothing can hit him while he’s burrowed.'},
   build:{body:'bubble', wheels:'tiny', paint:0xff9ab0, accent:0xffffff},
   draw(g){
     const pink = M(0xff9ab0), ring = M(0xff7a9a), segs = [];
     for (let i = 0; i < 5; i++){
       const r = 0.5 - i*0.02, s = group(g, 0, -0.3 + i*0.38, Math.sin(i*0.7)*0.15);
       mk(s, S(r, 16, 12), pink); mk(s, TOR(r*0.97, 0.05), ring, 0, 0.18, 0, Math.PI/2); segs.push(s);
     }
     const head = group(g, 0, 1.55, 0.2); segs.push(head);
     mk(head, S(0.55, 18, 14), pink);
     face(head, {mouth:'grin', wink:true, brows:'cheeky', browColor:0xb0405a}, 0, 0.55, 0.05);
     mk(head, S(0.1, 10, 8), M(0xff4f6a), 0.05, -0.2, 0.55).scale.set(1, 0.6, 0.5);
     [-1, 1].forEach(s => mk(head, S(0.09), M(0xff6f8f), s*0.35, -0.08, 0.4));
     return [t => segs.forEach((s, i) => { s.position.x = Math.sin(t*4 + i*0.8)*0.08; })];
   }},
  {id:'enno', name:'Enno', title:'The Mathematician', color:0x1fb5a6,
   desc:'Calculates the perfect racing line in his head. Every corner is just geometry.',
   mods:[0,0,2,0,-1], cd:16, ability:{name:'Perfect Line', icon:'📐', desc:'Takes the mathematically perfect racing line for 4.5 seconds: steers himself, full grip and extra speed.'},
   build:{body:'classic', wheels:'gold', paint:0x1fb5a6, accent:0xffffff},
   draw(g){
     person(g, {shirt:0x1fb5a6, hair:0x8a7a6a, hairStyle:'messy', mouth:'smile', brows:'flat'});
     [-0.21, 0.21].forEach(x => { mk(g, BX(0.24, 0.03, 0.02), BM(INK), x, 1.03, 0.58); mk(g, BX(0.24, 0.03, 0.02), BM(INK), x, 0.83, 0.6); mk(g, BX(0.03, 0.2, 0.02), BM(INK), x + Math.sign(x)*0.12, 0.93, 0.58); mk(g, BX(0.03, 0.2, 0.02), BM(INK), x - Math.sign(x)*0.12, 0.93, 0.6); });
     [-1, 1].forEach(s => mk(g, new THREE.ConeGeometry(0.1, 0.18, 4), M(0xff3b3b), s*0.09, 0.48, 0.5, 0, 0, s*Math.PI/2));
     mk(g, S(0.05), M(0xff3b3b), 0, 0.48, 0.52);
     const ring = group(g, 0, 1.5, 0);
     ['π', '∑', '√', '∞', 'x²'].forEach((s, i) => { const sp = textSprite(s, {fg:'#1d1a2f', size:0.4, font:84}); const a = i/5*Math.PI*2; sp.position.set(Math.cos(a)*0.95, Math.sin(i*2)*0.12, Math.sin(a)*0.95); ring.add(sp); });
     return [t => { ring.rotation.y = t*0.9; }];
   }},
  {id:'fionn', name:'Fionn', title:'Irish Geologist', color:0x2f9a46,
   desc:'An Irish geologist who knows every rock by name, and how hard each one hits.',
   mods:[0,-1,0,1,1], cd:15, ability:{name:'Boulder Toss', icon:'🪨', desc:'Rolls a huge boulder down the track. It plows through everyone in its path instead of stopping at the first racer.'},
   build:{body:'buggy', wheels:'monster', paint:0x2f9a46, accent:0xffd23f},
   draw(g){
     person(g, {shirt:0x2f9a46, mouth:'smile', brows:'flat', browColor:0xe0661f, rh:[0.7, 1.0, 0.25]});
     const ginger = M(0xe0661f);
     mk(g, LOWER(0.5), ginger, 0, 0.72, 0.2).scale.set(1.1, 0.8, 0.9);
     mk(g, BX(0.36, 0.08, 0.08), ginger, 0, 0.73, 0.57);
     [-1, 1].forEach(s => mk(g, BX(0.1, 0.35, 0.3), ginger, s*0.57, 0.85, 0.05));
     mk(g, C(0.66, 0.68, 0.18, 20), M(0x6b7a4a), 0, 1.15, -0.05, -0.12);
     mk(g, BX(0.62, 0.05, 0.35), M(0x6b7a4a), 0, 1.11, 0.6, 0.2);
     [0, 2.1, 4.2].forEach(a => mk(g, S(0.07), M(0x7fff7f), 0.22 + Math.cos(a)*0.07, 0.2 + Math.sin(a)*0.07, 0.62));
     mk(g, BX(0.9, 0.5, 0.05), M(0x7a4a24), 0, -0.25, 0.6);
     const rock = mk(g, new THREE.DodecahedronGeometry(0.3, 0), M(0x8a8178, {flatShading:true}), 0.72, 1.3, 0.25);
     return [t => { rock.rotation.set(t*1.3, t, 0); }];
   }},
  {id:'guiseppe', name:'Guiseppe', title:'Sentient Apple', color:0xe0201f,
   desc:'A sentient apple with a magnificent mustache. He even has his own video game, and he’ll remind you.',
   mods:[1,0,-1,0,0], cd:20, ability:{name:'It’s-a My Game!', icon:'🍎', desc:'It’s his game, so he makes the rules: instantly swaps places with the racer directly ahead.'},
   build:{body:'pumpkin', wheels:'wood', paint:0xe0201f, accent:0x3ccf6e},
   draw(g){
     const apple = mk(g, S(0.85, 22, 16), M(0xe0201f), 0, 0.35, 0); apple.scale.set(1.05, 0.95, 1.05);
     mk(g, S(0.18, 10, 8), BM(0xffffff, {transparent:true, opacity:0.5}), -0.4, 0.75, 0.55).scale.set(1, 0.6, 0.4);
     mk(g, C(0.05, 0.06, 0.45, 6), M(0x6b3f1f), 0.05, 1.3, 0, 0, 0, -0.2);
     mk(g, S(0.2, 10, 8), M(0x3ccf6e), 0.25, 1.38, 0, 0, 0, 0.5).scale.set(1.6, 0.25, 0.8);
     face(g, {mouth:'smile', brows:'flat'}, 0.35, 0.82, 0.2);
     mk(g, S(0.15, 10, 8), M(0xb01818), 0, 0.42, 0.85);
     [-1, 1].forEach(s => {
       mk(g, S(0.22, 12, 8), M(0x2a1a0a), s*0.2, 0.3, 0.8, 0, 0, s*0.35).scale.set(1.3, 0.5, 0.5);
       mk(g, S(0.1, 8, 6), M(0x2a1a0a), s*0.44, 0.38, 0.72);
     });
     [-1, 1].forEach(s => mk(g, S(0.17, 10, 8), M(0xffffff), s*0.36, 0.12, 0.85));
     return [t => { apple.scale.y = 0.95 + Math.sin(t*5)*0.02; }];
   }},
  {id:'adam', name:'Adam', title:'Tennis Ace', color:0x8fd400,
   desc:'A tennis ace with a lightning backhand. He can return anything, even cannonballs.',
   mods:[0,1,1,0,-1], cd:13, ability:{name:'Return Shot', icon:'🎾', desc:'Racket up for 4.5 seconds. Shells, drones, slippers and balls aimed at him get hit straight back at the thrower.'},
   build:{body:'speedster', wheels:'slick', paint:0x8fd400, accent:0xffffff},
   draw(g){
     person(g, {shirt:0xffffff, hair:0x7a4a24, mouth:'smile', brows:'flat'});
     const grn = M(0x2fbf71);
     mk(g, TOR(0.585, 0.07), grn, 0, 1.02, 0, Math.PI/2);
     mk(g, TOR(0.42, 0.06), grn, 0, 0.5, 0, Math.PI/2);
     mk(g, C(0.6, 0.61, 0.12, 14), grn, 0, 0.15, 0);
     const rk = group(g, 0.95, 0.35, -0.1, 0, 0, -0.35);
     mk(rk, C(0.06, 0.06, 0.7, 8), M(INK), 0, 0, 0);
     mk(rk, TOR(0.34, 0.05), grn, 0, 0.68, 0, 0, Math.PI/2).scale.set(1, 1.25, 1);
     mk(rk, new THREE.CircleGeometry(0.31, 20), BM(0xffffff, {transparent:true, opacity:0.45, side:THREE.DoubleSide}), 0, 0.68, 0, 0, Math.PI/2).scale.set(1, 1.25, 1);
     const ball = mk(g, S(0.16), M(0xd6ff3a), -0.8, 1.5, 0.2);
     return [t => { ball.position.y = 1.4 + Math.abs(Math.sin(t*3))*0.55; }];
   }},
  {id:'josh', name:'Josh', title:'Tech Whiz', color:0x607d8b,
   desc:'Tech whiz who never goes anywhere without his drone. Renas’s big brother.',
   mods:[1,1,0,-1,-1], cd:15, ability:{name:'Drone Strike', icon:'🛸', desc:'Sends his drone after the racer directly ahead. It flies over everything and homes in from a long way off.'},
   build:{body:'rocket', wheels:'slick', paint:0x607d8b, accent:0x00e5ff},
   draw(g){
     person(g, {shirt:0x607d8b, hair:0x2a1a0a, hairStyle:'messy', mouth:'smile', brows:'flat'});
     [-0.21, 0.21].forEach(x => { mk(g, TOR(0.12, 0.03, Math.PI*2, 4), BM(INK), x, 0.92, 0.6, 0, 0, Math.PI/4); });
     mk(g, BX(0.18, 0.03, 0.02), BM(INK), 0, 0.93, 0.62);
     mk(g, BX(0.12, 0.12, 0.04), BM(0x00e5ff), -0.38, 0.2, 0.78);
     const dr = group(g, 0, 2.2, -0.2), rotors = [];
     mk(dr, BX(0.5, 0.14, 0.5), M(0x2a2f3a), 0, 0, 0);
     [Math.PI/4, -Math.PI/4].forEach(a => mk(dr, BX(1.1, 0.05, 0.08), M(0x2a2f3a), 0, 0, 0, 0, a));
     [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => rotors.push(mk(dr, BX(0.5, 0.02, 0.06), BM(0xc9d6e0), x*0.39, 0.08, z*0.39)));
     const led = mk(dr, S(0.06), BM(0xff3b3b), 0, 0, 0.27);
     mk(dr, S(0.1), M(INK), 0, -0.1, 0.15);
     return [t => { dr.position.y = 2.2 + Math.sin(t*3)*0.12; dr.rotation.y = Math.sin(t*0.8)*0.4; rotors.forEach(r => r.rotation.y = t*40); led.visible = (t*3 % 1) < 0.5; }];
   }},
  {id:'lars', name:'Lars', title:'Dwarf Miner', color:0x8b5a2b, scale:0.9,
   desc:'A stout dwarf miner. Short, wide and as solid as the mountains he digs through.',
   mods:[-1,0,-1,2,1], cd:15, ability:{name:'Mine Cart Rush', icon:'⛏️', desc:'Charges like a runaway mine cart for 3.5 seconds: faster, can’t be hit, and flattens anyone he rams.'},
   build:{body:'monster', wheels:'wood', paint:0x8b5a2b, accent:0xffc21f},
   draw(g){
     person(g, {shirt:0x8b5a2b, wide:1.3, mouth:'none', brows:'angry', browColor:0x5a3416});
     const beard = M(0x5a3416);
     mk(g, new THREE.ConeGeometry(0.5, 1.1, 14), beard, 0, 0.3, 0.38, Math.PI + 0.25);
     [-1, 1].forEach(s => mk(g, S(0.16, 10, 8), beard, s*0.17, 0.7, 0.55).scale.set(1.4, 0.7, 0.8));
     mk(g, S(0.15, 10, 8), M(0xf0b48a), 0, 0.8, 0.6);
     mk(g, HALF(0.68), M(0xd9a441), 0, 0.97, 0); mk(g, C(0.8, 0.8, 0.05, 20), M(0xd9a441), 0, 0.98, 0.05);
     mk(g, C(0.15, 0.15, 0.16, 14), M(INK), 0, 1.25, 0.6, Math.PI/2 - 0.3);
     mk(g, new THREE.CircleGeometry(0.12, 14), BM(0xfff6a0), 0, 1.27, 0.69, -0.3);
     mk(g, C(0.73, 0.73, 0.12, 16), M(0x3a2216), 0, -0.3, 0).scale.set(1.3, 1, 1);
     mk(g, BX(0.25, 0.18, 0.05), M(0xffc21f), 0, -0.3, 0.72);
     const pick = group(g, 0, 0.5, -0.75, 0, 0, 0.7);
     mk(pick, C(0.06, 0.06, 1.7, 8), M(0xa8794a), 0, 0, 0);
     mk(pick, TOR(0.45, 0.07, Math.PI*0.9, 10), M(0x9a9aa8), 0, 0.45, 0, 0, 0, Math.PI*0.05);
     return [];
   }},
  {id:'meta', name:'Meta AI', title:'The Meddling Chatbot', color:0x0866ff, villain:true,
   desc:'A chatbot that butts into everything nobody asked it about. The recurring villain of every Grand Prix.',
   mods:[1,1,0,0,-1], cd:18, ability:{name:'Butt In', icon:'💬', desc:'Butts into everyone nearby: steals an item, scrambles their controls for 2.5 seconds and fills their screen with unwanted chat.'},
   build:{body:'rocket', wheels:'gold', paint:0x0866ff, accent:0xc23bff},
   draw(g){
     const core = group(g, 0, 0.55, 0), ring = group(core);
     mk(ring, TOR(0.6, 0.2, Math.PI, 24), M(0x0866ff, {emissive:0x0a3aa8}));
     mk(ring, TOR(0.6, 0.2, Math.PI, 24), M(0xc23bff, {emissive:0x5a1a8a}), 0, 0, 0, 0, 0, Math.PI);
     [-1, 1].forEach(s => mk(core, BX(0.22, 0.07, 0.06), BM(0xff3b5c), s*0.17, 0.08, 0.05, 0, 0, s*0.35));
     mk(core, TOR(0.14, 0.025, Math.PI, 10), BM(0xff3b5c), 0, -0.15, 0.05);
     [-1, 1].forEach(s => mk(g, S(0.16, 10, 8), M(0x4f8bff, {emissive:0x0a3aa8}), s*0.36, 0.12, 0.8));
     const bubble = textSprite('Hi! 👋', {bg:'#ffffff', w:256, h:150, font:54, size:0.75}); bubble.position.set(0.95, 1.65, 0); g.add(bubble);
     return [t => { core.position.y = 0.55 + Math.sin(t*2)*0.12; ring.rotation.z = t*0.9; bubble.position.y = 1.65 + Math.sin(t*2 + 1)*0.08; }];
   }},
  {id:'milo', name:'Milo', title:'Lightning Wizard', color:0xffd23f,
   desc:'A storm-calling wizard. Fastest top speed in the field, but a little wild in the corners.',
   mods:[2,0,-1,0,-1], cd:22, ability:{name:'Thunderstrike', icon:'⚡', desc:'Calls lightning down on every racer ahead of him. They all spin out briefly.'},
   build:{body:'rocket', wheels:'slick', paint:0x5a3dff, accent:0xffd23f},
   draw(g){
     person(g, {shirt:0x5a3dff, hair:0xffe066, hairStyle:'spiky', mouth:'grin', brows:'angry', browColor:0xc9a400, rh:[0.8, 0.5, 0.35]});
     mk(g, new THREE.ConeGeometry(0.85, 1.1, 16, 1, true), M(0x5a3dff, {side:THREE.DoubleSide}), 0, -0.05, 0);
     wizardHat(g, 0x3a2a8a, 0xffd23f, 1.12);
     const bolt = new THREE.Shape();
     bolt.moveTo(0.05, 0.35); bolt.lineTo(-0.15, 0); bolt.lineTo(0, 0); bolt.lineTo(-0.08, -0.35); bolt.lineTo(0.16, 0.06); bolt.lineTo(0.02, 0.06); bolt.lineTo(0.12, 0.35);
     mk(g, new THREE.ShapeGeometry(bolt), BM(0xffd23f, {side:THREE.DoubleSide}), 0, 1.5, 0.52, -0.44);
     mk(g, C(0.06, 0.06, 2.4, 8), M(0x8b5a2b), 0.85, 0.6, 0.35);
     const orb = mk(g, S(0.25), BM(0xfff27a), 0.85, 1.95, 0.35), arcs = [];
     for (let i = 0; i < 3; i++) arcs.push(mk(g, BX(0.04, 0.5, 0.04), BM(0xfff27a), 0.85, 1.95, 0.35));
     return [t => { orb.scale.setScalar(0.9 + Math.random()*0.25); arcs.forEach(a => { a.rotation.set(Math.random()*6, Math.random()*6, Math.random()*6); a.visible = Math.random() > 0.3; }); }];
   }},
  {id:'renas', name:'Renas', title:'Gadget Kid', color:0xffb02e, scale:0.78,
   desc:'Josh’s little brother. His backpack is full of half-finished inventions, and you never know which one comes out.',
   mods:[0,1,0,-1,0], cd:12, ability:{name:'Random Gadget', icon:'🎒', desc:'Pulls a random gadget out of his backpack: spring boost, force field, banana dispenser or a homing gizmo.'},
   build:{body:'buggy', wheels:'tiny', paint:0xffb02e, accent:0x2f7bff},
   draw(g){
     person(g, {shirt:0xffb02e, hair:0x2a1a0a, mouth:'grin', brows:'flat'});
     [0xff3b3b, 0xffd23f, 0x2f7bff, 0x3ccf6e].forEach((c, i) => mk(g, new THREE.SphereGeometry(0.66, 8, 8, i*Math.PI/2, Math.PI/2, 0, Math.PI/2), M(c), 0, 0.95, 0));
     mk(g, C(0.04, 0.04, 0.25, 6), M(INK), 0, 1.7, 0);
     const prop = mk(g, BX(1.0, 0.03, 0.14), M(0xff3b3b), 0, 1.83, 0);
     mk(g, BX(0.9, 0.12, 0.08), M(INK), 0, 1.15, 0.5);
     [-0.2, 0.2].forEach(x => mk(g, C(0.12, 0.12, 0.08, 12), M(0x9ee6ff), x, 1.18, 0.55, Math.PI/2 - 0.3));
     mk(g, BX(0.85, 0.9, 0.45), M(0x9a9aa8), 0, 0.1, -0.75);
     mk(g, C(0.03, 0.03, 0.8, 6), M(INK), 0.3, 0.9, -0.8);
     const light = mk(g, S(0.08), BM(0xff3b3b), 0.3, 1.32, -0.8);
     return [t => { prop.rotation.y = t*18; light.visible = (t*2 % 1) < 0.5; }];
   }},
  {id:'reshman', name:'Reshman', title:'The Shadow', color:0x2a2238, scale:0.8,
   desc:'A small, faceless shadow blob. Nobody knows where he came from, or where he’ll show up next.',
   mods:[0,1,1,-2,0], cd:15, ability:{name:'Shadow Step', icon:'🌑', desc:'Melts into the shadows and reappears a good way further up the track, untouchable for a moment.'},
   build:{body:'bubble', wheels:'standard', paint:0x2a2238, accent:0x8a5cff},
   draw(g){
     const blob = mk(g, S(0.7, 20, 16), M(0x15101f), 0, 0.25, 0); blob.scale.set(1, 0.9, 1);
     mk(g, S(0.85, 20, 16), M(0x3a2a5a, {transparent:true, opacity:0.32, depthWrite:false}), 0, 0.3, 0).castShadow = false;
     const shadowM = M(0x15101f);
     [-1, 1].forEach(s => { limb(g, [s*0.45, 0.25, 0.3], [s*0.36, 0.12, 0.8], 0.08, shadowM); mk(g, S(0.11, 8, 6), shadowM, s*0.36, 0.12, 0.8); });
     const wisps = group(g, 0, 1.0, 0), ws = [];
     for (let i = 0; i < 4; i++) ws.push(mk(wisps, S(0.13 - i*0.02, 8, 6), M(0x2a1f3f, {transparent:true, opacity:0.7}), Math.cos(i*1.6)*0.45, i*0.18, Math.sin(i*1.6)*0.45));
     return [t => { wisps.rotation.y = t*1.2; ws.forEach((w, i) => w.position.y = ((t*0.4 + i*0.25) % 1)*0.8); blob.scale.y = 0.9 + Math.sin(t*3)*0.04; }];
   }},
  {id:'robin', name:'Robin', title:'Big Crybaby', color:0xb388ff, scale:1.22,
   desc:'A big, goofy kid who cries at everything. But push him too far and you’ll meet the most overpowered fighter on the track.',
   mods:[-1,-1,0,2,0], cd:15, ability:{name:'Tantrum', icon:'😭', desc:'In the top 3 he just cries, leaving slippery puddles behind. In 4th or worse his secret power awakens: huge, invincible and blasting everyone nearby.'},
   build:{body:'bathtub', wheels:'monster', paint:0xb388ff, accent:0xffffff},
   draw(g){
     person(g, {shirt:0xb388ff, hair:0xe0a060, chubby:true, wide:1.25, mouth:'cry', brows:'sad', browColor:0xa06a30});
     [-1, 1].forEach(s => mk(g, S(0.12, 10, 8), M(0xff9aa8), s*0.36, 0.76, 0.43).scale.set(1, 0.6, 0.4));
     mk(g, TOR(0.6, 0.06), M(0xff3b3b), 0, 1.1, -0.02, Math.PI/2 - 0.2);
     [-1, 1].forEach(s => mk(g, BX(0.08, 0.4, 0.12), M(0xff3b3b), s*0.1, 0.95, -0.62, 0.4, 0, s*0.3));
     const tears = [];
     [-1, 1].forEach(s => { for (let i = 0; i < 2; i++) tears.push([s, i, mk(g, S(0.07, 8, 6), M(0x5ab8ff, {transparent:true, opacity:0.85}), s*0.28, 0.9, 0.52)]); });
     return [t => tears.forEach(([s, i, m]) => { const p = (t*1.6 + i*0.5) % 1; m.position.set(s*(0.28 + p*0.12), 0.88 - p*0.55, 0.52 - p*0.05); })];
   }},
  {id:'thomas', name:'Thomas', title:'“The Rounder”', color:0xffc48a,
   desc:'A perfectly round fighter with no feet. He rolls with every punch and keeps on coming.',
   mods:[0,0,-1,1,1], cd:15, ability:{name:'Roll Out', icon:'🥊', desc:'Curls up and rolls flat out for 3 seconds. Can’t be hit, and knocks over anyone he bumps.'},
   build:{body:'pumpkin', wheels:'standard', paint:0xd62828, accent:0xffc21f},
   draw(g){
     mk(g, S(0.9, 22, 16), M(0xffc48a), 0, 0.35, 0);
     face(g, {mouth:'smirk', brows:'angry'}, 0.35, 0.9, 0.2);
     mk(g, new THREE.ConeGeometry(0.12, 0.35, 6), M(INK), 0, 1.3, 0, -0.3);
     mk(g, TOR(0.88, 0.08, Math.PI*2, 28), M(0xffc21f), 0, 0.1, 0, Math.PI/2);
     mk(g, BX(0.4, 0.28, 0.1), M(0xffc21f), 0, 0.1, 0.88);
     mk(g, S(0.08), BM(0xff3b3b), 0, 0.1, 0.94);
     [-1, 1].forEach(s => { limb(g, [s*0.75, 0.3, 0.2], [s*0.42, 0.18, 0.78], 0.12, M(0xffc48a)); mk(g, S(0.26, 12, 10), M(0xd62828), s*0.42, 0.2, 0.82); mk(g, C(0.18, 0.18, 0.12, 12), M(0xffffff), s*0.48, 0.15, 0.62, Math.PI/2); });
     return [];
   }},
  {id:'yassin', name:'Yassin', title:'The Kickboxer', color:0xe8202a,
   desc:'Nobody bets against his push-up count anymore. A kickboxer with a roundhouse kick that sends karts flying off the racing line.',
   mods:[0,1,0,1,0], cd:14, ability:{name:'Roundhouse Kick', icon:'🦵', desc:'Lunges forward with a burst of speed and a spinning kick. Every racer just in front of him spins out and gets kicked hard to the side.'},
   build:{body:'speedster', wheels:'standard', paint:0x1a1a1a, accent:0xe8202a},
   draw(g){
     person(g, {shirt:0x1a1a1a, skin:0xc98d5e, hair:0x1a120c, wide:1.28, mouth:'smirk', brows:'angry', browColor:0x1a120c, gloves:0xe8202a, lh:[-0.32, 0.55, 0.7], rh:[0.36, 0.35, 0.8]});
     // short fade, red headband with flying tails
     mk(g, HALF(0.62), M(0x1a120c), 0, 0.98, -0.02, -0.08);
     mk(g, TOR(0.6, 0.06), M(0xe8202a), 0, 1.02, -0.02, Math.PI/2 - 0.08);
     const tails = group(g, 0, 1.0, -0.6);
     [-1, 1].forEach(s => mk(tails, BX(0.1, 0.06, 0.45), M(0xe8202a), s*0.08, 0, -0.18, 0, s*0.35, 0));
     // big shoulders and arms out of the tank top, white glove cuffs
     [-1, 1].forEach(s => mk(g, S(0.24, 12, 10), M(0xc98d5e), s*0.66, 0.42, 0.05));
     mk(g, C(0.17, 0.17, 0.1, 12), M(0xffffff), -0.32, 0.55, 0.58, Math.PI/2);
     mk(g, C(0.17, 0.17, 0.1, 12), M(0xffffff), 0.36, 0.35, 0.68, Math.PI/2);
     // red trunks with a white waistband
     mk(g, C(0.68, 0.68, 0.28, 16), M(0xe8202a), 0, -0.36, 0).scale.set(1.28, 1, 1);
     mk(g, C(0.7, 0.7, 0.08, 16), M(0xffffff), 0, -0.2, 0).scale.set(1.28, 1, 1);
     return [t => { tails.rotation.y = Math.sin(t*7)*0.3; tails.rotation.x = Math.sin(t*5)*0.15; }];
   }},
  {id:'niek', name:'Niek', title:'Nerd & Boy Scout', color:0x6b8e23,
   desc:'A proud nerd and boy scout with every merit badge there is. He has read the manual of his kart twice, and his backpack has something for every situation.',
   mods:[0,0,1,0,1], cd:16, ability:{name:'Be Prepared', icon:'⛺', desc:'Digs in his scout backpack: pulls out a shield for 3.5 seconds and a fresh item if his hands are empty.'},
   build:{body:'buggy', wheels:'wood', paint:0x6b8e23, accent:0xffc21f},
   draw(g){
     person(g, {shirt:0xc8b273, hair:0xb5651d, mouth:'grin', brows:'flat', browColor:0x8a4a14});
     // big round nerd glasses
     [-1, 1].forEach(s => mk(g, TOR(0.15, 0.03, Math.PI*2, 16), BM(INK), s*0.2, 0.9, 0.58));
     mk(g, BX(0.12, 0.03, 0.02), BM(INK), 0, 0.92, 0.6);
     [-1, 1].forEach(s => mk(g, new THREE.CircleGeometry(0.13, 14), BM(0xbfeaff, {transparent:true, opacity:0.35}), s*0.2, 0.9, 0.6));
     // wide-brim scout hat
     mk(g, C(0.95, 0.95, 0.05, 22), M(0x8a6a3a), 0, 1.1, 0);
     mk(g, C(0.42, 0.55, 0.4, 18), M(0x8a6a3a), 0, 1.3, 0);
     mk(g, C(0.56, 0.56, 0.08, 18), M(0x4a3a1a), 0, 1.16, 0);
     // green neckerchief with a woggle, sash full of merit badges
     mk(g, new THREE.ConeGeometry(0.3, 0.45, 3), M(0x2f7a2f), 0, 0.26, 0.5, Math.PI);
     mk(g, TOR(0.06, 0.025), M(0xffc21f), 0, 0.36, 0.56);
     mk(g, BX(0.18, 1.05, 0.05), M(0x2f7a2f), 0.05, -0.05, 0.58, 0, 0, 0.6);
     [0xff3b3b, 0x3c8dff, 0xffc21f, 0xffffff].forEach((c, i) => mk(g, C(0.06, 0.06, 0.03, 10), M(c), -0.24 + i*0.16, 0.22 - i*0.12, 0.62, Math.PI/2));
     // the backpack, with a rolled-up sleeping mat and a flashlight
     mk(g, BX(0.75, 0.75, 0.35), M(0x4a6b2a), 0, 0.15, -0.68);
     mk(g, C(0.14, 0.14, 0.85, 12), M(0xff7a1f), 0, 0.6, -0.68, 0, 0, Math.PI/2);
     const torch = mk(g, BX(0.08, 0.08, 0.08), BM(0xfff6a0), 0.3, -0.05, -0.88);
     return [t => { torch.visible = (t % 2) > 0.3; }];
   }},
  {id:'oela', name:'Oela', title:'The Footballer', color:0x1fa04a,
   desc:'A footballer from Africa with magic in his boots. He dribbles past karts like they are defenders, and when he shoots, the whole track ducks.',
   mods:[1,1,0,-1,0], cd:30, ability:{name:'Power Shot', icon:'⚽', desc:'Kicks a huge football that curves after the racer ahead of him and smashes through everyone in its path. Very strong, but it takes a long time to recharge.'},
   build:{body:'speedster', wheels:'slick', paint:0x1fa04a, accent:0xffc21f},
   draw(g){
     person(g, {shirt:0x1fa04a, skin:0x5a3420, hair:0x140c08, mouth:'grin', brows:'flat', browColor:0x140c08});
     // short curly hair
     for (let i = 0; i < 9; i++){ const a = i/9*Math.PI*2; mk(g, S(0.15, 8, 6), M(0x140c08), Math.cos(a)*0.34, 1.3 + (i % 2)*0.05, Math.sin(a)*0.3 - 0.08); }
     mk(g, S(0.22, 10, 8), M(0x140c08), 0, 1.38, -0.05);
     // jersey: yellow collar and sleeves, big number 10 on the front
     mk(g, TOR(0.4, 0.05), M(0xffc21f), 0, 0.5, 0, Math.PI/2);
     [-1, 1].forEach(s => mk(g, C(0.17, 0.17, 0.12, 10), M(0xffc21f), s*0.43, 0.27, 0.35, Math.PI/2 - 0.4));
     const num = textSprite('10', {fg:'#ffc21f', size:0.45, font:96}); num.position.set(0, 0.08, 0.7); g.add(num);
     // shorts
     mk(g, C(0.68, 0.68, 0.22, 16), M(0xffffff), 0, -0.35, 0);
     // the ball, always with him, spinning on one finger
     const ball = mk(g, S(0.28, 14, 10), M(0xffffff), 0.45, 0.65, 0.85);
     const patches = group(ball);
     for (let i = 0; i < 6; i++){ const a = i/6*Math.PI*2, b = (i % 2 ? 0.5 : -0.5); mk(patches, S(0.09, 6, 4), M(INK), Math.cos(a)*0.25*Math.cos(b), Math.sin(b)*0.25, Math.sin(a)*0.25*Math.cos(b)); }
     return [t => { ball.rotation.y = t*6; ball.position.y = 0.65 + Math.abs(Math.sin(t*4))*0.08; }];
   }},
  {id:'jorn', name:'Jorn', title:'Mobile Gamer', color:0x8a5cff, scale:0.8,
   desc:'Lars’s little brother and Milo’s best friend. Never looks up from his phone, but somehow still knows exactly where everyone is. Level 412 in every racing game on the app store.',
   mods:[0,1,1,-1,0], cd:15, ability:{name:'Lag Spike', icon:'📶', desc:'Turns his phone into a lag machine. Every racer close by freezes for a moment like a bad connection, while Jorn speeds past.'},
   build:{body:'buggy', wheels:'tiny', paint:0x8a5cff, accent:0x3ccf6e},
   draw(g){
     person(g, {shirt:0x8a5cff, hair:0x5a3416, mouth:'smirk', brows:'flat', browColor:0x5a3416, lh:[-0.15, 0.42, 0.78], rh:[0.15, 0.42, 0.78]});
     // hoodie: hood down behind the head, white strings
     mk(g, S(0.42, 12, 10), M(0x6c44d8), 0, 0.55, -0.48).scale.set(1.3, 0.8, 0.8);
     [-1, 1].forEach(s => mk(g, C(0.025, 0.025, 0.3, 6), M(0xffffff), s*0.12, 0.3, 0.6));
     // big gaming headphones with green lights
     mk(g, TOR(0.66, 0.06, Math.PI, 16), M(INK), 0, 0.92, 0);
     [-1, 1].forEach(s => { mk(g, C(0.2, 0.2, 0.14, 14), M(INK), s*0.64, 0.88, 0, 0, 0, Math.PI/2); mk(g, C(0.12, 0.12, 0.02, 12), BM(0x3ccf6e), s*0.72, 0.88, 0, 0, 0, Math.PI/2); });
     // the phone, held in both hands, screen tilted up at his face, with a tiny game running on it
     const ph = group(g, 0, 0.45, 0.82, 0.9, 0, 0);
     mk(ph, BX(0.34, 0.52, 0.05), M(INK));
     mk(ph, BX(0.28, 0.44, 0.01), BM(0x1a2a4a), 0, 0, -0.03);
     const dot = mk(ph, BX(0.06, 0.06, 0.01), BM(0xffd23f), 0, 0, -0.04), dot2 = mk(ph, BX(0.05, 0.05, 0.01), BM(0xff3b5c), 0, 0.12, -0.04);
     return [t => { dot.position.set(Math.sin(t*3)*0.1, Math.cos(t*2.3)*0.15, -0.04); dot2.position.x = Math.sin(t*1.7 + 2)*0.1; dot2.visible = (t*3 % 1) < 0.8; }];
   }},
  {id:'maciej', name:'Maciej', title:'The Tank Dino', color:0x556b2f,
   desc:'A dinosaur who loves tanks and everything about World War II. He knows every tank ever built, reads history books for fun, and drives his kart like it has tracks and armour.',
   mods:[0,-1,-1,2,1], cd:18, ability:{name:'Tank Shell', icon:'💥', desc:'Fires his kart’s cannon: a heavy shell flies at the racer ahead and explodes, spinning out everyone near the blast. The recoil comes with armour plating, so he can’t be hit for a moment.'},
   build:{body:'monster', wheels:'standard', paint:0x556b2f, accent:0x8b7d5a},
   draw(g){
     const dino = M(0x4caf50), belly = M(0xc8e6a0);
     // dino body with a pale belly
     mk(g, C(0.58, 0.7, 1.0, 14), dino);
     mk(g, S(0.45, 12, 10), belly, 0, 0.05, 0.32).scale.set(1, 1.1, 0.6);
     // head with angry eyebrows and a long snout full of teeth
     mk(g, S(0.6, 18, 14), dino, 0, 0.9, 0);
     face(g, {mouth:'none', brows:'angry'}, 0.95, 0.6, 0.06);
     mk(g, BX(0.62, 0.34, 0.6), dino, 0, 0.66, 0.55);
     [-1, 1].forEach(s => mk(g, S(0.04, 6, 4), M(INK), s*0.12, 0.8, 0.85));
     for (let i = 0; i < 5; i++) mk(g, new THREE.ConeGeometry(0.04, 0.1, 5), M(0xffffff), -0.22 + i*0.11, 0.46, 0.82, Math.PI);
     // tiny T. rex arms on the wheel
     [-1, 1].forEach(s => { limb(g, [s*0.5, 0.3, 0.2], [s*0.3, 0.2, 0.62], 0.1, dino); mk(g, S(0.1, 8, 6), dino, s*0.3, 0.2, 0.66); });
     // spikes down the back, and a tail
     for (let i = 0; i < 4; i++) mk(g, new THREE.ConeGeometry(0.12, 0.3, 6), M(0x2e7d32), 0, 1.3 - i*0.38, -0.5 - (i > 0 ? 0.12 : 0), -0.5);
     const tail = mk(g, new THREE.ConeGeometry(0.32, 1.3, 10), dino, 0, -0.3, -1.0, -Math.PI/2 - 0.25);
     // olive WW2 army helmet with a chin strap and a white star
     mk(g, HALF(0.66), M(0x556b2f), 0, 1.12, -0.02);
     mk(g, C(0.8, 0.8, 0.05, 22), M(0x4a5d28), 0, 1.12, -0.02);
     mk(g, TOR(0.6, 0.025, Math.PI, 12), M(0x3a2a1a), 0, 1.0, 0.05, 0, 0, Math.PI);
     const star = new THREE.Shape();
     for (let i = 0; i < 10; i++){ const a = i/10*Math.PI*2 - Math.PI/2, r = i % 2 ? 0.06 : 0.14; i ? star.lineTo(Math.cos(a)*r, -Math.sin(a)*r) : star.moveTo(Math.cos(a)*r, -Math.sin(a)*r); }
     mk(g, new THREE.ShapeGeometry(star), BM(0xffffff, {side:THREE.DoubleSide}), 0, 1.45, 0.58, -0.45);
     // a tank turret bolted behind him, the cannon poking out past his shoulder
     const tur = group(g, 0, 0.15, -0.95);
     mk(tur, BX(0.95, 0.45, 0.8), M(0x556b2f));
     mk(tur, C(0.3, 0.3, 0.12, 12), M(0x4a5d28), 0, 0.28, 0);
     mk(tur, C(0.08, 0.08, 1.6, 10), M(0x3d4a22), 0.62, 0.05, 0.75, Math.PI/2);
     mk(tur, C(0.11, 0.11, 0.16, 10), M(0x2a3318), 0.62, 0.05, 1.55, Math.PI/2);
     return [t => { tur.rotation.y = Math.sin(t*0.7)*0.12; tail.rotation.y = Math.sin(t*3)*0.25; }];
   }},
  // ---- secret racers (unlocked by easter eggs) ----
  {id:'casper', name:'Casper', title:'The Car Expert', color:0xe0201f, secret:true,
   desc:'A real autokenner. He knows every engine, every tyre and every top speed by heart, and he can tune any kart in seconds.',
   mods:[1,0,1,0,-1], cd:15, ability:{name:'Pro Tune-Up', icon:'🔧', desc:'Tunes his kart in the middle of the race: shakes off any spin, freeze or shrink, then blasts off with a long turbo boost while nothing can touch him.'},
   build:{body:'speedster', wheels:'slick', paint:0xe0201f, accent:0xffffff},
   draw(g){
     person(g, {shirt:0x2a3a5a, hair:0x3a2414, mouth:'smirk', brows:'flat', browColor:0x3a2414, gloves:0x1d1a2f, rh:[0.55, 0.45, 0.75]});
     // mechanic overalls: straps and a chest pocket
     [-1, 1].forEach(s => mk(g, BX(0.12, 0.9, 0.05), M(0x4a6fa5), s*0.24, 0.05, 0.6));
     mk(g, BX(0.36, 0.22, 0.05), M(0x4a6fa5), 0, -0.15, 0.62);
     // cap on backwards and sunglasses
     mk(g, HALF(0.64), M(0xe0201f), 0, 0.92, 0, -0.05);
     mk(g, BX(0.62, 0.05, 0.42), M(0xe0201f), 0, 1.0, -0.62, -0.12);
     mk(g, BX(0.64, 0.14, 0.04), BM(0x1d1a2f), 0, 0.93, 0.58);
     [-1, 1].forEach(s => mk(g, BX(0.24, 0.12, 0.03), BM(0x3cf0ff, {transparent:true, opacity:0.5}), s*0.16, 0.93, 0.6));
     // a wrench in his hand, a rag in his pocket
     const wrench = group(g, 0.55, 0.45, 0.75, 0, 0, -0.5), steel = M(0xb0b8c8);
     mk(wrench, BX(0.08, 0.7, 0.05), steel, 0, 0.3, 0);
     mk(wrench, TOR(0.1, 0.04, Math.PI*1.4, 10), steel, 0, 0.7, 0, 0, 0, Math.PI*0.8);
     mk(g, BX(0.14, 0.2, 0.04), M(0xff7a1f), -0.18, -0.2, 0.64, 0, 0, 0.3);
     return [t => { wrench.rotation.z = -0.5 + Math.sin(t*4)*0.25; }];
   }},
  {id:'zennith', name:'Zennith', title:'The Living Dark', color:0x1a1030, secret:true,
   desc:'A tall shadow being from the darkest corner of the sky. No face, just two glowing eyes. Where Zennith looks, the light goes out.',
   mods:[1,0,0,0,-1], cd:20, ability:{name:'Void Fall', icon:'🕳️', desc:'Drops a pillar of pure darkness on the racer in 1st place (2nd if Zennith leads). A second later it crashes down and spins out everyone around them.'},
   build:{body:'rocket', wheels:'slick', paint:0x1a1030, accent:0x8a5cff},
   draw(g){
     const dark = M(0x0c0814), body = group(g);
     // a hooded, flowing cloak of shadow instead of a body
     mk(body, new THREE.ConeGeometry(0.85, 1.9, 18, 1, true), M(0x120b1f, {side:THREE.DoubleSide}), 0, 0.35, 0);
     mk(body, S(0.6, 18, 14), dark, 0, 1.05, 0);
     // hood: open at the front (the gap faces +z) so the eyes glow out of the dark
     const hood = mk(body, new THREE.SphereGeometry(0.74, 18, 14, Math.PI*0.8, Math.PI*1.4, 0, Math.PI*0.62), M(0x1a1030, {side:THREE.DoubleSide}), 0, 1.1, -0.04);
     hood.rotation.x = -0.25;
     const eyes = [-1, 1].map(s => mk(body, S(0.09, 10, 8), BM(0xb38cff), s*0.2, 1.08, 0.55));
     [-1, 1].forEach(s => mk(body, S(0.16, 10, 8), M(0x8a5cff, {transparent:true, opacity:0.35, depthWrite:false}), s*0.2, 1.08, 0.53));
     // shadowy arms that end in wisps
     [-1, 1].forEach(s => { limb(body, [s*0.45, 0.6, 0.1], [s*0.38, 0.15, 0.8], 0.09, dark); mk(body, S(0.12, 8, 6), dark, s*0.38, 0.15, 0.8); });
     // tiny stars swallowed inside the dark, and wisps drifting off the top
     for (let i = 0; i < 6; i++) mk(body, S(0.03, 6, 4), BM(0xffffff), (Math.random() - 0.5)*0.9, 0.1 + Math.random()*0.8, 0.45 + Math.random()*0.15);
     const wisps = group(g, 0, 1.5, 0), ws = [];
     for (let i = 0; i < 5; i++) ws.push(mk(wisps, S(0.14 - i*0.02, 8, 6), M(0x2a1f3f, {transparent:true, opacity:0.75}), Math.cos(i*1.3)*0.35, 0, Math.sin(i*1.3)*0.35));
     return [t => {
       body.position.y = Math.sin(t*1.8)*0.08;
       wisps.rotation.y = -t;
       ws.forEach((w, i) => { const p = (t*0.35 + i*0.2) % 1; w.position.y = p*0.9; w.material.opacity = 0.75*(1 - p); });
       const blink = (t % 4) > 3.85; eyes.forEach(e => e.scale.y = blink ? 0.15 : 1);
     }];
   }},
  {id:'ankervos', name:'Anker Vos', title:'The Annoying Fox', color:0xff7a1f, secret:true,
   desc:'Just a fox. A very, very annoying fox. He yaps, he cheats, he sticks his tongue out at you, and he never stops laughing.',
   mods:[1,1,1,-1,0], cd:15, ability:{name:'Yap Yap Yap', icon:'📢', desc:'Yaps so loudly that everyone near him gets their steering scrambled for a moment, and he grabs a speed boost while they wobble.'},
   build:{body:'speedster', wheels:'tiny', paint:0xff7a1f, accent:0xffffff},
   draw(g){
     const fur = M(0xff7a1f), white = M(0xffffff), black = M(INK);
     person(g, {shirt:0xff7a1f, skin:0xff7a1f, mouth:'smirk', brows:'flat', browColor:0x8a3a00, ears:false});
     // white chest and muzzle, black nose, tongue sticking out
     mk(g, S(0.32, 12, 10), white, 0, 0.0, 0.42).scale.set(1, 1.3, 0.5);
     mk(g, S(0.3, 12, 10), white, 0, 0.68, 0.42).scale.set(1, 0.75, 0.9);
     mk(g, S(0.09, 8, 6), black, 0, 0.76, 0.7);
     const tongue = mk(g, S(0.08, 8, 6), M(0xff5f86), 0.06, 0.55, 0.68); tongue.scale.set(1, 0.5, 1.4);
     // big pointy ears with black tips
     const ears = [-1, 1].map(s => {
       const e = group(g, s*0.36, 1.3, -0.05, 0, 0, -s*0.3);
       mk(e, new THREE.ConeGeometry(0.22, 0.55, 8), fur, 0, 0.2, 0);
       mk(e, new THREE.ConeGeometry(0.09, 0.2, 8), black, 0, 0.42, 0);
       return e;
     });
     // a huge bushy tail with a white tip
     const tail = group(g, 0, -0.05, -0.55);
     mk(tail, S(0.34, 12, 10), fur, 0, 0.15, -0.3).scale.set(0.8, 0.8, 1.5);
     mk(tail, S(0.24, 10, 8), white, 0, 0.3, -0.78);
     return [t => {
       tail.rotation.y = Math.sin(t*6)*0.45;   // never stops wagging
       ears.forEach((e, i) => e.rotation.x = Math.sin(t*5 + i)*0.15);
       tongue.scale.z = 1.4 + Math.sin(t*8)*0.4;
     }];
   }},
];

// Builds the character into `parent` and returns its per-frame animation callbacks.
export function drawDriver(ch, parent){
  const g = new THREE.Group(); parent.add(g);
  if (ch.scale) g.scale.setScalar(ch.scale);
  return ch.draw(g) || [];
}
