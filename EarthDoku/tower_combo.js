// ---------- hero combos: after a Bash, every hero plays their own little follow-up game ----------
// each hero tunes one kind of game with their own name, look and difficulty. Every success is one more hit.
// max: most extra hits, pow: share of the Bash damage each extra hit deals
const COMBOS = {
  // Mother
  ninten:{kind:"stop", n:"Bat swing", ic:"🏏", tip:"Tap when the bat crosses the sweet spot", spd:1.05, zone:.26},
  ana:{kind:"charge", n:"PSI focus", ic:"💫", tip:"Hold, then let go inside the pink zone", fill:.9, zone:.2},
  lloyd:{kind:"ring", n:"Bottle rocket aim", ic:"🚀", tip:"Tap when the ring lines up with the target", spd:.95, tol:.1},
  teddy:{kind:"mash", n:"Blade flurry", ic:"🗡️", tip:"Mash as fast as you can", secs:2.4, per:5},
  pippi:{kind:"alt", n:"Slap slap slap", ic:"✋", tip:"Alternate left and right", secs:2.6, per:3, keys:["L", "R"]},
  flyingman:{kind:"react", n:"Dive bomb", ic:"🪽", tip:"Wait for the ❗, then tap", win:480},
  eve:{kind:"seq", n:"Robot routine", ic:"🤖", tip:"Press the arrows in order", len:4, hide:0, max:4},
  mick:{kind:"whack", n:"Fetch!", ic:"🦴", tip:"Tap the bone wherever it lands", slots:3, life:950},
  queenmary:{kind:"spell", n:"Remember the song", ic:"🎼", tip:"Tap the letters in order to spell the word", words:["SONG", "TUNE", "HUM", "LALA", "NOTE"], max:3, pow:.45},
  mimmie:{kind:"pick", n:"Twin tag", ic:"🎀", tip:"Tap the matching bow, fast", target:"🎀", decoys:["🧸", "🍬", "🪀", "🎈"], opts:4, life:1500},
  laura:{kind:"beat", n:"Canary melody", ic:"🐤", tip:"Tap in time with the chirps", beat:470, win:150},
  // EarthBound
  ness:{kind:"stop", n:"Home-run swing", ic:"⚾", tip:"Tap in the sweet spot. It gets faster", spd:1.4, zone:.2},
  paula:{kind:"charge", n:"PK Fire charge", ic:"🔥", tip:"Hold, then let go inside the zone", fill:1.25, zone:.22},
  jeff:{kind:"seq", n:"Gadget code", ic:"🔧", tip:"Remember the arrows, then enter them", len:4, hide:1300, max:4},
  poo:{kind:"count", n:"Starstorm count", ic:"⭐", tip:"Count the stars before they fade", flash:900, from:3},
  king:{kind:"whack", n:"Bite!", ic:"🍖", tip:"Snap up the meat before it's gone", slots:4, life:780},
  picky:{kind:"react", n:"Peek-a-boo", ic:"🙈", tip:"Wait for the ❗, then tap", win:560},
  buzzbuzz:{kind:"ring", n:"Future beam", ic:"🐝", tip:"Tap when the ring lines up with the target", spd:1.3, tol:.09},
  bubblemonkey:{kind:"alt", n:"Bubble gum chew", ic:"🫧", tip:"Alternate left and right", secs:2.1, per:2, keys:["L", "R"]},
  dungeonman:{kind:"mash", n:"Dungeon stomp", ic:"🏰", tip:"Mash hard: it takes a lot to move a dungeon", secs:3.2, per:7},
  pokey:{kind:"pick", n:"Snack grab", ic:"🍔", tip:"Grab the burger, not the veggies", target:"🍔", decoys:["🥦", "🥕", "🍆", "🫑"], opts:5, life:1250},
  tony:{kind:"spell", n:"Pen-pal letter", ic:"✉️", tip:"Tap the letters in order to spell the word", words:["JEFF", "PAL", "BEST", "DEAR", "SNOW"], max:3, pow:.45},
  mrsaturn:{kind:"whack", n:"ZOOm!", ic:"🪐", tip:"Tap Mr. Saturn as he pops up. BOinG!", slots:5, life:1050},
  applekid:{kind:"seq", n:"Invention wiring", ic:"🍎", tip:"Press the arrows in order", len:5, hide:0, max:5, pow:.3},
  andonuts:{kind:"count", n:"Quick math", ic:"⚙️", tip:"Count the gears before they vanish", flash:700, from:4},
  brickroad:{kind:"stop", n:"Lay the bricks", ic:"🧱", tip:"Tap when the brick is over the gap", spd:.85, zone:.3, shrink:.78},
  maxwell:{kind:"spell", n:"Explain it", ic:"🤓", tip:"Tap the letters in order to spell the word", words:["DATA", "FACT", "THEORY", "LOGIC", "NOTES"], max:3, pow:.5},
  cat:{kind:"react", n:"Pounce", ic:"🐈", tip:"Wait for the ❗, then pounce", win:380, pow:.42},
  everdred:{kind:"pick", n:"Pickpocket", ic:"💎", tip:"Swipe the gem, leave the rocks", target:"💎", decoys:["🪨", "🥔", "🧦"], opts:4, life:1150},
  // Mother 3
  lucas:{kind:"beat", n:"Sound battle", ic:"♪", tip:"Tap on the beat, like Mother 3", beat:560, win:160},
  kumatora:{kind:"charge", n:"PK Thunder charge", ic:"⚡", tip:"Hold, then let go inside the zone. Don't overcharge!", fill:1.6, zone:.16, pow:.42},
  duster:{kind:"seq", n:"Thief tools", ic:"🗝️", tip:"Remember the arrows, then pick the lock", len:5, hide:1500, max:5, pow:.32},
  boney:{kind:"whack", n:"Sniff it out", ic:"👃", tip:"Tap the scent before it fades", slots:4, life:640, pow:.4},
  flint:{kind:"mash", n:"Cowboy punches", ic:"🤠", tip:"Mash as fast as you can", secs:2, per:4},
  salsa:{kind:"alt", n:"Monkey dance", ic:"🐒", tip:"Alternate up and down", secs:2.6, per:3, keys:["U", "D"]},
  claus:{kind:"ring", n:"Lightning strike", ic:"🌩️", tip:"Tap when the ring lines up. It's fast!", spd:1.65, tol:.085, pow:.42},
  alec:{kind:"count", n:"Lunch count", ic:"🍞", tip:"How much nut bread did Grandpa pack?", flash:1100, from:2},
  butch:{kind:"pick", n:"Penny pincher", ic:"🪙", tip:"Grab the coin, not the pig food", target:"🪙", decoys:["🐖", "🌽", "🥫"], opts:4, life:1350},
  fuel:{kind:"react", n:"Brave charge", ic:"🪓", tip:"Wait for the ❗, then charge in", win:450},
  butterfly:{kind:"beat", n:"Flutter rhythm", ic:"🦋", tip:"Tap slowly in time with the wings", beat:680, win:180}
};
const comboOf = h => COMBOS[h.id] || COMBOS.lucas;
const ARROW = {L:"⬅️", R:"➡️", U:"⬆️", D:"⬇️"};

