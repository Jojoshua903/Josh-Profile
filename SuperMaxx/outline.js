import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { cfg } from './settings.js?v=20261128e';

// Enemy outlines: a red rim on every enemy you can see, so they stand out from busy maps, and a
// see-through red silhouette for a moment after an enemy hits you (or you hit them), so you can
// tell where they went behind cover. Invisible enemies never get either.
// Each enemy hero gets two extra layers that share its geometry, so they follow every pose:
//   rim    drawn on top of the hero's own surface, bright only at the edges (a fresnel glow)
//   xray   drawn only where something is in front of the hero (depth test reversed)

const RIM = new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color(0xff3b3b) }, power: { value: 2.4 }, amp: { value: 0.85 } },
  vertexShader: `varying vec3 vN; varying vec3 vV;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 color; uniform float power; uniform float amp; varying vec3 vN; varying vec3 vV;
    void main() { float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), power); gl_FragColor = vec4(color, f * amp); }`,
  transparent: true, depthWrite: false, depthFunc: THREE.LessEqualDepth, blending: THREE.AdditiveBlending,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
});
const XRAY = new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.42, depthWrite: false, depthFunc: THREE.GreaterDepth });
const SEE = 3, SEEN_BY_ME = 2;                                       // seconds of see-through after they hit you / you hit them

function layers(h) {
  if (h._ol) return h._ol;
  const rim = [], xray = [];
  const meshes = [];
  h.mesh.traverse(o => { if (o.isMesh && o.geometry?.attributes?.normal && !o.userData.noOutline && o !== h.bar && !isBar(o, h)) meshes.push(o); });
  for (const m of meshes) {
    const r = new THREE.Mesh(m.geometry, RIM); r.renderOrder = 5; r.userData.noOutline = true; r.castShadow = false; r.raycast = () => {};
    const x = new THREE.Mesh(m.geometry, XRAY); x.renderOrder = 6; x.userData.noOutline = true; x.castShadow = false; x.raycast = () => {};
    m.add(r); m.add(x); rim.push(r); xray.push(x);
  }
  return (h._ol = { rim, xray, on: null, see: null });
}
// the health bar (and anything under it) belongs to the HUD, not the body
function isBar(o, h) { for (let p = o; p && p !== h.mesh; p = p.parent) if (p === h.bar) return true; return false; }
const show = (list, v) => { for (const m of list) m.visible = v; };

export function updateOutlines(G, P) {
  if (!G || !P) return;
  const on = cfg.outlines !== false;
  for (const h of G.heroes) {
    if (h === P || h.team === P.team || !h.mesh) { if (h._ol && h._ol.on) { show(h._ol.rim, false); show(h._ol.xray, false); h._ol.on = h._ol.see = false; } continue; }
    const vis = on && h.alive && h.mesh.visible && !(h.invisT > 0) && !h.benched;
    if (!vis && !h._ol) continue;
    const L = layers(h);
    const hitMe = P.hitLog?.get(h), hitThem = h.hitLog?.get(P);
    const see = vis && ((hitMe != null && G.time - hitMe < SEE) || (hitThem != null && G.time - hitThem < SEEN_BY_ME) || h.markT > 0);
    if (L.on !== vis) { show(L.rim, vis); L.on = vis; }
    if (L.see !== see) { show(L.xray, see); L.see = see; }
  }
}
