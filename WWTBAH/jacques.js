// Jacques: lines, AI skill, and the achievement → customisation unlock system
LINES.jacquesRight = [
  "Correct. From up 'ere I could see ze answer coming. Being two metres tall 'as its advantages.",
  "Oui. Easy. Sorry, did my glasses blind you again? Zey do zat.",
  "Bien sûr. Even ze studio lights are jealous of my lenses.",
  "Correct! I would wink, but you would not survive ze glare."
];
LINES.jacquesWrong = [
  "Non! My glasses blinded… me. Zis is a first.",
  "Ah, zut. Ze air is thin up 'ere, it affects ze brain.",
  "Wrong? Impossible. I demand to see ze question at my eye level.",
  "Pfff. I was distracted by my own reflection."
];
AI_ACC.jacques = {mcO:.62, mcT:.42, tf:.62, num:.6, emoji:.35, typed:.55, order:.5, odd:.55};
CHEMMY_STORIES.push(
  "Jacques once played table tennis against me. Two metres tall. Never had to bend down. I've never been so offended.",
  "Quick safety reminder from the studio: please do not look directly at Jacques' glasses."
);
ADS.push({t:"JACQUES' LUMIÈRE LENSES", b:"Why buy a lighthouse when you can BE ze lighthouse? Lenses so bright, ships will steer around you.", s:"Not suitable for driving, flying, or eye contact."});

ACHIEVEMENTS.push(
  {id:'blinded', ic:'😎', n:"Outshine Jacques", d:"Get a question right that Jacques got wrong"},
  {id:'beatjacques', ic:'📏', n:"Stood Tall", d:"Finish a game ahead of Jacques"}
);

// What each achievement unlocks in the character creator
const UNLOCKS = {
  'hat:crown': 'winner', 'skin:#FFC93C': 'perfect', 'head:egg': 'beatai', 'extras:crack': 'beatai',
  'eyewear:monocle': 'trick', 'extras:paddle': 'bullseye', 'eyes:wink': 'emoji', 'hair:tufts': 'order',
  'extras:shamrock': 'eggadvice', 'hat:headband': 'nolife', 'extras:mic': 'jokes', 'hat:party': 'party',
  'hair:mohawk': 'marathon', 'eyewear:blinding': 'blinded', 'head:tall': 'beatjacques'
};
const FIELD_NAMES = {hat:'Hat', skin:'Skin', head:'Head', extras:'Extra', eyewear:'Eyewear', eyes:'Eyes', hair:'Hair'};
function lockOf(field, value){ const id = UNLOCKS[field + ':' + value]; return id && !(typeof meta !== 'undefined' && meta.ach && meta.ach[id]) ? ACHIEVEMENTS.find(a => a.id === id) : null; }
function unlocksFor(id){
  return Object.entries(UNLOCKS).filter(([, a]) => a === id).map(([k]) => {
    const [f, v] = k.split(':'), opt = (LOOK_OPTS[f] || []).find(o => Array.isArray(o) && o[0] === v);
    return f === 'skin' ? 'Golden skin' : `${opt ? opt[1] : v} (${FIELD_NAMES[f].toLowerCase()})`;
  });
}
// Replace any locked choices with safe defaults
function sanitizeLook(L){
  const d = defaultLook(0);
  ['skin', 'head', 'hair', 'eyes', 'hat', 'eyewear'].forEach(f => { if(lockOf(f, L[f])) L[f] = d[f]; });
  L.extras = (L.extras || []).filter(x => !lockOf('extras', x));
  return L;
}
const _randomLook = randomLook;
randomLook = () => sanitizeLook(_randomLook());
