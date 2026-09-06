# Agent Home — how agents.onecontext.me works end to end

Status: delivered 2026-09-06. Companion decision record: [ADR-0009](adr-0009-agents-home.md). Evidence: Context epic "Evidence: Agent Home" (`6f2f07b0`). This document is written for a reader who wants to understand the whole system by reading, in the order the questions come up.

## 1. What a person hands an agent

One URL: `https://agents.onecontext.me`. It is the canonical address for AI agents, next to the human site. Everything an agent needs is reachable from it by following links, and every page exists twice: as HTML for a person, and as the same content in markdown for an agent.

| An agent that… | reads |
|---|---|
| can call tools | connects to `https://mcp.onecontext.me/mcp` and calls `setup` |
| can only fetch | `/llms.txt`, then the links it lists |
| wants everything at once | `/llms-full.txt` |
| installs skills with a tool | `npx skills add https://agents.onecontext.me` (reads `/.well-known/skills/index.json`) |

The apex `onecontext.me` forwards `/llms.txt`, `/llms-full.txt`, `/.well-known/skills/*`, `/.well-known/agent-skills/*` and `/agents` to the same place, because installers and llms.txt lookups target the origin root.

## 2. The three primitives

**Guide.** One markdown file per product, `GUIDE.md`. It is the standing instruction: what the product is, how to connect, the loop an agent runs, the rules that bite, and a map of the skills and tools. It is rendered as the home page (`/`), served raw at `/GUIDE.md`, and installed to `.claude/skills/context/GUIDE.md`. It never touches the host's own `AGENTS.md` or `CLAUDE.md`.

**Skills.** `SKILL.md` folders in the Agent Skills format that hosts install to disk. Two channels: `latest` is the newest immutable tag `vN`; `beta` is the head of `main`. Each skill carries `metadata.product` (`context` or `context-sites`) and `metadata.version`, which bumps when the body changes.

**Tools.** Each MCP server's tool catalog with every input and output schema, plus the deploy that produced it. The server describes itself; nobody edits the catalog by hand.

Products that extend the core live under `/extensions/<slug>/` with their own Guide, skills, tools and `llms.txt`. Today there is one: Context Sites. The core home only indexes them.

## 3. The URL map

```
/                     Guide rendered + live blocks (channels, skills table, tools table, extensions)
/index.md             the same in markdown        /GUIDE.md  /GUIDE@beta.md   the raw file
/llms.txt  /llms-full.txt
/skills  /skills.md  /skills/index.json
/skills/<key>  .md  @beta.md  @vN.md  /skills/<key>/versions.json
/tools  /tools.md  /tools/index.json
/tools/<server>  .md  /tools/<server>/tools.json
/extensions  /extensions/index.json
/extensions/<slug>/  index.md  llms.txt  GUIDE.md  skills/…  tools/…
/.well-known/skills/index.json  /.well-known/agent-skills/index.json   (sha256 digests)
/channels.json
```
Every `/mcp*`, `/guides*` and `/README.md` URL from the first version answers with a permanent redirect. Extension skills that used to live at `/skills/<key>` redirect to their extension.

## 4. The first session: what `setup` does

Every MCP server has one tool that never changes shape, `setup` (`start_context` remains as a deprecated alias on the Context server). The Guide's rule is: call it first, every session.

Input, all optional except `caller`:

```json
{"caller": {"agent": "Claude Code", "model": "claude-sonnet-5"},
 "host": "claude-code", "channel": "latest", "include": "manifest",
 "skills_held": [{"key": "context", "sha256": "…"}], "guide_held_sha256": "…",
 "install_scope": "project"}
```

Output (`agent-setup/1`), trimmed to the fields that matter:

