import { THREE, G, renderer, scene, camera, ambient, hemi, sun, V3, clamp, damp, surf, orientOn, anyPerp, frameDir, dirOf, tangentTo, $, toast, banner, fade, wait, setPrompt, updateParticles, clearParticles, puff } from './core.js?v=20261114i';
import { initAudio, music, sfx } from './audio.js?v=20261114i';
import { P, model, spawnPlayer, updatePlayer, updateCamera, drawHearts, pressed, consumePressed, requestLock, locked, mouse, squash, cam, healPlayer, hurtPlayer } from './player.js?v=20261114i';
import { play, advance, skip, updateCut, cutActive, showTitle } from './cutscene.js?v=20261114i';
import { sysOf, sysName, addSystemSun } from './systems.js?v=20261114i';
import { addMiniGalaxy } from './galaxyhop.js?v=20261114i';
import { buildPhonk } from './world-phonk.js?v=20261114i';
import { buildMine } from './world-mine.js?v=20261114i';
import { buildStadium } from './world-stadium.js?v=20261114i';
import { buildIce } from './world-ice.js?v=20261114i';
import { buildLuck } from './world-luck.js?v=20261114i';
import { buildJungle } from './world-jungle.js?v=20261114i';
import { buildLava } from './world-lava.js?v=20261114i';
import { buildDesert } from './world-desert.js?v=20261114i';
import { buildMoon } from './world-moon.js?v=20261114i';
import { buildSea } from './world-sea.js?v=20261114i';
import { buildSpook } from './world-spook.js?v=20261114i';
import { buildWerk } from './world-werk.js?v=20261114i';
import { buildStuiter, buildWissel, buildSprong } from './world-park.js?v=20261114i';
import { buildZweef } from './world-zweef.js?v=20261114i';
import { buildTempel, GOD_BOSS, HALL, PANTHEONS, BINDS, TIERS } from './world-tempel.js?v=20261114i';
import { buildIntro, playIntro, playFinale, menuShot } from './story.js?v=20261114i';
import { buildGroteKern } from './models.js?v=20261114i';
import { updateExtras, pollPad } from './extras.js?v=20261114i';
import { tr, LANG, setLang, applyHTML, onLang } from './lang.js?v=20261114i';
import { initDev, devTick } from './dev.js?v=20261114i';
import { initAch, checkAch, unlockAch, buildAchPanel } from './achievements.js?v=20261114i';
import { initShop, openShop, closeShop, applyStyle, shopMaxHp, shopTick } from './shop.js?v=20261114i';
import { initGalaxy, openGalaxy, closeGalaxy, galaxyTick, galaxyOpen, galaxyIdx } from './galaxy.js?v=20261114i';
import { startLoop, vrBegin, vrEnd, pollVR } from './vr.js?v=20261114i';
const nl = () => LANG.cur === 'nl';

const BUILDERS = [buildPhonk, buildMine, buildStadium, buildIce, buildLuck, buildJungle, buildLava, buildDesert, buildMoon, buildSea, buildSpook, buildWerk, buildStuiter, buildWissel, buildSprong, buildTempel, buildZweef];
const NAMES = [['Planeta Phonk', 'Milo', '#ff5ab4'], ['De Diepe Mijn', 'Lars', '#c89050'], ['Homerun Heuvel', 'Nathan', '#5cc85a'], ['Hertogdom IJs', 'Pingo', '#9fe8ff'], ['Smaragdeiland', 'Fionn', '#5cd85a'], ['Het Oerwoud', 'Reshman', '#3aa84a'], ['De Asberg', 'Immanuel', '#ff7a2a'], ['Duinenrijk', 'Farah', '#e0b070'], ['Maankrater', 'Niek', '#b8b8c8'], ['De Koraalzee', 'Sami', '#3ab0d8'], ['Spookplaneet', 'Saar', '#9a7aff'], ['De Gouden Werkplaats', 'Lars', '#ffd23a'], ['Stuiterstad', 'Thomas', '#ff7ab6'], ['De Wisselbaan', 'Dean', '#ff3a5a'], ['Sterrensprong', 'Robin', '#5ef2e0'], ['De Sterrentempel', 'Josh', '#fff2b8'], ['Zweefrijk', 'Lumi', '#b07aff']];
// story order: Phonk, Mijn, IJs, Smaragdeiland, and Homerun Heuvel last (the finale is staged there).
// save.unlocked counts steps along this route, not planet indices.
// 12, 13, 14 are the parkour planets: detours between the story planets, no quest and no boss
const ORDER = [0, 1, 3, 12, 4, 5, 6, 13, 7, 9, 10, 14, 8, 2], FINAL = 2;
// the bonus planet is not on the route: it opens once the finale is done (save.finale)
const BONUS = 11;
// De Sterrentempel (this game’s Godhome) also opens after the finale. It is not on the route either
const TEMPLE = 15;
// Zweefrijk, the anti-gravity planet: a side trip that opens once you reach Stuiterstad. Not on the route either
const ZWEEF = 16, zweefOpen = (s) => step(12) <= s.unlocked || !!s.finale;
const step = (i) => ORDER.indexOf(i);
const resumeAt = (s) => (step(s.last || 0) <= s.unlocked ? (s.last || 0) : ORDER[s.unlocked]);
const SIDE_CORE = { 3: ['IJSKERN!', 'Deniz’ ice core', 'De IJskern van Deniz', 'You have more aura than the Duke of Ice!', 'Je hebt meer aura dan de Hertog van IJs!'], 4: ['KLAVERKERN!', 'Lorcan’s lucky core', 'De gelukskern van Lorcan', 'The luck is back on Smaragdeiland!', 'Het geluk is terug op Smaragdeiland!'], 5: ['KOKOSKERN!', 'Koning Kokos’ coconut core', 'De Kokoskern van Koning Kokos', 'The bananas are back in Het Oerwoud!', 'De bananen zijn terug in Het Oerwoud!'], 6: ['VUURKERN!', 'Smeul’s fire core', 'De Vuurkern van Smeul', 'De Asberg is calm again!', 'De Asberg is weer rustig!'], 7: ['ZANDKERN!', 'Gruizel’s sand core', 'De Zandkern van Gruizel', 'Farah’s dig site is safe!', 'Farah’s opgraving is veilig!'], 8: ['MAANKERN!', 'The moon core', 'De Maankern', 'Kayo & Yara fled the moon!', 'Kayo & Yara zijn van de maan gevlucht!'], 9: ['ZEEKERN!', 'Kraak’s sea core', 'De Zeekern van Kraak', 'Sami’s pearls are safe!', 'Sami’s parels zijn veilig!'], 10: ['SPOOKKERN!', 'Koning Boe’s ghost core', 'De Spookkern van Koning Boe', 'The Spookplaneet is glowing again!', 'De Spookplaneet gloeit weer!'], 11: ['GOUDEN KERN!', 'The Gouden Kern', 'De Gouden Kern', 'Your station is SUPER fast now!', 'Je station is nu SUPERsnel!'] };
const RARE_TOTAL = 60;
const RARES_PER = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 0, 3];   // the parkour planets hide three   // every planet has a 4th one at the end of its parkour

// ---------- save ----------
// three save slots. Slot 1 keeps the old key, so progress from before the slots still loads
const KEY = 'renas-rocket-rumble-save-v1', SLOT_KEY = 'renas-rocket-rumble-slot', SLOTS = 3;
const keyOf = (n) => (n === 1 ? KEY : `${KEY}-slot${n}`);
let slot = 1;
try { slot = clamp(Math.round(+localStorage.getItem(SLOT_KEY) || 1), 1, SLOTS); } catch (e) { /* no storage */ }
const DEF = () => ({ unlocked: 0, w: {}, rares: {}, coins: 0, deaths: 0, time: 0, introSeen: false, cleared: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], tries: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], finale: false, last: 0, order: 6 });
let save = load();
function peek(n) { try { const s = JSON.parse(localStorage.getItem(keyOf(n))); return s ? { ...DEF(), ...migrate(s) } : null; } catch (e) { return null; } }
// older saves stored the highest planet index (0..2) and had IJs/Smaragdeiland as bonus planets (no order),
// or used the five-planet route without Het Oerwoud (order 2), or the six-planet one (order 3).
// Anyone who already reached Homerun Heuvel keeps every planet open.
function migrate(s) {
  if (!s.order) { if (s.unlocked >= 2 || s.finale) s.unlocked = ORDER.length - 1; }
  else if (s.order === 2 && (s.unlocked >= 4 || s.finale)) s.unlocked = ORDER.length - 1;   // Het Oerwoud came in before Homerun Heuvel
  else if (s.order === 3 && (s.unlocked >= 5 || s.finale)) s.unlocked = ORDER.length - 1;   // and then De Asberg, Duinenrijk and Maankrater
  else if (s.order === 4) { if (s.finale || s.unlocked >= 8) s.unlocked = ORDER.length - 1; else if (s.unlocked >= 7) s.unlocked += 2; }   // De Koraalzee and Spookplaneet came in before Maankrater
  // order 5 had no parkour planets: map the step you were at onto the new route
  if ((s.order || 0) <= 5) { const OLD = [0, 1, 3, 4, 5, 6, 7, 9, 10, 8, 2]; if (s.finale || s.unlocked >= OLD.length - 1) s.unlocked = ORDER.length - 1; else s.unlocked = ORDER.indexOf(OLD[s.unlocked] ?? 0); }
  s.order = 6; return s;
}
function load() { return peek(slot) || DEF(); }
function persist() { if (G.devTouched) return; try { localStorage.setItem(keyOf(slot), JSON.stringify(save)); } catch (e) { /* private mode: progress lives for this session */ } }
function useSlot(n) {
  if (n !== slot) persist();
  slot = n; try { localStorage.setItem(SLOT_KEY, String(n)); } catch (e) { /* no storage */ }
  save = load(); G.coins = save.coins;
  openMenu();
}
const ws = (w) => (save.w[w.id] = save.w[w.id] || { items: [], fstate: 'new', visited: false, bossSeen: false });
G.coins = save.coins;
// star shards: one from every local you helped (see setupLocal)
function shardsGot(w) { return (w.locals || []).filter((l) => l.state() === 'done').length; }
function shardsDone(w) { return !w.locals || shardsGot(w) >= w.locals.length; }

