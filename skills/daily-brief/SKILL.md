---
name: daily-brief
description: >-
  Daily heartbeat for any recurring agent workflow tracked in Context: once a
  day, post one comment on the workflow's designated Daily Brief issue saying
  what published, what awaits approval, what failed and what is next. A
  missing brief is the outage alert.
depends: [rules]
license: MIT
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
- The time and timezone the owner chose (default 08:00 in their timezone).
- Optionally, any other MCP the workflow uses (read-only calls only).

## Once per day

1. `usage_guide` if this is a fresh session.
2. Gather, read-only, for the last 24 h and the next 24 h:
   - **Published** — issues of this epic that moved to `done` and carry a live
     link or deliverable.
   - **Awaiting approval** — issues `in_review` with an open `reviewRequest`,
     oldest first, with how long they have waited.
   - **Failed / skipped** — routine runs that errored, publish windows
     missed, checker bounces or escalations; anything you had to skip.
   - **Next** — what is scheduled in the next 24 h (drafts due, publish slots,
     reports), and the buffer left (drafts ready vs slots).
   - **Routine health** — each routine of this workflow: last run time,
     ok/failed. On a host with scheduled jobs read their logs (convention:
     `<repo>/.build/routines/<routine>.log`, last `start` / `end rc=` lines
     and the routine's one-line summary). Say plainly if you cannot observe
     one.
3. Post **one** comment on the Daily Brief issue with
   `post_task_update {id, body}` using the template below. If today's brief
   already exists (a comment from the last 20 h with the `Daily brief —` title),
   do not post a second one; append only if something failed since.
4. If anything failed or a publish window was missed, also raise it on the
   affected issue (`post_task_update`) so it is visible where the work is.
5. Report `workStats` on the update.

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

## Rules that bite here

- The brief is the alert. Never skip it because "nothing happened" — post
  `none` lines.
- Read-only towards other systems; the brief never publishes or approves.
- If the routine cannot run (host down, key missing), say so on the Daily
  Brief issue as soon as you can, with the key **name** that is missing.