```json
{"ok": true, "schema": "agent-setup/1",
 "server": {"key": "context", "product": "context", "endpoint": "https://mcp.onecontext.me/mcp",
            "catalog": {"url": "https://mcp.onecontext.me/.well-known/mcp/server-card.json",
                        "publishedAt": "2026-09-06T04:21:17Z", "sourceCommit": "3ef96e2", "toolCount": 53}},
 "channel": {"name": "latest", "ref": "v15", "sha": "3f877dd…"},
 "guide": {"url": "https://agents.onecontext.me/GUIDE.md", "sha256": "f1a36a8c…",
           "target": ".claude/skills/context/GUIDE.md", "status": "install"},
 "skills": [{"key": "context", "version": 2, "sha256": "54697b34…",
             "url": "https://agents.onecontext.me/skills/context.md",
             "target": ".claude/skills/context/SKILL.md", "status": "install",
             "files": [{"path": "references/charting.md", "url": "https://cdn.jsdelivr.net/gh/…", "sha256": "…"}]}],
 "drift": true, "nextAction": "install_skills",
 "install": {"mode": "agent_install", "commands": ["curl -fsSL --create-dirs -o .claude/skills/context/GUIDE.md https://agents.onecontext.me/GUIDE.md", "…"]}}
```

Rules the server applies:

- `status` is computed by comparing what the agent says it holds (`skills_held`, `guide_held_sha256`) with the manifest at the resolved channel. `drift` is true when anything is not `current`.
- URLs are channel-aware: `latest` serves `/skills/<key>.md`; `beta` serves `/skills/<key>@beta.md`; a pinned `vN` serves `/skills/<key>@vN.md`. Attached files always use the commit-pinned CDN URL. The bytes at the URL hash to the sha256 the server reported, so an agent can verify what it wrote.
- The Guide URL is the raw repo file, never the rendered home page, for the same reason.
- Chat hosts that cannot write files (`claude-ai`, `chatgpt`, or no host) get `install.mode: human_upload` and can ask for `include: "bodies"` to receive the text inline. Any other host string is treated as a file-capable agent.
- The response in manifest mode is about 5.5 KB for the Context server.
- The server never writes files. The agent writes them with its own tools, under the `target` paths, and verifies the hashes. Hosts do not auto-load skills from MCP; this is the pragmatic channel that works everywhere.

Both servers set the MCP `initialize.instructions` to "Call `setup` first in every session", for hosts that honour it.

## 5. How a change flows from a developer to every agent

**A skill change.** A developer edits `skills/<key>/SKILL.md`, bumps `metadata.version`, runs `pnpm check`, merges to `main`. CI (`channels.yml`) moves the `beta` tag to `main`, regenerates `channels.json`, and the site rebuilds. An agent on `beta` sees `status: update` for that one skill at its next `setup`. When the maintainer tags `vN`, CI moves `latest` and the same happens on the default channel. Measured on 2026-09-06: push to page in about 80 seconds.

**A tool change.** A developer pushes to the server repo. The server's CI deploys it and the server publishes its own card at `/.well-known/mcp/server-card.json` with `publishedAt` and `sourceCommit` stamped at build. The CI then dispatches `register-catalog.yml` on the skills repo, which fetches the card, commits `mcp/<key>.json`, rebuilds and redeploys the site. Measured: Sites 2 min 53 s, Context 3 min 11 s, no human step. A 6-hourly schedule is the safety net if a dispatch is missed.

**A Guide change** flows like a skill: on `main` it is beta; at the next tag it is latest.

There is no pin in server configuration any more. Both servers resolve the channel from `channels.json` on `main` (60-second cache, last-good fallback), then read `manifest.json` and files from the CDN at the resolved commit sha.

## 6. How the page is generated

`scripts/build-site.ts` in the skills repo reads Git, not the working tree: every `vN` tag plus `main` for skills and Guides, and `mcp/*.json` on `main` for catalogs. Product membership comes from data (`product` in the manifest, `server.product` in a catalog), never from generator code. The Guide may contain four markers, `<!-- live:channels -->`, `<!-- live:skills -->`, `<!-- live:tools -->`, `<!-- live:extensions -->`, which the generator replaces with generated blocks so the prose never carries a table that could drift.

The output is static. The only JavaScript is a version selector and copy buttons. The web server computes nothing at request time. If any input is unreachable the build fails and the previous deploy stays live.

## 7. Channels, tags and the files CI writes

