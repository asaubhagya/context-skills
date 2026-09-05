---
name: instagram-publisher
description: >-
  Every 3 hours, post exactly the Instagram carousels the owner approved:
  Context issue `done`, `due` ≤ now < `due` + 3 h, no live link yet — upload
  the slides to Postiz with `POSTIZ_API_KEY` (by name, host only), schedule
  the post on the tenant's Instagram channel found by name, `publish` the
  instagram_post on the Blog MCP, and post the Postiz id, then the permalink,
  on the issue. Dedupe guard before any call; idempotent; refuses anything
  that is not `done`; degrades to owner self-publish without a key.
depends: [rules-blog, rules]
license: MIT
version: 3
attach: [scripts/postiz.sh]
---

# Instagram publisher — approved → scheduled → live

You run inside the tenant's 3-hourly publisher routine (after the blog
pass), one tenant per run, and you are the only skill that talks to Postiz.
Approval truth is Context: an issue is postable **only** when its state is
`done` — the owner approved it through the checker's `request_review` — and
its slot has arrived. You make no content decisions; you verify, post,
record, report.

## Inputs — fetch, never ask

1. **Tenant** — slug, epic id, timezone from the routine prompt (or
   `CONTEXT_BLOG_TENANT`). State the tenant before any write.
2. **Parent** — the epic's `Instagram` parent (`list_issues {parent_id:
   <epic>, label: "lane:instagram"}` → `<instagram parent>`; the routine
   prompt or the epic's `## Structure` may carry the id — confirm with
   `get_issue`). Every Instagram issue is its child (`rules-blog` §3).
3. **Session start** — Context `start_context`; Blog MCP `usage_guide` +
   `get_capabilities`: `publish`, `instagram_post_list` in `tools[]` (else
   `rules-blog` §8).
