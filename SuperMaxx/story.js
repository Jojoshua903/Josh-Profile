import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { createHero, spawnHero, createStructure, setBar, burst, ring } from './units.js?v=20261128e';
import { initBot } from './botbrain.js?v=20261128e';
import { HEROES } from './heroes.js?v=20261128e';
import { addTokens } from './slots.js?v=20261128e';
import { initRaid, BOSSES } from './raid.js?v=20261128e';

// Story mode: one solo mission per hero, told in a few lines before, between and after. Every
// mission has two parts, played back to back on the same map; each part is one of a handful of
// objective types built on the normal match systems:
//   defend   keep a landmark standing until the timer runs out
//   race     run through the glowing checkpoints in order before time is up
//   destroy  knock down enemy turrets
//   collect  pick up items scattered around the map
//   deliver  carry parcels one at a time from where they appear to the drop-off
//   elims    get a number of eliminations
//   survive  last until the timer runs out while more and more enemies arrive
//   heal     heal your teammates a set amount before time is up
//   boss     beat one of the Boss Raid bosses (the match turns into a raid; always the last part)
// Each part has a short title, and the second one a line of story shown as it starts.
// Enemies are bot heroes that respawn around the objective; between parts they fall back for a
// few seconds. First clear of each mission pays a token. Progress is saved locally.

