'use strict';
// ---------- extra character art ----------
ART.pluk = (x, y, o = {}) => kid(Object.assign({ x, y, s: .72, col: '#fff', skin: '#f9d3b4', hat: 'tuft', hair: '#f2c94c', eyes: 'big', mouth: 'grin' }, o));
ART.fred = (x, y, o = {}) => {
  kid(Object.assign({ x, y, s: .8, col: '#f4f1ea', skin: '#e8b48c', eyes: 'open', mouth: 'smile' }, o));
  const fh = y - 35;
  [-9, 9].forEach(dx => circ(x + dx, fh - 2, 7, 'rgba(143,211,240,.7)', 3)); ln(x - 24, fh - 2, x + 24, fh - 2, 3); ell(x, fh + 12, 12, 4, '#8a8a8a', 2);
};
ART.janet = (x, y, o = {}) => {   // y = where her feet stand
  const jy = y - 270;
  ln(x - 12, jy + 30, x - 16, y - 4, 10); ln(x + 12, jy + 30, x + 16, y - 4, 10);
  ell(x - 22, y, 14, 7, INK, 0); ell(x + 22, y, 14, 7, INK, 0);
  kid(Object.assign({ x, y: jy, col: '#f6b92b', skin: '#c98c63', hat: 'tuft', hair: '#2a1b12', legs: false, eyes: 'open', mouth: 'smile', ar: .3 }, o));
};
ART.feather = (x, y, r = 0) => { g.save(); g.translate(x, y); g.rotate(r); ell(0, 0, 8, 22, '#fff', 3); ln(0, -22, 0, 26, 2); g.restore(); };
const toonAt = (x, y, s, t, hurt = 0) => { g.save(); g.translate(x, y); g.scale(s, s); g.translate(-ART.TOON_AT[0], -ART.TOON_AT[1]); ART.toon({ b: t * 2 }, hurt, 0); g.restore(); };

// ---------- backdrops ----------
function bgStoep(c1 = '#a9def5', c2 = '#f9e7c6') {
  sky(c1, c2);
  [['#b5482f', 0], ['#e8a33d', 150], ['#3f7d73', 290], ['#c95b3c', 420], ['#6a4a8a', 560], ['#d9873a', 700], ['#7f3b2c', 830]].forEach(([c, x], i) => {
    const top = 120 + (i % 3) * 30; rr(x, top, 140, 300 - top + 100, 0, c, 4); poly([[x + 30, top], [x + 70, top - 40], [x + 110, top]], c, 4);
    rr(x + 25, top + 40, 36, 44, 4, '#fdf6e6', 3); rr(x + 80, top + 40, 36, 44, 4, '#fdf6e6', 3);
  });
  rr(-10, 400, W + 20, 160, 0, '#d8c6a6', 4); rr(-10, 392, W + 20, 14, 4, '#b8a586', 4);
}
function bgGrass() { sky('#9bd9f2', '#e9f7d9'); circ(130, 100, 52, '#ffe066', 4); g.beginPath(); g.moveTo(-10, 380); g.quadraticCurveTo(W / 2, 300, W + 10, 380); g.lineTo(W + 10, H); g.lineTo(-10, H); g.closePath(); paint('#7bc96f', 4); }
function bgRoom(c = '#f3dfc0') { sky(c, '#fbf3e4'); dots(); rr(-10, 420, W + 20, 130, 0, '#c99a6b', 4); }
function drain(x, y, glow) { ell(x, y, 70, 18, glow ? '#e8362f' : '#5b5560', 4); for (let i = -2; i <= 2; i++) ln(x + i * 22, y - 12, x + i * 22, y + 12, 4); }

