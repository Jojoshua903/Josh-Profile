import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { TEX } from './textures.js';
import { buildProps } from './props.js';
import { buildLandmarks } from './landmarks.js';
import { SHORE_GLSL, shoreS, height, buildTerrain } from './island.js';

// Sky dome, image-based lighting, shader ocean, sandy island, and a sun whose shadows follow the action.
export const SUN_DIR = new THREE.Vector3(0.62, 0.52, 0.42).normalize();
const SKY = { top: 0x2f8fdc, horizon: 0xbfe6f5, bottom: 0xe9dcb8, sun: 0xfff1d0 };

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(SKY.top) }, uHorizon: { value: new THREE.Color(SKY.horizon) }, uBottom: { value: new THREE.Color(SKY.bottom) },
      uSunDir: { value: SUN_DIR }, uSun: { value: new THREE.Color(SKY.sun) },
    },
    vertexShader: `varying vec3 vDir; void main(){ vec4 wp = modelMatrix*vec4(position,1.); vDir = wp.xyz - cameraPosition; gl_Position = projectionMatrix*viewMatrix*wp; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSun; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 col = mix(uHorizon, uTop, pow(smoothstep(0.0, 0.75, h), 0.65));
        col = mix(col, uBottom, smoothstep(0.0, -0.2, h));
        float s = max(dot(d, uSunDir), 0.0);
        col += uSun * (pow(s, 900.0) * 6.0 + pow(s, 60.0) * 0.5 + pow(s, 6.0) * 0.18);
        col = mix(col, uHorizon * 1.04, exp(-abs(h) * 14.0) * 0.55);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function waterMaterial(fog) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSunDir: { value: SUN_DIR }, uSun: { value: new THREE.Color(0xfff3dc) },
      uDeep: { value: new THREE.Color(0x0a6f9a) }, uShallow: { value: new THREE.Color(0x3fd6cf) }, uSky: { value: new THREE.Color(0xa8dcf2) },
      uFoam: { value: new THREE.Color(0xffffff) }, uFogColor: { value: fog.color }, uFogNear: { value: fog.near }, uFogFar: { value: fog.far },
    },
    vertexShader: `
      uniform float uTime; varying vec3 vWorld; varying vec3 vN; varying float vS;${SHORE_GLSL}
      float W(vec2 p, vec2 dir, float amp, float len, float spd, inout vec3 n){
        float k = 6.2831/len; float f = k*(dot(dir,p) - spd*uTime);
        float c = amp*k*cos(f); n.x -= dir.x*c; n.z -= dir.y*c; return amp*sin(f);
      }
      void main(){
        vec4 wp = modelMatrix*vec4(position,1.);
        vec3 n = vec3(0.,1.,0.);
        float sS = shoreS(wp.xz); vS = sS; float calm = smoothstep(0.0, 22.0, -sS);
        float y = W(wp.xz, normalize(vec2(1.,.35)), .16, 34., 3.2, n) + W(wp.xz, normalize(vec2(-.4,1.)), .10, 21., 2.6, n) + W(wp.xz, normalize(vec2(.7,-.6)), .06, 13., 2.1, n);
        wp.y += y*calm; n.xz *= calm;
        vWorld = wp.xyz; vN = normalize(n);
        gl_Position = projectionMatrix*viewMatrix*wp;
      }`,
    fragmentShader: `
      uniform float uTime, uFogNear, uFogFar; uniform vec3 uSunDir, uSun, uDeep, uShallow, uSky, uFoam, uFogColor;
      varying vec3 vWorld; varying vec3 vN; varying float vS;
      vec2 dn(vec2 p, vec2 dir, float len, float spd, float amp){ float k = 6.2831/len; float f = k*(dot(dir,p) - spd*uTime); return dir*amp*k*cos(f); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 p = vWorld.xz;
        vec2 g = dn(p, normalize(vec2(.9,.4)), 3.1, 1.3, .05) + dn(p, normalize(vec2(-.5,.8)), 2.3, 1.1, .04) + dn(p, normalize(vec2(.2,-1.)), 1.3, .9, .025) + dn(p, normalize(vec2(-.8,-.3)), .8, .7, .015);
        vec3 N = normalize(vN + vec3(-g.x, 0., -g.y));
        vec3 V = normalize(cameraPosition - vWorld);
        float sd = -vS;
        float shallow = 1. - smoothstep(0., 55., sd);
        vec3 base = mix(uDeep, uShallow, shallow*shallow);
        float fres = pow(1. - max(dot(N, V), 0.), 5.);
        vec3 col = mix(base, uSky, clamp(fres*0.85 + 0.08, 0., 1.));
        vec3 H = normalize(uSunDir + V);
        col += uSun * (pow(max(dot(N, H), 0.), 380.) * 5. + pow(max(dot(N, H), 0.), 40.) * 0.12);
        float n1 = vnoise(p*1.3 + uTime*0.25) * vnoise(p*0.6 - uTime*0.15);
        float shore = smoothstep(5.0, 0.4, sd);
        float waveLine = 0.5 + 0.5*sin(sd*2.2 + uTime*1.8);
        float foam = shore * smoothstep(0.25, 0.7, n1 + waveLine*0.45);
        foam += smoothstep(1.2, 0.1, sd) * 0.9;
        col = mix(col, uFoam, clamp(foam, 0., 1.) * 0.85);
        col += uFoam * smoothstep(0.82, 0.95, vnoise(p*0.35 + uTime*0.1)) * 0.06 * (1. - shallow);
        float fd = length(vWorld - cameraPosition);
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, fd));
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}


