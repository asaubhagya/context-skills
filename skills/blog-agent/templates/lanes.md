# Chart payloads — tenant epic, channel parents, Backlog, standing issues, first publishes

Exact `save_work` shapes. Fill `<…>`; keep every key. `project: "work"`
unless the owner named another space. `description` is capped at 2048
chars — link the documents, never paste them.

Shape of the map (v2, since blog-agent 4):

```
<Brand> Blog (epic)
├── Daily Brief            lane:brief      standing — one comment per day; keeps the epic's ## Runs block
├── Blog                   lane:blog       parent — every blog publish issue (all locales) is its child
│   ├── Blog: <title> (en)   channel:blog locale:en hub:… kind:… gate:artifact due:<slot>
│   └── Blog: <title> (de)   … relates + blockedBy the EN master
├── Instagram              lane:instagram  parent — every Instagram issue is its child
│   └── Instagram: <hook> (en)
├── Site                   lane:site       parent — only when WHAT includes a site
├── Backlog                lane:backlog    parent — ideas (stage:idea) and researched topics (stage:topic); done stays
│   ├── Topic: <working title>   stage:topic hub:… channel:blog
│   └── Idea: <one line>         stage:idea
├── AEO/SEO Health         lane:aeo-seo    standing — weekly comment
├── Performance Report     lane:performance standing — weekly comment; kind:refresh proposals
└── Map + spec review      gate:plan       the one combined gate
```

`list_tasks {parentId}` returns **direct children only**: pieces are found
through their channel parent (`list_tasks {parentId: <Blog parent>, …}`),
never through the epic. Every skill resolves the parents once per run —
`list_tasks {kind: "issue", parentId: <epic>, label: "lane:<channel>"}` — or
reads their ids from the epic's `## Structure`.

## 1. Tenant epic — one per tenant

```json
{ "kind": "epic", "project": "work", "title": "<Brand> Blog",
  "description": "## Goal\n<destination, 2–3 sentences>\n\n## Done when\n<outputs + proof>\n\n## Milestones\n1. Map + spec approved (gate: plan) 2. Brand, audience, design docs approved (gate: artifact) 3. First <n> pieces published (gate: artifact each) 4. Routines live (gate: final)\n\n## Structure\nBlog <ticket> <id> · Instagram <ticket> <id> · Backlog <ticket> <id> · Daily Brief <ticket> <id> · AEO/SEO Health <ticket> · Performance Report <ticket>\n\n## Rules\n- tenant: `<slug>` · channels: <…> · tier: <…>\n- cadence: <…> · timezone: <…> · publisher window 3 h · buffer floor <n>\n- locales: <en master, de full, fr reduced>\n- voice: <adjectives> / never <anti-adjectives>; claims: <policy>\n- skills: blog-agent, rules-blog, daily-brief, blog-drafter, blog-checker, blog-publisher<, instagram-drafter, instagram-publisher>\n- models: drafts + checker · <model>; images · <tool>; keys by NAME only: OPENROUTER_API_KEY, POSTIZ_API_KEY, BLOG_ACCESS_KEY\n- no invented anecdotes, numbers or quotes — only facts from the attached briefs\n\n## Runs\nschedule: brief <08:00 daily> · drafter <02:00 nightly> · publisher <every 3 h> · assessment <Mon 09:00> (<tz>)\nnext: <slot ticket> · <slot ticket> · <slot ticket>\nroutines: brief <never> · drafter <never> · publisher <never> · assessment <never>\nbriefs:\n- none yet",
  "labels": ["tenant:<slug>", "wayfinder:map"] }
```

Budget: keep everything above `## Runs` under ~1 600 characters so the
daily brief has room for three `next` entries and seven `briefs` lines
(§6). `## Structure` is filled after step 2; `## Runs` after step 8 (the
routines step) with what was verified.

Re-run (existing epic): `list_tasks {kind: "epic", label: "tenant:<slug>"}`
→ `save_work {id, description}` updates the `## Rules` lines that changed —
never a second epic, never the `## Runs` block (the daily brief owns it).

## 2. Channel parents + standing issues — children of the epic

Create in this order; the Daily Brief issue first. All `issueType:
"complex"`, `parentId: <epic>`, `project: "work"`, `assignee` empty. Re-run:
`list_tasks {kind: "issue", parentId: <epic>, label: "lane:<x>"}` before
creating — one hit means it exists.

