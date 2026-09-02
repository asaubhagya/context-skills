#!/bin/bash
# postiz.sh — the only way a skill talks to the Postiz public API. The key is read BY NAME
# (env POSTIZ_API_KEY, else `vault get POSTIZ_API_KEY`) and never printed, logged or echoed.
#   postiz.sh integrations                      → the connected channels (find the Instagram one by name)
#   postiz.sh posts <startISO> <endISO>         → posts in the window (dedupe guard; state, releaseURL)
#   postiz.sh upload <file.png>                 → {id, path} of the uploaded media
#   postiz.sh schedule <body.json>              → create a scheduled post (body = Postiz "posts" shape)
#   postiz.sh delete <post id>                  → delete one post (only when the issue says so)
# Base URL override for self-hosted Postiz: POSTIZ_API_BASE (default https://api.postiz.com/public/v1).
set -euo pipefail

BASE="${POSTIZ_API_BASE:-https://api.postiz.com/public/v1}"
KEY="${POSTIZ_API_KEY:-}"
if [ -z "$KEY" ] && command -v vault >/dev/null 2>&1; then KEY="$(vault get POSTIZ_API_KEY 2>/dev/null || true)"; fi
if [ -z "$KEY" ]; then echo "postiz: POSTIZ_API_KEY missing (env or vault) — cannot publish; degrade to owner self-publish" >&2; exit 3; fi

cmd="${1:?usage: postiz.sh integrations|posts|upload|schedule|delete ...}"; shift
case "$cmd" in
  integrations)
    curl -sS -f "$BASE/integrations" -H "Authorization: $KEY" ;;
  posts)
    start="${1:?start ISO}"; end="${2:?end ISO}"
    curl -sS -f -G "$BASE/posts" -H "Authorization: $KEY" --data-urlencode "startDate=$start" --data-urlencode "endDate=$end" ;;
  upload)
    file="${1:?file}"
    curl -sS -f "$BASE/upload" -H "Authorization: $KEY" -F "file=@$file" ;;
  schedule)
    body="${1:?body.json}"
    curl -sS -f "$BASE/posts" -H "Authorization: $KEY" -H 'Content-Type: application/json' --data-binary "@$body" ;;
  delete)
    id="${1:?post id}"
    curl -sS -f -X DELETE "$BASE/posts/$id" -H "Authorization: $KEY" ;;
  *) echo "postiz: unknown command $cmd" >&2; exit 2 ;;
esac
echo