// ---------- shared plumbing ----------
const cOk = c => !!(tr && tr.battle && tr.battle.combo === c);
function cLater(c, fn, ms) { const id = setTimeout(() => { if (cOk(c)) fn(); }, ms); c.timers.push(id); return id; }
function cLoop(c, fn) { const step = now => { if (!cOk(c)) return; fn(now); c.raf = requestAnimationFrame(step); }; c.raf = requestAnimationFrame(step); }
// a broken draw must never freeze a battle: if it fails, the combo just ends
function cRedraw(c) {
  const el = $("#twCS");
  if (!el || !cOk(c)) return;
  try { COMBO_KINDS[c.def.kind].draw(el, c); cBind(el); }
  catch (err) { console.warn("combo draw", err); if (!c.done) { c.done = true; el.innerHTML = cEnd(c); cLater(c, endCombo, 300); } }
}
function cBind(el) {
  el.querySelectorAll("[data-cb]").forEach(b => { b.onclick = () => comboKey(b.dataset.cb); });
  el.querySelectorAll("[data-hold]").forEach(b => {
    b.onpointerdown = ev => { ev.preventDefault(); comboKey("tap"); };
    b.onpointerup = b.onpointerleave = b.onpointercancel = () => comboKey("up");
  });
}
function cHit(c, txt) {
  if (c.done) return false;
  c.hits++;
  const extra = Math.max(1, Math.round(c.d * (c.def.pow || .35) * rnd(.9, 1.1)));
  hurtFoe(c.foe, extra, `${c.def.ic} ${txt || c.def.n}! ${c.hits + 1}-hit combo!`);
  sfx("ok");
  const h = $("#cbHits"); if (h) h.textContent = `${c.hits}/${c.max}`;
  if (c.foe.hp <= 0 || c.hits >= c.max) { c.done = true; c.win = true; cRedraw(c); cLater(c, endCombo, 450); return false; }
  return true;
}
function cMiss(c, txt) {
  if (c.done) return;
  c.done = true;
  twLog(`• ${txt} The combo ended${c.hits ? ` at ${c.hits + 1} hits` : ""}.`);
  sfx(c.hits ? "click" : "bad");
  cRedraw(c);
  cLater(c, endCombo, 550);
}
const cNow = () => performance.now();
const cShuffle = a => mgShuffle(a);

