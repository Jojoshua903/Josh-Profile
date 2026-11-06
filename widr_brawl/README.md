# Wat in de Brawl (WidBS)

A Brawl Stars style browser game starring the characters from the WIDR 64 games on [joshibrahim.nl](https://joshibrahim.nl/widr64/).

No installs, no build step: plain HTML, CSS and JavaScript on a single canvas.

## Play

- **Locally:** download the repo and open `index.html` in your browser.
- **Online (GitHub Pages):** in your repo go to **Settings → Pages**, set *Source* to **Deploy from a branch**, pick `main` and `/ (root)`, then save. After a minute the game is live at `https://<your-username>.github.io/<repo-name>/`.

## Modes

| Mode | How to win |
|---|---|
| 💎 Gem Grab | 3v3. Hold 10 or more gems (and more than the other team) for 12 seconds. |
| 💀 Knockout | 3v3, no respawns. First team to win 2 rounds. Gas closes in after 30 s. |
| ☠️ Showdown | Solo vs 9 bots. Break boxes for power cubes. Last one standing. |

Enemy bot difficulty: Easy, Normal, Hard or Insane. Your bot teammates always play on Normal.

## Controls

| Key | Action |
|---|---|
| `W` `A` `S` `D` / arrows | Move |
| Mouse | Aim |
| Left click (hold) | Attack |
| Hold `E`, release | Aim and fire your Super |
| `Space` / right click | Quick Super |

## Brawlers

| Brawler | From | Attack | Super |
|---|---|---|---|
| ⭐ Josh | Star Josh | Burst of 3 star bolts | Homing charged star |
| ⚾ Nathan | Star Josh | Bat swing with knockback | Home Run ball that smashes walls |
| 💣 Daniel | Demolition Run | C4 lobbed over walls | Big Boom that destroys walls |
| 🥷 Reshman | Demolition Run | Fan of 3 shuriken | Slicing dash, then invisible |
| 🍅 Guiseppe | The Guiseppe Game | Splashing tomato | Ground Pound leap that stuns |
| 🍪 Otis | Otis in Orbit | Cookies that bounce off walls | Gravity Well |
| 🦀 Grumbleclaw | The Guiseppe Game | Close range claw snaps | Wall shattering shockwave |
| 📡 Milo | Otis in Orbit | Piercing laser | Heal allies, zap foes |
| 🎤 Joep | RhymeRhythm | Wide sound wave | Speaker turret |
| 🥞 Cas | RhymeRhythm | Boomerang pancake | Slowing syrup puddle |
| 🎳 Luur | RhymeRhythm | Bouncing bowling ball | Sprint, heal and fast reload |
| 🌙 Toon de Demoon | RhymeRhythm | Two curving crescents | Three orbiting moons |
| 🧪 Maat met Zinkfosfaat | RhymeRhythm | Flask that heals allies | Healing zone |

## Files

| File | What's in it |
|---|---|
| `index.html` | Page, menu and styles |
| `data.js` | Maps, modes, brawler stats and the global `RANGE` setting |
| `engine.js` | Game logic: movement, attacks, Supers, bots, modes |
| `render.js` | Drawing the arena, brawlers, effects and HUD |

Tweak balance in `data.js`: each brawler's `hp`, `spd`, `reload`, `range` and `superCost`, or `RANGE` to scale every attack's reach.

## Credits

Characters from the WIDR 64 games by Josh Ibrahim and friends. Fan game, not affiliated with Supercell or Brawl Stars.

