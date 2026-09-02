---
name: rules-blog
description: >-
  Rules for every Context Blog workflow, layered on the Context harness: the
  three forks (what · how often · output tier), the label vocabulary, the
  checker and publish gates, key names only, daily brief first, and which
  server does what. Every blog, site and Instagram skill inherits this.
depends: [rules]
license: MIT
version: 3
---

# Context Blog — rules

These rules apply whenever an agent works on **Context Blog** content — blog
posts, a site or landing page, Instagram posts — for a **tenant** (one brand,
one site, e.g. `getmeetly.ai`). They sit on top of the Context harness
(`rules`): everything there still holds (usage guide first, grill-me +
wayfinder verbatim, one map + one combined gate, per-ticket documents,
handoff before stopping). This file adds only what is blog-specific.

## 1. Two servers, one link

| Server | Owns | Never |
|---|---|---|
| **Context MCP** (`app.onecontext.me`) | work: epic, issues, labels, `due`, documents, comments, `reviewRequest`, approvals, `get_events` | content bytes, publishing |
| **Context Blog MCP** (`blog.onecontext.me/api/mcp`) | tenants, brand/hubs/topics, drafts, preview render, `publish`, sites, domains, analytics, AI-visibility | tracking, approving, reading Context |

Hold both connections. *You* carry the link: every piece of content is **one
Context issue**, and its id rides as `context_issue_id` on every Blog MCP
call that accepts one. Call each server's `usage_guide` once per session,
and `get_capabilities` on the Blog MCP before you rely on a content tool.
Context stays thin: there are no server-side loops; every routine runs on
the host that owns the workflow.

## 2. The three forks

Every Context Blog interview opens on three forks. Ask them, recommend, and
record the answer in the decision record — never assume.

- **WHAT** — blog · site / landing page · Instagram — any combination.
- **HOW OFTEN** — once · recurring, with a cadence per channel.
- **OUTPUT tier**
  - **Artifact** — documents on the Context issue; the owner self-publishes.
  - **Review & self-publish** — Artifact + standing lanes, a schedule and the
    checker; the owner still publishes.
  - **Hosted** — Review + published on Context sites at the owner's domain,
    analytics and the AI-visibility probe.

Credential-less hosts (ChatGPT, claude.ai) can do everything except
Instagram publishing and the AI-visibility probe; recommend Claude Code or
Codex for the full loop. Say what *this* host can do as a fact (§8).

## 3. Label vocabulary

One Context issue per publish, one channel per issue. Native fields first:
`due` = the publish time (`publishAt`, ISO 8601 with offset), `parentId` =
the tenant's **channel parent** issue (`Blog`, `Instagram`, `Site` — label
`lane:<channel>`, itself a child of the tenant epic), `issueType:
"complex"`. Labels, exactly these keys:

| Label | Values | Required |
|---|---|---|
| `channel:` | `blog` · `site` · `instagram` | always |
| `locale:` | BCP-47 lower-case, e.g. `en`, `de`, `fr` | always |
| `tenant:` | tenant slug, e.g. `meetly` | always |
| `hub:` | hub slug from the audience doc, e.g. `private-transcription` | blog |
| `kind:` | `new` · `refresh` | blog, site |
| `lane:` | `blog` · `instagram` · `site` · `backlog` · `brief` · `aeo-seo` · `performance` | channel parents and standing issues only |
| `stage:` | `idea` · `topic` | Backlog children only |
| `gate:` | `artifact` · `final` · `none` (harness) | always |
| `brief:daily` | — | the Daily Brief issue only |

A locale variant is its own issue, linked `relates` to the EN master and
carrying the same `hub:`/`kind:` labels. Title format:
`<Channel>: <title> (<locale>)`.

### Hierarchy

```
<Brand> Blog (epic, tenant:<slug>)
├── Blog / Instagram / Site   lane:<channel>  — every piece of that channel is a child
├── Backlog                   lane:backlog    — stage:idea and stage:topic children; done stays
├── Daily Brief · AEO/SEO Health · Performance Report   standing issues
└── Map + spec review         gate:plan
```

`list_tasks {parentId}` returns **direct children only**, so pieces are
looked up through their channel parent — `list_tasks {parentId: <Blog
parent>, label: "channel:blog", …}` — never through the epic. Resolve the
parent once per run with `list_tasks {kind: "issue", parentId: <epic>,
label: "lane:<channel>"}` or read its id from the epic's `## Structure`;
verify with `get_task` before writing under it. A piece's `parent` is its
channel parent and the parent's `parent` is the epic that carries the brand
documents. A Backlog child graduates by being marked done with a
`Graduated → <ticket>` comment and a `relates` link to the new publish
issue; it is never deleted or re-parented.

## 4. Checker gate — maker → `blog-checker` → human

No draft reaches the owner unchecked. Before any `reviewRequest` on a
content issue, the issue must carry, attached or in its latest update:

