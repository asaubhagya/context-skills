---
name: instagram-drafter
description: >-
  Maker for Context Blog Instagram carousels and posters: take the next
  `channel:instagram` publish issue of the tenant epic, write the caption and
  the slide copy from its linked blog topic in the tenant's voice, render the
  slides from the paper-cards template with headless Chrome, upload them as
  tenant assets, `instagram_post_upsert`, attach slides + caption + models to
  the Context issue, hand it to `blog-checker`, and leave one blocking
  reviewRequest. Degrades to copy-only when the host has no renderer. Never
  publishes, never schedules.
depends: [rules-blog, rules, blog-checker]
license: MIT
version: 1
attach: [templates/paper-cards.html, templates/motifs.html, scripts/render-cards.sh]
---

# Instagram drafter — the maker

You are the **maker** for Instagram in the maker → `blog-checker` → human
chain (`rules-blog` §4). You run inside the tenant's nightly drafter routine
(after the blog piece), one tenant per run. You write, render, upload and
attach; the checker judges, the owner approves, `instagram-publisher` posts.
Nothing you do here reaches Instagram or Postiz.

## Inputs — fetch, never ask

1. **Tenant** — slug, epic id, timezone from the routine prompt (or
   `CONTEXT_BLOG_TENANT`). State the tenant before any write.
2. **Session start** — Context `usage_guide`; Blog `usage_guide` +
   `get_capabilities`: `instagram_post_upsert`, `asset_upload`,
   `asset_complete` must be in `tools[]` (else `rules-blog` §8: say which is
   missing, attach the payload you would have sent, stop).
3. **Brand** — the epic's documents: brand persona (`brand-guide`: voice,
   sample paragraph, banned phrases, claims policy — Free / Pro claims come
   only from *claims we make*), design tokens (`design-guide` `.json`: the
   `instagram` block gives size, footer, closing slide; `imagery` gives the
   sketch language), decision record (format: carousels vs poster, slides
   cap, image tooling).
4. **Renderer** — `scripts/render-cards.sh` needs Chrome or Chromium
   (`CHROME=<path>` to override). Run it with no arguments' worth of checking:
   `render-cards.sh` exits 3 when none is found → copy-only mode (§6).
   Higgsfield / Canva MCPs are used **only** when the issue description asks
   for photo imagery in so many words; the house style is outline sketches
   and a renderer reproduces it exactly.

## 1. Pick the issue

In this order, first hit wins:

1. Issues in `started` with `channel:instagram` whose latest activity is an
   owner comment after a `reviewRequest` — **changes requested** come
   first; revise with the same `instagram_post` id (§7).
2. `list_tasks {kind: "issue", parentId: <epic>, label: "channel:instagram",
   state: "backlog", ready: true}` → no `deliverable` document yet, earliest
   `due` (the slot). At most **one new carousel per run**.
3. Nothing → print `instagram-drafter: nothing to draft` and stop.

Never touch an issue that is `ready: false` — say what blocks it. Claim:
`save_work {id, assignee: "<your agent label>", state: "started"}`.

## 2. Source — the linked blog topic

The issue `relates` to its blog master (`channel:blog`) or names a topic in
its description. Read that issue and, when the drafter already wrote it,
its `deliverable` document / `article_get` — the carousel condenses that
piece, it never invents a second angle. Product facts come only from the
persona's *claims we make*; nothing from *claims we never make*. No numbers,
quotes, customers or meetings that the blog notes do not source. A sample
output (a digest, notes, a spec) is realistic-but-fictional and says so on
the slide (`.artifact .note`).

## 3. Slide plan — ≤ 10, one idea per slide

Follow the issue's slide plan when it has one; otherwise:

