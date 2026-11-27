import { cfg, save } from './settings.js?v=20261128r';

// Guided first match: a checklist of ten short steps on Solmare Piazza against training
// dummies that stand still. Each step watches what the player does and ticks itself off.
// Practice runs reuse the same checklist with steps built from one hero's kit (heroSteps).

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

// ---------- practice runs: one hero's kit, step by step ----------
const dummies = G => G.heroes.filter(h => h.dummy && h.alive);
const near = (G, P) => Math.min(...dummies(G).map(d => d.pos.distanceTo(P.pos)), Infinity);
// damage dealt this frame, worked out from the running total
const dealt = (T, P) => { const d = P.dmgDealt - (T.dmgSeen ?? P.dmgDealt); T.dmgSeen = P.dmgDealt; return d; };
// How to see each passive in action against dummies that stand still. `check` ticks the step off;
// passives that need an enemy fighting back just explain themselves and move on after a moment.
const PASSIVE_TRY = {
  afterburn: { how: 'Hit a dummy and watch it keep burning.', check: (T, P, G) => dummies(G).some(d => d.burnT > 0) },
  aloft: { how: `Jump with ${K('Space')} and hit a dummy while you’re in the air.`, check: (T, P) => dealt(T, P) > 0 && !P.onGround && P.airT > 0.25 },
  keeneye: { how: 'Back off more than 30m from the dummies and land a hit.', check: (T, P, G) => dealt(T, P) > 0 && near(G, P) > P.def.passive.range },
  highground: { how: `Stand on one of your own blocks (${K('Q')}) and hit a dummy.`, check: (T, P) => dealt(T, P) > 0 && P.onBlock },
  shear: { how: 'Slow, root or stun a dummy with an ability, then hit it.', check: (T, P, G) => dealt(T, P) > 0 && dummies(G).some(d => d.slowT > 0 || d.stunT > 0 || d.rootT > 0 || d.zoneSlow < 1) },
  wallcrawl: { how: 'Walk straight into a wall or building and keep going: you’ll climb it. Get up onto a roof.', check: (T, P) => P.pos.y > 2.5 },
  enpointe: { how: `Sprint with ${K('Shift')} for a couple of seconds.`, check: (T, P, G, dt) => (T.fast = Math.hypot(P.vel.x, P.vel.z) > P.def.passive.speed ? (T.fast || 0) + dt : 0) > 1.5 },
  shocks: { how: 'Keep skating around until your momentum is full.', check: (T, P) => P.momentum >= 99 },
  remix: { how: `Use ${K('Q')} and then ${K('E')}: each one takes time off the other’s cooldown.`, check: T => T.casts?.q && T.casts?.ability },
  network: { how: `Dig two holes with ${K('E')}, then step into one to pop out of the other.`, check: (T, P) => P.tunnelCd > 0 },
  hunger: { how: 'Slow or stun a dummy, then hit it to heal yourself.', check: (T, P, G) => dealt(T, P) > 0 && dummies(G).some(d => d.slowT > 0 || d.stunT > 0 || d.rootT > 0) },
  seconds: { how: 'Empty a few rockets into a dummy and finish it: your bazooka refills on the spot.', check: (T, P) => P.kills > (T.kills0 ?? P.kills) },
  tailwind: { how: 'Finish off a dummy to reset your ability and get a burst of speed.', check: (T, P) => P.kills > (T.kills0 ?? P.kills) },
  extraball: { how: 'Aim at the floor in front of a dummy so a ball bounces before it hits: each bounce adds damage.', check: (T, P, G) => (T.bounced ||= G.projectiles.some(p => p.owner === P && p.bounces > 0)) && dealt(T, P) > 0 },
  prizetag: { how: `Grab a dummy with The Claw (${K('Q')}) to tag it: tagged targets take 20% more damage.`, check: (T, P, G) => dummies(G).some(d => d.markT > 0) },
  highscore: { how: 'Finish off a dummy to start a High Score streak: more damage and healing per stack.', check: (T, P) => P.scoreStacks > 0 },
  nightflight: { how: `Jump with ${K('Space')} and keep holding it to fly. Get above 8m!`, check: (T, P) => P.pos.y > 8 },
  fickle: { how: "Fire six shots at a dummy to go through the whole rainbow: watch it burn, slow and get marked.", check: (T, P, G) => (T.hues = (T.hues || new Set()).add(P.hue ?? -1)).size >= 7 || dummies(G).some(d => d.markT > 0 && d.burnT > 0) },
  magnetise: { how: `Shoot a dummy to magnetise it, then yank it with Attract (${K('E')}): magnetised targets get clamped.`, check: (T, P, G) => dummies(G).some(d => d.stunT > 0) },
};
const WAIT = 7;            // seconds a hands-off passive step stays up before moving on
export function heroSteps(def) {
  const pa = def.passive, tryIt = PASSIVE_TRY[pa?.id];
  return [
    { id: 'shoot', title: def.weapon.name, text: `${def.weapon.desc} ${K('Left click')} to fire at a red dummy.` },
    { id: 'q', title: `${def.q.name} ${K('Q')}`, text: `${def.q.desc}.` },
    { id: 'ability', title: `${def.ability.name} ${K('E')}`, text: `${def.ability.desc}.` },
    { id: 'ult', title: `${def.ult.name} ${K('F')}`, text: `${def.ult.desc}. It’s charged for this lesson; in real matches it fills as you deal damage.` },
    ...(pa ? [{ id: 'passive', title: `Passive: ${pa.name}`, check: tryIt?.check,
      text: `${pa.desc}. ${tryIt ? tryIt.how : 'It works on its own in real matches, where enemies fight back. Carry on in a moment.'}` }] : []),
    { id: 'kill', title: 'Eliminate', text: `Put it all together and finish off a dummy as ${def.callsign}.` },
  ];
}

