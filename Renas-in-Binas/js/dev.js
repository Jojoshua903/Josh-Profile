// ---------- dev tools ----------
// Press ` (backquote) or F2 to open. Jump to any planet, skip to the boss, finish a quest, teleport around, and cheat.
// Everything here talks to main.js through the `api` object, so the game itself stays untouched.
import { THREE, G, frameDir, anyPerp, toast, rOf } from './core.js?v=20261112d';
import { P, S, spawnPlayer, drawHearts, keys } from './player.js?v=20261112d';
import { LANG } from './lang.js?v=20261112d';

const nl = () => LANG.cur === 'nl';
const L = (en, dutch) => (nl() ? dutch : en);
let api = null, root = null, info = null, badge = null;
const cheat = { god: false, fly: false, fast: false, moon: false, info: false };
let fps = 60, baseGrav = null, gravPlanet = null;

const CSS = `
#dev{position:fixed;top:12px;right:12px;width:310px;max-height:calc(100vh - 24px);overflow:auto;z-index:60;display:none;
  background:rgba(18,16,36,.92);border:2px solid #5ef2e0;border-radius:16px;padding:12px 14px;color:#fff;font:13px/1.3 system-ui,sans-serif;
  box-shadow:0 10px 40px rgba(0,0,0,.5)}
#dev.show{display:block}
#dev h3{margin:0 0 2px;font-size:16px;display:flex;justify-content:space-between;align-items:center}
#dev h4{margin:12px 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5ef2e0}
#dev .hint{opacity:.6;font-size:11px}
#dev .row{display:flex;flex-wrap:wrap;gap:5px}
#dev button{all:unset;cursor:pointer;background:#2c2856;border-radius:9px;padding:5px 9px;font-size:12px;border:1px solid #47428a}
#dev button:hover{background:#3d3880}
#dev button.on{background:#1d8f80;border-color:#5ef2e0}
#dev button.here{outline:2px solid #ffd23a}
#dev button:disabled{opacity:.35;cursor:default}
#dev .pl{display:flex;align-items:center;gap:5px}
#dev .dot{width:10px;height:10px;border-radius:50%;display:inline-block}
#devInfo{position:fixed;left:12px;bottom:12px;z-index:59;display:none;background:rgba(0,0,0,.6);color:#9fffe8;
  font:12px/1.4 ui-monospace,monospace;padding:6px 9px;border-radius:8px;pointer-events:none;white-space:pre}
#devBadge{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:59;display:none;background:#ff4d8d;color:#fff;
  font:700 12px system-ui,sans-serif;padding:4px 12px;border-radius:999px;pointer-events:none;letter-spacing:.04em}
#dev .warn{margin:6px 0 0;padding:6px 8px;border-radius:8px;background:rgba(255,77,141,.18);font-size:11px}
`;

export function initDev(a) {
  api = a;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  root = document.createElement('div'); root.id = 'dev'; document.body.appendChild(root);
  info = document.createElement('div'); info.id = 'devInfo'; document.body.appendChild(info);
  badge = document.createElement('div'); badge.id = 'devBadge'; document.body.appendChild(badge);
  badge.textContent = L('🧪 TEST MODE · not saving', '🧪 TESTMODUS · niet opslaan');
  // clicks inside the panel must not reach the game
  root.addEventListener('mousedown', (e) => e.stopPropagation());
  addEventListener('keydown', (e) => {
    if (e.code !== 'Backquote' && e.code !== 'F2') return;
    e.preventDefault(); toggle();
  });
  if (/[?&]dev\b/.test(location.search)) setTimeout(toggle, 600);
}

function toggle(force) {
  const open = force ?? !root.classList.contains('show');
  G.devOpen = open;
  root.classList.toggle('show', open);
  if (open) { if (document.pointerLockElement) document.exitPointerLock(); render(); }
}

