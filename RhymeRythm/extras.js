'use strict';
// ---------- Album, medals, story replays ----------
const P_ = (pk, s = .95, y = 120) => () => actor(pk, { x: 100, y, s, arms: .4 });
const CHARS = [
  { g: 'De broers', pk: 'joep', n: 'Joep op de Stoep', id: 'stoep', bio: 'The energetic leader. Counts everything, out loud, always.', d: () => bro('joep', { x: 100, y: 118, s: .95, arms: .8 }) },
  { g: 'De broers', pk: 'cas', n: "Cas in 't Gras", id: 'gras', bio: 'The oldest and most relaxed brother. Has napped through a demon attack.', d: () => bro('cas', { x: 100, y: 118, s: .95 }) },
  { g: 'De broers', pk: 'luur', n: 'Luur op de Muur', id: 'muur', bio: 'The curious youngest. Asks “wat is dát?” about forty times a day.', d: () => bro('luur', { x: 100, y: 118, s: .95, look: 1 }) },
  { g: 'De buurt', pk: 'pluk', n: 'Pluk de Rukkende Uk', id: 'pluk', bio: 'Tiny toddler, enormous grip. Can yank out a beet bigger than Pluk.', d: () => ART.pluk(100, 128, { s: 1.05, arms: 1 }) },
  { g: 'De buurt', pk: 'zurm', n: 'Zurm de Boekenwurm', id: 'zurm', bio: 'Half girl, half worm, all reader. Has a bookmark in every book in town.', d: () => { g.save(); g.translate(128, 104); g.scale(.6, .6); ART.zurm(0, 0); g.restore(); } },
  { g: 'De buurt', pk: 'janet', n: 'Janet', id: 'raket', bio: 'Comically tall rocket builder. Never needs a ladder to reach the nose cone.', d: () => { g.save(); g.translate(100, 6); g.scale(.55, .55); ART.janet(0, 340); g.restore(); } },
  { g: 'De buurt', pk: 'fred', n: 'Fred', id: 'raket', bio: 'Janet’s small inventor dad. Big ideas, bigger goggles.', d: () => ART.fred(100, 122, { s: 1.05, arms: .5 }) },
  { g: 'De buurt', pk: 'skelet', n: 'Skelet met Pret', id: 'skelet', bio: 'Funny skeleton anti-hero. Used to work for Toon. Now works for applause.', d: () => { g.save(); g.translate(100, 82); g.scale(.62, .62); ART.skeleton(0, 0, { pose: .6, grin: 1 }); g.restore(); } },
  { g: 'Nieuwe vrienden', pk: 'pieter', n: 'Pieter met een Gieter', id: 'tuin', bio: 'The town gardener. Talks to his plants, and they seem to listen.', d: P_('pieter', .9, 128) },
  { g: 'Nieuwe vrienden', pk: 'koen', n: 'Koen verkoopt Meloen', id: 'meloen', bio: 'Army veteran turned fruit vendor. Runs his stall like a boot camp.', d: P_('koen') },
  { g: 'Nieuwe vrienden', pk: 'annemiek', n: 'Annemiek the Freak', id: 'freak', bio: 'Joep’s girlfriend. Proudly, gloriously weird. Joep goes red at the mention.', d: P_('annemiek', .9, 128) },
  { g: 'Nieuwe vrienden', pk: 'kouw', n: 'Kouw aan de Bouw', id: 'bouw', bio: 'Half man, half spider, six legs, always building something.', d: P_('kouw', .75, 118) },
  { g: 'Nieuwe vrienden', pk: 'martin', n: 'Martin-Broom heeft een Droom', id: 'droom', bio: 'Always dreaming, usually asleep. His dreams have a habit of coming true.', d: P_('martin', .9, 132) },
  { g: 'Nieuwe vrienden', pk: 'rolf', n: 'Rolf de Alpha Wolf', id: 'huil', bio: 'A huge alpha wolf who leads the pack. Tough outside, softie inside.', d: P_('rolf', .72, 120) },
  { g: 'Schurken & beschermers', pk: 'toon', n: 'Toon de Demoon', id: 'toon', bio: 'Red octopus demon from the drain. Wants the stoep. Will not get the stoep.', d: () => toonAt(100, 92, .5, 0) },
  { g: 'Schurken & beschermers', pk: 'baas', n: 'De Baas van Sinterklaas', id: 'baas', bio: 'A mysterious, mean alien who kidnapped Sinterklaas. Nobody knows his real name.', d: P_('baas', .75, 126) },
  { g: 'Schurken & beschermers', pk: 'sint', n: 'Sinterklaas', id: 'baas', bio: 'The good saint himself, rescued from a bubble on a spaceship.', d: P_('sint', .8, 128) },
  { g: 'Schurken & beschermers', pk: 'maat', n: 'Maat met Zinkfosfaat', id: 'toon', bio: 'The boys’ guardian angel and the most powerful being in the verse. Rarely seen, always watching.', d: () => { g.save(); g.translate(100, 104); g.scale(.6, .6); ART.maat(0, 0, 1); g.restore(); } },
];
const SCENE_NAMES = [['opening', 'Opening'], ['gras', 'Cas wants a nap'], ['fiets', 'Tring tring'], ['muur', 'Over the wall'], ['pluk', 'Meet Pluk'], ['remix1', 'Getting louder'],
  ['zurm', 'Chapter twelve'], ['klomp', 'Clogs'], ['raket', 'To the moon'], ['ssst', 'Quiet please'], ['skelet', 'Skelet shows up'], ['putdeksel', 'Skelet switches sides'],
  ['toon', 'Toon rises'], ['ending', 'Ending: Toon'], ['tuin', 'Sinterklaas is missing'], ['meloen', 'Drill practice'], ['freak', 'Annemiek'], ['bouw', 'A tall tower'],
  ['droom', 'The dream'], ['huil', 'The pack'], ['baas', 'The saucer'], ['ending2', 'Ending: De Baas'], ['megamix', 'The big concert'], ['ending3', 'Ending: Maat']];
