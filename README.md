# Chad Ranking

A friends ranking site in one file (`index.html`). Everyone ranks everyone with up/down buttons, and the site averages all rankings into a general list. Top 3 get gold, silver and bronze.

## Put it on GitHub

1. Create a new repository on GitHub (public is simplest).
2. Upload `index.html` and this README to it.
3. Go to **Settings > Pages**, set **Source** to "Deploy from a branch", pick `main` and `/ (root)`, and save.
4. After a minute your site is live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

## Make votes shared between you and your friend

GitHub Pages only hosts static files, so votes need a small free database. Without one, the site still works but each browser only sees its own data.

1. Go to https://console.firebase.google.com and create a project (you can turn Analytics off).
2. Open **Build > Realtime Database**, click **Create database**, and pick any region.
3. Open the **Rules** tab and paste:
   ```json
   { "rules": { ".read": true, ".write": true } }
   ```
   Click **Publish**.
4. Copy the database URL from the **Data** tab (it looks like `https://your-project-default-rtdb.firebaseio.com`).
5. In `index.html`, find `CONFIG` near the top of the script and paste it:
   ```js
   FIREBASE_URL: "https://your-project-default-rtdb.firebaseio.com",
   OWNER_PASSCODE: "pick-something",
   ```
6. Commit the change. Both of you now see the same rankings within about 5 seconds.

## How to use it

- **You (owner):** click **Owner**, enter the passcode, then add people with a name, subtitle and optional photo link. You can also retire people to the Hall of Fame, delete them, write a headline note, and publish the weekly update.
- **Your friend:** opens the link, types their name, orders everyone with the arrows, and hits **Save my ranking**. They can come back and change it any time. **No vote** leaves out someone they don't know.
- **Weekly update:** the risers, drops and arrows compare against the last time you pressed **Publish update**. The countdown runs to Monday 00:00 UTC each week.
- **Backup:** Owner tools has Export and Import for a JSON copy of everything.

## How the average works

Each person's ranking is stretched to the full list size before averaging, so someone who skipped a few people doesn't unfairly push the others up. Ties go to whoever has more votes.

## Good to know

- The owner passcode sits in the page source and the database rules above are open, so this is built for trusting friends, not strangers. Anyone who finds the link and the database URL could edit data.
- Photo links must be direct `https://` image URLs. Without one, people get a colored initials avatar.
