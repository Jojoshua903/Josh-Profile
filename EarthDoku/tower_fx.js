// ---------- Tower battle effects: every attack, PSI move and ability gets its own look ----------
// Each look mixes a few animation styles (joined with "+") with its own symbols and colors.
// [styles, symbols (space-separated), colors (space-separated), how many particles]
const FX = {
  // healing and support PSI
  lifeup:["rise+sparkle", "✚ ✦", "#7dffb0", 8],
  lifeupB:["rise+ring", "✚ ♥", "#5cf2a0", 10],
  lifeupG:["rain+ring+sparkle", "✚ ✦ ♥", "#b6ffde #5cf2a0", 14],
  healing:["sparkle+ring", "✧ ◇", "#a8f0ff", 10],
  hypnosis:["swirl+zzz", "◎ z Z", "#c49bff", 8],
  paralysis:["bolt+shake", "ϟ", "#f5ff6b", 3],
  shield:["ring+orbit", "⬡", "#7ec8ff", 6],
  offup:["rise+pop", "▲ ⇑", "#ff9d3b", 8],
  defdown:["rain+pop", "▼ ⇓", "#9aa7ff", 8],
  magnet:["swirl+shot", "◆ ✧", "#5ad8ff", 10, {rev:true}],
  // PK attacks, each tier bigger than the last
  pkbeam:["beam+ring", "✦", "#fff27a", 3],
  pkbeamG:["beam+burst+ring", "✦ ★", "#fffbd0 #fff27a", 12],
  pkrockin:["burst+spin", "★ ✶ ✸", "#ff7ad9 #ffe14d #6cf0ff", 12],
  pkrockinB:["rain+burst", "★ ✶", "#ff7ad9 #ffe14d #6cf0ff", 14],
  pkrockinG:["ring+rain+burst", "★ ✸ ✶", "#ff7ad9 #ffe14d #6cf0ff #9dff7a", 16],
  pkrockinO:["spin+ring+burst+sparkle", "Ω ★ ✸", "#ff7ad9 #ffe14d #6cf0ff #9dff7a #ffffff", 18],
  pkfire:["burst", "🔥", "#ff6a1a", 8],
  pkfireB:["rise+burst", "🔥 ✹", "#ff4a1a #ffb21a", 12],
  pkfireG:["rain+rise+ring", "🔥 ✹", "#ff3a0a #ffcc33", 16],
  pkfreeze:["pop+burst", "❄ ✱", "#9be7ff", 8],
  pkfreezeG:["rain+spin+burst", "❄ ❅ ❆", "#cdf6ff #6fd3ff", 14],
  pkthunder:["bolt+burst", "ϟ ✦", "#fff04d", 4],
  pkthunderG:["bolt+ring", "ϟ", "#fff04d #9dd8ff", 9],
  pklove:["burst+pop", "♥ ♡", "#ff5fa2", 10],
  pkloveB:["rain+burst", "♥ ♡ ✦", "#ff5fa2 #ffd1e6", 14],
  pkloveG:["ring+swirl+burst", "♥ ✦", "#ff2d7a #ffd1e6 #c49bff", 16],
  starstorm:["rain+sparkle", "★ ☆", "#ffe14d #ffffff", 14],
  starstormO:["rain+ring+burst", "★ ✶ ☆", "#ffe14d #b8a0ff #ffffff", 18],
  pray:["rise+ring", "✟ ✧", "#fff6c0", 10],
  chant:["swirl+sparkle", "✶ ♫", "#c8a8ff", 10],
  // gadgets
  rocket:["shot+burst", "🎆 ✸", "#ff9a3d", 8],
  bigrocket:["shot+burst+ring", "🎇 ✸", "#ff6a3d", 12],
  multirocket:["shot+burst", "🚀 ✸", "#ffa24d #fff04d", 6],
  bombT:["drop+burst+shake", "💣 ✸", "#ff7a2a #ffd84a", 12],
  spray:["rain+orbit", "∙ ○", "#bfe9ff", 12],
  spy:["pop+ring", "🔍", "#9fffd0", 2],
  invent:["spin+burst", "⚙ 🔧 ✸", "#c0c8d8 #ffcf3f", 10],
  staples:["shot+pop", "📎 ╳", "#d0d8e8", 4],
  ropesnake:["orbit+shake", "🐍 ∿", "#7fd35a", 5],
  smoke:["rise+burst", "☁", "#d8d8e8", 12],
  tickle:["sparkle+shake", "~ ✧", "#ffb0f0", 8],
  disruptor:["wave+bolt", "≋ ϟ", "#9a7aff", 6],
  shieldkiller:["rain+shake", "▼ ✕", "#ff7a5a", 10],
  spidermech:["beam+burst", "✦", "#ff2d55", 8],
  // weapons and fists
  slash:["slash+burst", "✦", "#e9f6ff", 6],
  doubleslash:["cross+burst", "✦", "#ffffff #9fe8ff", 8],
  fury:["slash+shake", "", "#ffd2a8", 12],
  smash:["drop+burst+shake", "💥 ✸", "#ffb020", 10],
  slingshot:["shot+pop", "● ✸", "#c8a070", 3],
  crackedbat:["slash+pop", "⚾ ✦", "#ffd9a8", 4],
  nightstick:["slash+pop", "🚨 ✦", "#6fa0ff #ff5a5a", 5],
  axe:["drop+slash+shake", "🪓", "#d8c0a0", 4],
  dash:["beam+burst", "✦", "#9fe8ff", 6],
  charge:["beam+shake", "➤", "#ff8a5c", 3],
  gangrumble:["burst+shake", "👊 💢", "#ff6a5c", 8],
  rocketpunch:["shot+ring+shake", "👊", "#ff5a3d", 4],
  boulder:["drop+shake+burst", "🪨 ●", "#9a8a7a", 8],
  stomp:["drop+ring+shake", "👣", "#b07a4a", 4],
  thiefkick:["shot+pop", "👟 $", "#ffd84a", 4],
  swipe:["shot+rise", "💰 $", "#ffd84a", 6],
  // claws, teeth and wings
  bite:["slash+pop", "🦷", "#ffffff", 2],
  scratch:["claw", "", "#ffffff", 3],
  lunge:["shot+claw", "🐾", "#ffb366", 3],
  pounce:["drop+claw", "🐾", "#ffb366", 6],
  dive:["drop+slash+burst", "🪶 ✦", "#ffe9a8", 6],
  flyby:["beam+rain", "🪶", "#ffffff", 6],
  // getting in the enemy's head
  bark:["ring+zzz", "! ‼", "#ffdd55", 6],
  glare:["pop+ring", "👁️", "#ff4d4d", 3],
  tricks:["orbit+zzz", "🍌 ✦", "#ffe14d", 6],
  pester:["orbit+shake", "💢 ~", "#ff7a7a", 6],
  monkeysamba:["orbit+sparkle", "🎶 ✦", "#ffcf3f #ff9ad5", 10],
  shockdance:["bolt+orbit", "⚡ ♪", "#fff04d #ff5fa2", 8],
  sniff:["zzz+pop", "~ 👃", "#ffe0a8", 6],
  explain:["pop+rain", "💬 ?", "#d8f0ff", 8],
  sizeup:["pop+ring", "🎯", "#ff6a6a", 3],
  // sleep and pins
  chirp:["zzz+wave", "♪ ♬", "#ffe86b", 8],
  serenade:["wave+zzz", "♪ ♫ ♬", "#ff9ad5", 8],
  lullaby:["rain+zzz", "♪ ♫", "#c8b8ff #ffd1e6", 10],
  wrangle:["orbit+shake", "➰ 🐖", "#ff9fb4", 5],
  arrest:["pop+orbit", "🚔 ⛓", "#6fa0ff", 5],
  lasso:["orbit+pop", "➰", "#e0b070", 6],
  bubblepop:["pop+burst", "🫧 ○", "#ffb0e8", 8],
  zombiepaper:["drop+orbit", "📜 ✕", "#e8e0c0", 5],
  // guarding
  gum:["pop+orbit", "🫧 ○", "#ff9ad5", 6],
  builddungeon:["drop+orbit", "🧱", "#b5835a", 6],
  prophecy:["ring+sparkle", "🔮 ✧", "#c49bff", 10],
  pokeyshield:["pop+ring", "😱", "#c0c0c0", 3],
  savegame:["pop+ring", "💾 ✦", "#7aa0ff", 4],
  playdead:["pop+zzz", "💀 z", "#d0d0d0", 5],
  toughen:["ring+rise", "▲ ⬢", "#c0a06a", 6],
  // cheering, feeding and hugging
  cheer:["rise+sparkle", "♪ ★", "#ffcf3f", 10],
  pluck:["rise+ring", "▲ ✦", "#ffe066", 8],
  boing:["pop+rise", "✚ ❀", "#ffb8c8", 8],
  twinhug:["pop+rise", "💞 ♥", "#ff8ac8", 8],
  besthug:["pop+rise", "🤗 ♥", "#ffd1a8", 6],
  nuzzle:["pop+rise", "🐶 ♥", "#ffc8a8", 6],
  purr:["wave+rise", "♡ ~", "#ffd1e6", 6],
  checkup:["pop+sparkle", "🩺 ✚", "#a8ffd8", 6],
  nutbreadshare:["rain+rise", "🍞 ✚", "#e8b56a", 8],
  homecooking:["rise+sparkle", "🍲 ♨ ✚", "#ffb36b", 10],
  escargo:["shot+rain", "📦 ✚", "#ffcf3f", 8],
  hotspring:["rise+wave", "♨ ~", "#ff9a8a #9be7ff", 12],
  rescue:["rain+sparkle", "💧 ✧", "#6fc8ff", 12],
  flutterpp:["swirl+rise", "🦋 ✧", "#7ad8ff #c49bff", 10],
  saturncoffee:["rise+swirl", "☕ ✦", "#c08a5a #ffd84a", 10],
  queensong:["wave+rise+sparkle", "♪ 👑 ✧", "#ffe9a8 #ffd1e6", 12],
  surgery:["pop+cross+sparkle", "✚", "#ff5a5a #ffffff", 8],
  runhome:["rise+burst", "🏠 ✦", "#ffe0a8", 8],
  // plain attacks
  bash:["pop+burst", "✸", "#ffffff", 6],
  smaaash:["ring+burst+shake", "💥 ★ ✸", "#ffcf3f #ff5a3d #ffffff", 16]
};
// goods use the item's own icon, styled by what it does
const FX_GOODS = {dmgall:"drop+burst+shake", dmg:"shot+burst", heal:"rise", healall:"rain+rise", pp:"swirl", revive:"rise+ring", full:"sparkle+ring", cure:"sparkle", stat:"rise+pop", distract:"orbit"};
// enemy attacks look different for each kind of enemy
const FX_FOES = {
  Human:["pop+burst", "👊 ✸", "#ffd0b0", 5], Animal:["claw", "", "#ffffff", 3], Bug:["pop+sparkle", "✷ ·", "#c8ff6a", 6],
  Plant:["rise+zzz", "❀ ·", "#9cff7a", 6], Machine:["beam+burst", "✦", "#6cf0ff", 4], Alien:["beam+ring", "✦", "#c49bff", 4],
  Ghost:["swirl+pop", "👻 ~", "#d8d0ff", 6], Object:["drop+shake", "◆", "#ffd84a", 4], Weird:["swirl+sparkle", "◎ ✶", "#ff5fd2 #6cf0ff", 8],
  mighty:["wave+shake+burst", "✸", "#ff2d55 #ffcf3f", 10]
};