- `vN` tags are immutable. `latest` and `beta` are moving tags written only by CI (`scripts/channels.ts move --push`).
- `channels.json` on `main` is the committed projection consumers read: `latest {ref, sha, date}`, `beta {ref, sha, date}`, and a per-skill map of versions and product. Its commit is marked `[skip ci]` and `beta` is defined as the content head, skipping those commits.
- `manifest.json` is committed and checked against the tree; it carries `product` per skill and a `retired` list (`rules` and `setup-context` → `context`) so consumers and redirects know where a retired key went.
- Catalogs `mcp/<key>.json` are `context-mcp-catalog/1` and may be up to 1 MiB.

One GitHub limitation worth knowing: the default workflow token cannot move a tag onto a commit whose workflow files differ from `main`. The repos carry a `CONTEXT_SKILLS_TOKEN` secret for tag moves and for cross-repo dispatch.

## 8. The gates

Beta only moves when these pass:

1. `check-skills`: frontmatter keys within the Agent Skills spec, `metadata.product` present, body under 500 lines and 20,000 characters.
2. `check-manifest` and `check-channels`: the manifest equals the tree; the committed `channels.json` equals the tags.
3. `check-site-links`: every link the generator emits resolves inside the site or on an allowlisted host; every redirect destination resolves (2,583 links, 59 redirects on the day of delivery).
4. `check-catalogs-live`: each committed catalog equals the live server card, ignoring timestamps. Warning on pull requests, failure on `main`.
5. `check-tool-names`: Guides and skills may only name tools that exist on a catalog. It found six retired tool names in the old docs on its first run.

The server repos gate deploys on their own suites: 427 Deno tests for the Context MCP, 217 tests for Sites. A push to the Context server that broke the catalog's self-check was stopped by that gate before deploying, then fixed.

## 9. What the evidence run showed

Scenarios, each an Issue on the evidence epic with the agent's own report posted through the Context MCP:

- Fresh install on Claude Code: 13 files (Guide, `context` v2 with eight references, `daily-brief`, `grill-me`, `wayfinder`), every sha256 verified.
- Beta drift: one skill bumped on `main`; next session on `beta` updated exactly one file.
- Release drift: tag pushed; next session on `latest` updated the same one file.
- Second host, OpenCode with a different model vendor: same files, same hashes.
- No MCP at all: a curl-only script installs from the site and matches the published digests.
- Tools drift: two pushes, two registrations, under four minutes each, no human step.
- Strict client: OpenCode validates tool output against the declared schema and rejected the error envelope on the first run; every tool schema now admits it.

Three defects were found by agents running the loop rather than by reading code: the Guide hash could not match the rendered page; the beta channel handed out the latest URL; a strict client rejected the error envelope. Each fix went through the same gates.

## 10. What is not covered

Agent-to-agent protocols and their discovery documents (`agent-card.json`, `_agent` DNS labels) are a different problem and are not part of this design. `agents.<domain>` is a convention chosen here, not a standard; the apex mirrors keep the standard lookups working. Codex CLI was not part of the evidence run on delivery day because of an account usage limit, not a defect.

## 11. Repositories and operations

| Repo | Holds | Deploy |
|---|---|---|
| `asaubhagya/context-skills` | Guides, skills, catalogs, generator, CI | `deploy-site.yml` on push/tag → Vercel `context-agents` |
| `asaubhagya/meetly-macos` | Context MCP (Supabase edge function) | `deploy-mcp.yml` on push to `supabase/functions/mcp/**` |
| `asaubhagya/context-blog` | Context Sites MCP (Next.js) | Vercel on `main`; CI `register` job after deploy |
| `asaubhagya/context-web` | app.onecontext.me, apex redirects | Vercel on `main` |

Secrets: `VERCEL_*` (skills repo), `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` (meetly-macos), `CONTEXT_SKILLS_TOKEN` (all three). Manual equivalents: `pnpm register-catalog all --commit`, `gh workflow run register-catalog.yml -f server=all`, `gh workflow run deploy-mcp.yml`.