| Title | labels | description (gist) |
|---|---|---|
| `Daily Brief` | `["lane:brief", "brief:daily", "tenant:<slug>", "gate:none"]` | One comment per day from the daily-brief routine (08:00 <tz>); it also rebuilds the epic's `## Runs` block. A missing brief is the alert. Skill: daily-brief. |
| `Blog` | `["lane:blog", "tenant:<slug>", "gate:none"]` | Parent of every blog publish issue (`channel:blog`, every locale). Open children = the pipeline, done children = what is live. blog-drafter, blog-checker, blog-publisher and daily-brief look pieces up with `list_tasks {parentId: <this id>}`. Never a piece directly under the epic. |
| `Instagram` | `["lane:instagram", "tenant:<slug>", "gate:none"]` | Parent of every Instagram issue (`channel:instagram`). instagram-drafter and instagram-publisher look pieces up here. Only when WHAT includes Instagram. |
| `Site` | `["lane:site", "tenant:<slug>", "gate:none"]` | Parent of every site / landing-page issue (`channel:site`). Only when WHAT includes a site. |
| `Backlog` | `["lane:backlog", "tenant:<slug>", "gate:none"]` | The running list: ideas (`stage:idea`) from the owner, comments and competitor scans, and researched topics (`stage:topic`: hub, persona, target query, kind). A child is marked done when it graduates into a publish issue (`Graduated → <ticket>` comment, `relates` link) — done stays here as history. The drafter reads `stage:topic` children when no slotted issue is waiting. |
| `AEO/SEO Health` | `["lane:aeo-seo", "tenant:<slug>", "gate:none"]` | Weekly: target-query coverage, JSON-LD validity, sitemap, AI-visibility probe results (Hosted). |
| `Performance Report` | `["lane:performance", "tenant:<slug>", "gate:none"]` | Weekly assessment comment: traffic, top posts, what to refresh (`kind:refresh` proposals become Backlog children or publish issues). |

Payload shape (one example):

```json
{ "kind": "issue", "issueType": "complex", "project": "work", "parentId": "<epic id>",
  "title": "Blog",
  "description": "Channel parent. Every blog publish issue of tenant <slug> — every locale, new and refresh — is a child of this issue, so the whole channel is visible in one list: open children are the pipeline, done children are live. Skills look pieces up with list_tasks {parentId: <this id>}; nothing content-shaped goes directly under the epic. Slots: <cadence>, <tz>.",
  "labels": ["lane:blog", "tenant:<slug>", "gate:none"] }
```

After they exist: `save_work {id: <epic>, description: <the same
description with ## Structure filled: parent tickets + ids, Daily Brief
id>}`.

## 3. Map + spec review ticket (the one combined gate)

```json
{ "kind": "issue", "issueType": "complex", "project": "work", "parentId": "<epic id>",
  "title": "Map + spec review", "labels": ["gate:plan", "tenant:<slug>"], "assignee": "agent:<harness>",
  "description": "Approve the Context map (this epic, its channel parents, Backlog, standing issues and first publishes) and the spec/brief together. Documents: Context brief · Decision record · Brand persona · Audience & hubs · Design tokens." }
```

then, after every publish issue exists and is `blockedBy` this one:

```json
post_task_update { "id": "<review ticket id>", "state": "in_review",
  "body": "Map and spec charted — please review both",
  "reviewRequest": { "blocking": true,
    "reason": "<goal, one line> · done when: <one line> · 4 milestones · <n> tickets · <n> decisions · skills stored: blog-agent, rules-blog, daily-brief · tools/models: <one line> · est. <cost / time>" } }
```

## 4. Publish issues — one per piece per channel per locale, under the channel parent

```json
{ "kind": "issue", "issueType": "complex", "project": "work", "parentId": "<Blog parent id>",
  "title": "Blog: <title> (en)",
  "description": "Hub: <hub> · persona: <tier/persona> · target query: <q> · kind: new · slot: <ISO with offset>. Skill: blog-drafter (draft) → blog-checker. Before review attach: draft (deliverable), checker verdict, rendered preview, models used. Publish only when state is done.",
  "labels": ["channel:blog", "locale:en", "tenant:<slug>", "hub:<hub>", "kind:new", "gate:artifact"],
  "due": "<2026-09-08T22:00:00+08:00>",
  "acceptanceCriteria": [
    { "text": "Draft matches Brand persona sample paragraph and claims policy" },
    { "text": "blog-checker verdict attached, all checks pass" },
    { "text": "Rendered preview attached (HTML) or Blog MCP preview URL on the issue" },
    { "text": "JSON-LD Article + byline (<Person|Organization>) present" },
    { "text": "Published at due; live URL on the issue" } ] }
```

