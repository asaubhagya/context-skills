# E10 release — skills `v5` (site-builder) + Context Blog launch page · CONT-438

## 1. Tag `v5` and point the MCPs at it

Branch `work/E10-site-builder` is on main `0cd9bd3` (v4). `manifest.json` is stamped `ref: v5`, 13 skills / 35 files. Tags are never moved; `v4` stays.

```sh
cd ~/repos/context-skills
git merge --ff-only work/E10-site-builder            # or PR → merge
pnpm check-skills && pnpm check-manifest              # expect: 13 skills OK · manifest.json is up to date (13 skills)
git tag v5 && git push origin main --tags
curl -s https://cdn.jsdelivr.net/gh/asaubhagya/context-skills@v5/manifest.json \
  | python3 -c 'import json,sys; m=json.load(sys.stdin); print(m["ref"], {s["key"]: s["version"] for s in m["skills"]})'
# expect: v5 {…, 'blog-agent': 5, 'site-builder': 1, …}
```

Then `SKILLS_REF=v5` on the three MCPs as `docs/E6/release.md` §1 (Blog, Web, iOS), redeploy, and check on the Blog MCP:

- `list_skill_catalog` shows `site-builder@1` and `blog-agent@5`.
- `setup {workflow: "site", harness: "claude-code", canWriteFiles: true}` returns `site-builder` (+ `templates/page-brief.md`) with `rules-blog`, `rules`, `blog-checker`, `grill-me` in the closure and `missing: []` — today it reports the workflow skill as missing because v4 has no `site-builder`.
- `https://app.onecontext.me/skills/site-builder` renders.

Rollback: `SKILLS_REF=v4`. The tenant, brand and page on the Blog MCP are independent of the skills ref.

## 2. Publish the landing page — after the owner approves

CONT-461 (`6b46fd78-c6d1-4005-9d6b-82bf97a887ea`) is `in_review` in Context with the deliverable, preview and checker verdict attached; the page `7a19fc2a-d6c8-40aa-aab1-f7092e311e65` is `in_review` on the Blog MCP. The gate is raised on CONT-438 by the primary agent. Once the owner approves (CONT-461 / CONT-438 `done`):

```sh
# Blog MCP, bearer $(vault get CONTEXT_BLOG_MCP_TOKEN) — never print it
page_set_status {tenant_slug: "context-blog", id: "7a19fc2a-d6c8-40aa-aab1-f7092e311e65", status: "approved"}
publish        {tenant_slug: "context-blog", page_id: "7a19fc2a-d6c8-40aa-aab1-f7092e311e65",
                context_issue_id: "6b46fd78-c6d1-4005-9d6b-82bf97a887ea", assert_context_done: true}
# → { url: "https://sites.onecontext.me/launch", action: "publish", publish_event_id }
```

Then `post_task_update` the live URL on CONT-461 and `complete_tasks` with `workStats` (the owner's approval closes the gate; the agent never marks a gate ticket done itself — if the server refuses, say so and leave it).

## 3. Verify `sites.onecontext.me`

```sh
curl -sI https://sites.onecontext.me/launch | head -1                 # 200
curl -s  https://sites.onecontext.me/launch | grep -c 'Context Blog — agents write'   # ≥ 1
curl -s  https://sites.onecontext.me/launch | grep -o '"@type":"Organization"'        # brand JSON-LD present
curl -sI https://sites.onecontext.me/ | head -1                       # 200 — the hub view ("Nothing published yet.")
curl -s  https://blog.onecontext.me/t/context-blog/launch | head -c 200                # platform path also serves it
```

`domain_status {tenant_slug: "context-blog", hostname: "sites.onecontext.me"}` records the verification on the tenant. If `/launch` 404s on the host but works on `/t/context-blog/launch`, the E4 middleware is not keying on `primary_hostname` for this host — check `middleware.ts` host matching and the Vercel alias.

## 4. Owner actions

1. Approve CONT-461 (the page) via the gate on CONT-438 — the preview link is in the issue: `https://blog.onecontext.me/preview/c5bb5547-a1a2-4f74-9cd8-46fbe7489df0?sig=…` (valid to 2026-09-09; `preview_render` again after that).
2. Post the LinkedIn text yourself (document `3fbf07d3-b912-4fe7-86b9-f33c197ce08e` on CONT-438) — swap the link to the guide if the page is not live yet.
3. Decide on the root: keep `/launch` (link it from onecontext.me) or ask for the E4 follow-up "site-only tenant root renders page `index`". Until then `sites.onecontext.me/` is the empty hub.
4. Two brief inconsistencies the checker surfaced, for a later skills bump (not changed here): `rules-blog` §1 and the README say the Blog MCP is at `sites.onecontext.me/api/mcp`; the server's own contract and usage guide say `blog.onecontext.me/api/mcp`.

## 5. Rollback / kill

Page: `page_set_status {status: "retired"}` after publish (the renderer 308s a retired page to the hub). Tenant: `tenant_update` to drop `primary_hostname` frees `sites.onecontext.me`. Skills: `SKILLS_REF=v4`.
