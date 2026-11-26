# Ridgeline

Files: index.html (menus, HUD, styles), world.js (scene, maze, physics, chalk, glowsticks, sound),
game.js (climbers, controls, menus, rounds), net.js (Firebase Realtime Database sync + your config).

## Online play
1. Firebase console > Realtime Database > Rules, paste and Publish:
   { "rules": { "ridgeline": { "$room": { ".read": true, ".write": true } } } }
2. Host the folder (GitHub Pages or Firebase Hosting) and share the link.
   Dia's preview blocks Firebase, so online only works from the hosted page.

Data under ridgeline/{room}: meta, players, marks/{round}, sticks/{round}, events/{playerId}.
server.js and package.json are leftovers from the socket.io version and are not used.
