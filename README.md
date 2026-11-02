# joshibrahim.nl

My personal portfolio site, plus a growing arcade of browser games and experiments.
Everything is hand-written HTML, CSS and JavaScript, with no framework and no build step,
hosted on GitHub Pages.

**Live:** [joshibrahim.nl](https://joshibrahim.nl)

---

## About me

I'm Josh Ibrahim, a VWO (pre-university) student at Alfrink College in the Netherlands.
In my free time I build websites and games, and I automate things on GitHub. This repo holds
my portfolio and pretty much everything I've built along the way.

## The portfolio

A single-page site built from scratch:

- **Particle cursor:** an interactive "antigravity" ring-particle field that follows the mouse
- **GSAP animations:** staggered hero reveal, scroll-triggered sections, count-up stats
- **English / Dutch toggle:** powered by `lang.js`, with the choice saved in `localStorage`
- **Photo gallery** (`photos.html`): includes a hidden admin panel (`Shift + A`) for adding Imgur images, synced through Firebase
- **Responsive and print-friendly** layout

## Games & projects

Every game is self-contained. Open the file or folder in a browser and play.

### Standalone games

| Game | Play |
| --- | --- |
| Ashfall | [`Ashfall.html`](https://joshibrahim.nl/Ashfall.html) |
| Break Dance | [`BREAK_DANCE.html`](https://joshibrahim.nl/BREAK_DANCE.html) |
| Class Trial | [`ClassTrial.html`](https://joshibrahim.nl/ClassTrial.html) |
| Codename Conference | [`Codename_Conference.html`](https://joshibrahim.nl/Codename_Conference.html) |
| Demolition Squad | [`DemolitionSquad.html`](https://joshibrahim.nl/DemolitionSquad.html) |
| Demon Derby | [`Demon-Derby.html`](https://joshibrahim.nl/Demon-Derby.html) |
| Deniz | [`Deniz.html`](https://joshibrahim.nl/Deniz.html) |
| Dronepatch HQ | [`DronepatchHQ.html`](https://joshibrahim.nl/DronepatchHQ.html) |
| Guiseppe | [`Guiseppe.html`](https://joshibrahim.nl/Guiseppe.html) |
| Minecenary | [`Minecenary.html`](https://joshibrahim.nl/Minecenary.html) |
| OoB | [`OoB.html`](https://joshibrahim.nl/OoB.html) |
| Pluk de Rukkende Uk | [`PlukDeRukkendeUk.html`](https://joshibrahim.nl/PlukDeRukkendeUk.html) |
| Riverbend | [`Riverbend.html`](https://joshibrahim.nl/Riverbend.html) |
| Wat in de Chat | [`WatInDeChat.html`](https://joshibrahim.nl/WatInDeChat.html) |
| Wat in de Fighters | [`wat-in-de-fighters.html`](https://joshibrahim.nl/wat-in-de-fighters.html) |
| Watt Wizardry | [`WattWizardry.html`](https://joshibrahim.nl/WattWizardry.html) |
| WhatsInDeApp Quiz | [`WhatsInDeApp_Quiz.html`](https://joshibrahim.nl/WhatsInDeApp_Quiz.html) |
| WidAB | [`WidAB.html`](https://joshibrahim.nl/WidAB.html) |
| WidCombat | [`WidCombat.html`](https://joshibrahim.nl/WidCombat.html) |

### Multi-file projects

| Project | Folder |
| --- | --- |
| Forest Brawl | [`ForestBrawl/`](ForestBrawl/) |
| Otis in Orbit | [`OtisInOrbit/`](OtisInOrbit/) |
| Rhyme Rythm | [`RhymeRythm/`](RhymeRythm/) |
| WIDR Turbo | [`WIDR Turbo/`](WIDR%20Turbo/) |
| WIDRPE | [`WIDRPE/`](WIDRPE/) |
| WidR64 | [`widr64/`](widr64/) |
| WWTBAH | [`WWTBAH/`](WWTBAH/) |
| Wat in de Smash | [`Wat-in-de-Smash/`](Wat-in-de-Smash/) |
| Demolition Run | [`demolitionrun/`](demolitionrun/) |
| Lars Game | [`lars-game/`](lars-game/) |

### Tools & experiments

- `ACLmanager.html`: ACL manager tool
- `Experimental/`, `test-games/`, `bing/`: prototypes and work in progress

## Repo structure

```
index.html            # Portfolio homepage
index-original.html   # Earlier version of the homepage
photos.html           # Photo gallery + hidden admin panel
lang.js               # EN/NL translations and language toggle
characters.js         # Shared character data
favicon.svg
CNAME                 # Custom domain (joshibrahim.nl)
*.html                # Standalone games
<folders>/            # Multi-file games and experiments
```

## Running locally

There's no build step. Clone the repo and open `index.html`, or serve the folder so
relative paths resolve correctly:

```bash
git clone https://github.com/Jojoshua903/Josh-Profile.git
cd Josh-Profile
npx serve .        # or: python3 -m http.server
```

## Built with

- HTML, CSS, vanilla JavaScript
- [GSAP](https://gsap.com/) for animation
- Firebase for photo gallery sync
- GitHub Pages for hosting

## Contact

- **Site:** [joshibrahim.nl](https://joshibrahim.nl)
- **Email:** [Josh@joshibrahim.nl](mailto:Josh@joshibrahim.nl)
- **GitHub:** [@Jojoshua903](https://github.com/Jojoshua903)

---

<sub>Built with code & curiosity.</sub>