const fxLayer = (() => { const d = document.createElement("div"); d.id = "fxLayer"; d.setAttribute("aria-hidden", "true"); document.body.appendChild(d); return d; })();
const fxCalm = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : {matches:false};
const fxSpec = a => a && {styles:a[0].split("+"), g:a[1] ? a[1].split(" ") : ["✦"], c:a[2].split(" "), n:a[3], opt:a[4] || {}};
const fxForKey = key => {
  if (!key) return null;
  if (key.startsWith("g:")) { const g = GOODS[key.slice(2)]; return g && FX_GOODS[g.kind] ? fxSpec([FX_GOODS[g.kind], g.ic || "✦", "#ffe9a8", 8]) : null; }
  return fxSpec(FX[key]);
};
const fxRect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width ? {x:r.left + r.width / 2, y:r.top + r.height / 2, w:r.width, h:r.height} : null; };
const fxFoeEl = x => document.querySelector(`[data-foe="${x.uid}"] .twFoeSpr`) || document.querySelector(`[data-foe="${x.uid}"]`);
const fxHeroEl = m => document.querySelector(`.twMember[data-i="${tr.team.indexOf(m)}"]`);

function fxPart(cls, x, y, vars, txt, life = 1300) {
  const s = document.createElement("span");
  s.className = "fx " + cls;
  s.style.left = x + "px"; s.style.top = y + "px";
  Object.entries(vars).forEach(([k, v]) => s.style.setProperty("--" + k, v));
  if (txt) s.textContent = txt;
  fxLayer.appendChild(s);
  setTimeout(() => s.remove(), life + (parseFloat(vars.d) || 0));
  return s;
}
function fxShake(el) { if (!el) return; el.classList.remove("fxShake"); void el.offsetWidth; el.classList.add("fxShake"); }

