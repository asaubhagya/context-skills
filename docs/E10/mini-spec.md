# E10 mini-spec — site-builder skill + Context Blog launch landing page (CONT-438)

**Map:** CONT-419 (Context Blog) · **Ticket:** CONT-438 (gate:final) · **Page issue:** CONT-461 (`6b46fd78-c6d1-4005-9d6b-82bf97a887ea`, gate:artifact, child of CONT-438) · **Tenant:** `context-blog` (Blog MCP id `02a8cae3-26d9-48b3-923d-104078481d4f`) · **Date:** 2026-09-03 · **Branch:** `work/E10-site-builder` on main `0cd9bd3` (v4), manifest ref `v5` · **Spec:** v2 Parts 4, 8, 10, 13.

## 1. The skill — `skills/site-builder` v1

`setup {workflow: "site"}` already resolves to the key `site-builder` on the Blog MCP (`lib/skills/resolve.ts` `WORKFLOW_SKILL`); until this tag the server reported it `missing`. The skill is the one-time counterpart of `blog-drafter`: no routine, no buffer, one page per issue.

| step | what | tool |
|---|---|---|
| Before | both `usage_guide`s, `get_capabilities` (`page_upsert`, `preview_render`, `check_record`, `publish`); `tenant_get` → reuse, else `tenant_create` + `brand_upsert` | Blog MCP |
| Interview | one `grill-me` round: goal (one CTA) · audience · sections (hero, how it works, tiers, proof, trust, pricing, CTA) · copy rules (persona + claims policy) · design tokens · slug/locale/hostname → `templates/page-brief.md` (`docKind: "brief"`) | — |
| Issue | `Site: <title> (<locale>)`, `channel:site locale: tenant: kind:new gate:artifact`, parent = `Site` channel parent when it exists; created **before** the page because `page_upsert` requires `context_issue_id` | Context |
| Draft | page shape: `paragraph · heading · list · comparisonTable · callout · quote · image · one appCta`; inline HTML `em/strong/a` only (`<code>` rejects) | — |
| Upsert | `page_upsert {dry_run: true}` → fix `severity: "error"` at `path` → real call; two bounces then `ESCALATE:`; keep `id` | Blog MCP |
| Preview | `preview_render` → `send_file` (`docKind: "preview"`); deliverable markdown (`docKind: "deliverable"`); one `blog-page: <id> · slug · locale · preview · url` line | both |
| Checker | separate session / subagent, inputs = payload + brand + brief; verdict doc (`review`) + `check_record {subject_kind: "page"}` + update with models | both |
| Gate | pass → `page_set_status in_review` + `post_task_update {state: "in_review", reviewRequest}` (or the map owner raises it on the parent — stated on the issue) | both |
| Publish | after Context `done` only: `page_set_status approved` → `publish {page_id, context_issue_id, assert_context_done: true}` → URL on the issue → `complete_tasks` → `curl -sI` 200 | both |
| Benchmark | lint clean first real call · 350–700 words · 4–6 H2 · one CTA last · every claim traceable · preview < 50 KB, no external scripts, hero paragraph is the LCP · JSON-LD present | — |

Other changes: `blog-agent` 4 → 5 (`site-builder` in `depends`; Round 3 sends site-only owners straight to it; "After approval" says site pieces are one-time through `site-builder`); README table gains `site-builder` **and** the two Instagram rows E9 never added; entry-points paragraph lists all three workflows. `check-skills` → 13 skills OK; `build-manifest --ref v5` → 13 skills, 35 files.

## 2. The dogfood — tenant `context-blog`