// ---------- the kinds of combo game ----------
const COMBO_KINDS = {
  // tap on a steady beat (Mother 3's sound battle)
  beat:{
    start(c) { c.st.t0 = cNow(); c.ints.push(setInterval(() => cOk(c) && !c.done && sfx("tick"), c.def.beat)); c.st.to = cLater(c, () => cMiss(c, "The beat went on without you."), c.def.beat + c.def.win + 40); },
    draw(el, c) { el.innerHTML = c.done ? cEnd(c) : `<button class="btn hot twBeat" data-cb="tap" style="--beat:${c.def.beat}ms">${c.def.ic} Tap on the beat! <small>(Space)</small></button>`; },
    key(c, k) {
      if (k !== "tap") return;
      const t = cNow() - c.st.t0, n = Math.round(t / c.def.beat);
      if (n !== c.hits + 1 || Math.abs(t - n * c.def.beat) > c.def.win) return cMiss(c, "Off the beat!");
      clearTimeout(c.st.to);
      if (cHit(c, "♪")) c.st.to = cLater(c, () => cMiss(c, "The beat went on without you."), (c.hits + 1) * c.def.beat + c.def.win - t + 40);
    }
  },
  // mash one button before time runs out
  mash:{
    start(c) { c.st.n = 0; c.st.t0 = cNow(); cLater(c, () => { if (!c.done) { if (c.hits) { c.done = true; c.win = true; cRedraw(c); cLater(c, endCombo, 400); } else cMiss(c, "Not fast enough!"); } }, c.def.secs * 1000); },
    draw(el, c) {
      if (c.done) { el.innerHTML = cEnd(c); return; }
      const ms = c.def.secs * 1000, gone = cNow() - c.st.t0;
      el.innerHTML = `<div class="cbCol"><div class="cbTime"><i style="animation-duration:${ms}ms;animation-delay:-${gone}ms"></i></div>
        <button class="btn hot cbBig" data-cb="tap">${c.def.ic} MASH! <small id="cbN">${c.st.n % c.def.per}/${c.def.per}</small></button></div>`;
    },
    key(c, k) {
      if (k !== "tap") return;
      c.st.n++;
      const n = $("#cbN"); if (n) n.textContent = `${c.st.n % c.def.per}/${c.def.per}`;
      if (c.st.n % c.def.per === 0) cHit(c);
    }
  },
  // alternate two buttons
  alt:{
    start(c) { c.st.n = 0; c.st.last = null; c.st.t0 = cNow(); cLater(c, () => { if (!c.done) { if (c.hits) { c.done = true; c.win = true; cRedraw(c); cLater(c, endCombo, 400); } else cMiss(c, "Out of rhythm!"); } }, c.def.secs * 1000); },
    draw(el, c) {
      if (c.done) { el.innerHTML = cEnd(c); return; }
      const ms = c.def.secs * 1000, gone = cNow() - c.st.t0, [a, b] = c.def.keys;
      el.innerHTML = `<div class="cbCol"><div class="cbTime"><i style="animation-duration:${ms}ms;animation-delay:-${gone}ms"></i></div>
        <div class="cbRow"><button class="btn hot cbBig" data-cb="${a}">${ARROW[a]}</button><span class="cbMid">${c.def.ic} <small id="cbN">${c.st.n % c.def.per}/${c.def.per}</small></span><button class="btn hot cbBig" data-cb="${b}">${ARROW[b]}</button></div></div>`;
    },
    key(c, k) {
      if (!c.def.keys.includes(k) || k === c.st.last) return;
      c.st.last = k; c.st.n++;
      document.querySelectorAll("#twCS [data-cb]").forEach(b => b.classList.toggle("on", b.dataset.cb === k));
      const n = $("#cbN"); if (n) n.textContent = `${c.st.n % c.def.per}/${c.def.per}`;
      if (c.st.n % c.def.per === 0) cHit(c);
    }
  },
  // a marker sweeps back and forth: stop it in the zone, which shrinks every round
  stop:{
    start(c) { COMBO_KINDS.stop.round(c); cLoop(c, now => { const m = $("#cbMk"); if (m && !c.done) m.style.left = (COMBO_KINDS.stop.pos(c, now) * 100) + "%"; }); },
    round(c) {
      const w = c.def.zone * Math.pow(c.def.shrink || .82, c.hits);
      c.st = {t0:cNow(), w, a:.08 + Math.random() * (.84 - w), period:900 / (c.def.spd * (1 + c.hits * .12))};
      clearTimeout(c.st.to); c.st.to = cLater(c, () => cMiss(c, "Too slow!"), 3200);
    },
    pos(c, now) { const x = ((now - c.st.t0) / c.st.period) % 2; return x < 1 ? x : 2 - x; },
    draw(el, c) {
      el.innerHTML = c.done ? cEnd(c) : `<div class="cbCol"><div class="cbTrack"><span class="cbZone" style="left:${c.st.a * 100}%;width:${c.st.w * 100}%"></span><span class="cbMk" id="cbMk">${c.def.ic}</span></div>
        <button class="btn hot" data-cb="tap">Stop! <small>(Space)</small></button></div>`;
    },
    key(c, k) {
      if (k !== "tap") return;
      const p = COMBO_KINDS.stop.pos(c, cNow());
      if (p < c.st.a - .015 || p > c.st.a + c.st.w + .015) return cMiss(c, "Swing and a miss!");
      clearTimeout(c.st.to);
      if (cHit(c)) { COMBO_KINDS.stop.round(c); cRedraw(c); }
    }
  },
  // a ring closes in: tap when it matches the target circle
  ring:{
    start(c) { COMBO_KINDS.ring.round(c); cLoop(c, now => { const r = $("#cbRg"); if (!r || c.done) return; const s = COMBO_KINDS.ring.size(c, now); if (s <= .12) return cMiss(c, "Too late!"); r.style.transform = `translate(-50%,-50%) scale(${s})`; }); },
    round(c) { c.st = {t0:cNow(), dur:1150 / (c.def.spd * (1 + c.hits * .14))}; },
    size(c, now) { return 1 - (now - c.st.t0) / c.st.dur * .88; },
    draw(el, c) {
      el.innerHTML = c.done ? cEnd(c) : `<div class="cbRowW"><div class="cbRing"><span class="cbTarget" style="--tol:${c.def.tol}"></span><span class="cbRg" id="cbRg"></span><b>${c.def.ic}</b></div>
        <button class="btn hot" data-cb="tap">Fire! <small>(Space)</small></button></div>`;
    },
    key(c, k) {
      if (k !== "tap") return;
      const s = COMBO_KINDS.ring.size(c, cNow());
      if (Math.abs(s - .45) > c.def.tol) return cMiss(c, s > .45 ? "Too early!" : "Too late!");
      if (cHit(c)) { COMBO_KINDS.ring.round(c); cRedraw(c); }
    }
  },
  // hold to fill a meter and let go inside the zone
  charge:{
    start(c) { COMBO_KINDS.charge.round(c); cLoop(c, now => {
      const f = $("#cbFill"); if (!f || c.done || !c.st.hold) return;
      const v = (now - c.st.hs) / 1000 * c.def.fill;
      if (v >= 1) return cMiss(c, "Overcharged!");
      f.style.width = (v * 100) + "%";
    }); },
    round(c) {
      const w = c.def.zone * Math.pow(.85, c.hits);
      c.st = {hold:false, w, a:.4 + Math.random() * (.55 - w)};
      clearTimeout(c.st.to); c.st.to = cLater(c, () => cMiss(c, "Lost focus!"), 3500);
    },
    draw(el, c) {
      el.innerHTML = c.done ? cEnd(c) : `<div class="cbCol"><div class="cbTrack cbMeter"><span class="cbZone" style="left:${c.st.a * 100}%;width:${c.st.w * 100}%"></span><span class="cbFill" id="cbFill"></span></div>
        <button class="btn hot cbHold" data-hold="1">${c.def.ic} Hold… <small>(hold Space)</small></button></div>`;
    },
    key(c, k) {
      if (k === "tap" && !c.st.hold) { c.st.hold = true; c.st.hs = cNow(); clearTimeout(c.st.to); return; }
      if (k !== "up" || !c.st.hold) return;
      const v = (cNow() - c.st.hs) / 1000 * c.def.fill;
      c.st.hold = false;
      if (v < c.st.a || v > c.st.a + c.st.w) return cMiss(c, v < c.st.a ? "Not enough power!" : "Overshot it!");
      if (cHit(c)) { COMBO_KINDS.charge.round(c); cRedraw(c); }
    }
  },
  // wait for the signal, then tap: tapping early ends it
  react:{
    start(c) { COMBO_KINDS.react.round(c); },
    round(c) {
      c.st = {go:false};
      cLater(c, () => {
        if (c.done) return;
        c.st.go = true; c.st.at = cNow(); sfx("tick"); cRedraw(c);
        c.st.to = cLater(c, () => cMiss(c, "Too slow!"), c.def.win);
      }, 550 + Math.random() * 1100);
    },
    draw(el, c) {
      el.innerHTML = c.done ? cEnd(c) : `<div class="cbRowW"><span class="cbSignal${c.st.go ? " go" : ""}">${c.st.go ? "❗" : "…"}</span>
        <button class="btn hot" data-cb="tap">${c.def.ic} ${c.st.go ? "NOW!" : "Wait for it…"} <small>(Space)</small></button></div>`;
    },
    key(c, k) {
      if (k !== "tap") return;
      if (!c.st.go) return cMiss(c, "Too early!");
      clearTimeout(c.st.to);
      if (cHit(c)) { COMBO_KINDS.react.round(c); cRedraw(c); }
    }
  },
  // press a row of arrows in order (some heroes hide them after a moment)
  seq:{
    start(c) {
      const keys = ["L", "R", "U", "D"];
      c.st = {seq:Array.from({length:c.def.len}, () => keys[Math.floor(Math.random() * 4)]), i:0, shown:true};
      if (c.def.hide) cLater(c, () => { c.st.shown = false; cRedraw(c); }, c.def.hide);
      cLater(c, () => cMiss(c, "Out of time!"), c.def.hide + c.def.len * 1000 + 800);
    },
    draw(el, c) {
      if (c.done) { el.innerHTML = cEnd(c); return; }
      el.innerHTML = `<div class="cbCol"><div class="cbSeq">${c.st.seq.map((k, i) => `<span class="${i < c.st.i ? "ok" : ""}">${i < c.st.i || c.st.shown ? ARROW[k] : "❔"}</span>`).join("")}</div>
        <div class="cbRow">${["L", "U", "D", "R"].map(k => `<button class="btn hot" data-cb="${k}">${ARROW[k]}</button>`).join("")}</div></div>`;
    },
    key(c, k) {
      if (!ARROW[k]) return;
      if (k !== c.st.seq[c.st.i]) return cMiss(c, "Wrong one!");
      c.st.i++;
      if (cHit(c, ARROW[k])) cRedraw(c);
    }
  },
  // something pops up in one of the spots: tap it before it goes
  whack:{
    start(c) { c.st = {slot:-1}; COMBO_KINDS.whack.pop(c); },
    pop(c) {
      let s; do s = Math.floor(Math.random() * c.def.slots); while (s === c.st.last && c.def.slots > 1);
      c.st.slot = s; c.st.last = s; cRedraw(c);
      c.st.to = cLater(c, () => cMiss(c, "It got away!"), c.def.life * Math.pow(.92, c.hits));
    },
    draw(el, c) {
      el.innerHTML = c.done ? cEnd(c) : `<div class="cbRow cbSlots">${Array.from({length:c.def.slots}, (_, i) => `<button class="btn cbSlot${i === c.st.slot ? " up" : ""}" data-cb="${i + 1}"><span>${i === c.st.slot ? c.def.ic : "·"}</span><small>${i + 1}</small></button>`).join("")}</div>`;
    },
    key(c, k) {
      const i = +k - 1;
      if (!(i >= 0 && i < c.def.slots)) return;
      if (i !== c.st.slot) return cMiss(c, "Wrong spot!");
      clearTimeout(c.st.to); c.st.slot = -1;
      if (cHit(c)) { cRedraw(c); cLater(c, () => COMBO_KINDS.whack.pop(c), 220); }
    }
  },
  // find the right icon among decoys
  pick:{
    start(c) { COMBO_KINDS.pick.round(c); },
    round(c) {
      const opts = cShuffle([c.def.target, ...cShuffle(c.def.decoys).slice(0, c.def.opts - 1)]);
      c.st = {opts};
      clearTimeout(c.st.to); c.st.to = cLater(c, () => cMiss(c, "Too slow!"), c.def.life * Math.pow(.9, c.hits));
      cRedraw(c);
    },
    draw(el, c) {
      el.innerHTML = c.done ? cEnd(c) : `<div class="cbRowW"><span class="cbAsk">Grab the ${c.def.target}</span><div class="cbRow">${c.st.opts.map((o, i) => `<button class="btn cbSlot" data-cb="${i + 1}"><span>${o}</span><small>${i + 1}</small></button>`).join("")}</div></div>`;
    },
    key(c, k) {
      const i = +k - 1;
      if (!(i >= 0 && i < c.st.opts.length)) return;
      if (c.st.opts[i] !== c.def.target) return cMiss(c, "Wrong one!");
      clearTimeout(c.st.to);
      if (cHit(c)) COMBO_KINDS.pick.round(c);
    }
  },
  // icons flash for a moment: how many were there?
  count:{
    start(c) { COMBO_KINDS.count.round(c); },
    round(c) {
      const n = c.def.from + c.hits + Math.floor(Math.random() * 2);
      const spots = cShuffle(Array.from({length:12}, (_, i) => i)).slice(0, n);
      c.st = {n, spots, ask:false, opts:cShuffle([n - 1, n, n + 1])};
      cRedraw(c);
      cLater(c, () => { c.st.ask = true; cRedraw(c); c.st.to = cLater(c, () => cMiss(c, "Too slow!"), 3200); }, c.def.flash);
    },
    draw(el, c) {
      if (c.done) { el.innerHTML = cEnd(c); return; }
      el.innerHTML = c.st.ask
        ? `<div class="cbRowW"><span class="cbAsk">How many ${c.def.ic}?</span><div class="cbRow">${c.st.opts.map((o, i) => `<button class="btn hot" data-cb="${i + 1}">${o} <small>(${i + 1})</small></button>`).join("")}</div></div>`
        : `<div class="cbFlash">${Array.from({length:12}, (_, i) => `<span>${c.st.spots.includes(i) ? c.def.ic : ""}</span>`).join("")}</div>`;
    },
    key(c, k) {
      const i = +k - 1;
      if (!c.st.ask || !(i >= 0 && i < 3)) return;
      clearTimeout(c.st.to);
      if (c.st.opts[i] !== c.st.n) return cMiss(c, `There were ${c.st.n}!`);
      if (cHit(c)) COMBO_KINDS.count.round(c);
    }
  },
  // spell a word by tapping its letters in order (or typing them)
  spell:{
    start(c) { c.st = {left:cShuffle(c.def.words)}; COMBO_KINDS.spell.round(c); },
    round(c) {
      const w = c.st.left[c.hits % c.st.left.length];
      Object.assign(c.st, {w, i:0, used:[], tiles:cShuffle([...w].map((ch, j) => ({ch, j})))});
      clearTimeout(c.st.to); c.st.to = cLater(c, () => cMiss(c, "Out of time!"), 1500 + w.length * 850);
      cRedraw(c);
    },
    draw(el, c) {
      if (c.done) { el.innerHTML = cEnd(c); return; }
      el.innerHTML = `<div class="cbCol"><div class="cbSeq cbWord">${[...c.st.w].map((ch, i) => `<span class="${i < c.st.i ? "ok" : ""}">${ch}</span>`).join("")}</div>
        <div class="cbRow">${c.st.tiles.map((t, k) => `<button class="btn hot cbLetter" data-cb="t:${k}" ${c.st.used.includes(k) ? "disabled" : ""}>${t.ch}</button>`).join("")}</div></div>`;
    },
    key(c, k) {
      let idx = -1;
      if (k.startsWith("t:")) idx = +k.slice(2);
      else if (k.startsWith("k:")) idx = c.st.tiles.findIndex((t, j) => !c.st.used.includes(j) && t.ch === k.slice(2).toUpperCase() && t.ch === c.st.w[c.st.i]);
      if (k.startsWith("k:") && idx < 0) { if (/^[a-z]$/i.test(k.slice(2))) cMiss(c, "Wrong letter!"); return; }
      if (idx < 0 || c.st.used.includes(idx)) return;
      if (c.st.tiles[idx].ch !== c.st.w[c.st.i]) return cMiss(c, "Wrong letter!");
      c.st.used.push(idx); c.st.i++; sfx("click");
      if (c.st.i < c.st.w.length) return cRedraw(c);
      clearTimeout(c.st.to);
      if (cHit(c, `“${c.st.w}”`)) COMBO_KINDS.spell.round(c);
    }
  }
};
function cEnd(c) { return `<p class="cbDone">${c.win ? `${c.def.ic} Perfect! ${c.hits + 1}-hit combo!` : c.hits ? `${c.hits + 1}-hit combo!` : "No combo this time."}</p>`; }

