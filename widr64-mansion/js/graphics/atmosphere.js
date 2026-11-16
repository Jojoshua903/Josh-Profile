// ==========================================================
// atmosphere.js — drifting dust motes around the hero. They're barely
// visible in the dark and light up like snow inside the flashlight beam,
// which gives the beam a soft volumetric look.
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { FX_UNIFORMS } from './postfx.js';

const VERT = /* glsl */ `
uniform float uTime;
uniform vec3 uCenter;
uniform vec3 uBox;
uniform vec3 uLightPos;
uniform vec3 uLightDir;
uniform float uLightOn;
uniform float uScale;
attribute float aSeed;
varying float vAlpha;
void main() {
  vec3 p = position + vec3(
    sin(uTime * 0.31 + aSeed * 6.283) * 0.45,
    uTime * 0.06 * (0.4 + aSeed),
    cos(uTime * 0.23 + aSeed * 12.1) * 0.45);
  // wrap the cloud around the hero so it never runs out
  p = uCenter + mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5;
  vec3 toP = p - uLightPos;
  float d = max(length(toP), 1e-3);
  float cone = smoothstep(0.84, 0.96, dot(toP / d, uLightDir)) * (1.0 - smoothstep(3.5, 9.5, d)) * uLightOn;
  float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + aSeed * 40.0);
  vAlpha = (0.05 + cone * 0.95) * twinkle;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uScale * (0.5 + aSeed * 0.8) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
varying float vAlpha;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, r) * vAlpha;
  gl_FragColor = vec4(vec3(1.0, 0.95, 0.82) * a * 1.4, a);
}`;

export class DustMotes {
  constructor(scene, count = 700) {
    const box = new THREE.Vector3(18, 5, 14);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * box.x;
      pos[i * 3 + 1] = 0.2 + Math.random() * box.y;
      pos[i * 3 + 2] = (Math.random() - 0.5) * box.z;
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.uniforms = {
      uTime: FX_UNIFORMS.uTime, uCenter: { value: new THREE.Vector3() }, uBox: { value: box },
      uLightPos: { value: new THREE.Vector3() }, uLightDir: { value: new THREE.Vector3(0, 0, -1) },
      uLightOn: { value: 0 }, uScale: { value: 60 },
    };
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }

  update(player, pixelRatio, viewHeight) {
    const U = this.uniforms;
    U.uCenter.value.set(player.pos.x, 2.6, player.pos.z);
    U.uLightPos.value.set(player.pos.x, 1.15, player.pos.z);
    U.uLightDir.value.set(player.facingDir.x, -0.22, player.facingDir.z).normalize();
    const on = player.lightOn && !player.latched ? 1 : 0;
    U.uLightOn.value += (on - U.uLightOn.value) * 0.2;
    U.uScale.value = 0.09 * pixelRatio * viewHeight;
  }
}