// ---------- the panel ----------
function btn(row, label, fn, o = {}) {
  const b = document.createElement('button'); b.innerHTML = label;
  if (o.on) b.classList.add('on'); if (o.here) b.classList.add('here'); if (o.off) b.disabled = true;
  if (o.title) b.title = o.title;
  // the first dev action switches to test mode: from then on nothing is written to the save, so a reload brings back your real progress
  b.onclick = async () => { testMode(); await fn(); render(); };
  row.appendChild(b); return b;
}
function testMode() {
  if (G.devTouched) return;
  G.devTouched = true;
  badge.style.display = 'block';
  toast(L('Test mode: nothing is saved. Reload for your real save.', 'Testmodus: er wordt niets opgeslagen. Herlaad voor je echte save.'), 2600);
}
function section(title) {
  const h = document.createElement('h4'); h.textContent = title; root.appendChild(h);
  const r = document.createElement('div'); r.className = 'row'; root.appendChild(r); return r;
}

function render() {
  if (!root.classList.contains('show')) return;
  const { cur, ORDER, NAMES } = api, save = api.save(), w = cur.w;
  root.innerHTML = '';
  const h = document.createElement('h3'); h.innerHTML = `🛠 Dev tools <span class="hint">\` / F2</span>`; root.appendChild(h);
  const x = document.createElement('button'); x.textContent = '✕'; x.onclick = () => toggle(false); h.appendChild(x);
  const note = document.createElement('div'); note.className = 'warn';
  note.textContent = G.devTouched
    ? L('🧪 Test mode is on: nothing is saved. Reload the page to get your real save back.', '🧪 Testmodus staat aan: er wordt niets opgeslagen. Herlaad de pagina voor je echte save.')
    : L('Using any button starts test mode: nothing gets saved until you reload.', 'Elke knop start testmodus: er wordt niets opgeslagen tot je herlaadt.');
  root.appendChild(note);

  // planets
  let r = section(L('Planets (click = fly there)', 'Planeten (klik = vlieg erheen)'));
  ORDER.concat(api.BONUS ?? [], api.TEMPLE ?? [], api.ZWEEF ?? []).forEach((i) => {
    const [nm, , col] = NAMES[i];
    btn(r, `<span class="pl"><span class="dot" style="background:${col}"></span>${nm}${save.cleared[i] ? ' ✅' : ''}</span>`, () => goPlanet(i), { here: w && cur.idx === i });
  });
  r = section(L('Progress', 'Voortgang'));
  btn(r, L('🔓 Unlock all', '🔓 Alles openen'), unlockAll);
  btn(r, L('♻️ Reset this planet', '♻️ Planeet resetten'), resetPlanet, { off: !w, title: L('Quest, locals and boss start over', 'Quest, locals en baas beginnen opnieuw') });
  btn(r, L('🏠 Main menu', '🏠 Hoofdmenu'), () => { toggle(false); api.openMenu(); });

  // the current planet
  r = section(w ? `${L('This planet', 'Deze planeet')}: ${NAMES[cur.idx][0]}${cur.onArena ? ' · ⚔️' : ''}` : L('This planet: (not on a planet)', 'Deze planeet: (niet op een planeet)'));
  const b = w && w.boss, fighting = !!(w && cur.onArena && b && !b.dead);
  btn(r, L('✅ Finish quest', '✅ Quest klaar'), finishQuest, { off: !w || cur.onArena || w.park });
  btn(r, L('⚔️ To the boss', '⚔️ Naar de baas'), toBoss, { off: !w || cur.onArena || w.park });
  btn(r, L('💥 Hit boss', '💥 Raak baas'), () => b.hit(), { off: !fighting });
  btn(r, L('🏆 Beat boss', '🏆 Versla baas'), () => { while (!b.dead) b.hit(); }, { off: !fighting });
  btn(r, L('🏁 Back to spawn', '🏁 Terug naar start'), () => { const pl = cur.onArena ? w.arena : w.main, sp = cur.onArena ? w.arenaSpawn : w.spawn; spawnPlayer(pl, sp.dir, sp.fwd); }, { off: !w });

  // teleports
  if (w && !cur.onArena) {
    r = section(L('Teleport', 'Teleporteren'));
    for (const t of targets(w)) btn(r, t.label, () => teleport(w.main, t.pos, t.alt));
    if (!r.children.length) r.innerHTML = `<span class="hint">${L('nothing left to find', 'niets meer te vinden')}</span>`;
  }

  // cheats
  r = section(L('Cheats', 'Cheats'));
  btn(r, L('🛡 God mode', '🛡 Onsterfelijk'), () => { cheat.god = !cheat.god; }, { on: cheat.god });
  btn(r, L('🕊 Fly (hold Space)', '🕊 Vliegen (Spatie)'), () => { cheat.fly = !cheat.fly; }, { on: cheat.fly });
  btn(r, L('⚡ Fast', '⚡ Snel'), () => { cheat.fast = !cheat.fast; S.speed = cheat.fast ? 14 : 7; }, { on: cheat.fast });
  btn(r, L('🌙 Low gravity', '🌙 Lage zwaartekracht'), () => { cheat.moon = !cheat.moon; applyGrav(); }, { on: cheat.moon });
  btn(r, L('❤️ Full hearts', '❤️ Hartjes vol'), () => { P.hp = P.maxHp; drawHearts(); });
  btn(r, L('🔩 +100 bolts', '🔩 +100 bouten'), () => { G.coins += 100; G.onCoin(); });
  btn(r, L('📍 Show position/FPS', '📍 Positie/FPS tonen'), () => { cheat.info = !cheat.info; info.style.display = cheat.info ? 'block' : 'none'; }, { on: cheat.info });
}

