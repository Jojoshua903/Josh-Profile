# WIDR 64 · Trick or Treat Night

A chaotic 3D trick-or-treating simulator starring the WIDR 64 characters.
Plain HTML, CSS and JavaScript, no build step. Three.js is loaded as an ES module.

## Play
Open `index.html` through a web server (ES modules don't load from `file://`), or host it on GitHub Pages.

## Controls
WASD / arrow keys or tap to walk · E knock · Q ability · 1-4 items · M sound · scroll to zoom

## Files
| File | What it does |
| --- | --- |
| `index.html` | Page layout and script order |
| `style.css` | All styling |
| `data.js` | Characters, residents, quiz questions, candy, items, achievements |
| `draw.js` | 2D character portraits (menus, pop-ups, fallback map) |
| `games.js` | Pop-up system and the 15 mini-games |
| `events.js` | Door events, residents, friend encounters, night events |
| `engine.js` | Game state, candy, fright, abilities, pests, map |
| `chaos.js` | Living houses, mimics, bats, rolling pumpkins, the chaos director |
| `main.js` | Game loop, input, HUD, title and results screens, 2D fallback renderer |
| `chars3d.js` | 3D character models and sprites |
| `world3d.js` | 3D street, houses, lights |
| `play3d.js` | 3D per-frame rendering, click picking, title preview |
