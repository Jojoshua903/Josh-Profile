/* Main menu · five trophies for the five endings. Gold once you've seen one;
   locked ones show a hint on hover. Gold stars for the Scoreboard challenges. */
(function () {
  const el = document.getElementById('menuTrophies'); if (!el) return;
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { logErr("menu-endings.js:5", e); return null; } };
  const L = read('ei_endings') || [], R = read('ei_records') || {}, z = read('ei_zone1') || {};
  // saves that finished before trophies existed
  if (z.endingA && !L.includes('standard')) L.push('standard');
  if (z.trueEnding && !L.includes('true')) L.push('true');
  const E = [
    ['standard', 'Game, Set, Match', 'Beat Evil Adam.'],
    ['ego', 'New Management', 'Win it all by yourself, and keep what the trophies offer.'],
    ['joke', 'Works On My Machine', 'Side with Josh. Then bring him what the Rogue Server left behind.'],
    ['chill', 'Eternal Chill', 'Finish Deniz\'s herb quest, then drink deeply right before the climb.'],
    ['true', 'Extra Innings', 'Every friend. Every pebble. The bat you started with.'],
  ];
  const cup = on => `<svg viewBox="0 0 24 24"><path d="M7 3h10v4a5 5 0 0 1-10 0z M7 5H4a3 3 0 0 0 3 4 M17 5h3a3 3 0 0 1-3 4 M12 12v4 M8 20h8l-1-4H9z" fill="${on ? '#f2c14e' : 'none'}" stroke="${on ? '#1a1218' : 'rgba(243,234,216,.35)'}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const stars = (R.under45 ? 1 : 0) + (R.lowPct ? 1 : 0);
  el.innerHTML = E.map(([id, name, hint]) => {
    const on = L.includes(id);
    return `<i class="${on ? 'on' : ''}" title="${on ? name : '??? · ' + hint}">${cup(on)}</i>`;
  }).join('') + `<b>${L.length}/5${stars ? ' ' + '★'.repeat(stars) : ''}</b>`;
  if (stars) el.title = `Scoreboard: ${R.under45 ? 'under 45:00 ✓ ' : ''}${R.lowPct ? 'Low-% ✓' : ''}`;
})();
