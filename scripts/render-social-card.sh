#!/usr/bin/env bash
# Render only local HTML/assets in a disposable browser profile.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd -P)
render_profile=$(mktemp -d)
trap 'rm -rf "$render_profile"' EXIT
"${CHROME_BIN:-chromium}" --headless --no-sandbox --disable-gpu --disable-dev-shm-usage \
  --disable-background-networking --no-first-run --no-default-browser-check \
  --user-data-dir="$render_profile" --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --screenshot="$root/assets/social-card.png" --virtual-time-budget=1000 \
  "file://$root/scripts/social-card.html"
