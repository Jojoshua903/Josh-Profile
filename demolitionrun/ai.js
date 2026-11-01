import { S, COLS, ROWS, walkable, bfs, los, moveCircle, wrapA } from './core.js';
import { exclTex, qTex } from './level.js';

export function alertEnemy(e, P, reaction = .7) {
  if (!e.alive) return;
  e.sus = 1;
  if (e.state !== 'alert') { e.state = 'alert'; e.reaction = reaction; e.alertFlash = 1.4; e.path = null; e.sprite.scale.setScalar(.5); }
  e.lx = P.x; e.lz = P.z; e.lost = 0;
}

function pickPatrol(e) {
  for (let i = 0; i < 12; i++) {
    const c = Math.floor(e.home[0] / S) + Math.round((Math.random() - .5) * 6), r = Math.floor(e.home[1] / S) + Math.round((Math.random() - .5) * 6);
    if (c > 0 && r > 0 && c < COLS && r < ROWS && walkable(c, r)) return [c * S + S / 2, r * S + S / 2];
  }
  return [e.home[0], e.home[1]];
}

// ctx: { P, fire(e, dist), shareSight(e) }
export function updateEnemy(e, dt, ctx) {
  const P = ctx.P;
  if (e.kind === 'heart') { if (e.alive) ctx.heart(e, dt); return; }
  if (e.kind === 'hand') { if (e.alive) ctx.hand(e, dt); return; }
  if (!e.alive) {
    if (e.deadT < 1) { e.deadT = Math.min(1, e.deadT + dt * 2.8); const k = e.deadT; e.g.rotation.x = -k * k * Math.PI / 2; e.g.position.y = .18 * k; }
    e.sprite.visible = false; e.flash.visible = false; return;
  }
  const dx = P.x - e.x, dz = P.z - e.z, dist = Math.hypot(dx, dz);
  e.senseT -= dt;
  if (e.senseT <= 0) {
    e.senseT = .12;
    let see = false, inView = false;
    if (P.alive && dist < (ctx.sight || 30) && los(e.x, e.z, P.x, P.z)) {
      if (e.state === 'alert') see = true;
      else { const dot = (Math.sin(e.yaw) * dx + Math.cos(e.yaw) * dz) / dist; inView = dist < 2.5 || dot > Math.cos(1.2); }
    }
    // unaware enemies build suspicion before they commit; crouching keeps it low
    if (inView) {
      const rate = (dist < 4.5 ? 3.2 : 1.2) * (P.crouch ? .4 : 1) * (P.sprint ? 1.6 : 1) * (dist > 18 ? .6 : 1);
      e.sus = Math.min(1, e.sus + .12 * rate);
      if (e.sus >= 1) { see = true; alertEnemy(e, P, .55); ctx.bark(e, 'alert'); }
      else { e.yawT = Math.atan2(dx, dz); e.idle = Math.max(e.idle, .6); e.pgoal = null; }
    } else if (e.state !== 'alert') e.sus = Math.max(0, e.sus - .12 * .3);
    const was = e.canSee; e.canSee = see;
    if (see) { e.lx = P.x; e.lz = P.z; e.lost = 0; if (!was) ctx.shareSight(e); }
  }

  let goal = null, speed = 0;
  if (e.state === 'alert') {
    if (e.canSee) {
      e.yawT = Math.atan2(dx, dz);
      const keep = e.kind === 'shade' ? 1.3 : 10;
      if (dist > keep) { goal = [P.x, P.z]; speed = 3.2; }
      e.reaction -= dt; e.fireT -= dt;
      if (e.reaction <= 0 && e.fireT <= 0 && (e.kind !== 'shade' || dist < 2.2)) { ctx.fire(e, dist); e.fireT = e.kind === 'shade' ? .9 : (e.boss ? .45 : .75) + Math.random() * .8; }
    } else {
      goal = [e.lx, e.lz]; speed = 3.6; e.lost += dt;
      if (e.lost > 8) { e.state = 'patrol'; e.sus = .5; e.path = null; e.idle = 1; e.pgoal = null; ctx.bark(e, 'lost'); }
    }
  } else {
    if (e.idle > 0) { e.idle -= dt; if (e.sus < .12) e.yawT = e.yaw + Math.sin(ctx.t * .9 + e.seed) * .6 * dt * 10; }
    else { if (!e.pgoal) e.pgoal = pickPatrol(e); goal = e.pgoal; speed = 1.6; }
  }

  let moving = false;
  if (goal) {
    const gc = Math.floor(goal[0] / S), gr = Math.floor(goal[1] / S), gk = gr * COLS + gc;
    e.pathT -= dt;
    if (!e.path || e.pathT <= 0 || e.pathGoal !== gk) { e.path = bfs(Math.floor(e.x / S), Math.floor(e.z / S), gc, gr) || []; e.pathT = .7; e.pathGoal = gk; }
    let tx = goal[0], tz = goal[1];
    if (e.path.length > 1) { tx = e.path[0][0] * S + S / 2; tz = e.path[0][1] * S + S / 2; }
    let mx = tx - e.x, mz = tz - e.z, md = Math.hypot(mx, mz);
    if (md < .35 && e.path.length > 1) { e.path.shift(); }
    if (md > .3) {
      const step = Math.min(md, speed * (e.speed || 1) * dt);
      moveCircle(e, mx / md * step, mz / md * step, .4);
      if (!e.canSee) e.yawT = Math.atan2(mx, mz);
      e.walk += dt * speed * 3.2; moving = true;
    } else if (e.path.length <= 1) {
      if (e.state === 'patrol') { e.pgoal = null; e.idle = 1.5 + Math.random() * 2.5; e.path = null; }
      else if (!e.canSee) { e.yawT += dt * 2; }
    }
  }
  e.yaw += wrapA(e.yawT - e.yaw) * Math.min(1, dt * 7);
  const sw = moving ? Math.sin(e.walk) * .55 : 0;
  e.legL.rotation.x = sw; e.legR.rotation.x = -sw;
  e.g.position.set(e.x, e.kind === 'hollow' ? .25 + Math.sin(ctx.t * 2.2 + e.seed) * .14 : 0, e.z); e.g.rotation.y = e.yaw;
  if (e.gem) e.gem.rotation.y += dt * 4;

  e.alertFlash -= dt;
  const susp = e.state !== 'alert' && e.sus > .12;
  e.sprite.visible = e.alertFlash > 0 || susp;
  e.sprite.material.map = e.alertFlash > 0 ? exclTex : qTex;
  if (susp) e.sprite.scale.setScalar(.35 + e.sus * .35);
  e.flashT -= dt; e.flash.visible = e.flashT > 0;
  e.hurtT -= dt; e.uni.emissive.setHex(e.hurtT > 0 ? 0x661100 : (e.baseEm || 0));
}

export function separate(enemies) {
  for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
    const a = enemies[i], b = enemies[j]; if (!a.alive || !b.alive || a.kind === 'hand' || b.kind === 'hand' || a.kind === 'heart' || b.kind === 'heart') continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d > 0 && d < .9) { const p = (.9 - d) / 2 / d; moveCircle(a, -dx * p, -dz * p, .4); moveCircle(b, dx * p, dz * p, .4); }
  }
}
