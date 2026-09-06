# ADR-0009 — agents.onecontext.me: Guide · Skills · Tools from one source of truth

Status: accepted 2026-09-06 · Context epic `841aa1de` · supersedes the v1 "agent hub" (CONT-544)

## Decision

Every product gets one canonical address for AI agents, `agents.<domain>`, next to the human site. A person hands that URL to any agent and the agent learns what the product is, how to operate it, and where its tools are — with nothing to configure and nothing that goes stale.

The address exposes exactly three primitives:

| Primitive | What it is | Source of truth | How an agent gets it |
|---|---|---|---|
| **Guide** | The standing instruction: what the product is, how to connect, the loop, the rules that bite, a map of skills and tools. One per product. | `GUIDE.md` in the skills repo | It **is** the home page (`/`, `/index.md`, `/llms.txt`), and `setup` names it |
| **Skills** | Repeatable procedures (`SKILL.md`), versioned on two channels: `latest` = newest immutable `vN` tag, `beta` = head of `main` | `skills/<key>/SKILL.md` in Git | `setup` returns the manifest (version, sha256, URL, target path); the agent writes the file. `npx skills add <host>` works via `/.well-known/skills/index.json` |
| **Tools** | Each MCP server's tool catalog with full input/output schemas and the deploy that produced it | The running server, self-described at `/.well-known/mcp/server-card.json` | Connect the endpoint; read `/tools/<server>` for the schemas |

Products that extend the core (today: Context Sites) live under `/extensions/<slug>/` with their own Guide, skills, tools and `llms.txt`. The core home only indexes them, so the core Guide never mixes with an extension's vocabulary.

## The three rules that make it work

1. **Progressive disclosure, by links.** The home page is the Guide and fits an agent's first read (~1.5k tokens of prose plus generated tables). Everything deeper is one link away: a skill's `.md`, a server's schemas, an extension's own home. `llms.txt` is the same tree for fetch-only agents; `llms-full.txt` is the everything-in-one-file fallback. Every HTML page has an identical-content `.md` sibling. No runtime JavaScript.
2. **One fixed tool on every MCP: `setup`.** Tool names evolve; `setup` does not. It returns `agent-setup/1`: the channel it resolved, the Guide URL + sha256, and each skill's version, sha256, URL and install target, with `status: current | update | install` computed against what the agent says it holds. `drift: true` means refresh. Chat hosts that cannot write files get `include: "bodies"`. The Guide's standing rule: call `setup` every session, follow `nextAction`, record versions in `work_stats`. Skills wrap the server's tools, so refreshing skills is how behaviour ships without touching any host's `AGENTS.md`.
3. **Git and the running server are the only sources; the site is a hydrated view.** Skills and Guides come from tags and `main`; CI is the only writer of the moving `latest`/`beta` tags and of `channels.json`. Each MCP registers its own catalog at deploy time (its CI calls `register-catalog`; a 6-hourly schedule is the safety net), the catalog is committed, and the site rebuilds. The web server computes nothing at request time. If a source is unreachable the build fails and the previous deploy stays live — never a silently stale page.

## Gates (beta only moves when green)

1. Skills follow the Agent Skills spec (top-level keys ⊆ name/description/license/compatibility/metadata/allowed-tools; `metadata.product` present; body < 500 lines / < 20k chars).
2. `manifest.json` equals the tree; `channels.json` equals the tags.
3. Every link the generator emits resolves inside the site or on an allowlisted host; every redirect destination resolves.
4. Each committed catalog equals the live server card (soft on PRs, hard on main).
5. Guides and skills name only tools that exist on a catalog (`check-tool-names`; it caught six retired tool names on day one).

## What is new here, and what is not

Not new: `llms.txt`, `.md` siblings and content negotiation, the Agent Skills spec and `npx skills add`, digest-verified skill indexes, "skills served over MCP" as `list/get` tools. Claude Code declined to auto-load skills from MCP resources or well-known indexes (May 2026) and Claude.ai drops `initialize.instructions`, so the pragmatic channel is a tool that *tells* the agent what to write, and the agent writes it.

New, as a composition: the Guide as the home page; `setup` as a fixed, drift-aware bootstrap that refreshes skills wrapping the server's own tools every session; and the registration loop that makes the public page a projection of Git plus the running servers, with CI gates that stop the docs from lying about the tools.

Honest caveats: `agents.<domain>` is a convention we chose, not a standard — A2A uses `agent-card.json` and an `_agent` DNS label for a different purpose — which is why the apex mirrors `/llms.txt` and `/.well-known/*` to the subdomain.

## Consequences

- Retired: `guides/`, the `rules` and `setup-context` skills (folded into `GUIDE.md` and `context`), `SKILLS_REF` pins on both servers, `/mcp*` and `/README.md` URLs (301s stay).
- New CI surfaces: `channels.yml` (tag mover), `register-catalog.yml`, `build-deploy.yml` (reusable), `deploy-mcp.yml` in meetly-macos (ready for `SUPABASE_ACCESS_TOKEN`), a register step in context-blog CI (ready for `CONTEXT_SKILLS_TOKEN`).
- Evidence: the end-to-end trace on epic `841aa1de` — a fresh project on Claude Code and Codex calls `setup`, installs, then detects a bumped skill and a new tool on the next session and refreshes both.

<!-- e2e: filled in when the run completes -->