export function buildWorld(scene, renderer, quality) {
  const world = new THREE.Group(); scene.add(world);
  scene.fog = new THREE.Fog(SKY.horizon, 220, 1000);

  const skyMat = skyMaterial();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat); sky.renderOrder = -10; sky.frustumCulled = false;
  world.add(sky);

  // image-based lighting from the same sky, so glossy balls and pins reflect the island sky
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMaterial()));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({ color: 0xe9d3a0 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -6; envScene.add(ground);
  scene.environment = pm.fromScene(envScene, 0.03).texture;
  scene.environmentIntensity = 0.75;

  const hemi = new THREE.HemisphereLight(0xcfeaff, 0xf0d6a0, 0.85); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.high ? 2048 : 1024, quality.high ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 160 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(3600, 3600, 300, 300), waterMaterial(scene.fog));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.6; water.frustumCulled = false;
  world.add(water);
  world.add(buildTerrain());
  const props = buildProps(world);
  const landmarks = buildLandmarks(world);

  const focus = new THREE.Vector3();
  // same wave sum as the water vertex shader, so boats can ride the swell
  const WAVES = [[1, 0.35, 0.16, 34, 3.2], [-0.4, 1, 0.1, 21, 2.6], [0.7, -0.6, 0.06, 13, 2.1]].map(([x, z, a, l, s]) => { const n = Math.hypot(x, z); return [x / n, z / n, a, l, s]; });
  const waveHeight = (x, z, t) => {
    const calm = THREE.MathUtils.smoothstep(-shoreS(x, z), 0, 22);
    let y = 0; for (const [dx, dz, a, l, s] of WAVES) y += a * Math.sin((6.2831 / l) * (dx * x + dz * z - s * t));
    return y * calm;
  };
  return {
    sun, water, waveHeight, landY: height,
    update(dt, t, cam) {
      water.material.uniforms.uTime.value = t;
      // keep the shadow box centred a little in front of the viewer
      cam.getWorldDirection(focus); focus.y = 0; focus.normalize().multiplyScalar(12).add(cam.getWorldPosition(new THREE.Vector3())); focus.y = 0;
      sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(SUN_DIR, 80);
      props.update(dt, t); landmarks.update(dt, t);
    },
    setQuality(q) { renderer.shadowMap.enabled = q.high; sun.castShadow = q.high; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); },
  };
}
