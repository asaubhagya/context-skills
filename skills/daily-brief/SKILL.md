---
name: daily-brief
description: >-
  Daily heartbeat for any recurring agent workflow tracked in Context: once a
  day, post one comment on the workflow's designated Daily Brief issue saying
  what published, what awaits approval, what failed and what is next, and
  rebuild the epic's `## Runs` block (schedule · next slots · routine health
  · last 7 briefs) so the owner sees it on the epic. A missing brief is the
  outage alert.
depends: [context, rules]
license: MIT
version: 3
---

# Daily brief

Every recurring workflow (a drafter that runs nightly, a publisher every few
hours, a weekly report…) installs this skill **first** — before any other
routine — because it is the dead-man's switch: if the brief does not appear,
the owner knows the loop is down without any server-side monitor. Context has
no scheduler by design; the routine runs on the host that owns the workflow.

## Inputs

- The workflow's epic in Context and its **Daily Brief issue** (a standing
  child issue titled `Daily Brief`, label `brief:daily`). Create it when the
  workflow is charted if it does not exist; record its id in the epic's
  `## Rules`.
- The workflow's **channel parents**, when it has them (issues labelled
  `lane:<channel>` under the epic — `Blog`, `Instagram`, `Site` — whose
  children are the pieces) and its `Backlog` (`lane:backlog`). Resolve them
  with `list_issues {parent_id: <epic>, label: "lane:<x>"}` or read the ids
  from the epic's `## Structure`. `list_issues {parent_id}` returns direct
  children only: the pieces are visible through their parent, never through
  the epic.
- The time and timezone the owner chose (default 08:00 in their timezone).
- Optionally, any other MCP the workflow uses (read-only calls only).

## Once per day

1. `start_context` if this is a fresh session.
2. Gather, read-only, for the last 24 h and the next 24 h — over the pieces
   (`list_issues {parent_id: <channel parent>, includeClosed: true}` for each
   parent, follow `nextCursor`; the epic's direct children when the workflow
   has no parents):
   - **Published** — pieces that moved to `done` and carry a live link
     (`Published:` update) or deliverable.
   - **Awaiting approval** — issues `in_review` with an open `request_review`,
     oldest first, with how long they have waited.
   - **Failed / skipped** — routine runs that errored, publish windows
     missed, checker bounces or escalations; anything you had to skip.
   - **Next** — what is scheduled in the next 24 h (drafts due, publish slots,
     reports), the buffer left (drafts ready vs slots), and the open
     Backlog (ideas / topics).
   - **Routine health** — each routine of this workflow: last run time,
     ok/failed. On a host with scheduled jobs read their logs (convention:
     `<repo>/.build/routines/<routine>.log`, last `start` / `end rc=` lines
     and the routine's one-line summary). Say plainly if you cannot observe
     one.
3. Post **one** comment on the Daily Brief issue with
   `post_comment {parent_id: id, body}` using the template below. If today's
   brief already exists (a comment from the last 20 h with the `Daily brief —`
   title), do not post a second one; append only if something failed since.
4. If anything failed or a publish window was missed, also raise it on the
   affected issue (`post_comment`) so it is visible where the work is.
5. Report `workStats` on the update.
6. Rebuild the epic's `## Runs` block (next section) — also on days when
   today's brief already existed.

## Template

```
Daily brief — <YYYY-MM-DD> (<timezone>)

Published (24h): <n> — <title> → <link> · …  (or "none")
Awaiting approval: <n> — <title> (<waited>) · …  (or "none")
Failed / skipped: <n> — <what, why, what you did>  (or "none")
Next 24h: <what is due, when> · buffer: <n drafts / m slots>
Routines: <name> ok <time> · <name> FAILED <time> — <one line>
```

Keep it under 20 lines. Names, not bare ids. No credential values, ever.

## Epic `## Runs` block — the owner's at-a-glance

The epic description ends with a `## Runs` block: the routine schedule, the
next three slots, routine health and the last seven briefs as one-liners.
After the comment, `get_epic {id: <epic>}` → `description`, keep everything
**above** `## Runs` byte for byte, rebuild the block from today's data
(never append to the old one), `update_epic {id: <epic>, description}`.
Append the block if the epic has none yet.

```
## Runs
schedule: brief <08:00 daily> · drafter <02:00 nightly> · publisher <every 3 h> · assessment <Mon 09:00> (<tz>)
next: <Mon 07 Sep 09:00 IG MTLY-190 (in review)> · <Mon 07 Sep 22:00 blog MTLY-177> · <Tue 08 Sep 07:00 IG MTLY-191>
routines: brief ok <03 Sep 08:00> · drafter <ok 03 Sep 02:00 | FAILED 03 Sep 02:00 rc=1 | never> · publisher <…> · assessment <…>
briefs:
- <03 Sep>: published <n> · awaiting <n> · failed <n> · next <one phrase>
- … (last 7 days, newest first)
```

- `schedule` comes from the routine definitions on this host and the
  epic's `## Rules` (timezone); `next` = the three earliest `due` among open
  pieces across the channel parents (day, time, channel, ticket, state when
  not backlog), padded with the next cadence slots marked `(no issue)`;
  `routines` = the health lines you gathered; `briefs` = one line per day
  from the last seven briefs on the Daily Brief issue, today's first.
- **Budget: 2048 characters for the whole description.** If the rebuilt
  text exceeds it, drop the oldest `briefs` line, then the third and the
  second `next` entries, until it fits. Never cut above `## Runs`; if the
  text above the block alone leaves fewer than ~400 characters, write
  `schedule` and `routines` only and say so in the comment.
- Nobody else writes this block. If the write is refused, say so in the
  comment — the comment is the record, the block is the view.

## Rules that bite here

- The brief is the alert. Never skip it because "nothing happened" — post
  `none` lines.
- Read-only towards other systems; the brief never publishes or approves.
- If the routine cannot run (host down, key missing), say so on the Daily
  Brief issue as soon as you can, with the key **name** that is missing.
