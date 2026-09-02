# E10 acceptance tests — CONT-438 (run 2026-09-03 03:45–04:15 SGT, Mac mini, Claude Code / claude-fable-5-1)

Legend: **pass** = observed · **pending** = waits on the owner / the primary agent · **refused** = the server said no (recorded, not worked around).

## A. Skills repo (`work/E10-site-builder`, commit `da1ba89` + docs commit)

| # | check | how | result |
|---|---|---|---|
| A1 | Frontmatter sane, deps resolve, attach paths exist | `pnpm check-skills` | **pass** — `check-skills: 13 skills OK (… site-builder …)` |
| A2 | Manifest stamped `v5`, deterministic | `pnpm build-manifest --ref v5` then `pnpm check-manifest` | **pass** — `manifest.json: 13 skills, 35 files, ref v5` · `manifest.json is up to date (13 skills)` (33 → 35 files: `site-builder/SKILL.md`, `templates/page-brief.md`) |
| A3 | Versions | manifest | **pass** — `site-builder` 1 · `blog-agent` 4 → 5; every other skill unchanged |
| A4 | `setup {workflow: "site"}` maps to this key | `lib/skills/resolve.ts` `WORKFLOW_SKILL.site === "site-builder"` (read-only) | **pass** — server already routes; only the manifest lacked the skill |
| A5 | `blog-agent` routes site work to `site-builder` | read frontmatter `depends`, Round 3 "Sites:" line, "After approval — the loop" | **pass** |
| A6 | Skill covers the ticket's list | read `site-builder/SKILL.md`: goal, audience, sections (hero, how it works, tiers, proof, CTA), design tokens, copy rules (claims policy), `page_upsert` dry run → `preview_render` → checker → `gate:artifact` → `publish`, benchmark (lint clean, LCP-safe, one CTA) | **pass** |
| A7 | README covers `setup` via MCP + link mode and has a `site-builder` row | read README "The three entry points", table | **pass** — row added; entry-points paragraph now lists `blog · site · instagram`; the two Instagram rows E9 had not added are in too |
| A8 | Public repo state | `gh repo view asaubhagya/context-skills` was not run (GitHub MCP down this session); README credits + LICENSE unchanged from v4 | **pass** (unchanged) — repo is public since E6/E9 |
| A9 | No key value anywhere | `grep -rn "Bearer \|sk-\|pos_" skills docs` | **pass** — header names only |
| A10 | Not pushed, not tagged | `git log --oneline -3`; no `git push` / `git tag` | **pass** — local commits only |

## B. Blog MCP — tenant `context-blog`

