# E6 release — skills v3 + Meetly routines (CONT-434)

## 1. Skills: tag `v3` and repoint the MCPs

Branch `work/CONT-434-loop-skills` (commit `18dcb79`) carries `manifest.json` stamped `ref: v3`. Not tagged or pushed by the worker.

```sh
cd ~/repos/context-skills            # canonical checkout
git merge --ff-only work/CONT-434-loop-skills   # or PR → merge
pnpm check-skills && pnpm check-manifest        # manifest matches the tree
git tag v3 && git push origin main --tags       # tags are never moved or deleted (jsDelivr caches them)
curl -s https://cdn.jsdelivr.net/gh/asaubhagya/context-skills@v3/manifest.json | head -5
```

Then set `SKILLS_REF=v3` on the three MCPs, in this order, checking each:

| MCP | where | check |
|---|---|---|
| Context Blog MCP (`blog.onecontext.me`) | Vercel env `SKILLS_REF` → redeploy | `get_capabilities.skillChannel.ref == "v3"`; `list_skill_catalog` shows `blog-drafter`, `blog-publisher`, `blog-checker@2`, `blog-agent@2`; `setup {workflow: "blog", harness: "claude-code", canWriteFiles: true}` returns the two new skill folders |
| Context Web MCP (`app.onecontext.me`) | Vercel env `SKILLS_REF` → redeploy | `list_harness_skills` still serves `rules`, `setup-context`, `daily-brief` (daily-brief text gained one sentence) |
| Context iOS MCP (Supabase Edge Function `mcp`) | function secret `SKILLS_REF` → redeploy | same as Web; parity fixtures green |

Rollback: point `SKILLS_REF` back to `v2` — no code changes. Hosts that already copied v3 files keep them (they are additive: two new skills, the checker exception, the drafter/publisher references).

After the bump, in `~/repos/context-blog-meetly`: re-run `setup {workflow: "blog", harness: "claude-code", canWriteFiles: true, installedSkills: [...]}` and overwrite `.claude/skills/` so the host copy equals the served set (the README says so).

## 2. Routines on the Mac mini (already installed by E6)

Install recipe (per routine, daily-brief first):

```sh
cd ~/repos/context-blog-meetly
cp routines/me.onecontext.blog.meetly.<name>.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/me.onecontext.blog.meetly.<name>.plist
launchctl list | grep me.onecontext.blog                       # "-  0  me.onecontext.blog.meetly.<name>"
scripts/run-routine.sh daily-brief                             # first fire by hand; confirm a comment on MTLY-170
tail -n 30 .build/routines/<name>.log
```

Change a schedule or the model: edit the plist (or `CONTEXT_BLOG_MODEL` in its `EnvironmentVariables`), then `launchctl bootout gui/$(id -u)/<label>` and `bootstrap` again.

Pause everything without uninstalling: `touch ~/repos/context-blog-meetly/DISABLE` (every routine exits 0 and logs "DISABLE present"). Resume: `rm DISABLE`.

Rollback (remove a routine):

```sh
launchctl bootout gui/$(id -u)/me.onecontext.blog.meetly.<name>
rm ~/Library/LaunchAgents/me.onecontext.blog.meetly.<name>.plist
```

Full rollback = the four `bootout`s + `rm` of the four plists; the repo can stay. The old loop `com.growthwriter.nightly` is untouched (loaded, `DISABLE`d); its removal is E7.

## 3. Operate

- Dead-man's switch: a comment "Daily brief — <date>" on MTLY-170 every day at 08:00 SGT. None → `tail .build/routines/daily-brief.log` and `launchctl print gui/$(id -u)/me.onecontext.blog.meetly.daily-brief`.
- Drafter fires 02:00 SGT nightly; while MTLY-176 is open it logs `drafter: nothing to draft` / the blocker and exits.
- Publisher fires every 3 h from bootstrap; publishes only `done` issues inside their window.
- Assessment fires Monday 09:00 SGT; posts on Performance Report + AEO/SEO Health (no `stats` tool yet → says so).
- Keys by name only: `CONTEXT_BLOG_MCP_TOKEN` (KeyVault) is read at each run; rotate it in the vault, nothing else changes.
