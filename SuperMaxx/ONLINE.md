# SuperMaxx online (beta)

Online play has two modes: 3v3 **Hill Rush** for up to six friends, and a 1v1 **Duel** (first to 3
rounds, a round ends on the first knockout). Someone hosts a room, picks the mode, shares the
5-letter code, and everyone else joins. Empty slots are filled with bots run by the host.

It runs on Firebase (free Spark plan is plenty to start) and is served from GitHub Pages.

## 1. Firebase project

1. Go to https://console.firebase.google.com and create a project (Analytics not needed).
2. **Add app → Web**. Give it a name, skip Hosting. Copy the `firebaseConfig` object it shows.
3. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
4. **Build → Realtime Database → Create database.** Pick a region near your players and start in
   *locked mode*. Then open the **Rules** tab, paste the contents of `database.rules.json`, and
   **Publish**.
5. Back in **Project settings → Your apps**, check the config now includes `databaseURL`
   (it appears once the database exists).

## 2. Plug in the config

Open `firebase-config.js` and replace `null` with your config object:

```js
export const FIREBASE_CONFIG = {
  apiKey: '…',
  authDomain: 'your-project.firebaseapp.com',
  databaseURL: 'https://your-project-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'your-project',
  appId: '…',
};
```

These values are not secrets: every web game ships them. Access is controlled by the rules.

## 3. Put it on GitHub Pages

1. Create a GitHub repository (e.g. `supermaxx`) and upload every file in this folder to the
   root of the repo (`index.html` must be at the top level). Either drag the files into
   GitHub's **Add file → Upload files** page, or from a terminal:
   ```sh
   git init && git add . && git commit -m "SuperMaxx"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/supermaxx.git
   git push -u origin main
   ```
2. In the repo: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root.**
3. After a minute the game is live at `https://YOUR-NAME.github.io/supermaxx/`.
4. In Firebase: **Authentication → Settings → Authorized domains → Add domain** and add
   `YOUR-NAME.github.io`.

Open that URL, pick **Online**, and create a room. Send the code to a friend.

> The in-browser preview you've been playing in blocks outside connections, so online play
> only works on the hosted copy. Everything else works in both.

## How it works

```
rooms/{CODE}/meta                  host, lobby/playing, stage, match number, roster
rooms/{CODE}/players/{uid}         name, hero, skin, team (removed automatically on disconnect)
rooms/{CODE}/match/{n}/heroes/{k}  15×/s snapshot from whoever owns that hero
rooms/{CODE}/match/{n}/ev/{push}   batched shots, casts, hits and kills
rooms/{CODE}/match/{n}/hill        hill score and position (host)
```

- Each player simulates **their own hero**; the **host** also simulates the bots and the hill.
- Other heroes are smoothed toward their latest snapshot.
- Shots and abilities are sent as events and replayed on every screen, so tracers, rockets,
  zones, pulls, stuns and heals look and land the same everywhere.
- **Damage counts on the shooter's machine** (it's what they saw), then gets reported to the
  target's owner, who applies it and announces the kill.

## Known limits of this first version

- Hill Rush and Duel are online. Lane Breaker and Survivor are next (they need minion/tower/storm sync).
- No host migration: if the host leaves, the room closes.
- Some movement abilities (Avalanche's bobsled and slam) don't push other players yet.
- No anti-cheat: shooter-authoritative damage trusts clients. Fine for friends, not for public matchmaking.
- The starter rules let any signed-in player write to any room. Tighten them before going public.

## Accounts (cross-device progress)

Players can log in with an email and password from the 👤 button on the main menu. Their progress
(settings, unlocks, pass, mastery, contracts, slots) is saved to `users/{uid}/save` and synced to any
device they log in on. Two one-time console steps:

1. **Authentication → Sign-in method → Email/Password → Enable** (keep Anonymous on too, for guests).
2. **Realtime Database → Rules**: paste the new `database.rules.json` (it adds the `users` section) and press **Publish**.

Clips stay on the device that recorded them.

## Friends, profile cards and invites

Signed-in players get a 6-character friend code (`codes/{CODE}`), a public profile at `profiles/{uid}`
(name, player card, online status, current room), a private friend list at `users/{uid}/friends`, and
inboxes for friend requests (`requests/{uid}`) and room invites (`invites/{uid}`). The updated
`database.rules.json` covers all of these: paste it into Realtime Database → Rules and press **Publish**.
