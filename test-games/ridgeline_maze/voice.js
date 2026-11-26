// Ridgeline proximity voice chat: WebRTC peer-to-peer audio, signalled through Firebase.
// Every pair of players gets one connection; the player with the smaller id makes the offer.
import { audioCtx, topAt, C } from './world.js';

const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const HEAR_FULL = 4, HEAR_MAX = 20; // metres; tiles are 6 m wide in the maze, 4 m at camp
let sig = null, local = null, enabled = false, muted = false, micAnalyser = null, micBuf = null;
const peers = new Map(), earlyIce = new Map(), failedAt = new Map();

const curve = (k) => { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); } return c; };
const CLEAN = curve(0), DIRTY = curve(45);

/** signaler: { myId, send(toId, msg) }. Resolves true if the mic is available. */
export async function startVoice(signaler) {
  sig = signaler; enabled = true;
  try {
    local = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const { ac } = audioCtx();
    if (ac) { micAnalyser = ac.createAnalyser(); micAnalyser.fftSize = 512; micBuf = new Uint8Array(micAnalyser.fftSize); ac.createMediaStreamSource(local).connect(micAnalyser); }
    return true;
  } catch (e) { console.warn('mic unavailable', e); local = null; return false; }
}
export function stopVoice() {
  enabled = false;
  for (const id of [...peers.keys()]) closePeer(id);
  local?.getTracks().forEach((t) => t.stop()); local = null; micAnalyser = null;
  earlyIce.clear(); failedAt.clear();
}
export const hasMic = () => !!local;
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; local?.getAudioTracks().forEach((t) => t.enabled = !muted); return muted; }
export function micLevel() {
  if (!micAnalyser || muted) return 0;
  micAnalyser.getByteTimeDomainData(micBuf); let s = 0;
  for (let i = 0; i < micBuf.length; i++) { const v = (micBuf[i] - 128) / 128; s += v * v; }
  return Math.min(1, Math.sqrt(s / micBuf.length) * 6);
}
export const peerCount = () => [...peers.values()].filter((p) => p.pc.connectionState === 'connected').length;

/** Call whenever the room's player list changes. */
export function syncPeers(ids) {
  if (!enabled) return;
  const now = Date.now();
  for (const id of ids) if (!peers.has(id) && sig.myId < id && now - (failedAt.get(id) || 0) > 5000) createPeer(id, true);
  for (const id of [...peers.keys()]) if (!ids.includes(id)) closePeer(id);
}

function createPeer(id, initiator) {
  const pc = new RTCPeerConnection({ iceServers: ICE });
  const peer = { id, pc, nodes: null, pending: [] };
  peers.set(id, peer);
  if (local) local.getTracks().forEach((t) => pc.addTrack(t, local)); else pc.addTransceiver('audio', { direction: 'recvonly' });
  pc.onicecandidate = (e) => { if (e.candidate) sig.send(id, { type: 'ice', c: JSON.stringify(e.candidate) }); };
  pc.ontrack = (e) => attach(peer, e.streams[0] || new MediaStream([e.track]));
  pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') { failedAt.set(id, Date.now()); closePeer(id); } };
  if (initiator) (async () => { const o = await pc.createOffer(); await pc.setLocalDescription(o); sig.send(id, { type: 'offer', sdp: o.sdp }); })().catch(console.warn);
  return peer;
}
function closePeer(id) {
  const p = peers.get(id); if (!p) return; peers.delete(id);
  try { p.pc.close(); } catch {}
  if (p.nodes) { try { p.nodes.src.disconnect(); p.nodes.gain.disconnect(); p.nodes.wet.disconnect(); } catch {} p.nodes.el.srcObject = null; }
}
async function flush(peer) {
  const list = peer.pending.concat(earlyIce.get(peer.id) || []); peer.pending = []; earlyIce.delete(peer.id);
  for (const c of list) { try { await peer.pc.addIceCandidate(c); } catch {} }
}
/** Feed every signalling message addressed to us in here. */
export async function onSignal(from, msg) {
  if (!enabled || !msg) return;
  let peer = peers.get(from);
  try {
    if (msg.type === 'offer') {
      if (peer) closePeer(from);
      peer = createPeer(from, false);
      await peer.pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
      const a = await peer.pc.createAnswer(); await peer.pc.setLocalDescription(a);
      sig.send(from, { type: 'answer', sdp: a.sdp }); await flush(peer);
    } else if (msg.type === 'answer' && peer) {
      await peer.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp }); await flush(peer);
    } else if (msg.type === 'ice') {
      const c = JSON.parse(msg.c);
      if (peer && peer.pc.remoteDescription) await peer.pc.addIceCandidate(c);
      else if (peer) peer.pending.push(c);
      else { if (!earlyIce.has(from)) earlyIce.set(from, []); earlyIce.get(from).push(c); }
    }
  } catch (e) { console.warn('signal', e); }
}

