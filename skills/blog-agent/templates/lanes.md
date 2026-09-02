# Chart payloads — tenant epic, standing lanes, first publishes

Exact `save_work` shapes. Fill `<…>`; keep every key. `project: "work"`
unless the owner named another space. `description` is capped at 2048
chars — link the documents, never paste them.

## 1. Tenant epic — one per tenant

```json
{ "kind": "epic", "project": "work", "title": "<Brand> Blog",
  "description": "## Goal\n<destination, 2–3 sentences>\n\n## Done when\n<outputs + proof>\n\n## Milestones\n1. Map + spec approved (gate: plan)\n2. Brand, audience, design docs approved (gate: artifact)\n3. First <n> pieces published (gate: artifact each)\n4. Routines live: daily brief · drafter · publisher · assessment (gate: final)\n\n## Rules\n- tenant: `<slug>` · channels: <…> · tier: <…>\n- cadence: <…> · timezone: <…> · locales: <en master, de full, fr reduced>\n- voice: <adjectives> / never <anti-adjectives>; claims: <policy>\n- skills: blog-agent, rules-blog, daily-brief, blog-checker\n- Tools & models: drafts · <model> · <thinking> · <cost band>; checker · <model>; images · <tool>\n- keys by NAME only: OPENROUTER_API_KEY, POSTIZ_API_KEY, BLOG_ACCESS_KEY\n- daily brief issue: <id, filled after step 2>\n- no invented anecdotes, numbers or quotes — only facts from the attached briefs; say 'I' only for things the owner told you\n\n## Out of scope\n- <…>",
  "labels": ["tenant:<slug>", "wayfinder:map"] }
```

Re-run (returning tenant): `search {query: "<Brand> Blog"}` → if an epic with
`tenant:<slug>` exists, `save_work {id, description}` updates it — never a
second epic.

## 2. Standing lane issues — exactly six, children of the epic

Create in this order; the Daily Brief issue first. All `issueType: "complex"`,
`parentId: <epic>`, `project: "work"`, `assignee` empty. Re-run: `list_tasks
{kind: "issue", parentId: <epic>, label: "lane:<x>"}` before creating.

| Title | labels | description (gist) |
|---|---|---|
| `Daily Brief` | `["lane:brief", "brief:daily", "tenant:<slug>", "gate:none"]` | One comment per day from the daily-brief routine (08:00 <tz>). A missing brief is the alert. Skill: daily-brief. |
| `Idea Lane` | `["lane:idea", "tenant:<slug>", "gate:none"]` | Rolling backlog of ideas from owner, comments, competitor scans; each idea one comment; graduates to Topic Lane. |
| `Topic Lane` | `["lane:topic", "tenant:<slug>", "gate:none"]` | Scheduled topics with hub, persona, target query, slot; the drafter reads from here. |
| `Audience & Persona` | `["lane:audience", "tenant:<slug>", "gate:artifact"]` | Living persona tiers and hubs; revisions of the Audience & hubs document attach here. |
| `AEO/SEO Health` | `["lane:aeo-seo", "tenant:<slug>", "gate:none"]` | Weekly: target-query coverage, JSON-LD validity, sitemap, AI-visibility probe results (Hosted). |
| `Performance Report` | `["lane:performance", "tenant:<slug>", "gate:none"]` | Weekly assessment comment: traffic, top posts, what to refresh (`kind:refresh` issues spawn from here). |

Payload shape (one example):

```json
{ "kind": "issue", "issueType": "complex", "project": "work", "parentId": "<epic id>",
  "title": "Daily Brief",
  "description": "Standing issue. The daily-brief routine posts one comment per day at 08:00 <tz>: published · awaiting approval · failed/skipped · next 24h · routine health. A missing brief is the outage alert. Skill: daily-brief. Ships nothing itself.",
  "labels": ["lane:brief", "brief:daily", "tenant:<slug>", "gate:none"] }
```

After the six exist: `save_work {id: <epic>, description: <Rules with the
Daily Brief issue id filled in>}`.

## 3. Map + spec review ticket (the one combined gate)

```json
{ "kind": "issue", "issueType": "complex", "project": "work", "parentId": "<epic id>",
  "title": "Map + spec review", "labels": ["gate:plan", "tenant:<slug>"], "assignee": "agent:<harness>",
  "description": "Approve the Context map (this epic, its lanes and first publishes) and the spec/brief together. Documents: Context brief · Decision record · Brand persona · Audience & hubs · Design tokens." }
```

then, after every ticket exists and is `blockedBy` this one:

```json
post_task_update { "id": "<review ticket id>", "state": "in_review",
  "body": "Map and spec charted — please review both",
  "reviewRequest": { "blocking": true,
    "reason": "<goal, one line> · done when: <one line> · 4 milestones · <n> tickets · <n> decisions · skills stored: blog-agent, rules-blog, daily-brief · tools/models: <one line> · est. <cost / time>" } }
```

## 4. First publish issues — one per piece per channel per locale

```json
{ "kind": "issue", "issueType": "complex", "project": "work", "parentId": "<epic id>",
  "title": "Blog: <title> (en)",
  "description": "Hub: <hub> · persona: <tier/persona> · target query: <q> · kind: new · slot: <ISO with offset>. Skill: blog-agent (draft) → blog-checker. Before review attach: draft (deliverable), checker verdict, rendered preview, models used. Publish only when state is done.",
  "labels": ["channel:blog", "locale:en", "tenant:<slug>", "hub:<hub>", "kind:new", "gate:artifact"],
  "due": "<2026-09-08T22:00:00+08:00>",
  "acceptanceCriteria": [
    { "text": "Draft matches Brand persona sample paragraph and claims policy" },
    { "text": "blog-checker verdict attached, all checks pass" },
    { "text": "Rendered preview attached (HTML) or Blog MCP preview URL on the issue" },
    { "text": "JSON-LD Article + byline (<Person|Organization>) present" },
    { "text": "Published at due; live URL on the issue" } ] }
```

Locale variant: same, `title: "Blog: <title> (de)"`, `labels` with
`locale:de`, `links: [{ "id": "<en master id>", "type": "relates" }]`,
description adds "Cascade: publish after EN master is done".

Instagram: `title: "Instagram: <hook> (en)"`, labels `channel:instagram`,
`locale:en`, `tenant:<slug>`, `gate:artifact`; `due` in the IG timezone;
description names the source post and the card template.

Site page: `title: "Site: <page> (en)"`, labels `channel:site`, `locale:en`,
`tenant:<slug>`, `kind:new`, `gate:artifact`.

## 5. Links — second pass, once every id exists

Every lane issue and publish issue: `save_work {id, links: [{ "id": "<review
ticket id>", "type": "blockedBy" }]}`. Locale variants additionally
`{ "id": "<en master id>", "type": "blockedBy" }`. Never impose an order
that is not a real dependency.