// ---------- scenes: each panel is a caption plus a drawing ----------
const SCENES = {
  opening: [
    { cap: 'On a quiet street in a very Dutch town, three brothers rule the stoep: Joep, Cas and Luur.', draw(t) {
      bgStoep(); const bp = Math.abs(Math.sin(t * 3));
      bro('cas', { x: 300, y: 330, eyes: 'sleepy' }); bro('joep', { x: 480, y: 320, bob: bp * 10, arms: bp }); bro('luur', { x: 650, y: 340, s: .9, look: Math.sin(t) }); } },
    { cap: 'But one afternoon the drain starts to bubble. Something red and slimy is living down there.', draw(t) {
      bgStoep('#ffc9bd', '#f9e7c6'); drain(480, 460, 1);
      for (let i = 0; i < 6; i++) circ(440 + i * 16, 440 - ((t * 60 + i * 40) % 120), 6 + i % 3 * 3, '#ff7a6a', 3);
      bro('luur', { x: 650, y: 340, s: .9, eyes: 'big', mouth: 'wow', look: -1 }); bubble('Wat is dát?!', 650, 180, 26); } },
    { cap: 'Joep: “Whatever it is, we’ll beat it. On the beat!”  (Nobody notices the white feather drifting down.)', draw(t) {
      bgStoep(); bro('cas', { x: 300, y: 330 }); bro('joep', { x: 480, y: 320, ar: 1, mouth: 'wow' }); bro('luur', { x: 650, y: 340, s: .9, arms: .6 });
      ART.feather(820 + Math.sin(t * 2) * 20, 60 + (t * 30) % 300, Math.sin(t * 2) * .5); } },
  ],
  gras: [{ cap: 'Joep wants to train. Cas wants a nap. Cas wins, sort of: he agrees to practise lying down.', draw(t) {
    bgGrass(); bro('cas', { x: 520, y: 390, s: 1.2, rot: -Math.PI / 2, eyes: 'sleepy' }); bro('joep', { x: 300, y: 330, ar: .8, mouth: 'wow' });
    bubble('Cas! Opstaan!', 300, 170, 24); txt('z z z', 470, 280 - (t * 10) % 20, 26, INK, 'center', HAND, 400); } }],
  muur: [{ cap: 'Luur hears things landing on the other side of the wall. Someone over there keeps throwing stuff. But who?', draw(t) {
    sky('#8fd3f0', '#fdeccb'); rr(-10, 300, W + 20, 250, 0, '#c4553b', 4); rr(-10, 288, W + 20, 20, 4, '#e0d2b8', 4);
    bro('luur', { x: 480, y: 244, eyes: 'big', mouth: 'o', look: Math.sin(t * 2) }); txt('?', 560, 140 + Math.sin(t * 4) * 6, 60, '#4d7cf0'); txt('?', 400, 120, 40, '#4d7cf0'); } }],
  pluk: [{ cap: 'Meet Pluk: the tiniest kid on the street and somehow the strongest. Pluk is helping with dinner.', draw(t) {
    sky('#ffe3a3', '#fff6df'); rr(-10, 400, W + 20, 160, 0, '#8a5a3b', 4);
    ART.pluk(420, 358, { arms: 1, squash: Math.abs(Math.sin(t * 4)) * .3 });
    g.save(); g.translate(560, 330); g.rotate(.4); poly([[-30, -20], [30, -20], [0, 140]], '#ff8a2b', 4); g.restore(); bubble('HUP!', 420, 220, 30); } }],
  remix1: [{ cap: 'The bubbling under the stoep is getting louder. Time to put everything they have learned together.', draw(t) {
    bgStoep('#ffd9c8', '#f9e7c6'); drain(800, 470, 1);
    bro('cas', { x: 220, y: 330 }); bro('joep', { x: 380, y: 320, arms: 1 }); bro('luur', { x: 530, y: 340, s: .9 }); ART.pluk(640, 378, { arms: .8 }); } }],
  zurm: [{ cap: 'Zurm de Boekenwurm has read every book about demons in the library. She has a plan. She just needs to finish chapter twelve first.', draw(t) {
    bgRoom(); for (let i = 0; i < 7; i++) rr(600, 400 - i * 34, 150 - (i % 3) * 14, 32, 4, ['#ef4a36', '#4d7cf0', '#f6b92b', '#1f9e8f'][i % 4], 3);
    ART.zurm(360, 330, { b: t * 2, ar: .6 }); bubble('Hoofdstuk 12: Demonen…', 380, 160, 22); } }],
  raket: [{ cap: 'Janet and her dad Fred build rockets in their garage. Fred: “If the demon takes the stoep, we simply leave. For the moon.”', draw(t) {
    sky('#bfe6f8', '#fff3db'); rr(-10, 470, W + 20, 90, 0, '#9fcf7f', 4);
    ART.janet(560, 470, { ar: .7 }); ART.fred(320, 405, { arms: .9, mouth: 'wow' });
    rr(700, 260, 80, 210, 10, '#fff', 4); poly([[700, 264], [740, 200], [780, 264]], '#ef4a36', 4); bubble('Naar de maan!', 320, 260, 24); } }],
  skelet: [{ cap: 'Then Skelet met Pret shows up. He works for Toon de Demoon… but mostly he just wants an audience.', draw(t) {
    sky('#fbe3ef', '#f8c9a8'); rr(-10, 430, W + 20, 120, 0, '#9b6b43', 4);
    g.globalAlpha = .35; toonAt(720, 230, .9, t); g.globalAlpha = 1;
    ART.skeleton(400, 300, { pose: Math.abs(Math.sin(t * 3)), step: Math.sin(t * 3), grin: 1 }); bubble('Kijk mij nou!', 540, 130, 26); } }],
  verhaal: [{ cap: 'Zurm found it in chapter twelve: demons can’t stand stories with happy endings. Luur volunteers to play the brave knight.', draw(t) {
    bgRoom('#e9defb'); ART.zurm(260, 300, { b: t * 2, ar: .6 }); bro('luur', { x: 620, y: 320, ar: 1, eyes: 'happy', mouth: 'grin' });
    poly([[588, 284], [620, 250], [652, 284]], '#b9c2cf', 3); bubble('Ik ben de ridder!', 620, 150, 24); } }],
  robot: [{ cap: 'After the dance-off, the brothers clapped for Skelet. Nobody had ever clapped for Skelet before. He quit working for Toon on the spot.', draw(t) {
    sky('#dfe7ef', '#f3ece0'); rr(-10, 420, W + 20, 130, 0, '#8d96a8', 4);
    ART.skeleton(300, 280, { pose: .6, grin: 1 }); ART.fred(640, 385, { arms: .6 });
    txt('♥', 300, 120 + Math.sin(t * 3) * 8, 44, '#ef4a36'); bubble('Mijn robot danst beter!', 640, 230, 22); } }],
  toon: [{ cap: 'The drain explodes. Toon de Demoon rises, all eight arms of him: “DE STOEP IS VAN MIJ!”', draw(t) {
    bgStoep('#ffc9bd', '#f59ab5'); toonAt(640, 230, 1, t);
    bro('joep', { x: 220, y: 330, ar: .8, mouth: 'wow' }); bro('cas', { x: 120, y: 335, s: .9, eyes: 'open', mouth: 'flat' }); bro('luur', { x: 50, y: 345, s: .8, mouth: 'wow' });
    ART.feather(360 + Math.sin(t * 2) * 15, 80 + Math.sin(t) * 20, .3); } }],
  ending: [
    { cap: 'Maat met Zinkfosfaat, the boys’ guardian angel and the most powerful being in the whole verse, had been watching all along. One blast, and Toon was back in the sea.', draw(t) {
      sky('#fff1c4', '#ffe4a8'); ART.maat(480, 210 + Math.sin(t * 2) * 8, 1); } },
    { cap: 'That night the whole street partied on the stoep. Skelet danced. Pluk ate eleven carrots. Janet and Fred launched fireworks instead of rockets.', draw(t) {
      bgStoep('#3f4a8a', '#f59ab5');
      for (let i = 0; i < 5; i++) { const k = (t * .6 + i * .2) % 1; for (let a = 0; a < 8; a++) circ(150 + i * 170 + Math.cos(a) * k * 50, 100 + (i % 2) * 40 + Math.sin(a) * k * 50, 4, ['#f6b92b', '#ef4a36', '#8fd3f0'][i % 3], 0); }
      const bp = Math.abs(Math.sin(t * 4));
      bro('cas', { x: 120, y: 330, bob: bp * 6, arms: bp }); bro('joep', { x: 250, y: 320, bob: bp * 14, arms: 1 }); bro('luur', { x: 370, y: 340, s: .9, bob: bp * 10, arms: bp });
      ART.pluk(470, 380, { bob: bp * 8, arms: 1 }); ART.zurm(600, 330, { b: t * 3, ar: 1 });
      ART.skeleton(780, 270, { pose: bp, step: Math.sin(t * 4), grin: 1 }); } },
    { cap: 'Well… almost everybody. Somewhere down the street, one small red tentacle pokes out of a drain. Tot de volgende keer! (Remix 2 is now unlocked.)', draw(t) {
      bgStoep('#a9def5', '#f9e7c6'); drain(480, 460, 0);
      const up = Math.abs(Math.sin(t * 1.5)) * 50;
      g.beginPath(); g.moveTo(470, 460); g.quadraticCurveTo(450, 420 - up, 490, 390 - up); g.lineCap = 'round'; g.lineWidth = 22; g.strokeStyle = INK; g.stroke(); g.lineWidth = 14; g.strokeStyle = '#e8362f'; g.stroke(); } },
  ],
};
SCENES.stoep = SCENES.opening;     // the opening plays before the first song

function drawStory(scene, i, t) {
  const p = SCENES[scene][i];
  p.draw(t);
  g.lineWidth = 10; g.strokeStyle = INK; g.strokeRect(5, 5, W - 10, H - 10);
  rr(40, 392, W - 80, 118, 14, '#fffdf6', 4);
  const hgt = wrapTxt(p.cap, 66, 420, W - 220, 21);
  txt(`${i + 1}/${SCENES[scene].length}  ▸`, W - 64, 486, 18, INK, 'right');
  if (t < .3) { g.globalAlpha = 1 - t / .3; g.fillStyle = '#fbf3e4'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  return hgt;
}
