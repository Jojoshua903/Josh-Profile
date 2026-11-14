import { THREE, V3, mk, basic } from './worlds-common.js?v=20261114d';
import { buildLocal } from './models.js?v=20261114d';
import { G, camera, toast, puff } from './core.js?v=20261114d';
import { sfx } from './audio.js?v=20261114d';
import { P } from './player.js?v=20261114d';
import { buildPark } from './world-park.js?v=20261114d';

// ZWEEFRIJK: an anti-gravity parkour planet, and a very trippy one.
//   - floaty gravity everywhere: every jump is a big slow float
//   - anti-gravity beams carry you straight up to the next part of the course
//   - every so often a GRAVITY WAVE flips gravity for a moment and everything (you too) floats up
//   - the sky, the dome and the floating shapes keep changing colour, and the view gently breathes
// A side planet: it opens once you reach Stuiterstad, and it is not on the story route.
export function buildZweef(ctx) {
  // after Maankrater (story step 12) and before the finale, Ratjetoe is off with the cats, so Rênas reads the signal himself
  const s = G.save && G.save(), ratGone = !!s && s.unlocked > 12 && !s.finale;
  return buildPark(ctx, {
    id: 'zweef', index: 16, shape: 'spiral', title: 'Zweefrijk', sub: 'An anti-gravity planet. Up is down, down is up… probably.',
    host: 'Lumi', who: 'LUMI', grav: 0.42,
    model: () => buildLocal({ s: 0.85, skin: 0xe8c0a0, shirt: 0xb07aff, pants: 0x5ef2e0, hair: 0xff7ad8 }),
    // Lumi floats upside down above the start, slowly turning
    hostAnim: (dt, t, n) => { n.model.r.rotation.z = Math.PI + Math.sin(t * 0.8) * 0.3; n.model.r.position.y = 2.6 + Math.sin(t * 1.6) * 0.3; n.model.r.rotation.y = t * 0.6; },
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#4a1a6a 0%,#1a0a3a 55%,#06020e 100%)', lights: [0xf0e0ff, 0x4a2a6a],
      dome: [0xb07aff, 0x5ef2e0, 0x2a1a4a, 0xff7ad8], gems: [0xff7ad8, 0x5ef2e0, 0xffe27a], core: 0x1a0a2e, glow: 0xb07aff,
      plat: 0x8a6aff, platTop: 0xf0e8ff, alt: 0x5ef2e0, crumble: 0xa898c8, bounce: 0xff7ad8, puff: 0xc8a8ff, cpTop: 0x5ef2e0, finTop: 0xffd23a, signFg: '#ff7ad8', signBg: '#1a0a2e', beacon: [0x1a0a2e, 0xb07aff],
    },
    route: [['hop', 2], ['bob', 2], ['lift'], ['cp'], ['circle', 2], ['secret', 'zweef-r1', 'Where the wave takes you'], ['hop', 2], ['down', 2], ['zig', 2], ['cp'],
      ['lift'], ['bob', 3], ['secret', 'zweef-r2', 'Above the beam'], ['crumble', 2], ['cp'], ['down', 3], ['circle', 2], ['lift'], ['secret', 'zweef-r3', 'Floating at the top'], ['hop', 2]],
    intro: [
      ratGone ? ['RÊNAS', 'Strange signal. A planet where gravity goes the wrong way… Ratjetoe would know what that means. Hmpf. I’ll find out myself.']
        : ['RATJETOE', 'Strange signal. A planet where gravity… goes the wrong way. Name: Zweefrijk. It is not on our route. I am curious anyway. My whiskers are tingling.'],
      ['RÊNAS', 'Whoa. Whoa! Why is everything purple? And why is that kid upside down?'],
      ['LUMI', 'Heyyy, a visitor! I’m Lumi. Gravity is very relaxed here. It’s weak, so you float. Jump and enjoy the ride.'],
      ['LUMI', 'See the glowing beams? Step in and you float straight up. Steer onto the platform at the top.'],
      ['LUMI', 'Oh, and sometimes a GRAVITY WAVE rolls past. Then gravity flips and everything floats up. Don’t panic. It always comes back down. Usually.'],
      ['RÊNAS', 'Usually?!'],
    ],
    tips: [['LUMI', 'Beams: float up, steer at the top. Waves: just float, it comes back down. Colours: that’s normal here. I think.']],
    bubbles: ['Wheee!', '*floats by*', 'Up is down!', 'Colours!'],
    win: [
      ['LUMI', 'You made it through Zweefrijk! Your feet barely touched anything. That’s the spirit!'],
      ['LUMI', 'Come back whenever you want to float. And if the colours follow you home… that’s normal too.'],
      ['RÊNAS', 'My head is still spinning. Thanks, Lumi!'],
    ],
    extra: trippy,
  });
}

