import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { burst, ring } from './units.js?v=20261128r';

// Victory poses: when your team wins, the camera swings round to face your hero, who strikes
// their own pose with their own effect and line before the results come up. Poses are built on
// the jointed rig (rig.js) and blend in over the idle pose, like emotes (emotes.js).

const C = { pink: 0xff4fa3, gold: 0xffd23c, cyan: 0x7af0ff, white: 0xffffff };
// each hero: pose name, a line, the pose itself, and what it throws into the air
export const VICTORY = {
  vanguard: { name: 'Harbour Salute', line: 'All hands accounted for!', fx: ['ring', 0x2fb39a, 0.8],
    pose: (R, P, a, t) => { R(a.r, 'x', -1.9); R(a.r, 'z', 0.55); R(P?.elbowR, 'x', 2.3); R(a.l, 'x', 0.9); R(P?.spine, 'x', -0.15); R(P?.head, 'x', -0.12); } },
  striker: { name: 'Speed Check', line: 'Delivered ahead of schedule.', fx: ['spark', 0xffc93c, 0.12],
    pose: (R, P, a, t, lift) => { R(a.l, 'x', 1.2); R(P?.elbowL, 'x', 1.6); R(a.r, 'x', 1.3 + Math.sin(t * 14) * 0.12); R(a.r, 'z', -0.35); R(P?.elbowR, 'x', 1.1); R(P?.head, 'x', 0.25); lift(Math.abs(Math.sin(t * 10)) * 0.07); } },
  ember: { name: 'Grand Bow', line: 'Thank you, thank you! Encore!', fx: ['firework', null, 0.45],
    pose: (R, P, a, t) => { const b = t < 1.6 ? Math.sin(Math.min(1, t / 1.6) * Math.PI) : 0, up = t > 1.6;
      R(a.r, 'x', up ? -2.8 : 0.4); R(a.l, 'x', up ? -2.8 : 0.4); R(a.r, 'z', up ? 0.4 : 1.2); R(a.l, 'z', up ? -0.4 : -1.2); R(P?.spine, 'x', b * 0.9); } },
  warden: { name: 'Vigil', line: 'The light holds.', fx: ['ring', 0xb98cff, 0.7],
    pose: (R, P, a, t, lift) => { R(a.l || a.r, 'x', -2.85); R(a.l || a.r, 'z', -0.2); R(P?.elbowL, 'x', 0.15); R(P?.head, 'x', -0.35); lift(0.05 + Math.sin(t * 2) * 0.04); } },
  thicket: { name: 'In Bloom', line: 'Look how it all grew back.', fx: ['leaf', 0x6fbf4a, 0.15],
    pose: (R, P, a, t) => { const s = Math.sin(t * 2.4) * 0.15; R(a.r, 'x', -2.5); R(a.l, 'x', -2.5); R(a.r, 'z', 0.6 + s); R(a.l, 'z', -0.6 + s); R(P?.hips, 'z', s * 0.6); R(P?.head, 'x', -0.25); } },
  ratchet: { name: 'Clocking Out', line: 'Shift’s over. Nobody touch my turret.', fx: ['spark', 0x8fa3bf, 0.2],
    pose: (R, P, a, t) => { const wipe = t < 1.2; R(a.l, 'x', wipe ? 2.1 : 0.2); R(P?.elbowL, 'x', wipe ? 2.1 + Math.sin(t * 8) * 0.2 : 0.3); R(a.r, 'x', wipe ? 0.3 : 1.3); R(P?.elbowR, 'x', wipe ? 0.3 : 1.2); R(P?.head, 'x', wipe ? 0.2 : -0.1); } },
  mirage: { name: 'Now You See Me', line: 'And for my final trick… I win.', fx: ['pop', 0xd94fa0, 0.3],
    pose: (R, P, a, t, lift, spin) => { if (t < 0.9) spin(t * 14); R(a.r, 'x', -1.6); R(a.l, 'x', -1.6); R(a.r, 'z', 1.1); R(a.l, 'z', -1.1); R(P?.spine, 'x', -0.12); } },
  avalanche: { name: 'Summit', line: 'TOP OF THE MOUNTAIN!', fx: ['snow', 0xdff4ff, 0.12],
    pose: (R, P, a, t, lift) => { R(a.r, 'x', -2.95); R(a.l, 'x', -2.95); R(a.r, 'z', 0.25); R(a.l, 'z', -0.25); R(P?.head, 'x', -0.3); lift(t < 0.6 ? Math.sin(t / 0.6 * Math.PI) * 0.8 : Math.abs(Math.sin(t * 5)) * 0.05); } },
  croc: { name: 'Jaws', line: 'Chomp chomp. Next!', fx: ['splash', 0x6a9a3a, 0.35],
    pose: (R, P, a, t) => { const c = (Math.sin(t * 9) + 1) / 2; R(a.r, 'x', 1.2 + c * 0.7); R(a.l, 'x', 1.9 - c * 0.7); R(a.r, 'z', 0); R(a.l, 'z', 0); R(P?.elbowR, 'x', 0.1); R(P?.elbowL, 'x', 0.1); R(P?.spine, 'x', 0.2); } },
  tempo: { name: 'Drop the Beat', line: 'That’s the track. That’s the win.', fx: ['beat', 0x18c4d4, 0.45],
    pose: (R, P, a, t, lift) => { const b = Math.sin(t * 9); R(a.r, 'x', -2.4 + b * 0.4); R(a.r, 'z', 0.3); R(P?.elbowR, 'x', 0.4); R(a.l, 'x', 0.9); R(P?.elbowL, 'x', 1.8); R(P?.head, 'x', Math.abs(b) * 0.3); R(P?.hips, 'z', b * 0.1); lift(Math.abs(b) * 0.05); } },
  kestrel: { name: 'Spread Wings', line: 'Air superiority, confirmed.', fx: ['feather', 0xf2a541, 0.15],
    pose: (R, P, a, t, lift) => { const f = Math.sin(t * 7) * 0.3; R(a.r, 'z', 1.5 + f); R(a.l, 'z', -1.5 - f); R(a.r, 'x', 0); R(a.l, 'x', 0); R(P?.elbowR, 'x', 0.1); R(P?.elbowL, 'x', 0.1); lift(0.2 + f * 0.3); } },
  cavalier: { name: 'Knighted', line: 'For honour, and for the stables!', fx: ['confetti', 0xc23b3b, 0.25],
    pose: (R, P, a, t) => { R(a.r, 'x', -3); R(a.r, 'z', 0.1); R(P?.elbowR, 'x', 0); R(a.l, 'x', 0.3); R(a.l, 'z', -0.7); R(P?.elbowL, 'x', 1.4); R(P?.head, 'x', -0.2); R(P?.spine, 'x', -0.1); } },
  slime: { name: 'Jiggle', line: 'Fascinating! I am VICTORIOUS!', fx: ['goo', 0x6fd94a, 0.2],
    pose: (R, P, a, t, lift, spin, squash) => { squash(1 + Math.sin(t * 10) * 0.12); R(a.r, 'x', -1.5 + Math.sin(t * 6) * 0.5); R(a.l, 'x', -1.5 - Math.sin(t * 6) * 0.5); R(a.r, 'z', 0.8); R(a.l, 'z', -0.8); } },
  brawler: { name: 'Title Belt', line: 'Undisputed. Undefeated. Unstoppable.', fx: ['spark', 0xff5a36, 0.18],
    pose: (R, P, a, t) => { const up = t < 1.2, p = Math.sin(t * 10) > 0; R(a.r, 'x', up ? -2.9 : p ? 1.6 : 0.8); R(a.l, 'x', up ? -2.9 : p ? 0.8 : 1.6); R(P?.elbowR, 'x', up ? 0.2 : 1.9); R(P?.elbowL, 'x', up ? 0.2 : 1.9); R(P?.spine, 'x', -0.15); } },
  chipmunk: { name: 'Nut Toss', line: 'Snack break! Winners eat first.', fx: ['nut', 0xb5762e, 0.5],
    pose: (R, P, a, t) => { const toss = (t % 1) < 0.25; R(a.r, 'x', toss ? -2.2 : 1.1); R(P?.elbowR, 'x', toss ? 0.3 : 1.4); R(P?.head, 'x', -0.2 - ((t % 1) < 0.6 ? (t % 1) * 0.6 : 0)); R(a.l, 'x', 0.4); } },
  elf: { name: 'Moonlit Shot', line: 'Every arrow found its mark.', fx: ['sparkle', 0xd8ffb0, 0.15],
    pose: (R, P, a, t) => { R(a.l, 'x', -2.2); R(a.l, 'z', -0.2); R(P?.elbowL, 'x', 0); R(a.r, 'x', -2); R(a.r, 'z', 0.4); R(P?.elbowR, 'x', 2.4); R(P?.head, 'x', -0.45); R(P?.spine, 'x', -0.2); } },
  dancer: { name: 'Final Pirouette', line: 'And… curtain.', fx: ['petal', 0xff8fc0, 0.12],
    pose: (R, P, a, t, lift, spin) => { if (t < 1.6) spin(t * 10); R(a.r, 'x', -2.8); R(a.l, 'x', -2.8); R(a.r, 'z', 0.25); R(a.l, 'z', -0.25); R(P?.elbowR, 'x', 0.5); R(P?.elbowL, 'x', 0.5); lift(0.1); if (t > 1.6) R(P?.spine, 'x', 0.35); } },
  mole: { name: 'Pop Up', line: 'Surprise! Did you miss me?', fx: ['dirt', 0x8a6a3a, 0.2],
    pose: (R, P, a, t, lift) => { lift(-1 + Math.min(1, t / 0.7)); R(a.r, 'x', -2.6); R(a.r, 'z', 0.4 + Math.sin(t * 10) * 0.3); R(P?.elbowR, 'x', 0.3); R(a.l, 'x', 0.4); } },
  medic: { name: 'All Clear', line: 'Prognosis: we won.', fx: ['heal', 0x5fe0a0, 0.35],
    pose: (R, P, a, t) => { R(a.l, 'x', 1.3); R(P?.elbowL, 'x', 1.5); R(a.r, 'x', 1.2 + ((t * 3) % 1 < 0.3 ? 0.3 : 0)); R(P?.elbowR, 'x', 1.4); R(P?.head, 'x', 0.25 + Math.sin(t * 4) * 0.08); } },
  spark: { name: 'Overcharged', line: 'I’m at 110%! Maybe 120!', fx: ['zap', 0xffe14a, 0.1],
    pose: (R, P, a, t, lift) => { const j = Math.sin(t * 45) * 0.08; R(a.r, 'z', 1.3 + j); R(a.l, 'z', -1.3 - j); R(a.r, 'x', -0.4); R(a.l, 'x', -0.4); R(P?.head, 'x', -0.2 + j); lift(0.35 + Math.sin(t * 3) * 0.1); } },
  builder: { name: 'Topping Out', line: 'Built to last. Like this win.', fx: ['dust', 0xff8a2a, 0.3],
    pose: (R, P, a, t) => { const pump = t < 1.5; R(a.r, 'x', pump ? -2.7 + Math.sin(t * 8) * 0.3 : 0.3); R(a.r, 'z', pump ? 0.2 : 0.8); R(P?.elbowR, 'x', pump ? 0.2 : 1.5); R(a.l, 'x', 0.3); R(a.l, 'z', -0.8); R(P?.elbowL, 'x', 1.5); R(P?.spine, 'x', -0.1); } },
  wellington: { name: 'Tea Time', line: 'Splendid. Simply splendid.', fx: ['steam', 0xe8d8c0, 0.3],
    pose: (R, P, a, t) => { const sip = (t % 1.6) < 0.8; R(a.r, 'x', sip ? 1.7 : 1.3); R(P?.elbowR, 'x', sip ? 2.3 : 1.6); R(a.l, 'x', 0.3); R(a.l, 'z', -0.8); R(P?.elbowL, 'x', 1.5); R(P?.head, 'x', sip ? -0.25 : -0.1); } },
  shepherd: { name: 'Highland Fling', line: 'Och, that’s the flock home!', fx: ['confetti', 0x6a9a5a, 0.2],
    pose: (R, P, a, t, lift) => { const s = Math.sin(t * 8); R(a.r, 'x', -2.8); R(a.r, 'z', 0.3); R(P?.elbowR, 'x', 0.6); R(a.l, 'x', 0.3); R(a.l, 'z', -0.8); R(P?.elbowL, 'x', 1.5); R(P?.hips, 'z', s * 0.12); lift(Math.abs(s) * 0.14); } },
  microwave: { name: 'DING!', line: 'DING. VICTORY IS SERVED.', fx: ['ding', 0xffd23c, 0.6],
    pose: (R, P, a, t, lift, spin) => { spin(Math.floor(t * 2) * 0.5); R(a.r, 'x', 1.57); R(a.l, 'x', 1.57); R(a.r, 'z', 0); R(a.l, 'z', 0); R(P?.elbowR, 'x', 0); R(P?.elbowL, 'x', 0); } },
  chef: { name: 'Chef’s Kiss', line: 'Magnifique! A masterpiece!', fx: ['flame', 0xe8423a, 0.18],
    pose: (R, P, a, t) => { const out = (t % 1.4) > 0.6; R(a.l || a.r, 'x', out ? 1.4 : 1.7); R(a.l || a.r, 'z', out ? -0.7 : 0.15); R(P?.elbowL, 'x', out ? 0.2 : 2.3); R(a.r, 'x', 0.3); R(P?.head, 'x', out ? -0.25 : 0.1); } },
  manspider: { name: 'Eight-Leg Shuffle', line: 'Thwip thwip. Nailed it.', fx: ['web', 0xf0f0ff, 0.3],
    pose: (R, P, a, t, lift) => { const s = Math.sin(t * 12); R(a.r, 'z', 1.1 + s * 0.3); R(a.l, 'z', -1.1 + s * 0.3); R(a.r, 'x', 0.6); R(a.l, 'x', 0.6); R(P?.elbowR, 'x', 1.4); R(P?.elbowL, 'x', 1.4); R(P?.spine, 'x', 0.3); lift(-0.2 + Math.abs(s) * 0.06); } },
  pinball: { name: 'Tilt!', line: 'New high score. Put my initials on it.', fx: ['beat', 0xff3fa4, 0.3],
    pose: (R, P, a, t, lift) => { const s = Math.sin(t * 6); R(a.r, 'x', -2.6); R(a.r, 'z', 0.5); R(P?.elbowR, 'x', 0.4); R(a.l, 'x', 1.1); R(P?.elbowL, 'x', 1.6); R(P?.hips, 'z', s * 0.18); R(P?.spine, 'x', -0.15); lift(Math.abs(s) * 0.12); } },
  clawbot: { name: 'Prize Get', line: 'PRIZE ACQUIRED. NO REFUNDS.', fx: ['ding', 0x3fd8ff, 0.5],
    pose: (R, P, a, t, lift) => { const grab = (t % 1.2) < 0.4; R(a.r, 'x', -2.9); R(a.l, 'x', -2.9); R(a.r, 'z', grab ? 0.05 : 0.5); R(a.l, 'z', grab ? -0.05 : -0.5); R(P?.head, 'x', -0.3); lift(grab ? 0.25 : 0); } },
  pixel: { name: 'Level Clear', line: 'THANK YOU! BUT THE PRINCESS IS IN ANOTHER ARENA.', fx: ['confetti', 0x39ff6a, 0.2],
    pose: (R, P, a, t, lift) => { const hop = (t % 0.8) < 0.4; R(a.r, 'x', hop ? -3 : -2.2); R(P?.elbowR, 'x', hop ? 0 : 0.6); R(a.l, 'x', 0.3); R(a.l, 'z', -0.6); R(P?.elbowL, 'x', 1.4); lift(hop ? Math.sin((t % 0.8) / 0.4 * Math.PI) * 0.55 : 0); } },
  magnet: { name: 'Pulled It Off', line: 'Told you everything comes to me.', fx: ['zap', 0x7ab0ff, 0.4],
    pose: (R, P, a, t, lift) => { R(a.r, 'x', -2.4); R(a.r, 'z', 0.25); R(a.l, 'x', -0.4 + Math.sin(t * 6) * 0.1); R(P?.head, 'y', Math.sin(t * 1.5) * 0.25); lift(Math.abs(Math.sin(t * 2)) * 0.08); } },
  unicorn: { name: 'Happily Ever After', line: 'Wishes do come true! For me, anyway.', fx: ['confetti', 0xff8fd0, 0.3],
    pose: (R, P, a, t, lift) => { const hop = (t % 0.9) < 0.45; R(a.r, 'x', -2.6); R(a.l, 'x', -2.6); R(a.r, 'z', 0.4); R(a.l, 'z', -0.4); R(P?.head, 'z', Math.sin(t * 4) * 0.15); lift(hop ? Math.sin((t % 0.9) / 0.45 * Math.PI) * 0.25 : 0); } },
  owl: { name: 'Night Delivery', line: 'Signed, sealed, delivered. Hoo-hoo!', fx: ['confetti', 0xfff0d0, 0.25],
    pose: (R, P, a, t, lift) => { const f = Math.sin(t * 14); R(a.r, 'z', 1.3 + f * 0.5); R(a.l, 'z', -1.3 - f * 0.5); R(a.r, 'x', 0.2); R(a.l, 'x', 0.2); R(P?.elbowR, 'x', 0.2); R(P?.elbowL, 'x', 0.2); R(P?.head, 'y', Math.sin(t * 2) * 1.2); lift(0.5 + Math.sin(t * 3) * 0.2); } },
};
export const victoryOf = id => VICTORY[id] || null;

