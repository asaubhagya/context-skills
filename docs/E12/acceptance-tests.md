# E12 acceptance tests — CONT-454 (run 2026-09-03 03:30–04:00 SGT, Mac mini, Claude Code / claude-fable-5-1)

Legend: **pass** = observed · **pending** = waits on the owner / schedule / server · **refused** = the server said no (recorded, not worked around).

## A. Skills repo (`work/E12-epic-v2`)

| # | check | how | result |
|---|---|---|---|
| A1 | Frontmatter sane, deps resolve, attach paths exist | `pnpm tsx scripts/check-skills.ts` | **pass** — `check-skills: 12 skills OK (blog-agent, blog-checker, blog-drafter, blog-publisher, daily-brief, grill-me, instagram-drafter, instagram-publisher, rules, rules-blog, setup-context, wayfinder)` |
| A2 | Manifest stamped `v4`, deterministic | `pnpm tsx scripts/build-manifest.ts --ref v4` then `--check` | **pass** — `manifest.json: 12 skills, 33 files, ref v4` · `manifest.json is up to date (12 skills)` (32 → 33 files: `routines/no-machine.md`) |
| A3 | Versions bumped | manifest | **pass** — blog-agent 4 · blog-checker 3 · blog-drafter 2 · blog-publisher 2 · daily-brief 2 · instagram-drafter 2 · instagram-publisher 2 · rules-blog 2 |
| A4 | No v1 lane vocabulary left | `grep -rni 'topic lane\|idea lane\|lane:idea\|lane:topic' skills` | **pass** — 0 hits |
| A5 | No piece lookup through the epic left | `grep -rn 'parentId: <epic>' skills` minus `lane:` lookups | **pass** — remaining hits are the parent-resolution line (rules-blog), standing-issue creation (lanes.md §2) and the generic `setup-context` frontier query |
| A6 | Existing-epic path present and explicit | read `blog-agent/SKILL.md` "Before the first message" §3 + "Existing epic — reuse · redo · routines" | **pass** — `list_tasks {kind: "epic", label: "tenant:<slug>"}` + `tenant_get`; first line `Epic <title> (<ticket>) exists — using it.`; `redo` = pre-filled rounds → `send_file` new doc versions on the epic (decision record always) → `brand_upsert` → `## Rules` only → issues kept / missing created → gate only on change; routines step called on first setup and redo |
| A7 | Routines step prints filled host templates and verifies | read chart step 8 (1–4) | **pass** — macOS launchd / Linux crontab / chat prompts / `no-machine.md`; every `<…>` filled incl. parent + Backlog ids; verify via `launchctl list` / `crontab -l` + dry-run daily brief `end rc=0`; "never claim an install you did not observe"; redo = re-verify, re-print changed only |
| A8 | Runs block contract in the template and in daily-brief | read `lanes.md` §6 and `daily-brief` "Epic `## Runs` block" | **pass** — same fixed shape (schedule · next 3 · routines · briefs ≤ 7), rebuild not append, 2048-char budget, trim order oldest brief → 3rd/2nd next, never above the block |
| A9 | Every piece-creating / piece-looking skill uses the parent | read drafter §Inputs 2, §2, §8; publisher §Inputs 2, §1; checker §Inputs 2–3; IG drafter §Inputs 2, §1.2; IG publisher §Inputs 2, §1, §5; daily-brief §Inputs, step 2 | **pass** |
| A10 | No key value anywhere in the tree | `grep -rn "Bearer \|sk-\|pos_" skills` | **pass** — only header names inside the scripts (unchanged from E9) |
| A11 | Not pushed, not tagged | `git log --oneline -3`, no `git push`/`git tag` | **pass** — local commits only |

## B. Context — Meetly epic MTLY-169

