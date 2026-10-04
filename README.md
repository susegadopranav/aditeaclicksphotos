# Aditi Yk — photography website

A calm, photo-first personal site. No likes, comments or counters.

## How it works

- **Public site** (`index.html`, `css/`, `js/`, `assets/`) is plain HTML/CSS/JS hosted free on **GitHub Pages**. No build step, nothing to install.
- **Her 17 portfolio photos** are static files in `assets/images/` (WebP, three sizes each, so phones download small versions).
- **Recent Updates** live in **Supabase** (free tier): a Postgres table for the notes, public storage for the photos, and email + password login for the admin page.
- **`/admin/`** is where she signs in, picks a photo, writes a note and taps Publish. Photos are shrunk on her phone before upload (1600 px and 800 px JPEG), so the public site never downloads camera originals.
- **Security:** visitors can only *read*. Writing needs her login (enforced by database policies in `supabase/setup.sql`). The only key in the code is Supabase's public key, which is designed to be public.

## Setup (about 20 minutes, once)

### 1. Create the backend
1. Sign up at supabase.com, choose **New project**, name it (e.g. `aditi-journal`), set a database password (save it), pick a region near you, **Create**.
2. Wait for it to finish setting up.

### 2. Create the tables and security rules
Open **SQL Editor → New query**, paste the whole of `supabase/setup.sql`, press **Run**. You should see "Success".

### 3. Lock sign-ups
**Authentication → Sign In / Providers** → turn **off** "Allow new users to sign up" → Save. (Otherwise anyone could create an account.)

### 4. Create her login
**Authentication → Users → Add user → Create new user.** Enter her email and a password, tick **Auto Confirm User**, create. Give her the email and password privately.

### 5. Connect the site
**Project Settings → API Keys.** Copy the **Project URL** and the **publishable** key (older projects call it the `anon` key). Paste them into `js/config.js`:
```js
supabaseUrl: 'https://xxxx.supabase.co',
supabaseKey: 'sb_publishable_xxxx',
```
Never paste the *secret* or *service_role* key anywhere in this repo.

### 6. Put the files on GitHub
In your empty repository choose **Add file → Upload files**. Drag in the **contents** of this folder (`index.html`, `css`, `js`, `admin`, `assets`, `supabase`, `README.md`), so `index.html` sits at the top level, not inside another folder. Click **Commit changes**. (Browser uploads accept up to 100 files at a time; if it complains, upload `assets/images` as a second batch.)

### 7. Turn on GitHub Pages
**Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save.** After a minute or two the site is live at `https://USERNAME.github.io/REPO/`.

### 8. Fix the share preview
In `index.html`, replace `https://USERNAME.github.io/REPO/assets/og.jpg` with your real address (this is the picture shown when the link is shared).

### 9. Test it
Open `https://USERNAME.github.io/REPO/admin/`, sign in, publish a test photo, then delete it from "Your updates".

## Changing things later
- Name, tagline, Instagram, email: `js/config.js`. Page title and description: top of `index.html`.
- About text: `index.html`, inside `<section id="about">`.
- Photo order and alt text: `js/photos.js`.

## Free-tier limits (checked against 2026 sources, so confirm on supabase.com/pricing)
- Supabase Free: 500 MB database, about 1 GB of file storage (some sources say 500 MB), 5 GB egress a month, 2 free projects.
- **Projects pause after 7 days with no activity.** Visits to the site and her posting count as activity, but if it ever pauses, open the Supabase dashboard and press **Restore project**. Updates are kept.
- Each post is roughly 0.3–1 MB, so hundreds of posts fit comfortably.
- The homepage shows the latest 40 updates.
- GitHub Pages has soft limits of about 1 GB per site and 100 GB bandwidth a month, far above what a portfolio needs.

---

# A note for Aditi: posting an update

1. Open your journal page (the link ends in `/admin/`) on your phone. Tip: bookmark it, or use **Add to Home Screen**.
2. Sign in with the email and password you were given.
3. Tap **Choose photo** and pick a picture from your gallery.
4. Write a short note if you want one (it's optional).
5. Tap **Publish**. When it says "Published", it's already on your website.

Further down, **Your updates** lists everything you've posted. Tap **Edit note** to change the words, or **Delete** to remove an update. Always tap **Sign out** if you're using someone else's phone.
