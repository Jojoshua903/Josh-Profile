import { cfg, save } from './settings.js?v=20261126a';

// Guided first match: a checklist of ten short steps on Solmare Piazza against training
// dummies that stand still. Each step watches what the player does and ticks itself off.

const $ = id => document.getElementById(id);
const K = k => `<kbd>${k}</kbd>`;
const STEPS = [
  { id: 'look', title: 'Look around', text: `Move the ${K('Mouse')} to aim and look around.` },
  { id: 'move', title: 'Move', text: `Walk with ${K('W')}${K('A')}${K('S')}${K('D')}. Head toward the training dummies ahead.` },
  { id: 'jump', title: 'Jump', text: `Press ${K('Space')} to jump. Jump twice.` },
  { id: 'sprint', title: 'Sprint', text: `Hold ${K('Shift')} while moving forward to sprint.` },
  { id: 'shoot', title: 'Shoot', text: `${K('Left click')} to fire at a red dummy. Headshots deal extra damage.` },
  { id: 'reload', title: 'Reload', text: `Press ${K('R')} to reload. You also reload automatically when empty.` },
  { id: 'q', title: 'Ability 1', text: `Press ${K('Q')} to use your first ability.` },
  { id: 'ability', title: 'Ability 2', text: `Press ${K('E')} to use your second ability.` },
  { id: 'ult', title: 'Ultimate', text: `Your ultimate is charged for this lesson. Press ${K('F')} to unleash it. In real matches it charges as you deal damage.` },
  { id: 'kill', title: 'Eliminate', text: `Finish off a dummy. Watch for the red X and the kill feed in the top right.` },
];

let T = null;
export function startTutorial(P) {
  T = { i: 0, wait: 0, P, look: 0, moved: 0, jumps: 0, sprint: 0, dmg0: 0, yaw: P.yaw, pitch: P.pitch, ground: true, last: P.pos.clone(), done: false };
  let el = $('tut');
  if (!el) { el = document.createElement('div'); el.id = 'tut'; $('hud').append(el); }
  render();
  return T;
}
export const tutorialActive = () => !!T && !T.done;
export function stopTutorial() { T = null; $('tut')?.remove(); }

function render(flash) {
  const el = $('tut'); if (!el || !T) return;
  const s = STEPS[Math.min(T.i, STEPS.length - 1)];
  el.innerHTML = `
    <div class="tt-top"><span>Training · ${Math.min(T.i + 1, STEPS.length)}/${STEPS.length}</span><i><em style="width:${T.i / STEPS.length * 100}%"></em></i></div>
    ${T.done ? `<h3>All done!</h3><p>You know the basics. Heading to the results…</p>` : `<h3>${s.title}</h3><p>${s.text}</p>`}
    <ol>${STEPS.map((x, i) => `<li class="${i < T.i ? 'ok' : i === T.i ? 'now' : ''}">${x.title}</li>`).join('')}</ol>`;
  if (flash) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}

// Called every frame. ctx: { sprinting, dt }. Returns 'next' on a step change, 'done' at the end.
export function tickTutorial(G, ctx) {
  if (!T || T.done) return null;
  const P = T.P, dt = ctx.dt;
  if (T.wait > 0) { if ((T.wait -= dt) <= 0) { T.i++; onEnter(G); render(true); if (T.i >= STEPS.length) { T.done = true; render(); cfg.tutorialDone = true; save(); return 'done'; } return 'next'; } return null; }
  const id = STEPS[T.i].id;
  if (id === 'look') { T.look += Math.abs(P.yaw - T.yaw) + Math.abs(P.pitch - T.pitch); T.yaw = P.yaw; T.pitch = P.pitch; if (T.look > 2.4) pass(); }
  if (id === 'move' && P.alive) { if (P.onGround) T.moved += Math.hypot(P.pos.x - T.last.x, P.pos.z - T.last.z); if (T.moved > 10) pass(); }
  if (id === 'jump') { if (T.ground && !P.onGround && P.vel.y > 1) T.jumps++; if (T.jumps >= 2) pass(); }
  if (id === 'sprint') { if (ctx.sprinting) T.sprint += dt; if (T.sprint > 1.2) pass(); }
  if (id === 'shoot' && P.dmgDealt - T.dmg0 >= 120) pass();
  if (id === 'reload' && P.reloadT > 0) pass();
  if (id === 'ult' && P.ult < 100 && !T.ultCast) P.ult = 100;
  T.ground = P.onGround; T.last.copy(P.pos);
  return null;
}
function onEnter(G) {
  const P = T.P, id = STEPS[T.i]?.id;
  if (id === 'shoot') T.dmg0 = P.dmgDealt;
  if (id === 'reload') P.ammo = Math.max(1, Math.floor(P.def.weapon.mag / 2));
  if (id === 'q' || id === 'ability') P.cd[id] = 0;
  if (id === 'ult') { T.ultCast = false; P.ult = 100; }
}
function pass() { if (T.wait <= 0) { T.wait = 0.9; T.passed = (T.passed || 0) + 1; T.onPass?.(); } }
export function tutorialCast(slot) {
  if (!T || T.done || T.wait > 0) return;
  const id = STEPS[T.i].id;
  if (id === slot) { if (slot === 'ult') T.ultCast = true; pass(); }
}
export function tutorialKill() { if (T && !T.done && STEPS[T.i].id === 'kill') pass(); }
export function onTutorialPass(fn) { if (T) T.onPass = fn; }