// ---------- starting, input and ending ----------
function startCombo(m, foe, d) {
  const b = tr.battle, def = comboOf(m.h);
  b.combo = {m, foe, d, def, hits:0, max:def.max || 4, st:{}, timers:[], ints:[], raf:0, done:false};
  tr.phase = "combo";
  COMBO_KINDS[def.kind].start(b.combo);
  drawMenu();
  cRedraw(b.combo);
  // a safety net so a combo can never hang the battle
  cLater(b.combo, () => { if (!b.combo.done) cMiss(b.combo, "Time's up!"); }, 26000);
}
// k: "tap" / "up" (main button down and up), "L" "R" "U" "D", "1"-"5", "t:n" (letter tile), "k:x" (typed letter)
function comboKey(k) {
  const b = tr && tr.battle, c = b && b.combo;
  if (!c || tr.phase !== "combo" || c.done) return false;
  COMBO_KINDS[c.def.kind].key(c, k);
  return true;
}
function comboTap() { return comboKey("tap"); }
function comboClear(c) { c.timers.forEach(clearTimeout); c.ints.forEach(clearInterval); cancelAnimationFrame(c.raf); c.done = true; }
function endCombo() {
  const b = tr.battle, c = b && b.combo;
  if (!c) return;
  comboClear(c);
  b.combo = null;
  if (b.over) return;
  tr.phase = "busy";
  afterAction();
}
function comboShell(c) {
  return `<div class="twCombo"><div class="cbHead"><b>${c.def.ic} ${c.def.n}</b><small>${c.def.tip}</small><span class="cbHits" id="cbHits">${c.hits}/${c.max}</span></div><div class="cbStage" id="twCS"></div></div>`;
}

