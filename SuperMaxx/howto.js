// "How to play" cards for every mode: the goal, the rules and a few tips, in a pop-up over the
// menus. Opened from the ? on each mode button, the How to play button on the hero and stage
// screens, and once on its own the first time you pick a mode.

const MODES = {
  lane: {
    icon: '▶', name: 'Lane Breaker', color: '#e8423a', tag: 'The classic: push the lanes and break their core.',
    facts: ['3v3 vs bots', 'Up to 7 min', 'Respawn 6s'],
    goal: 'Destroy the enemy team’s core before they destroy yours.',
    rules: [
      'Waves of minions march down every lane every 20 seconds. Walk in with them.',
      'Towers guard each lane and shoot anything in range. Let your minions soak the shots while you hit the tower.',
      'Break a lane’s tower to open the enemy core.',
      'Each base has a stone Guardian that slams enemy heroes who hang around its ring. It stands aside once that core is open and you’re pushing with your own minions.',
      'Your fountain heals you; the enemy fountain burns.',
      'At 5:00 it’s overtime: both cores lose their shields and take double damage. At 7:00 the healthier core wins.',
    ],
    tips: ['Damage to minions and towers charges your ultimate too.', 'Win a fight, then push: a 3v2 is the best time to take a tower.'],
  },
  hill: {
    icon: '♛', name: 'Hill Rush', color: '#e0a100', tag: 'King of the hill, with a hill that won’t sit still.',
    facts: ['3v3 vs bots', 'First to 100', 'Respawn 5s'],
    goal: 'Be the first team to 100 points.',
    rules: [
      'Your team scores while it has the glowing ring to itself. Every extra teammate inside scores faster.',
      'If both teams are inside, the ring is contested and nobody scores.',
      'The ring moves to a new spot every 50 seconds, with a 10-second warning.',
      'You respawn after 5 seconds with a burst of speed to get back to the ring.',
    ],
    tips: ['Head for the next spot early when the warning shows.', 'Standing in the ring is more important than kills.'],
  },
  cart: {
    icon: '🛒', name: 'Payload', color: '#3ccf9a', tag: 'A tug of war over one cart.',
    facts: ['3v3 vs bots', '4:30 limit', 'Respawn 5s'],
    goal: 'Push the cart all the way to the enemy base.',
    rules: [
      'The cart starts in the middle. Stand next to it with no enemies around and it rolls toward their base.',
      'More pushers means a faster cart. Enemies near it too, and it stops dead.',
      'Reach their flag to win. At the time limit, whoever pushed it further wins.',
    ],
    tips: ['Fight next to the cart, not away from it.', 'One teammate on the cart is enough to keep it moving while the others clear the way.'],
  },
  survivor: {
    icon: '☂', name: 'Survivor', color: '#9b5cff', tag: 'Twelve heroes, one storm, no second chances.',
    facts: ['12-player free-for-all', 'No respawns', 'About 5 min'],
    goal: 'Be the last hero standing.',
    rules: [
      'Everyone starts somewhere on the map. There are no teams and no respawns.',
      'A storm closes in phase by phase. Outside the safe ring you take damage, more each phase.',
      'Loot lies on the ground: health, shields and power-ups. Walk over it to pick it up.',
      'Knocked-out heroes drop their loot. Your final place decides your XP.',
    ],
    tips: ['Move toward the next safe ring before the storm does.', 'Let other heroes fight first, then clean up.'],
  },
  potato: {
    icon: '💣', name: 'Hot Potato', color: '#ff5a2a', tag: 'Don’t be holding it when it goes off.',
    facts: ['3v3 vs bots', 'First to 5 blasts', 'Respawn 5s'],
    goal: 'Make the bomb blow up on the other team five times.',
    rules: [
      'One lit bomb rides on someone’s head. The holder runs faster.',
      'The holder passes it by landing any hit on an enemy hero.',
      'When the fuse runs out, the bomb blows up the holder and anyone too close, and the other team scores.',
      'Every round the fuse is a bit shorter, from 16 seconds down to 8.',
      'Knock out the holder and the bomb hops to one of their teammates.',
    ],
    tips: ['Holding it? Chase the nearest enemy, fast.', 'They have it? Keep your distance and don’t stand next to them.'],
  },
  raid: {
    icon: '🌋', name: 'Boss Raid', color: '#c2401a', tag: 'Three heroes, one very big problem.',
    facts: ['You + 2 bots', 'vs 1 boss', '5 min limit'],
    goal: 'Beat the boss before the clock runs out.',
    rules: [
      'Pick a boss on the stage screen: each has its own attacks.',
      'Red markers on the floor (circles, lines and cones) fill up and then land. Get out of them before they’re full.',
      'At two-thirds and one-third health the boss enters a new phase with nastier attacks.',
      'Some attacks can only be dodged by jumping: the banner tells you when.',
      'Shoot the boss’s pods and missiles before they reach you.',
      'If everyone is down at once, or time runs out, the raid fails.',
    ],
    tips: ['Spread out so one attack can’t hit the whole team.', 'Save your ultimate for the boss’s last phase.'],
  },
  ball: {
    icon: '⚽', name: 'Smash Ball', color: '#3ccf9a', tag: 'Football, but you kick the ball with your gun.',
    facts: ['3v3 vs bots', 'First to 3', '4:00 · golden goal', 'Respawn 5s'],
    goal: 'Get the giant ball into the enemy goal. First team to 3 goals wins, or whoever’s ahead after 4 minutes.',
    rules: [
      'Shooting the ball shoves it the way you’re aiming. Harder-hitting shots shove it further: shotguns, rockets and charged rail shots really smash it.',
      'Run into the ball to dribble it ahead of you. Sprint into it to pop it up.',
      'You defend the goal at your end and attack theirs. The goals are solid, so the ball can bounce off the posts.',
      'After a goal, the ball drops back in at the centre spot.',
      'Level at full time? It goes to golden goal: the next goal wins.',
      'You can still fight. Knocking out the enemy keeper leaves their goal wide open.',
    ],
    tips: ['Get behind the ball before you shoot it, so it goes toward their goal and not yours.', 'Leave one teammate hanging back near your goal.', 'A pass counts: the last teammate to touch it before the scorer gets the assist.'],
  },
  story: {
    icon: '📖', name: 'Story', color: '#4a3a8a', tag: 'One mission for every hero, told in two parts.',
    facts: ['Solo, with bots', 'Two parts', 'Medals'],
    goal: 'Finish both parts of a hero’s mission.',
    rules: [
      'Each hero has a mission with a story before, between and after its two parts.',
      'Parts can be defending, racing checkpoints, collecting, delivering, eliminations, surviving, healing or a boss fight.',
      'The marker on screen points to your objective. You get a short breather between the parts.',
      'Bronze for finishing, silver for one knockout or fewer, gold for no knockouts and beating the par time.',
      'Your first clear and your first gold each pay a token.',
    ],
    tips: ['Lost? Follow the objective marker.', 'Go back to old missions for silver and gold.'],
  },
};
export const howToModes = Object.keys(MODES);