// ---------- actions ----------
function unlockAll() {
  const save = api.save();
  save.unlocked = api.ORDER.length - 1; save.introSeen = true; save.finale = true; api.persist();
  toast(L('All planets unlocked 🔓', 'Alle planeten open 🔓'), 1800);
}
let going = false;
async function goPlanet(i) {
  // one trip at a time: a second click while a planet is still loading used to build two worlds at once
  if (going || G.state === 'loading') return;
  going = true;
  try {
    const save = api.save();
    // make sure the route counts it as open, so saving and the travel menu keep working
    if (i === api.BONUS || i === api.TEMPLE) save.finale = true; else save.unlocked = Math.max(save.unlocked, api.step(i === api.ZWEEF ? 12 : i));
    save.introSeen = true; api.persist();
    // a cutscene that is still playing (an arrival, a talk) would freeze the new planet: end it first
    if (api.cutActive()) api.skip();
    api.closeOverlays();
    await api.loadWorld(i);
    restoreCheats();
  } finally { going = false; }
}
async function resetPlanet() {
  const { cur } = api, save = api.save(), w = cur.w;
  delete save.w[w.id]; save.cleared[w.index] = false;
  for (const k of Object.keys(save.rares)) if (k.startsWith(w.id)) delete save.rares[k];
  api.persist();
  await api.loadWorld(cur.idx);
  restoreCheats();
}
async function toBoss() {
  const { cur } = api, save = api.save();
  let w = cur.w;
  // already beaten? Forget the win and reload, so the boss is back
  if (save.cleared[w.index] || w.boss.dead) { save.cleared[w.index] = false; api.persist(); await api.loadWorld(cur.idx); w = cur.w; }
  if (api.cutActive()) api.skip();
  toggle(false);
  api.toArena(w);
}
function finishQuest() {
  const w = api.cur.w, st = api.ws(w);
  for (const pk of w.pickups) {
    if (pk.taken || pk.kind !== 'quest') continue;
    pk.taken = true; pk.obj.visible = false;
    if (pk.id && !st.items.includes(pk.id)) st.items.push(pk.id);
  }
  w.quest.got = w.quest.need;
  st.side = st.side || {};
  for (const l of w.locals || []) {
    st.side[l.id] = 'done';
    if (l.item && !l.item.taken) { l.item.taken = true; l.item.obj.visible = false; }
    if (l.duel) l.duel.stop();
    l.bugs.forEach((e) => { if (!e.dead) e.kill(true); }); l.bugs = []; l.left = 0;
  }
  st.fstate = 'done';
  api.persist(); w.unlockLaunch(); api.hud();
  toast(L('Quest done! The Launch Star is awake ⭐', 'Quest klaar! De Launch Star is wakker ⭐'), 2200);
}

