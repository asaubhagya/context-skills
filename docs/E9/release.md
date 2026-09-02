# E9 release — Instagram skills + first carousel (CONT-437)

## 1. Skills: same `v3` tag as E6

Branch `work/CONT-437-instagram` is stacked on `work/CONT-434-loop-skills` (`fb069af`); `manifest.json` is re-stamped `ref: v3` with 12 skills / 32 files. Nothing pushed or tagged by the worker.

```sh
cd ~/repos/context-skills
git merge --ff-only work/CONT-437-instagram        # or PR → merge (contains E6's commits)
pnpm check-skills && pnpm check-manifest
git tag v3 && git push origin main --tags          # if v3 was already tagged for E6 alone: tag v4 instead and set SKILLS_REF=v4 (tags are never moved)
curl -s https://cdn.jsdelivr.net/gh/asaubhagya/context-skills@v3/manifest.json | python3 -c 'import json,sys; print([s["key"] for s in json.load(sys.stdin)["skills"]])'
```

Then `SKILLS_REF` on the three MCPs exactly as `docs/E6/release.md` §1; the extra checks: `list_skill_catalog` shows `instagram-drafter@1`, `instagram-publisher@1`, `blog-agent@3`; `setup {workflow: "instagram", harness: "claude-code", canWriteFiles: true}` returns `instagram-drafter` with its four attached files and `rules-blog`/`blog-checker` via `depends`; `setup {workflow: "blog"}` now returns both Instagram skills too.

Rollback: point `SKILLS_REF` back — hosts that copied the files keep them (additive).

After the bump, in `~/repos/context-blog-meetly`: re-run `setup` and overwrite `.claude/skills/` so the host copy equals the served set (today it is a manual overlay, `diff -rq` clean).

## 2. Blog MCP follow-up (server slice, before the first live post)

`publish {instagram_post_id}` requires the row to be `approved`, and `blog-1.2.0` has no `instagram_post_set_status`. Either add `instagram_post_set_status {tenant_slug, id, status, assert_context_done?}` (mirror of `article_set_status`) or let `publish` take an Instagram `draft` straight to `published` when `assert_context_done` is set. Until then the publisher schedules on Postiz (the owner's approval is in Context) and posts `Publish record pending` on the issue; re-run the publisher once the tool exists and the `publish_events` row lands.

## 3. Host (Mac mini) — nothing to install

The two existing routines (`me.onecontext.blog.meetly.blog-drafter` 02:00, `me.onecontext.blog.meetly.blog-publisher` every 3 h) read `routines/prompts.md` at run time and now carry the Instagram paragraphs; `scripts/run-routine.sh` allow-lists the three skill scripts. Verify after the first night:

```sh
cd ~/repos/context-blog-meetly
tail -n 40 .build/routines/blog-drafter.log        # expect the "instagram-drafter: …" summary line after "drafter: …"
ls .build/instagram/                               # one folder per drafted ticket
```

Requirements on the host: Google Chrome at `/Applications/Google Chrome.app` (or `CHROME=<path>`), `vault get POSTIZ_API_KEY` and `vault get CONTEXT_MCP_TOKEN` resolving (names only; both present on 2026-09-03).

## 4. First live carousel — MTLY-190

1. Owner reviews the issue (deliverable + 8 slide previews). The primary agent raises the artifact `reviewRequest` after the `blog-checker` verdict is attached.
2. Approve → state `done`. Slot Mon 2026-09-07 09:00 Asia/Singapore (`due` 2026-09-07T01:00:00Z).
3. The 3-hourly publisher run inside `[09:00, 12:00)` SGT: dedupe guard → upload 8 slides → schedule on "Meetly | Private AI Meeting Recorder" → `Scheduled: postiz <id>` on the issue → next run `Published: <instagram.com/p/…>`.
4. Music (owner's call): reply on the issue before the slot; the publisher then leaves it to the owner (IG app) and only records the permalink.

Manual fallback (no routine): `scripts/run-routine.sh blog-publisher` by hand inside the window, or the owner posts from the IG app with the PNGs in `.build/instagram/MTLY-190/` and pastes the permalink on the issue.

## 5. Rollback / kill

`touch ~/repos/context-blog-meetly/DISABLE` pauses every routine. To stop a scheduled post before it goes out: `.claude/skills/instagram-publisher/scripts/postiz.sh delete <postiz post id>` (id in the `Scheduled:` comment) and say so on the issue; the dedupe guard then allows a re-schedule on the next run only if the `Scheduled:` comment is superseded by an owner comment — otherwise re-slot by hand.