// ---------- shared helpers for the worlds ----------
const shown = {};
G.toastOnce = (k, msg) => { if (shown[k]) return; shown[k] = true; toast(msg, 3400); };
let radioT;
G.radio = (who, text) => {
  text = tr(text);
  const el = $('radio'); $('radioWho').textContent = who; $('radioTxt').textContent = text;
  el.classList.add('show'); sfx.blip(700); clearTimeout(radioT); radioT = setTimeout(() => el.classList.remove('show'), Math.max(5500, text.length * 85));
};
const cur = { w: null, idx: 0, onArena: false };
G.cur = cur; G.save = () => save;
const ctx = {
  get save() { return save; }, persist, ws, hud,
  setSky: (css) => { document.body.style.background = css; },
  talkCam: (npc) => () => {
    const n = npc.g.position, up = npc.dir;
    const toP = P.pos.clone().sub(n); toP.addScaledVector(up, -toP.dot(up));
    if (toP.lengthSq() < 0.01) toP.copy(anyPerp(up)); toP.normalize();
    const side = new THREE.Vector3().crossVectors(up, toP).normalize();
    return { pos: n.clone().addScaledVector(up, 1.8).addScaledVector(toP, 3.8).addScaledVector(side, 2.4), look: n.clone().lerp(P.pos, 0.4).addScaledVector(up, 1.2), up };
  },
  gotQuest(w, id) {
    const st = ws(w); if (!st.items.includes(id)) st.items.push(id);
    w.quest.got = st.items.length; persist();
    sfx.quest(); banner({ Vinyls: 'VINYL!', Lanterns: 'LANTERN!', 'Lucky balls': 'LUCKY BALL!', 'Aura crystals': 'AURA CRYSTAL!', 'Lucky stones': 'LUCKY STONE!', 'Golden bananas': 'GOLDEN BANANA!', 'Fire gems': 'FIRE GEM!', 'Golden scarabs': 'GOLDEN SCARAB!', 'Power cells': 'POWER CELL!', Pearls: 'PEARL!', Candles: 'CANDLE!', Blueprints: 'BLUEPRINT!' }[w.quest.label], `${w.quest.got} / ${w.quest.need}`, '#ffe27a');
    if (w.quest.got >= w.quest.need) setTimeout(() => G.radio(w.friendName.toUpperCase(), shardsDone(w) ? 'You found them all?! Come back to me!' : 'You found them all! Now help the locals. The Launch Star needs their star shards.'), 1400);
    hud();
  },
  gotShard(w) {
    const n = shardsGot(w), need = w.locals.length;
    sfx.rare(); banner('STAR SHARD!', `${n} / ${need}`, '#9fe8ff');
    puff(P.pos.clone().addScaledVector(P.up, 1), 24, 0x9fe8ff, 4, 2);
    healPlayer(P.maxHp);
    G.coins += 10; G.onCoin(); toast('+10 bolts · hearts refilled', 2200);
    if (n >= need) setTimeout(() => G.radio(w.friendName.toUpperCase(), w.quest.got >= w.quest.need ? 'All the star shards! Come back to me, the Launch Star is ready to wake up!' : 'All the star shards! Now we just need the rest of my stuff.'), 2400);
    hud();
  },
  gotRare(id) { save.rares[id] = true; persist(); hud(); },
  openTravel,
  toArena,
  parkDone,
  godStatue: (idx) => godStatue(idx),
  godDoor: (n) => godDoor(n),
  godFrom: null,
};
function hud() {
  $('rareN').textContent = Object.keys(save.rares).length; $('rareT').textContent = RARE_TOTAL;
  $('coinN').textContent = G.coins;
  const w = cur.w, q = $('quest');
  if (!w || (!w.quest && !w.hudText)) { q.style.display = 'none'; return; }
  q.style.display = cur.onArena ? 'none' : 'flex';
  if (w.duel) { q.innerHTML = w.duel.hud(nl()); return; }   // a duel with a local: the score
  if (w.hudText) { q.innerHTML = w.hudText(nl()); return; }
  const fs = w.friendState ? w.friendState() : 'new';
  let txt;
  if (w.nextStop !== undefined) txt = nl() ? `🚀 Naar je raket · volgende stop: <b>${w.nextName}</b>` : `🚀 To your rocket · next stop: <b>${w.nextName}</b>`;
  else if (save.cleared[w.index]) txt = nl() ? `✅ ${w.title} gehaald` : `✅ ${w.title} cleared`;
  else if (fs === 'new') txt = nl() ? `💬 Zoek ${w.friendName} (praat met E)` : `💬 Find ${w.friendName} (E to talk)`;
  else if (fs !== 'done' && (w.quest.got < w.quest.need || !shardsDone(w))) {
    txt = `${w.quest.icon} ${tr(w.quest.label)} <b>${w.quest.got} / ${w.quest.need}</b>`;
    if (w.locals) txt += ` &nbsp;✨ ${nl() ? 'Sterrenscherven' : 'Star shards'} <b>${shardsGot(w)} / ${w.locals.length}</b>`;
    const busy = w.locals && w.locals.find((l) => l.state() === 'progress' && l.task.type === 'stomp');
    if (busy) txt += ` &nbsp;· ${busy.name}: ${nl() ? 'nog' : ''} ${busy.left} ${nl() ? '' : 'left'}`;
  }
  else if (fs !== 'done') txt = nl() ? `💬 Breng ze naar ${w.friendName}` : `💬 Bring them to ${w.friendName}`;
  else txt = w.index === 2 ? (nl() ? '⚾ Stap op de thuisplaat!' : '⚾ Step on home plate!') : (nl() ? '⭐ De Launch Star is wakker!' : '⭐ The Launch Star is awake!');
  q.innerHTML = txt;
}
G.onCoin = () => { save.coins = G.coins; $('coinN').textContent = G.coins; const c = $('coins'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); if (G.coins % 5 === 0) persist(); };

// ---------- looks ----------
function applyLook(w, arena) {
  document.body.style.background = arena ? w.arenaSky : w.sky;
  if (w.lights) { hemi.color.setHex(w.lights[0]); hemi.groundColor.setHex(w.lights[1]); }
}
const showHud = (v) => document.body.classList.toggle('ingame', v);

// ---------- loading worlds ----------
let lastSys = null;   // the solar system of the planet you were on
async function loadWorld(idx) {
  planetT0 = save.time;
  G.state = 'loading';
  endGod();
  P.maxHp = shopMaxHp();   // 4 hearts with the extra heart from Knabbels Werkplaats
  await fade(true, 380);
  if (G.world) G.world.destroy();
  clearParticles();
  $('boss').classList.remove('show');
  const w = BUILDERS[idx](ctx);
  addSystemSun(w, idx, NAMES.map((n) => n[2]));
  if (!w.park && idx !== TEMPLE) addMiniGalaxy(w, { ws: ws(w), persist, nl: nl() });   // little planets with their own gravity (galaxyhop.js)
  G.world = w; cur.w = w; cur.idx = idx; cur.onArena = false;
  save.last = idx; persist();
  w.boss.onWin = () => bossWon(w);
  if (save.cleared[idx]) { w.boss.dead = true; w.boss.g.visible = false; }
  applyLook(w, false);
  spawnPlayer(w.main, w.spawn.dir, w.spawn.fwd); P.hidden = false;   // (leaving in the rocket hid Rênas)
  P.hp = P.maxHp; drawHearts();
  music(w.music); showHud(true); hud();
  G.state = 'play';
  await fade(false, 500);
  const st = ws(w);
  if (!st.visited) { st.visited = true; persist(); (w.arrive || arrival)(w); } else showTitle(w.title, w.sub);
  // flying into another solar system: say which one
  const sy = sysOf(idx);
  if (sy !== lastSys) { if (lastSys) setTimeout(() => toast(nl() ? `☀️ Welkom in ${sy.nl}!` : `☀️ Welcome to ${sy.en}!`, 3200), 1500); lastSys = sy; }
  setTimeout(() => G.state === 'play' && !cutActive() && G.toastOnce('dash', '☄️ New move: press X for the Komeetduik, Rênas’ jetpack dash. Once per jump, and a stomp gives it back!'), 5000);
}
const ARRIVE = {
  milo: 'Planeta Phonk… I can hear the bass from orbit. Milo has to be close.',
  lars: 'De Diepe Mijn. Smells like rocks. Lars lives here somewhere. Low down.',
  nathan: 'Homerun Heuvel! The whole planet is a baseball field. Nathan must be at home plate.',
  deniz: 'Brrr! The Hertogdom IJs. Everything is frozen, even the air. Somebody here has a LOT of aura.',
  fionn: 'Smaragdeiland! Green hills, old rocks, and… did that sheep just walk backwards? Fionn has to be here somewhere.',
  reshman: 'Whoa, Het Oerwoud! Giant trees, vines everywhere… and something up there is laughing at me. Oe oe?',
  lotte: 'Hot hot hot! De Asberg. The ground is glowing orange in places. I should probably not stand on that.',
  farah: 'Duinenrijk. Sand, sand, a pyramid, and… more sand. Something big is moving under the dunes.',
  kosmo: 'Maankrater! Whoa, I’m so light! Every step is a little jump. This is the best planet ever!',
  sami: 'Whoa, I’m underwater! Good thing my helmet is a fishbowl. Everything is blue… and something big just swam past.',
  saar: 'The Spookplaneet. It’s dark, it’s creaky, and… was that a ghost? I’m not scared. I’m a captain. …Hello?',
  werk: 'De Gouden Werkplaats! Everything is gold and gears and… is that Lars waving at me?',
};
function arrival(w) {
  const pl = w.main, rk = w.rocket, rDir = pl.c.clone().add(rk.g.position).normalize();
  const rPos = rk.g.position.clone();
  P.hidden = true;
  play([
    { dur: 3.4, title: [w.title, w.sub], cam: (t) => ({ pos: surf(pl, w.spawn.dir, 26).addScaledVector(anyPerp(w.spawn.dir).applyAxisAngle(w.spawn.dir, t * 0.25), 16), look: surf(pl, w.spawn.dir, 0), up: w.spawn.dir }),
      start: () => { rk.fire.visible = true; sfx.launch(); },
      update: (dt, k) => { rk.g.position.copy(rPos).addScaledVector(rDir, (1 - k) ** 2 * 30); if (Math.random() < 0.5) puff(rk.g.position.clone(), 2, 0xffb03a, 3, 0.4, rDir); } },
    { say: { who: 'RÊNAS', text: ARRIVE[w.id] }, cam: () => ({ pos: P.pos.clone().addScaledVector(P.up, 1.7).addScaledVector(P.fwd, 3.4).addScaledVector(anyPerp(P.up), 1.2), look: P.pos.clone().addScaledVector(P.up, 1.1), up: P.up.clone() }),
      start: () => { rk.g.position.copy(rPos); rk.fire.visible = false; P.hidden = false; squash(0.4); sfx.land(); puff(P.pos.clone(), 12, 0xffffff, 3, 0.6); } },
  ], () => { rk.g.position.copy(rPos); rk.fire.visible = false; P.hidden = false; toast(`Find ${w.friendName} and talk with E`, 3000); hud(); });
}

