# E9 acceptance tests — CONT-437 (run 2026-09-02/03, Mac mini, Claude Code / claude-fable-5-1)

Legend: **pass** = observed · **pending** = waits on the owner / schedule / server · **n/a** = out of this ticket.

## A. Skills repo (`work/CONT-437-instagram`)

| # | check | how | result |
|---|---|---|---|
| A1 | `instagram-drafter` and `instagram-publisher` are first-class skills (name = dir, description, depends, license, version, attach) | `pnpm tsx scripts/check-skills.ts` | **pass** — `check-skills: 12 skills OK (blog-agent, blog-checker, blog-drafter, blog-publisher, daily-brief, grill-me, instagram-drafter, instagram-publisher, rules, rules-blog, setup-context, wayfinder)` |
| A2 | Manifest stamped `v3`, deterministic | `pnpm tsx scripts/build-manifest.ts --ref v3` then `--check` | **pass** — `manifest.json: 12 skills, 32 files, ref v3` · `manifest.json is up to date (12 skills)` |
| A3 | Versions | manifest | **pass** — instagram-drafter 1, instagram-publisher 1, blog-agent 3 |
| A4 | `blog-agent.depends` resolves both Instagram skills so `setup {workflow: "blog"}` delivers them | manifest `deps` | **pass** — `[…, blog-publisher, instagram-drafter, instagram-publisher]` |
| A5 | Drafter rules present: one carousel per run · ready issues only · source = linked blog topic · ≤ 10 slides · "Pro subscription" / "Cloud bots" / fictional-sample rules · caption ≤ 2200, 3–5 hashtags · render → upload → `instagram_post_upsert` → `instagram-post:` line → deliverable + previews → checker separate call → one `reviewRequest` · copy-only degradation · never Postiz / publish | read `skills/instagram-drafter/SKILL.md` §1–§8, Never | **pass** |
| A6 | Publisher rules present: `done` re-read ∧ window ∧ no live link · channel by name · three-way dedupe guard before any write · upload → schedule at `due` → `publish {instagram_post_id, assert_context_done, context_issue_id}` → `Scheduled:` / `Published:` · missed-window re-slot · idempotent · refuses non-`done` · degrades without key | read `skills/instagram-publisher/SKILL.md` §1–§7, Never | **pass** |
| A7 | No key value anywhere in the tree | `grep -rn "pos_\|Bearer " skills/instagram-*` → only the header names inside the scripts | **pass** |
| A8 | Template matches the design tokens (paper `#f5f5f3`, ink `#151515`, Space Grotesk 500 / −0.045em / 1.04, IBM Plex Sans, hairline `rgba(21,21,21,.18)`, 5-bar mark 20/38/54 px, footer "Meetly … getmeetly.ai") | read `templates/paper-cards.html` vs design tokens json + `meetly-paper-cards` | **pass** |
| A9 | Benchmark (rules §4) | fixture prompts | **pending** — the first real drafter night with MTLY-191 is the fixture; the MTLY-190 run below is the manual walk-through |
| A10 | Not pushed | `git log --oneline -3`, no `git push` | **pass** — `a38bbb2` + the docs commit, local only |

## B. Render pipeline (`scripts/render-cards.sh`)

