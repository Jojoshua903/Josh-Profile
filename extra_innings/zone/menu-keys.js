'use strict';
/* =========================================================
   MENU KEYS · Esc for the system pause, P / Tab / M for the
   inventory (the Hollow Knight / Silksong split)
   · Esc (and Start on a pad): only the system pause card
     (Resume, Map, Main Menu, plus the settings)
   · P: the inventory on the last tab it was on; Tab / M (and
     Select on a pad): the inventory on the map
   · Esc is a smart Back: inventory open → close it, back to
     playing (never straight into the pause card); pause open →
     close it; nothing open → open the pause card
   · held keys never re-trigger; P / Tab do nothing while the
     pause card owns the screen
   · window.activeMenu says who owns the screen right now:
     'none' | 'system' | 'inventory' | 'other'
   The inventory's own keys live in zone/pausemenu.js (capture
   listener, runs first). Loaded after it, on every story page.
   ========================================================= */
const MK = {
  inv: () => typeof PM !== 'undefined' && (UI.modal === 'pmenu' || PM.slowT > 0),
  menu() { if (this.inv()) return 'inventory'; if (UI.modal === 'pause') return 'system'; return UI.modal ? 'other' : 'none'; },
};
Object.defineProperty(window, 'activeMenu', { configurable: true, get: () => MK.menu() });

// the inventory was still sliding open (the world slows to a stop first): Esc or Start just cancels it
function mkCancelInventory() {
  PM.slowT = 0; PM.slowAcc = 0;
  const el = document.getElementById('pmenu'); if (el) el.classList.remove('show', 'pm-pre');
  Input.enabled = true; Input.clear();
}
setPaused = function (p) {
  if (!p) { closeModal(); return; }
  if (typeof PM !== 'undefined' && PM.slowT > 0) { mkCancelInventory(); return; }
  if (UI.modal || !started || Story.active) return;
  openModal('pause'); pauseSel = 0; markPause(); SFX.ui();
};

// runs before zone/common.js's own keydown (which would send P to the pause card)
addEventListener('keydown', e => {
  const c = e.code, isMap = typeof KEYMAP !== 'undefined' && KEYMAP[c] === 'map';
  if (c !== 'Escape' && c !== 'KeyP' && !isMap) return;
  const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  if (e.repeat) { stop(); return; }   // a held key never flips menus open and shut
  const who = MK.menu();
  if (c === 'Escape') {
    if (who === 'inventory') { stop(); if (PM.slowT > 0) mkCancelInventory(); else closeModal(); }
    return;   // 'system', 'other' and 'none' are handled by zone/common.js (close / close / open the pause card)
  }
  // P, Tab, M
  if (who === 'system') { stop(); return; }   // the pause card owns the screen
  if (who === 'none' && c === 'KeyP') { stop(); if (started && !Story.active) pmOpen(); }
  // Tab / M with nothing open go through the game's own 'map' binding (opens the inventory on the map)
}, true);

/* ---------- the pause card is the system pause again ---------- */
(function () {
  const pc = document.querySelector('#pause .pause-card'); if (!pc) return;
  const h = pc.querySelector('h1'), ey = pc.querySelector('.eyebrow');
  if (h) h.textContent = 'Paused';
  if (ey) ey.textContent = 'Timeout';
  if (!pc.querySelector('.mk-hint')) pc.insertAdjacentHTML('beforeend', '<p class="mk-hint" style="margin-top:14px;font-family:var(--serif);font-style:italic;font-size:13px;color:rgba(230,223,208,.45)"><kbd>Esc</kbd> resume · <kbd>P</kbd> / <kbd>Tab</kbd> inventory &amp; map (from the game)</p>');
})();
