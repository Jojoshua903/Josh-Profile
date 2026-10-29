import { enemySet } from './foes.js?v=sub1';
import { groundAt } from './tempel-terrain.js?v=sub1';
import { boxes } from './tempel-world.js?v=sub1';

// The temple is empty, nearly. Some moss crawlers on the square, and bats round the dark ravine.
export const enemies = enemySet({ groundAt, boxes });
for (const [x, z, roam] of [[-6, -4, 3], [8, -20, 3], [-12, 22, 2.5], [10, 8, 2]]) enemies.spawn('kruiper', x, z, { color: 0x6a8a4a, glow: 0xd8ff8a, roam });
enemies.spawn('kruiper', -6, -44, { color: 0x6a8a4a, glow: 0xd8ff8a, roam: 1.2 });
enemies.spawn('vleermuis', -16, -30, { color: 0x4a3a5a, wing: 0x2a2038, eye: 0xffd04a, y: 3 });
enemies.spawn('vleermuis', 26, -40, { color: 0x4a3a5a, wing: 0x2a2038, eye: 0xffd04a, y: 9 });
