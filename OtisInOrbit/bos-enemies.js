import { enemySet } from './foes.js?v=sub1';
import { groundAt, PLATEAU_H } from './bos-terrain.js?v=sub1';
import { boxes } from './bos-world.js?v=sub1';

// Spore blowers guard the dorpje floor and the swamp islands, snails hop around the paths and the woekervlakte,
// glow worms lurk under the islands and in the tunnels.
export const enemies = enemySet({ groundAt, boxes });
for (const [x, z] of [[-56, 22], [-36, -16], [10, -10], [-1, -40], [-20, -62], [30, -60], [1, 20]]) enemies.spawn('sporenblazer', x, z);
for (const [x, z, roam] of [[0, 26, 3], [-60, 0, 5], [0, -56, 6], [40, -72, 5], [-26, 32, 3], [-50, -50, 5]]) enemies.spawn('springslak', x, z, { roam });
for (const [x, z] of [[3, -18], [15, -24], [44, 12], [54, -2], [-12, -6], [-46, -24], [34, -86]]) enemies.spawn('gloeiworm', x, z);
enemies.spawn('vleermuis', 30, -70, { color: 0x5a2e7a, wing: 0x3a1a50, eye: 0xb6e36b, y: PLATEAU_H });
enemies.spawn('vleermuis', -8, -30, { color: 0x2a4a3a, wing: 0x1a3028, eye: 0xb6e36b, y: 0 });