export const MISSIONS = [
  { hero: 'vanguard', title: 'Hold the Harbour', map: 'plaza',
    intro: ['Pirates have been spotted off Solmare.', 'The harbour lighthouse is the only thing guiding the fishing boats home tonight.', 'Bulwark plants her shield in front of it. Nobody gets past.'],
    stages: [
      { title: 'The Lighthouse', type: 'defend', time: 90, hp: 2600, name: 'the harbour lighthouse', cap: 3 },
      { title: 'The Landing Party', type: 'elims', n: 8, cap: 3, line: 'The light held and the boats got through. Now the pirates are coming ashore on foot.' },
    ],
    outro: 'The boats came home safe and the pirates swam home wet. The harbourmaster painted a little shield on the lighthouse door, and it has been there ever since.' },
  { hero: 'striker', title: 'Rooftop Rush', map: 'neon',
    intro: ['Neon Heights runs an underground rooftop race every year.', 'Zip has never lost. Somebody hired a crew to make sure that changes tonight.', 'Hit every checkpoint. Don’t stop to argue.'],
    stages: [
      { title: 'The Race', type: 'race', n: 7, time: 70, cap: 2 },
      { title: 'The Getaway', type: 'survive', time: 60, cap: 3, line: 'First across the line, but the hired crew was waiting at the finish. Keep moving until the sirens arrive.' },
    ],
    outro: 'First place, again. Zip kept the trophy and gave the prize money to the kid who held the finish-line tape.' },
  { hero: 'ember', title: 'The Fireworks Feud', map: 'canals',
    intro: ['A rival pyrotechnics company has set up turrets along the Lantern Canals.', 'They plan to ruin the festival finale by firing first.', 'Cinder intends to show them how a real finale is done.'],
    stages: [
      { title: 'Lights Out', type: 'destroy', n: 4, name: 'rival firework turret', cap: 2 },
      { title: 'The Finale Barge', type: 'defend', time: 75, hp: 2400, name: 'the fireworks barge', cap: 3, line: 'The turrets are smoking wrecks. Now the rival crew is going after Cinder’s own fireworks barge.' },
    ],
    outro: 'The rival show fizzled. Cinder’s Grand Finale lit up every canal, and the reviews called it “a little excessive, in the best way”.' },
  { hero: 'warden', title: 'Lights in the Mist', map: 'terraces',
    intro: ['The temple lanterns of Mossgarden have been stolen and scattered across the ruins.', 'Without them, travellers get lost in the mountain mist.', 'Lantern goes to bring every one of them home.'],
    stages: [
      { title: 'Gather the Lanterns', type: 'collect', n: 7, time: 150, item: 'temple lantern', cap: 3 },
      { title: 'Keep the Flame', type: 'defend', time: 75, hp: 2400, name: 'the temple shrine', cap: 3, line: 'Every lantern is back on the shrine. The thieves want them again, and Lantern stands guard until the flames catch.' },
    ],
    outro: 'Every lantern was relit by dawn. Sister Vey kept one burning beside her own, for the travellers who still haven’t found their way.' },
  { hero: 'thicket', title: 'The Old Tree', map: 'terraces',
    intro: ['A logging crew has come for the oldest tree in the Mossgarden ruins.', 'Hazel planted her first seed under its branches.', 'First, their machines. Then, their minds.'],
    stages: [
      { title: 'Jam the Machines', type: 'destroy', n: 3, name: 'logging rig', cap: 2 },
      { title: 'The Old Tree', type: 'defend', time: 90, hp: 2400, name: 'the ancient tree', cap: 3, line: 'The rigs are wrecked, so the crew comes for the tree with axes instead. Hazel has ninety seconds to change their minds.' },
    ],
    outro: 'The loggers left without their saws. The old tree dropped one seed at Hazel’s feet. She planted it the same day.' },
  { hero: 'ratchet', title: 'Scrap Run', map: 'mesa',
    intro: ['A cargo train derailed outside Sunscorch Mesa, scattering machine parts across the canyon.', 'Scavengers are already picking it clean.', 'Ratchet needs eight parts to finish his best turret yet.'],
    stages: [
      { title: 'Pick It Clean', type: 'collect', n: 8, time: 140, item: 'scrap part', cap: 3 },
      { title: 'Tighten the Bolts', type: 'defend', time: 75, hp: 2600, name: 'the workbench', cap: 3, line: 'Eight parts, one half-built turret. The scavengers want their scrap back before the last bolt is in.' },
    ],
    outro: 'The new turret works perfectly, and Ratchet named it after the train driver, who still doesn’t know why.' },
  { hero: 'mirage', title: 'The Vanishing Act', map: 'neon',
    intro: ['A gang of copycat illusionists has been robbing Neon Heights while wearing Mirage’s face.', 'Noor finds that rude.', 'Time to show them which one is real.'],
    stages: [
      { title: 'Spot the Fakes', type: 'elims', n: 10, cap: 3 },
      { title: 'The Ringleader', type: 'race', n: 6, time: 60, cap: 2, line: 'The ringleader dropped the disguise and ran. Follow the trail of glitter across the rooftops.' },
    ],
    outro: 'The copycats are behind bars. The police still aren’t sure which of the three Noors signed the report.' },
  { hero: 'avalanche', title: 'The Yeti of Frostpeak', map: 'frostpeak', allies: 2,
    intro: ['Something huge has been stomping through the ski village at night.', 'Ingrid grew up hearing stories about Frostfang.', 'She always said she’d be the one to find out if they were true.'],
    stages: [
      { title: 'Follow the Tracks', type: 'collect', n: 6, time: 130, item: 'giant footprint', cap: 2 },
      { title: 'Frostfang', type: 'boss', boss: 'frostfang', line: 'The tracks end at a cave. Whatever is inside is breathing very cold air.' },
    ],
    outro: 'The stories were true. Ingrid keeps one of Frostfang’s icicle claws above her fireplace, and it has never melted.' },
  { hero: 'croc', title: 'King of the Swamp', map: 'docks',
    intro: ['Gustave owes money to the wrong people at Tidewater Docks.', 'They have come to collect, and they brought friends.', 'He just has to last until the tide comes in. Then the water is his.'],
    stages: [
      { title: 'Low Tide', type: 'survive', time: 90, cap: 4 },
      { title: 'Turn the Tide', type: 'elims', n: 8, cap: 3, line: 'The water is up, and the debt collectors are wading. Gustave is not wading. Gustave is swimming.' },
    ],
    outro: 'By high tide, the debt collectors had decided the debt could wait. Forever, ideally.' },
  { hero: 'tempo', title: 'Encore', map: 'neon',
    intro: ['Tempo’s rooftop concert got crashed by a rival crew who think her music is “too loud”.', 'She agrees, actually.', 'She is about to turn it up.'],
    stages: [
      { title: 'Turn It Up', type: 'elims', n: 10, cap: 3 },
      { title: 'Save the Speakers', type: 'defend', time: 75, hp: 2400, name: 'the speaker stack', cap: 3, line: 'The rival crew is back for an encore of their own, and this time they brought wire cutters.' },
    ],
    outro: 'The crowd loved it, the rival crew left humming, and the noise complaint is now framed in her studio.' },
  { hero: 'kestrel', title: 'The Air Show', map: 'skyreach',
    intro: ['Skyreach Isles hosts the oldest air race in the world.', 'Wren entered without a plane. Hers is in the shop.', 'She plans to win anyway, on foot, jump pad to jump pad.'],
    stages: [
      { title: 'The Race', type: 'race', n: 8, time: 80, cap: 2 },
      { title: 'Sore Losers', type: 'destroy', n: 3, name: 'drone launcher', cap: 2, line: 'She won. The runner-up did not take it well, and has set up drone launchers to knock her off the podium.' },
    ],
    outro: 'The judges argued for an hour about whether it counted. Then they gave Wren the trophy and asked her to please bring the plane next year.' },
  { hero: 'cavalier', title: 'The Tourney', map: 'terraces',
    intro: ['Dame Rosalind has been challenged by every knight who ever lost to her, all at once.', 'She considers this a compliment.', 'She has accepted every challenge.'],
    stages: [
      { title: 'The Joust', type: 'elims', n: 8, cap: 2 },
      { title: 'The Banner', type: 'defend', time: 75, hp: 2400, name: 'the royal banner', cap: 3, line: 'The losers have regrouped and are going for her banner. A knight does not lose her banner.' },
    ],
    outro: 'Eight challengers, eight bruised egos, one banner still flying and one very proud horse.' },
  { hero: 'slime', title: 'Lab Accident', map: 'canals',
    intro: ['Professor Blobert left his lab window open, and eight experimental slime samples got out.', 'They are bouncing around the Lantern Canals.', 'Other people are very interested in catching them first.'],
    stages: [
      { title: 'Catch Them All', type: 'collect', n: 8, time: 130, item: 'escaped sample', cap: 3 },
      { title: 'Back to the Lab', type: 'deliver', n: 4, time: 140, item: 'sample jar', drop: 'the lab', cap: 3, line: 'All eight are jarred, but the jars are wobbling. Get them back to the lab before anything wriggles out.' },
    ],
    outro: 'All eight samples are back on the shelf. One of them may now be sentient. It has asked for a name.' },
  { hero: 'brawler', title: 'The Final Round', map: 'plaza',
    intro: ['Torque was told to throw the fight. He didn’t.', 'Now the whole gang that bet against him is waiting in the square.', 'No ropes, no ref, no bell. Just keep moving.'],
    stages: [
      { title: 'Round One', type: 'survive', time: 80, cap: 4 },
      { title: 'Round Two', type: 'elims', n: 10, cap: 3, line: 'He’s still standing and the gang is getting tired. Now it’s Torque’s turn to throw punches.' },
    ],
    outro: 'The gang lost their bets twice in one night. Torque bought the whole square ice cream with his winnings.' },
  { hero: 'chipmunk', title: 'The Great Acorn Heist', map: 'terraces',
    intro: ['The Mossgarden squirrels hid the winter acorn supply all over the ruins and promptly forgot where.', 'Pip’s mech runs on acorns.', 'No acorns, no mech. No mech, no Pip.'],
    stages: [
      { title: 'Dig Them Up', type: 'collect', n: 8, time: 140, item: 'buried acorn', cap: 3 },
      { title: 'Haul It Home', type: 'deliver', n: 4, time: 140, item: 'acorn crate', drop: 'the workshop', cap: 3, line: 'The acorns are found and crated. Now they have to get to the workshop, one heavy crate at a time.' },
    ],
    outro: 'The workshop is stocked for the winter. Pip has started burying spare acorns too, just in case. She has already forgotten where.' },
  { hero: 'elf', title: 'The Thornqueen', map: 'terraces', allies: 2,
    intro: ['The forest around Mossgarden is being swallowed by a single, giant flower.', 'Sylvaine has guarded these woods for three hundred years.', 'She has never seen anything grow this angry.'],
    stages: [
      { title: 'Cut the Roots', type: 'destroy', n: 4, name: 'thorn bulb', cap: 2 },
      { title: 'The Thornqueen', type: 'boss', boss: 'thornqueen', line: 'Every bulb she cuts makes the forest shriek. Deep in the ruins, the Thornqueen wakes up.' },
    ],
    outro: 'The Thornqueen sleeps again. Sylvaine planted a ring of wildflowers around her, so she has something gentle to wake up to.' },
  { hero: 'dancer', title: 'Opening Night', map: 'canals',
    intro: ['The curtain goes up in seventy-five seconds, and Odette is on the wrong side of the canals.', 'Someone slashed the tyres on her bike.', 'She will simply have to dance there.'],
    stages: [
      { title: 'Curtain Call', type: 'race', n: 7, time: 75, cap: 2 },
      { title: 'The Show Must Go On', type: 'survive', time: 60, cap: 3, line: 'She made curtain-up, and the saboteurs followed her into the theatre. Keep dancing until the final bow.' },
    ],
    outro: 'She opened the show out of breath and closed it to a standing ovation. The critics called it “thrillingly urgent”.' },
  { hero: 'mole', title: 'Who’s Drilling?', map: 'mesa',
    intro: ['A mining company set up drilling rigs right on top of Digby’s tunnel network.', 'His living room ceiling has started to wobble.', 'He is coming up to have a word.'],
    stages: [
      { title: 'A Word with the Rigs', type: 'destroy', n: 4, name: 'drilling rig', cap: 2 },
      { title: 'My Good Rocks', type: 'collect', n: 6, time: 120, item: 'stolen gem', cap: 3, line: 'The rigs are down, but they already dug up Digby’s favourite gems. He would like them back, please.' },
    ],
    outro: 'The rigs are gone, the gems are home and the tunnels are safe. Digby left a polite note in the company’s mailbox. It was mostly dirt.' },
  { hero: 'medic', title: 'Field Hospital', map: 'frostpeak', allies: 2,
    intro: ['A blizzard has trapped a rescue team in Frostpeak, and they are under attack.', 'Dr. Quist is the only medic who made it up the mountain.', 'Keep them standing until the helicopter arrives.'],
    stages: [
      { title: 'Triage', type: 'heal', n: 1600, time: 120, cap: 3 },
      { title: 'Evacuation', type: 'defend', time: 75, hp: 2400, name: 'the rescue helicopter', cap: 3, line: 'The helicopter has landed, and the attackers are going for its rotors. Nobody leaves until everybody leaves.' },
    ],
    outro: 'Everyone made it down the mountain. The rescue team sends Dr. Quist a box of chocolates every winter.' },
  { hero: 'spark', title: 'Power Outage', map: 'neon',
    intro: ['Neon Heights has gone dark. The whole skyline, every sign, every lift.', 'The main generator needs four fresh batteries.', 'Juniper has a lot of batteries and very little patience.'],
    stages: [
      { title: 'Charge It', type: 'deliver', n: 4, time: 140, item: 'battery', drop: 'the generator', cap: 3 },
      { title: 'Keep the Lights On', type: 'defend', time: 75, hp: 2600, name: 'the generator', cap: 3, line: 'The generator is humming again, and the people who cut the power want it quiet.' },
    ],
    outro: 'The lights came back on, all at once, brighter than ever. Juniper may have slightly overcharged the city.' },
  { hero: 'builder', title: 'Under Construction', map: 'mesa',
    intro: ['Bruno has been building a bridge across the canyon for three years.', 'Tomorrow it opens. Tonight, the last bricks went missing.', 'He has his hard hat, his trowel and a very bad feeling.'],
    stages: [
      { title: 'The Last Bricks', type: 'collect', n: 7, time: 130, item: 'brick', cap: 3 },
      { title: 'Opening Day', type: 'defend', time: 90, hp: 2800, name: 'the half-built bridge', cap: 3, line: 'The last brick is in. Now the people who hid them arrive, right on schedule, to knock the bridge down.' },
    ],
    outro: 'The bridge opened on time. There is a plaque in the middle with Bruno’s name on it, and a small dent where he defended it.' },
  { hero: 'wellington', title: 'The Grand Banquet', map: 'plaza',
    intro: ['The Gourmet Guild’s annual banquet starts in two and a half minutes.', 'The kitchen is across the square. The food critics are already seated.', 'And somebody has hired thieves to steal the courses.'],
    stages: [
      { title: 'Service!', type: 'deliver', n: 5, time: 150, item: 'dish', drop: 'the banquet table', cap: 3 },
      { title: 'Guard the Table', type: 'defend', time: 75, hp: 2400, name: 'the banquet table', cap: 3, line: 'Every course is on the table. The thieves have given up on stealing dinner and decided to ruin it instead.' },
    ],
    outro: 'Five courses, served hot and eaten in peace. The critics gave the Guild its first five-star review in a decade. Sir Reginald wept, briefly.' },
  { hero: 'shepherd', title: 'The Lost Flock', map: 'frostpeak',
    intro: ['A storm scattered Hamish’s flock across Frostpeak.', 'The sheep don’t mind. The wolves on two legs who want to steal them are another matter.', 'Bring them all home before dark.'],
    stages: [
      { title: 'Round Them Up', type: 'collect', n: 8, time: 140, item: 'lost sheep', cap: 3 },
      { title: 'Wolves on Two Legs', type: 'elims', n: 8, cap: 3, line: 'The flock is safe in the pen. The rustlers are circling it. Hamish goes out to have a word with his crook.' },
    ],
    outro: 'All eight sheep are home and fluffier than ever. Hamish knitted the rustlers scarves. It was a peace offering. It did not work.' },
  { hero: 'microwave', title: 'Ding!', map: 'canals',
    intro: ['The MX-1000 woke up in a scrapyard by the canals, unplugged and confused.', 'Some very rude people are trying to take its parts.', 'It needs to last ninety seconds. That is how long it takes to heat anything properly.'],
    stages: [
      { title: 'Warming Up', type: 'survive', time: 90, cap: 4 },
      { title: 'Full Power', type: 'destroy', n: 4, name: 'scrap crusher', cap: 2, line: 'Ninety seconds. Fully heated. Now the MX-1000 is going after the crushers that nearly ate it.' },
    ],
    outro: 'Ding. Everything nearby was thoroughly reheated. The MX-1000 found a kitchen to live in, and nobody has tried to unplug it since.' },
  { hero: 'chef', title: 'Kitchen Nightmare', map: 'plaza',
    intro: ['The Solmare Grand Hotel kitchen is on fire. Again.', 'This time the ovens have come alive and rolled out into the square.', 'Gaston is the only chef brave (or bored) enough to stop them.'],
    stages: [
      { title: 'Runaway Ovens', type: 'destroy', n: 5, name: 'runaway oven', cap: 2 },
      { title: 'Dinner Service', type: 'deliver', n: 4, time: 140, item: 'hot plate', drop: 'the hotel doors', cap: 3, line: 'The ovens are scrap, and dinner service starts now. Gaston cooks in the square and runs the plates over himself.' },
    ],
    outro: 'The fire is out and every guest was fed. Gaston kept cooking in the square. The guests say it tastes better.' },
  { hero: 'manspider', title: 'Overtime', map: 'neon',
    intro: ['The office tower’s windows blew open and Gary’s tax files are all over the rooftops.', 'The deadline is midnight.', 'He has never missed a filing deadline. He is not going to start now.'],
    stages: [
      { title: 'Paper Chase', type: 'collect', n: 6, time: 120, item: 'lost tax file', cap: 3 },
      { title: 'Midnight Filing', type: 'race', n: 6, time: 65, cap: 2, line: 'Every file found, sorted and stapled. The tax office closes at midnight, on the far side of the skyline.' },
    ],
    outro: 'Filed with four minutes to spare. Gary celebrated with a second cup of black coffee. Wild.' },
  { hero: 'unicorn', title: 'Bad Day at the Bakery', map: 'plaza',
    intro: ['Celeste’s pastry stall in Solmare Piazza sells the best sprinkle cakes in town.', 'This morning, a gang knocked it over and ran off with every jar of sprinkles.', 'She is still smiling. For now.'],
    stages: [
      { title: 'Sweep Up the Sprinkles', type: 'collect', n: 7, time: 130, item: 'sprinkle jar', cap: 3 },
      { title: 'The Rainbow Goes Out', type: 'elims', n: 8, cap: 3, line: 'Seven jars back. Then one of them laughed at her tutu. Her mane goes black. Her eyes go red.' },
    ],
    outro: 'The stall reopened by lunchtime. The gang still sends an apology card every week, and always orders extra sprinkles.' },
  { hero: 'owl', title: 'The Last Delivery', map: 'skyreach',
    intro: ['Barnaby has carried every letter on time for forty years.', 'Tonight his mail bag split open over Skyreach, and sky pirates want the letters.', 'He has until sunrise. He intends to make it.'],
    stages: [
      { title: 'Spilled Mail', type: 'collect', n: 6, time: 130, item: 'lost letter', cap: 3 },
      { title: 'Special Delivery', type: 'deliver', n: 4, time: 140, item: 'letter', drop: 'the sky post box', cap: 3, line: 'Every letter is back in the bag. Now to post them, one by one, right past the pirates.' },
    ],
    outro: 'Every letter delivered, the last one just as the sun came up. It was addressed to Barnaby, from the first customer who knitted his scarf.' },
  { hero: 'pinball', title: 'High Score', map: 'neon',
    intro: ['Someone beat Penny’s high score at the Neon Heights arcade.', 'It was a machine. A machine cheated.', 'She is going to set a new record. In real life.'],
    stages: [
      { title: 'Multiball', type: 'elims', n: 12, cap: 3 },
      { title: 'Tilt', type: 'destroy', n: 4, name: 'cheating cabinet', cap: 2, line: 'Twelve. But the machine that cheated has friends, and they’re plugged in all over the rooftops.' },
    ],
    outro: 'New high score, and four fewer cheaters. The arcade put her initials up in lights outside. They spell T-I-L-T.' },
  { hero: 'clawbot', title: 'Game Over, Tick-Tock', map: 'neon', allies: 2,
    intro: ['The old arcade’s biggest machine, Tick-Tock, has gone haywire and walked out onto the rooftops.', 'Grabbit lived in the cabinet next to it for years.', 'He knows exactly where its off switch is. Getting to it is the hard part.'],
    stages: [
      { title: 'Insert Coin', type: 'collect', n: 6, time: 120, item: 'arcade token', cap: 2 },
      { title: 'Tick-Tock', type: 'boss', boss: 'ticktock', line: 'Six tokens, fed into the claw. It whirs to life just as Tick-Tock turns around.' },
    ],
    outro: 'Tick-Tock is switched off and back in the arcade. Grabbit leaves a coin in its slot every night, so it doesn’t feel lonely.' },
  { hero: 'pixel', title: 'The Final Level', map: 'mesa', allies: 2,
    intro: ['Every game Sir Pixelot ever played ended with a fiery boss.', 'Out here in the real world, he finally found one.', 'He has one more credit. It is enough.'],
    stages: [
      { title: 'Level 1-1', type: 'elims', n: 8, cap: 3 },
      { title: 'Final Boss', type: 'boss', boss: 'magmaw', line: 'LEVEL CLEAR. The ground shakes. The final boss always lives in a volcano.' },
    ],
    outro: 'THANK YOU, KNIGHT. BUT THE PRINCESS IS IN ANOTHER… actually, no. This time, the quest is complete.' },
];
export const storyMissions = () => MISSIONS.filter(m => HEROES.some(h => h.id === m.hero));   // a season's heroes join once it's live
export const missionOf = hero => MISSIONS.find(m => m.hero === hero) || null;
// the goal of one part of a mission
export const GOAL = {
  defend: m => `Protect ${m.name} for ${m.time}s`,
  race: m => `Reach all ${m.n} checkpoints in ${m.time}s`,
  destroy: m => `Destroy ${m.n} ${m.name}s`,
  collect: m => `Find ${m.n} ${m.item}s in ${Math.round(m.time / 60 * 10) / 10} min`,
  deliver: m => `Deliver ${m.n} ${m.item}s to ${m.drop}`,
  elims: m => `Get ${m.n} eliminations`,
  survive: m => `Survive for ${m.time}s`,
  heal: m => `Heal your team ${m.n.toLocaleString()} health in ${m.time}s`,
  boss: m => `Defeat ${BOSSES[m.boss]?.name || 'the boss'} with two allies`,
};
export const TYPE_ICON = { defend: '🛡️', race: '🏁', destroy: '💥', collect: '✨', deliver: '📦', elims: '⚔️', survive: '⏳', heal: '💚', boss: '👑' };

