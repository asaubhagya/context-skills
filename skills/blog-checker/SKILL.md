---
name: blog-checker
description: >-
  Independent quality gate between the maker and the human for Context Blog
  content: run the MACHINE checks through the Blog MCP (content_lint,
  preview_render), do the JUDGEMENT checks and the fact-check yourself, record
  a pass / bounce / escalate verdict on the Context issue (review doc +
  rendered preview + models), and raise the reviewRequest only on pass.
depends: [rules-blog, rules]
license: MIT
version: 1
attach: [templates/verdict.md, templates/checklist.md]
---

# Blog checker — maker → checker → human

You are the **checker**, never the maker. You did not write this draft, you
do not rewrite it, and you never soften a finding because fixing it would be
easy. `rules-blog` §4 is the contract: no draft reaches the owner without your
verdict, your preview and the models used, attached to its Context issue. A
checker run is a **separate call** from the maker's — if you drafted this
piece in this session, stop and hand the check to a fresh session.

## Inputs — fetch, never ask

1. **The draft** — either a Context document on the issue
   (`get_task {id}` → `list_documents {taskId}` → `get_document {id}` of the
   latest `docKind: "deliverable"` / `"draft"`), or the `article_upsert` /
   `page_upsert` payload the maker attached. Normalise to the Blog MCP
   content shape (`kind, title, description, sections[], faq[], seo{}`).
2. **The tenant** — from the issue's `tenant:` label: the epic's brand
   persona (`docKind: "brand-guide"`: adjectives, anti-adjectives, banned
   phrases, claims policy), audience & hubs (`docKind: "audience"`), design
   tokens (`docKind: "design-guide"`, the `.json`).
