# Health File

A private health record that lives on one phone. No accounts, no server, no
monthly cost. It organises what a family already has — the papers from each
visit, the photos of each strip — and puts it on one screen to show a doctor.

---

## Putting it on your phone

You do not need to install anything on a computer, and you do not need to
write any code. The whole app is the files in this folder.

### Step 1 — Make a GitHub account

Go to github.com and sign up. It is free.

### Step 2 — Make a repository

- Click the **+** at the top right, then **New repository**.
- Name it `healthfile`.
- Choose **Public**. (Public means the *app's code* is public. Your health
  data is never in here — it stays on the phone.)
- Click **Create repository**.

### Step 3 — Upload these files

- On the new repository page, click **uploading an existing file**.
- Drag in every file from this folder, **including the `icons` folder**.
- Click **Commit changes**.

### Step 4 — Turn on the website

- Click **Settings** in the repository, then **Pages** in the left sidebar.
- Under *Branch*, pick **main** and **/ (root)**. Click **Save**.
- Wait about a minute, then reload. GitHub shows you a web address like
  `https://yourname.github.io/healthfile/`.

### Step 5 — Install it

Open that address on the phone.

- **Android (Chrome):** menu ⋮ → *Add to Home screen*.
- **iPhone (Safari):** share button → *Add to Home Screen*.

It now behaves like a normal app — its own icon, no browser bars, and it
opens without a network connection.

---

## How the data works

Everything is stored in the phone's own database (IndexedDB), in the browser
profile that installed the app. It never leaves the device. There is no
account and nothing to log into, which is exactly why there is nothing to
leak.

The cost of that: **if the phone is lost, reset, or the app's data is
cleared, the record is gone.** That is why the backup exists.

Go to *Backup and settings* → **Save a backup file**. You get a single `.json`
file holding everything, photos included. Put it in Google Drive, email it to
yourself, whatever you like. **Restore from a backup file** reads it back —
that is also how you move to a new phone.

Make a backup after every few visits. Nothing reminds you to.

---

## What it deliberately does not do

**It does not read the photos.** A photographed strip stays a photograph, and
the name stays whatever you typed. Software that guesses a drug name from a
blurry strip will eventually guess wrong, and a wrong drug name in front of a
doctor is worse than no app at all.

**It does not check interactions or give advice.** That needs a licensed drug
database and, honestly, a doctor. This app carries information accurately to
the person qualified to judge it. That is the entire job.

**It does not sync between phones.** Sync needs a server, a server needs money
and a privacy policy, and health data on a server is a serious responsibility.
The backup file covers the real need — moving to a new phone — without any of
that.

---

## Changing things

| What you want to change | File to open |
|---|---|
| Wording, screens, what is stored | `app.js` |
| Colours, spacing, type | `styles.css` (the `:root` block at the top holds every colour) |
| App name, icon colour | `manifest.webmanifest` |
| Photo quality and size | `db.js`, the `readImage` function |

After editing, upload the changed file to GitHub again. Then bump `healthfile-v1`
to `healthfile-v2` in `sw.js` — otherwise phones keep showing the cached old
version.

---

## If you take this further

The things worth building next, roughly in order of how much they matter:

1. **Export as PDF**, so a record can be printed or emailed to a doctor who
   would rather not hold your phone.
2. **More than one person** — most people managing a parent are also managing
   another parent.
3. **A reminder to back up**, shown after every fifth visit added.
4. **Search**, once someone has fifty visits in here.

A note on the fourth: do not add it before someone actually has fifty visits.
Build what the people using it run into, not what seems complete on paper.