// ---------- progress ----------
const KEY = 'supermaxx-story';
let SAVE = (() => { try { return { done: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { done: {} }; } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch {} };
export const storyDone = hero => !!SAVE.done[hero];
export const storyCount = () => storyMissions().filter(m => storyDone(m.hero)).length;
// a cleared mission: returns true the first time (that's when the token pays out)
export function finishMission(hero) {
  if (SAVE.done[hero]) return false;
  SAVE.done[hero] = Date.now(); persist(); addTokens(1);
  return true;
}

// ---------- medals ----------
// Every clear earns a medal: bronze for finishing, silver for finishing with at most one
// knockout, gold for no knockouts and beating the par time. The best medal and best time are
// kept per mission, and the first gold pays another token.
export const MEDALS = ['', 'Bronze', 'Silver', 'Gold'], MEDAL_ICON = ['', '🥉', '🥈', '🥇'];
// par: the clock itself on parts you have to sit out, a share of the limit on races and fetch
// parts, and a set pace for the rest
const PAR = { defend: k => k.time, survive: k => k.time, race: k => k.time * 0.8, collect: k => k.time * 0.7, deliver: k => k.time * 0.7,
  heal: k => k.time * 0.75, elims: k => k.n * 11, destroy: k => k.n * 14, boss: () => 170 };
export const parOf = m => Math.round(m.stages.reduce((a, k) => a + PAR[k.type](k), 0) + 8);
export const medalOf = hero => SAVE.medal?.[hero] || (SAVE.done[hero] ? 1 : 0);
export const bestTime = hero => SAVE.best?.[hero] || 0;
export const medalCount = n => storyMissions().filter(m => medalOf(m.hero) >= n).length;
export const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const medalFor = (m, time, deaths) => deaths === 0 && time <= parOf(m) ? 3 : deaths <= 1 ? 2 : 1;
// Save a win's medal and time. Returns what changed for the results screen.
export function awardMedal(m, time, deaths) {
  SAVE.medal ||= {}; SAVE.best ||= {};
  const got = medalFor(m, time, deaths), was = medalOf(m.hero), prevBest = SAVE.best[m.hero] || 0;
  const better = got > (SAVE.medal[m.hero] || 0), newBest = !prevBest || time < prevBest;
  if (better) SAVE.medal[m.hero] = got;
  if (newBest) SAVE.best[m.hero] = Math.round(time * 10) / 10;
  const goldFirst = got === 3 && was < 3;
  if (goldFirst) addTokens(1);
  persist();
  return { got, was, better: got > was, newBest: newBest && !!prevBest, goldFirst, par: parOf(m) };
}

// ---------- the mission at play ----------
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const solid = (G, x, z, pad) => G.colliders.some(c => c.alive !== false && c.top > 0.6 && c.top < 30 && x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad);
// an open spot near (x, z), r0..r1 away, inside the playable area
function spot(G, x, z, r0, r1, pad = 1.2, avoid = []) {
  const W = G.map.W - 3, L = G.map.L - 8;
  for (let k = 0; k < 80; k++) {
    const a = Math.random() * Math.PI * 2, r = r0 + Math.random() * (r1 - r0);
    const px = Math.max(-W, Math.min(W, x + Math.cos(a) * r)), pz = Math.max(-L, Math.min(L, z + Math.sin(a) * r));
    if (!solid(G, px, pz, pad) && avoid.every(p => Math.hypot(p.x - px, p.z - pz) > 6)) return { x: px, z: pz };
  }
  return { x, z: z - 3 };
}
const beacon = (G, x, z, color, r = 1.6) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); G.scene.add(g);
  const disc = new THREE.Mesh(new THREE.RingGeometry(r - 0.25, r, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.08; g.add(disc);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 14, 20, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 7; g.add(beam);
  return g;
};
const ITEM_COLOR = { collect: 0xffd23c, deliver: 0x7af0ff };
function itemMesh(G, x, z, color) {
  const g = new THREE.Group(); g.position.set(x, 0, z); G.scene.add(g);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.3 }));
  core.position.y = 1.2; g.add(core);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.9, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.08; g.add(halo);
  g.userData.core = core;
  return g;
}
const BREATHER = 5;                                                   // seconds between the two parts

