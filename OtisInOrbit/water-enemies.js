import { enemySet } from './foes.js';
import { groundAt } from './water-terrain.js';
import { boxes } from './water-world.js';

// Beach crabs (small, and not in charge of anything) on the islands, a snowball-thrower on the lighthouse island,
// and gulls round the palace and the bay. Nothing lives on the ice: it melts every morning.
export const enemies = enemySet({ groundAt, boxes });
for (const [x, z, roam] of [[7, 36, 3], [-6, 46, 2.5], [-6, -2, 2.5], [-33, 30, 2], [39, 6, 1.5]]) enemies.spawn('kruiper', x, z, { color: 0xe0603a, glow: 0xffe0a0, roam });
enemies.spawn('gooier', 32, -2, { fur: 0xf4f8ff, hat: 0x3a6aa8, ball: 0xe8f8ff, roam: 1.5 });
enemies.spawn('vleermuis', 5, -10, { color: 0xf4f4f4, wing: 0x9aa4b4, eye: 0x1a1030, y: 3 });
enemies.spawn('vleermuis', -35, 22, { color: 0xf4f4f4, wing: 0x9aa4b4, eye: 0x1a1030, y: 3.5 });