// combos for the 10 newest heroes
Object.assign(COMBOS, {
  bbgang:{kind:"alt", n:"Street rumble", ic:"🧥", tip:"Alternate up and down, fast", secs:2.2, per:2, keys:["U", "D"]},
  benny:{kind:"count", n:"Take the pulse", ic:"💓", tip:"Count the heartbeats before they fade", flash:800, from:3},
  tracy:{kind:"pick", n:"Package sorting", ic:"📦", tip:"Grab the package, fast", target:"📦", decoys:["🐌", "✉️", "🧺", "🎁"], opts:4, life:1300},
  captainstrong:{kind:"mash", n:"Nightstick beatdown", ic:"👮", tip:"Mash as fast as you can", secs:2.2, per:5, pow:.38},
  venus:{kind:"beat", n:"Encore!", ic:"🎤", tip:"Tap in time with the show", beat:520, win:150},
  orangekid:{kind:"seq", n:"Untested gadget", ic:"🍊", tip:"Remember the arrows quickly, then enter them", len:4, hide:900, max:4},
  lisa:{kind:"charge", n:"Stir the stew", ic:"🍲", tip:"Hold, then let go when it's just right", fill:1, zone:.24},
  lou:{kind:"stop", n:"Timber!", ic:"🌲", tip:"Tap when the axe is over the notch", spd:1.2, zone:.22, shrink:.8},
  reggie:{kind:"react", n:"Reggie stays calm", ic:"⛺", tip:"Wait for the ❗, then strike", win:500},
  samba:{kind:"whack", n:"Banana catch", ic:"🍌", tip:"Catch the banana wherever it lands", slots:4, life:720}
});
