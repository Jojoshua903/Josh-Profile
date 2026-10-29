import { enemySet } from './foes.js?v=sub1';
import { groundAt } from './berg-terrain.js?v=sub1';
import { boxes } from './berg-world.js?v=sub1';

// Rock beetles in the valley and on the plateau, snow imps that guard the climbs, ice bats in the mine and on the glacier.
export const enemies = enemySet({ groundAt, boxes });
for (const [x, z, roam] of [[16, 6, 5], [-16, -6, 4], [10, -24, 6], [22, -36, 6], [40, 12, 4]]) enemies.spawn('kever', x, z, { roam });
for (const [x, z] of [[-50, -44], [60, 0], [-22, -50], [36, -57], [46, -70]]) enemies.spawn('gooier', x, z);
const ice = { color: 0x9ccbe6, wing: 0x6fa3c8, eye: 0x3d7fd8 };
for (const [x, z] of [[40, -30], [44, -20], [30, -46], [56, -58]]) enemies.spawn('vleermuis', x, z, ice);
enemies.spawn('vleermuis', -44, -14, { color: 0x6b4a30, wing: 0x4a3420 });