// the styles: p = where it lands, from = who it came from (for beams and shots), t = delay in ms
const FX_DO = {
  burst(p, s, t) { const R = fxR(p); for (let i = 0; i < s.n; i++) { const a = i / s.n * Math.PI * 2 + Math.random() * .4, r = R * (.6 + Math.random() * .5);
    fxPart("fxBurst", p.x, p.y, {dx:Math.cos(a) * r + "px", dy:Math.sin(a) * r + "px", c:fxC(s, i), d:t + i * 12 + "ms"}, fxG(s, i)); } },
  rain(p, s, t) { const R = fxR(p); for (let i = 0; i < s.n; i++) { const h = R * (1.5 + Math.random() * .4);
    fxPart("fxRain", p.x + (Math.random() - .5) * p.w * 1.1, p.y - h, {dy:h + "px", c:fxC(s, i), d:t + Math.random() * 350 + "ms"}, fxG(s, i)); } },
  rise(p, s, t) { const R = fxR(p); for (let i = 0; i < s.n; i++)
    fxPart("fxRise", p.x + (Math.random() - .5) * p.w, p.y + p.h * .25, {dy:-R * (.8 + Math.random() * .6) + "px", c:fxC(s, i), d:t + Math.random() * 300 + "ms"}, fxG(s, i)); },
  sparkle(p, s, t) { for (let i = 0; i < s.n; i++)
    fxPart("fxSpark", p.x + (Math.random() - .5) * p.w, p.y + (Math.random() - .5) * p.h, {c:fxC(s, i), d:t + Math.random() * 450 + "ms"}, fxG(s, i)); },
  zzz(p, s, t) { const R = fxR(p); for (let i = 0; i < Math.min(s.n, 6); i++)
    fxPart("fxZzz", p.x + (Math.random() - .5) * p.w * .4, p.y - p.h * .1, {dx:R * (.3 + Math.random() * .6) + "px", dy:-R * (.9 + Math.random() * .5) + "px", c:fxC(s, i), d:t + i * 140 + "ms"}, fxG(s, i), 1500); },
  ring(p, s, t) { const R = fxR(p); for (let i = 0; i < Math.min(3, Math.ceil(s.n / 4)); i++)
    fxPart("fxRing", p.x, p.y, {sz:R * 2 + "px", c:fxC(s, i), d:t + i * 130 + "ms"}); },
  wave(p, s, t) { const R = fxR(p); for (let i = 0; i < 3; i++)
    fxPart("fxWave", p.x, p.y, {w:R * 2.8 + "px", h:R * 1.1 + "px", c:fxC(s, i), d:t + i * 160 + "ms"}); },
  slash(p, s, t) { const R = fxR(p); for (let i = 0; i < Math.min(4, Math.ceil(s.n / 4)); i++)
    fxPart("fxSlash", p.x + (Math.random() - .5) * 14, p.y + (Math.random() - .5) * 14, {len:R * 2.3 + "px", r:-35 + (i % 2 ? 70 : 0) + (Math.random() - .5) * 20 + "deg", c:fxC(s, i), d:t + i * 90 + "ms"}); },
  cross(p, s, t) { const R = fxR(p); [-45, 45].forEach((r, i) => fxPart("fxSlash", p.x, p.y, {len:R * 2.4 + "px", r:r + "deg", c:fxC(s, i), d:t + i * 110 + "ms"})); },
  claw(p, s, t) { const R = fxR(p); [-1, 0, 1].forEach((o, i) => fxPart("fxSlash thin", p.x, p.y, {len:R * 1.9 + "px", r:"-60deg", o:o * 11 + "px", c:fxC(s, i), d:t + i * 45 + "ms"})); },
  bolt(p, s, t) { const R = fxR(p), k = Math.min(4, Math.ceil(s.n / 3)); for (let i = 0; i < k; i++) { const h = R * 2.3;
    fxPart("fxBolt", p.x + (i - (k - 1) / 2) * R * .45, p.y - h, {h:h + "px", c:fxC(s, i), d:t + i * 70 + "ms"}); } },
  beam(p, s, t, from) { const f = from || {x:p.x - 260, y:p.y}, dx = p.x - f.x, dy = p.y - f.y;
    fxPart("fxBeam", f.x, f.y, {len:Math.hypot(dx, dy) + "px", r:Math.atan2(dy, dx) + "rad", c:fxC(s, 0), d:t + "ms"}); },
  shot(p, s, t, from) { const f = from || {x:p.x - 260, y:p.y};
    fxPart("fxShot", f.x, f.y, {dx:p.x - f.x + "px", dy:p.y - f.y + "px", c:fxC(s, 0), d:t + "ms"}, fxG(s, 0)); },
  drop(p, s, t) { const R = fxR(p); fxPart("fxDrop", p.x, p.y, {dy:-R * 2 + "px", c:fxC(s, 0), d:t + "ms"}, fxG(s, 0)); },
  pop(p, s, t) { fxPart("fxPop", p.x, p.y, {c:fxC(s, 0), d:t + "ms"}, s.g[s.g.length - 1]); },
  spin(p, s, t) { fxPart("fxSpin", p.x, p.y, {c:fxC(s, 0), d:t + "ms"}, fxG(s, 0)); },
  orbit(p, s, t) { const R = fxR(p); for (let i = 0; i < s.n; i++)
    fxPart("fxOrbit", p.x, p.y, {a:i / s.n * 360 + "deg", rad:R * .85 + "px", c:fxC(s, i), d:t + "ms"}, fxG(s, i), 1400); },
  swirl(p, s, t) { const R = fxR(p); for (let i = 0; i < s.n; i++)
    fxPart("fxSwirl", p.x, p.y, {a:i / s.n * 360 + "deg", rad:R * 1.2 + "px", c:fxC(s, i), d:t + i * 25 + "ms"}, fxG(s, i)); },
  shake() {}
};
const fxR = p => Math.max(34, Math.min(110, p.w * .55));
const fxC = (s, i) => s.c[i % s.c.length];
const fxG = (s, i) => s.g[i % s.g.length];

