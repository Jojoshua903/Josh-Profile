'use strict';
/* =========================================================
   CINEMA · the small polish between the big moments (every game page)
   · the music fades over 0.4s into a loading screen, under a menu,
     and steps aside for a beat when a boss arena seals
   · the cursor hides while you play: the moment you move with the
     keyboard or a controller, or after 1.5s without touching the mouse.
     Menus and the map always show it.
   The area banner and the boss-intro letterbox live in zone/story.js,
   zone/common.js and zone.css; the loading card is in release.js.
   ========================================================= */
(function () {
  const music = (fn, ...a) => { try { if (typeof Music !== 'undefined' && Music[fn]) Music[fn](...a); } catch (e) { logErr('zone/cinema.js:music', e); } };

  /* ---------- music fades ---------- */
  const _go = goToPage;
  goToPage = function () { music('fadeTo', 0, 0.4); return _go.apply(this, arguments); };
  // any menu (pause, map, shops, options) sinks the music to 40%; it comes back when the last one closes.
  // Watched, not wrapped: some close buttons hold the original closeModal.
  let inMenu = false;
  setInterval(() => {
    const m = !!(typeof UI !== 'undefined' && UI.modal);
    if (m !== inMenu) { inMenu = m; music('fadeTo', m ? 0.4 : 1, 0.4); }
  }, 100);
  const _boss = BossBar.show;
  BossBar.show = function () { if (!$('#bossBar').classList.contains('show')) music('dip', 0.4, 0.25); return _boss.apply(this, arguments); };

  /* ---------- the cursor ---------- */
  const IDLE = 1500, root = document.documentElement;
  const st = document.createElement('style');
  st.textContent = 'html.ei-nocur,html.ei-nocur *{cursor:none!important}';
  document.head.appendChild(st);
  let lastMouse = performance.now(), hidden = false;
  const playing = () => document.body.classList.contains('playing');
  const set = h => { if (h !== hidden) { hidden = h; root.classList.toggle('ei-nocur', h); } };
  addEventListener('mousemove', () => { lastMouse = performance.now(); set(false); }, { passive: true });
  addEventListener('mousedown', () => { lastMouse = performance.now(); set(false); }, { passive: true });
  addEventListener('keydown', () => { if (playing()) set(true); }, { passive: true });
  // a controller moving or pressing anything counts like a key
  const padActive = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      if (p.axes.some(a => Math.abs(a) > 0.35) || p.buttons.some(b => b.pressed)) return true;
    }
    return false;
  };
  setInterval(() => {
    if (!playing()) { set(false); return; }
    if (performance.now() - lastMouse > IDLE) set(true);
    else if (padActive()) set(true);
  }, 200);

  /* ---------- the Hype orb sings as it fills ---------- */
  // a soft tone rising with the meter (300 → 600 Hz) on every real gain, a bright major chord when it tops out;
  // the slow trickle from Deniz's tea stays silent
  if (typeof Player !== 'undefined' && typeof Player.gainHype === 'function') {
    const _gain = Player.gainHype;
    let lastT = 0;
    Player.gainHype = function (n) {
      const max = this.hypeMax || 99, was = this.hype;
      const r = _gain.apply(this, arguments);
      try {
        const now = performance.now();
        if (n >= 1 && this.hype > was) {
          if (was < max && this.hype >= max) SFX.hypeTone(1);
          else if (now - lastT > 60) { lastT = now; SFX.hypeTone(this.hype / max); }
        }
      } catch (e) { logErr('zone/cinema.js:hype', e); }
      return r;
    };
  }
})();