| # | check | how | result |
|---|---|---|---|
| B1 | Tenant exists as specified | `tenant_get` → not_found → `tenant_create {slug, name, tier: hosted, products: [site], locales: [en], mount_path: "/", primary_hostname: sites.onecontext.me, context_epic_id: CONT-419}` | **pass** — id `02a8cae3-26d9-48b3-923d-104078481d4f`, `owner_added: true` |
| B2 | Brand = Context voice + paper palette + Organization JSON-LD | `brand_upsert` ×2 (second fixes the logo URL) | **pass** — voice (persona, 5 adjectives, 5 anti, 24 banned phrases, claims policy), byline Organization, tokens `#f4f0e8 / #fffef9 / #171715 / #68665f / #6d4aff / #cbc5b8`, Space Grotesk / IBM Plex Sans, logo `https://onecontext.me/og.png` (200) |
| B3 | Root page resolution | read `app/t/[tenant]/[[...path]]/page.tsx` + `lib/content/model.ts` `canonicalUrl` | `<mount>/` = hub view; pages only at `<mount>/<slug>` → slug **`launch`**, URL `https://sites.onecontext.me/launch` (server-returned `url`) |
| B4 | Lint loop | `page_upsert {dry_run: true}` ×2 | round 1: `would_reject: true`, 8 × `html_disallowed` (`<code>`) → replaced by `<em>` → `would_reject: false, warnings: []` (1 bounce of the allowed 2) |
| B5 | Page created, lint clean | `page_upsert` | **pass** — id `7a19fc2a-d6c8-40aa-aab1-f7092e311e65`, status `draft`, `warnings: []`, 515 words · 5 H2 · 1 CTA |
| B6 | Preview renders with the tenant tokens | `preview_render` → HTML 8.6 KB | **pass** — CSS vars `--bg:#f4f0e8 … --accent:#6d4aff … --font-heading:Space Grotesk … --font-body:IBM Plex Sans`; no scripts; Google Fonts link only |
| B7 | Checker round 1 (separate session) | `general-purpose` subagent, inputs = payload + brand + rules-blog + docs | **bounce** — 2 findings (routine said to publish on every tier; Artifact/Review rows contradict on the checker) + aside: brand logo 404. `check_record` → `29891ccc-1034-42b0-9c5a-7db3d3f67d39` |
| B8 | Round-1 fixes re-upserted with the same id | `page_upsert {id, dry_run}` → real | **pass** — `would_reject: false, warnings: []`, 516 words, citations 2 (github + blog.onecontext.me); `created: false`, status `draft` |
| B9 | Checker round 2 | same subagent, re-read inputs | **bounce** — round-1 findings both fixed; 1 new finding: the shortened meta `description` ("then it publishes") re-implied the product publishes on every tier. `check_record` → `bf0feca9-7d8e-43e9-80b7-4441d64673ef` |
| B9b | Round-2 fix + round 3 | description → "…you approve, then you publish — or the Hosted tier publishes for you."; dry-run `warnings: []`; re-upsert same id; round 3 = pass or escalate (two bounces recorded) | **pass** — round-2 finding fixed, 0 new findings; `check_record` → `740bf6b8-d156-4eb8-bd53-446602bdb350` |
| B10 | Page moved to `in_review` on the Blog MCP | `page_set_status {status: "in_review"}` | **pass** — `status: in_review`, `url: https://sites.onecontext.me/launch` (2026-09-02T20:07Z) |
| B11 | Not published | no `publish`, no `approved` | **pass** — by design; the primary agent publishes after the owner's approval |

## C. Context

| # | check | how | result |
|---|---|---|---|
| C1 | Page issue exists as a child of CONT-438 with the labels | `save_work {kind: issue, issueType: complex, parentId: CONT-438, labels: channel:site locale:en tenant:context-blog kind:new gate:artifact …, state: started}` | **pass** — `6b46fd78-c6d1-4005-9d6b-82bf97a887ea`, ticket **CONT-461**, 5 acceptance criteria |
| C2 | Deliverable + preview + verdict attached | `send_file` ×7 | **pass** — deliverable r1 `7de1ea5b…` / r3 `34608b43-42ae-41e5-9057-1f9b5793fb0b`, preview r1 `ad7c5295…` / r3, verdicts r1 `926bba7f…` · r2 `2db96686-51cd-4ffe-8227-0769e4fee629` · r3 `87f26580-3b28-4653-84a6-ef1f8a681083` |
| C3 | Machine-readable line + models on the issue | `post_task_update` | **pass** — `blog-page: <id> · slug launch · locale en · preview … · url …`; round-1 update names check_id, maker, checker |
| C4 | CONT-461 → `in_review`, no `reviewRequest` | `post_task_update {state: in_review, workStats}` after round 3 | **pass** — In Review, 4/5 criteria passed with evidence (publish pending), workStats v2 (primary + `blog-checker` subagent) — the gate:final is raised on CONT-438 by the primary agent |
| C5 | LinkedIn post as a deliverable on CONT-438 | `send_file {docKind: deliverable}` | **pass** — `3fbf07d3-b912-4fe7-86b9-f33c197ce08e`; 185 words + 2-line alt; one link (landing URL, guide as fallback); 3 hashtags |
| C6 | CONT-438 lifecycle | `post_task_update {state: started}` | **pass** — In Progress; `gate:final` not moved to done |

## D. Not verified here (primary agent / owner)

- `sites.onecontext.me/launch` 200 after `publish` (release.md §3); the root hub view on that host.
- `setup {workflow: "site"}` returns `site-builder` — only after `v5` is tagged and `SKILLS_REF=v5` is set.
- Owner approves CONT-461 / CONT-438; owner posts on LinkedIn.