| # | check | how | result |
|---|---|---|---|
| B1 | 8 slides render to 1080×1350 PNG, one line each, exit 0 | `render-cards.sh .build/instagram/MTLY-190/src .build/instagram/MTLY-190` | **pass** — `ok 01-hook.png 1080x1350 76443 bytes … ok 08-table.png 1080x1350 91460 bytes`, `rc=0` |
| B2 | Every PNG inspected: nothing clipped, `em` contrast, footer hairline, table fits, "Pro subscription" never bare "Pro", "Cloud bots" column, digest labelled fictional | Read of all 8 PNGs | **pass** (slide 4's sub runs four lines but sits inside the content block) |
| B3 | Exit 3 without Chrome (copy-only path) | `CHROME=/nonexistent render-cards.sh …` | **pass** — `render-cards: no Chrome/Chromium found (set CHROME=<path>) — degrade to copy-only`, rc 3 |
| B4 | > 10 slides refused | script guard (`${#files[@]} -gt 10`) | **pass** (read) |
| B5 | Failure modes found and fixed during the run | bash -x trace + probes a…i | blank 7201-byte PNG = the generator split the template at the first `<body>` (inside the comment) → fixed (`rfind`); Chrome hangs with stdout to `/dev/null` and after writing the file → log file + poll for "bytes written to file" + kill; fresh profile needs `--no-sandbox` |

## C. Blog MCP (`blog-1.2.0`, tenant `meetly`)

| # | check | how | result |
|---|---|---|---|
| C1 | `get_capabilities` lists `instagram_post_upsert`, `instagram_post_list`, `asset_upload`, `asset_complete`, `publish` | scratchpad `mcp.sh get_capabilities` | **pass** — all five in `tools[]`; `features.assetUploads: true` |
| C2 | 8 assets uploaded and ready | `upload_assets.py` (asset_upload → signed PUT → asset_complete) | **pass** — 8 × `PUT 200 ready`; ids `9f2ea9f8…`, `2429eef1…`, `826d58e2…`, `f3d10ddf…`, `839f1a30…`, `1f09f9f0…`, `11a791cd…`, `54f460aa…` |
| C3 | Public URL resolves | `curl -I <public_url of 01-hook>` | **pass** — `HEAD 200 image/png` |
| C4 | `instagram_post_upsert` with `context_issue_id` = MTLY-190 | same script | **pass** — `{"id": "7a21e0c5-b70d-47e4-bb84-d4a7e2d41bec", "status": "draft", "publish_at": "2026-09-07T01:00:00.000Z", "context_issue_id": "5d744212-…", "slides": [8 ids in order]}` |
| C5 | `publish` for an Instagram post | not called (issue not `done`; nothing may post) | **pending** — and the contract has no `instagram_post_set_status`, so the row cannot reach `approved` today; see mini-spec decision 6 |

## D. Context (issue MTLY-190 `5d744212-091b-4b4b-b795-2690a5a19574`)

| # | check | how | result |
|---|---|---|---|
| D1 | Deliverable (caption + slide copy + asset ids + post id) attached | `send_file` | **pass** — document `c91901d2-df01-4543-b623-5f483b5795bf` (`deliverable`); a first copy with guessed asset URLs (`a6fcda35…`) was deleted |
| D2 | Slide PNGs attached without base64 through the model | `create_artifact_upload` × 8 + `attach-artifact.sh` protocol (PUT chunk + POST completion with the Context Access Key by name) | **pass** — documents `fbd76603…` (01), `927276f7…` (02), `6a91ecb4…` (03), `494c639c…` (04), `67ed83df…` (05), `8c486819…` (06), `9c90de74…` (07), `f51d9a55…` (08); `get_task` shows `attachedDocumentIds` growing |
| D3 | `instagram-post:` machine-readable line + models on the issue | `post_task_update` | **pass** — accepted, `freshness: manifest+pending` |
| D4 | No `reviewRequest`, no state change | `get_task` | **pass** — state Backlog, `reviewRequest: null` (the primary agent raises the gate) |
| D5 | Issue unblocked | `get_task` | observed — MTLY-176 is now **Done**, MTLY-190 `ready: true` |

## E. Postiz (read-only, nothing scheduled)

| # | check | how | result |
|---|---|---|---|
| E1 | `POSTIZ_API_KEY` exists in the vault by name | `vault list \| grep -i postiz` | **pass** — `POSTIZ_API_KEY` (project growth-lab) |
| E2 | `postiz.sh integrations` reaches the API with the key by name and the Instagram channel is findable by name | script, output reduced to `identifier · name` | **pass** — `instagram · Meetly \| Private AI Meeting Recorder` (plus tiktok, x, facebook, youtube; none disabled). Field is `identifier`, not `platform` — skill and prompt corrected |
| E3 | Dedupe-guard listing works | `postiz.sh posts 2026-09-06T00:00:00Z 2026-09-08T00:00:00Z` | **pass** — `{"posts": []}` |
| E4 | `upload` / `schedule` / `delete` | not called | **pending** — first live run after the owner marks MTLY-190 `done` and the Mon 2026-09-07 09:00 SGT slot arrives |

## F. Host repo `~/repos/context-blog-meetly`

| # | check | how | result |
|---|---|---|---|
| F1 | Skills overlay equals the worktree | `diff -rq` on the three skill dirs | **pass** — `host-copy-in-sync` |
| F2 | Prompts carry the Instagram paragraphs; runner allow-list extended; `bash -n` clean | read + `bash -n scripts/run-routine.sh` | **pass** — `syntax-ok` |
| F3 | Routines unchanged (same four plists) — Instagram rides the drafter and publisher | `launchctl list \| grep me.onecontext.blog` | **pass** — unchanged from E6 (not re-installed; prompts are read at run time) |
| F4 | A full routine run through `run-routine.sh blog-drafter` | not run tonight | **pending** — the 02:00 SGT drafter fires on schedule; MTLY-190 already carries a deliverable, so it will pick MTLY-191 |
