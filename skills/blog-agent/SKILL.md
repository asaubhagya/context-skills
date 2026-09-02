---
name: blog-agent
description: >-
  "Set up blog" for any agent connected to Context + the Context Blog MCP:
  detect an existing tenant epic and reuse it (redo = re-interview + updated
  brand guides), or interview the owner (grill-me / wayfinder), fetch the
  facts, chart a tenant epic with brand, audience and design documents, one
  parent issue per channel with every piece as its child, one Backlog, the
  standing issues, then install and verify the routines on this machine
  (daily brief first) and raise one combined map + spec review. Blog · site ·
  Instagram, once or recurring, Artifact · Review · Hosted.
depends: [rules-blog, rules, setup-context, wayfinder, grill-me, daily-brief, blog-drafter, blog-checker, blog-publisher, instagram-drafter, instagram-publisher, site-builder, blog-assessment]
license: MIT
version: 6
attach: [templates/brand-guide.md, templates/audience.md, templates/design-tokens.json, templates/design-tokens.md, templates/decision-record.md, templates/brief.md, templates/lanes.md, routines/launchd.plist.template, routines/crontab.txt, routines/chat-routines.md, routines/no-machine.md]
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
**one parent issue per channel** (`Blog`, `Instagram`, `Site`) whose
children are the publish issues, so every piece of a channel is visible in
one place; **one `Backlog`** parent whose children are the ideas and the
researched topics (done ones stay — it is the running list); the standing
issues `Daily Brief`, `AEO/SEO Health`, `Performance Report`; the first
publish issues with `due` slots under their channel parent; on the Hosted
tier the tenant registered on the Blog MCP; the routines installed **and
verified** on this host (daily brief first); a `## Runs` block on the epic
that the daily brief keeps current; a handoff comment; and **one** combined
map + spec `reviewRequest` waiting for the owner. Nothing is published.

When the epic already exists, the session says so, reuses it, offers a
`redo` of the interview (updated brand guides, issues kept) and runs the
routines step again — see **Existing epic**.

## Before the first message

1. Context MCP `usage_guide`; Blog MCP `usage_guide` and `get_capabilities`
   (record `tools[]` and `skillChannel` — facts for Round 1 and the chart).
2. Note what this host is (`claude-code`, `codex`, `chatgpt`, `claude-ai`,
   …) and, from `rules-blog` §8, what it can and cannot do. That is stated,
   never asked.
3. **Existing-epic check — always, before any question.** Derive the slug
   from the brand or site the owner named (`getmeetly.ai` → `meetly`; ask
   for the brand in one line if nothing was named). Then
   `list_tasks {kind: "epic", label: "tenant:<slug>"}` and, when the Blog
   MCP has it, `tenant_get {slug}`. Either one found → the **Existing
   epic** path below. Nothing → the fixed opening.

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
Sites: page goal, sections, CTA — the one-round interview in `site-builder`;
a site-only owner (`setup {workflow: "site"}`) goes straight there and
skips the blog rounds.

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
   "<Brand> Blog", description: <Goal · Done when · Milestones · Structure ·
   Rules · Runs>, labels: ["tenant:<slug>", "wayfinder:map"]}`. The
   description is capped at 2048 characters: link documents, never paste
   them, and leave room for the `## Runs` block (`lanes.md` §6).
2. **Documents on the epic**, each shown to the owner first, each
   `send_file {…, taskId: <epic>}`: Brand persona (`docKind: "brand-guide"`,
   `templates/brand-guide.md`) · Audience & hubs (`audience`,
   `templates/audience.md`) · Design tokens (`design-guide`, both
   `templates/design-tokens.md` and `.json`) · Decision record
   (`decisions`, `templates/decision-record.md`) · Context brief (`brief`,
   `templates/brief.md`). Store every skill the owner accepted as
   `docKind: "skill"` per `setup-context`.
3. **Channel parents + standing issues** — children of the epic, in this
   order, `Daily Brief` first: `Daily Brief` · one parent per channel the
   owner chose — `Blog` (`lane:blog`), `Instagram` (`lane:instagram`),
   `Site` (`lane:site`) · `Backlog` (`lane:backlog`) · `AEO/SEO Health` ·
   `Performance Report`. Six for a blog + Instagram tenant. Labels and
   descriptions in `lanes.md` §2. Then write the ids of the Daily Brief
   issue and of every parent into the epic's `## Structure` — the routines
   read them from there.
