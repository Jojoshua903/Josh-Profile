import { enemySet } from './foes.js?v=sub1';
import { groundAt } from './schroot-terrain.js?v=sub1';
import { boxes } from './schroot-world.js?v=sub1';

// Tin-can robots patrol the heaps and shoot sparks, rusty crawlers scuttle around, scrap throwers sit on the
// islands and heap edges, and rusty bats flap through the factory and round De Top.
export const enemies = enemySet({ groundAt, boxes });
for (const [x, z, roam] of [[-44, 2, 3], [-36, -4, 3], [44, 3, 2.5], [46, 15, 3], [-27, -52, 3], [40, -76, 3], [8, -82, 3]]) enemies.spawn('blikbot', x, z, { roam });
for (const [x, z] of [[-10, 32], [12, 30], [-36, -58], [14, -90], [39, -34]]) enemies.spawn('kruiper', x, z, { color: 0x8a4a2a, glow: 0xffa040 });
for (const [x, z] of [[-6, -9], [-18, -26], [-52, 12], [-20, -44]]) enemies.spawn('gooier', x, z, { fur: 0x8a7a6a, hat: 0xc0443a, ball: 0x5a5a62 });
enemies.spawn('vleermuis', 42, 4, { color: 0x6a3a2a, wing: 0x4a2a1a, eye: 0xffa040, y: 6 });
enemies.spawn('vleermuis', 34, -88, { color: 0x6a3a2a, wing: 0x4a2a1a, eye: 0xffa040, y: 9.6 });
enemies.spawn('vleermuis', -46, -6, { color: 0x6a3a2a, wing: 0x4a2a1a, eye: 0xffa040, y: 6 });