// ---------- flights (launch stars, Nathan's bat) ----------
let flight = null;
function fly(toPlanet, toDir, toFwd, onArrive) {
  G.state = 'flight';
  const from = P.pos.clone(), fu = P.up.clone(), to = surf(toPlanet, toDir, 0);
  const D = from.distanceTo(to);
  flight = { t: 0, dur: clamp(D / 48, 1.8, 3.2), from, p1: from.clone().addScaledVector(fu, D * 0.45), p2: to.clone().addScaledVector(toDir, D * 0.35), to, fu, tu: toDir.clone(), planet: toPlanet, toFwd, onArrive, prev: from.clone(), cpos: camera.position.clone(), cup: camera.up.clone() };
  sfx.launch(); setPrompt('');
}
function bez(f, e) {
  const u = 1 - e;
  return f.from.clone().multiplyScalar(u * u * u).addScaledVector(f.p1, 3 * u * u * e).addScaledVector(f.p2, 3 * u * e * e).addScaledVector(f.to, e * e * e);
}
function updateFlight(dt) {
  const f = flight;
  f.t += dt;
  const k = Math.min(1, f.t / f.dur), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
  const pos = bez(f, e);
  const up = f.fu.clone().lerp(f.tu, k * k * (3 - 2 * k)).normalize();
  const vel = pos.clone().sub(f.prev); f.prev.copy(pos);
  model.root.position.copy(pos);
  orientOn(model.root, up, vel.lengthSq() > 1e-8 ? vel : P.fwd);
  model.pivot.rotation.x = k < 0.82 ? k * 16 : model.pivot.rotation.x * 0.8;
  if (Math.random() < 0.8) puff(pos.clone(), 1, 0xffe27a, 0.4, 0.2, up);
  const vd = vel.lengthSq() > 1e-8 ? vel.clone().normalize() : up;
  f.cpos.lerp(pos.clone().addScaledVector(vd, -8).addScaledVector(up, 3), damp(5, dt));
  f.cup.lerp(up, damp(3, dt)).normalize();
  camera.position.copy(f.cpos); camera.up.copy(f.cup); camera.lookAt(pos);
  if (k >= 1) {
    flight = null;
    spawnPlayer(f.planet, f.tu, f.toFwd);
    squash(0.45); sfx.thud(); puff(P.pos.clone(), 16, 0xffffff, 4, 0.6);
    G.state = 'play';
    f.onArrive();
  }
}
// every story boss starts with full hearts (not the holograms in De Sterrentempel: there your hearts carry over)
function bossHeal() {
  if (P.hp >= P.maxHp) return;
  P.hp = P.maxHp; drawHearts(); sfx.heal();
  puff(P.pos.clone().addScaledVector(P.up, 1), 16, 0xff5a6e, 3, 1.2);
  toast(nl() ? '❤️ Harten vol voor het gevecht!' : '❤️ Hearts refilled for the fight!', 2000);
}
async function toArena(w, o = {}) {
  if (save.cleared[w.index] || w.boss.dead) { toast('You already beat this boss! ⚡'); return; }
  attempts = 1;
  const go = () => fly(w.arena, w.arenaSpawn.dir, w.arenaSpawn.fwd, () => { cur.onArena = true; applyLook(w, true); hud(); bossHeal(); bossIntro(w); });
  if (o.bat) {
    const npc = o.bat;
    play([
      { dur: 1.3, say: { who: 'NATHAN', text: 'Batter up! Hold still…' }, cam: ctx.talkCam(npc), update: (dt, k) => { npc.model.arm.rotation.y = -k * 1.8; } },
      { dur: 0.5, cam: ctx.talkCam(npc), start: () => { sfx.bat(); G.shake = 0.6; banner('HOME RUN!', 'Next stop: Zennith', '#ffe27a'); }, update: (dt, k) => { npc.model.arm.rotation.y = -1.8 + k * 3.4; } },
    ], () => { npc.model.arm.rotation.y = 0; go(); });
  } else go();
}
const BOSS_LINE = {
  milo: ['DJ MIAUWTRON', 'MIAUW. MIAUW. MIAUW. *drops a beat so hard the moon shakes*'],
  lars: ['GRUIS', '…mine. MINE. MY CRYSTAL. *hugs the core tighter*'],
  nathan: ['ZENNITH', 'Little astronaut. You want the core? Then hit my fastball. Nobody hits my fastball.'],
  deniz: ['DENIZ', 'So YOU are the little astronaut with all the aura. Cute. Let me show you what REAL aura looks like.'],
  fionn: ['LORCAN', 'Top o’ the mornin’, little astronaut! Fancy a game? Three pots, one Lorcan. Feelin’ lucky?'],
  reshman: ['KOKOS', 'HOO HOO HAA! A tiny bubble wants my core? I am KONING KOKOS! Bow to the king of the jungle!'],
  lotte: ['SMEUL', 'ROOOAR! Who dares to wake me from my nap? My Vuurkern is MINE! I will roast you like a marshmallow!'],
  farah: ['GRUIZEL', '*rumble rumble* …Something crunchy just landed in my sandbox. Snack time!'],
  sami: ['KRAAK', 'BLUB! A tiny fishbowl wants my shiny core? Eight arms say NO!'],
  saar: ['KONING BOE', 'BOOOO! …You didn’t flinch? Rude. I am KONING BOE, and this core is MINE!'],
  werk: ['TANDWIELTRON', 'BZZT. TINY ASTRONAUT DETECTED. Orders from Kayo and Yara: protect the Gouden Kern. Starting… SMASH MODE.'],
  kosmo: ['KAYO', 'MIAUW MIAUW!', '(Ratjetoe translates: “Meet MECHA-MIAUW 2.0, small human! This time we will WIN!”)'],
};
function bossFocus(w) { const b = w.boss; return (b.m || b.tw).position; }
function bossIntro(w) {
  music(w.bossMusic);
  const st = ws(w), b = w.boss, a = w.arena;
  const bp = () => bossFocus(w);
  const orbit = (t) => { const u = a.c.clone().sub(bp()).negate().normalize(); const side = anyPerp(u).applyAxisAngle(u, 0.6 + t * 0.35); return { pos: bp().clone().addScaledVector(u, 4).addScaledVector(side, 11), look: bp().clone().addScaledVector(u, 2), up: u }; };
  if (st.bossSeen) { showTitle(b.name, b.sub, 2200); startBoss(b); return; }
  play([
    { dur: 3, title: [w.arenaTitle, w.arenaSub], cam: orbit },
    { say: { who: BOSS_LINE[w.id][0], text: BOSS_LINE[w.id][1], sub: BOSS_LINE[w.id][2] }, cam: orbit, start: () => { sfx.meow(); G.shake = 0.4; } },
    { dur: 2.2, title: [b.name, b.sub], titleMs: 2000, cam: orbit },
  ], () => { st.bossSeen = true; persist(); startBoss(b); toast('Watch the attacks. Find the opening!', 2600); });
}
let attempts = 1;
// timers for the speedrun achievements, in play time (pauses and menus don't count)
let bossT0 = 0, planetT0 = 0;
function startBoss(b) { bossT0 = save.time; b.start(); }
function bossWon(w) {
  if (save.time - bossT0 < 60) unlockAch('bossfast');
  if (save.time - planetT0 < 300) unlockAch('planetfast');
  save.cleared[w.index] = true;
  save.tries[w.index] = save.tries[w.index] ? Math.min(save.tries[w.index], attempts) : attempts; persist();
  $('boss').classList.remove('show');
  sfx.win();
  const d = frameDir(P.up, 80, 0);
  const gk = buildGroteKern();
  const pk = w.addPickup(w.arena, d, 1.6, 'big', { model: gk.g, radius: 2.2, spin: 1.2, onTake: () => collectBig(w) });
  w.updaters.push((dt) => { gk.rays.rotation.z += dt; });
  void pk;
  toast(`Beaten in ${attempts} ${attempts === 1 ? 'try' : 'tries'}! Grab the Energiekern!`, 3400);
}
function collectBig(w) {
  // every boss hands back one of Raaf's eleven cores (the bosses gave theirs a name, like the IJskern)
  const side = SIDE_CORE[w.index], at = step(w.index);
  // the count covers every core in the game (Raaf's eleven and the bonus Gouden Kern), so it never looks stuck at "2 / 3"
  const cores = [0, 1, FINAL, ...Object.keys(SIDE_CORE).map(Number)], got = `${nl() ? 'kern' : 'core'} ${cores.filter((i) => save.cleared[i]).length} / ${cores.length}`;
  if (side) banner(side[0], `${nl() ? side[2] : side[1]} · ${got}`, { 3: '#9fe8ff', 4: '#9aff6a', 5: '#ffd23a', 6: '#ff9a2a', 7: '#ffe27a', 8: '#c8d8ff', 9: '#9fe8ff', 10: '#7dffb0', 11: '#ffd23a' }[w.index]);
  else banner('ENERGIEKERN!', got, '#ffe27a');
  sfx.rare();
  if (at >= 0) save.unlocked = Math.max(save.unlocked, Math.min(ORDER.length - 1, at + 1));
  persist();
  const atR = () => ({ pos: P.pos.clone().addScaledVector(P.up, 1.7).addScaledVector(P.fwd, 3.4).addScaledVector(anyPerp(P.up), 1.2), look: P.pos.clone().addScaledVector(P.up, 1.1), up: P.up.clone() });
  const steps = [{ dur: 2.2, cam: atR, start: () => { model.R.arms[0].rotation.z = -2.6; model.R.arms[1].rotation.z = 2.6; } }]
    .concat(w.winLines.map(([who, text, sub]) => ({ say: { who, text, sub }, cam: atR })));
  setTimeout(() => play(steps, async () => {
    if (w.index === BONUS) { attempts = 1; showEnd(); if (side) toast(nl() ? side[4] : side[3], 3600); return; }
    if (w.index !== FINAL) {
      attempts = 1;
      const next = ORDER[at + 1];
      if (!w.rocket) { await loadWorld(next); if (side) toast(nl() ? side[4] : side[3], 3600); return; }
      // back to the planet, next to your rocket: the core is in, so you fly on from there yourself
      backFromArena(w, () => {
        w.nextStop = next; w.nextName = NAMES[next][0]; hud();
        if (side) toast(nl() ? side[4] : side[3], 3400);
        setTimeout(() => toast(nl() ? `🚀 Je raket is volgetankt! Stap in om naar ${w.nextName} te vliegen.` : `🚀 Your rocket is fueled! Get in to fly on to ${w.nextName}.`, 4200), side ? 3600 : 400);
      });
      return;
    }
    // the finale, back on Homerun Heuvel
    G.state = 'loading';
    await fade(true, 500);
    cur.onArena = false; applyLook(w, false); w.boss.g.visible = false; showHud(false);
    G.state = 'play';
    await fade(false, 600);
    playFinale(w, () => { if (!save.finale) save.finaleTime = save.time; save.finale = true; persist(); showCredits(showEnd); });   // finaleTime: for the speedrun achievements
  }), 900);
}