let el = null;
function build() {
  el = document.createElement('div');
  el.id = 'howto'; el.className = 'howto hidden';
  el.innerHTML = '<div class="ht-card" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-ht-close]')) closeHowTo(); });
  window.addEventListener('keydown', e => { if (!el.classList.contains('hidden') && (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); e.stopImmediatePropagation(); closeHowTo(); } }, true);
}
export function openHowTo(mode) {
  const M = MODES[mode] || MODES.lane;
  if (!el) build();
  el.querySelector('.ht-card').style.setProperty('--mc', M.color);
  el.querySelector('.ht-card').innerHTML = `
    <header><span class="ht-ico">${M.icon}</span><div><small>How to play</small><h3>${M.name}</h3><p>${M.tag}</p></div><button class="ht-x" data-ht-close aria-label="Close">✕</button></header>
    <div class="ht-facts">${M.facts.map(f => `<span>${f}</span>`).join('')}</div>
    <div class="ht-goal"><b>🎯 Goal</b>${M.goal}</div>
    <h4>How it works</h4><ul>${M.rules.map(r => `<li>${r}</li>`).join('')}</ul>
    <h4>Tips</h4><ul class="tips">${M.tips.map(r => `<li>${r}</li>`).join('')}</ul>
    <button class="ht-ok" data-ht-close>Got it ▸</button>`;
  el.classList.remove('hidden');
}
export function closeHowTo() { el?.classList.add('hidden'); }
export const howToOpen = () => !!el && !el.classList.contains('hidden');
