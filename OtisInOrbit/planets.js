import { scene, sun } from './core.js';
import { endCutscene } from './cutscene.js';

// All planets live in one page. Travelling detaches the current planet's objects from the scene
// (so its state is kept exactly as you left it) and attaches or first-loads the next one.
const PAGES = {
  mistmaan: { module: './main.js', title: 'De Mistmaan', sub: 'Terug bij de crash…', bg: '' },
  berg: { module: './berg-main.js', title: 'De Bergwereld', sub: 'Helemaal naar de top…', bg: 'linear-gradient(180deg,#6fb6f2 0%,#a9d6fa 45%,#e2f0fb 80%,#f7f2e6 100%)' },
  bos: { module: './bos-main.js', title: 'Het Paddenstoelenbos', sub: 'Waar alles gloeit…', bg: 'linear-gradient(180deg,#1b1238 0%,#3a2560 45%,#5b3a7a 75%,#2a5a5a 100%)' },
  schroot: { module: './schroot-main.js', title: 'De Schroothoop', sub: 'Alles hier was ooit van iemand…', bg: 'linear-gradient(180deg,#d9733a 0%,#e8a05a 40%,#c98a5a 70%,#5a4a48 100%)' },
  zon: { module: './zon-main.js', title: 'De Zon', sub: 'Zachte pootjes op hete korst…', bg: 'linear-gradient(180deg,#ffb347 0%,#ffd27a 40%,#ff8a3d 75%,#c43a1a 100%)' },
  water: { module: './water-main.js', title: 'De Waterplaneet', sub: 'Hier lag ooit een paleis van ijs…', bg: 'linear-gradient(180deg,#5ac8f0 0%,#a8e4f8 45%,#e8f8ff 75%,#3a8ab8 100%)' },
  tempel: { module: './tempel-main.js', title: 'De Vergeten Tempel', sub: 'Dit was niet de bedoeling…', bg: 'linear-gradient(180deg,#4a3a6a 0%,#8a6a7a 40%,#d8a070 75%,#5a6a4a 100%)' },
  feest: { module: './feest-main.js', title: 'De Feestplaneet', sub: 'Overmorgen is het Galmfeest!', bg: 'linear-gradient(180deg,#ff8ad8 0%,#ffc38a 40%,#fff0a0 75%,#6ad86a 100%)' },
  regen: { module: './regen-main.js', title: 'De Regenstad', sub: 'Het regent hier altijd een beetje…', bg: 'linear-gradient(180deg,#0a0a24 0%,#1a1440 45%,#3a1a5a 75%,#0a1a2a 100%)' },
  wolk: { module: './wolk-main.js', title: 'De Wolkeneilanden', sub: 'Hoog boven alles…', bg: 'linear-gradient(180deg,#5aa8f0 0%,#9ad0ff 40%,#ffe0f0 75%,#fff6e0 100%)' },
  woud: { module: './woud-main.js', title: 'Het Reuzenwoud', sub: 'Bomen tot in de hemel…', bg: 'linear-gradient(180deg,#8ad86a 0%,#c8e8a0 35%,#5a8a4a 70%,#2a3a24 100%)' },
};
const planets = {};
const stash = {};
let active = document.body.dataset.planet || 'mistmaan';

export const activePlanet = () => active;
// for the travel menu: what a planet looks like
export const pageInfo = (name) => PAGES[name] || null;
export function registerPlanet(name, api) { planets[name] = api; }

const hemi = () => scene.children.find((o) => o.isHemisphereLight);
const keep = () => new Set([hemi(), sun, sun.target]);
function snapshot() {
  const h = hemi();
  return {
    fog: scene.fog, title: document.title, bg: document.body.style.background,
    hemi: [h.color.getHex(), h.groundColor.getHex(), h.intensity], sun: [sun.color.getHex(), sun.intensity],
  };
}
function applyEnv(e) {
  const h = hemi();
  scene.fog = e.fog; document.title = e.title; document.body.style.background = e.bg;
  h.color.setHex(e.hemi[0]); h.groundColor.setHex(e.hemi[1]); h.intensity = e.hemi[2];
  sun.color.setHex(e.sun[0]); sun.intensity = e.sun[1];
}
function titleCard(name) {
  const t = document.getElementById('title');
  if (!t) return;
  t.querySelector('.t').textContent = PAGES[name].title;
  t.querySelector('.s').textContent = PAGES[name].sub;
  t.style.opacity = 1; setTimeout(() => (t.style.opacity = 0), 3000);
}

export async function travel(to) {
  if (to === active) return;
  try { localStorage.setItem('current-planet', to); } catch (e) {}
  endCutscene();
  const k = keep();
  const kids = scene.children.filter((c) => !k.has(c));
  stash[active] = { kids, env: snapshot() };
  kids.forEach((c) => scene.remove(c));
  const from = active;
  active = to;
  document.body.dataset.planet = to;
  if (stash[to]) {
    stash[to].kids.forEach((c) => scene.add(c));
    applyEnv(stash[to].env);
    planets[to].activate(from);
    titleCard(to);
  } else {
    document.title = PAGES[to].title;
    document.body.style.background = PAGES[to].bg;
    await import(new URL(PAGES[to].module, import.meta.url).href);
    if (!planets[to].arrivesWithCutscene) titleCard(to);
  }
  setTimeout(() => document.querySelectorAll('.planet-fade').forEach((f) => (f.style.opacity = 0)), 80);
}

// After a refresh, go straight back to the planet you were on.
let resumed = false;
export function resumePlanet() {
  if (resumed || window.TEST_MODE) return;
  resumed = true;
  let p = null;
  try { p = localStorage.getItem('current-planet'); } catch (e) {}
  if (p && p !== active && PAGES[p]) travel(p);
}