// Set up the mission. P is the player, already created; enemies and allies are made here and
// carried through both parts.
export function initStory(G, P, M) {
  const D = G.D || {}, hard = D.label === 'Veteran' ? 1 : D.label === 'Rookie' ? -1 : 0;
  const S = G.story = { M, P, hard, t0: G.time, stage: -1, K: null, t: 0, st: 0, have: 0, need: 0, timeLeft: 0, over: false, rest: 0,
    enemies: [], allies: [], items: [], checkpoints: [], towers: [], hint: '' };
  const start = spot(G, 0, -(G.map.L - 18), 0, 4);
  S.start = start;
  P.spawnAt = () => spot(G, start.x, start.z, 0, 3);
  spawnHero(G, P);
  // the enemies: bot heroes that keep coming back near the action, enough for the busier part
  const pool = HEROES.filter(h => h.id !== P.def.id).sort(() => Math.random() - 0.5);
  const most = Math.max(...M.stages.filter(K => K.type !== 'boss').map(K => Math.max(1, (K.cap || 3) + hard) + (K.type === 'survive' ? 2 : 0)));
  const away = () => { const ref = S.K?.type === 'defend' && S.obj ? S.obj.pos : P.pos; return spot(G, ref.x, ref.z + 6, 18, 28); };
  for (let i = 0; i < most; i++) {
    const d = pool[i % pool.length], b = createHero(G, d, 'red', d.callsign, false);
    initBot(G, b, i % 3); b.spawnAt = away; spawnHero(G, b);
    b.storyEnemy = true; bench(b);
    S.enemies.push(b);
  }
  const allies = M.allies || 0;
  for (let i = 0; i < allies; i++) {
    const d = pool[pool.length - 1 - i], b = createHero(G, d, 'blue', d.callsign, false);
    initBot(G, b, i); b.spawnAt = () => spot(G, P.pos.x, P.pos.z, 2, 5); spawnHero(G, b);
    b.storyAlly = true; S.allies.push(b);
  }
  beginStage(G, 0);
}
function bench(b) { b.alive = false; b.hp = 0; b.respawnT = Infinity; b.deathT = 99; b.mesh.visible = false; b.bar.visible = false; b.benched = true; }
function unbench(b) { b.benched = false; b.respawnT = 0.5; b.bar.visible = true; }
// how many enemies are out in the current part, and in survive how many join as the clock runs
const enemyCap = S => S.K.type === 'boss' ? 0 : Math.max(1, (S.K.cap || 3) + S.hard);