4. **Key** — `POSTIZ_API_KEY` by name, read inside `scripts/postiz.sh` (env
   or the host's secret store). `postiz.sh integrations` exits 3 without it:
   post `Publish skipped: POSTIZ_API_KEY not available on this host — owner
   self-publishes` on the issue once and stop. Never echo, log or store the
   value.
5. **Channel** — `postiz.sh integrations` → the entry with `identifier:
   "instagram"` (not `disabled`) whose `name` matches the tenant's Instagram account in the
   design tokens / epic `## Rules` (Meetly: the one named "Meetly …"). One
   match → its `id` for this run. Zero or several → post why on the issue
   and stop. Never hardcode an integration id in a skill, prompt or repo.
6. **Now** — the host clock in the tenant timezone. Window `[due, due + 3 h)`.

## 1. Candidates

`list_issues {parent_id: <instagram parent>, state: "done", includeClosed:
true, label: "channel:instagram"}` — follow `nextCursor` — then `get_issue`
each (the list is a hint; the record is the truth). Sort by `dueAt`:

| condition | action |
|---|---|
| activity text starts with `Published:` | live — skip |
| activity text starts with `Scheduled:` and none with `Published:` | scheduled earlier — §4 (permalink pass) |
| `now < due` | early — leave it |
| `due ≤ now < due + 3 h` | post now (§2) |
| `now ≥ due + 3 h`, nothing scheduled | missed window (§5) |

Blog and site issues belong to `blog-publisher`; this skill touches
`channel:instagram` only.

## 2. Post one issue

Pre-flight — every line must hold, otherwise skip and post why on the
issue **once** (`post_comment`, never repeated on later runs):

1. `get_issue` now shows `state.category: "done"`. Not `in_review`, not
   `in_progress`, never the list's word for it.
2. The latest `docKind: "review"` document is a **pass** verdict and the
   slide previews (`docKind: "preview"`) or the asset ids are on the issue.
3. The post id: the `instagram-post: <id>` line the drafter posted; if
   absent, `instagram_post_list {tenant_slug}` and match
   `context_issue_id`. None → the drafter never finished; skip.
4. **Dedupe guard** — all three, before any Postiz write:
   - no `Scheduled:` / `Published:` update on the issue (re-read now);
   - `instagram_post_list` shows the post not `published` (a `published`
     row means a `publish_events` entry exists → post `Published:` from it
     and continue with the next issue);
   - `postiz.sh posts <due − 1 h> <due + 1 h>` has no post on this
     integration whose content starts with the caption's first line. If it
     has one, record it as `Scheduled: postiz <id> …` and do not create
     another.

Post:

1. Slides, in order: the assets of the post (`instagram_post_list` →
   `slides[]` → `public_url`, or the attached previews). `curl -sSL -o` each
   to a temp dir, `postiz.sh upload <file>` → `{id, path}`; keep the order.
2. Body file (never inline the key; the script adds it):
   ```json
   {"type": "schedule", "date": "<due, ISO 8601 UTC>", "shortLink": false, "tags": [],
    "posts": [{"integration": {"id": "<integration id>"},
               "value": [{"content": "<caption>", "image": [{"id": "<id>", "path": "<path>"}, …]}],
               "settings": {"__type": "instagram", "post_type": "post"}}]}
   ```
   `date` = `due` (already inside the window → Postiz posts at once).
   `postiz.sh schedule <body.json>` → the post id(s).
3. Blog MCP: `publish {tenant_slug, instagram_post_id, assert_context_done:
   true, context_issue_id}` → `{url, published_at, action, publish_event_id}`.
   That assertion means "the Context issue is `done`"; you verified it in
   step 1 of this run, never earlier. If the server refuses because the row
   is not `approved` and no `instagram_post_set_status` tool exists on this
   contract, post `Publish record pending: <code> — <message>` on the issue
   and still keep the Postiz schedule (the owner approved; the audit row
   waits for the server slice); never retry more than once per run.
4. Record once: `post_comment {parent_id: id, body: "Scheduled: postiz
   <post id> at <date> · instagram_post <id> · publish_event <id or
   pending>", workStats}` (`role: "publisher"`).

Errors: `postiz.sh` non-zero → `post_comment {parent_id: id, body: "Publish
failed: postiz <command> — <http status / message>"}`, no retry this run,
next issue. Never leave a half-scheduled post silent: if `schedule` failed
after uploads, say so; uploads are harmless. The daily brief reports it.

## 3. Owner adds music

Instagram cannot attach music to an image carousel through the API. When
the issue asks for music, the owner posts from the Instagram app instead:
post `Owner posts manually (music requested): slides and caption attached
above` once and treat the issue as scheduled; §4 still records the
permalink when the owner pastes it.

## 4. Permalink pass

For issues with `Scheduled:` and no `Published:`: `postiz.sh posts <due −
1 h> <due + 1 h>` → the post with that id. State `PUBLISHED` with a
`releaseURL` → `post_comment {parent_id: id, body: "Published: <releaseURL>
at <publishDate> · postiz <id>"}`. State `ERROR` → `Publish failed: postiz
reported <error>` once; the owner decides. Anything else → wait for the
next run. A comment from the owner containing an `instagram.com/p/` URL
counts as the permalink.

## 5. Missed windows

`now ≥ due + 3 h`, nothing scheduled, no `Missed window` comment: next free
Instagram slot from the epic's `## Rules` / decision record (Meetly: Mon
09:00 · Tue 07:00 · Thu 06:00 · Thu 21:00 Asia/Singapore) where no other
`channel:instagram` child of `<instagram parent>` is due →
`update_issues {ids: [id], due: <next slot>}` + `post_comment {parent_id:
id, body: "Missed window <old due>: re-slotted to <new due> — <reason if
known>"}`. Never post late silently. An issue already carrying a `Missed
window` comment with the current `due` is left alone.

## 6. Idempotency

Read before every write; dedupe on the `Scheduled:` / `Published:`
comments, on `instagram_post_list` status and on the Postiz window
listing. Each issue is touched at most once per run; one run at a time (the
routine wrapper holds a lock). Nothing here edits a caption, a slide, a
verdict or `due` except the re-slot in §5. Deleting a Postiz post
(`postiz.sh delete`) happens only when the owner asks on the issue.

## 7. Report and stop

Print one line for the routine log, which the daily brief reads:
`instagram-publisher: <ISO> · scheduled <n> [<tickets>] · live <n> · skipped
<n> (<reasons>) · missed <n> · <ok | stopped: reason>`. Stopped early → a
handoff comment on the affected issue (rules §7).

## Never

Post an issue whose state is not `done` · post before `due` · touch blog or
site items · create issues · approve anything · edit a caption or slide ·
create a second Postiz post for the same issue · hardcode an integration
id · retry a failed schedule more than once per run · store, echo or log a
key value (`POSTIZ_API_KEY`, `BLOG_ACCESS_KEY` by name only).
