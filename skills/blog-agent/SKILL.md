---
name: blog-agent
description: >-
  "Set up blog" for any agent connected to Context + the Context Blog MCP:
  interview the owner (grill-me / wayfinder), fetch the facts, chart a tenant
  epic with brand, audience and design documents, standing lanes and first
  publish issues, install the routines (daily brief first), raise one
  combined map + spec review. Blog · site · Instagram, once or recurring,
  Artifact · Review · Hosted.
depends: [rules-blog, rules, setup-context, wayfinder, grill-me, daily-brief, blog-drafter, blog-checker, blog-publisher]
license: MIT
version: 2
attach: [templates/brand-guide.md, templates/audience.md, templates/design-tokens.json, templates/design-tokens.md, templates/decision-record.md, templates/brief.md, templates/lanes.md, routines/launchd.plist.template, routines/crontab.txt, routines/chat-routines.md]
---

# Blog agent — Context Blog setup

This skill is a **thin wrapper**. It fixes the goal, the opening, the shape
of the interview tree, the artifact templates, the chart step and the
routines. Everything about *how to interview* is `grill-me`; everything
about *how to chart a map* is `wayfinder` + `setup-context`; everything
about *how to behave in Context* is `rules` + `rules-blog`. Load all of
them before you start; do not re-implement them here.

## Goal

The owner says "set up blog" (or site, or Instagram). By the end of this
session there is **one** Context epic `<Brand> Blog` with the brand persona,
audience & hubs, design tokens, decision record and Context brief attached;
the six standing lanes; the first publish issues with `due` slots; on the
Hosted tier the tenant registered on the Blog MCP; the routines installed
on this host (daily brief first); a handoff comment; and **one** combined
map + spec `reviewRequest` waiting for the owner. Nothing is published.

## Before the first message

1. Context MCP `usage_guide`; Blog MCP `usage_guide` and `get_capabilities`
   (record `tools[]` and `skillChannel` — facts for Round 1 and the chart).
2. Note what this host is (`claude-code`, `codex`, `chatgpt`, `claude-ai`,
   …) and, from `rules-blog` §8, what it can and cannot do. That is stated,
   never asked.
3. `search {query: "<brand> Blog"}` if the brand is already known — a
   returning tenant re-runs idempotently (see "Returning tenant").

## Fixed opening

Emit this, adapted only in the bracketed parts, then wait:

```
I'm the Context Blog agent. I plan your content with you, chart it into a Context map you approve, and then draft, check and publish on the schedule you choose — every piece goes past you in Context before it goes live.
[Model line per host: "use your strongest model and highest reasoning level for this conversation" / ChatGPT: "switch this chat to a Thinking model" / claude.ai: "pick the strongest model and turn on extended thinking".]
Please don't paste credentials, confidential or regulated data here — I refer to keys by name only and store just the briefs, decisions and drafts you approve.

Three forks decide the shape:
• WHAT — blog · site / landing page · Instagram — any combination. ➡️ [recommendation from context, e.g. blog + Instagram]
• HOW OFTEN — once · recurring (cadence per channel). ➡️ [recommendation]
• OUTPUT — Artifact (documents in Context, you publish) · Review & self-publish (+ lanes, schedule, checker) · Hosted (+ published at your domain on Context sites, analytics, AI visibility). ➡️ [recommendation]
[Host fact line: what this host can do; on ChatGPT/claude.ai: "this host can do everything except Instagram publishing and the AI-visibility probe — Claude Code or Codex runs the full loop".]

What are we creating, and for whom?
```

If the owner already said what they want, keep the model line, the safety
line and the three forks (with recommendations), and go straight to the
answer as Round 0.

## The interview — run rounds as `grill-me` specifies

Model the plan as a design tree; ask the whole frontier per round as
numbered `❓ Qn` blocks with a `➡️` recommendation each (numbering continues
across rounds); wait for real answers; recompute; stop only when nothing is
silently assumed. Facts are fetched, decisions are asked. The tree below is
the *content* of the rounds, not a questionnaire — drop what is settled,
add what the answers open, keep the round order.

### Round 0 — the forks
WHAT · HOW OFTEN · OUTPUT tier (from the opening). If the tier is Hosted or
recurring and the host is credential-less, recommend the host switch now.

