import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { cfg } from './settings.js?v=20261128w';

// Cast cues for the abilities that don't throw, build or blow anything up: buffs, heals, shields,
// stealth and teleports. In first person those are easy to miss, so each one gets
//   - on your own screen: a themed overlay, its icon and name under the crosshair, and a little
//     shower of fitting particles (local player only, and a setting)
//   - in the world: an effect everyone else can see on the caster
//
//   screen  shield | heal | fade | rewind | zap | warm | dark | ring | jelly | power
//   world   shell | plus | swirl | pillar | burst | puff
export const CUES = {
  barrier:    { icon: '🛡️', c: 0x5ab8ff, screen: 'shield', bits: '⚓', world: 'shell' },
  mark:       { icon: '🎯', c: 0xffd23c, screen: 'ring',   bits: '✦', world: 'pillar' },
  heal:       { icon: '🏮', c: 0xffe08a, screen: 'heal',   bits: '✚', world: 'plus' },
  sanctum:    { icon: '🕯️', c: 0xfff0b0, screen: 'ring',   bits: '✚', world: 'pillar' },
  overclock:  { icon: '🔔', c: 0xd8a24a, screen: 'ring',   bits: '🔔', world: 'burst' },
  vanish:     { icon: '🎭', c: 0xb98aff, screen: 'fade',   bits: '✨', world: 'puff' },
  rewind:     { icon: '⏪', c: 0x18c4d8, screen: 'rewind', bits: '♪', world: 'swirl' },
  flare:      { icon: '🎆', c: 0xff6a3c, screen: 'zap',    bits: '✹', world: 'pillar' },
  wish:       { icon: '🌠', c: 0xff8fd0, screen: 'power',  bits: '⭐', world: 'swirl' },
  nightmare:  { icon: '🌑', c: 0x8a3aff, screen: 'dark',   bits: '💜', world: 'shell' },
  gelform:    { icon: '🟢', c: 0x7ee85a, screen: 'jelly',  bits: '💧', world: 'shell' },
  cheeks:     { icon: '🥜', c: 0xc8843a, screen: 'warm',   bits: '🌰', world: 'plus' },
  megamech:   { icon: '🤖', c: 0x5ad8ff, screen: 'power',  bits: '⚙', world: 'pillar' },
  leafstep:   { icon: '🍃', c: 0x5fb05a, screen: 'fade',   bits: '🍃', world: 'swirl' },
  moonshot:   { icon: '🌕', c: 0xcfe0ff, screen: 'dark',   bits: '✧', world: 'pillar' },
  duet:       { icon: '🩰', c: 0xff9ad0, screen: 'heal',   bits: '♪', world: 'swirl' },
  lifeline:   { icon: '💉', c: 0x5fe0c0, screen: 'shield', bits: '✚', world: 'plus' },
  codeblue:   { icon: '🚑', c: 0xff5a6a, screen: 'heal',   bits: '❤', world: 'pillar' },
  jumpstart:  { icon: '⚡', c: 0xffe14a, screen: 'zap',    bits: '⚡', world: 'burst' },
  overcharge: { icon: '🔋', c: 0xb6f06a, screen: 'power',  bits: '⚡', world: 'pillar' },
  crust:      { icon: '🥧', c: 0xe8b060, screen: 'warm',   bits: '🥐', world: 'shell' },
  reheat:     { icon: '♨️', c: 0xff8a3c, screen: 'warm',   bits: '🔥', world: 'shell' },
  capsule:    { icon: '🥚', c: 0xff6ab0, screen: 'shield', bits: '🎟', world: 'shell' },
  powerup:    { icon: '🍄', c: 0x5ae05a, screen: 'power',  bits: '⭐', world: 'plus' },
  warppipe:   { icon: '🟩', c: 0x3ccf5a, screen: 'fade',   bits: '💨', world: 'puff' },
  oneup:      { icon: '💚', c: 0x5ae05a, screen: 'ring',   bits: '1UP', world: 'pillar' },
  submerge:   { icon: '🐊', c: 0x6a8a3a, screen: 'fade',   bits: '🫧', world: 'puff' },
  molehole:   { icon: '🕳️', c: 0x8a6a4a, screen: 'ring',   bits: '🪨', world: 'burst' },
  rally:      { icon: '🚩', c: 0xffd23c, screen: 'power',  bits: '⚔', world: 'pillar' },
  pylon:      { icon: '🗼', c: 0xffe14a, screen: 'zap',    bits: '⚡', world: 'burst' },
  blink:      { icon: '💨', c: 0x7af0ff, screen: 'fade',   bits: '📦', world: 'puff' },
};

const $ = id => document.getElementById(id);
const css = c => '#' + c.toString(16).padStart(6, '0');
let clearT = 0;

// ---------- on your screen ----------
function screenCue(cue, name, ult) {
  const box = $('castFx'); if (!box) return;
  const col = css(cue.c);
  box.style.setProperty('--cc', col);
  box.className = ''; void box.offsetWidth;
  box.className = 'on cu-' + cue.screen + (ult ? ' ult' : '');
  // the name pill under the crosshair
  const tag = $('castTag');
  tag.innerHTML = `<i>${cue.icon}</i>${name}`;
  tag.style.setProperty('--cc', col);
  tag.classList.remove('on'); void tag.offsetWidth; tag.classList.add('on');
  // a little shower of themed bits rising from the bottom of the screen
  const bits = $('castBits');
  bits.innerHTML = '';
  const n = ult ? 16 : 9;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.textContent = cue.bits;
    s.style.left = (8 + Math.random() * 84).toFixed(1) + '%';
    s.style.setProperty('--d', (Math.random() * 0.25).toFixed(2) + 's');
    s.style.setProperty('--x', ((Math.random() - 0.5) * 80).toFixed(0) + 'px');
    s.style.setProperty('--s', (0.8 + Math.random() * 0.8).toFixed(2));
    s.style.color = col;
    bits.appendChild(s);
  }
  clearTimeout(clearT);
  clearT = setTimeout(() => { box.className = ''; bits.innerHTML = ''; }, ult ? 1600 : 1100);
}