// remote voice -> distortion -> muffle -> 3D pan -> distance gain, with an echo send for the fog
function attach(peer, stream) {
  const { ac, master } = audioCtx(); if (!ac || peer.nodes) return;
  const el = new Audio(); el.srcObject = stream; el.muted = true; el.play().catch(() => {}); // Chrome only feeds WebAudio if an element plays the stream
  const src = ac.createMediaStreamSource(stream);
  const shaper = ac.createWaveShaper(); shaper.curve = CLEAN;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 16000;
  const pan = ac.createPanner(); pan.panningModel = 'HRTF'; pan.distanceModel = 'linear'; pan.rolloffFactor = 0;
  const gain = ac.createGain(); gain.gain.value = 0;
  const delay = ac.createDelay(1); delay.delayTime.value = .27;
  const fb = ac.createGain(); fb.gain.value = 0;
  const wet = ac.createGain(); wet.gain.value = 0;
  src.connect(shaper).connect(lp).connect(pan).connect(gain).connect(master);
  lp.connect(delay); delay.connect(fb).connect(delay); delay.connect(wet).connect(pan);
  peer.nodes = { el, src, shaper, lp, pan, gain, fb, wet, fogged: false };
}

// how many solid wall tiles sit on the straight line between two heads
function wallsBetween(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), steps = Math.ceil(d / .5);
  const ear = Math.min(a.y, b.y) + 1.6;
  let n = 0, lastTile = '';
  for (let s = 1; s < steps; s++) {
    const x = a.x + dx * s / steps, z = a.z + dz * s / steps, tile = Math.floor(x / C) + ',' + Math.floor(z / C);
    if (tile !== lastTile) { lastTile = tile; if (topAt(x, z) > ear) n++; }
  }
  return n;
}

/**
 * me: {x,y,z,yaw}; others: id -> {x,y,z}; inFog(x,z) -> bool.
 * Returns id -> 0..1 loudness so the HUD can show who you can hear.
 */
export function updateVoice(me, others, inFog) {
  const { ac } = audioCtx(); const heard = {};
  if (!ac || !enabled) return heard;
  const L = ac.listener, t = ac.currentTime;
  const fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw);
  if (L.positionX) {
    L.positionX.setTargetAtTime(me.x, t, .05); L.positionY.setTargetAtTime(me.y + 1.6, t, .05); L.positionZ.setTargetAtTime(me.z, t, .05);
    L.forwardX.setTargetAtTime(fx, t, .05); L.forwardY.setTargetAtTime(0, t, .05); L.forwardZ.setTargetAtTime(fz, t, .05);
    L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
  } else { L.setPosition(me.x, me.y + 1.6, me.z); L.setOrientation(fx, 0, fz, 0, 1, 0); }
  const meFog = inFog(me.x, me.z);
  for (const p of peers.values()) {
    const n = p.nodes; if (!n) continue;
    const o = others[p.id];
    if (!o) { n.gain.gain.setTargetAtTime(0, t, .1); continue; }
    const d = Math.hypot(o.x - me.x, (o.y || 0) - me.y, o.z - me.z);
    const walls = d < HEAR_MAX ? wallsBetween(me, o) : 9;
    let g = d <= HEAR_FULL ? 1 : d >= HEAR_MAX ? 0 : 1 - (d - HEAR_FULL) / (HEAR_MAX - HEAR_FULL);
    g *= [1, .6, .3][walls] ?? 0;
    let cut = [16000, 1800, 750][walls] ?? 400;
    const fogged = meFog || inFog(o.x, o.z);
    if (fogged !== n.fogged) { n.fogged = fogged; n.shaper.curve = fogged ? DIRTY : CLEAN; }
    if (fogged) cut = Math.min(cut, 2400);
    n.fb.gain.setTargetAtTime(fogged ? .5 : 0, t, .2); n.wet.gain.setTargetAtTime(fogged ? .65 : 0, t, .2);
    n.lp.frequency.setTargetAtTime(cut, t, .08);
    n.gain.gain.setTargetAtTime(g * (fogged ? .8 : 1), t, .08);
    if (n.pan.positionX) { n.pan.positionX.setTargetAtTime(o.x, t, .05); n.pan.positionY.setTargetAtTime((o.y || 0) + 1.5, t, .05); n.pan.positionZ.setTargetAtTime(o.z, t, .05); }
    else n.pan.setPosition(o.x, (o.y || 0) + 1.5, o.z);
    heard[p.id] = g;
  }
  return heard;
}
