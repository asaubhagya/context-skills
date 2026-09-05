#!/bin/bash
# attach-artifact.sh — put one rendered slide on a Context issue as an Artifact WITHOUT pushing base64
# through the model. Two steps: the agent calls the Context MCP `attach_artifact {filename, size,
# sha256, contentType}` (returns an upload plan: uploadUrl + completeUrl), then runs this script, which PUTs
# the bytes and POSTs the completion (title, docKind preview, parent_id) with the host's Context Access Key
# BY NAME (env CONTEXT_ACCESS_KEY, else `vault get CONTEXT_MCP_TOKEN`); the value is never printed.
#   usage: attach-artifact.sh <file.png> <uploadUrl> <completeUrl> <parentId> <space> "<title>" [tag ...]
# Prints the artifactId on success. Files ≤ 4 MiB (one chunk) — every paper-card PNG is far below that.
set -euo pipefail
F="${1:?file}"; U="${2:?uploadUrl}"; CU="${3:?completeUrl}"; PARENT="${4:?parentId}"; SPACE="${5:?space}"; TITLE="${6:?title}"; shift 6
KEY="${CONTEXT_ACCESS_KEY:-}"
if [ -z "$KEY" ] && command -v vault >/dev/null 2>&1; then KEY="$(vault get CONTEXT_MCP_TOKEN 2>/dev/null || true)"; fi
if [ -z "$KEY" ]; then echo "attach-artifact: no Context Access Key on this host (CONTEXT_ACCESS_KEY / CONTEXT_MCP_TOKEN) — fall back to attach_artifact's inline path" >&2; exit 3; fi
SZ=$(wc -c < "$F" | tr -d ' '); SHA=$(shasum -a 256 "$F" | cut -d' ' -f1)
if [ "$SZ" -gt 4194304 ]; then echo "attach-artifact: $F is $SZ bytes > one 4 MiB chunk — not supported by this script" >&2; exit 2; fi
TAGS="$(printf '%s\n' "$@" | python3 -c 'import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')"
BODY="$(python3 -c 'import json,sys; print(json.dumps({"filename": sys.argv[1], "contentType": "image/png", "title": sys.argv[2], "space": sys.argv[3], "docKind": "preview", "parent_id": sys.argv[4], "tags": json.loads(sys.argv[5]), "caller": {"agent": "Claude Code", "model": "unknown"}}))' "$(basename "$F")" "$TITLE" "$SPACE" "$PARENT" "$TAGS")"
curl -sS -f -o /dev/null -X PUT "$U" -H "Authorization: Bearer $KEY" -H "Content-Type: application/octet-stream" \
  -H "Content-Range: bytes 0-$((SZ-1))/$SZ" -H "x-content-sha256: $SHA" --data-binary "@$F"
curl -sS -f -X POST "$CU" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" --data-binary "$BODY" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["artifact"]["artifactId"])'