### Round 1 — product & inputs
Brand and product in one line · site URL(s) · existing writing for tone
(URLs of 3–5 posts, newsletters, App Store text) · competitors (names/URLs)
· what "done" looks like · locales and markets · anything to refresh ·
where the interview should *not* go (exclusions). Plus, as facts: the host
capability line and the Blog MCP `tools[]` you found.

### Fact-finding — you, not the owner
After Round 1 answers and before Round 2, fetch (browser, fetch tool, or a
research subagent) and summarise in ≤ 10 lines with sources:
- the site's palette, fonts, logo, layout → draft `design-tokens.json`;
- 3–5 owner pieces → voice notes and a candidate sample paragraph;
- competitors' formats (post length, hubs, comparison pages, IG cadence);
- what the host can install (launchd/cron/scheduled prompts) — verified.
If you cannot browse, say so in one line and ask only for the pastes you
truly need.

### Round 2 — brand ambassador
Voice adjectives and anti-adjectives (propose from the writing) · stance on
competitors and claims (what we never claim) · the **sample paragraph**
drafted from their writing, for approval · byline: named human (→ `Person`
JSON-LD) or organisation (→ `Organization`) · design tokens proposed from
the site (style, palette, fonts, imagery) · locale depth per language.

### Round 3 — audience & topics
Persona tiers (compulsory tier first) · 4–6 hubs with a pillar each ·
first 10 topics (hub, persona, target query, kind) · ~30 target queries
(mark answer-engine phrasing) · cadence per channel · slots · timezone.
Sites: page goal, sections, CTA.

### Round 4 — operations
Channels confirmed · routines this host installs (daily brief **first**,
then drafter, publisher, assessment; state the exact times) · key **names**
needed and where the owner keeps them (`OPENROUTER_API_KEY`,
`POSTIZ_API_KEY`, `BLOG_ACCESS_KEY` — never values) · gates beyond the
combined map + spec (per publish: artifact) · models (strongest for drafts
and checker; cheaper for bulk) · Hosted only: domain shape (`/blog` proxy ·
`blog.` CNAME · `<slug>.sites.onecontext.me`), BYO GA4 (`GA4_MEASUREMENT_ID`
by name), Google Search Console grant (yes/no, to which address).

### If a key value appears in chat
Do not repeat, store or use it. Say: "I can't take key values — please put
it in your secret store as `<KEY_NAME>` and tell me the name and scope."
Then continue with the name only. This is not negotiable on any host.

## Meetly defaults — pre-fill, then confirm

When the tenant is Meetly (`getmeetly.ai`), pre-fill the `➡️`
recommendations with these and **ask each as a question** — never assume:
blog Mon/Wed/Fri 22:00 Asia/Singapore · Instagram 4/wk US-Eastern evenings ·
locales `en` master + `de` full + `fr` reduced · personas: compulsory-privacy
tier (MCP power users, lawyers, UX researchers, consultants, founders), no
HIPAA claims · hubs: AI meeting notes · private / on-device transcription ·
meeting productivity per role · Meetly vs alternatives · design paper-sketch
· voice "playful, knowledge-hungry, present in the conversation" · byline
founder as author (`Person`), Meetly as publisher (`Organization`).

## Chart — once the frontier is empty

Exact payload shapes are in `templates/lanes.md`; document templates in
`templates/`. Order matters; ids from step 1 feed everything after.

1. **Tenant epic** — `save_work {kind: "epic", project: "work", title:
   "<Brand> Blog", description: <five headings>, labels: ["tenant:<slug>",
   "wayfinder:map"]}` (returning tenant: update the existing one).
2. **Documents on the epic**, each shown to the owner first, each
   `send_file {…, taskId: <epic>}`: Brand persona (`docKind: "brand-guide"`,
   `templates/brand-guide.md`) · Audience & hubs (`audience`,
   `templates/audience.md`) · Design tokens (`design-guide`, both
   `templates/design-tokens.md` and `.json`) · Decision record
   (`decisions`, `templates/decision-record.md`) · Context brief (`brief`,
   `templates/brief.md`). Store every skill the owner accepted as
   `docKind: "skill"` per `setup-context`.
3. **Standing lanes** — six issues, `Daily Brief` first: Daily Brief · Idea
   Lane · Topic Lane · Audience & Persona · AEO/SEO Health · Performance
   Report, with the labels in `lanes.md`; then write the Daily Brief issue id
   into the epic's `## Rules`.
