#!/bin/bash
# render-cards.sh — paper-cards HTML slides → PNG, one per file, with headless Chrome.
#   usage: render-cards.sh <slides-dir> <out-dir> [WxH]      (default 1080x1350; story 1080x1920)
# Renders every <slides-dir>/*.html to <out-dir>/<name>.png in name order, verifies each PNG's
# dimensions from its IHDR header, and prints one line per slide. Deterministic, no key, no network
# beyond the Google Fonts import inside the slide (system fallback fonts if offline).
# Exit 3 = no Chrome found: the drafter degrades to copy-only (caption + slide text on the issue).
set -uo pipefail

IN="${1:?usage: render-cards.sh <slides-dir> <out-dir> [WxH]}"
OUT="${2:?usage: render-cards.sh <slides-dir> <out-dir> [WxH]}"
SIZE="${3:-1080x1350}"
W="${SIZE%x*}"; H="${SIZE#*x}"

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [ ! -x "$CHROME" ]; then
  CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
fi
if [ -z "$CHROME" ] || [ ! -x "$CHROME" ]; then
  echo "render-cards: no Chrome/Chromium found (set CHROME=<path>) — degrade to copy-only" >&2
  exit 3
fi

shopt -s nullglob
files=("$IN"/*.html)
if [ ${#files[@]} -eq 0 ]; then echo "render-cards: no *.html in $IN" >&2; exit 2; fi
if [ ${#files[@]} -gt 10 ]; then echo "render-cards: ${#files[@]} slides > 10 (Instagram carousel limit)" >&2; exit 2; fi
mkdir -p "$OUT"
# Own throwaway profile (never the user's): --no-sandbox is required with it on macOS, else headless hangs.
PROFILE="$(mktemp -d "${TMPDIR:-/tmp}/render-cards.XXXXXX")"
trap 'rm -rf "$PROFILE" 2>/dev/null || true' EXIT

rc=0
for f in "${files[@]}"; do
  name="$(basename "$f" .html)"
  png="$OUT/$name.png"
  log="$PROFILE/$name.log"; : > "$log"
  # Background + poll: on macOS headless Chrome 15x sometimes never exits after writing the file
  # (and always hangs when its output goes to /dev/null), so wait for its own "bytes written" line.
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --user-data-dir="$PROFILE" --no-first-run --no-sandbox \
    --timeout=12000 --window-size="$W,$H" --screenshot="$png" "file://$(cd "$(dirname "$f")" && pwd)/$(basename "$f")" \
    >"$log" 2>&1 &
  cpid=$!
  for _ in $(seq 1 120); do
    grep -q "bytes written to file" "$log" 2>/dev/null && break
    kill -0 "$cpid" 2>/dev/null || break
    sleep 0.25
  done
  kill "$cpid" 2>/dev/null; sleep 1; kill -9 "$cpid" 2>/dev/null; wait "$cpid" 2>/dev/null
  if [ ! -s "$png" ]; then echo "FAIL $name: no PNG written ($(tail -n 1 "$log" 2>/dev/null))" >&2; rc=1; continue; fi
  # IHDR: bytes 16..23 = width, height (big-endian)
  dims="$(python3 -c 'import struct,sys; b=open(sys.argv[1],"rb").read(24); w,h=struct.unpack(">II", b[16:24]); print(f"{w}x{h}")' "$png")"
  if [ "$dims" != "$SIZE" ]; then echo "FAIL $name: $dims (want $SIZE)" >&2; rc=1; continue; fi
  echo "ok   $name.png $dims $(wc -c < "$png" | tr -d ' ') bytes"
done
exit $rc