// everything worth walking to on this planet
function targets(w) {
  const out = [], icon = (w.quest && w.quest.icon) || '📦';
  let q = 0, rr = 0;
  for (const pk of w.pickups) {
    if (pk.taken || pk.planet !== w.main) continue;
    if (pk.kind === 'quest') out.push({ label: `${icon} ${++q}`, pos: pk.obj.position, alt: pk.alt });
    else if (pk.kind === 'rare') out.push({ label: `⚙️ ${L('rare', 'zeldzaam')} ${++rr}`, pos: pk.obj.position, alt: pk.alt });
    else if (pk.kind === 'side') out.push({ label: `🔎 ${L('local item', 'local-ding')}`, pos: pk.obj.position, alt: pk.alt });
  }
  for (const l of w.locals || []) out.push({ label: `🙋 ${l.name}`, pos: l.npc.g.position, alt: 0 });
  if (w.launchStar) out.push({ label: '⭐ Launch Star', pos: w.launchStar.ls.g.position, alt: 0 });
  if (w.gateAt) out.push({ label: L('🏁 Star gate (finish)', '🏁 Sterrenpoort (finish)'), pos: w.gateAt.pos, alt: w.gateAt.alt });
  if (w.rocket) out.push({ label: L('🚀 Rocket', '🚀 Raket'), pos: w.rocket.g.position, alt: 0 });
  return out;
}
// land right above the spot, a little to the side for people, so you drop onto the platform it sits on
function teleport(pl, pos, alt) {
  let dir = pos.clone().sub(pl.c).normalize();
  if (!alt) dir = frameDir(dir, 90 - 2.5 * 180 / Math.PI / pl.r * 1.2, 0);
  spawnPlayer(pl, dir, anyPerp(dir));
  if (alt) { P.alt = P.prevAlt = alt + 1.2; P.pos.copy(pl.c).addScaledVector(dir, rOf(pl, dir) + P.alt); }
  P.inv = Math.max(P.inv, 1);
  toggle(false);
}

function applyGrav() {
  const pl = P.planet;
  if (gravPlanet && gravPlanet !== pl) { gravPlanet.grav = baseGrav; gravPlanet = null; }
  if (cheat.moon && pl) {
    if (gravPlanet !== pl) { gravPlanet = pl; baseGrav = pl.grav; }
    pl.grav = 0.4;
  } else if (gravPlanet) { gravPlanet.grav = baseGrav; gravPlanet = null; }
}
function restoreCheats() { gravPlanet = null; applyGrav(); }

// ---------- every frame (called from main.js before the player moves) ----------
export function devTick(dt) {
  if (dt > 0) fps += (1 / dt - fps) * 0.05;
  if (cheat.god) { P.inv = Math.max(P.inv, 0.2); if (P.hp < P.maxHp) { P.hp = P.maxHp; drawHearts(); } }
  if (cheat.fly && P.planet) {
    if (keys.has('Space')) P.vr = 11;
    else if (keys.has('ShiftLeft') || keys.has('ShiftRight')) P.vr = -11;
    else if (!P.grounded) P.vr = Math.max(P.vr, 30 * (P.planet.grav || 1) * dt);   // hover
  }
  if (cheat.moon && P.planet !== gravPlanet) applyGrav();
  if (cheat.info) {
    const u = P.planet ? P.pos.clone().sub(P.planet.c).normalize() : new THREE.Vector3(0, 1, 0);
    const lat = Math.asin(Math.max(-1, Math.min(1, u.y))) * 180 / Math.PI, lon = Math.atan2(u.x, u.z) * 180 / Math.PI;
    const cur = api.cur;
    info.textContent = `${Math.round(fps)} fps · ${G.state}${cur.onArena ? ' · arena' : ''}\nLL(${lat.toFixed(1)}, ${lon.toFixed(1)}) · alt ${P.alt.toFixed(2)}\n${cur.w ? api.NAMES[cur.idx][0] : '—'} · hp ${P.hp}/${P.maxHp}`;
  }
}
