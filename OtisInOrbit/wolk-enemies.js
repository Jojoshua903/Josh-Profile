import { enemySet } from './foes.js';
import { groundAt } from './wolk-terrain.js';
import { boxes } from './wolk-world.js';

// Not much lives up here: grumpy little puff-crawlers on the bigger islands, and gulls round the high rocks.
export const enemies = enemySet({ groundAt, boxes });
for (const [x, z, roam] of [[-4, 38, 2.5], [-32, 30, 2], [26, 20, 2], [-36, -4, 3], [-10, -24, 2]]) enemies.spawn('kruiper', x, z, { color: 0xd8d8f0, glow: 0x9ad8ff, roam });
enemies.spawn('vleermuis', 34, 14, { color: 0xf4f4f4, wing: 0xb8c0d0, eye: 0x1a1030, y: 9 });
enemies.spawn('vleermuis', -20, -18, { color: 0xf4f4f4, wing: 0xb8c0d0, eye: 0x1a1030, y: 7 });
// the south
for (const [x, z, roam] of [[4, 68, 2.5], [-27, 99, 2], [13, 104, 2]]) enemies.spawn('kruiper', x, z, { color: 0xd8d8f0, glow: 0x9ad8ff, roam });
enemies.spawn('vleermuis', -12, 104, { color: 0xf4f4f4, wing: 0xb8c0d0, eye: 0x1a1030, y: 9 });
