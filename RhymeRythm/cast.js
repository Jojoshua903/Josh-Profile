'use strict';
// ---------- stand-ins: every character can fill any kid-shaped slot ----------
const pose = o => ({ arms: o.arms, al: o.al, ar: o.ar, eyes: o.eyes, mouth: o.mouth, look: o.look });
function at(o, fn) {
  const s = o.s || 1, sq = o.squash || 0;
  g.save(); g.translate(o.x, o.y - (o.bob || 0)); g.rotate(o.rot || 0); g.scale(s * (1 + sq * .18), s * (1 - sq * .18)); fn(); g.restore();
}
ACTORS.pluk = o => kid(Object.assign({}, o, { s: (o.s || 1) * .72, col: '#fff', skin: '#f9d3b4', hat: 'tuft', hair: '#f2c94c' }));
ACTORS.zurm = o => at(o, () => ART.zurm(0, 0, { b: performance.now() / 500, eyes: o.eyes, mouth: o.mouth, ar: o.ar ?? o.arms ?? .35, al: o.al ?? o.arms ?? .1 }));
ACTORS.fred = o => at(o, () => ART.fred(0, 0, Object.assign(pose(o), { s: .8 })));
ACTORS.janet = o => at(o, () => { g.scale(.6, .6); ART.janet(0, 108, pose(o)); });
ACTORS.skelet = o => at(o, () => { g.scale(.55, .55); g.translate(0, -16); ART.skeleton(0, 0, { pose: clamp(o.ar ?? o.arms ?? 0, 0, 1), grin: o.eyes === 'happy' || o.mouth === 'grin' ? 1 : 0 }); });
ACTORS.toon = o => at(o, () => { g.scale(.32, .32); g.translate(-ART.TOON_AT[0], -ART.TOON_AT[1]); ART.toon({ b: performance.now() / 300 }, o.eyes === 'x', 0); });

