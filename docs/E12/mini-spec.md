# E12 mini-spec — Epic structure v2: channel parents, one Backlog, existing-epic setup, Runs block (CONT-454)

**Map:** CONT-419 (Context Blog) · **Ticket:** CONT-454 (gate:artifact) · **Tenant:** Meetly (epic MTLY-169 `423c5419-07ab-4e8c-83ca-dc1fea1c640d`) · **Date:** 2026-09-03 · **Branch:** `work/E12-epic-v2` on E9's `work/CONT-437-instagram` @ `56cea92`, manifest ref `v4` · **Owner's words (2026-09-03):** "one parent issue per channel (Blog, Instagram, other artifacts) with each individual piece as a sub-issue; Idea + Topic lane merged into one Backlog — the running list incl. done; `setup blog` on an existing epic says so and reuses it, `redo` updates the brand guides, then helps set up the routines on my machine; on the epic I want to see the frequency, the details, past and next runs."

## 1. Lane model v2 (`blog-agent/templates/lanes.md`, `rules-blog` §3)

```
<Brand> Blog (epic, tenant:<slug>)
├── Daily Brief          lane:brief       standing — daily comment + rebuilds the epic's ## Runs block
├── Blog                 lane:blog        parent — every blog publish issue (all locales) is its child
├── Instagram            lane:instagram   parent — every Instagram issue is its child
├── Site                 lane:site        parent — only when WHAT includes a site
├── Backlog              lane:backlog     parent — stage:idea / stage:topic children; done stays (history)
├── AEO/SEO Health       lane:aeo-seo     standing
├── Performance Report   lane:performance standing
└── Map + spec review    gate:plan
```

- `list_tasks {parentId}` returns **direct children only**, so every skill resolves the channel parent once per run — `list_tasks {kind: "issue", parentId: <epic>, label: "lane:<channel>"}`, or the id from the epic's new `## Structure` section / the routine prompt — and looks pieces up through it. A piece's `parent` is the channel parent; the parent's `parent` is the epic that carries the brand documents (the checker walks up the chain).
- New label key `stage:` (`idea` · `topic`), Backlog children only. `lane:` values are now `blog · instagram · site · backlog · brief · aeo-seo · performance`; `lane:idea`, `lane:topic` and `lane:audience` are no longer created (audience revisions are new document versions on the epic, written by `redo`).
- **Graduation**: `blog-drafter` (or the driver session) creates the publish issue under the channel parent with `links: [{id: <backlog child>, type: "relates"}]`, posts `Graduated → <ticket>` on the child and marks it done; the child is never deleted or re-parented, so the Backlog shows what was used and what is left.
- Labels on pieces are unchanged (`channel: locale: tenant: hub: kind: gate:`).

## 2. Skills changed (all in `skills/`)

