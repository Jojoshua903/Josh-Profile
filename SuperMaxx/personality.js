// Personality: the extra voice and story for every hero. Merged into the hero defs at load.
// select: said in hero select · death: knocked out · lowhp: under 30% · thanks: healed by a teammate
// win / lose: the results screen · kill: extra elimination lines · rivals: a taunt for knocking out
// that hero · friends: a hello when that hero spawns on your team · likes, dislikes, fact: Story tab

import { ALL_HEROES as HEROES } from './heroes.js?v=20261127j';

const P = {
  vanguard: {
    select: ['Bulwark on watch. Nobody gets past the breakwater.', 'Chin up, chest out, shield first.', 'I have held this harbour through worse weather than you.'],
    death: ['Man... overboard...', 'Tell the harbour I held.'], lowhp: ['Taking on water!', 'Hull breached, still standing!'],
    thanks: ['Much obliged, sailor.', 'That patched the leaks.'], win: ['Harbour secured. Tea, anyone?', 'Not one ship lost.'], lose: ['We sail again tomorrow.', 'The tide turns. It always does.'],
    kill: ['Anchors aweigh.', 'Docked.'], rivals: { croc: 'Back in the water, ferryman.' }, friends: { croc: 'Gustave! Try not to sink us this time.' },
    likes: 'Strong tea, a calm tide, a well-tied knot', dislikes: 'Seagulls, people who skip the safety drill', fact: 'Has never once taken off her life jacket. Not even to sleep.',
  },
  striker: {
    select: ['Zip! Signed, sealed, delivered.', 'Got a package with your name on it.', 'Fastest legs in Solmare. Ask anyone. Quickly.'],
    death: ['Return to sender...', 'Lost in the post.'], lowhp: ['Running late, running hurt!', 'Gonna need a signature for this one.'],
    thanks: ['Express service, love it!', 'Thanks! Gotta go!'], win: ['Delivered on time. Every time.', 'Five stars, would deliver again.'], lose: ['Package damaged in transit.', 'Next-day delivery. Watch me.'],
    kill: ['Next stop: you.', 'Signed for.'], rivals: { kestrel: 'Ground mail beats air mail, Wren!' }, friends: { ember: 'Margot! Try not to blow up my van.' },
    likes: 'Shortcuts, energy drinks, stairs taken three at a time', dislikes: 'Revolving doors, "sorry we missed you" slips', fact: 'Has delivered over 40,000 parcels and dropped exactly one. It was a cake. He still thinks about it.',
  },
  ember: {
    select: ['Mesdames et messieurs... Cinder!', 'Tonight, the sky is my stage.', 'Stand back, darling. This one is loud.'],
    death: ['The show... must... go on...', 'Not my finale...'], lowhp: ['A little singed, nothing more!', 'My costume is ruined!'],
    thanks: ['Merci, mon ami!', 'You are a star.'], win: ['Encore! ENCORE!', 'A standing ovation, as usual.'], lose: ['Every great show has a bad night.', 'The critics will be cruel.'],
    kill: ['Ooh, sparkly.', 'Fabulous.'], rivals: { avalanche: 'Snow melts, darling.' }, friends: { tempo: 'Ines! You bring the beat, I bring the boom.' },
    likes: 'Applause, sequins, the smell of gunpowder', dislikes: 'Rain on show nights, polite clapping', fact: 'Her eyebrows have grown back eleven times. She counts.',
  },
  warden: {
    select: ['The lantern is lit. I will keep watch.', 'Walk in the light. I have you.', 'Be still. I see everything.'],
    death: ['The light... flickers...', 'Keep the lantern burning...'], lowhp: ['My flame grows dim.', 'I need a moment of grace.'],
    thanks: ['Bless you.', 'Kindness returned. Thank you.'], win: ['The vigil ends in dawn.', 'All are safe. Rest now.'], lose: ['Even the night must end.', 'We will rise with the morning.'],
    kill: ['Go gently.', 'The light finds all.'], rivals: { mirage: 'No tricks survive the light.' }, friends: { thicket: 'Hazel. Your garden grows well under my lamp.' },
    likes: 'Quiet chapels, candle wax, long night watches', dislikes: 'Loud boots, people who blow out candles', fact: 'Has not slept a full night in nine years. Says she does not need to. Nobody believes her.',
  },
  thicket: {
    select: ['Thicket. Mind where you step.', 'Everything grows back. Except you.', 'Fresh soil, sharp thorns. Let us begin.'],
    death: ['Back to the compost...', 'I will... regrow...'], lowhp: ['Losing leaves here!', 'I am wilting!'],
    thanks: ['Like spring rain. Thank you.', 'I feel greener already.'], win: ['A bumper harvest.', 'The garden thrives.'], lose: ['Frost got us this time.', 'Pruned. But the roots are fine.'],
    kill: ['Weeded.', 'Mulch.'], rivals: { mole: 'Stay OUT of my flower beds!' }, friends: { elf: 'Sylvaine. Please do not shoot my trees.' },
    likes: 'Wet soil, bees, the first green shoot', dislikes: 'Slugs, lawnmowers, Digby Burrows', fact: 'Talks to her plants every morning. They are, she insists, very good listeners.',
  },
  ratchet: {
    select: ['Tools out. Biscuit, heel!', 'Ratchet and Biscuit, reporting for repairs.', 'If it is broken, I will fix it. If it is not, I will improve it.'],
    death: ['Biscuit... fetch help...', 'Needs... more... rivets...'], lowhp: ['Running on spare parts!', 'Structural integrity: questionable!'],
    thanks: ['Good as new!', 'That is some fine maintenance.'], win: ['Built to win. Biscuit, treats!', 'Flawless engineering.'], lose: ['Back to the drawing board.', 'A design flaw. Noted.'],
    kill: ['Decommissioned.', 'Good boy, Biscuit!'], rivals: { chipmunk: 'Nice suit, Pip. Mine has a dog.' }, friends: { chipmunk: 'Pip! I brought you the spare bolts.' },
    likes: 'Oily rags, a perfect weld, Biscuit', dislikes: 'Flat-pack furniture, "it just stopped working"', fact: 'Biscuit is a turret. Biscuit is also, legally, a registered dog.',
  },
  mirage: {
    select: ['For my next trick... I vanish.', 'Pick a card. Any card. Too late.', 'Ladies and gentlemen, Mirage!'],
    death: ['That was... not part of the act...', 'The trick... failed...'], lowhp: ['I need an escape act!', 'This is where I disappear!'],
    thanks: ['Magic! Truly.', 'My lovely assistant!'], win: ['And THAT is the show!', 'Applause. Now.'], lose: ['A magician never reveals... why she lost.', 'Tough crowd.'],
    kill: ['Abracadabra.', 'Gone!'], rivals: { warden: 'Now you see me, Sister. Now you do not.' }, friends: { ember: 'Margot, darling! Same stage again!' },
    likes: 'Velvet, mirrors, the gasp of an audience', dislikes: 'Hecklers, people who explain the trick', fact: 'Once made an entire ferry disappear. It was in the fog. She still takes the credit.',
  },
  avalanche: {
    select: ['AVALANCHE IS HERE! SNOW DAY!', 'Boots on! Who wants to go sledging?', 'HA! Bundle up, little ones!'],
    death: ['Melting...!', 'Just... a cold snap...'], lowhp: ['Getting a bit slushy!', 'I am NOT melting!'],
    thanks: ['Warms the heart! HA!', 'That is the good stuff!'], win: ['SNOW DAY FOR EVERYONE!', 'HA! Hot cocoa on me!'], lose: ['A thaw! Only a thaw!', 'Next winter, we win!'],
    kill: ['Snowed in!', 'Frosty!'], rivals: { ember: 'FIRE IS OUT! HA!' }, friends: { kestrel: 'Wren! Fly me up the mountain later!' },
    likes: 'Fresh powder, loud songs, sledging downhill', dislikes: 'Summer, puddles, tiny chairs', fact: 'Shouts everything. Has whispered exactly once. It caused a real avalanche.',
  },
  croc: {
    select: ['Ferry is open. Hop on.', 'Snapjaw. You can call me Gus.', 'Mind the gap. And the teeth.'],
    death: ['Sinking...', 'Back to the swamp...'], lowhp: ['Taking a bite out of me!', 'Need to soak a while!'],
    thanks: ['Mighty kind.', 'Feels like a warm mudbath.'], win: ['Everybody aboard the winner\'s ferry.', 'Good haul today.'], lose: ['Ferry\'s late. It happens.', 'Rough water.'],
    kill: ['Snap.', 'Swallowed whole.'], rivals: { vanguard: 'Harbour\'s closed, Captain.' }, friends: { vanguard: 'Captain Brandt. Your boat or mine?' },
    likes: 'Warm mud, slow afternoons, his ferry the Muddy Margaret', dislikes: 'Handbags, ice, fast talkers', fact: 'Has run the swamp ferry for 60 years and never charged a fare. "Tips welcome."',
  },
  tempo: {
    select: ['Tempo, live from the ferry deck!', 'Turn it up! Let\'s get loud!', 'Drop the needle. Let\'s go.'],
    death: ['Record... scratched...', 'Fading out...'], lowhp: ['Losing the beat!', 'Off-tempo here!'],
    thanks: ['That\'s a remix!', 'Big love!'], win: ['That was a banger.', 'Mic drop. Crowd goes wild.'], lose: ['Bad mix. Next set\'s better.', 'Skipped a track.'],
    kill: ['Off the beat.', 'Dropped.'], rivals: { dancer: 'Wrong tempo, ballerina.' }, friends: { ember: 'Margot! Lights and music, baby!' },
    likes: 'Vinyl, bass you can feel, sunset sets', dislikes: 'Silence, people who talk over the drop', fact: 'Has never played the same set twice. Her playlist is 9,000 songs and growing.',
  },
  kestrel: {
    select: ['Kestrel, wheels up!', 'Clear skies, clear shots.', 'Hold on to your hats down there.'],
    death: ['Mayday... mayday...', 'Going down...'], lowhp: ['Losing altitude!', 'Engine trouble!'],
    thanks: ['Cheers, ground crew!', 'Refuelled and ready!'], win: ['Victory roll!', 'Perfect landing.'], lose: ['Rough landing. We fly again.', 'Grounded. For now.'],
    kill: ['Bombs away.', 'Air superiority.'], rivals: { striker: 'Air mail wins again, Kip.' }, friends: { avalanche: 'Ingrid! Want a lift up the mountain?' },
    likes: 'Tailwinds, goggles, loop-the-loops', dislikes: 'Fog, ground traffic, Kip\'s van', fact: 'Built her biplane from a bathtub and a windmill. It still has the plug.',
  },
  cavalier: {
    select: ['Cavalier and Pudding, at your service!', 'Saddle up! Glory awaits!', 'A knight never retreats. Pudding sometimes does.'],
    death: ['Pudding... ride on...', 'Unhorsed... how embarrassing...'], lowhp: ['A mere flesh wound!', 'Pudding, I need a moment!'],
    thanks: ['You have my thanks, good squire!', 'Most chivalrous!'], win: ['For the guard! For Pudding!', 'A victory worthy of song!'], lose: ['A knight learns from defeat.', 'Pudding is disappointed in all of us.'],
    kill: ['En garde!', 'Jousted!'], rivals: { brawler: 'Wheels are no match for hooves!' }, friends: { vanguard: 'Captain! Pudding sends his regards.' },
    likes: 'Polished armour, apples (for Pudding), a proper duel', dislikes: 'Cowards, stable mud, being called "ma\'am"', fact: 'Pudding is a pony. Pudding has a higher rank in the guard than three of its officers.',
  },
  slime: {
    select: ['Professor Blobert, PhD, mostly goo.', 'Please, no jars. I have tenure.', 'Science! Squishy, squishy science!'],
    death: ['I need... a beaker...', 'Spilled again...'], lowhp: ['I am leaking!', 'Losing volume!'],
    thanks: ['Most kind, I was evaporating.', 'Ah, rehydrated!'], win: ['Peer-reviewed victory!', 'A sticky success!'], lose: ['A failed experiment. Data is data.', 'Back to the lab.'],
    kill: ['Engulfed.', 'Hypothesis confirmed.'], rivals: { chipmunk: 'Acorns are not a food group, Pip.' }, friends: { dancer: 'Odette! Mind the puddles in your slippers.' },
    likes: 'Tweed, footnotes, a good petri dish', dislikes: 'Sponges, sunny days, being mopped', fact: 'Still marks his students\' essays. They come back slightly damp.',
  },
  brawler: {
    select: ['Torque! Laces tight, wheels hot.', 'Keep moving, keep hitting.', 'Let\'s roll.'],
    death: ['Wiped out...', 'Ran out of rink...'], lowhp: ['Took a bad fall!', 'Need a time-out!'],
    thanks: ['Back in the jam!', 'Now I can roll!'], win: ['Lap of honour!', 'Undefeated. Still.'], lose: ['Penalty box. I\'ll be back.', 'Bad bounce.'],
    kill: ['Body check!', 'Knocked out of the rink!'], rivals: { cavalier: 'Horses can\'t skate, Dame!' }, friends: { striker: 'Kip! Race you to the point!' },
    likes: 'Fresh wheels, loud crowds, going fast', dislikes: 'Gravel, standing still, referees', fact: 'Has been banned from three skate leagues. He has framed all three letters.',
  },
  chipmunk: {
    select: ['Pip and BOLT-9, online! Mostly.', 'Big suit. Bigger attitude.', 'BOLT, say hello! ...BOLT says hello.'],
    death: ['BOLT... is down...', 'Ejecting! Wait, no...'], lowhp: ['BOLT\'s smoking! Is that bad?', 'Warning lights everywhere!'],
    thanks: ['BOLT says thank you!', 'Repairs complete!'], win: ['BOLT, victory dance!', 'Small pilot, big win!'], lose: ['BOLT needs an oil change.', 'Back to the garage.'],
    kill: ['Squashed it!', 'Crunch!'], rivals: { ratchet: 'BOLT says your turret looks silly.' }, friends: { ratchet: 'Bastian! BOLT missed Biscuit!' },
    likes: 'Acorns, spare parts, sitting high up', dislikes: 'Cats, being stepped on, low ceilings', fact: 'BOLT-9 is made from a vending machine. If you hit it just right, it still drops a snack.',
  },
  elf: {
    select: ['Larkspur. Do try to keep up.', 'Three hundred years of practice. Watch.', 'The forest whispers. It says I win.'],
    death: ['Impossible... I never miss...', 'The leaves... fall...'], lowhp: ['Even I can bleed, it seems.', 'Unseemly. Most unseemly.'],
    thanks: ['How very mortal of you. Thank you.', 'Adequate. Most adequate.'], win: ['Naturally.', 'As foretold.'], lose: ['A century from now, no one will remember.', 'The wind was against me.'],
    kill: ['Pinned.', 'Clean shot.'], rivals: { thicket: 'Your trees? They were MY trees.' }, friends: { thicket: 'Hazel. Your oaks are looking well.' },
    likes: 'Moonlight, perfect silence, being right', dislikes: 'Haste, loud boots, anything made of plastic', fact: 'Is technically the youngest archer in her grove. She is 312.',
  },
  dancer: {
    select: ['Pirouette. And one, and two...', 'The stage is mine.', 'Shall we dance?'],
    death: ['Curtain... falls...', 'I missed... my cue...'], lowhp: ['My pointe shoes are ruined!', 'I need an intermission!'],
    thanks: ['Merci, darling!', 'Perfectly timed!'], win: ['Bravo! Bravo!', 'A flawless performance.'], lose: ['Even prima ballerinas stumble.', 'Rehearsal tomorrow. Early.'],
    kill: ['Exit, stage left.', 'Graceful.'], rivals: { tempo: 'You call that a beat?' }, friends: { slime: 'Professor! Please stay off my stage.' },
    likes: 'Swan Lake, satin ribbons, a full house', dislikes: 'Squeaky floors, latecomers, sneezes in the quiet bit', fact: 'Has danced Swan Lake 400 times. On night 212 the stage caught fire and she finished anyway.',
  },
  mole: {
    select: ['Burrow, foreman. Hard hats on.', 'There\'s a shortcut. There\'s always a shortcut.', 'Mind the hole. No, the OTHER hole.'],
    death: ['Cave-in...!', 'Should have... looked up...'], lowhp: ['Tunnel\'s collapsing!', 'I\'m in a hole here!'],
    thanks: ['Ta, mate!', 'That\'ll keep me digging!'], win: ['Shift complete. Tea break!', 'Dug our way to victory.'], lose: ['Hit bedrock.', 'Back underground.'],
    kill: ['Six feet under.', 'Buried.'], rivals: { thicket: 'Your roots were in MY tunnel!' }, friends: { chipmunk: 'Pip! Fancy a tunnel?' },
    likes: 'Worms (for snacking), hard hats, a good long tunnel', dislikes: 'Bright lights, gravel, Hazel\'s garden beds', fact: 'Cannot see further than his own nose. Navigates entirely by smell. Has never once got lost.',
  },
  medic: {
    select: ['Stitch. Clinic’s open.', 'Who’s bleeding? Everyone? Lovely.', 'Hold still and nobody gets hurt.'],
    death: ['Physician... heal thyself...', 'Somebody... call a doctor...'], lowhp: ['I need a doctor! Oh wait.', 'Medic down! Ish!'],
    thanks: ['Thank you, I never get treated!', 'Good bedside manner!'], win: ['Clean bill of health!', 'Everyone discharged. Well done.'], lose: ['We lost the patient.', 'Back to triage.'],
    kill: ['Time of death: now.', 'Prescription: rest.'], rivals: { ember: 'Every match I treat your burns. EVERY match.' }, friends: { dancer: 'Odette! Mind those ankles today.' },
    likes: 'Clean bandages, strong tea, patients who listen', dislikes: 'Paper cuts, people who say “it’s just a scratch”', fact: 'Has never lost a dart. Has lost forty-one pens.',
  },
  spark: {
    select: ['Dynamo! Fully charged!', 'Who wants a jump start?', 'Feeling flat? I can fix that.'],
    death: ['Battery... low...', 'Powering... down...'], lowhp: ['I’m on reserve power!', 'Running on fumes here!'],
    thanks: ['Ooh, that tingles! Thanks!', 'Recharged!'], win: ['Lights on, everybody!', 'Shocking performance. In a good way.'], lose: ['Blown a fuse.', 'Total blackout.'],
    kill: ['Zapped.', 'Unplugged.'], rivals: { ratchet: 'Your wiring is a crime, Bastian.' }, friends: { tempo: 'Ines! I fixed your speakers again.' },
    likes: 'Neon signs, thunderstorms, the smell of solder', dislikes: 'Rubber boots, dead batteries, wet socks', fact: 'Her hair has stood on end since an incident with the Grand Canal tram in 2019.',
  },
  builder: {
    select: ['Mortar. Let’s build something.', 'Measure once. Build wherever.', 'Hard work, soft bricks. No, hard bricks.'],
    death: ['Structural... failure...', 'Should have... used... rebar...'], lowhp: ['I’m crumbling here!', 'Need some support beams!'],
    thanks: ['Grazie! Solid work!', 'You’re a load-bearing friend.'], win: ['Built to last!', 'Job done. Lunch break.'], lose: ['Back to the drawing board.', 'Condemned.'],
    kill: ['Bricked.', 'Flattened.'], rivals: { mole: 'You dug under my foundations AGAIN, Digby!' }, friends: { chipmunk: 'Pip! Want to see my new wall?' },
    likes: 'Straight lines, big lunches, a nice right angle', dislikes: 'Rain on wet cement, wobbly tables, blueprints', fact: 'Once built a sandcastle so big the city made him get a permit.',
  },
  wellington: {
    select: ['Beef Wellington, at your service.', 'Dinner is served. Do keep up.', 'One does not simply skip the main course.'],
    death: ['I have been... overcooked...', 'Tell the chef... I was delicious...'], lowhp: ['My crust is cracking!', 'I am NOT a snack!'],
    thanks: ['Most kind, old sport.', 'A true gentleman!'], win: ['Compliments to the team!', 'A five-star performance.'], lose: ['Sent back to the kitchen.', 'Rather a soggy bottom, that.'],
    kill: ['Served cold.', 'Off the menu.'], rivals: { microwave: 'You will NOT reheat me, you humming box!' }, friends: { medic: 'Doctor Quist! Do take a slice.' },
    likes: 'Fine gravy, good manners, a hot oven', dislikes: 'Microwaves, ketchup, people who cut him in half', fact: 'Was knighted for services to Sunday lunch. Has never once been eaten.',
  },
  shepherd: {
    select: ['Crook. Let’s round them up.', 'Come by, lambs.', 'Forty years of herding. You lot are easy.'],
    death: ['Ach... the wolves got me...', 'Mind the flock...'], lowhp: ['I’m being fleeced here!', 'Need a hand, lads!'],
    thanks: ['Cheers, lad!', 'Good dog. Er, good friend.'], win: ['All safely in the pen!', 'Not a sheep lost.'], lose: ['The flock’s scattered.', 'Back to the hills.'],
    kill: ['Sheared.', 'Counted.'], rivals: { mirage: 'I can count, lass. There’s only ONE of you.' }, friends: { thicket: 'Hazel! Lovely grazing you’ve grown.' },
    likes: 'Wet hills, warm tea, a well-behaved collie', dislikes: 'Wolves, fences left open, being called "Bo Peep"', fact: 'Knows all four hundred of his sheep by name. They do not know his.',
  },
  microwave: {
    select: ['*hum* ... DING.', 'The Microwave. Online.', '*low hum intensifies*'],
    death: ['*sad ding*', 'Error... E7...'], lowhp: ['*worried humming*', 'Door... seal... failing...'],
    thanks: ['*grateful ding*', 'Ding ding!'], win: ['DING DING DING!', '*victorious humming*'], lose: ['*defeated hum*', 'Cycle... interrupted.'],
    kill: ['Thirty seconds. Done.', 'DING.'], rivals: { wellington: 'Thirty seconds on high, pastry.' }, friends: { builder: 'Bruno! Your lunch is ready.' },
    likes: 'Lasagne, the number 1000, a good long hum', dislikes: 'Forks, tin foil, being unplugged', fact: 'Has reheated the same lasagne 4,112 times. It refuses to throw it away.',
  },
  chef: {
    select: ['Flambé! The kitchen is open.', 'Oui, it is supposed to be on fire.', 'Tonight’s special: explosions.'],
    death: ['My soufflé... has fallen...', 'Tell the brigade... more butter...'], lowhp: ['I am being roasted here!', 'Somebody turn down the heat!'],
    thanks: ['Merci, merci!', 'Magnifique!'], win: ['Service! Perfect service!', 'Three stars. No, four!'], lose: ['A disaster. A kitchen nightmare.', 'Back to the pastry station.'],
    kill: ['Order up!', 'Garnished.'], rivals: { microwave: 'Thirty seconds is NOT cooking, you traitor!' }, friends: { wellington: 'Sir Reginald! You look... delicious, as always.' },
    likes: 'Butter, open flames, a perfectly timed fuse', dislikes: 'Microwaves, health inspectors, people who ask for ketchup', fact: 'Holds four Michelin stars and four Michelin craters. The guide asked him to stop.',
  },
  manspider: {
    select: ['Man-Spider. I’m on the clock.', 'Your friendly neighbourhood accountant.', 'Right. Coffee, then crime-fighting.'],
    death: ['Should have... called in sick...', 'Filing... my last report...'], lowhp: ['I’m hanging by a thread here!', 'Need backup, team!'],
    thanks: ['Thanks, I owe you a coffee.', 'Appreciated. I’ll put it in writing.'], win: ['Another productive day!', 'That’s a wrap. Literally.'], lose: ['Not my best quarter.', 'Back to the drawing board. And the ceiling.'],
    kill: ['Wrapped up.', 'Signed, sealed, webbed.'], rivals: { mirage: 'Real spiders don’t need tricks, Veil.' }, friends: { shepherd: 'Hamish! Your sheep keep walking through my webs.' },
    likes: 'Black coffee, a tidy spreadsheet, high ceilings', dislikes: 'Rolled-up newspapers, slippery bathtubs, Monday meetings', fact: 'Still files his tax returns every year. As a spider, he owes nothing.',
  },
  pinball: {
    select: ['Tilt’s on the table!', 'Ball one, ready to launch.', 'Let’s rack up some points.'],
    death: ['Drained... straight down the middle...', 'Tilt! TILT!'], lowhp: ['I’m about to drain here!', 'Somebody nudge the table!'],
    thanks: ['Free ball! Thanks!', 'Bonus points for you!'], win: ['JACKPOT! High score!', 'Put my initials on the board!'], lose: ['Game over. Insert coin?', 'That was a bad bounce.'],
    kill: ['Multiplier up!', 'Bonk!'], rivals: { tempo: 'Your beats are so last cabinet, Ines.' }, friends: { pixel: 'Sir P! Same arcade, different machine!' },
    likes: 'Flashing lights, the sound of a replay, lucky quarters', dislikes: 'Slanted floors, sticky flippers, people who shake the table', fact: 'Has never once read the instructions on a pinball machine.',
  },
  clawbot: {
    select: ['CL-4W ONLINE. PRIZES WILL BE GRABBED.', 'Insert token. Grabbit is ready.', 'FAIR PLAY SWITCH: OFF.'],
    death: ['GRIP... STRENGTH... ZERO...', 'Prize... dropped...'], lowhp: ['WARNING: CABINET DAMAGED.', 'Low battery. Assistance please.'],
    thanks: ['GRATITUDE.EXE', 'You are a valued customer.'], win: ['ALL PRIZES COLLECTED.', 'Winner. Winner. Winner.'], lose: ['The claw... slipped.', 'Rigged. As usual.'],
    kill: ['Prize won.', 'Grab complete.'], rivals: { chipmunk: 'Your mech is not a real claw machine, rodent.' }, friends: { microwave: 'Fellow appliance. Greetings.' },
    likes: 'Plush toys, firm grips, the chime of a winner', dislikes: 'Loose screws, tilting, people who say "so close"', fact: 'Has 2,417 plush toys hidden inside his cabinet. He knows every one by name.',
  },
  owl: {
    select: ['Hoot here. Who ordered the trouble?', 'Night shift reporting for duty.', 'Got a delivery for the other team.'],
    death: ['Lost... in the post...', 'Return... to sender...'], lowhp: ['I’m losing feathers here!', 'Need a hand! Or a wing!'],
    thanks: ['Much obliged. I’ll send a postcard.', 'Thank you kindly. Hoo-hoo!'], win: ['Delivered on time, as always.', 'That’s the last of the post. Home for breakfast.'], lose: ['Undeliverable. Blast.', 'Ah. Wrong address, that one.'],
    kill: ['First class.', 'Stamped and posted.'], rivals: { kestrel: 'That biplane of yours is very loud at night, Kestrel.' }, friends: { elf: 'Larkspur! Lovely night for a flight, isn’t it?' },
    likes: 'A full moon, a tidy sorting office, warm mice on toast', dislikes: 'Daylight, wrong addresses, anyone who says “who” when they mean “whom”', fact: 'Can turn his head almost all the way round, which is why nobody ever sneaks up on him.',
  },
  pixel: {
    select: ['PLAYER ONE: SIR PIXEL!', 'A new quest begins!', 'Press start to begin!'],
    death: ['GAME... OVER...', 'Continue? Ten... nine...'], lowhp: ['My health bar is blinking!', 'One heart left!'],
    thanks: ['Huzzah! A health potion!', 'My thanks, brave ally!'], win: ['LEVEL COMPLETE!', 'You have found the Golden Byte!'], lose: ['Our quest continues... next credit.', 'Saved progress. Try again!'],
    kill: ['Foe vanquished!', '+1000 points!'], rivals: { mirage: 'Thine illusions are poorly rendered, Veil.' }, friends: { pinball: 'Lady Tilt! Thy flippers are legendary!' },
    likes: 'Save points, treasure chests, a good 8-bit fanfare', dislikes: 'Bottomless pits, invisible walls, people who blow on cartridges', fact: 'Is exactly 16 pixels tall in his original game.',
  },
};

// Merge into the hero defs: extra kill lines join the existing ones, the rest is added as is.
for (const h of HEROES) {
  const p = P[h.id]; if (!p) continue;
  h.quips = { ...h.quips, kill: [...(h.quips.kill || []), ...(p.kill || [])],
    select: p.select, death: p.death, lowhp: p.lowhp, thanks: p.thanks, win: p.win, lose: p.lose };
  h.rivals = p.rivals || {}; h.friends = p.friends || {};
  h.likes = p.likes; h.dislikes = p.dislikes; h.fact = p.fact;
}
export const personalityLoaded = true;
