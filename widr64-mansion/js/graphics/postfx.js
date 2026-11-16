// ==========================================================
// postfx.js — hand-rolled post-processing (no add-ons needed):
// the scene renders into an HDR multisampled target, bright parts
// bloom through a dual-filter blur chain, and a final pass does
// ACES tone mapping, spooky colour grading, lens vignette, edge
// chromatic aberration, film grain and dithering.
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// shared clock for world shaders (ghost shimmer, dust motes)
export const FX_UNIFORMS = { uTime: { value: 0 } };

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// soft-knee threshold, 4 taps so single bright pixels don't flicker
const BRIGHT = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uKnee;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tMap, vUv + uTexel * vec2(-0.5, -0.5)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(0.5, -0.5)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(-0.5, 0.5)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(0.5, 0.5)).rgb;
  c *= 0.25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  float k = max(soft, br - uThreshold) / max(br, 1e-4);
  gl_FragColor = vec4(min(c * k, vec3(16.0)), 1.0);
}`;

// dual-filter (Kawase) downsample
const DOWN = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec4 s = texture2D(tMap, vUv) * 4.0;
  s += texture2D(tMap, vUv - uTexel);
  s += texture2D(tMap, vUv + uTexel);
  s += texture2D(tMap, vUv + vec2(uTexel.x, -uTexel.y));
  s += texture2D(tMap, vUv - vec2(uTexel.x, -uTexel.y));
  gl_FragColor = s * 0.125;
}`;

// dual-filter upsample, adding the sharper level on the way up
const UP = /* glsl */ `
uniform sampler2D tLow;
uniform sampler2D tHigh;
uniform vec2 uTexel;
uniform float uMix;
varying vec2 vUv;
void main() {
  vec2 t = uTexel;
  vec4 s = texture2D(tLow, vUv + vec2(-t.x * 2.0, 0.0));
  s += texture2D(tLow, vUv + vec2(-t.x, t.y)) * 2.0;
  s += texture2D(tLow, vUv + vec2(0.0, t.y * 2.0));
  s += texture2D(tLow, vUv + vec2(t.x, t.y)) * 2.0;
  s += texture2D(tLow, vUv + vec2(t.x * 2.0, 0.0));
  s += texture2D(tLow, vUv + vec2(t.x, -t.y)) * 2.0;
  s += texture2D(tLow, vUv + vec2(0.0, -t.y * 2.0));
  s += texture2D(tLow, vUv + vec2(-t.x, -t.y)) * 2.0;
  gl_FragColor = s / 12.0 + texture2D(tHigh, vUv) * uMix;
}`;

const COMPOSITE = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloomOn;
uniform float uBloom;
uniform float uExposure;
uniform float uVignette;
uniform float uGrain;
uniform float uAberration;
uniform float uSaturation;
uniform float uContrast;
uniform float uTime;
uniform vec3 uShadowTint;
uniform vec3 uHighTint;
uniform vec2 uRes;
varying vec2 vUv;