| skill | version | change |
|---|---|---|
| `blog-agent` | 3 → 4 | Goal + chart steps 3/5 build the v2 tree (parents, Backlog children for topics beyond the first cycle, nothing content-shaped under the epic); **existing-epic check** always runs before the first question (`list_tasks {kind: "epic", label: "tenant:<slug>"}` + Blog MCP `tenant_get`) → new section **Existing epic — reuse · redo · routines**: first line `Epic <title> (<ticket>) exists — using it.`, ≤ 6 lines of state from reads, offer `redo` / `routines` / continue; `redo` = Rounds 1–4 pre-filled from the decision record + documents, new document versions via `send_file` on the epic (decision record always), `brand_upsert` (server bumps the revision), `## Rules` lines only (never `## Runs`), issues kept, missing ones created, one `reviewRequest` only if a doc or the map changed; **routines step** (chart step 8) is explicit and runs on first setup AND every redo: detect host → print every filled template (launchd / crontab / chat prompts / `no-machine.md`) with all ids → install → verify (`launchctl list`, `crontab -l`, dry-run daily brief `end rc=0`) → record in handoff + `## Runs`; "already installed" = re-verify, re-print only changed templates. New attach `routines/no-machine.md` (GitHub Actions cron / Vercel cron hint, keys as secrets by name). |
| `blog-agent/templates/lanes.md` | — | Rewritten: tree diagram, epic description template with `## Structure` (parent ids) and `## Runs` (fixed shape, budget rule), §2 parents + standing issues table (Site optional), §4 publish issues under the channel parent, new §4b Backlog child payloads + graduation, §6 the `## Runs` block contract. |
| `blog-agent/routines/chat-routines.md` | — | All four prompts carry the Blog / Instagram parent ids and the Backlog id; drafter picks children of the Blog parent then graduates from the Backlog; publisher candidates are children of the parents; daily-brief prompt scopes over the parents and rebuilds `## Runs` (≤ 2048 chars); assessment reads next week's topics from the Backlog. |
| `rules-blog` | 1 → 2 | §3: `parentId` = the channel parent; `lane:` vocabulary v2; new `stage:` row; new **Hierarchy** subsection (tree, direct-children rule, resolve-and-verify, graduation); quick reference "New piece" uses `<channel parent>`. |
| `blog-drafter` | 1 → 2 | Inputs gain **Parents** (Blog parent + Backlog); rotation, pick §2.1, variants §8 use `<blog parent>`; §2.2 replaces the Topic Lane with Backlog graduation (`stage:topic` oldest first, hub with fewest published, `stage:idea` only with a hub after research; create under the parent, `relates`, `Graduated →` + done, `topics_upsert` with the new `context_issue_id`); refresh source = Backlog / Performance Report; Never: "create a piece directly under the epic". |
| `blog-publisher` | 1 → 2 | Inputs gain **Parent**; candidates `parentId: <blog parent>`; missed-window slot check among the parent's children. |
| `blog-checker` | 2 → 3 | Tenant resolved by walking `parent` → channel parent → epic; rotation `parentId: <channel parent>, includeClosed: true`. |
| `instagram-drafter` | 1 → 2 | Inputs gain **Parent** (Instagram); pick §1.2 `parentId: <instagram parent>`. |
| `instagram-publisher` | 1 → 2 | Inputs gain **Parent**; candidates and missed-window check under the Instagram parent. |
| `daily-brief` | 1 → 2 | Inputs gain channel parents + Backlog; gather over the parents' children (follow `nextCursor`); Next line adds the open Backlog; step 6 + new section **Epic `## Runs` block**: rebuild (never append) `schedule · next 3 · routines · briefs (last 7)`, keep everything above `## Runs` byte for byte, 2048-char budget with a fixed trim order (oldest brief line → third/second `next`), never cut above the block, say so in the comment if the save is refused. |

`pnpm tsx scripts/check-skills.ts` → `12 skills OK`; `pnpm tsx scripts/build-manifest.ts --ref v4` → `12 skills, 33 files, ref v4`; `--check` clean. Not tagged, not pushed (the primary agent tags `v4`).

## 3. Meetly re-chart (Context project Meetly, epic MTLY-169)

| what | id | result |
|---|---|---|
| `Blog` parent (complex, `lane:blog tenant:meetly gate:none`) | `e6dd2e08-9f1f-44d2-ba93-6e19c70aae78` | created; 13 children — MTLY-177…189 re-parented with `save_work {id, parentId}` only |
| `Instagram` parent (`lane:instagram`) | `e28e4e7c-ad24-4f3f-98ef-3c6af79ed055` | created; 4 children — MTLY-190…193 re-parented; **MTLY-190 untouched otherwise** (still In Review, blocking `reviewRequest` intact, attachments intact) |
| `Backlog` parent (`lane:backlog`) | `aae3332f-365f-40d5-ab70-7e9df1fe4502` | created; no children yet (Idea Lane and Topic Lane had none) |
| Idea Lane MTLY-171, Topic Lane MTLY-172 | `340d6076…`, `0418dd06…` | fold comment posted on each; **the server refused `state: done` from an agent** ("gate:none is a human approval gate — gates close only when the user approves on their phone"), so both stay open for the owner to close; nothing reads them any more |
| Epic description | MTLY-169 | rewritten under the 2048-char cap (the old one was already at the cap — its Daily Brief id was truncated): Goal · Done when · Milestones · **Structure** (parent + Daily Brief ids) · Rules (compressed) · **Runs** (schedule, next 3 slots, routine health from the Mac mini logs, last brief); 2015 chars, 1616 above `## Runs` |
| Ticket numbers for the three parents | — | minted on-device at the phone's next sync (`ticket: null` until then); the ids above are stable |

