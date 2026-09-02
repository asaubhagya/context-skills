---
name: blog-publisher
description: >-
  Every 3 hours, publish exactly the Context Blog pieces the owner approved:
  Context issue `done`, `due` ≤ now < `due` + 3 h, no live link yet — through
  the Blog MCP (`article_set_status` forward, then `publish
  {assert_context_done: true, context_issue_id}`), post the live link on the
  issue, cascade to the checked locale variants, re-slot missed windows, and
  stay idempotent. Refuses anything that is not `done`.
depends: [rules-blog, rules]
license: MIT
version: 2
---

# Blog publisher — approved → live

You run every 3 hours as a routine, one tenant per run, and you are the only
skill that calls `publish`. Approval truth is Context: an issue is
publishable **only** when its state is `done` — the owner approved it
through the checker's `reviewRequest` — and its slot has arrived. You make
no content decisions; you verify, publish, record, and report.

## Inputs — fetch, never ask

1. **Tenant** — slug and epic id from the routine prompt (or
   `CONTEXT_BLOG_TENANT`). State the tenant before any write.
2. **Parent** — the epic's `Blog` parent (`list_tasks {kind: "issue",
   parentId: <epic>, label: "lane:blog"}` → `<blog parent>`; the routine
   prompt or the epic's `## Structure` may carry the id — confirm with
   `get_task`). Every blog piece is its child (`rules-blog` §3 Hierarchy).
3. **Session start** — Context `usage_guide`; Blog `usage_guide` +
   `get_capabilities`: `publish`, `article_get`, `article_set_status` in
   `tools[]` (else `rules-blog` §8: say which is missing, post the payload
   you would have sent on the issue, stop).
4. **Now** — the host clock in the tenant timezone (`tenant_get.timezone`).
   The window is `[due, due + 3 h)`.

## 1. Candidates

`list_tasks {kind: "issue", parentId: <blog parent>, state: "done",
includeClosed: true, label: "channel:blog"}` — follow `nextCursor` to the end — then
`get_task` each (the list is a hint; the record is the truth). Sort by
`dueAt`:

| condition | action |
|---|---|
| any activity text starts with `Published:` | live already — skip |
| `now < due` | early — leave it |
| `due ≤ now < due + 3 h` | publish now (§2) |
| `now ≥ due + 3 h`, no live link | missed window (§4) |

Instagram and site issues belong to their own publishers; this skill
touches `channel:blog` only.

## 2. Publish one issue

Pre-flight — every line must hold, otherwise skip the issue and post why on
it **once** (`post_task_update`, no repeat on later runs):

1. `get_task` now shows `state.category: "done"`. Never trust the list, never
   anything else — not `in_review`, not `started`.
2. The latest `docKind: "review"` document is a **pass** verdict and a
   preview (`docKind: "preview"` document or a preview URL in the updates)
   exists (`rules-blog` §4).
3. The article id: the `blog-article: <id>` line the drafter posted; if
   absent, `article_list {tenant_slug, locale}` and match
   `context_issue_id`. None → the drafter never finished; skip.
4. `article_get {tenant_slug, id}` →
   - `published` — already live: post `Published: <url>` if the comment is
     missing, then continue with the next issue;
   - `draft` — not checked on the platform; skip and report;
   - `in_review` — `article_set_status {tenant_slug, id, status: "approved",
     assert_context_done: true}` (one step forward), then continue;
   - `approved` — continue.

Publish: `publish {tenant_slug, article_id, assert_context_done: true,
context_issue_id: <issue id>}` → `{url, published_at, action,
publish_event_id}`. That assertion means "the Context issue is `done`"; you
verified it in step 1 of this run, never earlier.

Record, once: `post_task_update {id: <issue>, body: "Published: <url> at
<published_at> · publish_event <id> · article <id>", workStats}` (`role:
"publisher"`). The topic, when it has this `context_issue_id`:
`topics_upsert {items: [{id, status: "published"}]}`.

Errors: `rate_limited` → wait for the window, retry once. Anything else →
`post_task_update {body: "Publish failed: <code> — <message>"}`, no retry
this run, next issue. The daily brief reports it.

## 3. Cascade to locale variants

After a master is live (published now, or found `published`), take its
`relates` relations with `channel:blog` and a `locale:` other than the
master's. For each variant:

- **Eligible** — the latest `review` document is a pass, no owner comment
  requests changes after it, state `in_review` or `done`. If `in_review`:
  `post_task_update {id, state: "done", body: "Cascade: EN master <ticket>
  approved and live (rules-blog §5)", workStats}`. Then §2 for the variant
  with its own `due` (same slot as the master → same run).
- **Not eligible** — no verdict, bounce, escalate, or changes requested:
  skip and post why on the variant once. The owner decides.

Only the cascade moves a variant to `done`; a variant is never published on
its own approval unless the owner approved it in Context.

## 4. Missed windows

`now ≥ due + 3 h`, no live link, no `Missed window` comment yet:

1. Next free cadence slot: from `tenant_get.recurrence` (or the epic's
   `## Rules`), the first slot after now where no other `channel:blog`
   child of `<blog parent>` is due.
2. `save_work {id, due: <next slot>}` and `post_task_update {body: "Missed
   window <old due>: re-slotted to <new due> — <reason if known: host down,
   routine failed, verdict missing>"}`.
3. Its variants move with it (same new `due`).

Never publish late silently (`rules-blog` §5). An issue that already carries
a `Missed window` comment with the current `due` is left alone; the daily
brief reports it.

## 5. Idempotency

- Read before every write; dedupe on the `Published:` comment and on
  `article_get.status`.
- `publish` is idempotent on the platform (same item + content version →
  same URL, `action: "noop"` or `"refresh"`), but you still never call it
  when the comment exists.
- Each issue is touched at most once per run; one run at a time (the
  routine wrapper holds a lock — if it says a run is active, exit).
- No draft, review, verdict or `due` is ever changed here except the
  re-slot in §4.

## 6. Report and stop

Print one line for the routine log, which the daily brief reads:
`publisher: <ISO> · published <n> [<tickets>] · cascaded <n> · skipped <n>
(<reasons>) · missed <n> [<tickets>] · <ok | stopped: reason>`.

Stopped early → a handoff comment on the affected issue (rules §7).

## Never

Publish an issue whose state is not `done` · publish before `due` · publish
Instagram or site items · create issues · approve anything · rewrite a draft
· retry a failed publish more than once per run · store or echo a key value
(headless auth is the Blog Access Key by name: `BLOG_ACCESS_KEY`).
