import { enemySet } from './foes.js';
import { groundAt } from './woud-terrain.js';
import { boxes } from './woud-world.js';

// Down in the mist: mist-crawlers and beetles. Up in the Beuk: bees round the hive. (The magpies by the owl
// are spawned by the trials, which need to know when they've all been chased off.)
export const enemies = enemySet({ groundAt, boxes });
for (const [x, z, roam] of [[-34, 30, 4], [-52, 6, 4], [-20, -10, 5], [20, -14, 4], [40, 24, 4], [-46, -40, 4]]) enemies.spawn('kruiper', x, z, { color: 0x3a4a3a, glow: 0x1a3a1a, eye: 0xb6ff6a, roam });
for (const [x, z] of [[2, 20], [28, -30], [-28, -2]]) enemies.spawn('kever', x, z, { color: 0x4a6a8a });
enemies.spawn('springslak', -10, 30);
enemies.spawn('springslak', 30, 0);
for (const [x, z] of [[18, 36], [14, 31]]) enemies.spawn('vleermuis', x, z, { color: 0xffc23d, wing: 0xf4f4ff, eye: 0x1a1030 });