// three.js' ACES Filmic, so the look matches the plain renderer
vec3 RRTAndODTFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 acesFilmic(vec3 color) {
  const mat3 ACESInputMat = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 ACESOutputMat = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color *= uExposure / 0.6;
  color = ACESInputMat * color;
  color = RRTAndODTFit(color);
  color = ACESOutputMat * color;
  return clamp(color, 0.0, 1.0);
}
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 d = vUv - 0.5;
  float r2 = dot(d, d);
  // lens fringe: red and blue drift apart toward the screen edges
  vec2 off = d * uAberration * (0.4 + r2 * 5.0);
  vec3 col;
  col.r = texture2D(tScene, vUv - off).r;
  col.g = texture2D(tScene, vUv).g;
  col.b = texture2D(tScene, vUv + off).b;
  col += texture2D(tBloom, vUv).rgb * uBloom * uBloomOn;

  col = acesFilmic(col);

  // grade: moonlit blue in the shadows, candle-warm highlights
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col += uShadowTint * (1.0 - smoothstep(0.0, 0.25, l));
  col *= mix(vec3(1.0), uHighTint, smoothstep(0.35, 0.95, l));
  col = mix(vec3(l), col, uSaturation);

  col = toSRGB(clamp(col, 0.0, 1.0));
  col = (col - 0.5) * uContrast + 0.5;

  // vignette (oval, follows the screen shape)
  vec2 vd = d * vec2(uRes.x / uRes.y, 1.0) * 0.85;
  col *= 1.0 - uVignette * smoothstep(0.18, 0.75, dot(vd, vd) * 1.6);

  // film grain, stronger in the dark; plus dithering against banding
  float n = hash(vUv * uRes + fract(uTime * 7.31) * 91.7) - 0.5;
  col += n * uGrain * (1.0 - l * 0.7);
  col += (hash(vUv * uRes + 17.0) - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.quality = 'high';
    // HDR targets need float colour buffers; without them, render straight to screen
    const ext = renderer.extensions;
    this.supported = !!(ext && (ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float')));
    this.enabled = this.supported;
    this.levels = 5;
    this.width = 1;
    this.height = 1;
    // live tweaks from gameplay (flash surge, getting hurt)
    this.punch = 0;
    this.hurt = 0;

    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
    const opts = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.down = [];
    this.up = [];
    for (let i = 0; i < this.levels; i++) {
      this.down.push(new THREE.WebGLRenderTarget(1, 1, opts));
      this.up.push(new THREE.WebGLRenderTarget(1, 1, opts));
    }

    const mat = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.brightMat = mat(BRIGHT, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 0.9 }, uKnee: { value: 0.45 } });
    this.downMat = mat(DOWN, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.upMat = mat(UP, { tLow: { value: null }, tHigh: { value: null }, uTexel: { value: new THREE.Vector2() }, uMix: { value: 0.85 } });
    this.compMat = mat(COMPOSITE, {
      tScene: { value: this.sceneRT.texture }, tBloom: { value: null }, uBloomOn: { value: 1 },
      uBloom: { value: 0.32 }, uExposure: { value: 1 }, uVignette: { value: 0.42 }, uGrain: { value: 0.045 },
      uAberration: { value: 0.0022 }, uSaturation: { value: 1.08 }, uContrast: { value: 1.05 }, uTime: FX_UNIFORMS.uTime,
      uShadowTint: { value: new THREE.Vector3(0.006, 0.012, 0.03) }, uHighTint: { value: new THREE.Vector3(1.04, 1.0, 0.92) },
      uRes: { value: new THREE.Vector2(1, 1) },
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compMat);
    this.quad.frustumCulled = false;
    this.fsScene = new THREE.Scene();
    this.fsScene.add(this.quad);
    this.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  // 'high' = bloom + all lens effects; 'low' = straight to screen
  setQuality(q) {
    this.quality = q === 'low' ? 'low' : 'high';
    this.enabled = this.quality === 'high' && this.supported;
  }

  setSize(w, h, pixelRatio) {
    const W = Math.max(1, Math.floor(w * pixelRatio));
    const H = Math.max(1, Math.floor(h * pixelRatio));
    this.width = W;
    this.height = H;
    // high-density screens already look smooth: 2x MSAA there, 4x otherwise
    const samples = pixelRatio >= 1.4 ? 2 : 4;
    if (this.sceneRT.samples !== samples) {
      this.sceneRT.samples = samples;
      this.sceneRT.dispose();
    }
    this.sceneRT.setSize(W, H);
    let bw = Math.max(1, W >> 1);
    let bh = Math.max(1, H >> 1);
    for (let i = 0; i < this.levels; i++) {
      this.down[i].setSize(bw, bh);
      this.up[i].setSize(bw, bh);
      bw = Math.max(1, bw >> 1);
      bh = Math.max(1, bh >> 1);
    }
    this.compMat.uniforms.uRes.value.set(W, H);
  }

  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.fsScene, this.fsCam);
  }

  update(dt) {
    this.punch = Math.max(0, this.punch - dt * 2.5);
    this.hurt = Math.max(0, this.hurt - dt * 2);
  }

  render(scene, camera) {
    const r = this.renderer;
    if (!this.enabled) {
      r.setRenderTarget(null);
      r.render(scene, camera);
      return;
    }
    r.setRenderTarget(this.sceneRT);
    r.render(scene, camera);

    // bloom chain at half resolution
    const B = this.brightMat.uniforms;
    B.tMap.value = this.sceneRT.texture;
    B.uTexel.value.set(1 / this.width, 1 / this.height);
    this.pass(this.brightMat, this.down[0]);
    const D = this.downMat.uniforms;
    for (let i = 1; i < this.levels; i++) {
      const src = this.down[i - 1];
      D.tMap.value = src.texture;
      D.uTexel.value.set(1 / src.width, 1 / src.height);
      this.pass(this.downMat, this.down[i]);
    }
    const U = this.upMat.uniforms;
    let low = this.down[this.levels - 1];
    for (let i = this.levels - 2; i >= 0; i--) {
      U.tLow.value = low.texture;
      U.tHigh.value = this.down[i].texture;
      U.uTexel.value.set(1 / low.width, 1 / low.height);
      this.pass(this.upMat, this.up[i]);
      low = this.up[i];
    }

    const C = this.compMat.uniforms;
    C.tBloom.value = this.up[0].texture;
    C.uExposure.value = r.toneMappingExposure;
    C.uBloom.value = 0.32 + this.punch * 0.9;
    C.uAberration.value = 0.0022 + this.hurt * 0.012;
    this.pass(this.compMat, null);
  }

  dispose() {
    this.sceneRT.dispose();
    this.down.forEach((t) => t.dispose());
    this.up.forEach((t) => t.dispose());
  }
}
