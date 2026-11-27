import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { cfg, save } from './settings.js?v=20261128e';
import { emoteOwned } from './slots.js?v=20261128e';

// Emotes: a short upper-body animation with an emoji bubble over the hero's head. The legs keep
// walking, so heroes can emote on the move; firing or casting cancels your own. Poses blend in
// and out over the current pose, so they work on top of any animation.
// Four are free; the rest are won from the slot machine (slots.js) and picked for the wheel.

export const EMOTES = [
  { id: 'wave', icon: '👋', name: 'Wave', dur: 2, free: true, color: 0x7ac8ff },
  { id: 'thumbs', icon: '👍', name: 'Nice one', dur: 1.8, free: true, color: 0x9be37a },
  { id: 'laugh', icon: '😂', name: 'Laugh', dur: 2.2, free: true, color: 0xffd23c },
  { id: 'line', icon: '💬', name: 'Hero line', dur: 2.4, free: true, color: 0xc8c0b0 },
  { id: 'cheer', icon: '🎉', name: 'Cheer', dur: 2, color: 0xff8fd0 },
  { id: 'dance', icon: '🕺', name: 'Dance', dur: 3.2, color: 0x9b5cff },
  { id: 'taunt', icon: '😤', name: 'Come at me', dur: 2.2, color: 0xff5a36 },
  { id: 'bow', icon: '🙇', name: 'Bow', dur: 2, color: 0xe8c56a },
  { id: 'clap', icon: '👏', name: 'Slow clap', dur: 2.4, color: 0xffb36b },
  { id: 'flex', icon: '💪', name: 'Flex', dur: 2.2, color: 0xff7a5c },
  { id: 'facepalm', icon: '🤦', name: 'Facepalm', dur: 2.2, color: 0x8ab4ff },
  { id: 'nap', icon: '😴', name: 'Nap time', dur: 3, color: 0x6a7ad8 },
  { id: 'kiss', icon: '😘', name: 'Blow a kiss', dur: 2, color: 0xff6b9a },
  { id: 'drums', icon: '🥁', name: 'Air drums', dur: 2.6, color: 0x3ccf9a },
];
export const WHEEL_SIZE = 8;
export const EMOTE_CD = 2.5;
export const emoteById = id => EMOTES.find(e => e.id === id);

// ---------- your wheel: up to eight emotes you own ----------
export function wheelEmotes() {
  let ids = Array.isArray(cfg.emoteWheel) ? cfg.emoteWheel.filter(id => emoteById(id) && emoteOwned(id)) : [];
  if (!ids.length) ids = EMOTES.filter(e => emoteOwned(e.id)).map(e => e.id);
  return ids.slice(0, WHEEL_SIZE).map(emoteById);
}
export const onWheel = id => wheelEmotes().some(e => e.id === id);
// returns 'on', 'off', 'full' (wheel already has eight) or 'last' (keep at least one)
export function toggleWheel(id) {
  let ids = wheelEmotes().map(e => e.id);
  if (ids.includes(id)) { if (ids.length <= 1) return 'last'; ids = ids.filter(x => x !== id); }
  else { if (ids.length >= WHEEL_SIZE) return 'full'; ids.push(id); }
  cfg.emoteWheel = ids; save();
  return ids.includes(id) ? 'on' : 'off';
}

const bubbleTex = {};
function bubble(e) {
  if (!bubbleTex[e.id]) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.strokeStyle = '#1d2340'; g.lineWidth = 6;
    g.beginPath(); g.arc(64, 56, 46, 0, Math.PI * 2); g.moveTo(52, 98); g.lineTo(64, 122); g.lineTo(76, 98); g.closePath();
    g.fill(); g.stroke();
    g.beginPath(); g.arc(64, 56, 43, 0, Math.PI * 2); g.fill();                  // covers the tail's seam
    g.font = '58px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(e.icon, 64, 60);
    bubbleTex[e.id] = new THREE.CanvasTexture(cv);
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex[e.id], transparent: true, depthTest: false }));
  sp.renderOrder = 11;
  return sp;
}

