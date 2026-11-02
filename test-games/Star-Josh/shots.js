// Cinematic camera shots. Each shot builds its actors and returns update(t, dt).
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import * as MD from './models.js';
import { makeCharacter, animateCharacter } from './characters.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

export function makeShots(ctx) {
  const { group, cam, explode, flash, shake, setScroll } = ctx;
  const crew = (n, prefer = ['josh', 'nathan', 'ati', 'robin', 'thomas', 'renas', 'ash', 'milo', 'deniz']) =>
    [ctx.lead(), ...prefer.filter(id => id !== ctx.lead())].slice(0, n);
  const spawn = (id, x, y, z, faceCam) => { const m = makeCharacter(id); m.position.set(x, y, z); if (faceCam) m.rotation.y = Math.PI; group.add(m); m.userData.home = V(x, y, z); return m; };
  const anim = (ms, t, dt, sp = 1) => ms.forEach((m, i) => animateCharacter(m, t + i * 0.7, dt, sp));
  const look = V(0, 0, 0), camGoal = V(0, 0, 0);
  // Ease the camera toward whoever is talking, if they are in the shot.
  const focus = (ms, dt, off, fallbackPos, fallbackLook) => {
    const who = ctx.speaker(), m = ms.find(c => c.userData.id === who);
    if (m) { camGoal.copy(m.position).add(off); look.lerp(m.position.clone().add(V(0, 0.4, 0)), 1 - Math.exp(-dt * 4)); }
    else { camGoal.copy(fallbackPos); look.lerp(fallbackLook, 1 - Math.exp(-dt * 3)); }
    cam.position.lerp(camGoal, 1 - Math.exp(-dt * 2.5)); cam.lookAt(look);
  };
  const metaShip = () => {
    const d = MD.makeDreadnought(); group.add(d);
    const m = makeCharacter('meta'); m.scale.setScalar(5); m.position.set(0, 34, -6); d.add(m); d.userData.meta = m;
    return d;
  };

  return {
    meta_reveal() {
      setScroll(30);
      const d = metaShip(); d.position.set(0, 20, -260);
      const fl = [];
      for (let i = 0; i < 14; i++) { const f = MD.makeFighter(0x0866ff, 0x1c2b4a); f.visible = false; group.add(f); fl.push({ m: f, t0: 3 + i * 0.4, x: (Math.random() - 0.5) * 50, y: 6 + Math.random() * 22 }); }
      return (t, dt) => {
        d.position.z = -260 + 185 * (1 - Math.exp(-t / 6)); d.position.y = 20 + Math.sin(t * 0.4);
        d.userData.lights.forEach((l, i) => l.scale.setScalar(0.5 + Math.abs(Math.sin(t * 3 + i))));
        animateCharacter(d.userData.meta, t, dt);
        cam.position.set(16 - t * 0.7, -6 + t * 0.25, 34);
        cam.lookAt(d.position.x, d.position.y + 8, d.position.z + 30);
        for (const f of fl) {
          const a = t - f.t0; if (a < 0) continue;
          f.m.visible = f.m.position.z < 70;
          f.m.position.set(f.x + Math.sin(a * 1.5) * 4, f.y - a * 1.2, d.position.z + 42 + a * 60); f.m.rotation.z = Math.cos(a * 1.5) * 0.6;
        }
      };
    },
    lineup() {
      setScroll(12);
      const c = MD.makeCarrier(); c.position.y = 40; group.add(c);
      const ids = crew(7), ms = ids.map((id, i) => spawn(id, -12 + i * 4, 42.6, 4));
      look.set(0, 42, 4); cam.position.set(-14, 43, -6);
      return (t, dt) => {
        anim(ms, t, dt, 0.3);
        const k = Math.min(t * 1.2, 24);
        focus(ms, dt, V(0.6, 0.6, -5.2), V(-12 + k, 43.4, -9), V(-12 + k + 2, 42.4, 4));
      };
    },
    personal() {
      setScroll(30);
      const m = spawn(ctx.lead(), 0, 20, 0);
      return (t, dt) => {
        animateCharacter(m, t, dt, 0.6);
        m.position.y = 20 + Math.sin(t * 1.2) * 0.25;
        const a = Math.sin(t * 0.25) * 0.6, r = 5.2 - Math.min(t, 6) * 0.15;
        cam.position.set(Math.sin(a) * r, 20.7 + Math.sin(t * 0.4) * 0.3, -Math.cos(a) * r);
        cam.lookAt(0, 20.4, 0);
      };
    },
    launch() {
      setScroll(12);
      const c = MD.makeCarrier(); c.position.y = 40; group.add(c);
      const ids = crew(5), ms = ids.map((id, i) => spawn(id, [0, -5, 5, -10, 10][i], 42.6, 6));
      const t0 = [1.2, 2.3, 2.8, 3.4, 3.9], fired = [];
      const lk = V(0, 42, -20); let cut = false;
      return (t, dt) => {
        ms.forEach((m, i) => {
          const a = t - t0[i];
          animateCharacter(m, t + i, dt, a > 0 ? 1.8 : 0.4);
          if (a < 0) return;
          if (!fired[i]) { fired[i] = 1; shake(0.5); ctx.sound.roll(); }
          const z = 6 - 16 * a * a; m.position.z = z;
          m.position.y = 42.6 + Math.max(0, -z - 60) * 0.14; m.rotation.x = -Math.min(0.5, a * 0.3);
        });
        const w = ms[0];
        if (t < 3.2) { cam.position.lerp(V(w.position.x + 3.5, 44, Math.min(w.position.z + 9, 16)), 0.12); lk.lerp(V(w.position.x, 42.8, w.position.z - 12), 0.2); }
        else { if (!cut) { cut = true; cam.position.set(18, 48, -150); } const last = ms[ms.length - 1]; lk.lerp(V(last.position.x * 0.5, last.position.y, Math.max(last.position.z, -260)), 0.08); }
        cam.lookAt(lk);
      };
    },
    formation() {
      setScroll(70);
      const off = [[0, 0, 0], [-4, -0.6, 3.5], [4, -0.6, 3.5], [-8, -1.2, 7]];
      const ms = crew(4, ['josh', 'renas', 'nathan', 'fionn', 'lars', 'milo', 'deniz', 'enno']).map((id, i) => spawn(id, off[i][0], 20 + off[i][1], off[i][2]));
      look.set(-2, 19.5, 3);
      return (t, dt) => {
        anim(ms, t, dt);
        ms.forEach((m, i) => { m.position.y = m.userData.home.y + Math.sin(t * 1.3 + i * 1.7) * 0.4; m.rotation.z = Math.sin(t * 0.9 + i) * 0.1; });
        const a = t * 0.16 + 0.6, r = 17;
        // Front-on close-up of the speaker, otherwise a slow orbit.
        focus(ms, dt, V(1.2, 0.8, -5.5), V(Math.sin(a) * r - 2, 23 + Math.sin(t * 0.3) * 2, Math.cos(a) * r + 3), V(-2, 19.5, 3));
      };
    },
    meta_talk() {
      setScroll(25);
      const d = metaShip(); d.position.set(0, -10, -160);
      const meta = makeCharacter('meta'); meta.scale.setScalar(2.2); meta.position.set(0, 0, 0); group.add(meta);
      const cast = {};
      return (t, dt) => {
        animateCharacter(meta, t, dt);
        const g = Math.random() < 0.06;
        meta.position.set(g ? (Math.random() - 0.5) * 0.6 : 0, Math.sin(t * 1.4) * 0.2, 0);
        meta.scale.setScalar(2.2 * (g ? 1.08 : 1));
        const who = ctx.speaker();
        if (who && who !== 'meta' && who !== 'nar') {
          if (!cast[who]) cast[who] = spawn(who, 60, 0, 0);
          const m = cast[who]; animateCharacter(m, t, dt, 0.5);
          cam.position.set(60.6, 0.7, -5); cam.lookAt(60, 0.4, 0);
        } else {
          cam.position.set(Math.sin(t * 0.2) * 1.5, 0.8, Math.max(7, 11 - t * 0.6)); cam.lookAt(0, 0.3, 0);
          if (g) shake(0.15);
        }
      };
    },
    retreat() {
      setScroll(60);
      const ms = crew(3).map((id, i) => spawn(id, [0, -4.5, 4.5][i], [0, -0.6, -0.6][i], [0, 3.5, 3.5][i]));
      const mv = makeCharacter('meta'); mv.scale.setScalar(3); group.add(mv); let sm = 0;
      return (t, dt) => {
        anim(ms, t, dt);
        mv.position.set(Math.sin(t * 1.4) * 3, 3 + t * 1.6, -26 - t * 22); mv.rotation.z = Math.sin(t * 3) * 0.5;
        animateCharacter(mv, t, dt);
        sm += dt; if (sm > 0.05) { sm = 0; explode(mv.position.clone(), 0.5, 'smoke'); }
        const who = ctx.speaker(), m = ms.find(c => c.userData.id === who);
        if (m) { cam.position.lerp(m.position.clone().add(V(1.5, 0.8, -5)), 1 - Math.exp(-dt * 3)); cam.lookAt(m.position.x, m.position.y + 0.4, m.position.z); }
        else { cam.position.lerp(V(2.2, 2.4, 9), 1 - Math.exp(-dt * 3)); cam.lookAt(mv.position.x * 0.4, mv.position.y * 0.5 + 1, -30); }
      };
    },
    boss_explode() {
      setScroll(20);
      const d = metaShip(); d.position.set(0, 0, -20);
      const w = makeCharacter(ctx.lead()); w.visible = false; group.add(w);
      let acc = 0, blown = false; const debris = [];
      return (t, dt) => {
        if (!blown) {
          acc += dt; animateCharacter(d.userData.meta, t * 3, dt);
          if (acc > 0.14) { acc = 0; explode(V((Math.random() - 0.5) * 56, (Math.random() - 0.3) * 18, -20 + (Math.random() - 0.2) * 70), 1.5 + Math.random() * 2); shake(0.25); ctx.sound.boom(1.2); }
          d.position.x = Math.sin(t * 30) * 0.3 * t; d.rotation.z = t * 0.02;
          if (t > 4.2) {
            blown = true; d.visible = false; flash(); shake(2.5); ctx.sound.boom(3);
            for (let i = 0; i < 6; i++) explode(V((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 14, -20 + (Math.random() - 0.5) * 40), 6);
            for (let i = 0; i < 26; i++) {
              const m = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 5, 1 + Math.random() * 3, 2 + Math.random() * 6), MD.M(i % 3 ? 0x22304f : 0xc9d6ff));
              m.position.set(0, 0, -20); group.add(m);
              debris.push({ m, v: V((Math.random() - 0.5) * 70, (Math.random() - 0.4) * 50, (Math.random() - 0.5) * 70), r: V(Math.random() * 3, Math.random() * 3, Math.random() * 3) });
            }
          }
        } else {
          for (const b of debris) { b.m.position.addScaledVector(b.v, dt); b.v.multiplyScalar(0.985); b.m.rotation.x += b.r.x * dt; b.m.rotation.y += b.r.y * dt; }
          const a = t - 4.6;
          if (a > 0) {
            w.visible = true; animateCharacter(w, t, dt, 2);
            w.position.set(-2 + a * 2.4, 3 + a * 0.9, a * 34);
            w.rotation.set(0.2, Math.PI, -0.2 + Math.min(a, 1) * Math.PI * 2);
            if (Math.random() < 0.5) explode(w.position.clone().add(V(0, 0, -3)), 0.35, 'smoke');
          }
        }
        cam.position.set(34 - t * 0.6, 9 + t * 0.3, 96);
        cam.lookAt(w.visible ? w.position.x * 0.6 : 0, 2, w.visible ? Math.min(w.position.z, 60) - 30 : -20);
      };
    },
    sunrise() {
      setScroll(55);
      const off = [[0, 0, 0], [-4, -0.5, 3.5], [4, -0.5, 3.5], [-8, -1, 7], [8, -1, 7], [0, -1.5, 8]];
      const ms = crew(6, ['josh', 'nathan', 'ati', 'robin', 'thomas', 'renas', 'dih']).map((id, i) => spawn(id, off[i][0], 22 + off[i][1], off[i][2]));
      look.set(0, 23, -50);
      return (t, dt) => {
        anim(ms, t, dt);
        ms.forEach((m, i) => m.position.y = m.userData.home.y + Math.sin(t * 1.3 + i * 1.7) * 0.4);
        focus(ms, dt, V(1.2, 0.8, -5.5), V(Math.sin(t * 0.15) * 5 + 3, 18.5 - t * 0.08, 16 + t * 1.2), V(0, 23, -50));
      };
    },
    title() { return this.formation(); },
  };
}