// ---------- personalities ----------
const PERSONA = {
  joep: { name: 'Joep', voice: [12, 'a'], catch: '“Één, twee… STOEP!”', likes: 'Counting, shouting, being first', dislikes: 'Waiting. For anything.',
    secret: 'Practises his count-ins in the bathroom mirror.',
    taps: ['Één, twee, drie, VIER!', 'Brothers! Formatie!', 'I was first. I’m always first.', 'Who wants to race to the lamppost?'],
    streak: ['Ja! Ja! JA!', 'We’re unstoppable!', 'Nobody counts like us!'],
    after: ['Told you we’d nail it. I TOLD you!', 'Not bad! Again, but louder!', 'Okay, okay. From the top. Één…'] },
  cas: { name: 'Cas', voice: [-5, 'o'], catch: '“Rustig aan, man.”', likes: 'Naps, clouds, the exact middle of the lawn', dislikes: 'Alarm clocks, Joep at 7 a.m.',
    secret: 'Is secretly the best dancer of the three. Just can’t be bothered.',
    taps: ['Mmm… five more minutes.', 'Rustig aan, man.', 'That cloud looks like Joep.', '*yawns for nine seconds*'],
    streak: ['…oh, we’re doing great. Nice.', 'Chill rhythm. I like it.', 'Even I’m awake now.'],
    after: ['Lovely. Can I lie down now?', 'Fine by me. Everything is fine by me.', 'No stress. We’ll get it after a nap.'] },
  luur: { name: 'Luur', voice: [16, 'i'], catch: '“Wat is dát?”', likes: 'Bugs, buttons, anything behind a wall', dislikes: 'Being told “don’t touch that”',
    secret: 'Keeps a jar of mysteries under his bed. One of them is humming.',
    taps: ['Wat is dát?', 'Why is the sky up and not down?', 'I found a beetle! His name is Kees.', 'Can I press that button?'],
    streak: ['How are we doing this?!', 'Wow wow wow!', 'I want to know how rhythm works!'],
    after: ['Can we do it again so I can see how it works?', 'Ooh, what happens if we do it faster?', 'Why did we miss? I have questions.'] },
  pluk: { name: 'Pluk', voice: [24, 'i'], catch: '“HUP!”', likes: 'Yanking things out of the ground, carrots, being lifted up', dislikes: 'Naps, things that won’t budge',
    secret: 'Once yanked a lamppost loose. It’s still a bit crooked.',
    taps: ['HUP!', 'Pluk STRONG!', 'Wortel?', 'Again! Again!'],
    streak: ['HUP HUP HUP!', 'Pluk stronk!', 'Wheee!'],
    after: ['HUP! HUP! HUP!', 'More carrots!', 'Again! AGAIN!'] },
  zurm: { name: 'Zurm', voice: [9, 'e'], catch: '“Nog één hoofdstuk…”', likes: 'Books, footnotes, rainy days, the smell of old paper', dislikes: 'Spoilers, dog-eared pages',
    secret: 'Has read the dictionary twice. The second time for the plot.',
    taps: ['Nog één hoofdstuk…', 'Did you know octopuses have three hearts?', 'Shh! I’m at the good part.', 'This reminds me of a book.'],
    streak: ['This is better than chapter twelve!', 'Like a perfectly written sentence.', 'Page-turner!'],
    after: ['A perfect ending. I’m taking notes.', 'A satisfying chapter, with a few typos.', 'Every hero has a tough middle bit.'] },
  janet: { name: 'Janet', voice: [5, 'a'], catch: '“Mind your head! …Oh, that was me.”', likes: 'Rockets, high shelves, the view from up here', dislikes: 'Door frames, low ceilings, limbo',
    secret: 'Has bumped her head on every lamppost in town. Keeps a list.',
    taps: ['Au! Lamppost. Again.', 'I can see your house from here.', 'Dad, where’s the big wrench?', 'Next rocket: twice as tall. Like me.'],
    streak: ['Smooth as rocket fuel!', 'Torque perfect!', 'We have lift-off!'],
    after: ['Ready for orbit!', 'Slight wobble. Nothing a wrench can’t fix.', 'Back to the drawing board. A tall one.'] },
  fred: { name: 'Fred', voice: [2, 'o'], catch: '“Ik heb een idee!”', likes: 'Inventing, goggles, things that go boom (safely)', dislikes: 'Instructions, ladders',
    secret: 'Most of his inventions are just very fancy toasters.',
    taps: ['Ik heb een idee!', 'Stand back, this might sparkle.', 'It’s not broken, it’s experimental!', '*puts on second pair of goggles*'],
    streak: ['Eureka!', 'Science!', 'The calculations were correct!'],
    after: ['A scientific triumph!', 'Promising results. More tests!', 'That was a learning experience.'] },
  skelet: { name: 'Skelet', voice: [7, 'a'], catch: '“Kijk mij nou!”', likes: 'Applause, top hats, being the centre of attention', dislikes: 'Dogs (they keep stealing his leg)',
    secret: 'Only worked for Toon because the demon promised him a stage. There was no stage.',
    taps: ['Kijk mij nou!', 'Ta-daa! …Hold on, my arm fell off.', 'I’m not a bad guy. I’m a showman.', 'Bone-jour!'],
    streak: ['The crowd goes wild!', 'Encore! ENCORE!', 'I’m a star!'],
    after: ['Naturally. I was the inspiration.', 'Bravo, bravo. Mostly for me.', 'Even I get stage fright. Rarely.'] },
  toon: { name: 'Toon', voice: [-12, 'u'], catch: '“DE STOEP IS VAN MIJ!”', likes: 'Damp places, sidewalks he doesn’t own', dislikes: 'Happy endings, Maat, soap',
    secret: 'Just wants somewhere warm to sit. The stoep gets very sunny.',
    taps: ['Blub.', 'MIJN stoep!', 'I’ll be back… eventually.', '*sulks in eight directions*'] },
  maat: { name: 'Maat met Zinkfosfaat', voice: [0, 'a'], catch: '“Niet mijn jongens.”', likes: 'Watching over the boys, quiet, a well-timed entrance', dislikes: 'Demons on the stoep',
    secret: 'Has been there for every single song. You just never looked up.',
    taps: ['I am always nearby.', 'You’re doing better than you think.', 'Keep the rhythm. I’ll keep the rest.'] },
};
const STAR = { stoep: 'joep', gras: 'cas', muur: 'luur', pluk: 'pluk', remix1: 'joep', zurm: 'zurm', raket: 'janet', skelet: 'skelet',
  verhaal: 'luur', robot: 'fred', toon: 'joep', remix2: 'joep', remix3: 'skelet', endless: 'joep', kegel: 'skelet', toren: 'luur', hoog: 'joep', pannenkoek: 'pluk' };
