# Context skills

The skills Context agents run on — markdown `SKILL.md` files (plus templates,
routines and a spec template) that teach an AI coding host or chat assistant how
to work through [Context](https://app.onecontext.me): brainstorm with the user,
chart a map of Epics and Issues, work them to done with review gates, and — for
Context Blog — draft and publish content with approvals recorded in Context.

This repository is the **source of truth**. Nothing here is copied into a
database: the Context MCP, the Context Blog MCP and the Skills hub read
`manifest.json` from a pinned git tag through the jsDelivr CDN
(`https://cdn.jsdelivr.net/gh/asaubhagya/context-skills@<tag>/…`) and verify
every file against its sha256 before serving it.

## The base skill

[`context`](skills/context/SKILL.md) teaches the Context MCP interface itself
— the primitives (Account, Space, Epic, Issue, Artifact), Shared vs Private
provenance and pairing, the read → act → verify loop, and the review
discipline (`request_review` / `claim_issue` / `verify_issue`). Every other
skill in this repo builds on it. Load `context` first, or let `start_context`
install it for you (see below).

## What is here

| skill | kind | description | served by |
|---|---|---|---|
| [`context`](skills/context/SKILL.md) | skill | The Context MCP interface: vocabulary, provenance, the read → act → verify loop. Ships `references/`. | Context MCP |
| [`rules`](skills/rules/SKILL.md) | rules | The Context harness: the execution discipline any agent follows when a task needs a plan, built on `context`. Ships `agents-block.md` (appended to AGENTS.md / CLAUDE.md) and [`spec-template.md`](skills/spec-template.md). | Context MCP |
| [`setup-context`](skills/setup-context/SKILL.md) | skill | Chart a piece of work as a Context map (Epic + linked Issues) and work it to done with review gates. | Context MCP |
| [`daily-brief`](skills/daily-brief/SKILL.md) | skill | Daily heartbeat for any recurring agent workflow tracked in Context. | Context MCP · Context Blog MCP |
| [`rules-blog`](skills/rules-blog/SKILL.md) | rules | Rules for every Context Blog workflow, layered on `rules`. | Context Blog MCP |
| [`blog-agent`](skills/blog-agent/SKILL.md) | skill | "Set up blog": interview the owner, chart a tenant epic, install the routines. Ships `templates/` and `routines/`. | Context Blog MCP |
| [`blog-assessment`](skills/blog-assessment/SKILL.md) | skill | Weekly performance and AI-visibility report for a tenant: reads the Blog MCP stats, runs the agent-side citation probe with the host's own keys (by NAME, cost-capped), ingests the results and posts one report under the Performance Report lane. |
| [`blog-checker`](skills/blog-checker/SKILL.md) | skill | Independent quality gate between the maker and the human: MACHINE checks via the Blog MCP (`content_lint`, `preview_render`), JUDGEMENT checks + fact-check, verdict `pass · bounce · escalate` recorded on the Context issue (`check_record`); raises `request_review` only on pass (locale variants cascade without one). Ships `templates/`. | Context Blog MCP |
| [`blog-drafter`](skills/blog-drafter/SKILL.md) | skill | Nightly maker: one narrative spine and worked through-line, selective evidence, a specificity-preserving No AI Slop pass, buffer floor, hub-bound topic pick, cited research, `article_upsert` honouring the lint (two bounces then escalate), hand-off to `blog-checker` in a separate call, locale variants as `relates` issues. Never publishes. Ships `templates/`. | Context Blog MCP |
| [`blog-publisher`](skills/blog-publisher/SKILL.md) | skill | Every 3 h: `done` ∧ `due` ≤ now < `due` + 3 h ∧ no live link → `publish {assert_context_done, context_issue_id}` → live link on the issue; cascade to checked locale variants; missed windows re-slotted; idempotent. | Context Blog MCP |
| [`instagram-drafter`](skills/instagram-drafter/SKILL.md) | skill | Instagram maker: slides from the paper-cards template, assets + `instagram_post_upsert`, hand-off to `blog-checker`; runs inside the drafter routine after the blog pass. | Context Blog MCP |
| [`instagram-publisher`](skills/instagram-publisher/SKILL.md) | skill | Schedules approved Instagram posts through Postiz (`POSTIZ_API_KEY` by name) only when the issue is `done`, dedupe guard; runs inside the publisher routine. | Context Blog MCP |
| [`site-builder`](skills/site-builder/SKILL.md) | skill | One-time site / landing page — one-round interview (goal, audience, sections, CTA, design tokens), `page_upsert` honouring the lint, `preview_render`, `blog-checker` in a separate call, one `gate:artifact` review in Context, `publish` only after approval. Ships `templates/page-brief.md`. | Context Blog MCP |
| [`wayfinder`](skills/third-party/wayfinder/SKILL.md) | skill (third-party) | Plan a huge chunk of work as a shared map of decision tickets. | dependency of `setup-context` / `blog-agent` |
| [`grill-me`](skills/third-party/grill-me/SKILL.md) | skill (third-party) | Grill the user relentlessly about a plan, decision, or idea. | dependency of `setup-context` / `blog-agent` |

Layout: `skills/<key>/SKILL.md` (first-party), `skills/third-party/<key>/SKILL.md`
(verbatim upstream skills), `skills/spec-template.md` (attached to `rules`),
`manifest.json` (generated, committed), `scripts/` (checks + manifest builder).

## The entry points

- **Context MCP** — a single endpoint, `https://mcp.onecontext.me/mcp`, for
  the iPhone app and the web (sign in with Google, pair your iPhone for
  Private Spaces). Its `start_context` tool is the one model-callable
  onboarding call: it reports account, pairing, Space state and a
  `nextAction`, and returns an install plan for the `context` skill and the
  workflow skills it recommends (`rules`, `setup-context`, `daily-brief` and
  their dependencies `wayfinder` / `grill-me`) — either `agent_install`
  (target directory, download URL, sha256, for a host with its own file
  tools) or `human_upload` (a ZIP + host-native upload steps, for a hosted
  agent with no filesystem). `start_context` never writes files itself and
  never edits `AGENTS.md`/`CLAUDE.md` as a side effect — the agent (or the
  human) carries out the plan with its own tools.
- **Context Blog MCP** (`blog.onecontext.me/api/mcp`) — a separate,
  independently versioned server for tenants, drafts, preview render,
  publishing and analytics. It keeps its own tool names (`article_upsert`,
  `content_lint`, `tenant_get`, `publish`, …) and its own `usage_guide` /
  `get_capabilities`, unrelated to the Context MCP contract above. Its
  onboarding resolves `rules-blog` + the workflow skill (`blog-agent` ·
  `site-builder` · `instagram-drafter`) the same way.

Both servers' Resources also carry the current skill and guide directly
(`context://skills/<key>/current/SKILL.md`, `context://guide/current`), so a
client that reads Resources can pick them up without calling a tool at all.

## Install by hand

Copy a skill's folder so that `SKILL.md` lands at:

| host | path |
|---|---|
| Claude Code | `.claude/skills/<key>/SKILL.md` |
| Codex | `.agents/skills/<key>/SKILL.md` |
| Cursor | `.cursor/rules/<key>.mdc` (attachments under `.cursor/rules/<key>/`) |
| ChatGPT / claude.ai | add the files to the skills / project-knowledge surface |

Attached files keep their relative paths (`blog-agent/templates/…`,
`rules/spec-template.md`). Append `skills/rules/agents-block.md` to the repo's
`AGENTS.md` (or `CLAUDE.md`) yourself if you want the harness summarized
there — `start_context` never does this for you. Every skill's `depends`
must be installed too (`rules` depends on `context`; `setup-context` depends
on `context`, `rules`, `wayfinder`, `grill-me`; and so on).

The **Skills hub** — `https://app.onecontext.me/skills` — is the stable
distribution front for all of this: an index (`/skills`, `/skills.md`,
`/skills.json`), one folder per skill (`/skills/<key>/`, every file fetchable
verbatim), `/skills/<key>.md` as the shortcut to `SKILL.md`, and zips
(`/skills/<key>.zip`, `/skills.zip`). It serves exactly the tag both MCPs are
pinned to.

## Versions and rollback

Releases are git tags: `v1`, `v2`, … Both MCPs and the hub pin one tag
(`SKILLS_REF`); moving them to a new tag is a config change, rolling back is
pointing at the previous tag. `manifest.json` carries a `version` per skill
(frontmatter `version:`, default `1`) — bump it when a skill's behaviour changes
so hosts that pinned a specific skill version notice. Tags are never moved or
deleted (jsDelivr caches them permanently).

Release: edit skills → `pnpm check-skills && pnpm build-manifest --ref vN` →
commit → PR → merge → `git tag vN && git push --tags` → set `SKILLS_REF=vN` on
both MCPs.

## Proposing a change

Open a pull request. CI runs `pnpm check-skills` (frontmatter `name` = directory
name, `description` present, `version` a positive integer, `depends` and
`attach` resolve, files 1–256 KB) and `pnpm check-manifest` (the committed
`manifest.json` matches the tree — run `pnpm build-manifest` and commit it).
Third-party skills are updated by re-fetching upstream and recording the new
pinned commit + sha256 in the frontmatter, never by editing them.

Frontmatter fields: `name`, `description`, `depends: [..]`, `version`,
`license`, `source` (upstream URL, marks a skill as third-party),
`attach: [..]` (extra files outside the walk, e.g. `../spec-template.md`).

## Credits and licence

MIT — see [LICENSE](LICENSE). `wayfinder` and `grill-me` are Matt Pocock's
skills (https://github.com/mattpocock/skills, MIT), redistributed verbatim from
commit `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`; each file's frontmatter
records `source`, `source_commit` and `source_sha256`. `setup-context` is an
independent rewrite inspired by them.
