# E6 mini-spec — blog-drafter / blog-publisher / daily-brief + Mac-mini routines (CONT-434)

**Map:** CONT-419 (Context Blog) · **Ticket:** CONT-434 (gate:artifact) · **Tenant:** Meetly (epic MTLY-169) · **Date:** 2026-09-02 · **Spec:** Context Blog spec v2, Parts 5.3, 9, 11 · **Brief:** Context brief — Meetly Blog (`43945e08-8b58-41f8-b2f5-2c0865005f01`, "Routines").

## What is built

### 1. Skills (repo `asaubhagya/context-skills`, branch `work/CONT-434-loop-skills`, commit `18dcb79`, manifest ref `v3`)

| skill | version | what it fixes |
|---|---|---|
| `blog-drafter` (new) | 1 | Nightly maker. Buffer floor (default 3) · Priority 0 = owner's change requests · hub-bound pick: slotted `backlog` + `ready` EN issue with earliest `due`, else Topic Lane (`topics_list` → its Context issue, `due` = next free cadence slot) · research ≥ 3 primary sources, ≥ 2 statistics, claims only from the persona · draft in the `article_upsert` shape (`content_lint` first, `dry_run`, fix `invalid_argument` ≤ 2 bounces then `ESCALATE:`) · `blog-article:` machine-readable line on the issue · deliverable + draft-notes attached · `blog-checker` in a separate subagent/session · on pass `article_set_status in_review` · DE full / FR reduced variants spawned as `relates` + `blockedBy` issues, same `translation_group`, localisation not translation · never publishes. Ships `templates/draft-notes.md`. |
| `blog-publisher` (new) | 1 | Every 3 h. Candidates: `channel:blog` ∧ state `done` (re-read per issue) ∧ `due ≤ now < due + 3 h` ∧ no `Published:` update · pre-flight: pass verdict + preview attached, article found (`blog-article:` line or `article_list` match) · `article_get` status drives one-step-forward `article_set_status {approved, assert_context_done}` · `publish {assert_context_done: true, context_issue_id}` · `Published: <url>` update once · cascade: variants with a pass verdict and no change request move to `done` then publish · missed window (`now ≥ due + 3 h`) → re-slot `due` to the next free cadence slot + comment, never silent late publish · idempotent (comment + `article_get.status` + platform idempotency) · refuses anything not `done`. |
| `blog-checker` | 1 → 2 | Locale variants whose description says `Cascade` move to `in_review` **without** a `reviewRequest`; approval cascades from EN (rules-blog §5). |
| `blog-agent` | 1 → 2 | `depends` now includes `blog-drafter`, `blog-checker`, `blog-publisher` so `setup {workflow: "blog"}` delivers the whole loop; step 8 and "After approval — the loop" name the skills; `routines/chat-routines.md` prompts for drafter / publisher delegate the procedure to the skills; plist template and crontab comments updated (wrapper script recommended). |
| `daily-brief` | 1 | One addition: routine health is read from `<repo>/.build/routines/<routine>.log` (last `start` / `end rc=` lines + the routine's one-line summary). Fields already covered published / awaiting / failed / next 24 h + buffer / routine health, and "post even when nothing happened". |

Contract points relied on (Blog MCP `blog-1.2.0`, verified on 2026-09-02 via `get_capabilities`): `article_upsert` (lint-gated, `invalid_argument` + `details.warnings`, `dry_run`, returns `id` / `preview_url`), `article_get` / `article_list` / `article_set_status` (one step: draft → in_review → approved → published), `publish {tenant_slug, article_id, assert_context_done, context_issue_id}` → `{url, published_at, action, publish_event_id}`, `content_lint`, `preview_render`, `check_record` / `check_list`, `topics_list` / `topics_upsert` (`status: idea | researched | drafting | published | retired`), `tenant_get` (recurrence, locales, hubs).

### 2. Host repo `~/repos/context-blog-meetly` (private, no remote, commit `e012cff`)

- `.claude/skills/` = Blog MCP `setup {workflow: "blog", harness: "claude-code", canWriteFiles: true}` output (skills ref v2: wayfinder, grill-me, setup-context, daily-brief, blog-agent + templates + routines) overlaid with `rules`, `rules-blog`, `blog-checker` v2, `blog-drafter`, `blog-publisher`, `blog-agent` v2 from the worktree. After the v3 tag + `SKILLS_REF` bump, `setup` delivers all of them.
- `routines/prompts.md` — the four prompts from `chat-routines.md`, filled for tenant `meetly` (epic, Daily Brief, Performance Report, AEO/SEO Health ids, floor 3, TZ, locale depths, MTLY-176 blocker note for the drafter).
- `routines/me.onecontext.blog.meetly.{daily-brief,blog-drafter,blog-publisher,blog-assessment}.plist` — `StartCalendarInterval` 08:00 / 02:00 / `StartInterval` 10800 / Weekday 1 09:00; `TZ=Asia/Singapore`; `PATH` with `claude`; logs under `.build/routines/`; `ProgramArguments` = `/bin/bash scripts/run-routine.sh <name>`.
- `scripts/run-routine.sh <name>` — `DISABLE` kill switch, per-routine lock, `vault get CONTEXT_BLOG_MCP_TOKEN` → env → `.mcp.json` header expansion (`${CONTEXT_BLOG_MCP_TOKEN}`; value never on disk), prompt = fenced block under `## <name>`, `claude -p … --model claude-fable-5-1 --output-format text --mcp-config .mcp.json --allowedTools mcp__context mcp__blog WebFetch WebSearch Read Glob Grep Write Edit Agent Skill Bash(curl|date|tail|ls|cat|grep:*)`, log + rc, Baymax ping on non-zero rc.
- `.mcp.json` — Blog MCP as HTTP server `blog`; the Context MCP comes from the user-level Claude config (already present on the Mac mini).
- `AGENTS.md` (+ `CLAUDE.md` → `@AGENTS.md`) — tenant invariants + the `setup` `agentsMd` block; `.gitignore` for `.build/` and `DISABLE`.

### 3. Routines installed on the Mac mini (gui/501)

Order: daily-brief (installed + fired by hand first), then drafter, publisher, assessment. Evidence in `acceptance-tests.md`. `com.growthwriter.nightly` untouched (loaded but `DISABLE`d; removal = E7).

## Decisions and deviations

| # | decision | why |
|---|---|---|
| 1 | A wrapper script per host instead of inlining `claude -p` in the plist (template still shows the inline form) | key by name at run time, lock, kill switch, one log per routine — the old growth-writer job proved the pattern |
| 2 | Bounded `--allowedTools` rather than `--dangerously-skip-permissions` | unattended run must not be able to do arbitrary shell; `curl` is enough for fact-checks; MCP servers whitelisted by prefix |
| 3 | The checker is a subagent (`Agent`) of the drafter run, not a second launchd job | "separate call with only brief + draft" satisfied; one routine to schedule; spec 3.4 step 6 |
| 4 | Variants approved by cascade move to `done` in the **publisher**, not the drafter | the only moment "EN master is done and live" is known for sure; drafter stays write-light |
| 5 | Missed window → re-slot to the next free cadence slot with a comment (rules-blog §5) rather than "publish next run" (spec 11) | the ticket's window rule is explicit; spec 11 and rules-blog disagree, the rules skill wins for the agents that run it |
| 6 | `blog-agent.depends` gained the three loop skills | it is the only way `setup {workflow: "blog"}` delivers them without a server change (Context stays thin) |
| 7 | `blog-checker` v2 cascade exception | needed so variants do not raise a second human gate (decision record row 19/28) |
| 8 | Publisher does not `complete_tasks` | the issue is already `done` by the owner's approval; the live link is the record |
| 9 | Instagram excluded from both skills | E9 (`instagram-drafter` / `instagram-publisher`) |
| 10 | No first draft in this run | MTLY-176 (Map + spec review) is still `Backlog`; every publish issue is `ready: false`; the drafter prompt says to stop in that case |

## Not done / left to others

- Tag `v3` and `SKILLS_REF` bump on Blog / Web / iOS MCPs — primary agent (release.md).
- `growth-writer` plist removal — E7 (CONT-435).
- Hub backfill of the 118 imported articles — drafter refresh nights / E7 script.
- First post draft → approve → live and 7 consecutive briefs — waits on the owner marking MTLY-176 done; the installed routines do the rest.
