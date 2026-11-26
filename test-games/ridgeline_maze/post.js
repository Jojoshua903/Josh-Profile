// Ridgeline post-processing: one HDR scene buffer, a small bloom, then a single composite pass per view that does
// height mist, exposure, ACES tone mapping, a gentle grade and a vignette. Subtle on purpose.
// Turn it off with ?nopost or Settings > Post effects. Any shader error switches it off by itself.
import { THREE, renderer, scene } from './world.js';

export const POST = { on: !/[?&]nopost\b/.test(location.search), bloom: true, broken: false,
  mist: { base: 0, fall: 2.5, max: .3, reach: 70 } }; // height mist: thickest at `base`, fades over `fall` metres up
try { if (localStorage.getItem('ridgeline_post') === '0') POST.on = false; } catch {}
export function setPost(v) { POST.on = !!v; try { localStorage.setItem('ridgeline_post', v ? '1' : '0'); } catch {} }
// a shader that fails to compile (old GPU, odd driver) turns post off instead of leaving a black screen
const prevErr = renderer.debug.onShaderError;
renderer.debug.onShaderError = (gl, program, vs, fs) => { POST.broken = true; console.warn('Ridgeline: post effects off (shader error)', gl.getProgramInfoLog(program)); prevErr?.(gl, program, vs, fs); };

let rt = null, bA = null, bB = null, W = 0, H = 0;
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new THREE.Scene();
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; quadScene.add(quad);
const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const mat = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, toneMapped: false });

// bloom: keep only the really bright bits (fires, flames, glowsticks, lightning), blur them small, add a little back
const bright = mat(`uniform sampler2D tSrc; varying vec2 vUv;
  void main() { vec3 c = texture2D(tSrc, vUv).rgb; float l = dot(c, vec3(.2126, .7152, .0722));
    float k = clamp((l - 1.5) / 1.2, 0.0, 1.0); gl_FragColor = vec4(c * k * k, 1.0); }`, { tSrc: { value: null } });
const blur = mat(`uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
  void main() { vec3 s = texture2D(tSrc, vUv).rgb * .227;
    s += (texture2D(tSrc, vUv + dir * 1.385).rgb + texture2D(tSrc, vUv - dir * 1.385).rgb) * .316;
    s += (texture2D(tSrc, vUv + dir * 3.231).rgb + texture2D(tSrc, vUv - dir * 3.231).rgb) * .070;
    gl_FragColor = vec4(s, 1.0); }`, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
const comp = mat(`
  uniform sampler2D tScene, tDepth, tBloom; uniform float exposure, bloomK, vig, mistMax, mistBase, mistFall, mistReach;
  uniform vec3 mistColor, camPos; uniform vec4 vp; uniform vec2 res; uniform mat4 projInv, camWorld;
  varying vec2 vUv;
  vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
  vec3 aces(vec3 c) { // same curve as three.js ACESFilmicToneMapping
    const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
    const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
    c *= exposure / 0.6; c = O * RRTAndODTFit(I * c); return clamp(c, 0.0, 1.0); }
  vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main() {
    vec2 uv = gl_FragCoord.xy / res; vec3 c = texture2D(tScene, uv).rgb;
    // height mist: rebuild where this pixel is in the world from the depth buffer
    float d = texture2D(tDepth, uv).x;
    if (d < 0.99999 && mistMax > 0.0) {
      vec2 ndc = (gl_FragCoord.xy - vp.xy) / vp.zw * 2.0 - 1.0;
      vec4 v = projInv * vec4(ndc, d * 2.0 - 1.0, 1.0); v /= v.w;
      vec3 wp = (camWorld * v).xyz; float dist = length(wp - camPos);
      float m = mistMax * (1.0 - exp(-dist / mistReach)) * exp(-max(wp.y - mistBase, 0.0) / mistFall);
      c = mix(c, mistColor, clamp(m, 0.0, 1.0));
    }
    c += texture2D(tBloom, uv).rgb * bloomK;
    c = aces(c);
    // grade: a touch more colour, cool shadows, warm highlights
    float l = dot(c, vec3(.2126, .7152, .0722));
    c = mix(vec3(l), c, 1.07);
    c += vec3(-.006, .0, .014) * (1.0 - l) + vec3(.012, .005, -.008) * l;
    c = toSRGB(clamp(c, 0.0, 1.0));
    c = mix(c, c * c * (3.0 - 2.0 * c), .1); // soft S-curve for contrast
    // vignette, per view
    vec2 q = (gl_FragCoord.xy - vp.xy) / vp.zw - .5; q.x *= vp.z / vp.w * .7;
    c *= 1.0 - vig * smoothstep(.35, .95, length(q) * 1.25);
    gl_FragColor = vec4(c, 1.0);
  }`, {
  tScene: { value: null }, tDepth: { value: null }, tBloom: { value: null }, exposure: { value: 1 }, bloomK: { value: .22 }, vig: { value: .2 },
  mistMax: { value: 0 }, mistBase: { value: 0 }, mistFall: { value: 2.5 }, mistReach: { value: 70 }, mistColor: { value: new THREE.Color() },
  camPos: { value: new THREE.Vector3() }, vp: { value: new THREE.Vector4() }, res: { value: new THREE.Vector2() },
  projInv: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() },
});