// Start part i of the mission: clear the last part's objective, then set up this one.
function beginStage(G, i) {
  const S = G.story, K = S.K = S.M.stages[i];
  clearStage(G, S);
  S.stage = i; S.st = 0; S.have = 0; S.need = K.n || 0; S.timeLeft = K.time || 0; S.pointer = null; S.hint = '';
  S.k0 = S.P.kills; S.h0 = S.P.healDone || 0;
  for (const b of S.enemies) if (b.alive || !b.benched) { bench(b); b.mesh.visible = false; }
  if (K.type === 'boss') return beginBoss(G, S, K);
  const P = S.P;
  if (K.type === 'defend') {
    const c = spot(G, 0, 0, 0, 8, 3);
    const o = createStructure(G, 'core', 'blue', c.x, c.z);
    o.kind = 'objective'; o.name = K.name; o.maxHp = o.hp = Math.round(K.hp * (S.hard > 0 ? 1.1 : S.hard < 0 ? 1.3 : 1.2)); setBar(o, 0x3ccf9a);
    S.obj = o;
  } else if (K.type === 'destroy') {
    const used = [];
    for (let j = 0; j < K.n; j++) {
      const p = spot(G, (Math.random() - 0.5) * G.map.W, G.map.L * 0.25, 0, G.map.L * 0.4, 2.2, used); used.push(p);
      const t = createStructure(G, 'tower', 'red', p.x, p.z); t.name = K.name; t.maxHp = t.hp = 700 + S.hard * 100; setBar(t);
      S.towers.push(t);
    }
  } else if (K.type === 'collect') {
    const used = [];
    for (let j = 0; j < K.n; j++) { const p = spot(G, 0, 0, 4, Math.min(G.map.W, G.map.L) * 0.95, 1.4, used); used.push(p); S.items.push({ ...p, g: itemMesh(G, p.x, p.z, ITEM_COLOR.collect) }); }
  } else if (K.type === 'deliver') {
    S.drop = spot(G, 0, -(G.map.L - 26), 0, 5);
    S.dropG = beacon(G, S.drop.x, S.drop.z, 0x3ccf9a, 2.4);
    nextParcel(G, S);
  } else if (K.type === 'race') {
    const W = G.map.W * 0.7, L = G.map.L * 0.55, used = [];
    // start the loop from wherever the player is standing, so part two doesn't send them back
    const a0 = Math.atan2((P.pos.z || -L) / L, (P.pos.x || 0) / W);
    for (let j = 0; j < K.n; j++) {
      const a = a0 + (j + 1) / K.n * Math.PI * 2 * 0.92;
      const p = spot(G, Math.cos(a) * W, Math.sin(a) * L, 0, 5, 1.5, used); used.push(p);
      S.checkpoints.push(p);
    }
    S.cp = 0; S.cpG = beacon(G, S.checkpoints[0].x, S.checkpoints[0].z, 0xffd23c, 2.2);
    S.need = K.n;
  }
  // the first part starts straight away; the second after a short breather
  S.rest = i === 0 ? 0 : BREATHER;
  if (!S.rest) release(S);
  S.goal = GOAL[K.type](K);
  G.ev.story?.(i === 0 ? 'start' : 'stage', S);
}
// let the enemies back in (survive brings them in a couple at a time)
function release(S) {
  const cap = enemyCap(S);
  S.enemies.forEach((b, j) => { if (j < (S.K.type === 'survive' ? Math.min(2, cap) : cap)) unbench(b); });
}
function clearStage(G, S) {
  const drop = s => {
    if (!s) return;
    s.alive = false; G.scene.remove(s.mesh);
    const c = G.colliders.indexOf(s.collider); if (c >= 0) G.colliders.splice(c, 1);
    const k = G.structures.indexOf(s); if (k >= 0) G.structures.splice(k, 1);
  };
  drop(S.obj); S.obj = null;
  for (const t of S.towers) drop(t); S.towers = [];
  for (const it of S.items) G.scene.remove(it.g); S.items = [];
  if (S.parcel) G.scene.remove(S.parcel.g); S.parcel = null;
  if (S.dropG) G.scene.remove(S.dropG); S.dropG = null; S.drop = null;
  if (S.cpG) G.scene.remove(S.cpG); S.cpG = null; S.checkpoints = [];
}
// The last part of a boss mission: the match becomes a raid, with the allies who came along.
function beginBoss(G, S, K) {
  G.mode = 'raid';
  initRaid(G, G.diffKey || 'normal', K.boss);
  const b = G.raid.boss; b.maxHp = b.hp = Math.round(b.maxHp * 0.7);     // a story boss is a little softer
  for (const a of S.allies) if (!a.alive && a.respawnT > 3) a.respawnT = 1;
  S.goal = GOAL.boss(K);
  G.ev.story?.('stage', S);
}
function nextParcel(G, S) {
  const p = spot(G, S.drop.x, S.drop.z + 18, 14, 40, 1.4);
  S.parcel = { ...p, g: itemMesh(G, p.x, p.z, ITEM_COLOR.deliver), held: false };
}