let T = null;
export function startTutorial(P, practice = null) {
  T = { i: 0, wait: 0, P, look: 0, moved: 0, jumps: 0, sprint: 0, dmg0: 0, yaw: P.yaw, pitch: P.pitch, ground: true, last: P.pos.clone(), done: false,
    practice, steps: practice ? heroSteps(P.def) : STEPS };
  let el = $('tut');
  if (!el) { el = document.createElement('div'); el.id = 'tut'; $('hud').append(el); }
  onEnter();
  render();
  return T;
}
export const tutorialActive = () => !!T && !T.done;
export function stopTutorial() { T = null; $('tut')?.remove(); }

function render(flash) {
  const el = $('tut'); if (!el || !T) return;
  const S = T.steps, s = S[Math.min(T.i, S.length - 1)];
  const wait = s.id === 'passive' && !s.check ? `<p class="tt-wait"><em style="animation-duration:${WAIT}s"></em></p>` : '';
  el.innerHTML = `
    <div class="tt-top"><span>${T.practice ? `Practice · ${T.P.def.callsign}` : 'Training'} · ${Math.min(T.i + 1, S.length)}/${S.length}</span><i><em style="width:${T.i / S.length * 100}%"></em></i></div>
    ${T.done ? `<h3>All done!</h3><p>${T.practice ? `That’s ${T.P.def.callsign}’s whole kit.` : 'You know the basics.'} Heading to the results…</p>` : `<h3>${s.title}</h3><p>${s.text}</p>${wait}`}
    <ol>${S.map((x, i) => `<li class="${i < T.i ? 'ok' : i === T.i ? 'now' : ''}">${x.title.replace(/<kbd>.*<\/kbd>/, '').trim()}</li>`).join('')}</ol>`;
  if (flash) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}

// Called every frame. ctx: { sprinting, dt }. Returns 'next' on a step change, 'done' at the end.
export function tickTutorial(G, ctx) {
  if (!T || T.done) return null;
  const P = T.P, dt = ctx.dt, S = T.steps;
  if (T.wait > 0) {
    if ((T.wait -= dt) <= 0) {
      T.i++; onEnter(); render(true);
      if (T.i >= S.length) { T.done = true; render(); if (!T.practice) { cfg.tutorialDone = true; save(); } return 'done'; }
      return 'next';
    }
    return null;
  }
  const step = S[T.i], id = step.id;
  if (id === 'look') { T.look += Math.abs(P.yaw - T.yaw) + Math.abs(P.pitch - T.pitch); T.yaw = P.yaw; T.pitch = P.pitch; if (T.look > 2.4) pass(); }
  if (id === 'move' && P.alive) { if (P.onGround) T.moved += Math.hypot(P.pos.x - T.last.x, P.pos.z - T.last.z); if (T.moved > 10) pass(); }
  if (id === 'jump') { if (T.ground && !P.onGround && P.vel.y > 1) T.jumps++; if (T.jumps >= 2) pass(); }
  if (id === 'sprint') { if (ctx.sprinting) T.sprint += dt; if (T.sprint > 1.2) pass(); }
  if (id === 'shoot' && P.dmgDealt - T.dmg0 >= 120) pass();
  if (id === 'reload' && P.reloadT > 0) pass();
  if (id === 'ult' && P.ult < 100 && !T.ultCast) P.ult = 100;
  if (id === 'passive') {
    T.pt += dt;
    if (P.cd.q > 1) P.cd.q = Math.min(P.cd.q, 1);                       // abilities come back fast so the passive is easy to show off
    if (P.cd.ability > 1) P.cd.ability = Math.min(P.cd.ability, 1);
    if (step.check ? P.alive && step.check(T, P, G, dt) : T.pt > WAIT) pass();
  }
  T.ground = P.onGround; T.last.copy(P.pos);
  return null;
}
function onEnter() {
  const P = T.P, id = T.steps[T.i]?.id;
  if (id === 'shoot') T.dmg0 = P.dmgDealt;
  if (id === 'reload') P.ammo = Math.max(1, Math.floor(P.def.weapon.mag / 2));
  if (id === 'q' || id === 'ability') P.cd[id] = 0;
  if (id === 'ult') { T.ultCast = false; P.ult = 100; }
  if (id === 'passive') { T.pt = 0; T.dmgSeen = P.dmgDealt; T.kills0 = P.kills; T.casts = {}; P.cd.q = 0; P.cd.ability = 0; }
}
function pass() { if (T.wait <= 0) { T.wait = 0.9; T.passed = (T.passed || 0) + 1; T.onPass?.(); } }
export function tutorialCast(slot) {
  if (!T || T.done || T.wait > 0) return;
  const id = T.steps[T.i].id;
  if (id === 'passive') { T.casts[slot] = true; return; }
  if (id === slot) { if (slot === 'ult') T.ultCast = true; pass(); }
}
export function tutorialKill() { if (T && !T.done && T.steps[T.i].id === 'kill') pass(); }
export function onTutorialPass(fn) { if (T) T.onPass = fn; }
