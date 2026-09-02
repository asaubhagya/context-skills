# E6 acceptance tests — CONT-434 (run 2026-09-02, Mac mini, Claude Code / claude-fable-5-1)

Legend: **pass** = observed · **pending** = waits on the owner / schedule · **n/a** = out of this ticket.

## A. Skills repo (`work/CONT-434-loop-skills`, commit `18dcb79`)

| # | check | how | result |
|---|---|---|---|
| A1 | `blog-drafter` and `blog-publisher` exist as first-class skills with frontmatter matching `blog-checker` (name = dir, description, depends, license, version, attach) | `pnpm tsx scripts/check-skills.ts` | **pass** — `check-skills: 10 skills OK (blog-agent, blog-checker, blog-drafter, blog-publisher, daily-brief, grill-me, rules, rules-blog, setup-context, wayfinder)` |
| A2 | Manifest stamped `v3`, deterministic | `pnpm tsx scripts/build-manifest.ts --ref v3` then `--check` | **pass** — `manifest.json: 10 skills, 25 files, ref v3` · `manifest.json is up to date (10 skills)` |
| A3 | Versions bumped where behaviour changed | manifest | **pass** — blog-checker 2, blog-agent 2, blog-drafter 1, blog-publisher 1, daily-brief 1 (doc-only addition) |
| A4 | `blog-agent.depends` resolves the loop skills so `setup {workflow: "blog"}` delivers them | manifest `deps` of blog-agent | **pass** — `[rules-blog, rules, setup-context, wayfinder, grill-me, daily-brief, blog-drafter, blog-checker, blog-publisher]` |
| A5 | Routine templates reference the new skills (chat-routines, plist template, crontab) | read | **pass** |
| A6 | Drafter rules present: buffer floor ≥ 3 · hub-bound pick (slotted → Topic Lane / `topics_list`) · cited research · `article_upsert` with fix-and-retry ≤ 2 bounces then escalate · checker via `blog-checker` (separate call, `check_record` + `preview_render`) · EN → DE full / FR reduced as `relates` issues · issue carries deliverable + verdict + preview + models before one `reviewRequest {blocking: true}` · never publishes | read `skills/blog-drafter/SKILL.md` §1–§8, Never | **pass** |
| A7 | Publisher rules present: every 3 h · `done` ∧ `due ≤ now < due + 3 h` ∧ no live link → `publish {assert_context_done: true, context_issue_id}` → live-link comment · cascade to checked variants · idempotent (Published: comment / `article_get.status` / platform) · refuses anything not `done` | read `skills/blog-publisher/SKILL.md` §1–§5, Never | **pass** |
| A8 | Daily brief has every field the loop needs (published / awaiting / failed / tomorrow / buffer / routine health, posts even when nothing happened) | read `skills/daily-brief/SKILL.md` | **pass** — only addition: where routine logs live |
| A9 | Benchmark (rules §4) | fixture prompts | **pending** — the first real drafter night is the fixture (see D); a scripted benchmark is listed for the primary agent in the handoff |
| A10 | Not tagged / not pushed | `git log --oneline -1`, no `git push` | **pass** — `18dcb79`, local only |

## B. Host repo `~/repos/context-blog-meetly` (commit `e012cff`)

| # | check | how | result |
|---|---|---|---|
| B1 | `git init`, private, no remote | `git remote -v` empty | **pass** |
| B2 | `.claude/skills/` = Blog MCP `setup {workflow: "blog", harness: "claude-code", canWriteFiles: true}` files (15) + rules, rules-blog, blog-checker v2, blog-drafter, blog-publisher, blog-agent v2 copied from the worktree | file list | **pass** — 25 skill files |
| B3 | Four plists valid, labels `me.onecontext.blog.meetly.{daily-brief,blog-drafter,blog-publisher,blog-assessment}`, `TZ=Asia/Singapore`, PATH incl. `claude`, logs under `.build/routines/` | `plutil -lint routines/*.plist` | **pass** — 4 × OK |
| B4 | `scripts/run-routine.sh <name>` extracts the prompt section and runs `claude -p --model claude-fable-5-1` | awk extraction test + real run (C2) | **pass** |
| B5 | No secret value in any file | `grep -r` for the token prefix; `.mcp.json` uses `${CONTEXT_BLOG_MCP_TOKEN}` | **pass** — value only in the process environment at run time |
| B6 | `.gitignore` covers `.build/` and `DISABLE` | read | **pass** |

## C. Routines on the Mac mini

| # | check | how | result |
|---|---|---|---|
| C1 | daily-brief installed FIRST | `launchctl bootstrap gui/501 …daily-brief.plist` → `launchctl list` | **pass** — `-  0  me.onecontext.blog.meetly.daily-brief` (22:33 SGT) |
| C2 | daily-brief fires by hand and a brief lands on the Daily Brief issue `3b4951fc-27a3-4d16-908d-f6d5584d891b` | `scripts/run-routine.sh daily-brief`; `get_task MTLY-170` | **pass** — log `===== daily-brief start 2026-09-02 22:35:23 +08 … end 22:36:53 rc=0`; comment "Daily brief — 2026-09-02 (Asia/Singapore)" at `1788359805130` (2026-09-02T14:36:45Z) with `workStats` v2 (tools: usage_guide, list_tasks, get_task, tenant_get, article_list ×5, post_task_update); all lines "none" as expected; dedupe rule honoured (no prior brief found) |
| C3 | Blog MCP reachable headless through `.mcp.json` env expansion | the brief called `tenant_get` / `article_list` on server `blog` | **pass** |
| C4 | drafter, publisher, assessment installed after C2 | `install-routine.sh` × 3 → `launchctl print` | **pass** — all `state = not running`, exit 0; publisher shows `run interval = 10800 seconds` |
| C5 | `launchctl list \| grep me.onecontext.blog` shows all four | | **pass** — daily-brief, blog-drafter, blog-publisher, blog-assessment |
| C6 | Old loop untouched | `launchctl list \| grep growthwriter`; `~/repos/growth-writer/DISABLE` | **pass** — `com.growthwriter.nightly` still loaded, DISABLE present, plist not removed (E7) |
| C7 | Install recorded on the epic MTLY-169 | `post_task_update` | **pass** — comment 2026-09-02 22:4x SGT |
| C8 | Next fires: daily-brief 2026-09-03 08:00 · drafter 2026-09-03 02:00 · publisher ≈ 2026-09-03 01:40 (+3 h from bootstrap) · assessment 2026-09-07 09:00 (SGT) | schedule | **pending** — observe in `.build/routines/*.log` and MTLY-170 |

## D. First cycle

| # | check | how | result |
|---|---|---|---|
| D1 | MTLY-176 (Map + spec review) is Done → run the drafter for MTLY-177 | `get_task MTLY-176` at 22:41 SGT | **pending** — state `Backlog`, `reviewRequest: null`; every publish issue `ready: false` (blockedBy MTLY-176). No draft made, per the ticket. The installed drafter picks MTLY-177 up on the first 02:00 run after the owner marks MTLY-176 done (or run `scripts/run-routine.sh blog-drafter` by hand). |
| D2 | One EN post + DE/FR variants live through the loop | publisher | **pending** — after D1 and the owner's artifact-gate approval |
| D3 | 7 consecutive daily briefs | MTLY-170 comments 2026-09-03 … 09-09 | **pending** — 1 of 7 (2026-09-02, by hand) |

## E. Rules honoured

Never touched `~/repos/meetly` / `~/repos/get-meetly-ai` · nothing pushed · no secret printed or stored · no gate marked done · Context stays thin (all loops on the Mac mini) · keys by name only.