| # | check | how | result |
|---|---|---|---|
| B1 | Parents exist under the epic with the right labels | `save_work` ×3 → `get_task {id: epic}` children | **pass** — Blog `e6dd2e08…` (`lane:blog tenant:meetly gate:none`), Instagram `e28e4e7c…` (`lane:instagram`), Backlog `aae3332f…` (`lane:backlog`) listed as children; tickets minted on the phone's next sync |
| B2 | MTLY-177…189 are children of Blog | `save_work {id, parentId}` ×13 → `list_tasks {parentId: Blog, includeClosed: true}` | **pass** — total 13, every row `parentId = e6dd2e08…`; labels, `due`, links, acceptance criteria unchanged |
| B3 | MTLY-190…193 are children of Instagram | `save_work {id, parentId}` ×4 → `list_tasks {parentId: Instagram, includeClosed: true}` | **pass** — total 4 |
| B4 | MTLY-190 (in the owner's review) changed parent only | `get_task` after the write | **pass** — state In Review, blocking `reviewRequest` (2026-09-02 19:18Z) intact, 9 attached documents intact, `parentId = e28e4e7c…` |
| B5 | One re-parented issue resolves its parent | `get_task {ticket: "MTLY-183"}` | **pass** — `parent: {id: e6dd2e08…, title: "Blog"}` |
| B6 | Idea Lane / Topic Lane folded | `post_task_update {state: "done", body}` ×2 | **refused** — `"Idea Lane" (MTLY-171) is a human approval gate (gate:none). Gates close only when the user approves on their phone.` (same for MTLY-172). Fold comments posted without a state change (accepted); both had 0 children (`list_tasks {parentId}` → 0), nothing to move |
| B7 | Epic description ≤ 2048 with Structure + Runs | `save_work {id: epic, description}` → `get_task` | **pass** — 2015 chars (1616 above `## Runs`); `## Structure` carries the three parent ids + Daily Brief id; `## Runs`: schedule · next (MTLY-190 Mon 09:00 in review · MTLY-177 Mon 22:00 · MTLY-191 Tue 07:00) · routines (brief ok 02 Sep 22:35 · drafter ok 03 Sep 02:00 · publisher ok 03 Sep 01:38 · assessment never) · briefs (02 Sep) — routine lines taken from `.build/routines/*.log` on the Mac mini |
| B8 | Epic progress still derived from the pieces | `get_task {id: epic}` | observed — `progress {done: 1, total: 27}` (24 + 3 parents; pieces still count through the hierarchy) |
| B9 | E12 ticket lifecycle | `post_task_update {state: "started"}` on CONT-454 | **pass** — In Progress; gate:artifact → not moved to done (primary agent / owner) |

## C. Host repo `~/repos/context-blog-meetly`

| # | check | how | result |
|---|---|---|---|
| C1 | Skills overlay equals the worktree | `rsync -a --delete` ×8 + `diff -rq` | **pass** — only host-only `grill-me` / `wayfinder` and repo-only `third-party` differ (as before E12) |
| C2 | `prompts.md` carries the parent ids, Backlog id, Runs rebuild, no MTLY-176 gate notes | read | **pass** |
| C3 | Runner unchanged and syntax-clean | `bash -n scripts/run-routine.sh` | **pass** — no change needed: `save_work` on the epic is inside `mcp__context` which is already allow-listed |
| C4 | launchd routines unchanged | `launchctl list \| grep me.onecontext.blog` | **pass** — same four labels loaded; prompts are read at run time, nothing to reinstall |
| C5 | First routine-written `## Runs` block | daily-brief at 08:00 SGT 2026-09-03 → `get_task {id: epic}` | **pending** — expect `briefs:` to gain a `03 Sep` line and `routines:` to show `brief ok 03 Sep 08:00`; the comment on MTLY-170 says so if the save was refused |
| C6 | Drafter picks through the Blog parent | 02:00 SGT 2026-09-04 → `.build/routines/blog-drafter.log` | **pending** — MTLY-176 is done, so the drafter should draft MTLY-177 (earliest due, ready) and spawn de/fr variants under the Blog parent; the IG pass skips MTLY-190 (deliverable exists) and takes MTLY-191 |