// Throw the hero's effect into the air every so often.
const tmp = new THREE.Vector3();
function fx(G, h, V, t, dt) {
  const [kind, col, every] = V.fx;
  h._vfxT = (h._vfxT ?? 0) - dt; if (h._vfxT > 0) return;
  h._vfxT = every;
  const top = tmp.set(h.pos.x, h.pos.y + 2.2, h.pos.z), r = () => (Math.random() - 0.5);
  if (kind === 'ring' || kind === 'beat' || kind === 'ding' || kind === 'heal') ring(G, tmp.set(h.pos.x, h.pos.y + 0.1, h.pos.z), col, kind === 'beat' ? 3 : kind === 'ding' ? 2.4 : 2);
  else if (kind === 'firework') { const c = [C.pink, C.gold, C.cyan][Math.floor(Math.random() * 3)]; burst(G, top.set(h.pos.x + r() * 4, h.pos.y + 4 + Math.random() * 2, h.pos.z + r() * 4), c, 1.6); }
  else if (kind === 'confetti') { burst(G, top.set(h.pos.x + r() * 2, h.pos.y + 3, h.pos.z + r() * 2), Math.random() < 0.5 ? col : C.gold, 0.8); }
  else if (kind === 'dirt' || kind === 'splash' || kind === 'dust') burst(G, tmp.set(h.pos.x + r(), h.pos.y + 0.3, h.pos.z + r()), col, 1);
  else burst(G, top.set(h.pos.x + r() * 1.6, h.pos.y + 1.6 + Math.random() * 1.4, h.pos.z + r() * 1.6), col, kind === 'zap' || kind === 'spark' ? 0.5 : 0.7);
  if (kind === 'ding' || kind === 'heal') burst(G, top, col, 0.6);
}

// Called every frame of the victory moment, after the idle animation and poseHero.
export function poseVictory(G, h, t, dt) {
  const V = VICTORY[h.def.id]; if (!V) return;
  const root = h.mesh, m = h.model, P = m.P, k = Math.min(1, t * 4);
  const R = (o, ax, v) => { if (o) o.rotation[ax] += (v - o.rotation[ax]) * k; };
  const lift = v => { root.position.y += v * k; };
  const spin = a => { root.rotation.y += a; };
  const squash = s => { root.scale.set(root.scale.x / Math.sqrt(s), root.scale.y * s, root.scale.z / Math.sqrt(s)); };
  V.pose(R, P, { r: P?.armR || m.arms[0], l: P?.armL }, t, lift, spin, squash);
  fx(G, h, V, t, dt);
}
