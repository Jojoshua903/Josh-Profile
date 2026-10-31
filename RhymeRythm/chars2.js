'use strict';
// ---------- Chapter 3 cast: drawings ----------
const handAt = (sd, a) => [sd * (34 + a * 4 + Math.sin(a * 3) * 8), 30 - a * 78];
const armsOf = (o, l, r) => [o.al ?? o.arms ?? l, o.ar ?? o.arms ?? r];
const NOW = () => performance.now() / 1000;

ACTORS.pieter = o => at(o, () => {
  const [al, ar] = armsOf(o, .2, .5);
  kid({ x: 0, y: 0, col: '#4f8a3a', skin: '#e9b48a', hair: '#7a4a2a', eyes: o.eyes || 'happy', mouth: o.mouth || 'smile', al, ar, look: o.look });
  ln(-14, -12, -10, 14, 4, '#c9e2a8'); ln(14, -12, 10, 14, 4, '#c9e2a8');
  ell(0, -66, 50, 10, '#e9c46a', 4); rr(-24, -98, 48, 32, 10, '#e9c46a', 4); rr(-24, -76, 48, 6, 0, '#ef4a36', 0);
  const [hx, hy] = handAt(1, ar);
  g.save(); g.translate(hx + 16, hy); rr(-16, -12, 32, 26, 6, '#4d7cf0', 3); ln(14, -4, 36, -18, 5); ell(38, -20, 7, 5, '#4d7cf0', 2); g.restore();
});
ACTORS.koen = o => at(o, () => {
  const [al, ar] = armsOf(o, .4, .2);
  kid({ x: 0, y: 0, col: '#6b7f3a', skin: '#d9a27a', eyes: o.eyes || 'open', mouth: o.mouth || 'flat', al, ar, look: o.look });
  rr(-20, 0, 40, 34, 4, '#fff', 3); circ(0, 16, 8, '#7bc96f', 2);
  g.beginPath(); g.arc(0, -54, 33, Math.PI, 0); g.closePath(); paint('#55682c', 4); rr(-38, -58, 76, 8, 4, '#55682c', 3);
  ell(0, -35, 14, 5, '#5a3a22', 0);
  const [hx, hy] = handAt(-1, al);
  circ(hx - 6, hy - 12, 16, '#3d8a3a', 3); for (let i = -1; i <= 1; i++) ln(hx - 6 + i * 6, hy - 26, hx - 6 + i * 6, hy + 2, 2, '#9bd97b');
});
ACTORS.annemiek = o => at(o, () => {
  const [al, ar] = armsOf(o, .3, .3);
  [-1, 1].forEach(sd => { circ(sd * 28, -72, 17, '#8e44ad', 4); poly([[sd * 28, -92], [sd * 38, -104], [sd * 40, -84]], '#8e44ad', 3); });
  kid({ x: 0, y: 0, col: '#f59ab5', skin: '#f6d0b0', eyes: o.eyes || 'big', mouth: o.mouth || 'grin', al, ar, look: o.look });
  g.beginPath(); g.arc(0, -50, 31, Math.PI * 1.05, -Math.PI * .05); g.quadraticCurveTo(10, -58, -2, -52); g.quadraticCurveTo(-14, -60, -30, -54); paint('#8e44ad', 4);
  [4, 16, 28].forEach(y => ln(-24, y, 24, y, 3, '#fff'));
  circ(-11, -44, 12, null, 3); txt('★', 19, -30, 13, '#f6b92b');
});
ACTORS.martin = o => at(o, () => {
  const [al, ar] = armsOf(o, .15, .15);
  kid({ x: 0, y: 0, col: '#8fd3f0', skin: '#f2cfae', hair: '#c8742c', eyes: o.eyes || 'sleepy', mouth: o.mouth || 'smile', al, ar, look: o.look });
  [[-12, 4], [10, 14], [-6, 26], [14, 30]].forEach(([x, y]) => circ(x, y, 3, '#fff', 0));
  g.beginPath(); g.moveTo(-31, -56); g.quadraticCurveTo(0, -116, 60, -82); g.lineTo(30, -56); g.closePath(); paint('#4d7cf0', 4);
  circ(62, -82, 8, '#fff', 3); rr(-32, -62, 64, 10, 5, '#fff', 3);
  if ((o.eyes || 'sleepy') === 'sleepy') { const k = NOW() % 2 / 2; txt('z', 34, -96 - k * 26, 16 + k * 8, INK, 'center', HAND, 400); }
});
ACTORS.kouw = o => at(o, () => {
  const [al, ar] = armsOf(o, .2, .6), t = NOW();
  ell(0, 44, 32, 24, '#3a3354', 4);
  [-1, 1].forEach(sd => { for (let i = 0; i < 3; i++) {
    const w = Math.sin(t * 7 + i * 2 + sd) * 4, kx = sd * (56 + i * 6), ky = -22 + i * 12 + w, fx = sd * (72 + i * 12), fy = 66;
    ln(sd * 20, 20 + i * 10, kx, ky, 7); ln(kx, ky, fx, fy, 7); ell(fx, fy, 7, 4, INK, 0);
  } });
  kid({ x: 0, y: 0, col: '#f77f00', skin: '#c98c63', legs: false, eyes: o.eyes || 'open', mouth: o.mouth || 'grin', al, ar, look: o.look });
  ln(-24, 10, 24, 10, 4, '#fff'); ln(-24, 22, 24, 22, 4, '#fff');
  g.beginPath(); g.arc(0, -54, 33, Math.PI, 0); g.closePath(); paint('#ffd60a', 4); rr(-40, -58, 80, 9, 4, '#ffd60a', 3);
  const [hx, hy] = handAt(1, ar);
  g.save(); g.translate(hx, hy); g.rotate(-.5); rr(-3, -36, 6, 36, 2, '#9b6b43', 2); rr(-12, -44, 24, 12, 3, '#9aa3b5', 3); g.restore();
});
ACTORS.rolf = o => at(o, () => {
  const [al, ar] = armsOf(o, .2, .2);
  g.scale(1.2, 1.2);
  const fur = (x1, y1, x2, y2, lw) => { ln(x1, y1, x2, y2, lw + 5); ln(x1, y1, x2, y2, lw, '#7d8597'); };
  fur(-14, 34, -18, 62, 12); fur(14, 34, 18, 62, 12); ell(-20, 64, 13, 7, '#7d8597', 3); ell(20, 64, 13, 7, '#7d8597', 3);
  g.beginPath(); g.moveTo(16, 30); g.quadraticCurveTo(66, 20, 58, -14); g.lineCap = 'round'; g.lineWidth = 16; g.strokeStyle = INK; g.stroke(); g.lineWidth = 10; g.strokeStyle = '#7d8597'; g.stroke();
  [[-1, al], [1, ar]].forEach(([sd, a]) => { const [hx, hy] = handAt(sd, a); fur(sd * 22, -2, hx, hy, 11); circ(hx, hy, 8, '#d6d9de', 3); });
  ell(0, 6, 30, 36, '#7d8597', 4); ell(0, 12, 16, 22, '#d6d9de', 0);
  poly([[-24, -62], [-16, -96], [-4, -70]], '#7d8597', 4); poly([[24, -62], [16, -96], [4, -70]], '#7d8597', 4);
  circ(0, -48, 28, '#7d8597', 4);
  const lk = (o.look || 0) * 4;
  ell(lk, -34, 18, 13, '#d6d9de', 4); circ(lk, -42, 6, INK, 0);
  if (o.eyes === 'x') [-11, 11].forEach(dx => { ln(dx - 5, -61, dx + 5, -51, 3); ln(dx + 5, -61, dx - 5, -51, 3); });
  else { [-11, 11].forEach(dx => { circ(dx + lk, -56, 5, '#f6b92b', 2); circ(dx + lk, -56, 2, INK, 0); }); ln(-20, -66, -6, -61, 4); ln(20, -66, 6, -61, 4); }
  if (o.mouth === 'wow' || o.mouth === 'o') ell(lk, -24, 7, 8, '#7a2a2a', 3);
  else { g.beginPath(); g.arc(lk, -30, 9, .2, Math.PI - .2); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); poly([[lk - 5, -23], [lk - 2, -18], [lk + 1, -23]], '#fff', 1.5); }
});
ACTORS.baas = o => at(o, () => {
  const [al, ar] = armsOf(o, .1, .1);
  g.translate(0, Math.sin(NOW() * 3) * 4);
  poly([[-34, -10], [34, -10], [48, 64], [-48, 64]], '#4a2a6a', 4);
  poly([[-34, -10], [-50, -42], [-8, -14]], '#6a3a8a', 3); poly([[34, -10], [50, -42], [8, -14]], '#6a3a8a', 3);
  [[-1, al], [1, ar]].forEach(([sd, a]) => { const [hx, hy] = handAt(sd, a); ln(sd * 26, 0, hx * 1.2, hy, 6); circ(hx * 1.2, hy, 6, '#9bc59d', 3); });
  ln(0, -100, 0, -124, 3); circ(0, -128, 7, '#ef4a36', 3);
  ell(0, -56, 40, 46, '#9bc59d', 4);
  if (o.eyes === 'x') [-16, 16].forEach(dx => { ln(dx - 7, -63, dx + 7, -49, 4); ln(dx + 7, -63, dx - 7, -49, 4); });
  else { ell(-16, -56, 13, 8, INK, 0, -.5); ell(16, -56, 13, 8, INK, 0, .5); circ(-20, -59, 2.5, '#fff', 0); circ(12, -59, 2.5, '#fff', 0); }
  ln(-30, -74, -6, -66, 4); ln(30, -74, 6, -66, 4);
  g.beginPath();
  if (o.mouth === 'grin') g.arc(0, -32, 10, .2, Math.PI - .2); else g.arc(0, -22, 9, Math.PI * 1.15, -Math.PI * .15);
  g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
});
ACTORS.sint = o => at(o, () => {
  const [al, ar] = armsOf(o, .1, .3);
  ln(-12, 30, -14, 62, 9); ln(12, 30, 14, 62, 9);
  [[-1, al], [1, ar]].forEach(([sd, a]) => { const [hx, hy] = handAt(sd, a); ln(sd * 20, 0, hx, hy, 10, '#d62828'); circ(hx, hy, 7, '#fff', 3); });
  rr(-30, -14, 60, 70, 14, '#d62828', 4); ln(0, -14, 0, 56, 6, '#f6b92b');
  circ(0, -46, 26, '#f2cfae', 4);
  [-9, 9].forEach(dx => circ(dx, -50, 3.5, INK, 0));
  g.beginPath(); g.moveTo(-24, -40); g.quadraticCurveTo(0, 30, 24, -40); g.quadraticCurveTo(0, -24, -24, -40); paint('#fff', 4);
  poly([[-24, -66], [24, -66], [18, -112], [0, -128], [-18, -112]], '#d62828', 4);
  ln(0, -112, 0, -80, 4, '#f6b92b'); ln(-10, -98, 10, -98, 4, '#f6b92b');
  const [hx, hy] = handAt(1, ar); ln(hx, hy + 40, hx, hy - 90, 5, '#f6b92b'); g.beginPath(); g.arc(hx - 10, hy - 90, 10, 0, Math.PI, true); g.lineWidth = 5; g.strokeStyle = '#f6b92b'; g.stroke();
});
ART.ufo = (x, y, beam = 0) => {
  if (beam) { g.save(); g.globalAlpha = .35 * beam; poly([[x - 30, y + 20], [x + 30, y + 20], [x + 110, y + 330], [x - 110, y + 330]], '#9bf59d', 0); g.restore(); }
  ell(x, y - 18, 40, 30, 'rgba(190,240,255,.7)', 4);
  ell(x, y, 110, 26, '#9aa3b5', 4); ell(x, y + 6, 70, 10, '#6c7488', 0);
  for (let i = -3; i <= 3; i++) circ(x + i * 28, y + 4, 5, (Math.floor(NOW() * 6) + i) % 2 ? '#f6b92b' : '#ef4a36', 2);
};