const cleared = id => (SAVE.best[id] ?? -1) >= 62;

function buildAlbum() {
  const box = $('album'); box.innerHTML = '';
  const groups = [...new Set(CHARS.map(c => c.g))];
  groups.forEach(gname => {
    const sec = document.createElement('div'); sec.className = 'agroup';
    sec.innerHTML = `<h4>${gname}</h4><div class="agrid"></div>`; box.appendChild(sec);
    CHARS.filter(c => c.g === gname).forEach(c => {
      const open = cleared(c.id), p = PERSONA[c.pk], card = document.createElement('div'); card.className = 'acard' + (open ? '' : ' locked');
      const cnv = document.createElement('canvas'), dpr = window.devicePixelRatio || 1; cnv.width = cnv.height = 200 * dpr;
      card.appendChild(cnv);
      card.insertAdjacentHTML('beforeend', `<h5>${open ? c.n : '???'}</h5><p>${open ? c.bio : 'Clear their song to unlock.'}</p>` +
        (open && p ? `<div class="more"><b>Catchphrase</b>${p.catch}<b>Likes</b>${p.likes}<b>Can’t stand</b>${p.dislikes}<b>Secret</b>${p.secret}</div>` : ''));
      if (open) card.onclick = () => { card.classList.toggle('open'); initAudio(); if (!OUT) newBus(); talk(c.pk); };
      sec.querySelector('.agrid').appendChild(card);
      const ctx = cnv.getContext('2d'); ctx.scale(dpr, dpr);
      withCtx(ctx, () => { circ(100, 100, 92, open ? '#fbf3e4' : '#ddd', 0); c.d(); });
    });
  });
  $('albumPill').textContent = `${CHARS.filter(c => cleared(c.id)).length} / ${CHARS.length} characters`;
}