// after a boss: the Launch Star flies you from the arena back down to the planet, right next to your rocket
function backFromArena(w, done) {
  const pl = w.main, rd = dirOf(pl, w.rocket.g.position), land = frameDir(rd, 90 - 3.6, 0);
  fly(pl, land, tangentTo(land, rd), () => { cur.onArena = false; applyLook(w, false); music(w.music); hud(); done(); });
}
// leaving a planet in your rocket: Rênas climbs in, the rocket fires up and shoots into space. Then the next planet
// loads, where the same rocket lands (see arrival). Without a rocket close by (parkour planets) you just go.
function depart(go) {
  const w = cur.w, rk = w && w.rocket;
  if (!rk || cur.onArena || P.planet !== w.main || P.pos.distanceTo(rk.g.position) > 9) { go(); return; }
  const pl = w.main, rDir = dirOf(pl, rk.g.position), rPos = rk.g.position.clone(), side = anyPerp(rDir);
  setPrompt('');
  play([
    { dur: 0.6, cam: () => ({ pos: rPos.clone().addScaledVector(rDir, 2).addScaledVector(side, 9), look: rPos.clone().addScaledVector(rDir, 1.6), up: rDir }),
      start: () => { P.hidden = true; puff(P.pos.clone(), 10, 0xffffff, 3, 0.6); sfx.select(); } },
    { dur: 2.2, cam: () => ({ pos: rPos.clone().addScaledVector(rDir, 3).addScaledVector(side, 13), look: rk.g.position, up: rDir }),
      start: () => { rk.fire.visible = true; sfx.launch(); G.shake = 0.35; },
      update: (dt, k) => { rk.g.position.copy(rPos).addScaledVector(rDir, k * k * 45); if (Math.random() < 0.7) puff(rk.g.position.clone(), 2, 0xffb03a, 3, 0.4, rDir); } },
  ], () => go());
}

// a parkour planet is done when you land on the star gate: the host cheers, then on to the next planet on the route
function parkDone(w) {
  const at = step(w.index), first = !save.cleared[w.index];
  save.cleared[w.index] = true;
  save.tries[w.index] = save.tries[w.index] ? Math.min(save.tries[w.index], w.falls + 1) : w.falls + 1;
  if (at >= 0) save.unlocked = Math.max(save.unlocked, Math.min(ORDER.length - 1, at + 1));   // a side trip (Zweefrijk) doesn't move the route on
  persist();
  sfx.win(); banner(nl() ? 'PARKOUR GEHAALD!' : 'PARKOUR CLEARED!', nl() ? `${w.falls}× gevallen` : `${w.falls}× fallen`, '#5ef2e0');
  puff(P.pos.clone().addScaledVector(P.up, 1), 30, 0xffd23a, 5, 2);
  const steps = [{ dur: 1.6, cam: w.winCam }].concat((first ? w.winLines : w.winLines.slice(-1)).map(([who, text, sub]) => ({ say: { who, text, sub }, cam: w.winCam })));
  // the star gate pulls you up and flings you to the next planet, where your rocket lands
  const warp = [{ dur: 1.3, cam: w.winCam, start: () => { sfx.launch(); G.shake = 0.3; puff(P.pos.clone().addScaledVector(P.up, 1), 34, 0x9fe8ff, 6, 1.6, P.up); P.hidden = true; } }];
  setTimeout(() => play(steps, async () => { if (at < 0) { openTravel(); return; } play(warp, () => loadWorld(ORDER[at + 1])); }), 700);
}

