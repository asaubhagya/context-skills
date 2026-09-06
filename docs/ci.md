# CI for context-skills

Git is the source of truth for channels; CI only projects it. Three entry
workflows plus two reusable ones live in `.github/workflows/`.

## Tag rules (contract §3)

- `vN` tags are immutable releases. Never move or delete them.
- `latest` and `beta` are moving tags written **only** by CI
  (`pnpm channels move --push` force-pushes just those two refs):
  - push to `main` → `beta` := main's content head
  - push tag `vN` → `latest` := that tag (`beta` follows when main == it)
- `channels.json` is committed on `main` and regenerated after every move as
  `chore(channels): latest vN, beta <sha> [skip ci]`. A commit cannot contain
  its own sha, so `beta` is the newest commit on main that is not such a
  `chore(channels)` commit.
- `pnpm check-channels` (in `pnpm check`) fails when tags or the committed
  file disagree with git; `--soft` only warns.

## What runs when

| Event | Workflow | Jobs |
|---|---|---|
| pull request | `ci.yml` | check-skills, check-manifest, check-channels `--soft`, check-catalogs-live `--soft`, tsc |
| push `main` / tag `v*` | `ci.yml` | same, check-catalogs-live **hard** (gate 4) |
| push `main` / tag `v*` / dispatch | `deploy-site.yml` | `channels` → `deploy` |
| dispatch (`server=context\|context-blog\|all`) or every 6 h | `register-catalog.yml` | `register` → `channels` → `deploy` |

`channels.yml` (reusable; dispatchable for repair) gates on check-skills,
check-manifest and tsc, moves the tags, commits `channels.json`, verifies
strictly. `build-deploy.yml` (reusable) checks out `main`, runs `pnpm check`
and `pnpm build-site`, deploys to Vercel — skipped with a summary note when
`VERCEL_TOKEN` is unset.

Ordering: both callers `needs`-chain `channels` before `deploy` in one
workflow, so the site is always built after the tags moved; both share the
`deploy-site` concurrency group (queued, not cancelled). `ci.yml` checks
channels softly because it races the mover on `main`; the strict gate is
`pnpm check` inside `build-deploy.yml`.

Loops: moved tags are not `v*`, the channels commit carries `[skip ci]`,
and `GITHUB_TOKEN` pushes never trigger other workflows.

`register-catalog.yml` fetches each server's
`/.well-known/mcp/server-card.json`, rewrites `mcp/<key>.json` only when the
content differs (ignoring `server.publishedAt`/`generatedAt`), runs
`pnpm build-manifest`, commits `chore(mcp): register <key> catalog <sha>`,
then deploys. A server without a card fails the run — never a silent success.

## Secrets

- This repo: `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN`. Pushes and
  tag moves use the built-in `GITHUB_TOKEN` (`contents: write`).
- MCP repos: `CONTEXT_SKILLS_TOKEN`, a fine-grained PAT with *Actions: write*
  on context-skills, for
  `gh workflow run register-catalog.yml -R asaubhagya/context-skills -f server=<key>`.

Local: `pnpm check` is strict — after the first CI run, `git fetch --tags
origin`; before that, use `pnpm check-channels --soft`.
