---
title: Context Sites — agent guide
description: How an agent connects to the Context Blog MCP, sets up a tenant, drafts lint-gated content, gets it checked and approved in Context, and publishes.
server: context-blog
updated: 2026-09-06
---

# Context Sites — agent guide

## 1. What it is

Context Sites (the Context Blog MCP) is the publishing half of Context: it drafts and publishes blog posts, site pages and Instagram carousels for a tenant, renders previews, lints content, records checker verdicts, and reports traffic and AI visibility. It never tracks work or approves anything — every piece carries a `context_issue_id`, and the approval that unlocks `publish` lives in Context.

## 2. Connect

- Endpoint: `https://sites.onecontext.me/api/mcp` (contract `blog-1.3.0`). The old `blog.onecontext.me/api/mcp` answers `410 moved`.
- Connect **both** servers: Context first (`https://mcp.onecontext.me/mcp` — see the Context guide), then this one.
- Claude Code: `claude mcp add --transport http context-blog https://sites.onecontext.me/api/mcp`
- claude.ai: Settings → Connectors → Add custom connector → name Context Blog, URL `https://sites.onecontext.me/api/mcp`
- ChatGPT: Settings → Connectors → Add → URL `https://sites.onecontext.me/api/mcp`
- Cursor: add an HTTP MCP server with URL `https://sites.onecontext.me/api/mcp`
- Auth: Google sign-in for interactive hosts (no key). Headless routines use a bearer by **name** (`CONTEXT_BLOG_MCP_TOKEN` in the host's secret store, expanded into the `Authorization` header by the MCP config). Tenant credentials (Postiz, analytics, search console) are referred to by key name only.

## 3. First call

1. `usage_guide` — what the server is, tiers (`artifact | review | hosted`), rules. Then `get_capabilities` to confirm the tools this contract serves; if a tool a skill names is absent, say "not available yet on this server" and attach the payload you would have sent to the Context Issue instead.
2. `setup {workflow: "blog" | "site" | "instagram"}` — resolves the workflow skill (`blog-agent` / `site-builder` / `instagram-drafter`) plus `rules-blog` and dependencies, and returns `mode: "files"` (paths to write per harness + an AGENTS.md block) or `mode: "chat"` (skill links + inline protocol), with a `nextStep`. Idempotent. Do the `nextStep`.
3. `list_skill_catalog` / `get_skill {key}` read the same catalog as `https://agents.onecontext.me/skills`.

## 4. Vocabulary

- **Tenant** — one site (for example `getmeetly.ai/blog`); `tenant_slug` on every content call. Tier `artifact` (drafts only), `review`, `hosted` (served on a domain).
- **Brand / audiences / hubs / topics** — voice, byline, design tokens; audience segments; topic hubs (every article belongs to one, `hub_slug`); topics are the research backlog with `target_query` and `fanout_queries`.
- **Article / page / instagram_post** — the content rows. Status moves one step forward only: `draft → in_review → approved → published → retired`. Articles carry `slug`, `locale`, `translation_group` (= the EN master's slug), `sections`, `faq`, `seo`.
- **`context_issue_id`** — the Context Issue that tracks the piece. Required on `article_upsert`, `page_upsert`, `instagram_post_upsert` and `publish`.
- **Checker verdict** — `pass | bounce | escalate`, recorded with `check_record`; the independent `blog-checker` writes it, not the maker.
- **Assets** — images uploaded per tenant (`asset_upload` → PUT → `asset_complete`) and referenced by id (Instagram slides) or public URL.

## 5. The loop

1. **Set up** — `setup {workflow}`; for a new tenant `tenant_create`, `brand_upsert`, `audiences_upsert`, `hubs_upsert`, `topics_upsert`; the workflow skill charts the tenant Epic in Context (one parent Issue per channel, every piece a child).
2. **Draft** — in Context, claim the publish Issue (`update_issues … in_progress`). Research with cited sources. `content_lint` first (read-only; same body as the upsert), fix every finding, then `article_upsert {tenant_slug, slug, locale, translation_group, title, description, sections, seo, hub_slug, context_issue_id}` — it lints again and refuses on failure. Two bounces, then escalate.
3. **Attach for review** — on the Context Issue: the markdown deliverable (what the owner comments on) and ONE final preview: `preview_render {tenant_slug, kind, title, description, sections, …}` → `attach_artifact` as `Preview — <title>`. Instagram: one Instagram-style viewer over the slide asset URLs, never one artifact per slide.
4. **Check** — a separate session runs `blog-checker`: `content_lint`, `preview_render`, judgement and fact checks, then `check_record {tenant_slug, subject_kind: "article" | "page" | "instagram", subject_ref: <issue id>, round, verdict, findings, models}`. On `pass` it raises the Context `request_review`; on `bounce` the maker fixes and re-upserts with the same `id`.
5. **Approve** — the owner decides in Context. Locale variants are child Issues of the EN master and inherit its approval (cascade) once their own verdict is attached.
6. **Publish** — only for an Issue whose Context state is `done`: `article_set_status {tenant_slug, id, status}` forward as needed, then `publish {tenant_slug, assert_context_done: true, context_issue_id, article_id | page_id | instagram_post_id}`. Publish at the slot (`due`), never early; a missed window is re-slotted, never silently published late. Post the live URL on the Issue, then `complete_issues` with `work_stats`.
7. **Measure** — `stats_summary`, `top_posts`, `post_stats`, `ai_referrals`, `search_queries`, `indexing_status`; the weekly `blog-assessment` probes AI visibility (`visibility_queries_set` → probe → `visibility_results_ingest` → `visibility_report`) and posts one report Issue.

## 6. Rules that bite

- **Never publish without a Context approval.** `publish` requires `assert_context_done: true` and refuses when the Issue is not `done`. Never mark that Issue done yourself.
- Maker and checker are different sessions; a checker run gets only the brief and the draft. No `request_review` before the verdict, deliverable, preview and models are on the Issue.
- Status only moves forward one step; any other jump is an error. `retired` is terminal.
- `context_issue_id` on every upsert — the server rejects content without it.
- No invented facts, numbers, quotes or anecdotes; cite sources in draft notes. No medical, legal or financial claims the owner did not approve.
- Keys by name only. Binary bytes never go through the model: use the upload plan.
- Context calls from this workflow follow the Context guide: `caller` on every call, `expected_version` on updates, ≤ 2 Issues per `create_issues` today.

## 7. Skills to load

| Skill | Role | Raw |
|---|---|---|
| `rules-blog` | the Context Blog harness: epic shape, labels, checker gate, publish gate | https://agents.onecontext.me/skills/rules-blog.md |
| `blog-agent` | set-up workflow: interview, chart the tenant Epic, install routines | https://agents.onecontext.me/skills/blog-agent.md |
| `blog-drafter` / `blog-checker` / `blog-publisher` | nightly maker, independent checker, 3-hourly publisher | https://agents.onecontext.me/skills/blog-drafter.md · `blog-checker.md` · `blog-publisher.md` |
| `instagram-drafter` / `instagram-publisher` | carousel maker and scheduler | https://agents.onecontext.me/skills/instagram-drafter.md · `instagram-publisher.md` |
| `site-builder` | site pages workflow | https://agents.onecontext.me/skills/site-builder.md |
| `blog-assessment` / `daily-brief` | weekly report; daily heartbeat | https://agents.onecontext.me/skills/blog-assessment.md · `daily-brief.md` |
| `rules`, `setup-context` | Context harness (see the Context guide) | https://agents.onecontext.me/skills/rules.md |

Channel rule: `setup` serves the tenant's channel (`latest` unless the tenant opted into `beta`). Routines refresh their `.claude/skills` overlay from the channel before each run and record the versions in the run log; if what you hold differs from the channel and you cannot refresh, finish, comment on the Issue, and tell the owner.

## 8. Tool map

Links: `https://agents.onecontext.me/mcp/context-blog#<tool>`.

| Stage | Tools | Notes |
|---|---|---|
| Skills & setup | `usage_guide`, `get_capabilities`, `list_skill_catalog`, `get_skill`, `setup` | all read-only; `setup` first |
| Tenant & brand | `tenant_create`, `tenant_get`, `tenant_update`, `brand_upsert`, `audiences_upsert`, `hubs_upsert`, `topics_upsert`, `topics_list` | upserts replace by key/slug |
| Content | `article_upsert`, `article_get`, `article_list`, `article_set_status`, `page_upsert`, `page_get`, `page_list`, `page_set_status`, `publish` | `publish` takes exactly one id |
| Checker | `content_lint`, `preview_render`, `check_record`, `check_list` | lint is read-only and side-effect free |
| Assets | `asset_upload`, `asset_complete` | signed PUT, then complete with width/height/alt |
| Instagram | `instagram_post_upsert`, `instagram_post_get`, `instagram_post_list`, `instagram_post_set_status` | slides are asset ids; caption ≤ 2200 chars |
| Domain | `domain_connect`, `domain_status` | hosted tier; DNS/proxy instructions |
| Analytics | `stats_summary`, `top_posts`, `post_stats`, `ai_referrals`, `search_queries`, `indexing_status`, `tracking_setup_status` | periods `7d | 28d | 90d` |
| AI visibility | `visibility_queries_set`, `visibility_results_ingest`, `visibility_report` | probe runs agent-side with the host's keys |

## 9. Errors and limits

- Lint failures come back as findings with a `path`; `article_upsert` refuses until they are fixed — do not work around the lint.
- Status errors — moving more than one step, or `publish` on a row that is not `approved`, or `assert_context_done` false: fix the state, do not retry blindly.
- `VALIDATION_FAILED` — a required field is missing (`tenant_slug`, `context_issue_id`, `translation_group`, `hub_slug` are the usual ones).
- HTTP 410 `{"error":"moved","endpoint":…}` — retired host; switch to the endpoint in the body.
- Assets: use the signed upload URL before it expires; complete the row or it is not referenceable.
- Approvals, review requests and every error class of the Context side (`PAIRING_REQUIRED`, `OPERATION_PENDING`, `WORKER_RESOURCE_LIMIT`/546 with backoff, 25 MB artifact cap, 25 s bounded wait) apply unchanged when this workflow writes to Context.
- Rate: one new EN piece per drafter run plus its locale variants; one new carousel per run; publisher runs every 3 h and publishes only inside `[due, due + 3 h)`.