export function startEmote(G, h, id) {
  const e = emoteById(id);
  if (!e || !h.alive) return false;
  stopEmote(G, h);
  const sp = bubble(e); G.scene.add(sp);
  h.emote = { id, t: 0, dur: e.dur, sp, yaw0: h.yaw };
  G.ev.emote?.(h, e);
  return true;
}
export function stopEmote(G, h) {
  if (!h.emote) return;
  G.scene.remove(h.emote.sp); h.emote.sp.material.dispose();
  h.emote = null;
}
export const emoting = h => !!h.emote;

// Called at the end of poseHero, so it lays over walking, aiming and casting.
export function poseEmote(G, h, dt) {
  const em = h.emote; if (!em) return;
  if (!h.alive) { stopEmote(G, h); return; }
  em.t += dt;
  if (em.t >= em.dur) { stopEmote(G, h); return; }
  const t = em.t, k = Math.min(1, t * 6, (em.dur - t) * 6);
  const root = h.mesh, m = h.model, P = m.P;
  const R = (o, ax, v) => { if (o) o.rotation[ax] += (v - o.rotation[ax]) * k; };
  const lift = v => { root.position.y += v * k; };
  // the old block models only have one arm: it takes the right arm's part
  const armR = P?.armR || m.arms[0], armL = P?.armL;
  switch (em.id) {
    case 'wave':
      R(armL, 'x', -2.7); R(armL, 'z', -0.45 + Math.sin(t * 12) * 0.35); R(P?.elbowL, 'x', 0.25);
      if (!armL) { R(armR, 'x', -2.7); R(armR, 'z', 0.45 + Math.sin(t * 12) * 0.35); }
      R(P?.head, 'y', 0.25); break;
    case 'cheer':
      R(armL, 'x', -2.9); R(armL, 'z', -0.35); R(armR, 'x', -2.9); R(armR, 'z', 0.35);
      R(P?.elbowL, 'x', 0.1); R(P?.elbowR, 'x', 0.1);
      lift(Math.abs(Math.sin(t * 7)) * 0.4); break;
    case 'dance': {
      const s = Math.sin(t * 8);
      R(armR, 'x', -2.2 + s * 0.7); R(armL, 'x', -2.2 - s * 0.7); R(armR, 'z', 0.3); R(armL, 'z', -0.3);
      R(P?.elbowR, 'x', 0.6); R(P?.elbowL, 'x', 0.6);
      R(P?.hips, 'z', s * 0.16); R(P?.head, 'y', -s * 0.3);
      root.rotation.y += Math.sin(t * 3) * 0.6 * k;
      lift(Math.abs(Math.cos(t * 8)) * 0.14); break;
    }
    case 'laugh':
      R(P?.spine, 'x', -0.35 + Math.sin(t * 30) * 0.05); R(P?.head, 'x', -0.3);
      R(armR, 'x', 0.5); R(armL, 'x', 0.5); R(P?.elbowR, 'x', 1.5); R(P?.elbowL, 'x', 1.5);
      lift(Math.abs(Math.sin(t * 15)) * 0.05); break;
    case 'thumbs':
      R(armL || armR, 'x', 1.3); R(armL || armR, 'z', 0); R(P?.elbowL, 'x', 1.1);
      R(P?.head, 'x', Math.sin(t * 6) * 0.15); break;
    case 'taunt': {
      const b = (Math.sin(t * 9) + 1) / 2;
      R(armR, 'x', 1.2); R(armL, 'x', 1.2); R(armR, 'z', 0.25); R(armL, 'z', -0.25);
      R(P?.elbowR, 'x', 0.3 + b * 1.3); R(P?.elbowL, 'x', 0.3 + b * 1.3);
      R(P?.spine, 'x', 0.12); R(P?.head, 'x', -0.12); break;
    }
    case 'bow': {
      const d = Math.sin(Math.min(1, t / (em.dur * 0.85)) * Math.PI);
      R(P?.spine, 'x', d * 0.95); R(P?.head, 'x', d * 0.3);
      R(armL, 'x', 0.1 + d * 0.6); R(P?.elbowL, 'x', 1.3); R(armR, 'x', 0.2); R(armR, 'z', 0.4);
      if (!P) root.rotation.x += d * 0.5 * k; break;
    }
    case 'clap': {
      const c = (Math.sin(t * (t > 1.2 ? 14 : 7)) + 1) / 2;                          // slow, then faster
      R(armR, 'x', 1.25); R(armL, 'x', 1.25); R(armR, 'z', -0.15 - c * 0.35); R(armL, 'z', 0.15 + c * 0.35);
      R(P?.elbowR, 'x', 0.7); R(P?.elbowL, 'x', 0.7); R(P?.head, 'x', -0.08); break;
    }
    case 'flex': {
      const p = (Math.sin(t * 6) + 1) / 2;
      R(armR, 'x', -1.3); R(armL, 'x', -1.3); R(armR, 'z', 1.1); R(armL, 'z', -1.1);
      R(P?.elbowR, 'x', 1.6 + p * 0.5); R(P?.elbowL, 'x', 1.6 + p * 0.5);
      R(P?.spine, 'x', -0.12); R(P?.head, 'x', -0.2); lift(p * 0.05); break;
    }
    case 'facepalm':
      R(armL || armR, 'x', 2.3); R(armL || armR, 'z', 0.15); R(P?.elbowL, 'x', 2.1);
      R(P?.head, 'x', 0.35 + Math.sin(t * 3) * 0.05); R(P?.spine, 'x', 0.15); break;
    case 'nap':
      R(P?.head, 'x', 0.55); R(P?.head, 'y', 0.25); R(P?.spine, 'x', 0.2 + Math.sin(t * 2) * 0.04);
      R(armR, 'x', 0.15); R(armL, 'x', 0.15); R(P?.elbowR, 'x', 0.2); R(P?.elbowL, 'x', 0.2);
      lift(-0.06 + Math.sin(t * 2) * 0.03); break;
    case 'kiss': {
      const fling = t > 0.8;                                                             // hand to the mouth, then out
      R(armL || armR, 'x', fling ? 1.5 : 1.7); R(armL || armR, 'z', fling ? -0.5 : 0.2); R(P?.elbowL, 'x', fling ? 0.2 : 2.3);
      R(P?.head, 'y', fling ? -0.2 : 0); R(P?.head, 'x', fling ? -0.1 : 0.1); break;
    }
    case 'drums': {
      const s = Math.sin(t * 18);
      R(armR, 'x', 1 + s * 0.4); R(armL, 'x', 1 - s * 0.4); R(armR, 'z', 0.3); R(armL, 'z', -0.3);
      R(P?.elbowR, 'x', 1 + s * 0.5); R(P?.elbowL, 'x', 1 - s * 0.5);
      R(P?.head, 'x', Math.abs(Math.sin(t * 9)) * 0.25); lift(Math.abs(Math.sin(t * 9)) * 0.04); break;
    }
    case 'line':
      R(armL, 'x', 0.9 + Math.sin(t * 5) * 0.5); R(armL, 'z', -0.5); R(P?.elbowL, 'x', 0.8);
      R(P?.head, 'y', Math.sin(t * 2.5) * 0.2); R(P?.head, 'x', -0.1); break;
  }
  // bubble pops up, bobs, and shrinks away at the end
  const pop = Math.min(1, t * 5), out = Math.min(1, (em.dur - t) * 4);
  const sc = 0.95 * (0.6 + 0.4 * pop) * out * (h.megaT > 0 ? 1.6 : 1);
  em.sp.scale.set(sc, sc, 1);
  em.sp.position.set(h.pos.x, root.position.y + 2.9 * root.scale.y + Math.sin(t * 4) * 0.06, h.pos.z);
  em.sp.visible = root.visible;
}

// What bots pick from when they celebrate a kill.
export const BOT_EMOTES = ['cheer', 'dance', 'laugh', 'taunt', 'thumbs', 'bow', 'line', 'clap', 'flex', 'kiss', 'drums'];

// A round emoji badge for menus (the prize board and the win screen).
const badges = {};
export function emoteBadge(e) {
  if (badges[e.id]) return badges[e.id];
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#' + e.color.toString(16).padStart(6, '0'); g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  g.font = '72px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(e.icon, 64, 70);
  return (badges[e.id] = cv.toDataURL());
}