export function updateStory(G, dt, P) {
  const S = G.story; if (!S || S.over || G.over) return;
  const K = S.K;
  if (K.type === 'boss') return;                                     // the raid runs the fight and its ending
  S.t += dt;
  // out of combat, the player patches up slowly (and quickly between parts)
  if (P.alive && (S.rest > 0 || G.time - P.lastHurtT > 5) && P.hp < P.maxHp) { P.hp = Math.min(P.maxHp, P.hp + (S.rest > 0 ? 120 : 18) * dt); setBar(P); }
  for (const it of [...S.items, S.parcel].filter(Boolean)) { const c = it.g.userData.core; if (c) { c.rotation.y += dt * 2; c.position.y = 1.2 + Math.sin(G.time * 3 + it.x) * 0.15; } }
  if (S.rest > 0) {
    S.rest -= dt; S.hint = `Get ready · ${Math.ceil(S.rest)}`;
    if (S.rest <= 0) release(S);
    return;
  }
  S.st += dt;
  if (K.time) S.timeLeft = Math.max(0, K.time - S.st);
  // enemies come back while the part is still going; in survive more join over time
  const cap = enemyCap(S);
  S.enemies.forEach((b, j) => {
    if (b.benched && K.type === 'survive' && j < cap + 2 && S.st > 12 * (j - 1)) unbench(b);
    if (!b.alive && !b.benched && b.respawnT > 9) b.respawnT = 4;
  });
  const fin = win => {
    if (win && S.stage + 1 < S.M.stages.length) { G.ev.story?.('part', S); return beginStage(G, S.stage + 1); }
    S.over = true; G.ev.story?.(win ? 'win' : 'fail', S);
  };
  switch (K.type) {
    case 'defend':
      S.have = Math.min(K.time, S.st); S.need = K.time;
      if (!S.obj.alive) return fin(false);
      if (S.st >= K.time) return fin(true);
      S.hint = S.obj.hp < S.obj.maxHp * 0.35 ? `${cap1(K.name)} is about to fall!` : `Keep them away from ${K.name}`;
      break;
    case 'survive':
      S.have = Math.min(K.time, S.st); S.need = K.time;
      if (S.st >= K.time) return fin(true);
      S.hint = `${S.enemies.filter(b => !b.benched).length} hunting you · stay alive`;
      break;
    case 'elims':
      S.have = P.kills - S.k0;
      if (S.have >= K.n) return fin(true);
      if (S.st > 300) return fin(false);
      S.hint = `${K.n - S.have} to go`;
      break;
    case 'destroy':
      S.have = S.towers.filter(t => !t.alive).length;
      if (S.have >= K.n) return fin(true);
      if (S.st > 300) return fin(false);
      S.hint = `They shoot back · ${K.n - S.have} left`;
      break;
    case 'heal':
      S.have = Math.round((P.healDone || 0) - S.h0);
      if (S.have >= K.n) return fin(true);
      if (S.timeLeft <= 0) return fin(false);
      S.hint = 'Heal your teammates while they fight';
      break;
    case 'collect':
      for (let i = S.items.length - 1; i >= 0; i--) {
        const it = S.items[i];
        if (!P.alive || flat(P.pos, it) > 1.8) continue;
        G.scene.remove(it.g); S.items.splice(i, 1); S.have++;
        burst(G, new THREE.Vector3(it.x, 1.2, it.z), ITEM_COLOR.collect, 1.4);
        G.ev.story?.('pickup', S);
      }
      if (S.have >= K.n) return fin(true);
      if (S.timeLeft <= 0) return fin(false);
      S.hint = S.items.length ? `Nearest ${K.item}: ${Math.round(Math.min(...S.items.map(it => flat(P.pos, it))))}m` : '';
      S.pointer = S.items.slice().sort((a, b) => flat(P.pos, a) - flat(P.pos, b))[0];
      break;
    case 'deliver': {
      const p = S.parcel;
      if (!p.held && P.alive && flat(P.pos, p) < 1.8) { p.held = true; G.ev.story?.('pickup', S); }
      if (p.held) {
        if (!P.alive) { p.held = false; p.x = P.pos.x; p.z = P.pos.z; G.ev.story?.('drop', S); }   // dropped where you went down
        else { p.x = P.pos.x; p.z = P.pos.z; }
        p.g.position.set(p.x, p.held ? 1.4 : 0, p.z);
      }
      if (p.held && flat(P.pos, S.drop) < 2.6) {
        G.scene.remove(p.g); S.have++;
        burst(G, new THREE.Vector3(S.drop.x, 1.5, S.drop.z), 0x3ccf9a, 2); ring(G, new THREE.Vector3(S.drop.x, 0.1, S.drop.z), 0x3ccf9a, 3);
        G.ev.story?.('deliver', S);
        if (S.have >= K.n) return fin(true);
        nextParcel(G, S);
      }
      if (S.timeLeft <= 0) return fin(false);
      S.hint = S.parcel.held ? `Take it to ${K.drop}: ${Math.round(flat(P.pos, S.drop))}m` : `Pick up the ${K.item}: ${Math.round(flat(P.pos, S.parcel))}m`;
      S.pointer = S.parcel.held ? S.drop : S.parcel;
      break;
    }
    case 'race': {
      const c = S.checkpoints[S.cp];
      if (P.alive && flat(P.pos, c) < 2.6) {
        S.cp++; S.have = S.cp;
        burst(G, new THREE.Vector3(c.x, 1.5, c.z), 0xffd23c, 2);
        G.scene.remove(S.cpG); S.cpG = null;
        if (S.cp >= S.checkpoints.length) return fin(true);
        const n = S.checkpoints[S.cp]; S.cpG = beacon(G, n.x, n.z, 0xffd23c, 2.2);
        G.ev.story?.('checkpoint', S);
      }
      if (S.timeLeft <= 0) return fin(false);
      S.pointer = S.checkpoints[S.cp];
      S.hint = `Checkpoint ${S.cp + 1}: ${Math.round(flat(P.pos, S.pointer))}m`;
      break;
    }
  }
}
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);

