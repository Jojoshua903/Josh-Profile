// ==========================================================
// shaderlib.js — shared GLSL helpers and the "hero" effect shaders:
//  • volumetric flashlight beam (drifting fog, dust glints, hot core)
//  • lens flare at the flashlight
//  • Poltergust vortex (spiral bands pulled toward the nozzle)
// All are single-pass, additive and cheap (no extra render targets).
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { FX_UNIFORMS } from './postfx.js';

// 3D value noise + 3-octave fbm, plus a tiny dither to hide banding
export const NOISE_GLSL = /* glsl */ `
  float nHash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(nHash(i), nHash(i + vec3(1, 0, 0)), f.x),
                   mix(nHash(i + vec3(0, 1, 0)), nHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(nHash(i + vec3(0, 0, 1)), nHash(i + vec3(1, 0, 1)), f.x),
                   mix(nHash(i + vec3(0, 1, 1)), nHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 3; i++) {
      s += a * vnoise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return s / 0.875;
  }
  float dither(vec2 frag) {
    return fract(sin(dot(frag, vec2(12.9898, 78.233))) * 43758.5453) / 255.0;
  }
`;

// ----------------------------------------------------------------
// Flashlight beam. The cone's apex sits at the lens and its axis runs
// along local +z, so vLocal.z is the distance travelled by the light.
export function makeBeamMaterial(color, length) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.12 },
      uBurst: { value: 0 },
      uLen: { value: length },
      uTime: FX_UNIFORMS.uTime,
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      varying vec3 vLocal;
      void main() {
        vUv = uv;
        vLocal = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = mv.xyz;
        vNormalV = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uBurst;
      uniform float uLen;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      varying vec3 vLocal;
      ${NOISE_GLSL}
      void main() {
        float d = clamp(vLocal.z / uLen, 0.0, 1.0);        // 0 at the lens, 1 at the far end
        vec3 viewDir = normalize(-vViewPos);
        // looking straight through the cone = more fog in the way
        float thick = pow(abs(dot(normalize(vNormalV), viewDir)), 1.4);
        // drifting fog: noise scrolls away from the lens and slowly churns
        vec3 q = vLocal * vec3(1.4, 1.4, 0.55) - vec3(0.0, uTime * 0.12, uTime * 0.9);
        float fog = fbm3(q);
        fog = mix(0.45, 1.25, smoothstep(0.25, 0.85, fog));
        // tiny dust glints caught in the light
        float glint = smoothstep(0.93, 0.995, vnoise(vLocal * 9.0 + vec3(0.0, uTime * 0.5, -uTime * 1.3)));
        float falloff = pow(1.0 - d, 1.7) * smoothstep(0.0, 0.05, d);
        float core = exp(-d * 6.0);                          // bright bloom right at the lens
        float a = uOpacity * falloff * thick * fog + glint * falloff * 0.22 + core * thick * (0.12 + uBurst * 0.5);
        vec3 col = mix(uColor, vec3(1.0, 0.97, 0.9), core * 0.7 + uBurst * 0.4);
        gl_FragColor = vec4(col * (0.7 + 0.8 * (1.0 - d)) + dither(gl_FragCoord.xy), a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

// ----------------------------------------------------------------
// Lens flare: a single screen-facing point with a glow, a soft ring and
// six thin rays that slowly turn. Strength follows the beam and strobe.
export function makeLensFlare(color) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uStrength: { value: 0 },
      uSize: { value: 260 },
      uTime: FX_UNIFORMS.uTime,
    },
    vertexShader: /* glsl */ `
      uniform float uSize;
      uniform float uStrength;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (0.6 + uStrength * 0.6) / max(1.0, -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      uniform float uTime;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float ang = atan(p.y, p.x) + uTime * 0.25;
        float glow = exp(-r * 7.0) * 1.6 + exp(-r * 2.6) * 0.25;
        float rays = pow(abs(cos(ang * 3.0)), 60.0) * (1.0 - r) * 0.8;
        float ring = smoothstep(0.06, 0.0, abs(r - 0.62)) * 0.12;
        float a = (glow + rays + ring) * uStrength * (1.0 - r);
        vec3 col = mix(uColor, vec3(1.0), exp(-r * 9.0));
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 7;
  return pts;
}

// ----------------------------------------------------------------
// Poltergust vortex: a unit cone (apex at the nozzle, base at z = 1,
// radius 1) scaled each frame to the suction range. Three spiral bands
// stream toward the nozzle.
export function makeVortex(color) {
  const geo = new THREE.ConeGeometry(1, 1, 36, 6, true);
  geo.translate(0, -0.5, 0);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: 0 },
      uSpeed: { value: 1 },
      uTime: FX_UNIFORMS.uTime,
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = mv.xyz;
        vNormalV = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uSpeed;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      ${NOISE_GLSL}
      void main() {
        float along = 1.0 - vUv.y;                        // 0 at the nozzle, 1 at the mouth
        float t = uTime * (8.0 + 6.0 * uSpeed);
        float phase = vUv.x * 6.2831853 * 3.0 + along * 13.0 + t;
        float band = smoothstep(0.35, 0.95, sin(phase) * 0.5 + 0.5);
        float wisp = vnoise(vec3(vUv.x * 18.0, along * 6.0 + t * 0.35, t * 0.1));
        float facing = abs(dot(normalize(vNormalV), normalize(-vViewPos)));
        float edge = smoothstep(0.05, 0.5, facing);
        float fade = smoothstep(1.0, 0.55, along) * smoothstep(0.0, 0.08, along);
        float a = uPower * fade * edge * (band * (0.35 + 0.65 * wisp) * 0.55 + 0.05);
        vec3 col = mix(uColor, vec3(1.0), (1.0 - along) * 0.6);
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.order = 'YXZ';
  m.renderOrder = 6;
  m.frustumCulled = false;
  m.visible = false;
  return m;
}

// soft round dot for point particles (instead of hard squares)
let dotTex = null;
export function softDot() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(c);
  dotTex.colorSpace = THREE.SRGBColorSpace;
  return dotTex;
}