| what | value |
|---|---|
| `tenant_create` | slug `context-blog`, name "Context Blog", tier hosted, products `[site]`, locales `[en]`, tz Asia/Singapore, `mount_path: "/"`, `primary_hostname: sites.onecontext.me`, `context_epic_id` = CONT-419 |
| `brand_upsert` | voice: persona ("small team building the tool it needed", plain/precise/specific/calm; anti salesy/hyped/corporate), 24 banned phrases, claims policy (no compliance claims, no guarantees, no invented numbers/quotes/customers); byline `Organization` Context · design tokens = the Context web app paper palette (`--paper #f4f0e8`, `--card #fffef9`, `--ink #171715`, `--muted #68665f`, `--violet #6d4aff`, `--line #cbc5b8`, Space Grotesk / IBM Plex Sans, radius 4px) · `organization_ld` for "Context (onecontext.me)" |
| page | id `7a19fc2a-d6c8-40aa-aab1-f7092e311e65`, slug `launch`, locale `en`, status **`in_review`**; 516 words, 5 H2, 1 CTA; `url: https://sites.onecontext.me/launch` |
| preview (round 3) | `https://blog.onecontext.me/preview/c5bb5547-a1a2-4f74-9cd8-46fbe7489df0?sig=…` (expires 2026-09-09) |
| checker | 3 rounds in a separate subagent session: r1 bounce (`29891ccc…`: publisher-per-tier sentence; Artifact/Review checker contradiction; brand logo 404) → r2 bounce (`bf0feca9…`: meta description) → r3 **pass** (`740bf6b8-d156-4eb8-bd53-446602bdb350`) |
| Context docs on CONT-461 | deliverable r3 `34608b43-42ae-41e5-9057-1f9b5793fb0b` (r1 `7de1ea5b…`) · previews r1/r3 · verdicts r1 `926bba7f…` · r2 `2db96686…` · r3 `87f26580…` |
| LinkedIn post on CONT-438 | `3fbf07d3-b912-4fe7-86b9-f33c197ce08e` (Artifact tier; 185 words + 2-line alt; one link; 3 hashtags) |

### Why slug `launch`, not `/`

`app/t/[tenant]/[[...path]]/page.tsx` (E4) resolves `<mount>/` as `parsed.kind === "hub"` → `HubView` (the article list, "Nothing published yet." when empty); articles and pages resolve only at `<mount>/[<locale>/]<slug>` (`canonicalUrl` in `lib/content/model.ts`). There is no root-page concept, so the landing page lives at `https://sites.onecontext.me/launch` and `sites.onecontext.me/` will show the empty hub once the tenant claims the host. Options for the map owner: (a) accept `/launch` and link it from onecontext.me; (b) a small E4 follow-up — "when a tenant has products `[site]` only and a page slug `index`/`home` exists, the hub route renders that page" — filed as a note in release.md, not built here.

## Decisions and deviations

| # | decision | why |
|---|---|---|
| 1 | Page issue parent = CONT-438, not a `Site` channel parent | the brief said so; the tenant has no epic of its own (its `context_epic_id` is the map CONT-419). The skill documents both shapes. |
| 2 | `<code>` → `<em>` for key names | the content HTML allowlist is `em/strong/a`; the renderer has no `code` style anyway |
| 3 | `seo.answer` kept; `description` rewritten as a distinct meta line | the renderer shows description then the answer box; the first draft echoed the same sentence twice. The rewrite cost a checker round (it said "then it publishes" — wrong for Artifact/Review) |
| 4 | Checker as a `general-purpose` subagent with only payload + brand + rules as inputs | rules-blog §4: maker and checker must not share a session; the subagent had no maker context |
| 5 | The primary agent raises the `reviewRequest` on CONT-438, not this worker on CONT-461 | brief; CONT-461 goes to `in_review` state only (the page is `in_review` on the Blog MCP too) |
| 6 | README gets the Instagram rows too | the ticket asks to confirm README coverage; the public repo table was missing two served skills |
| 7 | No `domain_connect` call | `sites.onecontext.me` is already an alias of the blog Vercel project; `primary_hostname` on the tenant is what the E4 middleware keys on. `domain_status` is the primary agent's verification step after publish. |

## Not done / left to others

- Tag `v5`, `SKILLS_REF=v5` on the three MCPs (release.md §1).
- `publish` after the owner approves CONT-461 / CONT-438; verify `https://sites.onecontext.me/launch` and the root hub (release.md §2–3).
- Owner posts the LinkedIn text themselves (Artifact tier).
- Optional E4 follow-up: root page for site-only tenants.
