# Context skills

The skills Context agents run on — markdown `SKILL.md` files (plus templates,
routines and a spec template) that teach an AI coding host or chat assistant how
to work through [Context](https://app.onecontext.me): brainstorm with the user,
chart a map of tickets, work them to done with review gates, and — for Context
Blog — draft and publish content with approvals recorded in Context.

This repository is the **source of truth**. Nothing here is copied into a
database: the three Context MCPs and the Skills hub read `manifest.json` from a
pinned git tag through the jsDelivr CDN
(`https://cdn.jsdelivr.net/gh/asaubhagya/context-skills@<tag>/…`) and verify
every file against its sha256 before serving it.

## What is here

| skill | kind | description | served by |
|---|---|---|---|
| [`rules`](skills/rules/SKILL.md) | rules | The Context harness: the execution discipline any agent follows when a task needs a plan. Ships `agents-block.md` (appended to AGENTS.md / CLAUDE.md) and [`spec-template.md`](skills/spec-template.md). | Context iOS MCP · Context Web MCP |
| [`setup-context`](skills/setup-context/SKILL.md) | skill | Chart a piece of work as a Context map (epic + linked tickets) and work it to done with review gates. | Context iOS MCP · Context Web MCP |
| [`daily-brief`](skills/daily-brief/SKILL.md) | skill | Daily heartbeat for any recurring agent workflow tracked in Context. | Context iOS MCP · Context Web MCP · Context Blog MCP |
| [`rules-blog`](skills/rules-blog/SKILL.md) | rules | Rules for every Context Blog workflow, layered on `rules`. | Context Blog MCP |
| [`blog-agent`](skills/blog-agent/SKILL.md) | skill | "Set up blog": interview the owner, chart a tenant epic, install the routines. Ships `templates/` and `routines/`. | Context Blog MCP |
| [`blog-checker`](skills/blog-checker/SKILL.md) | skill | Independent quality gate between the maker and the human: MACHINE checks via the Blog MCP (`content_lint`, `preview_render`), JUDGEMENT checks + fact-check, verdict `pass · bounce · escalate` recorded on the Context issue (`check_record`); raises the `reviewRequest` only on pass. Ships `templates/`. | Context Blog MCP |
| [`wayfinder`](skills/third-party/wayfinder/SKILL.md) | skill (third-party) | Plan a huge chunk of work as a shared map of decision tickets. | dependency of `setup-context` / `blog-agent` |
| [`grill-me`](skills/third-party/grill-me/SKILL.md) | skill (third-party) | Grill the user relentlessly about a plan, decision, or idea. | dependency of `setup-context` / `blog-agent` |

Layout: `skills/<key>/SKILL.md` (first-party), `skills/third-party/<key>/SKILL.md`
(verbatim upstream skills), `skills/spec-template.md` (attached to `rules`),
`manifest.json` (generated, committed), `scripts/` (checks + manifest builder).

## The three entry points

You normally never install these by hand — each MCP's `setup` tool does it:

- **Context iOS MCP** and **Context Web MCP** (`app.onecontext.me`):
  `setup {workflow: "harness", harness, canWriteFiles}` resolves `rules`,
  `setup-context`, `daily-brief` and their dependencies `wayfinder` / `grill-me`.
- **Context Blog MCP** (`sites.onecontext.me`): `setup {workflow: "blog" | …,
  harness, canWriteFiles, installedSkills}` resolves `rules-blog` + the workflow
  skill (`blog-agent`) and adds the harness skills unless you report them installed.

`setup` returns either `mode: "files"` — the exact files to write for your host —
or `mode: "chat"` (claude.ai, ChatGPT: no filesystem) with links to each skill on
the hub and the protocol inlined. `list_harness_skills` / `list_skill_catalog`
list the catalog; `get_harness_skill` / `get_skill` return one skill with all
its files.

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
`AGENTS.md` (or `CLAUDE.md`). Every skill's `depends` must be installed too.

The **Skills hub** — `https://app.onecontext.me/skills` — is the stable
distribution front for all of this: an index (`/skills`, `/skills.md`,
`/skills.json`), one folder per skill (`/skills/<key>/`, every file fetchable
verbatim), `/skills/<key>.md` as the shortcut to `SKILL.md`, and zips
(`/skills/<key>.zip`, `/skills.zip`). It serves exactly the tag the MCPs are
pinned to.

## Versions and rollback

Releases are git tags: `v1`, `v2`, … The MCPs and the hub pin one tag
(`SKILLS_REF`); moving them to a new tag is a config change, rolling back is
pointing at the previous tag. `manifest.json` carries a `version` per skill
(frontmatter `version:`, default `1`) — bump it when a skill's behaviour changes
so hosts that pinned `get_skill {version}` notice. Tags are never moved or
deleted (jsDelivr caches them permanently).

Release: edit skills → `pnpm check-skills && pnpm build-manifest --ref vN` →
commit → PR → merge → `git tag vN && git push --tags` → set `SKILLS_REF=vN` on
the three MCPs.

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
