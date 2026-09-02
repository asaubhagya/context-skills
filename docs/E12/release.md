# E12 release — skills `v4` (epic structure v2) · CONT-454

## 1. Tag `v4` and point the MCPs at it

Branch `work/E12-epic-v2` is stacked on E9's `work/CONT-437-instagram` (`56cea92`, itself on E6's `work/CONT-434-loop-skills`); `manifest.json` is stamped `ref: v4` with 12 skills / 33 files. Tags are never moved: `v3` (E6 + E9) stays wherever it was cut; E12 is a new tag.

```sh
cd ~/repos/context-skills
git merge --ff-only work/E12-epic-v2               # or PR → merge (contains E6 + E9 + E12)
pnpm check-skills && pnpm check-manifest           # expect: 12 skills OK · manifest.json is up to date (12 skills)
git tag v4 && git push origin main --tags
curl -s https://cdn.jsdelivr.net/gh/asaubhagya/context-skills@v4/manifest.json \
  | python3 -c 'import json,sys; m=json.load(sys.stdin); print(m["ref"], {s["key"]: s["version"] for s in m["skills"]})'
# expect: v4 {'blog-agent': 4, 'blog-checker': 3, 'blog-drafter': 2, 'blog-publisher': 2, 'daily-brief': 2, 'instagram-drafter': 2, 'instagram-publisher': 2, 'rules': 1, 'rules-blog': 2, 'setup-context': 1, 'grill-me': 1, 'wayfinder': 1}
```

Then `SKILLS_REF=v4` on the three MCPs exactly as `docs/E6/release.md` §1 (Blog, Web, iOS), redeploy each, and check:

- `list_skill_catalog` shows `blog-agent@4`, `daily-brief@2`, `rules-blog@2`, `blog-drafter@2`, `blog-publisher@2`, `blog-checker@3`, `instagram-drafter@2`, `instagram-publisher@2`.
- `setup {workflow: "blog", harness: "claude-code", canWriteFiles: true}` returns `blog-agent` with **eleven** attached files (the ten from v3 plus `routines/no-machine.md`) and every skill in `depends`.
- A `setup blog` conversation for an existing tenant opens with `Epic <title> (<ticket>) exists — using it.` and offers `redo` / `routines` before any interview question.

Rollback: point `SKILLS_REF` back to `v3`. Hosts that copied the files keep them (additive); the Meetly re-chart in Context (parents, re-parenting, epic description) is independent of the skills ref and stays.

## 2. Re-run the `setup` overlay in the host repo

After the bump, in `~/repos/context-blog-meetly`: re-run `setup` and overwrite `.claude/skills/` so the host copy equals the served set (today it is a manual overlay from the worktree, `diff -rq` clean except the host-only `grill-me` / `wayfinder`). `routines/prompts.md` is host-owned and already filled for v2 — do not overwrite it with the template.

## 3. Host (Mac mini) — nothing to install

The four launchd routines (`me.onecontext.blog.meetly.daily-brief` 08:00 · `blog-drafter` 02:00 · `blog-publisher` every 3 h · `blog-assessment` Mon 09:00) read `routines/prompts.md` at run time; the v2 prompts (parent ids, Backlog, `## Runs` rebuild) are live from the host-repo commit. Verify after the first runs:

```sh
cd ~/repos/context-blog-meetly
launchctl list | grep me.onecontext.blog                       # four labels, exit 0
tail -n 30 .build/routines/daily-brief.log                     # 03 Sep 08:00 run: end rc=0
tail -n 40 .build/routines/blog-drafter.log                    # 04 Sep 02:00: "drafter: … drafted MTLY-177 …" then "instagram-drafter: … MTLY-191 …"
```

And in Context: `get_task` on MTLY-169 → `## Runs` shows `briefs:` with a `03 Sep` line and `routines: brief ok 03 Sep 08:00 …`; MTLY-170 carries "Daily brief — 2026-09-03".

## 4. Owner actions (phone)

1. Close Idea Lane (MTLY-171) and Topic Lane (MTLY-172) — the server refuses agent-side closes on `gate:none` lanes; both carry the fold comment. Decide on Audience & Persona (MTLY-173): keep as a standing issue or close (the v2 template no longer creates it; audience revisions are document versions on the epic via `redo`).
2. MTLY-190 is still waiting for the first-carousel approval (unchanged by E12 except its parent).
3. Optional: run `setup blog` once from Claude Code to see the existing-epic path and let the routines step re-verify the four launchd jobs (it prints the filled templates and reports "unchanged, verified").

## 5. Rollback / kill

`touch ~/repos/context-blog-meetly/DISABLE` pauses every routine. To undo the re-chart by hand: `save_work {id, parentId: "423c5419-07ab-4e8c-83ca-dc1fea1c640d"}` on each piece moves it back under the epic; the parents can then be closed by the owner. The old epic description is in this ticket's history (Context activity) and in `docs/E12/mini-spec.md` §3.
