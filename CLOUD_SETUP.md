# Switching cloud save on

One free Firebase project covers **both** games, so you do this once and Top
Shelf and Side Pot share an account. No card, no trial, nothing to cancel. The
free tier is 50,000 reads and 20,000 writes a day — two games' worth of saves
will use a few dozen.

Ten minutes, start to finish. Everything below is in the browser except the one
command in step 4.

---

## 1. Make the project

Go to **console.firebase.google.com** and sign in with a Google account.

- **Create a project**
- Name it something you'll recognise — `jt-arcade` is fine. Firebase will append
  a few random characters to make the ID unique; that's normal.
- **Google Analytics: turn it off.** It asks about a data-sharing agreement and
  it's no use to you here.
- Wait for it to finish, then **Continue**.

## 2. Register a web app

On the project overview, click the **`</>`** icon (Web).

- Nickname: `arcade`. Anything.
- **Leave "Also set up Firebase Hosting" unchecked** — GitHub Pages already
  hosts the games.
- **Register app.**

You now get a code block containing `const firebaseConfig = { ... }`.
**Copy the whole block.** That's what step 4 wants. (If you lose it: Project
settings, the gear by Project Overview → scroll to *Your apps* → *Config*.)

Those values are not secrets. They name the project; they don't grant access to
it. Step 5 is what protects the data, and the config is safe to commit.

## 3. Switch on email sign-in

Left sidebar: **Build → Authentication → Get started**.

- **Sign-in method** tab → **Email/Password** → toggle **Enable** → **Save**.
- Leave "Email link (passwordless sign-in)" off.

Skip this and sign-in fails with *"Email sign-in is not switched on for this
Firebase project yet."*

## 4. Paste the config into the game

In PowerShell, from the `hockey-game` folder, with the block from step 2 still
on your clipboard:

```powershell
Get-Clipboard | node tools/set-cloud-config.js
```

It picks the six values out of whatever you copied, ignores the rest, rebuilds
`index.html`, and tells you if something looks wrong. To see where things stand
at any point:

```powershell
node tools/set-cloud-config.js --show
```

And to go back to a fully offline build, which changes nothing in Firestore:

```powershell
node tools/set-cloud-config.js --clear
```

## 5. Create the database and lock it down

Left sidebar: **Build → Firestore Database → Create database**.

- Location: pick the one nearest you. **This cannot be changed later.**
- **Start in production mode** — it denies everything by default, which is the
  right starting point. Test mode goes wide open and expires after 30 days.
- Create.

Then the **Rules** tab. Replace what's there with exactly this, and **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /players/{uid} {            // Side Pot
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /topshelf/{uid} {           // Top Shelf
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

That reads as: you must be signed in, and you can only touch your own document.
Nobody can read anyone else's save, and the two games can't overwrite each
other. Anything not matched above stays denied.

## 6. Allow the GitHub Pages address

**This is the step everyone misses.** Firebase only accepts sign-ins from
domains on its allow-list, and `localhost` is on it but your real site isn't.

**Authentication → Settings → Authorized domains → Add domain**:

```
jtpetrotech.github.io
```

Without it, sign-in on the live site fails with *"This address is not on the
Firebase project allow-list"* — while working perfectly on your own machine,
which makes it a confusing one to debug.

## 7. Ship it

```powershell
Get-ChildItem test/*.test.js | ForEach-Object { node $_.FullName }
```

Four suites, all should end `all good`. (Not `npm test` — this folder has no
`package.json`, so npm walks up and runs the compliance platform's tests
instead, which have nothing to do with the game.)

```powershell
git add -A; git commit -m "Switch on cloud save"; git push
```

Give Pages a minute, then open the live site, hit **Account**, and create an
account. Play a game, open the site on your phone, sign in with the same email —
your coins and record should be there.

---

## Side Pot

Side Pot isn't checked out on this machine, so its config is still blank and its
sign-in does nothing yet. The project you just made covers it: put the **same**
six values into `firebase-config.js` in the `poker-pages` repo, add the same
authorized domain (already done in step 6 — it's per project, not per game), and
the rules above already include its `players` collection.

Say the word and I'll clone it and wire it up the same way.

## If something goes wrong

The game never shows raw Firebase error text — it rewrites the common ones into
plain English. What they mean:

| What you see | What to do |
|---|---|
| *Email sign-in is not switched on* | Step 3 |
| *This address is not on the allow-list* | Step 6 |
| *The Firebase settings in this build are not valid* | Re-copy the config, step 4 |
| *Your account cannot write here yet* | Step 5 — the rules didn't publish |
| *Could not reach the server* | Genuinely offline. The game keeps working; the save stays local |

Cloud save is additive by design. If Firebase is down, misconfigured, or you
never sign in, localStorage is still the real save and the game plays exactly as
it does today. Nothing here can cost you a career.
