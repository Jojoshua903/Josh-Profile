# WIDR 64 Pro Skater

A 3D skateboarding game inspired by Tony Hawk's Pro Skater 1, starring the cast of the WIDR 64 games from [joshibrahim.nl](https://joshibrahim.nl).

Runs in the browser with plain JavaScript and [Three.js](https://threejs.org) 0.180.0, loaded from a CDN. There is no build step.

## Play

- **GitHub Pages:** push these files to a repo, then go to *Settings → Pages* and deploy from the `main` branch root. Open `https://<you>.github.io/<repo>/`.
- **Locally:** the game uses ES modules, so serve it rather than double-clicking `index.html`. For example, run `npx serve .` or `python3 -m http.server`, then open `http://localhost:8000`.

## Controls

| Key | Action |
|---|---|
| ↑ / ↓ | Push / brake |
| ← → | Steer (ground), spin (air), balance (grind) |
| Space | Hold and release to ollie |
| J | Flip trick (+ arrow for variations) |
| K | Grab, hold for more points (+ arrow for variations) |
| L | Grind (tap near a rail, ledge or coping) |
| I | Special trick when the meter is full |
| R | Tap: back to session marker · Hold: set marker |
| Esc | Pause |
| H | Hide controls overlay |

## Parks

- **Biscotto Plaza:** seaside bowl with a funbox, the Pit of Zenith, the Biscotto Rail, and stairs with a handrail.
- **The Hangar:** indoor halfpipe, a WIDR Air prop plane with rideable wings, a maintenance pit, and a catwalk rail.

Each park has 10 career goals in 2-minute runs, plus Free Skate. Progress is saved in `localStorage`. Complete 7 goals to unlock King Grumbleclaw.

## Files

| File | What it does |
|---|---|
| `index.html` | Page, menus, HUD, styles |
| `skaters.js` | Roster and the 2D portraits on the select screen |
| `rider3d.js` | Low-poly 3D skater models (including Kayo & Yara's shared board) |
| `world3d.js` | Park layouts, heightfield physics surface, scenery |
| `main.js` | Physics, tricks, combos, goals, camera, input, game loop |

Characters belong to their creator at joshibrahim.nl. This is a fan project and is not affiliated with Activision or Tony Hawk's Pro Skater.
