---
name: site-builder
description: >-
  One-time site / landing page for a Context Blog tenant: fix the page goal,
  audience, sections (hero, how it works, tiers, proof, CTA) and design
  tokens in a short interview, draft straight into the Blog MCP page shape,
  `page_upsert` honouring the lint (dry run first), `preview_render`, hand
  the draft to `blog-checker` in a separate call, leave the Context issue
  behind one `gate:artifact` review, and `publish` only after the owner
  approved it there. Never publishes unapproved; never a second CTA.
depends: [rules-blog, rules, blog-checker, grill-me]
license: MIT
version: 2
attach: [templates/page-brief.md]
---

# Site builder — one page, one gate

A site-only owner is routed here by `start_context` (its `nextAction` points
at this skill when the tenant's products are `[site]`). You build **one
page** (a landing page, a pricing or about page) for **one tenant**, once.
There is no
routine, no buffer and no cadence: interview → brief → draft → lint →
preview → checker → owner → publish. `rules` and `rules-blog` apply in
full; `blog-checker` judges the draft in a separate call; the owner
approves in Context; you (or the driver session) call `publish` after that
and never before.

When the tenant already has a `Site` channel parent from `blog-agent`
(`lane:site`), the page issue is a child of that parent. When the tenant
was set up for a site only (products `[site]`), the issue's parent is
whatever the owner's map says — the E10 launch page hangs off its epic
ticket — and you say which.

## Before the first message

1. Context `start_context`; Blog MCP `usage_guide` + `get_capabilities` —
   `page_upsert`, `preview_render`, `check_record`, `publish` must be in
   `tools[]` (else `rules-blog` §8: say which is missing, attach the payload
   you would have sent, stop before that step).
2. **Tenant.** `tenant_get {slug}` from the brand the owner named. Missing →
   `tenant_create {slug, name, tier, products: ["site", …], locales,
   default_locale, timezone, mount_path, primary_hostname?,
   context_epic_id?}`; a `brand_upsert` (voice, byline, design tokens,
   `organization_ld`) follows the interview. Existing → reuse; a second
   tenant for the same brand is never created.
3. **Where pages resolve.** The renderer serves `<host><mount>/<slug>`
   (non-default locales under `/<locale>/`). The tenant root `<mount>/` is
   the **hub view** — the article list — not a page. A landing page
   therefore needs a slug (`launch`, `home`, `pricing`); say so before the
   owner expects `/`. With `primary_hostname` set the page is served on that
   host, otherwise at `https://sites.onecontext.me/t/<slug><mount>/<page>`.

## Interview — one round, `grill-me` shape

Ask the whole frontier as numbered `❓ Qn` blocks with a `➡️`
recommendation each; wait; stop when nothing is assumed. Facts (the site's
palette, fonts, logo, product facts, existing copy) are fetched, not asked.

- **Goal** — the one thing the page must make the reader do (sign up ·
  read the guide · install · buy). One goal, one CTA.
- **Audience** — who lands here and what they already know; the objection
  the page must answer first.
- **Sections** — propose from the goal, in this order, and let the owner
  cut: hero (what it is, in the product's own words) · how it works
  (3–5 numbered steps) · tiers or plans (a `comparisonTable`) · proof
  (only what the brief backs: a named quote, a real number, a screenshot —
  or nothing) · trust (keys, data, limits) · pricing (the owner's exact
  words, placeholders allowed: "free while in preview") · CTA.
- **Copy rules** — the brand persona's adjectives, anti-adjectives, banned
  phrases and **claims policy** (`rules-blog` §9): nothing the product does
  not do today, no compliance claims, no invented numbers, quotes or
  customers. Name limits before benefits.
- **Design tokens** — the tenant's `design-tokens.json` (from `brand_upsert`)
  is the page's look; propose them from the brand's own site. The page must
  look like the brand, not like the platform's other tenants.
- **Slug, locale, hostname** — `slug` (lower-case, short), `locale`, and
  whether `primary_hostname` / `domain_connect` is wanted now.

Write `templates/page-brief.md` filled and show it; the owner's "go" on the
brief is the Round's exit. It is attached to the issue as `docKind: "brief"`.

## The Context issue

One page = one Context issue, title `Site: <title> (<locale>)`, labels
`channel:site` `locale:<l>` `tenant:<slug>` `kind:new` `gate:artifact`,
`parent_id` = the `Site` parent when it exists. Create it **before**
`page_upsert` — the Blog MCP requires `context_issue_id` on every page.
Acceptance criteria (`acceptance_criteria`): lint clean · preview attached ·
checker verdict recorded · owner approval · live URL.

## Draft — the Blog MCP page shape

`page_upsert {tenant_slug, slug, locale, title, description, sections[],
seo {slug, answer, keywords}, context_issue_id, dry_run}`. Sections:
`paragraph` · `heading` (2/3) · `list` (steps: `ordered: true`) ·
`comparisonTable` (tiers) · `callout` (pricing, trust) · `quote` with
`cite`/`source` (proof) · `image` (screenshot, with `alt`) · **exactly one
`appCta`** (`text`, `href`, `label`). Inline HTML only `<em>`, `<strong>`,
`<a href="https://…">` — `<code>` is rejected; write key names in `<em>`.

Pages skip the article-only lint (answer-first, FAQ shape, hub, citations,
statistics, artifact); `html_disallowed` and `banned_phrase` still reject,
`first_person_heavy` still warns. `description` ≤ 1000 characters carries
the meta description; `seo.answer` is the one-paragraph answer an engine
may lift.

Copy: the hero says what the product is in the product's own words, in two
short paragraphs. Steps are verbs. The tiers table has one row per tier and
says who publishes. Every claim traces to the brief. The CTA sentence names
the action and may link the second destination inline — the button stays
one.

## Upsert — honour the lint

1. `page_upsert {…, dry_run: true}`. Fix every `severity: "error"` at its
   `path`; judge the warnings. **Two bounces at most** (three attempts); a
   third rejection → `post_comment {parent_id: <issue>, body: "ESCALATE:
   page_upsert rejected 3× — <codes>"}`, leave the issue `in_progress`, stop.
2. The real `page_upsert`. Keep `id`, `preview_url`, `url`; every later
   revision passes the same `id`.
3. `preview_render {tenant_slug, kind: "page", title, description,
   sections, seo, design_tokens}` → `attach_artifact {parent_id: <issue>,
   filename: "preview-r<n>.html", title: "Rendered preview, round <n>",
   docKind: "preview", content: <html>}`. Open the HTML: the tenant's
   fonts, background and accent must be the CSS variables you see.
4. Attach the draft: `attach_artifact {parent_id: <issue>, filename:
   "<slug>.<locale>.md", title: "<title> (<locale>)", docKind:
   "deliverable", content: <markdown rendering with front matter: page id,
   slug, locale, url, preview_url>}`.
5. One machine-readable line on the issue:
   `blog-page: <id> · slug <slug> · locale <locale> · preview <preview_url> · url <url>`

## Checker — a separate call

Start a fresh session or subagent whose only inputs are the page payload,
the brand profile, the brief and "follow `blog-checker`" — never this
context. It runs `content_lint`, opens the preview, fetches every URL,
traces every product claim to the brief, judges voice, claims policy and
structure (H2s as a table of contents, **one** CTA), and returns a
`pass · bounce · escalate` verdict. Then, on the issue:

- `attach_artifact {parent_id: <issue>, filename: "checker-verdict-r<n>.md",
  docKind: "review"}` · `check_record {tenant_slug, subject_kind: "page",
  subject_ref: <issue id>, round, verdict, findings, models}` ·
  `post_comment` with verdict, preview URL, `check_id`, maker and checker
  models.
- **bounce** → fix each finding at its `path`, re-upsert with the same
  `id`, re-render, hand over as round + 1. **escalate** → stop; the owner
  decides.
- **pass** → `page_set_status {id, status: "in_review"}` and the gate.

## The gate — owner approves in Context

```
update_issues {ids: [<issue>], state: "in_review"}
post_comment {parent_id: <issue>, body: "Checker passed (round <n>) — draft, verdict, preview and models attached"}
request_review {parent_id: <issue>, reason: "<title> · site/<locale> · <words> words · preview <url> · will publish at <url> · maker <model> · checker <model>"}
```

When the page is one slice of a larger map (a launch), the map's owner may
raise the gate on the parent ticket instead — then you attach everything
and say on the issue that the gate is raised there. Wait on `get_changes
{cursor, waitMs: 25000}`; never assume approval.

## Publish — after `done`, never before

`page_set_status {id, status: "approved"}` → `publish {tenant_slug,
page_id, context_issue_id, assert_context_done: true}` → `url` on the
issue → `complete_issues` with `workStats`. Then verify: `curl -sI <url>`
is 200 and the HTML carries the title. A hosted root that shows "Nothing
published yet." is the hub view, not a failure — say where the page lives.
`domain_connect` / `domain_status` for a custom hostname follow
`blog-agent` chart step 7.

## Benchmark — what a good landing page produces

- `page_upsert` clean on the first real call (`warnings: []`), no
  `banned_phrase`, no `first_person_heavy`.
- 350–700 words; 4–6 H2s that read as a table of contents; steps ≤ 5.
- **One** `appCta`, placed last; one goal the hero states in its first
  sentence.
- Every product claim traceable to the brief; the checker's facts table
  has no `no`.
- Preview HTML < 50 KB, no external scripts, no image above the fold
  (the renderer's page view is text-first, so LCP is the hero paragraph),
  tokens visible as CSS variables.
- Rendered live within one minute of `publish`; `curl -sI` 200; the
  `Organization` JSON-LD from the brand present in the page.

## What this skill never does

Publish or set `approved` before the Context issue is `done`; run its own
checker in the same session; add a second CTA; write a claim the brief
does not back; invent proof; echo or store a key value; create a second
tenant for a brand; promise `/` when the root is the hub view.
