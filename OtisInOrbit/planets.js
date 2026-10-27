import { scene, sun } from './core.js?v=muis1';
import { endCutscene } from './cutscene.js?v=muis1';

// All planets live in one page. Travelling detaches the current planet's objects from the scene
// (so its state is kept exactly as you left it) and attaches or first-loads the next one.
const PAGES = {
  mistmaan: { module: './main.js?v=muis1', title: 'De Mistmaan', sub: 'Terug bij de crash…', bg: '' },
  berg: { module: './berg-main.js?v=muis1', title: 'De Bergwereld', sub: 'Helemaal naar de top…', bg: 'linear-gradient(180deg,#6fb6f2 0%,#a9d6fa 45%,#e2f0fb 80%,#f7f2e6 100%)' },
};
const planets = {};
const stash = {};
let active = document.body.dataset.planet || 'mistmaan';

export const activePlanet = () => active;
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
  if (resumed) return;
  resumed = true;
  let p = null;
  try { p = localStorage.getItem('current-planet'); } catch (e) {}
  if (p && p !== active && PAGES[p]) travel(p);
}