function talk(name, n = 3) {
  const p = PERSONA[name]; if (!p || !ac) return;
  const [base, vow] = p.voice, t = ac.currentTime;
  for (let i = 0; i < n; i++) A.voice(t + i * .11, fq(base + [0, 3, -2, 5][i % 4]), .09, .7, i % 2 ? 'o' : vow);
}

// ---------- Remix 3: everyone plays someone else's part ----------
LEVELS.push(makeRemix({
  id: 'remix3', title: 'Omgekeerde Wereld', who: 'Remix · cast swap', song: 'Rollen Omgedraaid', color: '#7bc96f', accent: '#f59ab5',
  bpm: 124, key: 7,
  prog: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]],
  drums: { k: 'x..x.x..', s: '..x...x.', h: 'xxxxxxxx' }, bass: '1.85.8.5', comp: 'stab', swing: .15,
  mel: [[[0, 12, 1], [1, 14, 1], [2, 16, 2], [4, 12, 4]], [[0, 17, 2], [2, 16, 2], [4, 12, 4]], [[0, 9, 2], [2, 12, 2], [4, 16, 4]], [[0, 14, 3], [3, 11, 1], [4, 7, 4]]],
  how: 'Same games, wrong people. Skelet does Joep’s count, Pluk sits on the wall, Toon takes Cas’s nap, and Zurm holds the bin lid.<br>The <b>cues and timing don’t change</b>. Only the faces do. Try not to laugh.',
  verdict: ['Everyone played everyone, and it still sounded great. Even Toon had fun (don’t tell him).',
    'Some role confusion, but the rhythm survived.',
    'Ignore who’s on screen and listen: every scene still uses its original cue.'],
  segs: [
    { src: 'stoep', len: 16, cast: { joep: 'skelet', cas: 'pluk', luur: 'zurm' }, swapLine: 'Skelet telt af?!', ev: [[3, 'slow'], [7, 'slow'], [11, 'fast'], [15, 'fast']] },
    { src: 'gras', len: 16, cast: { cas: 'toon' }, swapLine: 'Zelfs demonen doen een dutje', ev: [[3, 'vlinder'], [6, 'bij'], [7, 'bij'], [10, 'vlinder'], [13, 'bij'], [13.5, 'bij'], [15, 'bij']] },
    { src: 'muur', len: 16, cast: { luur: 'pluk' }, swapLine: 'Pluk op de Muur', ev: [[3, 'bal'], [5, 'bal'], [7, 'appel'], [9, 'bal'], [10, 'bal'], [11, 'bal'], [14, 'appel']] },
    { src: 'pluk', len: 16, k: 'wortel', cast: { pluk: 'cas' }, swapLine: 'Cas plukt (heel langzaam)', ev: [[3], [4], [5], [7], [8, 'reus'], [11], [11.5], [12], [13], [15, 'reus']] },
    { src: 'toon', len: 12, cast: { joep: 'zurm', cas: 'skelet', luur: 'fred' }, swapLine: 'Zurm met de deksel!', ev: [[3, 'klap'], [4, 'klap'], [6, 'traag'], [8, 'klap'], [8.5, 'klap'], [11, 'traag']] },
    { src: 'stoep', len: 8, cast: { joep: 'luur', cas: 'joep', luur: 'cas' }, swapLine: 'Luur is de baas!', ev: [[3, 'fast'], [7, 'big']] },
  ],
}));
