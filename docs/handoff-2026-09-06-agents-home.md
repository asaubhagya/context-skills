# Handoff — agents.onecontext.me (agent home), 2026-09-06

To the next agent. Context MCP refused writes (`WORKER_RESOURCE_LIMIT`) for most of this session, so this file is the durable copy; the Context issue under decision `d5d891b9-c77b-479b-b39a-afbd1cedae02` (CONT-501 › "Skills catalog governance") mirrors it when the server accepts writes.

## Goal
One agent-facing host for both products (Context, Context Sites): skills, MCP catalogs, guides, README — versioned from `asaubhagya/context-skills`, channels `latest` (tag) / `beta` (main). `app.` and `sites.` are human GUIs only.

## State (all live)
- **https://agents.onecontext.me** — Vercel project `context-agents` (team `asaubhagyas-projects`, id `prj_FL3qgZcSErkjPYlQTfH6sSymiwzC`), SSO protection off, domain verified.
  - `/` README (+ `/README.md`, `/llms.txt`) · `/skills` (15 skills; every tag v1–v13 at `/skills/<key>@vN[.md]`, `@beta`, version `<select>`, per-version changelog from git, `versions.json`, `/channels.json`) · `/mcp`, `/mcp/context`, `/mcp/context-blog` (grouped, expandable, params; `tools.json`) · `/guides/context`, `/guides/context-sites` (agent-first, from `guides/*.md` on main).
- Generator: `scripts/build-site.ts` → `pnpm build-site` → `site/` (gitignored). Deploy by hand: `cd site && vercel link --yes --project context-agents && vercel --prod --yes`.
- CI: `.github/workflows/deploy-site.yml` builds on main/tag pushes; deploys only when repo secret `VERCEL_TOKEN` exists (currently absent → builds, skips, green).
- Skills v13 (`rules-blog` 5, `blog-drafter` 7, `blog-checker` 5, `blog-publisher` 4, `instagram-drafter` 4 + `templates/instagram-preview.html`): review package = markdown deliverable + final rendered preview; Instagram = one swipeable viewer; locale variants are children of the EN master. Pinned via `SKILLS_REF=v13` on Blog MCP (Vercel `context-blog`) and Context MCP (Supabase secret, project `eqhokmrliqhkjtmalqkr`). Meetly overlay `context-blog-meetly` synced (`ce54ceb`), routines on `claude-sonnet-5`.
- Old hubs retired with **host-scoped** 308s: `context-web` `87110a5` + `fb70c57` (auto-deploys from main; the unscoped `/mcp` redirect briefly 308'd `mcp.onecontext.me` — never add redirects there without `has: host=app.onecontext.me`), `context-blog` `3604c90` (deployed, `SKILLS_BASE_URL` → agents), Context MCP `d226d41c` on `work/CONT-501-unify-server` (**not deployed**).

## Remaining
1. Owner: Vercel token → `vault set VERCEL_CI_TOKEN` → `gh secret set VERCEL_TOKEN --repo asaubhagya/context-skills --body "$(vault get VERCEL_CI_TOKEN)"` → `gh workflow run deploy-site.yml`.
2. Owner (classifier blocks agents): `cd ~/worktrees/CONT-501-unify-server && supabase functions deploy mcp --project-ref eqhokmrliqhkjtmalqkr` so `start_context.skill.url` points at agents (old links 308 there meanwhile).
3. Context MCP edge fn `mcp`: `WORKER_RESOURCE_LIMIT`/546 on any write with ≥1 issue for hours, reads fine. Investigate memory/CPU; also its `complete_issues` error text still names `post_task_update`; `claim_issue` says "Issue not found" on a Meetly-space issue.
4. Replay in Context when writes work: update `516a26b6` (Hub page → agents.onecontext.me, done), `acc2c8cc` (consumers read `channels.json` from agents), add "retire old hubs — done". Text is in the decision issue and this session's scratchpad.
5. Follow-ups still open under the decision issue: consumers resolve by channel (`channels.json`) instead of `SKILLS_REF`; `start_context`/`setup` drift (`skills_held`); `setup mode:files` lock + `run-routine.sh` sync; rules drift rule; semver; CONT-501 branches → main.
6. Small: `web/lib/guides/connect.ts` `blogMcp` still `blog.onecontext.me/api/mcp`; `docs/**` in web/blog-publishing cite old hub URLs.

## Verification run
`curl -sI https://agents.onecontext.me/channels.json` → 200 · `curl -sI https://app.onecontext.me/mcp` → 308 agents · `curl -sI https://sites.onecontext.me/skills/rules-blog.md` → 308 agents · POST initialize `https://mcp.onecontext.me/mcp` → 200 · `gh run list --repo asaubhagya/context-skills` → both workflows green on `0e8e461`.