4. **Map + spec review ticket** — `gate:plan`, child of the epic, assigned
   to you.
5. **First publish issues** — one per piece × channel × locale from the first
   10 topics and the slots, each a **child of its channel parent**
   (`parentId: <Blog parent>` for `channel:blog`, `<Instagram parent>` for
   `channel:instagram`, `<Site parent>` for `channel:site`), labels
   `channel:` `locale:` `tenant:` `hub:` `kind:` `gate:artifact`, `due` =
   the slot (ISO 8601 with offset), acceptance criteria from `lanes.md`.
   Locale variants `relates` to the EN master. Chart only the first cycle
   (≤ 2 weeks). The remaining topics become **Backlog children**
   (`stage:topic`, `lanes.md` §4b); loose ideas from the interview become
   `stage:idea` children. Nothing content-shaped is a direct child of the
   epic.
6. **Links, second pass** — every publish issue `blockedBy` the review
   ticket; locale variants `blockedBy` their EN master.
7. **Hosted tier — Blog MCP.** Check `get_capabilities.tools` first. If
   present, call in this order and post each result on the epic:
   `tenant_create {slug, name, site_url, context_epic_id}` →
   `brand_upsert {tenant, persona: <brand-guide>, design_tokens:
   <design-tokens.json>, byline}` → `hubs_upsert {tenant, hubs: […]}` →
   `topics_upsert {tenant, topics: […first 10 with context_issue_id — the
   publish issue for slotted topics, the Backlog child for the rest…]}` →
   `domain_connect {tenant, shape: "proxy" | "cname" | "subdomain", domain}`
   (returns the DNS record for the owner — hand it over as a checklist).
   If a tool is missing: say "`<tool>` is not available yet on this server",
   attach the payload you would have sent as `docKind: "spec"` on the epic,
   and continue. Never fake a result.
8. **Routines on this host — the routines step.** Runs on the first setup
   **and on every redo**; daily brief first. On Artifact tier or "once",
   install nothing and say so.
   1. *Detect the host.* A shell on macOS → `routines/launchd.plist.template`
      (one plist per routine); a shell on Linux → `routines/crontab.txt`; a
      host that can only schedule prompts (ChatGPT, claude.ai) → the four
      sections of `routines/chat-routines.md` as scheduled prompts; an
      owner without a machine that stays on → `routines/no-machine.md`
      (GitHub Actions cron / Vercel cron sketch, keys as repository
      secrets by name).
   2. *Print the filled templates.* Every `<…>` replaced — tenant slug,
      epic id, Daily Brief id, the channel parent ids and the Backlog id,
      Performance Report and AEO/SEO Health ids, repo path, timezone, model
      id, times — one block per routine, ready to paste, plus the filled
      prompt file (`routines/prompts.md` = the four `chat-routines.md`
      sections with the same values). Times: daily-brief 08:00 local ·
      drafter nightly · publisher every 3 h · assessment weekly. Install
      the skills each prompt names (`daily-brief`, `blog-drafter` +
      `blog-checker`, `blog-publisher`; Instagram tenants also
      `instagram-drafter` / `instagram-publisher`, run inside the same
      drafter and publisher routines) — they are in `depends`.
   3. *Install when the host has a shell* (Claude Code / Codex): write the
      files, `launchctl bootstrap gui/$(id -u) …` or `crontab -e`, then
      **verify**: `launchctl list | grep me.onecontext.blog.<slug>` (every
      label present, last exit 0) or `crontab -l | grep context-blog`, and
      one dry run of the daily brief (`scripts/run-routine.sh daily-brief`
      or the plain `claude -p` line) whose log ends in `end rc=0` and whose
      comment appears on the Daily Brief issue. Record what you observed —
      labels, times, next fire — in the handoff and in the epic's `## Runs`
      `routines:` line. Never claim an install you did not observe.
   4. *Already installed* (redo, or a second setup on the same host):
      re-verify with the same commands; re-print and reinstall only the
      templates whose filled values changed (new ids, new times); report
      "unchanged, verified" for the rest.
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

## Existing epic — reuse · redo · routines

The check in "Before the first message" found the epic (or `tenant_get`
returned the tenant). Never a second epic, parent, Backlog or Daily Brief
issue for a tenant.