function buildExtras() {
  $('medals').innerHTML = '';
  ALL.forEach(L => {
    const s = SAVE.best[L.id], sup = s >= 88, per = SAVE.perfect[L.id];
    const row = document.createElement('div'); row.className = 'mrow';
    row.innerHTML = `<b>${L.title}</b><span class="ic">${sup ? '🏅' : '·'}${per ? ' 💿' : ''}</span>`;
    if (sup && !per) { const b = document.createElement('button'); b.className = 'btn small'; b.textContent = '★ Try'; b.onclick = () => openIntro(L); row.appendChild(b); }
    $('medals').appendChild(row);
  });
  $('storyList').innerHTML = '';
  SCENE_NAMES.forEach(([k, name]) => {
    const seen = SAVE.seen[k], b = document.createElement('button');
    b.className = 'btn alt small slink'; b.disabled = !seen; b.textContent = seen ? `▸ ${name}` : '🔒 ???';
    b.onclick = () => playStory(k, () => goScreen('extras'));
    $('storyList').appendChild(b);
  });
  $('exPill').textContent = `🏅 ${medalCount()} medals · 💿 ${Object.keys(SAVE.perfect).length} gold`;
}

// ---------- new cast in the scenario builder and Level Maker ----------
Object.assign(CAST_NAMES, { pieter: 'Pieter', koen: 'Koen', annemiek: 'Annemiek', kouw: 'Kouw', martin: 'Martin-Broom', rolf: 'Rolf', baas: 'De Baas', sint: 'Sinterklaas' });
Object.assign(SETTINGS, {
  markt: ['The market', () => { sky('#fff1c4', '#fde0b0'); for (let i = 0; i < 10; i++) poly([[i * 100, 60], [i * 100 + 50, 106], [i * 100 + 100, 60]], i % 2 ? '#ef4a36' : '#fff', 3); rr(-10, 400, W + 20, 150, 0, '#d8c6a6', 4); }],
  tuin: ['The garden', () => { sky('#cdeefb', '#f3fbe6'); rr(-10, 390, W + 20, 160, 0, '#8a5a3b', 4); for (let i = 0; i < 9; i++) { ln(60 + i * 110, 390, 60 + i * 110, 340, 4, '#3d8a3a'); circ(60 + i * 110, 336, 10, ['#ef4a36', '#f6b92b', '#f59ab5'][i % 3], 3); } }],
  dak: ['The rooftops', () => { sky('#ffb8a0', '#ffd6e4'); for (let i = 0; i < 8; i++) { const x = i * 130 - 20; rr(x, 390, 120, 200, 0, '#b5482f', 4); poly([[x, 390], [x + 60, 340], [x + 120, 390]], '#5a2a20', 4); } }],
  maan: ['Under the moon', () => { sky('#ffc4d6', '#ffe9c7'); circ(760, 120, 80, '#fff8d6', 4); rr(-10, 410, W + 20, 140, 0, '#7a8f6a', 4); }],
});
Object.assign(MAKER_GAMES, {
  tuin: [['knop', 'Bud (plop)', 1], ['snel', 'Quick bud (plip-plip)', 1], ['henk', 'Henk the sunflower', 2]],
  meloen: [['meloen', 'Melon', 1], ['kokos', 'Coconut', 1], ['ananas', 'Pineapple', 2]],
  freak: [['pose', 'Boing-boing pose', 1], ['gek', 'Wobble pose', 1.5], ['kus', 'Grand finale', 2]],
  bouw: [['spijker', 'Nail', 1]],
  droom: [['bel', 'Dream bubble', 2], ['schaap', 'Sheep', 1], ['ster', 'Shooting star', 1]],
  huil: [['huil', 'Long howl', 2], ['kort', 'Two yips', 1], ['maan', 'Full-moon howl', 3]],
  baas: [['pew', 'Laser', 1], ['straal', 'Big beam', 2], ['vrij', 'Free Sinterklaas', 3]],
});
