import { enemySet } from './foes.js?v=sub1';
import { groundAt } from './regen-terrain.js?v=sub1';
import { boxes } from './regen-world.js?v=sub1';

// Night life: soggy rats in the streets, a pigeon-thrower on the hotel roof, and bats round the tall buildings.
export const enemies = enemySet({ groundAt, boxes });
for (const [x, z, roam] of [[-8, 36, 3], [20, 32, 2.5], [-34, 20, 2.5], [10, 0, 3], [-24, -20, 2.5], [34, -20, 2]]) enemies.spawn('kruiper', x, z, { color: 0x5a5a6a, glow: 0xff4ad8, roam });
enemies.spawn('gooier', 36, -8, { fur: 0x9a9aaa, hat: 0xff4ad8, ball: 0x8ab8ff, roam: 1.5 });
enemies.spawn('vleermuis', -16, -32, { color: 0x2a2a44, wing: 0x4a3a6a, eye: 0xff4ad8, y: 9 });
enemies.spawn('vleermuis', 14, -12, { color: 0x2a2a44, wing: 0x4a3a6a, eye: 0xff4ad8, y: 12 });
