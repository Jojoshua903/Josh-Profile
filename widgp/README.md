# WidGP: What in the Gartic Phone

A private drawing telephone game for a small group. Write a prompt, the next person draws it, the next describes the drawing, and so on. Nobody needs to be online at the same time: the whole sketchbook lives inside a link that each player sends to the next.

## Put it online with GitHub Pages

1. Create a new repository on GitHub (it can be called `widgp`).
2. Upload `index.html` (and this README) to the repository: **Add file → Upload files → Commit changes**.
3. Go to **Settings → Pages**. Under **Build and deployment**, set **Source** to *Deploy from a branch*, pick `main` and `/ (root)`, then **Save**.
4. After a minute or two your game is live at `https://YOUR-USERNAME.github.io/widgp/`.

Share that address with your group. Everyone plays from the same address, and the turn links work for everyone.

## Notes

- Everything is in one file (`index.html`), with no libraries or server needed.
- Each player's sketchbooks are saved in their own browser.
- The repository and its Pages site are public, but nobody can see your games unless you send them a link.