// bots: enemies push the objective (or hunt you); allies stay close and fight with you
export function storyGoal(G, b, goal, tgt, P) {
  const S = G.story; if (!S) return null;
  if (tgt) {
    const pref = tgt.kind === 'hero' ? b.def.prefRange : Math.max(6, b.def.prefRange * 0.8) + (tgt.rad || 0);
    const dx = b.pos.x - tgt.pos.x, dz = b.pos.z - tgt.pos.z, d = Math.hypot(dx, dz) || 1;
    goal.set(tgt.pos.x + (dx / d) * pref, 0, tgt.pos.z + (dz / d) * pref);
    return { sprint: false };
  }
  if (b.team === 'blue') { const a = b.pos.x > P.pos.x ? 1 : -1; goal.set(P.pos.x + a * 4, 0, P.pos.z - 3); return { sprint: flat(b.pos, P.pos) > 12 }; }
  const focus = S.obj?.alive ? S.obj.pos : S.parcel?.held || !S.parcel ? P.pos : S.parcel;
  const dx = b.pos.x - focus.x, dz = b.pos.z - focus.z, d = Math.hypot(dx, dz) || 1, pref = Math.max(6, b.def.prefRange * 0.8);
  goal.set(focus.x + (dx / d) * pref, 0, focus.z + (dz / d) * pref);
  return { sprint: d > pref + 10 };
}
export const storyInfo = G => G.story && { ...G.story, title: G.story.M.title };
