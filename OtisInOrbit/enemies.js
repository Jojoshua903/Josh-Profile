import { enemySet } from './foes.js';
import { groundAt, pathX, RAVINE_Z } from './terrain.js';
import { boxes } from './world.js';

// Mistkruipers in the mist and the town, and bats that hang over the ravine and the cliff top.
export const enemies = enemySet({ groundAt, boxes });
const K = (x, z, roam = 4) => enemies.spawn('kruiper', x, z, { roam });
K(pathX(11), 11, 2);
K(pathX(-6), -6, 2);
K(0, -19, 3);
K(10, -33, 3);
K(-3, -56, 4);
K(-18, -28, 3);
K(19, -50, 2.5);
K(-8, RAVINE_Z, 4);
for (const [x, z] of [[2, RAVINE_Z], [14, RAVINE_Z - 1], [-14, -68]]) enemies.spawn('vleermuis', x, z);