// ---------- De Sterrentempel: hologram fights (this game's Godhome) ----------
// A fight builds the boss's own world and puts you straight on its arena. Winning brings you back to the temple
// (or on to the next hologram in a pantheon), dying sends you back to the temple. Nothing in the story changes.
const god = () => (save.god = save.god || { hall: {}, pan: {} });
const tierName = (k) => (nl() ? TIERS[k][1] : TIERS[k][0]);
const panName = (n) => (nl() ? PANTHEONS[n].nl : PANTHEONS[n].en);
function godCard() {
  const g = god(), h = HALL.filter((i) => (g.hall[i] || 0) > 0).length, p = [0, 1, 2, 3].filter((n) => g.pan[n] && g.pan[n].done).length;
  return `${nl() ? 'met' : 'with'} Josh · 🏛️ ${h}/${HALL.length} ${nl() ? 'beelden' : 'statues'} · 🚪 ${p}/4 pantheons`;
}
function endGod() {
  if (G.godMax0 !== undefined) P.maxHp = G.godMax0;
  G.godMax0 = undefined; G.god = null; G.noDash = false;
}
function godOverlay(title, sub, items) {
  G.paused = true; if (document.pointerLockElement) document.exitPointerLock();
  $('godTitle').textContent = title; $('godSub').innerHTML = sub;
  const list = $('godList'); list.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button'); b.className = 'planet';
    b.innerHTML = `<span class="orb" style="--c:${it.col}"></span><span class="pt"><b>${it.big}</b><small>${it.small}</small></span>`;
    b.onclick = () => { sfx.select(); it.onclick(); };
    b.addEventListener('mouseenter', () => sfx.move());
    list.appendChild(b);
  }
  $('god').classList.add('show');
}
function godStatue(idx) {
  const best = god().hall[idx] || 0;
  godOverlay(GOD_BOSS[idx][0], `${NAMES[idx][0]} · ${nl() ? 'beste' : 'best'}: ${best ? `${'⭐'.repeat(best)} ${tierName(best - 1)}` : '—'}`,
    TIERS.map((t, k) => ({
      col: ['#9fe8ff', '#d8d8e8', '#ffd23a'][k], big: `${'⭐'.repeat(k + 1)} ${tierName(k)}${best > k ? ' ✅' : ''}`, small: nl() ? t[3] : t[2],
      onclick: () => { closeOverlays(); godStart({ kind: 'hall', idx, tier: k }); },
    })));
}
const godSel = [false, false, false, false];
function godDoor(n) {
  const pn = PANTHEONS[n], rec = god().pan[n];
  const recTxt = rec && rec.done
    ? `✅ ${nl() ? 'gehaald' : 'cleared'} · ${BINDS.map((b, k) => (rec.b[k] ? b[0] : '·')).join(' ')}${rec.all ? ' · 🌟' : ''}${rec.nohit ? (nl() ? ' · 👑 zonder klap' : ' · 👑 no hits') : ''}`
    : (nl() ? 'nog niet gehaald' : 'not cleared yet');
  const draw = () => godOverlay(panName(n),
    `${pn.seq.map((i) => GOD_BOSS[i][0]).join(' · ')}${pn.rest ? (nl() ? '<br>🛋️ twee rustpunten: harten weer vol' : '<br>🛋️ two rest stops: hearts refilled') : ''}<br>${recTxt}<br><small>${nl() ? 'Kies bindingen (mag ook geen):' : 'Pick bindings (or none):'}</small>`,
    BINDS.map((b, k) => ({
      col: godSel[k] ? '#ff5a6e' : '#8a8698', big: `${godSel[k] ? '☑' : '☐'} ${b[0]} ${nl() ? b[2] : b[1]}${rec && rec.b[k] ? ' ✅' : ''}`, small: nl() ? b[4] : b[3],
      onclick: () => { godSel[k] = !godSel[k]; draw(); },
    })).concat([{
      col: pn.col, big: `▶ ${nl() ? 'Begin' : 'Start'}`, small: `${pn.seq.length} ${nl() ? 'bazen achter elkaar, harten gaan mee' : 'bosses back to back, hearts carry over'}`,
      onclick: () => { closeOverlays(); godStart({ kind: 'pan', n, seq: pn.seq, rest: pn.rest || [], binds: godSel.slice() }); },
    }]));
  draw();
}
function godStart(o) {
  const b = o.binds || [false, false, false, false];
  const max0 = shopMaxHp();   // the extra heart from Knabbels Werkplaats counts in the temple too
  const maxHp = o.kind === 'hall' ? (o.tier === 2 ? 1 : max0) : (b[0] ? Math.min(2, max0) : max0);
  G.god = { ...o, binds: b, i: 0, hit: false, maxHp, hp: maxHp, lastHp: maxHp, speed: (o.kind === 'hall' && o.tier ? 1.15 : 1) * (b[3] ? 1.25 : 1) };
  G.godMax0 = max0; G.noDash = !!b[1];
  attempts = 1;
  godLoad();
}
async function godLoad() {
  const g = G.god, idx = g.kind === 'hall' ? g.idx : g.seq[g.i];
  G.state = 'loading';
  await fade(true, 380);
  if (G.world) G.world.destroy();
  clearParticles(); $('boss').classList.remove('show'); setPrompt('');
  const w = BUILDERS[idx](ctx);
  addSystemSun(w, idx, NAMES.map((n) => n[2]));
  G.world = w; cur.w = w; cur.idx = idx; cur.onArena = true;
  const b = w.boss;
  if (g.kind === 'hall' && g.tier) { b.maxHp += 1; b.hp = b.maxHp; }
  b.onWin = () => godWon(w);
  if (g.binds[2]) w.dropHeart = () => null;   // Hartband
  applyLook(w, true);
  spawnPlayer(w.arena, w.arenaSpawn.dir, w.arenaSpawn.fwd);
  P.maxHp = g.maxHp; P.hp = Math.max(1, Math.min(g.maxHp, g.hp)); g.lastHp = P.hp; drawHearts();
  music(w.bossMusic); showHud(true); hud();
  G.state = 'play';
  await fade(false, 450);
  showTitle(b.name, g.kind === 'hall' ? `${'⭐'.repeat(g.tier + 1)} ${tierName(g.tier)}` : `${panName(g.n)} · ${g.i + 1} / ${g.seq.length}`, 1800);
  setTimeout(() => { if (G.god === g && cur.w === w && !b.dead) startBoss(b); }, 1400);
}
function godWon(w) {
  const g = G.god; if (!g || cur.w !== w) return;
  $('boss').classList.remove('show');
  if (g.kind === 'hall') {
    const gs = god(); gs.hall[g.idx] = Math.max(gs.hall[g.idx] || 0, g.tier + 1); persist();
    banner(nl() ? 'HOLOGRAM VERSLAGEN!' : 'HOLOGRAM BEATEN!', `${'⭐'.repeat(g.tier + 1)} ${tierName(g.tier)}${g.hit ? '' : (nl() ? ' · zonder klap!' : ' · no hits!')}`, '#ffd23a');
    setTimeout(() => godHome(g), 2600);
    return;
  }
  g.i++; g.hp = P.hp;
  if (g.i < g.seq.length) {
    if (g.rest.includes(g.i)) { g.hp = g.maxHp; banner(nl() ? 'RUSTPUNT' : 'REST STOP', nl() ? 'Harten weer vol!' : 'Hearts refilled!', '#7dffb0'); }
    else banner(`${g.i} / ${g.seq.length}`, nl() ? 'Volgend hologram…' : 'Next hologram…', '#9fe8ff');
    setTimeout(() => { if (G.god === g) godLoad(); }, 2400);
    return;
  }
  const gs = god(), rec = gs.pan[g.n] || { done: false, b: [false, false, false, false], all: false, nohit: false };
  rec.done = true; g.binds.forEach((v, k) => { if (v) rec.b[k] = true; });
  if (g.binds.every(Boolean)) rec.all = true;
  if (!g.hit) rec.nohit = true;
  gs.pan[g.n] = rec; persist();
  banner(nl() ? 'PANTHEON GEHAALD!' : 'PANTHEON CLEARED!', panName(g.n), '#ffd23a');
  setTimeout(() => godHome(g, g.n === 3 ? 'p4' : 'pan'), 2800);
}
async function godHome(g, msg, note) {
  ctx.godFrom = g.kind === 'hall' ? { statue: HALL.indexOf(g.idx) } : { door: g.n };
  await loadWorld(TEMPLE);
  if (msg && cur.w && cur.w.celebrate) cur.w.celebrate(msg, g);
  if (note) toast(note, 3400);
}
async function godFail() {
  const g = G.god;
  save.deaths++; persist();
  G.state = 'over'; sfx.hurt();
  toast(nl() ? 'Oei! Het hologram wint deze keer.' : 'Oei! The hologram wins this time.', 1600);
  await wait(1000);
  godHome(g, null, g.kind === 'pan'
    ? (nl() ? `Gevallen bij hologram ${g.i + 1} van ${g.seq.length}. Probeer het nog eens!` : `Fell at hologram ${g.i + 1} of ${g.seq.length}. Try again!`)
    : (nl() ? 'Probeer het nog eens!' : 'Try again!'));
}

// ---------- dying ----------
G.onDie = async () => {
  if (G.god) { godFail(); return; }
  save.deaths++; persist();
  G.state = 'over'; sfx.hurt();
  toast('Oei! Try again!', 1600);
  await wait(900);
  await fade(true, 400);
  const w = cur.w;
  if (cur.onArena) {
    attempts++;
    w.boss.reset();
    for (const e of w.enemies) if (e.type === 'drone' && !e.dead) e.kill(true);
    spawnPlayer(w.arena, w.arenaSpawn.dir, w.arenaSpawn.fwd);
  } else if (w.respawn) w.respawn();   // parkour planets: back to the last beacon
  else spawnPlayer(w.main, w.spawn.dir, w.spawn.fwd);
  P.hp = P.maxHp; drawHearts();
  G.state = 'play';
  await fade(false, 400);
  if (cur.onArena) { showTitle(w.boss.name, `Attempt ${attempts}`, 1800); setTimeout(() => { if (cur.onArena && !w.boss.dead) startBoss(w.boss); }, 1200); }
};
G.onHazard = (pf) => { if (P.inv <= 0 && !P.dead) hurtPlayer(surf(pf.planet, pf.n, P.alt)); };
G.onPoundLand = (pos, ground) => { if (G.world) G.world.onPound(pos); if (cur.onArena && cur.w && cur.w.boss.onPound) cur.w.boss.onPound(pos, ground); };