// ---------- Chapter 3 cast: personalities ----------
Object.assign(PERSONA, {
  pieter: { name: 'Pieter', voice: [4, 'o'], catch: '“Een beetje water doet wonderen.”', likes: 'Tulips, rain, talking to plants', dislikes: 'Slugs, droughts, plastic flowers',
    secret: 'Names every plant he grows. The giant sunflower is called Henk.',
    taps: ['Sst, Henk is aan het groeien.', 'Water? Water!', 'Plants like a good beat too.', '*waters your shoes*'],
    streak: ['Alles bloeit!', 'Groene vingers!', 'What a harvest!'],
    after: ['The garden has never looked better.', 'A few thirsty plants, but they’ll live.', 'Plants are patient. Try again.'] },
  koen: { name: 'Koen', voice: [-3, 'a'], catch: '“MELOEN! Twee voor een tientje!”', likes: 'Discipline, fresh fruit, a tidy stall', dislikes: 'Bruised fruit, sloppy marching, being late',
    secret: 'Still salutes every watermelon before he sells it.',
    taps: ['Ten-HUT! …Peer?', 'Fresh melons, soldier!', 'Back in my day we marched in the rain.', 'Links, rechts, links… MELOEN!'],
    streak: ['Outstanding, soldier!', 'Tight formation!', 'That’s an order: keep going!'],
    after: ['Mission accomplished. Have a melon.', 'Acceptable. Drop and give me ten grapes.', 'Again, from the top! Discipline!'] },
  annemiek: { name: 'Annemiek', voice: [14, 'i'], catch: '“Raar is gewoon leuk.”', likes: 'Pulling faces, odd socks, Joep (don’t tell him)', dislikes: 'Boring days, matching outfits',
    secret: 'Taught herself to wiggle her ears in rhythm. Practises on Joep.',
    taps: ['Wanna see my weird face?', 'Joep is cute when he counts.', 'Freaky every day of the week!', '*does a backwards cartwheel*'],
    streak: ['Freaky good!', 'Wild!', 'Nobody does weird like us!'],
    after: ['Ha! That was gloriously weird.', 'Weird, but in the good way.', 'Too normal! Get freakier and try again.'] },
  kouw: { name: 'Kouw', voice: [-6, 'o'], catch: '“Even een muurtje bouwen.”', likes: 'Scaffolding, power tools, having six hands free', dislikes: 'Unfinished jobs, flies (it’s complicated)',
    secret: 'Has built a tiny house for every spider in the neighbourhood.',
    taps: ['Six legs, zero breaks.', 'Mind the wet cement!', 'I could build that. Want me to?', '*hammers three things at once*'],
    streak: ['Solid work!', 'Strak gebouwd!', 'Level and plumb!'],
    after: ['Built to last.', 'Slightly wonky, but it stands.', 'Knock it down, start again.'] },
  martin: { name: 'Martin-Broom', voice: [0, 'o'], catch: '“Ik had een droom…”', likes: 'Naps, clouds, telling you about his dreams', dislikes: 'Alarm clocks, being woken mid-dream',
    secret: 'His dreams sometimes come true. Nobody believes him. Yet.',
    taps: ['I dreamt about a flying melon.', 'Mmm… five more dreams.', 'Last night I was a cloud.', '*falls asleep standing up*'],
    streak: ['Dreamy!', 'Like floating!', 'Is this a dream?'],
    after: ['What a beautiful dream that was.', 'A nice dream with a few bumpy bits.', 'Bit of a nightmare. Sleep on it and try again.'] },
  rolf: { name: 'Rolf', voice: [-9, 'a'], catch: '“AUUUUUU!”', likes: 'Full moons, being in charge, push-ups', dislikes: 'Leashes, cats, losing a howl-off',
    secret: 'Is a big softie who cries at puppy videos.',
    taps: ['I am the alpha. Of this stoep.', 'AUUUU!', 'Want to arm-wrestle?', '*flexes*'],
    streak: ['Pack power!', 'AUUU! YES!', 'Alpha energy!'],
    after: ['The pack is proud of you, cub.', 'Decent howling, cub.', 'Weak howl. Again!'] },
  baas: { name: 'De Baas', voice: [-15, 'u'], catch: '“Sinterklaas blijft bij MIJ.”', likes: 'Cold planets, total control, hoarding pepernoten', dislikes: 'Songs, cheering, the smell of speculaas',
    secret: 'Never got a single present as a little alien. Not one.',
    taps: ['Silence, earthling.', 'Sinterklaas is… busy.', 'Your rhythm is irrelevant.', '*antenna flashes angrily*'] },
  sint: { name: 'Sinterklaas', voice: [-5, 'o'], catch: '“Dank je wel, kinderen!”', likes: 'Pepernoten, his horse, children singing', dislikes: 'Being locked in a bubble on a spaceship',
    secret: 'Knows every rhythm song by heart. He wrote a few of them.',
    taps: ['Dank je wel!', 'Hebben jullie goed geoefend?', 'Waar is mijn paard?'] },
});
