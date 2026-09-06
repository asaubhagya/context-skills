---
title: Context Sites — Agent guide
description: The standing instruction for any agent publishing through Context Sites — connect both servers, call setup, draft lint-gated content, get it checked and approved in Context, publish, measure.
product: context-sites
updated: 2026-09-06
---

# Context Sites — Agent guide

## 1. What Context Sites is

Context Sites (the Context Blog MCP) is the publishing extension of Context: it drafts and publishes blog posts, site pages and Instagram carousels for a tenant, renders previews, lints content, records checker verdicts, and reports traffic and AI visibility. It never tracks work or approves anything — every piece carries a `context_issue_id`, and the approval that unlocks `publish` lives in Context. Everything in the [Context Agent guide](https://agents.onecontext.me/) applies unchanged when this workflow writes to Context.

## 2. Start here

**Connect both servers** — Context first (`https://mcp.onecontext.me/mcp`, see its Guide), then Sites at `https://sites.onecontext.me/api/mcp` (contract `blog-1.3.0`; `blog.onecontext.me/api/mcp` answers `410 moved`).

- Claude Code: `claude mcp add --transport http context-blog https://sites.onecontext.me/api/mcp`
- claude.ai: Settings → Connectors → Add custom connector → name Context Sites, URL above
- ChatGPT: Settings → Connectors → Add → URL above
- Cursor / any MCP client: add an HTTP MCP server with the URL above
- Auth: Google sign-in on interactive hosts. Headless routines use a bearer by **name** (`CONTEXT_BLOG_MCP_TOKEN` in the host's secret store, expanded into the `Authorization` header by the MCP config). Tenant credentials (Postiz, analytics, search console) are named, never pasted.

**Call `setup` first, every session** — `setup {workflow: "blog" | "site" | "instagram", caller, host, skills_held, guide_held_sha256}`. It resolves the workflow skill (`blog-agent` / `site-builder` / `instagram-drafter`) plus `rules-blog`, the core `context` skill and their dependencies, and returns `guide` and `skills[]` with `status: current | update | install`, `drift`, `nextAction`, and `mode: "files"` (paths to write per host) or `mode: "chat"` (skill links + inline text). Idempotent. Do the `nextStep` / `nextAction`.

**Install what it returns, then read this Guide.** `usage_guide` and `get_capabilities` describe the server and the tools this contract serves; if a tool a skill names is absent, say "not available yet on this server" and attach the payload you would have sent to the Context Issue instead. `list_skill_catalog` / `get_skill {key}` read the same catalog as `https://agents.onecontext.me/skills`.

## 3. The loop

1. **Set up** — `setup {workflow}`; for a new tenant `tenant_create`, `brand_upsert`, `audiences_upsert`, `hubs_upsert`, `topics_upsert`. The workflow skill charts the tenant Epic in Context: one parent Issue per channel, every piece a child, one combined map + spec `request_review`.
2. **Draft** — claim the publish Issue in Context (`update_issues … in_progress`). Research with cited sources. `content_lint` first (read-only; same body as the upsert), fix every finding, then `article_upsert {tenant_slug, slug, locale, translation_group, title, description, sections, seo, hub_slug, context_issue_id}` — it lints again and refuses on failure. Two bounces, then escalate. Pages: `page_upsert`; carousels: `asset_upload` → PUT → `asset_complete`, then `instagram_post_upsert`.
3. **Attach for review** — on the Context Issue: the markdown deliverable (what the owner comments on) and ONE final preview from `preview_render {tenant_slug, kind, title, description, sections, …}` attached as `Preview — <title>`. Instagram: one Instagram-style viewer over the slide asset URLs, never one Artifact per slide.
4. **Check** — a separate session runs `blog-checker`: `content_lint`, `preview_render`, judgement and fact checks, then `check_record {tenant_slug, subject_kind: "article" | "page" | "instagram", subject_ref: <issue id>, round, verdict, findings, models}`. On `pass` it raises the Context `request_review`; on `bounce` the maker fixes and re-upserts with the same `id`; `escalate` goes to the owner.
5. **Approve** — the owner decides in Context; wait on `get_changes`. Locale variants are child Issues of the EN master and inherit its approval once their own verdict is attached.
6. **Publish** — only for an Issue whose Context state is `done`: `article_set_status {tenant_slug, id, status}` forward as needed, then `publish {tenant_slug, assert_context_done: true, context_issue_id, article_id | page_id | instagram_post_id}`. Publish at the slot (`due`), never early; a missed window is re-slotted, never silently published late. Post the live URL on the Issue, then `complete_issues` with `work_stats`.
7. **Measure** — `stats_summary`, `top_posts`, `post_stats`, `ai_referrals`, `search_queries`, `indexing_status`, `tracking_setup_status`; the weekly `blog-assessment` probes AI visibility (`visibility_queries_set` → probe → `visibility_results_ingest` → `visibility_report`) and posts one report Issue.

## 4. Rules that bite

- **Never publish without a Context approval.** `publish` requires `assert_context_done: true` and refuses when the Issue is not `done`. Never mark that Issue done yourself — it is a human gate.
- **Maker and checker are different sessions.** A checker run gets only the brief and the draft. No `request_review` before the verdict, deliverable, preview and models are on the Issue.
- **Status moves forward one step**: `draft → in_review → approved → published → retired`; any other jump is an error; `retired` is terminal.
- **`context_issue_id` on every upsert** — the server rejects content without it. `tenant_slug` on every content call.
- **No invented facts**, numbers, quotes or anecdotes; cite sources in draft notes. No medical, legal or financial claims the owner did not approve. Do not work around the lint.
- **Keys by name only.** Binary bytes never go through the model: use the upload plan (`asset_upload` on Sites, `attach_artifact` on Context) and finish before it expires.
- **Recurring workflows install `daily-brief` first** — one comment a day on the Daily Brief Issue; a missing brief is the outage alert. Routines refresh their skills from the channel before each run and record the versions in the run log.
- **Drift rule.** Call `setup` every session. If the Guide or a skill comes back `update` or `install`, fetch the URLs it gives and overwrite your copy before working; if you cannot, finish the unit, comment on the Issue, and tell the owner. Record the versions you ran with in `work_stats` (`skills[]` names such as `blog-drafter@7`).
- **Context calls follow the Context Guide**: `caller` on every call, `expected_version` on updates, one `request_review` per decision, `get_changes {cursor, wait_ms: 25000}` to wait, ≤ 2 Issues per `create_issues` today.
- **Rate.** One new EN piece per drafter run plus its locale variants; one new carousel per run; the publisher runs every 3 h and publishes only inside `[due, due + 3 h)`.

## 5. Skills you will use

`rules-blog` is always loaded with the core `context` skill — the label vocabulary, the checker and publish gates, which server does what. The workflow skills: `blog-agent` ("set up blog": interview the owner, chart the tenant Epic, install and verify the routines), `blog-drafter` (nightly maker, `article_upsert` honouring the lint, hand-off to the checker), `blog-checker` (independent gate: machine checks, judgement, fact-check, `check_record`, `request_review` on pass), `blog-publisher` (every 3 h, exactly the approved and due pieces), `instagram-drafter` / `instagram-publisher` (carousel maker and Postiz scheduler, `POSTIZ_API_KEY` by name), `site-builder` (one page, one gate), `blog-assessment` (weekly traffic and AI-visibility report). `daily-brief`, `grill-me` and `wayfinder` come from the Context Guide.

<!-- live:skills -->

Raw skill text: `https://agents.onecontext.me/extensions/context-sites/skills/<key>.md`.

## 6. Tools map

Full schemas: `https://agents.onecontext.me/extensions/context-sites/tools/context-blog`. Groups: Skills & setup (all read-only; `setup` first), Tenant & brand (upserts replace by key/slug), Content (`publish` takes exactly one id), Checker (`content_lint` is side-effect free), Assets (signed PUT, then `asset_complete` with width/height/alt), Instagram (slides are asset ids; caption ≤ 2200 chars), Domain (hosted tier), Analytics (periods `7d | 28d | 90d`), AI visibility (the probe runs agent-side with the host's keys).

<!-- live:tools -->

Errors: lint failures come back as findings with a `path` — fix them, do not retry blindly; `VALIDATION_FAILED` names the missing field (`tenant_slug`, `context_issue_id`, `translation_group`, `hub_slug` are the usual ones); HTTP 410 `{"error": "moved", "endpoint": …}` means switch to the endpoint in the body. Every Context error class (`PAIRING_REQUIRED`, `STALE_VERSION`, `OPERATION_PENDING`, `WORKER_RESOURCE_LIMIT`) applies unchanged on the Context side.

## 7. Extensions

This is the Context Sites extension of Context. Core Guide, skills and tools: `https://agents.onecontext.me/`.