// ---------- menus ----------
let menuWorld = null;
function openMenu() {
  applyStyle();   // this save's suit, hat and flame
  endGod();
  P.maxHp = shopMaxHp();   // 4 hearts with the extra heart from Knabbels Werkplaats
  if (G.world) G.world.destroy();
  clearParticles(); $('boss').classList.remove('show'); setPrompt('');
  menuWorld = buildIntro(); G.world = menuWorld; cur.w = null; cur.onArena = false;
  applyLook(menuWorld, false);
  spawnPlayer(menuWorld.main, menuWorld.spawn.dir, menuWorld.spawn.fwd);
  P.hidden = false;
  showHud(false);
  G.state = 'menu';
  $('menu').classList.add('show'); panel('main');
  $('btnPlay').textContent = tr(save.introSeen ? 'Continue' : 'Start the adventure');
  slotLabel();
  if (document.pointerLockElement) document.exitPointerLock();
  music('menu');
}
function slotLabel() { $('btnSlots').textContent = `💾 ${nl() ? 'Opslag' : 'Save'} ${slot}`; }
const SLOT_COL = ['#5ef2e0', '#ffd23a', '#ff5ab4'];
function buildSlots() {
  const list = $('slotList'); list.innerHTML = '';
  for (let n = 1; n <= SLOTS; n++) {
    const s = peek(n);
    let info;
    if (!s || !s.introSeen) info = nl() ? 'leeg · nieuw avontuur' : 'empty · new adventure';
    else {
      const beat = s.cleared.filter(Boolean).length, mins = Math.floor(s.time / 60);
      info = s.finale ? (nl() ? '✅ uitgespeeld' : '✅ finished') : `🪐 ${NAMES[resumeAt(s)][0]}`;
      info += ` · ⚙️ ${Object.keys(s.rares).length}/${RARE_TOTAL} · 👾 ${beat}/${NAMES.length - 1} · ⏱ ${mins} min`;
    }
    const b = document.createElement('button'); b.className = 'planet' + (n === slot ? ' current' : '');
    b.innerHTML = `<span class="orb" style="--c:${SLOT_COL[n - 1]}"></span><span class="pt"><b>${nl() ? 'Opslag' : 'Save'} ${n}${n === slot ? (nl() ? ' · gekozen' : ' · selected') : ''}</b><small>${info}</small></span>`;
    b.onclick = () => { sfx.select(); useSlot(n); };
    // each save is one card: the save itself, and under it three equal buttons (send, receive, delete).
    // Buttons that don't apply to an empty save stay in place but greyed out, so every card lines up.
    const card = document.createElement('div'); card.className = 'slotCard';
    card.appendChild(b);
    const row = document.createElement('div'); row.className = 'slotActs';
    const act = (label, fn, on = true, cls = '') => {
      const a = document.createElement('button'); a.className = 'btn small' + (cls ? ' ' + cls : ''); a.textContent = label; a.disabled = !on;
      a.onclick = () => { sfx.select(); fn(); }; a.addEventListener('mouseenter', () => on && sfx.move()); row.appendChild(a);
    };
    const has = !!s, armed = delArm === n;
    act(nl() ? '📤 Doorsturen' : '📤 Send', () => openShare(n, 'out'), has);
    act(nl() ? '📥 Ontvangen' : '📥 Receive', () => openShare(n, 'in'));
    act(armed ? (nl() ? '⚠️ Zeker?' : '⚠️ Sure?') : (nl() ? '🗑️ Verwijderen' : '🗑️ Delete'), () => delSlot(n), has, armed ? 'warn' : '');
    card.appendChild(row);
    list.appendChild(card);
  }
}
// ---------- sending and deleting saves ----------
// A save travels as a text code (BINAS1:…) you can paste into a chat, or as a small text file with that code in it.
const CODE = 'BINAS1:';
const enc = (o) => CODE + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
function dec(txt) {
  txt = (txt || '').trim();
  let o = null;
  const i = txt.indexOf(CODE);
  try { o = i >= 0 ? JSON.parse(decodeURIComponent(escape(atob(txt.slice(i + CODE.length).replace(/\s+/g, ''))))) : JSON.parse(txt); } catch (e) { return null; }
  return o && typeof o === 'object' && Array.isArray(o.cleared) ? o : null;
}
let shareSlot = 1, shareMode = 'out', delArm = 0;
function openShare(n, mode) {
  shareSlot = n; shareMode = mode; delArm = 0;
  const out = mode === 'out';
  if (out && n === slot) persist();
  const raw = out ? (() => { try { return JSON.parse(localStorage.getItem(keyOf(n))); } catch (e) { return null; } })() : null;
  $('shareTitle').textContent = out ? `📤 ${nl() ? 'Opslag' : 'Save'} ${n} ${nl() ? 'doorsturen' : 'send'}` : `📥 ${nl() ? 'Save ontvangen in opslag' : 'Receive a save into slot'} ${n}`;
  $('shareInfo').textContent = out
    ? (nl() ? 'Kopieer deze code en stuur hem naar iemand, of naar jezelf op een andere computer. Je kunt hem ook als bestand downloaden.' : 'Copy this code and send it to someone, or to yourself on another computer. You can also download it as a file.')
    : (nl() ? `Plak hier een save-code, of kies een save-bestand. Let op: wat nu in opslag ${n} staat, wordt overschreven.` : `Paste a save code here, or pick a save file. Careful: whatever is in slot ${n} now gets replaced.`);
  const ta = $('shareCode');
  ta.value = out && raw ? enc(raw) : ''; ta.readOnly = out;
  ta.placeholder = out ? '' : 'BINAS1:…';
  for (const id of ['btnShareCopy', 'btnShareFile']) $(id).style.display = out ? '' : 'none';
  for (const id of ['btnShareLoad', 'btnSharePick']) $(id).style.display = out ? 'none' : '';
  panel('share');
  if (out) ta.select(); else ta.focus();
}
function shareCopy() {
  const ta = $('shareCode'); ta.select();
  const ok = () => toast(nl() ? '📋 Gekopieerd! Plak hem in een berichtje.' : '📋 Copied! Paste it into a message.', 2600);
  const old = () => { try { document.execCommand('copy'); ok(); } catch (e) { toast(nl() ? 'Kopiëren lukt niet: selecteer de code en druk Cmd+C.' : 'Copying didn’t work: select the code and press Cmd+C.', 3200); } };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(ok, old); else old();
}
function shareFile() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([$('shareCode').value], { type: 'text/plain' }));
  a.download = `binas-in-orbit-${nl() ? 'opslag' : 'save'}-${shareSlot}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function shareLoad() {
  const o = dec($('shareCode').value);
  if (!o) { sfx.warn && sfx.warn(); toast(nl() ? 'Deze code klopt niet. Heb je hem helemaal gekopieerd?' : 'That code doesn’t work. Did you copy all of it?', 3200); return; }
  try { localStorage.setItem(keyOf(shareSlot), JSON.stringify(migrate(o))); } catch (e) { toast(nl() ? 'Opslaan lukt niet in deze browser.' : 'This browser won’t save.', 3000); return; }
  if (shareSlot === slot) { save = load(); G.coins = save.coins; $('btnPlay').textContent = tr(save.introSeen ? 'Continue' : 'Start the adventure'); }
  sfx.rare(); toast(nl() ? `✅ Save geladen in opslag ${shareSlot}!` : `✅ Save loaded into slot ${shareSlot}!`, 2800);
  buildSlots(); panel('slots');
}
function delSlot(n) {
  if (delArm !== n) { delArm = n; buildSlots(); toast(nl() ? `Klik nog eens op ⚠️ om opslag ${n} te wissen.` : `Click ⚠️ again to delete save ${n}.`, 2600); return; }   // the first click only asks
  delArm = 0;
  try { localStorage.removeItem(keyOf(n)); } catch (e) { /* no storage */ }
  if (n === slot) { save = DEF(); G.coins = 0; $('btnPlay').textContent = tr('Start the adventure'); }
  toast(nl() ? `🗑️ Opslag ${n} is verwijderd.` : `🗑️ Save ${n} deleted.`, 2400);
  buildSlots();
}
function panel(name) { if (name !== 'planets') closeGalaxy(); for (const p of document.querySelectorAll('.panel')) p.classList.toggle('show', p.dataset.p === name); $('menu').scrollTop = 0; }
function buildPlanetCards() {
  const list = $('planetList'); list.innerHTML = ''; planetItems = []; let lastS = null;
  ORDER.concat(BONUS, TEMPLE, ZWEEF).forEach((i) => { const [nm, friend, col] = NAMES[i];
    const open = (i === ZWEEF ? zweefOpen(save) : i === BONUS || i === TEMPLE ? save.finale : step(i) <= save.unlocked) && save.introSeen;
    const rares = Object.keys(save.rares).filter((k) => k.startsWith(['milo', 'lars', 'nathan', 'deniz', 'fionn', 'reshman', 'lotte', 'farah', 'kosmo', 'sami', 'saar', 'werk', 'stuiter', 'wissel', 'sprong', 'tempel', 'zweef'][i])).length;
    const b = document.createElement('button'); b.className = 'planet' + (open ? '' : ' locked');
    b.innerHTML = `<span class="orb" style="--c:${col}"></span><span class="pt"><b>${nm}</b><small>${open ? `${nl() ? 'met' : 'with'} ${friend} · ⚙️ ${rares}/${RARES_PER[i]}${save.cleared[i] ? ` · ✅ ${save.tries[i] ? save.tries[i] + (save.tries[i] === 1 ? (nl() ? ' poging' : ' try') : (nl() ? ' pogingen' : ' tries')) : ''}` : ''}` : i === ZWEEF ? (nl() ? "🔒 zijtrip · bereik eerst Stuiterstad" : "🔒 side trip · reach Stuiterstad first") : i === BONUS || i === TEMPLE ? (nl() ? "🔒 bonus · speel eerst de finale" : "🔒 bonus · beat the finale first") : (nl() ? '🔒 op slot' : '🔒 locked')}</small></span>`;
    if (i === TEMPLE && open) b.querySelector('small').textContent = godCard();
    if (open) b.onclick = () => { sfx.select(); closeOverlays(); loadWorld(i); };
    const sy = sysOf(i); if (sy !== lastS) { list.appendChild(sysHead(sy, open)); lastS = sy; }
    planetItems.push({ idx: i, name: nm, col, open, sys: sy, info: b.querySelector('small').innerHTML, go: () => { closeOverlays(); loadWorld(i); } });
    list.appendChild(b);
  });
}
// a heading with the solar system's name and its sun, above its planets in a list
function sysHead(sy, known) {
  const h = document.createElement('div'); h.className = 'sysHead'; h.style.setProperty('--sun', sy.sun);
  h.innerHTML = `<span class="sun"></span>${known ? sysName(sy, nl()) : (nl() ? '🔒 Onbekend zonnestelsel' : '🔒 Unknown solar system')}`;
  return h;
}
let planetItems = [];   // the same planets, for the turning-planet picker (galaxy.js)
function closeOverlays() { closeGalaxy(); closeShop(); $('menu').classList.remove('show'); $('travel').classList.remove('show'); $('pause').classList.remove('show'); $('god').classList.remove('show'); G.paused = false; }
function openTravel() {
  G.paused = true; if (document.pointerLockElement) document.exitPointerLock();
  const list = $('travelList'); list.innerHTML = ''; let lastS = null;
  // the next planet on the route goes on top, big and golden, so after a boss you know where to go
  const at = step(cur.idx), nxt = cur.w && cur.w.nextStop !== undefined ? cur.w.nextStop
    : save.cleared[cur.idx] && at >= 0 && ORDER[at + 1] !== undefined && !save.cleared[ORDER[at + 1]] ? ORDER[at + 1] : undefined;
  if (nxt !== undefined) {
    const [nm, friend, col] = NAMES[nxt], b = document.createElement('button');
    b.className = 'planet'; b.style.cssText = 'border-color:#ffd23a;box-shadow:0 0 0 3px #ffd23a,4px 5px 0 var(--ink)';
    b.innerHTML = `<span class="orb" style="--c:${col}"></span><span class="pt"><b>⭐ ${nm}</b><small>${nl() ? 'volgende stop · vlieg naar' : 'next stop · fly to'} ${friend}</small></span>`;
    b.onclick = () => { sfx.select(); closeOverlays(); depart(() => loadWorld(nxt)); };
    list.appendChild(b);
  }
  // every planet is in the list; the ones you haven't reached yet are grey and locked, so you can see what's still coming
  ORDER.concat(BONUS, TEMPLE, ZWEEF).forEach((i) => { const [nm, friend, col] = NAMES[i];
    const open = i === ZWEEF ? zweefOpen(save) : i === BONUS || i === TEMPLE ? !!save.finale : step(i) <= save.unlocked;
    const b = document.createElement('button'); b.className = 'planet' + (open ? '' : ' locked');
    const why = i === ZWEEF ? (nl() ? '🔒 zijtrip · bereik eerst Stuiterstad' : '🔒 side trip · reach Stuiterstad first')
      : i === BONUS || i === TEMPLE ? (nl() ? '🔒 bonus · speel eerst de finale' : '🔒 bonus · beat the finale first') : (nl() ? '🔒 op slot · nog niet bereikt' : '🔒 locked · not reached yet');
    b.innerHTML = `<span class="orb" style="--c:${col}"></span><span class="pt"><b>${nm}</b><small>${!open ? why : i === cur.idx ? (nl() ? 'je bent hier' : 'you are here') : `${nl() ? 'vlieg naar' : 'fly to'} ${friend}`}</small></span>`;
    if (open) b.onclick = () => { sfx.select(); closeOverlays(); if (i !== cur.idx) depart(() => loadWorld(i)); };
    else { b.disabled = true; b.title = why; }
    const sy = sysOf(i); if (sy !== lastS) { list.appendChild(sysHead(sy, true)); lastS = sy; }
    list.appendChild(b);
  });
  $('travel').classList.add('show');
}
// end credits after the finale: they roll up by themselves, Skip / Esc / Enter jumps straight to the end screen
function showCredits(done) {
  showHud(false);
  const el = $('credits'), roll = $('crRoll'), was = G.paused;
  G.paused = true; if (document.pointerLockElement) document.exitPointerLock();
  roll.style.animation = 'none'; void roll.offsetWidth; roll.style.animation = '';   // restart the roll
  el.classList.add('show');
  let over = false;
  const finish = () => {
    if (over) return; over = true;
    el.classList.remove('show'); roll.onanimationend = null; removeEventListener('keydown', key);
    G.paused = was; done();
  };
  const key = (e) => { if (['Escape', 'Enter', 'Space', 'KeyE'].includes(e.code)) finish(); };
  roll.onanimationend = finish;
  $('btnCrSkip').onclick = () => { sfx.select(); finish(); };
  addEventListener('keydown', key);
}
function showEnd() {
  showHud(false);
  const m = Math.floor(save.time / 60), s = Math.floor(save.time % 60);
  $('endStats').innerHTML = `<div><b>${Object.keys(save.rares).length}/${RARE_TOTAL}</b><small>${nl() ? "gouden tandwielen" : "golden gears"}</small></div><div><b>${G.coins}</b><small>${nl() ? "bouten" : "bolts"}</small></div><div><b>${save.deaths}</b><small>${nl() ? 'keer “oei!”' : 'times “oei!”'}</small></div><div><b>${m}:${String(s).padStart(2, '0')}</b><small>${nl() ? 'speeltijd' : 'play time'}</small></div>`
    + (save.cleared[BONUS] ? `<div><b>🏆</b><small>${nl() ? 'bonusplaneet gehaald' : 'bonus planet cleared'}${save.trophy ? (nl() ? ' · Gouden Rênas!' : ' · Golden Rênas!') : ''}</small></div>`
      : `<div style="flex-basis:100%"><small>${nl() ? '✨ Nieuwe bonusplaneet: De Gouden Werkplaats! Kies hem bij 🪐 Planeten.' : '✨ New bonus planet: De Gouden Werkplaats! Pick it under 🪐 Planets.'}</small></div>`)
    + `<div style="flex-basis:100%"><small>${nl() ? `🏛️ De Sterrentempel is open: Josh wacht op je! (${godCard()})` : `🏛️ De Sterrentempel is open: Josh is waiting for you! (${godCard()})`}</small></div>`;
  $('end').classList.add('show');
  if (document.pointerLockElement) document.exitPointerLock();
}

$('btnPlay').onclick = () => {
  initAudio(); sfx.select();
  if (!save.introSeen) { $('menu').classList.remove('show'); G.state = 'play'; playIntro(menuWorld, () => { save.introSeen = true; persist(); loadWorld(0); }); }
  else { closeOverlays(); loadWorld(resumeAt(save)); }
};
$('btnPlanets').onclick = () => { initAudio(); sfx.select(); buildPlanetCards(); panel('planets'); openGalaxy(planetItems, save.last || 0); };
// ---------- the speedrun timer (switch it on under ⚙️ Settings) ----------
// Play time of this save, time since you landed on this planet, and the boss fight. Menus and pauses don't count.
const TIMER_KEY = 'renas-rocket-rumble-timer';
let timerOn = false;
try { timerOn = localStorage.getItem(TIMER_KEY) === '1'; } catch (e) { /* no storage */ }
const fmtT = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
function timerLabel() { const b = $('btnTimer'); b.textContent = `⏱ Speedrun-timer: ${timerOn ? (nl() ? 'AAN' : 'ON') : (nl() ? 'UIT' : 'OFF')}`; b.classList.toggle('on', timerOn); }
function timerTick() {
  const el = $('speedrun'), show = timerOn && !!cur.w && document.body.classList.contains('ingame');
  el.style.display = show ? 'block' : 'none';
  if (!show) return;
  const b = cur.w.boss, fight = cur.onArena && b && b.state === 'fight';
  el.innerHTML = `⏱ <b>${fmtT(save.time)}</b><br>🪐 ${fmtT(save.time - planetT0)}${fight ? `<br><span class="boss">👾 ${fmtT(save.time - bossT0)}</span>` : ''}`;
}
$('btnTimer').onclick = () => {
  initAudio(); sfx.select(); timerOn = !timerOn;
  try { localStorage.setItem(TIMER_KEY, timerOn ? '1' : '0'); } catch (e) { /* no storage */ }
  timerLabel();
};
$('btnShop').onclick = () => { initAudio(); sfx.select(); openShop('menu'); };
$('btnTravelShop').onclick = () => { sfx.select(); openShop('travel'); };
$('btnAch').onclick = () => { initAudio(); sfx.select(); buildAchPanel(); panel('ach'); };
$('btnSlots').onclick = () => { initAudio(); sfx.select(); delArm = 0; buildSlots(); panel('slots'); };
$('btnShareCopy').onclick = () => { sfx.select(); shareCopy(); };
$('btnShareFile').onclick = () => { sfx.select(); shareFile(); };
$('btnShareLoad').onclick = () => { sfx.select(); shareLoad(); };
$('btnSharePick').onclick = () => { sfx.select(); $('shareFileIn').value = ''; $('shareFileIn').click(); };
$('shareFileIn').onchange = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; f.text().then((t) => { $('shareCode').value = t.trim(); shareLoad(); }); };
$('btnShareBack').onclick = () => { sfx.move(); buildSlots(); panel('slots'); };
$('btnControls').onclick = () => { initAudio(); sfx.select(); panel('controls'); };
$('btnNew').onclick = () => { initAudio(); sfx.select(); panel('confirm'); };
$('btnYes').onclick = () => { save = DEF(); G.coins = 0; persist(); sfx.select(); openMenu(); };
for (const b of document.querySelectorAll('[data-back]')) b.onclick = () => { sfx.move(); panel('main'); };
for (const b of document.querySelectorAll('button')) b.addEventListener('mouseenter', () => sfx.move());
$('btnResume').onclick = () => { closeOverlays(); requestLock(); };
$('btnMenu').onclick = () => { closeOverlays(); openMenu(); };
$('btnTravelClose').onclick = () => { closeOverlays(); };
$('btnGodClose').onclick = () => { sfx.move(); closeOverlays(); };
$('btnTravelMenu').onclick = () => { closeOverlays(); openMenu(); };
$('btnEnd').onclick = () => { $('end').classList.remove('show'); openMenu(); };
$('sens').oninput = (e) => { cam.sens = +e.target.value; };
// language: the 🌐 button in the main menu and the pause menu switches between English and Nederlands
function langLabel() { for (const id of ['btnLang', 'btnLang2']) { const b = $(id); if (b) b.textContent = LANG.cur === 'nl' ? '🌐 English' : '🌐 Nederlands'; } }
for (const id of ['btnLang', 'btnLang2']) $(id).onclick = () => { initAudio(); sfx.select(); setLang(LANG.cur === 'nl' ? 'en' : 'nl'); };
onLang(() => { langLabel(); slotLabel(); timerLabel(); $('btnPlay').textContent = tr(save.introSeen ? 'Continue' : 'Start the adventure'); buildPlanetCards(); if (galaxyOpen()) openGalaxy(planetItems, galaxyIdx()); buildSlots(); hud(); });
applyHTML(); langLabel(); slotLabel(); timerLabel();

// pointer lock: click the game to lock the mouse, Esc (or losing it) pauses
$('c').addEventListener('click', () => { initAudio(); if (G.state === 'play' && !cutActive() && !locked() && !G.paused && !G.duelPad) requestLock(); });
document.addEventListener('pointerlockchange', () => {
  if (locked()) { G.lockedOnce = true; $('lockhint').classList.remove('show'); return; }
  if (G.state === 'play' && !G.vr && !cutActive() && !G.paused && !G.duelPad && !G.devOpen && G.lockedOnce && !$('travel').classList.contains('show') && !$('god').classList.contains('show') && !$('shop').classList.contains('show')) { G.paused = true; $('pause').classList.add('show'); }
});
addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' && G.state === 'play' && !cutActive()) {
    if (G.paused && $('pause').classList.contains('show')) { closeOverlays(); } else if (!G.paused) { G.paused = true; $('pause').classList.add('show'); if (document.pointerLockElement) document.exitPointerLock(); }
  }
  if (e.code === 'Escape' && cutActive()) skip();
});

// ---------- the loop ----------
let last = performance.now(), talkCd = 0, achT = 2;
const REGEN = 10, regen = { t: 0, last: 0 };   // passive regeneration (see the main loop)
function frame(now) {
  // (the loop itself is started with startLoop below: requestAnimationFrame on a screen, the headset's own frames in VR)
  // the first rAF timestamp can be a little EARLIER than `last`: a negative dt broke Rênas' speed into NaN
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000) || 0); last = now;
  pollPad(); pollVR(dt);
  if (G.paused) { renderAll(); consumePressed(); return; }
  G.t += dt; const t = G.t;
  G.shake = Math.max(0, G.shake - dt * 1.6);
  G.calmT = Math.max(0, (G.calmT || 0) - dt);
  const w = G.world;
  const wasCut = cutActive();
  if (wasCut) { talkCd = 0.35; mouse.dx = mouse.dy = 0; }   // mouse movement during a conversation doesn't spin the camera afterwards
  else talkCd -= dt;
  if (wasCut && (pressed.has('Space') || pressed.has('KeyE') || pressed.has('Enter') || pressed.has('Mouse0'))) advance();
  if (w) w.update(dt, t);
  if (cur.onArena && cur.w) cur.w.boss.update(dt * (G.god ? G.god.speed : 1), t);   // the Tijdband and Opgeklommen holograms run faster
  if (G.state === 'menu') {
    updatePlayer(dt, t, false);
    const s = menuShot(menuWorld)(t);
    camera.position.lerp(s.pos, damp(2, dt)); camera.up.copy(s.up); camera.lookAt(s.look);
    model.R.arms[1].rotation.z = 2.4 + Math.sin(t * 6) * 0.4;     // waving at you
  } else if (G.state === 'flight' && flight) updateFlight(dt);
  else if (cutActive()) { updatePlayer(dt, t, false); updateCut(dt); setPrompt(''); }
  else if (G.state === 'play' || G.state === 'over') {
    // safety nets: Rênas is only ever hidden inside cutscenes and flights, and a broken position puts him back at the spawn
    if (P.hidden) P.hidden = false;
    const p = P.pos, c = cam.fwd;
    const f = P.fwd;
    if (!Number.isFinite(p.x + p.y + p.z + P.vt.x + P.vt.y + P.vt.z + P.vr) || !Number.isFinite(c.x + c.y + c.z) || !Number.isFinite(f.x + f.y + f.z)) {
      const wd = cur.w;
      if (wd && cur.onArena) spawnPlayer(wd.arena, wd.arenaSpawn.dir, wd.arenaSpawn.fwd);
      else if (wd) spawnPlayer(wd.main, wd.spawn.dir, wd.spawn.fwd);
    }
    devTick(dt);
    updatePlayer(dt, t, G.state === 'play');
    if (G.god) { if (P.hp < G.god.lastHp) G.god.hit = true; G.god.lastHp = P.hp; }   // for the crown: a pantheon without one hit
    // passive regeneration: 10 s without getting hurt brings back one heart, and the next empty heart fills up
    // while you wait. Not during a boss fight or in the pantheon, so those stay a real challenge.
    const fight = !!G.god || (cur.onArena && cur.w && !cur.w.boss.dead);
    if (P.hp < regen.last || P.dead || fight || P.hp >= P.maxHp) regen.t = 0;
    else if (!cutActive()) { regen.t += dt; if (regen.t >= REGEN) { regen.t = 0; healPlayer(1); } }
    regen.last = P.hp;
    const nextHeart = $('hp').children[P.hp];
    if (nextHeart) nextHeart.style.background = regen.t > 0 ? `conic-gradient(#ff5a6e ${(regen.t / REGEN) * 360}deg, rgba(255,248,236,.35) 0)` : '';
    updateCamera(dt, t, cur.onArena && cur.w && !cur.w.boss.dead ? { focus: bossFocus(cur.w), focusK: 0.9 } : {});
    // the E that closes a conversation must not start the same conversation again
    const it = w && G.state === 'play' && talkCd <= 0 ? w.nearestInteract() : null;
    setPrompt(it ? it.prompt() : '');
    if (it && pressed.has('KeyE')) it.use();
    if (cur.w && !cutActive()) save.time += dt;   // conversations and cutscenes don't count as play time (speedrun timer + achievements)
    $('lockhint').classList.toggle('show', !locked() && !G.lockedOnce && !!cur.w);
  }
  // the sun follows you around the planet, shining from over the camera's shoulder
  sun.target.position.copy(P.pos);
  sun.position.copy(P.pos).addScaledVector(P.up, 30).add(camera.position.clone().sub(P.pos).multiplyScalar(1.5));
  updateParticles(dt);
  updateExtras(dt, G.t);
  achT -= dt; if (achT <= 0) { achT = 1; checkAch(G.state === 'play' && !cutActive(), 1); }   // achievements: checked once a second
  timerTick(); if (achT === 1) shopTick();
  galaxyTick(dt);
  renderAll();
  consumePressed();
}
drawHearts();
openMenu();
initGalaxy({ nl, build: (i) => BUILDERS[i](ctx) });
initAch({ save: () => save, persist, nl });
initShop({
  save: () => save, persist, nl, model: model.R,
  spend: () => { save.coins = G.coins; $('coinN').textContent = G.coins; persist(); },
  onHeart: () => { if (cur.w && !G.god) { P.maxHp = shopMaxHp(); P.hp = P.maxHp; drawHearts(); } },
  backMusic: () => (cur.w ? (cur.onArena ? cur.w.bossMusic : cur.w.music) : 'menu'),
});
initDev({ cur, ORDER, BONUS, TEMPLE, ZWEEF, NAMES, step, save: () => save, persist, ws, hud, loadWorld, toArena, openMenu, closeOverlays, cutActive, skip });
startLoop(frame);
void healPlayer;

