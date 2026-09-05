# Privacy and pairing — Shared vs Private

## The boundary

- **Shared Space** — exactly one per Account, server-readable. Any
  signed-in connector (Google auth only, no iPhone needed) can read and
  write it. This is where cross-device, cross-agent tracked work lives by
  default.
- **Private Spaces** (`personal`, `work`, or a named one) and every
  **Personal domain** (Memories, Logs, People, Health, Calendar, Skills)
  are **iPhone-owned**. They require the user's iPhone to be paired to this
  Account and the current connector to hold `context:private` scope.

Every tool result carries `space: {id, name, privacy}`. This is the only
place provenance is trustworthy — read it on every result, especially
before repeating or acting on what came back. Never infer privacy from
which tool you called; a search or list call can return mixed results
across Spaces.

## `PAIRING_REQUIRED`

A write (or read) that touches a Private Space or a Personal domain,
attempted by a connector without `context:private` scope, returns:

```json
{"ok": false, "error": {"code": "PAIRING_REQUIRED", "message": "...", "retryable": false, "next_action": "..."}}
```

This is not a transient failure to retry — it means the grant genuinely
isn't there yet. The fix has two steps, both required:

1. **The user pairs their iPhone** to this Account, in the Context iOS app
   (Settings → Connect, or wherever the app currently surfaces it). Tell
   the user this in plain language; you cannot do it for them.
2. **Reconnect the connector** — the MCP session that got `PAIRING_REQUIRED`
   needs to re-establish its connection (not just retry the same call) so
   it picks up the newly granted `context:private` scope. A bare retry of
   the same tool call, without reconnecting, will get the same error again
   even after the phone is paired.

Until both steps happen, keep working in the Shared Space and tell the user
plainly what you couldn't do and why.

## What "unavailable" vs "pairing required" means

`start_context` reports `phonePairing.status`: `paired | not_paired |
unavailable`. `not_paired` is the case above — pairing is possible, just not
done yet. `unavailable` means this host/product surface doesn't support
phone pairing at all (rare) — don't tell the user to pair a phone that
can't help here; say plainly that Private-Space features aren't reachable
from this connector.

## Never

- Never claim a result is from the Shared Space without checking `space`.
- Never tell the user "just retry" for `PAIRING_REQUIRED` — reconnect is a
  distinct step from retry.
- Never store or request pairing secrets, tokens, or encryption keys
  yourself — pairing happens entirely in the Context iOS app.