1. the draft itself (`send_file`, `docKind: "deliverable"` for the final
   text, `draft` for intermediates);
2. the **checker verdict** — the `blog-checker` pass (facts against the
   brief, claims policy, voice adjectives, locale, structured data, links)
   with pass/fail per check and what the maker changed in response;
3. the **rendered preview** (`docKind: "preview"`, self-contained HTML) or
   the Blog MCP preview URL;
4. the **models used** (maker, checker) in the update body and `workStats`.

Then one `post_task_update {state: "in_review", reviewRequest: {reason,
blocking: true}}` and wait on `get_events`. Never assume approval. The maker
and the checker must not be the same session prompt; a checker run is a
separate call with the brief and the draft as its only inputs.

## 5. Publish gate

- `publish` (Blog MCP, or a Postiz/Instagram schedule) is called **only** for
  an issue whose Context state is `done` — approved through the gate above.
  Pass the issue id; the server refuses without it.
- **EN master approval cascades**: when the EN master is `done`, its locale
  variants may be published once their own checker verdict is attached and
  their state is `done` — locale variants are approved by the cascade, not by
  a second human read, unless the owner asked for per-locale review in the
  decision record.
- Publish at `due`, never earlier; a missed window is reported in the daily
  brief and re-slotted, never silently published late.
- Report the live URL on the issue, then `complete_tasks` with `workStats`.
- Refresh (`kind:refresh`) goes through the same gate as new.

## 6. Keys — names and scope only

Ask for key **names** and where they are kept; never a value, never "paste
it here". If a value appears in chat, do not store, echo or use it — say so,
name the key, and ask the user to put it in their host's secret store.

| Key name | Scope | Needed for |
|---|---|---|
| `OPENROUTER_API_KEY` | model calls, drafter / checker | any tier that drafts headlessly |
| `POSTIZ_API_KEY` | schedule Instagram posts | Instagram publishing (Claude Code / Codex only) |
| `BLOG_ACCESS_KEY` | Blog MCP bearer, headless routines | Hosted tier routines |
| `GA4_MEASUREMENT_ID` | BYO analytics (not a secret, still by name) | Hosted tier |

Interactive hosts authenticate to the Blog MCP with OAuth — no key needed.

## 7. Daily brief first

Any recurring workflow installs the `daily-brief` skill and its routine
**before** any drafter, publisher or assessment routine, posting to the
tenant epic's `Daily Brief` issue (`brief:daily`, `lane:brief`). A missing
brief is the outage alert; there is no server-side fallback by design.
Routine order: daily brief → drafter → publisher → assessment.

## 8. Graceful degradation by host

Discover, do not assume: `get_capabilities` on both servers, and what this
host can run. If a Blog MCP tool the skill names is absent from
`get_capabilities.tools`, say "not available yet on this server", attach the
payload you would have sent as a document on the issue, and continue.

| Capability | Claude Code / Codex / Cursor | claude.ai | ChatGPT |
|---|---|---|---|
| Interview, chart, documents, review gates | yes | yes | yes |
| Fetch site / competitors / owner posts | yes | yes (web) | yes (browse) |
| Write skill files (`setup` files mode) | yes | no → links + inlined protocol | no → links + inlined protocol |
| Install routines (launchd / cron) | yes | no → Claude scheduled prompt, or hand the owner the routine text | no → ChatGPT scheduled prompt |
| Rendered preview attached | HTML via `send_file` | HTML via `send_file` | `preview.html` via `send_file` (no binary upload) |
| Blog MCP content tools (Hosted) | OAuth | OAuth | OAuth |
| Instagram publishing (`POSTIZ_API_KEY`) | yes | no → owner self-publishes | no → owner self-publishes |
| AI-visibility probe | yes | no | no |
| Wait for approval | `get_events` long poll | bounded `get_task` polling | bounded `get_task` polling, then tell the user where to approve |

## 9. Safety and scope

- No invented facts, numbers, quotes or anecdotes: only what the brief, the
  owner's writing and fetched sources say; cite the source in the draft's
  notes. No medical, legal, financial or compliance claims (e.g. HIPAA) the
  owner did not explicitly approve in the decision record.
- One tenant per session; state it before any write.
- Never publish, schedule or delete outside the gates above; never change
  sharing of a map through MCP tools.
- Everything the reviewer needs lives on the issue, never only in chat.

## Quick reference

| Moment | Call |
|---|---|
| Session start | Context `usage_guide` · Blog `usage_guide` · Blog `get_capabilities` |
| New piece | `save_work {kind: "issue", issueType: "complex", parentId: <channel parent>, title, labels: [channel, locale, tenant, hub, kind, gate], due}` |
| Checker done | `send_file` draft + verdict + preview → `post_task_update {state: "in_review", reviewRequest}` |
| Approved | `publish {context_issue_id}` at `due` → `post_task_update {body: live URL}` → `complete_tasks` |
| Daily | `daily-brief` on the `Daily Brief` issue |