// ---------- drawing ----------
// Three passes so Rênas can never vanish: the world without him, then a light-blue silhouette wherever
// something stands in front of him (like in Mario Galaxy), then Rênas himself on top of that.
const PLAYER_LAYER = 1;
model.root.traverse((o) => o.layers.enable(PLAYER_LAYER));
for (const l of [ambient, hemi, sun]) l.layers.enable(PLAYER_LAYER);
const silMat = new THREE.MeshBasicMaterial({ color: 0x7ac8ff, transparent: true, opacity: 0.55, depthWrite: false, depthFunc: THREE.GreaterDepth });
function renderAll() {
  const vr = vrBegin();   // in the headset: hang the camera in the VR rig for these passes (does nothing on a normal screen)
  drawPasses();
  if (vr) vrEnd();
}
function drawPasses() {
  if (G.vr && G.vrSet && !G.vrSet.sil) { renderer.autoClear = true; renderer.render(scene, camera); return; }   // VR setting: no silhouette pass (faster)
  const show = model.root.visible;
  renderer.autoClear = true;
  model.root.visible = false;
  renderer.render(scene, camera);
  model.root.visible = show;
  if (!show) return;
  renderer.autoClear = false;
  camera.layers.set(PLAYER_LAYER);
  scene.overrideMaterial = silMat;
  renderer.render(scene, camera);
  scene.overrideMaterial = null;
  renderer.render(scene, camera);
  camera.layers.set(0);
  renderer.autoClear = true;
}