// play a look on one element; beams, shots and drops land first, then the rest follows
function fxPlay(spec, el, from, t = 0) {
  if (!spec || fxCalm.matches) return;
  const p = fxRect(el);
  if (!p) return;
  const travel = spec.styles.some(x => x === "shot" || x === "beam" || x === "drop");
  spec.styles.forEach(st => {
    if (st === "shake") return setTimeout(() => fxShake(el), t + (travel ? 300 : 0));
    const lead = st === "shot" || st === "beam" || st === "drop";
    if (FX_DO[st]) FX_DO[st](p, spec, t + (travel && !lead ? 320 : 0), from);
  });
}
const fxStep = () => { const b = tr && tr.battle; if (!b) return 0; b.fxN = (b.fxN || 0) + 1; return (b.fxN - 1) * 170; };
const fxKey = () => tr && tr.battle && !tr.battle.over ? tr.battle.fx : null;

// hooks called from the battle code
window.fxCast = (m, key) => {
  const s = fxForKey(key);
  if (!s || fxCalm.matches) return;
  const p = fxRect(fxHeroEl(m));
  if (p) fxPart("fxRing", p.x, p.y, {sz:Math.max(60, p.h * 1.4) + "px", c:fxC(s, 0), d:"0ms"});
};
window.fxFoe = (foe, smashy) => {
  const key = fxKey() || "bash", spec = fxForKey(smashy ? "smaaash" : key) || fxForKey("bash"), t = fxStep();
  const from = fxRect(tr.battle.lastActor ? fxHeroEl(tr.battle.lastActor) : null);
  requestAnimationFrame(() => fxPlay(spec, fxFoeEl(foe), from, t));
};
window.fxHero = m => {
  const key = fxKey();
  if (!key) return;
  const spec = fxForKey(key), t = fxStep(), from = fxRect(tr.battle.lastActor ? fxHeroEl(tr.battle.lastActor) : null);
  requestAnimationFrame(() => fxPlay(spec, fxHeroEl(m), from, t));
};
// moves that don't deal damage or heal: shown on whoever they affect
window.fxMove = (m, key, foe, ally) => {
  const b = tr.battle, spec = fxForKey(key);
  if (!b || !spec) return;
  const mv = TMOVES[key], g = key.startsWith("g:") && GOODS[key.slice(2)], kind = mv ? mv.kind : g ? "g-" + g.kind : "";
  const party = aliveH(), foes = aliveF(), self = [m];
  const who = {sleep:[foe], stun:[foe], weak:mv && mv.all ? foes : [foe], cry:foes, shield:party, offup:party, cure:party, ppall:party,
    tough:self, guard:self, run:self, revive:[b.fxT || ally].filter(Boolean), magnet:[foe],
    "g-cure":party, "g-full":[ally || m], "g-stat":[ally || m], "g-pp":[ally || m], "g-revive":[b.fxT || ally].filter(Boolean), "g-distract":foes}[kind];
  if (!who) return;
  requestAnimationFrame(() => who.filter(Boolean).forEach((x, i) => {
    const el = x.uid != null ? fxFoeEl(x) : fxHeroEl(x);
    // PSI Magnet pulls the sparkles from the enemy back to the caster
    if (spec.opt.rev) return fxPlay(spec, fxHeroEl(m), fxRect(el), i * 120);
    fxPlay(spec, el, fxRect(fxHeroEl(m)), i * 120);
  }));
};
// enemy attacks on a hero
window.fxEnemy = (foe, m, smashy, scale) => {
  const spec = fxSpec(smashy ? FX.smaaash : scale < 1 && foe.boss ? FX_FOES.mighty : FX_FOES[foe.e.kinds[0]] || FX_FOES.Human);
  const from = fxRect(fxFoeEl(foe));
  requestAnimationFrame(() => fxPlay(spec, fxHeroEl(m), from));
};