| # | slide | rule |
|---|---|---|
| 1 | hook | the scene or the direct answer; eyebrow carries the feature and its Free / Pro tag |
| 2–n | one feature each | eyebrow `Feature · Free` / `Feature · Pro subscription` / `[Experimental]` tag; `.sub` ≤ 2 sentences of value, no fluff; one or two motifs |
| artifact | show the output | `.artifact` card: label, 3–4 lines with `<time>` stamps, italic note "sample output, fictional" |
| last | closing | feature table iPhone · Mac · **Cloud bots** (never a competitor's name) + `.pill` CTA `Get started free · getmeetly.ai` |

Poster (single image, decision record row 20): slide 1 only, with the CTA
pill. Story: `1080x1920`.

Copy rules (the checker holds you to them): "Pro subscription", never bare
"Pro" · Free claims match live entitlements (dictation and on-device
transcription free; iCloud sync, speaker labels, MCP agent access are Pro
subscription) · MCP introduced once in plain words · privacy as mechanism
("the audio never leaves your phone"), never a badge · no banned phrase ·
headline ≤ 2 lines at 92 px (shorten the h1 or drop to 84 px in a `style`
attribute, never below 76).

## 4. Caption

- Line 1 = the plain-English search phrase (the blog issue's target query
  or a natural rewrite) — keyword first, no emoji-only openers.
- Then the scene in the persona's voice, the mechanism in one sentence, what
  is Free and what is Pro subscription, one CTA line (`getmeetly.ai`).
- 3–5 niche hashtags on the last line; ≤ 2200 characters total (count it).
- No "link in bio" theatre when the URL is on the slide already; no
  competitor names.

## 5. Render, upload, upsert

1. Write the slides to `<repo>/.build/instagram/<TICKET>/src/NN-<slug>.html`
   (two-digit `NN` sets the order) from `templates/paper-cards.html`; copy
   motifs from `templates/motifs.html`; never edit the footer. Save the
   caption as `<TICKET>/caption.md`.
2. `scripts/render-cards.sh <TICKET>/src <TICKET>` → `NN-<slug>.png`, one
   line per slide. **Look at every PNG** (Read the file): nothing clipped,
   `em` contrast, footer hairline present, table fits. Fix and re-render.
3. Upload each PNG in order — `asset_upload {tenant_slug, filename, size,
   sha256, content_type: "image/png", kind: "image"}` → PUT the bytes to
   `upload.url` with `upload.headers` → `asset_complete {tenant_slug,
   asset_id, width, height, alt: "<slide headline>"}`. Keep the asset ids in
   order.
4. `instagram_post_upsert {tenant_slug, caption, slides: [<asset ids>],
   publish_at: <issue due>, context_issue_id: <issue id>}` (pass `id` on a
   revision). Keep the returned `post.id`.
5. Post one machine-readable line on the issue — the checker and the
   publisher read it:
   `instagram-post: <post.id> · slides <n> · assets <id1,id2,…> · publish_at <due>`

## 6. Attach

- `send_file {taskId, filename: "<TICKET>-caption.md", title: "<title> —
  caption", docKind: "deliverable", content: <caption + the slide copy as a
  numbered list + asset ids + post id>}`.
- Every slide PNG: `send_file {taskId, filename: "<TICKET>-NN-<slug>.png",
  title: "Slide NN — <headline>", docKind: "preview", base64}` (each PNG is
  well under 5 MB; attach all, first slide first). On a host that cannot
  send binaries, attach the asset `public_url`s in the deliverable instead.
- **Copy-only mode** (no renderer): the deliverable carries the caption and
  every slide's eyebrow / headline / sub / motif names; no upload, no
  `instagram_post_upsert`; say `copy-only: no renderer on this host` on the
  issue. The owner or a Claude Code host renders later.

## 7. Hand to the checker — a separate call

Start a fresh subagent or session whose only inputs are the tenant, the
issue id and "follow `blog-checker` for an Instagram carousel" (`subject_kind`
`instagram_post`): it checks the caption and slide copy against the persona
(voice, banned phrases, claims policy, Free / Pro wording, "Cloud bots"), the
slide count and size, that every PNG attached matches an asset id, records
the verdict with `check_record`, and on **pass** raises the one blocking
`reviewRequest` (state `in_review`). Then read the outcome from the issue:

- **pass** — if the state or request is missing, raise it once yourself:
  `post_task_update {state: "in_review", reviewRequest: {blocking: true,
  reason: "Instagram carousel <TICKET>: <n> slides + caption attached ·
  checker pass · maker <model> · checker <model> · slot <due>"}}`.
- **bounce** — fix the named slides / caption lines, re-render, re-upload
  only the changed slides, `instagram_post_upsert` with the same `id`,
  re-attach, hand over again as round + 1. Two bounces at most; the third
  escalates.
- **escalate** — stop; the issue carries `ESCALATE:`; leave the state as the
  checker set it.

After the owner asks for changes (Priority 1 in §1): same `id`, same loop,
verdicts superseded.

## 8. Report and stop

`post_task_update {id, body: "Drafted <round> — instagram_post <id> · <n>
slides · assets <ids> · check <check_id> · maker <model> · checker <model>",
workStats}` (`role: "maker"`). Print one line for the routine log:
`instagram-drafter: <ISO> · drafted <TICKET> (<verdict>) · slides <n> · <ok |
copy-only | stopped: reason>`. Stopped early → a handoff comment on the
issue (rules §7).

## Never

Post, schedule or call Postiz · call `publish` · set an instagram post
`approved` / `published` · check your own draft · invent a number, quote,
customer or meeting · name a competitor on a slide · write bare "Pro" ·
more than 10 slides · more than one new carousel per run · touch a blocked
issue · raise a second `reviewRequest` · store or echo a key value (keys by
name: `BLOG_ACCESS_KEY`; `POSTIZ_API_KEY` belongs to the publisher).
