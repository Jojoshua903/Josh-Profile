import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { box } from './chars.js';
import { buildChar, byId } from './chars.js';

const $ = id => document.getElementById(id);

// A little diorama stage where chapter scenes are acted out with the voxel cast.
export class Cutscene {
  constructor(renderer, sfx) {
    this.r = renderer; this.sfx = sfx; this.active = false;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(4, 8, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
    this.scene.add(sun);
    this.stage = new THREE.Group(); this.scene.add(this.stage);
    this.buildStage();
    this.camPos = new THREE.Vector3(0, 3.2, 9); this.camLook = new THREE.Vector3(0, 0.8, 0);
    $('dialog').addEventListener('click', () => this.advance());
    $('skip').addEventListener('click', e => { e.stopPropagation(); this.finish(); });
    addEventListener('keydown', e => { if (!this.active) return; if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); this.advance(); } if (e.code === 'Escape') this.finish(); });
  }

  buildStage() {
    const g = this.stage;
    box(g, 14, 0.6, 7, 0x9ad85e, 0, -0.3, 0); box(g, 14, 1.4, 7, 0x8b5a2b, 0, -1.3, 0); box(g, 14, 0.4, 7, 0x6b3f1f, 0, -2.2, 0);
    box(g, 14, 0.02, 1.4, 0x4a4a58, 0, 0.01, -1.8);
    for (let x = -6; x <= 6; x += 2) box(g, 0.7, 0.025, 0.08, 0xf4f0e6, x, 0.02, -1.8);
    [[-5.5, 1.5], [5.6, 1.2], [-6, -3], [4.5, -3.1], [6, 2.6]].forEach(([x, z], i) => {
      const t = new THREE.Group(); t.position.set(x, 0, z); g.add(t);
      box(t, 0.3, 0.4, 0.3, 0x8b5a2b, 0, 0.2, 0); for (let k = 0; k < 2 + (i % 2); k++) box(t, 0.9 - k * 0.15, 0.45, 0.9 - k * 0.15, k % 2 ? 0x3aa655 : 0x2f9a46, 0, 0.62 + k * 0.45, 0);
    });
    // the WIDR server tower sits in the background of every scene
    const s = new THREE.Group(); s.position.set(3.2, 0, -3); g.add(s);
    box(s, 1.2, 2.4, 0.9, 0x2a2f3a, 0, 1.2, 0);
    this.leds = [0, 1, 2, 3, 4].map(i => box(s, 0.9, 0.1, 0.02, 0x0866ff, 0, 0.4 + i * 0.42, 0.46, 0x0866ff));
    box(s, 0.5, 0.3, 0.03, 0xffd23f, -0.2, 2.1, 0.47); box(s, 0.3, 0.3, 0.03, 0xff7ccf, 0.3, 1.0, 0.47);
  }

  play(ch, playerId, onDone) {
    this.ch = ch; this.onDone = onDone; this.active = true; this.i = -1;
    this.scene.background = new THREE.Color(ch.sky);
    if (this.cast) this.cast.forEach(a => this.stage.remove(a.m.root));
    const ids = []; ch.cast.forEach(c => { const id = c === '@' ? playerId : c; if (!ids.includes(id)) ids.push(id); });
    this.alias = id => id === '@' ? playerId : id;
    const n = ids.length;
    this.cast = ids.map((id, k) => {
      const m = buildChar(id); const x = (k - (n - 1) / 2) * 2.2;
      m.root.position.set(x, 0, 0.6); m.root.scale.setScalar(1.6); m.root.rotation.y = -x * 0.08;
      this.stage.add(m.root);
      const entersLater = ch.lines.some(l => this.alias(l.who) === id && l.act === 'enter');
      m.root.visible = !entersLater;
      return { id, m, x, jump: 0, shake: 0, enter: entersLater ? 0 : 1, home: x };
    });
    $('cut').classList.remove('hidden');
    $('ccTitle').textContent = ch.title; $('ccName').textContent = ch.name;
    $('chapterCard').classList.remove('off'); $('dialog').style.visibility = 'hidden';
    this.camPos.set(0, 4.5, 13);
    clearTimeout(this.cardT);
    this.cardT = setTimeout(() => { $('chapterCard').classList.add('off'); $('dialog').style.visibility = 'visible'; this.advance(); }, 1900);
    this.sfx('chapter');
  }

  actor(who) { const id = this.alias(who); return this.cast.find(a => a.id === id); }

  advance() {
    if (!this.active || $('dialog').style.visibility === 'hidden') return;
    if (this.typing) { this.shown = this.full.length; return; }
    this.i++;
    const L = this.ch.lines[this.i];
    if (!L) return this.finish();
    const a = L.who && this.actor(L.who);
    this.speaker = a || null;
    if (a) {
      const c = byId(a.id); $('who').textContent = c.name; $('who').style.background = c.color;
      if (L.act === 'enter' && !a.m.root.visible) { a.m.root.visible = true; a.enter = 0; a.m.root.position.x = a.home + 9; }
      if (L.act === 'jump') a.jump = 1;
      if (L.act === 'shake') a.shake = 1;
      $('line').classList.remove('narr');
    } else { $('who').textContent = ''; $('line').classList.add('narr'); }
    this.full = L.text.replace(/@/g, this.actor('@') ? byId(this.actor('@').id).name : ''); this.shown = 0; this.typing = true;
    this.sfx(a && a.id === 'meta' ? 'meta' : 'talk');
  }

  finish() {
    if (!this.active) return;
    this.active = false; clearTimeout(this.cardT);
    $('cut').classList.add('hidden');
    // defer so the key press that closed the scene doesn't also hop or restart the game
    const cb = this.onDone; this.onDone = null; setTimeout(() => cb && cb(), 0);
  }

  update(dt, t) {
    if (!this.active) return;
    if (this.typing) {
      this.shown = Math.min(this.full.length, this.shown + dt * 48);
      $('line').textContent = this.full.slice(0, Math.floor(this.shown));
      if (this.shown >= this.full.length) this.typing = false;
    }
    this.leds.forEach((l, i) => l.visible = Math.sin(t * 5 + i * 1.7) > -0.3);
    for (const a of this.cast) {
      a.m.anim(t);
      const r = a.m.root, talking = this.speaker === a;
      if (r.visible && a.enter < 1) { a.enter = Math.min(1, a.enter + dt * 1.6); }
      r.position.x += ((a.enter < 1 ? a.home + (1 - a.enter) * 9 : a.home) - r.position.x) * Math.min(1, dt * 8);
      a.jump = Math.max(0, a.jump - dt * 1.8);
      r.position.y = Math.abs(Math.sin(a.jump * Math.PI * 3)) * a.jump * 0.8 + (talking && !this.typing ? 0 : talking ? Math.abs(Math.sin(t * 14)) * 0.06 : 0);
      a.shake = Math.max(0, a.shake - dt * 1.2);
      r.rotation.z = Math.sin(t * 40) * a.shake * 0.15;
      const s = 1.6 * (talking ? 1.08 : 1); r.scale.lerp(new THREE.Vector3(s, s, s), dt * 6);
    }
    const sp = this.speaker && this.speaker.m.root.visible ? this.speaker : null;
    const tx = sp ? sp.home * 0.6 : 0;
    this.camPos.lerp(new THREE.Vector3(tx + Math.sin(t * 0.3) * 0.4, sp ? 2.9 : 3.6, sp ? 7.6 : 9.4), Math.min(1, dt * 1.8));
    this.camLook.lerp(new THREE.Vector3(sp ? sp.home : 0, 1.0, 0), Math.min(1, dt * 2.5));
    this.cam.position.copy(this.camPos); this.cam.lookAt(this.camLook);
  }

  render(w, h) { this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.r.render(this.scene, this.cam); }
}