function trippy(w, pl) {
  const fov0 = camera.fov;
  const c = new THREE.Color();
  // floating shapes all around the course, slowly spinning and changing colour
  const shapes = [];
  const geos = [new THREE.TorusGeometry(1.2, 0.35, 10, 24), new THREE.IcosahedronGeometry(1.1, 0), new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.TorusKnotGeometry(0.9, 0.28, 64, 8), new THREE.OctahedronGeometry(1.2, 0)];
  for (let i = 0; i < 34; i++) {
    const d = V3(Math.sin(i * 1.9) * Math.cos(i * 0.7), Math.cos(i * 1.3), Math.sin(i * 0.7) * Math.cos(i * 1.9)).normalize();
    const m = mk(geos[i % geos.length], basic(0xffffff, { transparent: true, opacity: 0.85 }), 0, 0, 0, w.group, 1.08);
    const rad = 26 + (i % 5) * 3.5;
    m.position.copy(pl.c).addScaledVector(d, rad); m.scale.setScalar(0.6 + (i % 4) * 0.35);
    shapes.push({ m, d, rad, ph: i * 0.37, spin: V3(Math.sin(i), Math.cos(i * 1.7), Math.sin(i * 2.3)).multiplyScalar(0.8) });
  }
  // gravity waves: a warning, then a few seconds of flipped gravity, then back to floaty
  const WAVE = { every: 11, warn: 2, len: 2.6 };
  let waveT = 7, state = 'calm', skyT = 0;
  const base = pl.grav;
  const banner = document.createElement('div'); banner.className = 'vrTint'; banner.dataset.vr = '#b07aff';   // (the VR view paints the same purple edge)
  banner.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity .4s;background:radial-gradient(circle,transparent 45%,rgba(200,140,255,.35) 100%)';
  document.body.appendChild(banner);
  w.updaters.push((dt, t) => {
    // colours
    for (const s of shapes) {
      s.m.rotation.x += s.spin.x * dt; s.m.rotation.y += s.spin.y * dt; s.m.rotation.z += s.spin.z * dt;
      s.m.position.copy(pl.c).addScaledVector(s.d, s.rad + Math.sin(t * 0.7 + s.ph) * 2.2);
      s.m.material.color.setHSL((t * 0.08 + s.ph * 0.3) % 1, 0.85, 0.65);
    }
    if (w.dome) w.dome.material.color.setHSL((t * 0.03) % 1, 0.55, 0.75);
    if (w.gems) w.gems.forEach((g, i) => g.material.color.setHSL((t * 0.12 + i * 0.07) % 1, 0.9, 0.6));
    if (w.glow) w.glow.material.color.setHSL((t * 0.05 + 0.5) % 1, 0.9, 0.6);
    skyT -= dt;
    if (skyT <= 0 && P.planet === pl && !G.cutscene) {
      skyT = 0.12;
      const h = (t * 9) % 360;
      document.body.style.background = `radial-gradient(ellipse at 50% 40%,hsl(${h},60%,26%) 0%,hsl(${(h + 70) % 360},65%,11%) 55%,hsl(${(h + 140) % 360},60%,4%) 100%)`;
    }
    // the view breathes a little
    if (P.planet === pl) { camera.fov = fov0 + Math.sin(t * 0.9) * 2.5 + (state === 'wave' ? 6 : 0); camera.updateProjectionMatrix(); }
    if (P.planet !== pl || G.cutscene) return;
    // gravity waves
    waveT -= dt;
    if (state === 'calm' && waveT <= WAVE.warn) { state = 'warn'; sfx.warn(); toast('🌀 Gravity wave incoming!', 1600); }
    if (state === 'warn' && waveT <= 0) {
      state = 'wave'; waveT = WAVE.len; pl.grav = -0.32; sfx.whoosh(); banner.style.opacity = '1';
      if (G.toastOnce) G.toastOnce('wave', 'GRAVITY WAVE! Everything floats up. Don’t worry, it comes back down.');
    }
    if (state === 'wave') {
      P.vr = Math.min(P.vr, 5);                    // a gentle float, not a rocket launch
      if (P.alt > 26) P.vr = Math.min(P.vr, 0);    // and never into the dome
      if (Math.random() < dt * 12) puff(P.pos.clone(), 1, 0xc8a8ff, 2, 0.5, P.up);
      if (waveT <= 0) { state = 'calm'; waveT = WAVE.every; pl.grav = base; banner.style.opacity = '0'; }
    }
  });
  // leaving the planet: put the camera and gravity back
  const destroy = w.destroy.bind(w);
  w.destroy = () => { camera.fov = fov0; camera.updateProjectionMatrix(); pl.grav = base; banner.remove(); destroy(); };
}
