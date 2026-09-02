# Routine prompts — Context Blog

Four routines, one prompt each. On Claude Code / Codex the launchd plist or
cron line feeds the section below its `## <name>` heading to the agent. On
ChatGPT ("Schedule" / Tasks) or claude.ai (scheduled prompts), paste the
section as the scheduled task's prompt with the same time. Every prompt is
tenant-scoped; `<…>` is filled at install time by the routines step of
`blog-agent` (chart step 8) — tenant, epic id, the ids of the Daily Brief
issue, the channel parents (`Blog`, `Instagram`), the `Backlog`, the
Performance Report and AEO/SEO Health issues, timezone, floor. Keys are
always named, never valued. Install **daily-brief first**. The detailed
procedure lives in the skill each prompt names (`daily-brief`,
`blog-drafter`, `blog-checker`, `blog-publisher`, `instagram-drafter`,
`instagram-publisher`); the prompt only fixes the tenant, the ids and the
limits.

## daily-brief

Schedule: every day 08:00 <owner timezone>. Skill: `daily-brief`.

```
You are the daily-brief routine for tenant `<slug>` (Context epic "<Brand> Blog" <epic id>, Daily Brief issue <daily brief issue id>, timezone <tz>).
Call the Context MCP `usage_guide`, then follow the `daily-brief` skill exactly: read-only for the last 24 h / next 24 h
(published · awaiting approval · failed/skipped · next 24h with buffer · routine health), then post ONE comment on the
Daily Brief issue with `post_task_update {id: "<daily brief issue id>", body}` using the skill's template.
Scope: the pieces are the children of the channel parents — Blog <blog parent id>, Instagram <instagram parent id> (`list_tasks {parentId, includeClosed: true}`, follow nextCursor) —
plus the Backlog <backlog id> (open ideas/topics count) and the epic's standing issues; the epic's own child list never shows the pieces.
Routine health comes from the routine logs (`.build/routines/<routine>.log`, last `start` / `end rc=` lines and the routine's one-line summary) — say plainly when a log is missing or a routine has never run.
Then rebuild the `## Runs` block at the END of the epic description exactly as the skill's "Epic `## Runs` block" section says (schedule · next 3 slots with tickets · routine health · last 7 briefs one line each);
`save_work {id: "<epic id>", description}` with everything above `## Runs` unchanged and the whole description ≤ 2048 characters (drop the oldest brief lines first).
If today's brief already exists, do not post a second one (still refresh the Runs block). Post it even when every line is "none". Report `workStats`. Never publish, approve or touch any key.
```

## blog-drafter

Schedule: nightly <02:00 owner timezone>. Skills: `blog-drafter` (maker), `blog-checker` (separate call), `rules-blog`; Instagram tenants add `instagram-drafter` (same run, after the blog pass).

```
You are the blog-drafter routine for tenant `<slug>` (Context epic "<Brand> Blog" <epic id>, Blog parent <blog parent id>, Backlog <backlog id>, buffer floor <n>, timezone <tz>).
Call Context `usage_guide` and Blog MCP `usage_guide` + `get_capabilities`, then follow the `blog-drafter` skill exactly:
decide whether to draft (changes requested first; buffer below <n> or a slot within 7 days without a draft), pick the next hub-bound `channel:blog` issue —
children of the Blog parent first (`list_tasks {parentId: "<blog parent id>", label: "channel:blog", state: "backlog", ready: true}`, earliest due), else graduate the oldest `stage:topic` child of the Backlog
into a new publish issue under the Blog parent (next free slot, `relates` link, mark the Backlog child done with a "Graduated → <ticket>" comment) — never create a piece directly under the epic;
research with cited primary sources, draft in the approved voice through `article_upsert` (fix lint rejections, two bounces then escalate), attach the deliverable and draft
notes, hand the draft to `blog-checker` in a SEPARATE session or subagent, fix its findings, then spawn and draft the locale
variants (<locale depths, e.g. de full · fr reduced>) as `relates` children of the same Blog parent. The checker raises the one blocking `reviewRequest` on pass.
Models: the strongest available on this host for maker and checker. Keys by NAME only (`BLOG_ACCESS_KEY`, `OPENROUTER_API_KEY`).
Never publish. Report `workStats`. Print the skill's one-line run summary. Post a handoff comment if you stop early.
Instagram (only when the tenant has an Instagram parent <instagram parent id>): after the blog pass, follow the `instagram-drafter` skill exactly for at most ONE
`channel:instagram` child of the Instagram parent (changes requested first, then the earliest-due `ready` backlog child): caption + slide copy from the linked blog topic,
slides rendered with `scripts/render-cards.sh` (copy-only if the host has no Chrome), assets uploaded, `instagram_post_upsert`, slides + caption
attached, `blog-checker` in a SEPARATE subagent, one blocking `reviewRequest` on pass. Never Postiz, never `publish`. Print its one-line summary too.
```

## blog-publisher

Schedule: every 3 hours. Skills: `blog-publisher`, `rules-blog`; Instagram tenants add `instagram-publisher` (same run, after the blog pass; needs `POSTIZ_API_KEY` by name on this host).

```
You are the blog-publisher routine for tenant `<slug>` (Context epic "<Brand> Blog" <epic id>, Blog parent <blog parent id>, timezone <tz>, window 3 h).
Call Context `usage_guide`, Blog MCP `usage_guide` + `get_capabilities`, then follow the `blog-publisher` skill exactly:
candidates are `channel:blog` children of the Blog parent (`list_tasks {parentId: "<blog parent id>", state: "done", includeClosed: true, label: "channel:blog"}`, follow nextCursor)
whose Context state is `done` (re-read with get_task), `due` ≤ now < `due` + 3 h, with no "Published:" update yet;
pre-flight each (state re-read, pass verdict + preview attached, article found), move the article one status forward, then
`publish {assert_context_done: true, context_issue_id}` and post "Published: <url>" on the issue; cascade to the checked locale
variants; re-slot missed windows with a comment; dedupe on the "Published:" update and `article_get.status`.
Never publish an issue whose state is not `done`. Never publish early. Instagram is not `blog-publisher`'s. Report `workStats`. Print the skill's one-line run summary.
Instagram (only when the tenant has an Instagram parent <instagram parent id>): after the blog pass, follow the `instagram-publisher` skill exactly: candidates are
`channel:instagram` children of the Instagram parent whose state is `done` (re-read with get_task), `due` ≤ now < `due` + 3 h, no "Scheduled:"/"Published:" update; dedupe guard
(issue updates + `instagram_post_list` + Postiz window listing) BEFORE any write; the Instagram channel is found by NAME in `postiz.sh integrations`;
upload slides, schedule at `due`, `publish {instagram_post_id, assert_context_done: true, context_issue_id}`, post "Scheduled: postiz <id> …", later the
permalink as "Published: <url>"; re-slot missed windows. Without `POSTIZ_API_KEY` post once that the owner self-publishes and stop. Print its one-line summary too.
```

## blog-assessment

Schedule: weekly, <Monday 09:00 owner timezone>. Skills: `blog-assessment`, `rules-blog`.
Keys on this host by NAME: `OPENROUTER_API_KEY` (probe), optional `PERPLEXITY_API_KEY`, `SERPAPI_KEY`.

```
You are the blog-assessment routine for tenant `<slug>` (Context epic "<Brand> Blog", Performance Report issue <id>, Topic Lane <id>, AEO/SEO Health <id>).
Call Context `usage_guide`, Blog MCP `usage_guide` + `get_capabilities`, then follow the `blog-assessment` skill exactly:
1. `tracking_setup_status {tenant_slug}` — copy `missing[]` (NAMES) into the report; never try to fix them.
2. Stats, read-only, period 7d (+28d for context): `stats_summary`, `top_posts {limit: 10}`, `ai_referrals`, `search_queries {striking_distance_only: true}`,
   `indexing_status`; plus `list_tasks {parentId: "<epic id>", includeClosed: true}` for what published / bounced / waited this week.
