#!/usr/bin/env bash
# Run ON the VPS after the first-time setup (see DEPLOYMENT.md) to ship an update.
# Assumes: repo at /var/www/fnaf, assets/ + Assets/ present, .env + .env.production set.
set -euo pipefail

APP=/var/www/fnaf
cd "$APP"

echo "==> Pulling latest"
git pull --ff-only

echo "==> Installing dependencies (incl. dev, needed for the Vite build)"
npm install

echo "==> Building the React SPA (reads VITE_* from .env.production)"
npm run build

echo "==> Restarting the API"
sudo systemctl restart fnaf

echo "==> Reloading nginx"
sudo nginx -t && sudo systemctl reload nginx

echo "==> Health check"
sleep 1
curl -fsS http://127.0.0.1:3002/health && echo " ... OK"
echo "Done."