Locale variant: same parent, `title: "Blog: <title> (de)"`, `labels` with
`locale:de`, `links: [{ "id": "<en master id>", "type": "relates" }]`,
description adds "Cascade: publish after EN master is done".

Instagram: `parentId: <Instagram parent id>`, `title: "Instagram: <hook>
(en)"`, labels `channel:instagram`, `locale:en`, `tenant:<slug>`,
`gate:artifact`; `due` in the IG timezone; description names the source
post and the card template.

Site page: `parentId: <Site parent id>`, `title: "Site: <page> (en)"`,
labels `channel:site`, `locale:en`, `tenant:<slug>`, `kind:new`,
`gate:artifact`.

## 4b. Backlog children — ideas and topics

Researched topic (the interview's topics beyond the first cycle, the
assessment's proposals, a graduated idea):

```json
{ "kind": "issue", "issueType": "complex", "project": "work", "parentId": "<Backlog id>",
  "title": "Topic: <working title>",
  "description": "Hub: <hub> · persona: <…> · target query: <q> · kind: new | refresh · channel: blog · source: <interview | owner comment | competitor scan | Performance Report <date>> · Blog MCP topic <id or none>. Graduates when blog-drafter creates its publish issue under the Blog parent.",
  "labels": ["stage:topic", "tenant:<slug>", "hub:<hub>", "channel:blog", "gate:none"] }
```

Idea (not yet researched — no hub or query required):

```json
{ "kind": "issue", "issueType": "complex", "project": "work", "parentId": "<Backlog id>",
  "title": "Idea: <one line>",
  "description": "<where it came from, one line>. Research (hub, persona, target query) turns it into stage:topic.",
  "labels": ["stage:idea", "tenant:<slug>", "gate:none"] }
```

Graduation (done by `blog-drafter`, or by the driver session for a
hand-picked topic): create the publish issue under the channel parent (§4)
with `links: [{id: <backlog child>, type: "relates"}]`, then
`complete_tasks {tasks: [{id: <backlog child>, workStats}]}` after a
`post_task_update {body: "Graduated → <new ticket>"}`. The child stays in
the Backlog as history; never delete it, never re-parent it.

## 5. Links — second pass, once every id exists

Every publish issue: `save_work {id, links: [{ "id": "<review ticket id>",
"type": "blockedBy" }]}`. Locale variants additionally `{ "id": "<en master
id>", "type": "blockedBy" }`. Parents, Backlog and standing issues are not
blocked. Never impose an order that is not a real dependency.

## 6. The `## Runs` block — what the owner sees on the epic

The last section of the epic description. Written once by the routines step
(chart step 8) with what was verified, then **rebuilt every day by
`daily-brief`** (its "Epic `## Runs` block" section): schedule per routine,
the next three slots with their tickets, routine health, and the last seven
briefs as one-liners. Fixed shape:

```
## Runs
schedule: brief 08:00 daily · drafter 02:00 nightly · publisher every 3 h · assessment Mon 09:00 (Asia/Singapore)
next: Mon 07 Sep 09:00 IG MTLY-190 (in review) · Mon 07 Sep 22:00 blog MTLY-177 · Tue 08 Sep 07:00 IG MTLY-191
routines: brief ok 03 Sep 08:00 · drafter ok 03 Sep 02:00 · publisher ok 03 Sep 07:40 · assessment never (first Mon 07 Sep)
briefs:
- 03 Sep: published 0 · awaiting 1 · failed 0 · next IG MTLY-190 Mon 09:00
- 02 Sep: published 0 · awaiting 0 · failed 0 · next none (plan gate)
```

Budget: the whole description is capped at 2048 characters. The daily brief
drops the oldest `briefs` line, then the third and second `next` entries,
until it fits; it never edits anything above `## Runs`. Nobody else writes
this block; `redo` and the driver session edit `## Rules` only.
