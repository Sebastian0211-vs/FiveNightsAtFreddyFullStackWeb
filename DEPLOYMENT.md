# Deployment — fnaf.sy-baubau.ch

Deploys to the existing Ubuntu VPS behind **nginx**, with the **local MongoDB**, the Node API kept alive by **systemd**, and the **existing Let's Encrypt cert** (no certbot re-run needed). Frontend and API are served from a single origin (`https://fnaf.sy-baubau.ch`), so the auth cookie stays first-party and there's no CORS.

Ready-made config lives in [`deploy/`](deploy/):

- `deploy/nginx-fnaf.sy-baubau.ch.conf` — nginx server block
- `deploy/fnaf.service` — systemd unit
- `deploy/deploy.sh` — one-shot update script (run on the VPS)

## How this app is served (important)

- **React SPA** (`/login`, `/menu`, `/play`, `/leaderboard`, `/register`, …) is built by Vite into `dist/` and served as static files with a `/index.html` fallback.
- **The game (`/mainroom`) is NOT bundled.** `MainRoom.html` loads its engine via classic `<script src="../engine/…">` tags, so it runs **raw from source**. nginx serves it and `/src/*.js` straight from `/var/www/fnaf`.
- **Raw game assets** (audio, images, fonts) are loaded at runtime from `/assets/…` (and a few `/Assets/…`). nginx aliases both to the on-disk folders. They are **gitignored**, so they're uploaded separately, not via git.
- Vite's hashed build output goes to `/bundle/` (set in `vite.config.js`) so it never collides with the raw `/assets/` folder.

Server layout:

```
/var/www/fnaf/
├── dist/          # built React SPA  (npm run build)
├── src/           # raw game source (served at /src, /mainroom)
├── assets/        # raw game assets, lowercase  -> /assets
├── Assets/        # raw game assets, capitalised -> /Assets   (symlink to assets if identical)
├── server/        # Express + Apollo API
├── .env           # backend secrets (NODE_ENV, MONGO_URI, JWT_SECRET, RESEND_API_KEY, ...)
└── .env.production # VITE_* build-time vars
```

---

## 1. Put the code on the VPS

DNS already resolves and the old version's files were wiped. From a clean `/var/www/fnaf`:

```bash
sudo mkdir -p /var/www/fnaf && sudo chown -R ubuntu:ubuntu /var/www/fnaf
cd /var/www/fnaf
git clone -b Deployment https://github.com/Sebastian0211-vs/FiveNightsAtFreddyFullStackWeb.git .
```

Upload the gitignored assets (they won't come via git) from your machine:

```bash
rsync -avz assets/ ubuntu@fnaf.sy-baubau.ch:/var/www/fnaf/assets/
rsync -avz Assets/ ubuntu@fnaf.sy-baubau.ch:/var/www/fnaf/Assets/
```

If `assets/` and `Assets/` are identical, replace the second with a symlink to save space:

```bash
cd /var/www/fnaf && rm -rf Assets && ln -s assets Assets
```

---

## 2. Environment files

`/var/www/fnaf/.env` (backend):

```env
NODE_ENV=production
PORT=3002
MONGO_URI=mongodb://127.0.0.1:27017/fnaf
JWT_SECRET=<openssl rand -hex 32>
CORS_ORIGIN=https://fnaf.sy-baubau.ch
FRONTEND_URL=https://fnaf.sy-baubau.ch
RESEND_API_KEY=re_...
```

`/var/www/fnaf/.env.production` (baked into the frontend at build time):

```env
VITE_API_URL=https://fnaf.sy-baubau.ch
VITE_GRAPHQL_URL=https://fnaf.sy-baubau.ch/graphql
```

```bash
chmod 600 /var/www/fnaf/.env
```

---

## 3. Build the frontend

```bash
cd /var/www/fnaf
npm install
npm run build      # outputs dist/ ; reads VITE_* from .env.production
```

> If the build fails on Linux with "cannot find module …/assets/…", it's a case mismatch (Windows is case-insensitive, Linux isn't). Fix the offending import's casing, or build on your Windows machine and `rsync` the `dist/` folder up instead.

---

## 4. systemd service for the API

```bash
sudo cp /var/www/fnaf/deploy/fnaf.service /etc/systemd/system/fnaf.service
sudo systemctl daemon-reload
sudo systemctl enable --now fnaf
sudo systemctl status fnaf            # active (running)
curl -s http://127.0.0.1:3002/health  # -> {"ok":true}
journalctl -u fnaf -f                 # live logs
```

The unit runs as `User=ubuntu` to match the file ownership. It binds :3002 — make sure the old PM2 process is gone (`pm2 save --force` after deleting it) so nothing else holds the port.

---

## 5. nginx

The new server block replaces the old one (drops the old `:3001` API listener and the stale `/menu` and `/warning` redirects, which are now React routes). It reuses the existing cert.

```bash
sudo cp /var/www/fnaf/deploy/nginx-fnaf.sy-baubau.ch.conf \
        /etc/nginx/sites-available/fnaf.sy-baubau.ch
# the sites-enabled symlink already exists from before; if not:
sudo ln -sf /etc/nginx/sites-available/fnaf.sy-baubau.ch /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

The existing `fnaf-api` site was already removed during teardown. Nothing else (`*.triceratops.ch`, AMP) is touched.

---

## 6. TLS — nothing to do

The cert `fnaf.sy-baubau.ch` already exists and auto-renews (verified via `sudo certbot certificates`). The nginx block points at it directly. Confirm renewal still works after the config change:

```bash
sudo certbot renew --dry-run
```

Then open `https://fnaf.sy-baubau.ch`, register, and play a night. The `Secure; SameSite=None` cookie is accepted because it's one HTTPS origin.

---

## 7. Updating later

```bash
cd /var/www/fnaf
bash deploy/deploy.sh     # pull + npm install + build + restart + reload + health check
```

---

## Gotchas recap

- **`VITE_*` are compile-time** — change the domain ⇒ rebuild, not just restart.
- **Cookie needs HTTPS** — `NODE_ENV=production` makes it `Secure`; never test login over plain HTTP.
- **MongoDB stays on `127.0.0.1`** — don't expose it. The `fnaf` DB (your accounts/scores) lives in `/var/lib/mongodb`, untouched by redeploys.
- **Port 3002** is internal only; nginx reaches it over localhost. Don't open it in the firewall.
- **Case-sensitivity** is the most likely build snag — see the note in §3.

---

## Reminder

Unofficial, non-commercial fan project serving copyrighted FNaF assets. Keep it non-commercial and low-profile; `/play` is behind login already. Comply with any takedown request.