// ---------- in the world ----------
const glow = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const push = (G, obj, life, tick) => { G.scene.add(obj); G.fx.push({ obj, life, max: life, kind: 'cue', tick }); };

function worldCue(G, h, cue, ult) {
  const c = cue.c, p = h.pos, s = ult ? 1.4 : 1;
  if (cue.world === 'shell') {                     // a bubble that pops out around the caster and fades
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25 * s, 2), glow(c));
    m.position.set(p.x, p.y + 1.1, p.z);
    push(G, m, 0.7, (f, dt, k) => { m.position.set(h.pos.x, h.pos.y + 1.1, h.pos.z); m.scale.setScalar(0.7 + (1 - k) * 0.5); m.rotation.y += dt * 2; m.material.opacity = k * 0.45; });
    const w = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 * s, 1), new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, depthWrite: false }));
    w.position.copy(m.position);
    push(G, w, 0.7, (f, dt, k) => { w.position.set(h.pos.x, h.pos.y + 1.1, h.pos.z); w.scale.setScalar(0.7 + (1 - k) * 0.55); w.rotation.y -= dt * 3; w.material.opacity = k * 0.8; });
  } else if (cue.world === 'plus') {               // little crosses float up off the caster
    for (let i = 0; i < (ult ? 9 : 6); i++) {
      const g = new THREE.Group(), mat = glow(c);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), mat), new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), mat));
      const a = i / 6 * Math.PI * 2, r = 0.6 + Math.random() * 0.4;
      g.position.set(p.x + Math.cos(a) * r, p.y + 0.4 + Math.random() * 0.8, p.z + Math.sin(a) * r);
      g.material = mat;
      push(G, g, 0.9, (f, dt, k) => { g.position.y += dt * 1.8; g.rotation.y += dt * 4; mat.opacity = Math.min(1, k * 2); });
    }
  } else if (cue.world === 'swirl') {              // a ribbon of motes that winds up around the caster
    for (let i = 0; i < (ult ? 22 : 14); i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), glow(i % 2 ? c : 0xffffff));
      let a = i * 0.45, y = i * 0.12;
      push(G, m, 0.8, (f, dt, k) => { a += dt * 8; y += dt * 2; const r = 0.9 * (0.4 + k * 0.6); m.position.set(h.pos.x + Math.cos(a) * r, h.pos.y + y, h.pos.z + Math.sin(a) * r); m.material.opacity = Math.min(1, k * 2.5); });
    }
  } else if (cue.world === 'pillar') {             // a thin beam of light straight up
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.6 * s, 9, 14, 1, true), glow(c));
    m.position.set(p.x, p.y + 4.5, p.z);
    push(G, m, 0.75, (f, dt, k) => { m.position.set(h.pos.x, h.pos.y + 4.5, h.pos.z); m.scale.set(k, 1, k); m.material.opacity = k * 0.5; });
    const d = new THREE.Mesh(new THREE.RingGeometry(0.3, 1.3 * s, 28), glow(c)); d.rotation.x = -Math.PI / 2; d.position.set(p.x, p.y + 0.06, p.z);
    push(G, d, 0.75, (f, dt, k) => { d.scale.setScalar(1 + (1 - k) * 1.5); d.material.opacity = k * 0.7; });
  } else if (cue.world === 'burst') {              // two rings snapping outward and a crackle of shards
    for (let j = 0; j < 2; j++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 6, 32), glow(c)); r.rotation.x = Math.PI / 2; r.position.set(p.x, p.y + 0.3 + j * 0.9, p.z);
      push(G, r, 0.55 + j * 0.1, (f, dt, k) => { r.scale.setScalar(1 + (1 - k) * (2.6 + j)); r.material.opacity = k * 0.9; });
    }
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.08, 0), glow(c)), v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(5 + Math.random() * 3);
      m.position.set(p.x, p.y + 1, p.z);
      push(G, m, 0.5, (f, dt, k) => { m.position.addScaledVector(v, dt); v.y -= 10 * dt; m.rotation.x += dt * 9; m.material.opacity = k; });
    }
  } else if (cue.world === 'puff') {               // a ring of soft puffs left where the caster was
    const at = p.clone();
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? c : 0xffffff, transparent: true, depthWrite: false }));
      const a = i / 8 * Math.PI * 2;
      m.position.set(at.x + Math.cos(a) * 0.5, at.y + 0.6 + (i % 3) * 0.35, at.z + Math.sin(a) * 0.5);
      push(G, m, 0.8, (f, dt, k) => { m.position.x += Math.cos(a) * dt * 1.2; m.position.z += Math.sin(a) * dt * 1.2; m.position.y += dt * 0.5; m.scale.setScalar(1 + (1 - k) * 1.4); m.material.opacity = k * 0.6; });
    }
  }
}

// Called from the ability event for every cast. Only the abilities in CUES get one.
export function castCue(G, h, slot, isMe) {
  const a = h.def[slot], cue = a && CUES[a.id];
  if (!cue) return;
  worldCue(G, h, cue, slot === 'ult');
  if (isMe && cfg.castCues !== false) screenCue(cue, a.name, slot === 'ult');
}
export function clearCastCue() {
  clearTimeout(clearT);
  const box = $('castFx'); if (box) box.className = '';
  const bits = $('castBits'); if (bits) bits.innerHTML = '';
  $('castTag')?.classList.remove('on');
}
