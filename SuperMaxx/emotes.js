import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// Emotes: a short upper-body animation with an emoji bubble over the hero's head. The legs keep
// walking, so bots can emote on the move; the player's own emote cancels as soon as they move
// or fire. Poses blend in and out over the current pose, so they work on top of any animation.

export const EMOTES = [
  { id: 'wave', icon: '👋', name: 'Wave', dur: 2 },
  { id: 'cheer', icon: '🎉', name: 'Cheer', dur: 2 },
  { id: 'dance', icon: '🕺', name: 'Dance', dur: 3.2 },
  { id: 'laugh', icon: '😂', name: 'Laugh', dur: 2.2 },
  { id: 'thumbs', icon: '👍', name: 'Nice one', dur: 1.8 },
  { id: 'taunt', icon: '😤', name: 'Come at me', dur: 2.2 },
  { id: 'bow', icon: '🙇', name: 'Bow', dur: 2 },
  { id: 'line', icon: '💬', name: 'Hero line', dur: 2.4 },
];
export const EMOTE_CD = 2.5;
export const emoteById = id => EMOTES.find(e => e.id === id);

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
export const BOT_EMOTES = ['cheer', 'dance', 'laugh', 'taunt', 'thumbs', 'bow', 'line'];
