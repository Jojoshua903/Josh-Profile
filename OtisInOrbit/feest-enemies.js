import { enemySet } from './foes.js?v=sub1';
import { groundAt } from './feest-terrain.js?v=sub1';
import { boxes } from './feest-world.js?v=sub1';

// Party crashers: confetti crawlers in the meadow and the drum field, a snowball-thrower (here: water balloons)
// on the xylophone cliff, and a couple of balloon-bats round the organ woods.
export const enemies = enemySet({ groundAt, boxes });
for (const [x, z, roam] of [[-14, 8, 3], [8, 10, 3], [-34, 16, 2.5], [-24, -4, 2], [20, -10, 2]]) enemies.spawn('kruiper', x, z, { color: 0xff6ad8, glow: 0xfff08a, roam });
enemies.spawn('gooier', 44, 0, { fur: 0xffd8f0, hat: 0x4ad8ff, ball: 0x6ac8ff, roam: 1.5 });
enemies.spawn('vleermuis', 24, -16, { color: 0xb47aff, wing: 0xff9ad8, eye: 0xfff04a, y: 5 });
enemies.spawn('vleermuis', -8, -10, { color: 0xb47aff, wing: 0xff9ad8, eye: 0xfff04a, y: 4 });
