/* =========================================================
   SPIKE KILLS · knock an enemy into spikes and it dies.
   Only enemies you've hit in the last second count, so the
   ones that sit next to spikes by design (ticks, drones over
   spike pits) aren't killed by their own placement.
   Bosses, crates, the dummy and turrets are immune.
   ========================================================= */
const SPIKE_IMMUNE = new Set(['boss', 'crate', 'dummy', 'turret', 'orb']);
const spikeState = new WeakMap();   // enemy → { hp, hitT }
const _skTick = PAGE.tick;
PAGE.tick = function (dt) {
  if (_skTick) _skTick.apply(this, arguments);
  for (const e of Enemies) {
    if (e.dead || e === Zone.boss || e.boss || SPIKE_IMMUNE.has(e.type) || typeof e.hp !== 'number' || !e.takeHit) continue;
    let s = spikeState.get(e);
    if (!s) { s = { hp: e.hp, hitT: 0 }; spikeState.set(e, s); }
    if (e.hp < s.hp) s.hitT = 1.0;   // took a hit this frame: armed for a second
    s.hp = e.hp; s.hitT = Math.max(0, s.hitT - dt);
    if (s.hitT <= 0 || !rectHitsSpikes(e, 2)) continue;
    const cx = e.x + e.w / 2, cy = e.y + e.h;
    e.hp = 0; enemyDie(e);
    SFX.spike(); addHitstop(0.06);
    burst(cx, cy - 6, 14, { angle: -Math.PI / 2, spread: 0.9, colors: ['#f3ead8', '#e8361c', '#d9cfbd'], maxSpeed: 520, type: 'spark' });
    pop(cx, cy - e.h - 26, 'SPIKED!', { size: 32, color: '#f3ead8', burstColor: FLAME });
    if (e.givesHype) Player.gainHype(TUNE.hypePerHit);
    Game.combo++; Game.comboT = 1.6;
    if (!Save.data.q.spikeTip) { Save.data.q.spikeTip = 1; saveGame(); setTimeout(() => toast('SPIKED! · KNOCK ENEMIES INTO SPIKES TO FINISH THEM INSTANTLY'), 500); }
  }
};