1. **Say so.** First line, verbatim in shape: `Epic <title> (<ticket>)
   exists — using it.` Then ≤ 6 lines of what it holds, from reads only:
   documents (`get_task {id: <epic>}` → `documents[]`, with dates); each
   channel parent with open / in review / done counts (`list_tasks
   {parentId: <parent>, includeClosed: true}`); Backlog size (open / done);
   the `## Runs` block's `routines:` line, or "no Runs block yet"; tenant
   state on the Blog MCP (`tenant_get`: locales, recurrence, domain).
2. **Offer, then wait:** `redo` — re-run the interview and update the
   brand guides (issues are kept) · `routines` — (re)install and verify the
   routines on this machine · or "continue" — nothing changes, the loop
   runs. The owner may also name one thing ("change the cadence", "new
   voice"): treat it as a partial `redo` limited to that branch of the tree.
3. **`redo`.** Run Rounds 1–4 with every current answer pre-filled as the
   `➡️` recommendation, taken from the decision record and the documents
   (`get_document`), so the owner changes what they want and confirms the
   rest in one word. Then, in this order:
   - **Documents** — for every document whose content changed,
     `send_file {taskId: <epic>, …}` with the same `docKind` and title: a
     new document version attached to the epic (brand persona, audience &
     hubs, design tokens `.md` + `.json`, brief); the **decision record
     always**, with the new rows `from: user` and the replaced rows marked
     superseded.
   - **Blog MCP** (Hosted) — `brand_upsert {tenant, persona, design_tokens,
     byline}` (the server bumps the brand revision; say the new revision on
     the epic); `hubs_upsert` / `topics_upsert` only when hubs or topics
     changed.
   - **Epic** — `save_work {id: <epic>, description}` for the `## Rules`
     lines that changed (cadence, locales, voice, claims, skills); never
     touch the `## Runs` block, which belongs to the daily brief.
   - **Issues** — keep every existing issue and its state. Create only what
     `list_tasks {parentId, label}` shows missing: a channel parent for a
     channel the owner added, publish issues for new slots (under the
     parent), Backlog children for new topics. Re-slot (`due`) only when
     the owner changed the cadence, with a comment on each moved issue.
     Never delete, never re-parent, never a second gate on a piece.
   - **Gate** — the existing Map + spec review ticket gets one
     `post_task_update {state: "in_review", reviewRequest}` only if a
     document or the map changed; otherwise say "nothing to review".
4. **Routines step** — chart step 8, in full, every time (first setup and
   redo alike): detect, print the filled templates, install or re-verify,
   record.
5. **Handoff comment** on the review ticket, as in chart step 9.

## After approval — the loop

Approved map → the routines run the loop: `blog-drafter` takes the earliest
`backlog` publish issue under the `Blog` parent (or graduates the oldest
researched topic from the `Backlog` into a new publish issue under `Blog`)
→ maker draft → `blog-checker` (separate call) → attach draft + verdict +
preview + models → `reviewRequest` → owner → `done` → `blog-publisher` at
`due` → live URL on the issue. Instagram issues (children of the
`Instagram` parent, `channel:instagram`) run the same chain through
`instagram-drafter` (slides rendered from the paper-cards template,
assets + `instagram_post_upsert`) and `instagram-publisher` (Postiz with
`POSTIZ_API_KEY` by name, only when `done`, dedupe guard) — in the same
two routines, after the blog pass. `daily-brief` posts the day's comment
and rebuilds the epic's `## Runs` block (schedule · next slots · routine
health · last 7 briefs). Every rule in `rules-blog` §3–5 applies. The
driver session (you) only intervenes on `changes_requested`, on ideas the
owner drops into the `Backlog` (one child each, `stage:idea`), and on
`kind:refresh` proposals from the Performance Report. Site pieces
(children of the `Site` parent, `channel:site`) are one-time: `site-builder`
builds each page through the same maker → checker → owner → `publish`
chain, without a routine.

## What this skill never does

Publish, schedule or delete content; accept or echo a key value; create a
second epic, channel parent, Backlog or Daily Brief issue for a tenant;
put a publish issue directly under the epic; skip the checker; install a
drafter before the daily brief; skip the routines step on a redo; answer
its own interview questions; invent facts, numbers or quotes; make
compliance claims the owner did not approve.
