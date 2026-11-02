// Extra cutscene shots for the expanded story.
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import * as MD from './models.js';
import { makeCharacter, animateCharacter } from './characters.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const GLITCH = new THREE.MeshStandardMaterial({ color: 0x2a1840, emissive: 0x8a3ffc, emissiveIntensity: 0.55, flatShading: true, roughness: 0.4 });
// Turns a character model into a purple glitchy Meta clone.
export function glitchify(m) {
  m.traverse(o => { if (o.isMesh && o.material.blending !== THREE.AdditiveBlending) o.material = GLITCH; if (o.isSprite) o.visible = false; });
  return m;
}

export function makeMoreShots(ctx) {
  const { group, cam, explode, flash, shake, setScroll } = ctx;
  const spawn = (id, x, y, z) => { const m = makeCharacter(id); m.position.set(x, y, z); group.add(m); return m; };
  const look = V(0, 0, 0);
  const follow = (ms, dt, off, fb, fbLook) => {
    const m = ms.find(c => c.userData.id === ctx.speaker());
    const goal = m ? m.position.clone().add(off) : fb, lk = m ? m.position.clone().add(V(0, 0.4, 0)) : fbLook;
    cam.position.lerp(goal, 1 - Math.exp(-dt * 2.5)); look.lerp(lk, 1 - Math.exp(-dt * 4)); cam.lookAt(look);
  };
  return {
    kidnap() {
      setScroll(40);
      const cap = spawn(ctx.captive(), 0, 0, 0), sib = spawn(ctx.sibling(), -4.5, -0.5, 2), lead = ctx.lead() !== ctx.sibling() && ctx.lead() !== ctx.captive() ? spawn(ctx.lead(), 4.5, -0.5, 2) : null;
      const meta = makeCharacter('meta'); meta.scale.setScalar(3.5); meta.position.set(0, 30, -20); group.add(meta);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 3, 1, 16, 1, true), MD.glow(0x7b5cff, 0.45)); group.add(beam);
      const ms = [cap, sib, lead].filter(Boolean); look.set(0, 2, 0);
      return (t, dt) => {
        ms.forEach((m, i) => animateCharacter(m, t + i, dt));
        animateCharacter(meta, t, dt);
        meta.position.y = Math.max(9, 30 - t * 9); meta.position.z = -6;
        const pull = Math.max(0, t - 2.4);
        cap.position.y = Math.min(meta.position.y - 1, pull * pull * 0.9);
        cap.rotation.z = Math.sin(t * 8) * 0.4 * Math.min(1, pull);
        if (t > 6.5) { meta.position.y += (t - 6.5) * 25; meta.position.z -= (t - 6.5) * 60; cap.position.copy(meta.position); cap.visible = t < 7; }
        const top = meta.position, bot = cap.position, len = Math.max(0.1, top.y - bot.y);
        beam.visible = t > 1.6 && t < 7; beam.scale.set(1, len, 1); beam.position.set(bot.x, bot.y + len / 2, (bot.z + top.z) / 2);
        sib.position.x = -4.5 + Math.min(3, pull * 0.8); sib.position.y = -0.5 + pull * 0.3;
        if (t > 1.6 && Math.random() < 0.3) explode(V((Math.random() - 0.5) * 3, bot.y + Math.random() * len, bot.z), 0.2, 'spark');
        follow(ms, dt, V(1.2, 0.8, -6), V(8, 4 + t * 0.5, -12), V(0, 3 + t * 0.6, 0));
      };
    },
    portal() {
      setScroll(80);
      const ids = [ctx.lead(), ctx.sibling(), 'enno', 'dean'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
      const off = [[0, 0, 0], [-4, -0.6, 3.5], [4, -0.6, 3.5], [-8, -1.2, 7]];
      const ms = ids.map((id, i) => spawn(id, off[i][0], 20 + off[i][1], off[i][2]));
      const ring = new THREE.Group(); ring.position.set(0, 24, -260); group.add(ring);
      for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(26 + i * 5, 2 - i * 0.4, 10, 64), MD.glow([0xff4fd8, 0x0866ff, 0x00f5d4][i], 0.85)); ring.add(r); }
      const disc = new THREE.Mesh(new THREE.CircleGeometry(26, 48), MD.glow(0xffffff, 0.55)); ring.add(disc);
      let flashed = false; look.set(0, 22, -100);
      return (t, dt) => {
        ms.forEach((m, i) => { animateCharacter(m, t + i, dt, 1.6); m.position.y = 20 + off[i][1] + Math.sin(t * 1.3 + i) * 0.4; m.position.z = off[i][2] - Math.max(0, t - 4.2) * 40; });
        ring.children.forEach((r, i) => { r.rotation.z = t * (i % 2 ? -1 : 1) * (0.6 + i * 0.3); });
        ring.position.z = Math.min(-60, -260 + t * 30); disc.material.opacity = 0.4 + Math.sin(t * 6) * 0.15;
        if (t > 5.4 && !flashed) { flashed = true; flash(1); shake(1); ctx.sound.boom(2); }
        follow(ms, dt, V(1.2, 0.8, -5.5), V(6, 23, 14), V(0, 22, -100));
      };
    },
    reunion() {
      setScroll(20);
      const cap = spawn(ctx.captive(), 1.4, 0, 0), sib = spawn(ctx.sibling(), -1.4, 0, 0);
      cap.rotation.y = -Math.PI / 2 - 0.4; sib.rotation.y = Math.PI / 2 + 0.4;
      const others = ['robin', 'josh', 'ati'].filter(id => id !== ctx.captive() && id !== ctx.sibling()).slice(0, 2).map((id, i) => spawn(id, i ? 4.5 : -4.5, -0.3, 3));
      const ms = [cap, sib, ...others];
      for (let i = 0; i < 24; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), MD.glow([0xff4fd8, 0x00f5d4, 0xffd23f][i % 3], 0.5)); s.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.3) * 14, -8 - Math.random() * 20); s.userData.s = Math.random(); group.add(s); ms.push(s); }
      look.set(0, 0.5, 0);
      return (t, dt) => {
        [cap, sib, ...others].forEach((m, i) => animateCharacter(m, t + i, dt, 0.5));
        const hug = Math.min(1, t / 3); cap.position.x = 1.4 - hug * 0.5; sib.position.x = -1.4 + hug * 0.5;
        ms.slice(4).forEach(s => { s.rotation.x += dt * s.userData.s; s.rotation.y += dt; });
        follow([cap, sib, ...others], dt, V(1.4, 0.7, -5.5), V(Math.sin(t * 0.2) * 2, 1.2, -7.5), V(0, 0.4, 0));
      };
    },
    clones() {
      setScroll(15);
      const ids = [ctx.lead(), 'josh', 'nathan', 'ati', 'thomas', 'robin', 'dih'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);
      const cl = ids.map((id, i) => { const m = glitchify(makeCharacter(id)); m.position.set(-10 + i * 4, 0, -14); group.add(m); return m; });
      const meta = makeCharacter('meta'); meta.scale.setScalar(6); meta.position.set(0, 9, -30); group.add(meta);
      const hero = spawn(ctx.lead(), 0, 0, 4); hero.rotation.y = Math.PI;
      look.set(0, 2, -14);
      return (t, dt) => {
        cl.forEach((m, i) => { animateCharacter(m, t + i, dt, 0.5); m.visible = Math.random() > 0.04; m.position.x = -10 + i * 4 + (Math.random() < 0.05 ? (Math.random() - 0.5) : 0); });
        animateCharacter(meta, t, dt); animateCharacter(hero, t, dt, 0.5);
        const who = ctx.speaker();
        if (who === ctx.lead()) {
          cam.position.lerp(V(1, 0.9, -1.5), 1 - Math.exp(-dt * 3)); look.lerp(V(0, 0.4, 4), 1 - Math.exp(-dt * 4)); cam.lookAt(look);
        } else {
          cam.position.lerp(V(Math.sin(t * 0.15) * 3, 2, 12 - Math.min(t, 6) * 0.5), 1 - Math.exp(-dt * 2)); look.lerp(V(0, 2.5, -14), 1 - Math.exp(-dt * 3)); cam.lookAt(look);
          if (Math.random() < 0.02) shake(0.15);
        }
      };
    },
  };
}