function ensure() {
  const s = renderer.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(1, s.x), h = Math.max(1, s.y);
  if (rt && w === W && h === H) return;
  W = w; H = h; rt?.depthTexture?.dispose(); rt?.dispose(); bA?.dispose(); bB?.dispose();
  rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(w, h) });
  const o = { type: THREE.HalfFloatType, depthBuffer: false };
  bA = new THREE.WebGLRenderTarget(Math.ceil(w / 4), Math.ceil(h / 4), o); bB = bA.clone();
}
const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); };
// HDR buffers need float colour targets: without them we stay on the plain path rather than show a black screen
const floatOK = renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
if (!floatOK) POST.broken = true;
export const postActive = () => POST.on && !POST.broken;

/**
 * Draw a set of views. views: [{ cam, x, y, w, h (CSS px), draw?: () => void }]. Each view's exposure is read from
 * renderer.toneMappingExposure right after its before() hook (the game sets fog and exposure there).
 * after(view) runs once the view is on screen (first-person hands, markers).
 */
export function renderViews(views, before, after) {
  if (!postActive()) { // the plain path: straight to the screen with three's own tone mapping
    renderer.setRenderTarget(null); renderer.setScissorTest(views.length > 1);
    views.forEach((v, i) => { renderer.setViewport(v.x, v.y, v.w, v.h); renderer.setScissor(v.x, v.y, v.w, v.h); before(v, i); renderer.render(scene, v.cam); after(v, i); });
    return;
  }
  ensure();
  const pr = renderer.getPixelRatio();
  rt.scissorTest = true;
  views.forEach((v, i) => {
    v.px = [Math.round(v.x * pr), Math.round(v.y * pr), Math.round(v.w * pr), Math.round(v.h * pr)];
    rt.viewport.set(...v.px); rt.scissor.set(...v.px);
    before(v, i); v.exposure = renderer.toneMappingExposure; v.fog = scene.fog.color.clone();
    renderer.setRenderTarget(rt); renderer.render(scene, v.cam);
  });
  rt.scissorTest = false;
  const U = comp.uniforms, bloomOn = POST.bloom;
  if (bloomOn) {
    bright.uniforms.tSrc.value = rt.texture; pass(bright, bA);
    blur.uniforms.tSrc.value = bA.texture; blur.uniforms.dir.value.set(1 / bA.width, 0); pass(blur, bB);
    blur.uniforms.tSrc.value = bB.texture; blur.uniforms.dir.value.set(0, 1 / bA.height); pass(blur, bA);
  }
  U.tScene.value = rt.texture; U.tDepth.value = rt.depthTexture; U.tBloom.value = bA.texture; U.bloomK.value = bloomOn ? .22 : 0;
  U.res.value.set(W, H); U.mistMax.value = POST.mist.max; U.mistBase.value = POST.mist.base; U.mistFall.value = POST.mist.fall; U.mistReach.value = POST.mist.reach;
  renderer.setRenderTarget(null); renderer.setScissorTest(true);
  views.forEach((v, i) => {
    renderer.setViewport(v.x, v.y, v.w, v.h); renderer.setScissor(v.x, v.y, v.w, v.h);
    U.vp.value.set(...v.px); U.exposure.value = v.exposure; U.mistColor.value.copy(v.fog);
    v.cam.updateMatrixWorld(); U.camPos.value.setFromMatrixPosition(v.cam.matrixWorld); U.camWorld.value.copy(v.cam.matrixWorld); U.projInv.value.copy(v.cam.projectionMatrixInverse);
    quad.material = comp; renderer.render(quadScene, quadCam);
    renderer.toneMappingExposure = v.exposure; after(v, i);
  });
  renderer.setScissorTest(false);
}
