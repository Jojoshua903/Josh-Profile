# Putting DE RIJ online

The game needs one free shared database so every browser sees the same line, the same
runner and the same chat. About 10 minutes.

## 1. Create the database (Firebase, free plan)
1. Go to console.firebase.google.com → **Add project** (name it e.g. `de-rij`, Analytics off).
2. Left menu → **Build → Realtime Database → Create database**. Pick **Belgium (europe-west1)**, start in **locked mode**.
3. Open the **Rules** tab, paste this, and click **Publish**:

```json
{
  "rules": {
    "rooms": { "$room": { ".read": true, ".write": true } },
    "clock": { "$id": { ".read": true, ".write": true } }
  }
}
```

4. On the **Data** tab, copy the database link at the top. It looks like
   `https://de-rij-default-rtdb.europe-west1.firebasedatabase.app`

## 2. Connect the game
Open `config.js` and paste the link:

```js
window.DERIJ_DB = 'https://de-rij-default-rtdb.europe-west1.firebasedatabase.app';
```

## 3. Host it on joshibrahim.nl
Copy this whole folder into the site's repo (for example as `derij/`) and push.
The game will be at `https://joshibrahim.nl/derij/`.

- Share `https://joshibrahim.nl/derij/` for the main room.
- Add `?room=anything` for a private room, e.g. `https://joshibrahim.nl/derij/?room=klas3b`.
  The **Copy invite link** button gives you the current room's link.

## How it behaves
- Anyone who opens the link can watch live straight away and chat. **Join the line** puts them at the back.
- The person at the front gets a 6 second countdown, then 60 seconds of control.
  When time is up they go to the back and the next person takes over from the same spot.
- If the current player closes the tab or loses connection, the line moves on within about 15 seconds.
- With `DERIJ_DB` left empty, the game runs on one computer only (everyone takes turns at the same keyboard).

## Good to know
- These rules let anyone with the link write to the game's data. That's fine for a fun game,
  but don't store anything private in this database. If someone spams it, delete the `rooms` node in the Data tab.
- The free plan allows 100 people connected at once and 10 GB of traffic per month.
  A watcher uses roughly 3–4 MB per hour, so normal use stays far below the limit.