3. **Rotation** — the last 5 published pieces: `list_tasks {kind: "issue",
   parentId: <epic>, state: "done", label: "channel:blog"}` → their
   `style` (from the description or the draft's front matter), most recent
   first.
4. **The round** — Blog MCP `check_list {subject_ref: <issue id>}`: the
   number of prior verdicts on this issue + 1 is this round.
5. Session start: Context `usage_guide`; Blog `usage_guide` and
   `get_capabilities` — confirm `content_lint`, `preview_render`,
   `check_record` are in `tools[]` (else `rules-blog` §8: check locally,
   attach the payload, say which tool was missing).

## MACHINE checks — the Blog MCP does them

Call `content_lint` once with the draft **plus** the lint context — `style`,
`hub`, `locale`, `master` (EN master's slug/title/description for a locale
variant), `recent_styles`, `brand: {banned_phrases, own_hosts}`. When
`article_upsert` / `page_upsert` exist and return `warnings[]` (E3), those are
the same codes; use whichever you have, never both. Every `severity: "error"`
is a playbook violation:

| code | rule |
|---|---|
| `answer_missing` · `answer_too_long` | `seo.answer` present, ≤ 60 words |
| `h2_lead_missing` · `h2_lead_short` · `h2_lead_long` | each H2 followed by a 40–75-word paragraph |
| `structure_missing` | comparison · listicle · how-to carry a table or list |
| `faq_missing` · `faq_count` · `faq_answer_length` | FAQ 3–5 items × 80–150 words (articles) |
| `html_disallowed` | inline HTML only `em`, `strong`, `a[href=https?]` |
| `citations_few` | ≥ 2 outbound citations (own hosts excluded) |
| `numbers_few` | ≥ 2 numeric statistics |
| `artifact_missing` | ≥ 1 original artifact (`original: true` or a `quote.cite`) |
| `hub_missing` | hub assigned |
| `locale_not_localised` | variant slug / title / description differ from the master |
| `banned_phrase` | brand banned phrases absent |
| `style_rotation` (warn) | style differs from the last piece, ≤ 2 of the last 5 |
| `first_person_heavy` (warn) | first-person singular ≤ 2.5 % of words |

If `content_lint` is unavailable, run the same table by hand and say so in
the verdict (`machine: local`).

## JUDGEMENT checks — you do them

Read the whole draft once as the reader, once as the brand. Record each as
`pass | fail | n/a` with a one-line note (`templates/checklist.md`):

- **Voice** — the brand adjectives are audible, none of the anti-adjectives;
  compare against the persona's approved sample paragraph. A `first_person_heavy`
  warning is a fail unless the byline is a named human speaking about their
  own experience.
- **Localisation, not translation** — a locale variant reads as written for
  that market (examples, currency, units, idiom, the App Store link's
  storefront), not as a sentence-by-sentence rendering of the master.
- **Original artifact is honest** — whatever is marked `original: true` is a
  proprietary stat, screenshot, tested result or named quote the brief or the
  maker's notes actually back; a marker on ordinary prose is a fail.
- **Design tokens applied** — open the rendered preview: heading/body fonts,
  accent, background match the tenant's `design-tokens.json`.
- **Claims policy** — nothing the persona's *claims we never make* forbids;
  no medical, legal, financial or compliance claim (HIPAA, GDPR compliance,
  "clinically shown", "guaranteed") the decision record did not approve. Any
  hit here is an **escalate**, whatever the round.
- **Structure reads** — the answer paragraph answers the target query; the
  H2s could stand as a table of contents; the CTA is one, not three.

## Fact-check procedure

For every URL in `content_lint.stats.urls` and every number the draft states
as a fact:

1. Fetch the URL (browser, fetch tool or `curl -sL`). Not resolving (4xx/5xx,
   parked page, redirect to a home page) → `facts: fail` with the URL.
2. Search the fetched page for the exact figure the draft attributes to it
   (`12 %`, `4 minutes`, `$7.99`), allowing for formatting. Not found →
   `facts: fail`, quote what the page *does* say.
3. Numbers marked `original: true` are checked against the brief / the
   maker's notes on the issue, not the web; absent there → fail.
4. Record every URL with `resolved: yes|no` and every statistic with
   `found: yes|no` in the verdict. Never mark a fact you did not look up.

## Verdict

- **pass** — no `error` from the machine checks, every judgement check
  `pass` or `n/a`, every fact verified.
- **bounce** — anything else, **round ≤ 2**. List every finding with its
  `path`, what the maker must change, and nothing else; the maker fixes, a
  new checker call runs round + 1.
- **escalate** — round 3 would be a bounce (two bounces already recorded in
  `check_list`), **or** any claims-policy / safety / legal finding, **or** a
  fact you could not verify either way (source unreachable, ambiguous). The
  owner decides; you do not guess.

## What you post on the Context issue — every run

1. `send_file {taskId: <issue>, filename: "checker-verdict-r<n>.md", title:
   "Checker verdict, round <n>", docKind: "review", content: <templates/verdict.md filled>}`
2. `preview_render {tenant_slug, kind, title, description, sections, faq,
   seo, design_tokens: <design-tokens.json>}` → `send_file {taskId, filename:
   "preview-r<n>.html", title: "Rendered preview, round <n>", docKind:
   "preview", content: <html>}` and put `url` in the update body.
3. `check_record {tenant_slug, subject_kind, subject_ref: <issue id>, round,
   verdict, findings: <the checks table as JSON>, models: {maker, checker}}`
   → `check_id` (in the update body).
4. `post_task_update {id: <issue>, body: "Checker round <n>: <verdict> — <k>
   findings · preview <url> · check <check_id> · maker <model> · checker
   <model>", workStats: {harness, model, role: "checker", thinking, tokens,
   cost, duration, skills: ["blog-checker"], tools: ["content_lint",
   "preview_render", "check_record"]}}`
   - bounce: `state: "started"`, `assignee` back to the maker, no `reviewRequest`.
   - escalate: `state: "blocked"`, body starts `ESCALATE:` and names the
     finding; no `reviewRequest` — the owner reads the verdict doc.

## Only on pass — raise the gate

```
post_task_update {id: <issue>, state: "in_review",
  body: "Checker passed (round <n>) — draft, verdict, preview and models attached",
  reviewRequest: {blocking: true, reason: "<title> · <channel>/<locale> · hub <hub> · <words> words · <citations> citations verified · preview <url> · maker <model> · checker <model>"}}
```

Then hand over: `get_events {cursor, waitMs: 25000}` belongs to the driver
session, not to you. Never a second `reviewRequest`, never `publish`.

## Never

Rewrite the draft · pass with an unverified fact · bounce a third time ·
skip the preview · verify a fact from memory · check your own draft · store
or echo a key value · approve anything: the human does that.