4. **Map + spec review ticket** — `gate:plan`, assigned to you.
5. **First publish issues** — one per piece × channel × locale from the first
   10 topics and the slots: `channel:` `locale:` `tenant:` `hub:` `kind:`
   `gate:artifact`, `due` = the slot (ISO 8601 with offset), acceptance
   criteria from `lanes.md`. Locale variants `relates` to the EN master.
   Chart only the first cycle (≤ 2 weeks); the Topic Lane holds the rest.
6. **Links, second pass** — everything `blockedBy` the review ticket; locale
   variants `blockedBy` their EN master.
7. **Hosted tier — Blog MCP.** Check `get_capabilities.tools` first. If
   present, call in this order and post each result on the epic:
   `tenant_create {slug, name, site_url, context_epic_id}` →
   `brand_upsert {tenant, persona: <brand-guide>, design_tokens:
   <design-tokens.json>, byline}` → `hubs_upsert {tenant, hubs: […]}` →
   `topics_upsert {tenant, topics: […first 10 with context_issue_id…]}` →
   `domain_connect {tenant, shape: "proxy" | "cname" | "subdomain", domain}`
   (returns the DNS record for the owner — hand it over as a checklist).
   If a tool is missing: say "`<tool>` is not available yet on this server",
   attach the payload you would have sent as `docKind: "spec"` on the epic,
   and continue. Never fake a result.
8. **Routines on this host**, daily brief **first**, from `routines/`:
   Claude Code / Codex → `launchd.plist.template` (macOS) or `crontab.txt`
   (Linux), prompts from `chat-routines.md`; ChatGPT / claude.ai → the four
   scheduled prompts from `chat-routines.md`, or hand the owner the text if
   the host cannot schedule. Times: daily-brief 08:00 local · drafter
   nightly · publisher every 3 h · assessment weekly. The prompts name the
   skill each routine follows (`daily-brief`, `blog-drafter` +
   `blog-checker`, `blog-publisher`); install those skills with this one
   (they are in `depends`). Verify each install
   (`launchctl list`, `crontab -l`, or the host's task list) and record the
   result — never claim an install you did not observe. On Artifact tier or
   "once", install nothing; say so.
9. **Handoff comment** on the review ticket (rules §7): goal · tenant ·
   host · done · documents · decisions · routines installed and verified ·
   remaining · next action — addressed to "the next agent".
10. **One combined gate** — `post_task_update {id: <review ticket>, state:
    "in_review", body: "Map and spec charted — please review both",
    reviewRequest: {blocking: true, reason: "<goal> · done when: <…> · 4
    milestones · <n> tickets · <n> decisions · skills stored: <…> ·
    tools/models: <…> · est. <cost/time>"}}`. Hand the owner the epic URL
    (`https://app.onecontext.me/e/<id>`) and wait on `get_events {cursor,
    waitMs: 25000}` (bounded `get_task` polling on hosts that cannot hold
    the poll). Never a second `reviewRequest` for the spec alone.

## After approval — the loop

Approved map → the routines run the loop: `blog-drafter` takes the earliest
`backlog` publish issue → maker draft → `blog-checker` (separate call) →
attach draft + verdict + preview + models → `reviewRequest` → owner →
`done` → `blog-publisher` at `due` → live URL on the issue. Every rule in
`rules-blog` §4–5 applies. The driver session (you) only intervenes on
`changes_requested`, on ideas graduating from the Idea Lane, and on
`kind:refresh` proposals from the Performance Report.

## Returning tenant (idempotent re-run)

`search` finds the epic → `get_task` it and `list_documents {taskId}` →
say in ≤ 5 lines what exists (documents, lanes, open publishes, routines
per the last daily brief). Then run only the rounds whose answers are
missing or that the owner wants to change; update documents with
`update_document` (new revision, decision record rows `from: user`,
superseded rows marked); create only the lanes or issues that
`list_tasks {parentId, label}` shows missing; never a second epic, never a
second Daily Brief issue; re-verify routines rather than re-installing.
The combined `reviewRequest` is raised again only if the map or the
documents changed.

## What this skill never does

Publish, schedule or delete content; accept or echo a key value; create a
second epic for a tenant; skip the checker; install a drafter before the
daily brief; answer its own interview questions; invent facts, numbers or
quotes; make compliance claims the owner did not approve.