Verified with `get_task` on the epic (children: Map + spec review, Performance Report, AEO/SEO Health, Audience & Persona, Topic Lane, Idea Lane, Daily Brief, Blog, Instagram, Backlog) and on MTLY-183 (`parent` = Blog); `list_tasks {parentId}` on Blog → 13, on Instagram → 4.

## 4. Host repo `~/repos/context-blog-meetly`

- `.claude/skills/` overlaid with the eight changed skills (`diff -rq` against the worktree: only `grill-me`, `wayfinder` (host-only) and `third-party` (repo-only) differ, as before).
- `routines/prompts.md` refilled from the new `chat-routines.md` with the parent ids, the Backlog id and the `## Runs` rebuild; the MTLY-176 "blocked until the owner marks it done" notes are gone (it is done).
- `AGENTS.md` + `README.md`: parent ids and the direct-children rule; the drafter's "posts to" cell; skills paragraph mentions E9/E12 and `v4`.
- No plist change: the four launchd routines read `prompts.md` at run time. The 08:00 SGT daily brief on 2026-09-03 is the first run of the v2 prompt and writes the first routine-maintained `## Runs` block.

## Decisions and deviations

| # | decision | why |
|---|---|---|
| 1 | Parents are `issueType: complex` issues under the epic, not epics | Context nests issues under issues or epics; a parent issue keeps the epic's derived progress meaningful and the owner sees "all of a channel together" in one child list |
| 2 | Pieces are looked up through the parent (`parentId: <parent>`), never by label across the epic | `list_tasks {parentId}` is direct-children only; label-only queries would need a project-wide scan and could cross tenants |
| 3 | New `stage:` label key for Backlog children instead of reusing `kind:` | `kind:` already means `new · refresh` on publish issues; `stage:idea → stage:topic → done` is a different axis |
| 4 | Graduation marks the Backlog child done and links it, rather than re-parenting it under Blog | the owner asked for "the running list incl. done"; re-parenting would empty the history and change the child's labels/acceptance criteria |
| 5 | Audience & Persona (`lane:audience`) is no longer part of the template; MTLY-173 left as is | audience revisions are new document versions on the epic written by `redo`; the ticket did not ask to close MTLY-173 — owner's call |
| 6 | Idea Lane / Topic Lane left open with fold comments | server refuses agent-side `done` on `gate:none` lanes; the brief said "leave them and say so" |
| 7 | Epic `## Rules` compressed; `## Structure` added; `## Runs` fixed-shape with a trim order owned by `daily-brief` | the description was already at 2048 chars; a Runs block that grows daily needs a single owner and a deterministic trim, otherwise every writer fights for the last 400 chars |
| 8 | Existing-epic check keys on `tenant:<slug>` label (+ `tenant_get`), not `search` | `search` is bounded and text-based; the label is exact and the Blog MCP knows the tenant; `search` stays as the fallback when no slug can be derived |
| 9 | Routines step is a numbered sub-procedure (detect → print → install → verify → record) that the Existing-epic path calls by reference | the owner wants routines set up on every setup and redo; one procedure, two entry points, no drift |

## Not done / left to others

- Tag `v4` and `SKILLS_REF=v4` on Blog / Web / iOS; re-run `setup` overlay in the host repo — `docs/E12/release.md`.
- First `## Runs` rebuild by the routine (08:00 SGT 2026-09-03) — observe the epic afterwards; if the save is refused the brief comment says so.
- MTLY-171 / MTLY-172 close on the phone (owner); MTLY-173 fate (owner).
- Blog MCP `topics_upsert` rows still point `context_issue_id` at the publish issues (unchanged, correct); Backlog children will carry a topic id when the drafter creates them.
- Parent tickets (`MTLY-xxx`) appear after the phone syncs; the epic `## Structure` carries ids, not tickets, on purpose.
