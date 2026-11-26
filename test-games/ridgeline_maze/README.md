# Ridgeline

Files: index.html (menus, HUD, styles), world.js (scene, maze, physics, chalk, glowsticks, sound),
game.js (climbers, controls, menus, rounds), net.js (Firebase Realtime Database sync + your config),
post.js (bloom, colour grade, vignette, height mist; ?nopost or Settings > Post effects turns it off).
Lighting lives in world.js: a warm key sun, cool sky fill and rim light, light moods per zone (MOODS), and a
shadow box that follows the players.
Summit climb: summit_world.js (the mountain, holds, camps), climb.js (two-hand climbing), rope.js (rope, pitons,
belay and haul), summit_hazards.js (falling rocks, wind, lightning, cold), hazard.js (also the rising Shadow).

## Online play
1. Firebase console > Realtime Database > Rules, paste and Publish:
   { "rules": { "ridgeline": { "$room": { ".read": true, ".write": true } } } }
   (The Summit climb uses the same rules: everything lives under ridgeline/{room}.)
2. Host the folder (GitHub Pages or Firebase Hosting) and share the link.
   Dia's preview blocks Firebase, so online only works from the hosted page.

## Firebase data under ridgeline/{room}
- meta: { seed, round, startAt, phase 'lobby' | 'maze' | 'summit', pace 0-2, daily, route 'maze' | 'summit',
  resume, outcome, camp, startCamp, save }
  - route is picked on the trail board; the gondola departure starts phase 'maze' or 'summit'.
  - camp: the highest Summit camp reached this round. save: { seed, pace, camp }, the room's Summit checkpoint.
    With resume on, the next Summit departure uses the saved seed and starts at that camp.
- players/{id}: { id, name, color, look, x, y, z, yaw, st, crank, sm, t }
  - st: 0 climbing, 1 safe (sanctuary or summit), 2 collapsed / knocked out, 3 resting. crank -2 = on the rock, 98 = winding the temple gate crank.
  - sm (Summit only): "leftHoldId,rightHoldId,clipPitonKey,hanging,belaying,campId,face".
  - Players older than 30 s are ignored; onDisconnect removes the record, reconnect writes it back.
- marks/{round}, sticks/{round}, doors/{round}: chalk marks, glowsticks, opened doors (maze).
- summit/{round}/pitons/{key}: { x, y, z, face, owner, color } a piton someone placed.
- summit/{round}/holds/{holdId}: true, a crumbling hold that broke.
- summit/{round}/chalk/{holdId}: true, a slick hold that was chalked.
- summit/{round}/camps/{campId}: { by, t } first arrival at a camp (t = seconds after startAt).
- summit/{round}/gates/{faceId}: true, the temple gate was opened (twin rune ledges or the crank). Same rules.
- events/{playerId}: boosts, shoves, pings, quick chat, snowballs, and Summit rope events (belay, jolt, yank).
- rtc/{playerId}: WebRTC voice signalling.

The mountain is built from meta.seed and the rising Shadow's height is worked out from startAt plus the camp
times (and meta.startCamp when resuming), so nothing about the world or the Shadow is streamed; late joiners
read the summit/{round} nodes. Falling rocks, gusts and lightning are scheduled from the seed and the round clock too.

## Practice Wall, rewards and saves (this device only, nothing goes to Firebase)
- Practice Wall: the stone arch in the training wing, or Summit climb > Practice Wall on the main menu. It is
  buildSummit(seed, pace, { practice: true }): one 9 m face, no Shadow, no hazards, a sandbag dummy to haul.
  Online it stays local; your player record just shows you resting (st 3) in the hall.
- localStorage keys: ridgeline_summit_cp (Summit checkpoint offline), ridgeline_summit_wins (paces won, 0-2),
  ridgeline_firstsummit (first Summit done: until then the run is Gentle with hold hints),
  ridgeline_summitbrief (Summit briefing seen), plus the passport stamp 'wall'.
- Rewards: Gentle = Summit hat, Standard = frost scarf, Brutal = golden rope (look.rope = 'gold', shown to
  teammates online through the normal look string). Runs with dev menu cheats don't count.

server.js and package.json are leftovers from the socket.io version and are not used.