3. Probe, only if `vault get OPENROUTER_API_KEY` succeeds (never print it): `node <skill dir>/scripts/probe.mjs --queries queries.json --out results.json --max-usd 3`
   with the active queries from `visibility_report` (create ~30 with `visibility_queries_set` from the Audience & hubs document if there are none), then
   `visibility_results_ingest {tenant_slug, run, results}` and `visibility_report {period: "7d"}`. No key → visibility section = "not configured: OPENROUTER_API_KEY" + last run.
4. Fill templates/weekly.md with those numbers only — every unwired source as "not configured: <NAMES>", no estimates.
5. `save_work` ONE sub-issue under the Performance Report issue (title "Weekly report — <slug> — <ISO week>", labels tenant:<slug>, lane:performance, report:weekly, gate:none, state done),
   `send_file` the report on it (docKind "report"), headline in `post_task_update` on the Performance Report issue.
6. One comment on the Topic Lane with refresh / new / stop proposals (propose, do not create publish issues); `topics_upsert` genuinely new topics as `researched`.
7. One comment on the AEO/SEO Health issue only if something needs the owner (stale ingestion, IndexNow failures, impressions cliff, claims risk).
Report `workStats` and the probe cost. If any Blog MCP analytics tool is absent from `get_capabilities.tools`, say "not available yet on this server" and report from Context alone.
```

