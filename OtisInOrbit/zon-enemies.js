import { enemySet } from './foes.js?v=sub1';
import { groundAt } from './zon-terrain.js?v=sub1';
import { boxes } from './zon-world.js?v=sub1';

// Fire beetles scuttle over the rocks, a sand-thrower guards the Oostrots, and ember bats flap round the Noordrots.
// Nothing lives on the rafts: they'd drift off with it.
export const enemies = enemySet({ groundAt, boxes });
for (const [x, z, roam] of [[10, 34, 3], [-2, -46, 2.5], [-33, 5, 2]]) enemies.spawn('kruiper', x, z, { color: 0xc0302a, glow: 0xffd040, roam });
enemies.spawn('gooier', 34, 0, { fur: 0xe8c890, hat: 0xff5a7a, ball: 0xff8a2a, roam: 1.5 });
enemies.spawn('vleermuis', 0, -42, { color: 0xc04a1a, wing: 0x8a2a10, eye: 0xffe060, y: 3 });
enemies.spawn('vleermuis', 30, -3, { color: 0xc04a1a, wing: 0x8a2a10, eye: 0xffe060, y: 3 });
