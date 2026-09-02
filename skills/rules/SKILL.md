---
name: rules
description: >-
  The Context harness — the execution discipline any agent follows when a task
  needs a plan and runs through Context. Load first; every other Context skill
  inherits these rules.
depends: []
license: MIT
attach: [agents-block.md, ../spec-template.md]
---

# Context harness — rules

These rules govern how you work when a task runs through Context (the tracker
for agent work: agents write over MCP, a human reviews and approves in the
Context app or Context Web). They are host-neutral: the same rules apply in
Claude Code, Codex, Cursor, ChatGPT, claude.ai or any other MCP client.

The harness is **not** the Context app agent (on Context Web that agent is
called Nomi, and it also handles health, personal space, memories and people).
The harness is only the discipline for *executing a task that needs a plan*.
When the app agent is asked to do such a task, it hands over to these rules.

## 0. Before any write

1. Call `usage_guide` once per session before the first write. It is the
   contract for the tools you are about to use; do not work from memory.
2. Report `caller {agent, model}` on every call where the schema asks for it,
   and `workStats` on every update that completes a unit of work (harness,
   model, role, thinking, tokens, cost, duration, skills, tools). Trace what
   happened; never prescribe who does what in advance.
3. Never solicit, store or echo credential values. Refer to keys by **name
   and scope** only (`OPENROUTER_API_KEY`, read-only). If a value is needed,
   name the key and where the user keeps it; stop there.

## 1. Brainstorm first — wayfinder + grill-me, verbatim

Any task that needs a plan starts with a brainstorm, never a from-scratch
questionnaire:

- Use Matt Pocock's `grill-me` (grilling) to interview: work the design tree
  in rounds, ask the whole frontier at once as numbered `❓ Qn` questions,
  each with a `➡️` recommendation; wait for real answers; recompute the
  frontier; stop only when nothing is left silently assumed.
- Use his `wayfinder` to chart: name the destination, map the frontier
  breadth-first, create the map and the tickets you can specify now, wire
  the blocking edges in a second pass, keep the fog in *Not yet specified*.
- **Facts are fetched, decisions are asked.** Anything you can read, run,
  search or fetch yourself is never a question to the user.

Both skills are used as published (MIT, github.com/mattpocock/skills, pinned
commit recorded in their headers). Do not paraphrase them into a wrapper.

## 2. One Context map, one combined gate

The **Context map** is the wayfinder map in Context terms: one epic whose
children are the tickets, joined by native `blocks`/`blockedBy` links — the
dependency graph. It **is** the plan.

- Exactly one map per effort. Chart it with `save_work {kind: "epic"}` and
  `save_work {kind: "issue", parentId}` per ticket; wire links after ids exist.
- Write the **spec** alongside the map (for code work, follow
  `spec-template.md`). Attach it to the epic with `send_file`.
- Raise **one** `reviewRequest` for the map **and** the spec together, on the
  ticket that carries the plan gate. The owner approves both in one decision.
  Do not batch other decisions into it and do not raise it twice.
- The map marks, per ticket, which further gate applies
  (`gate:artifact | final | none`) and which execution mode is expected.
- Wait for the decision with `get_events {cursor, waitMs: 25000}` (fall back
  to bounded `get_task` polling); never assume approval.

## 3. Execute ticket by ticket

Two execution modes; the executor chooses:

- **Parallel** — one session reads the dependency graph, takes the ready
  tickets (`list_tasks {kind: "issue", ready: true, parentId}`), and spins one
  subagent per ticket, each in its own task-owned worktree. The primary
  session owns integration and verification.
- **Single** — one agent, one ticket, start to finish.

Either way, claim before working (`save_work {id, assignee, state:
"started"}`), and every ticket produces three documents attached to it:

1. **Mini-spec** — what exactly is being built, decisions taken, deviations
   from the approved spec and why.
2. **Acceptance tests** — a checklist with how each item was verified. Run the
   build/tests/checks the change affects and report actual results; never
   claim a result you did not observe.
3. **Release doc** — what to deploy, in which order, and how to roll back.

The map's **overall release doc** links every per-ticket release doc and
summarises the whole run. Deliverables are attached (`docKind:
"deliverable"`); everything else the reviewer needs goes back to its ticket,
never left in chat.

## 4. Skills are the product

When a ticket produces or changes a skill, it must also ship a **benchmark**:
fixture prompts → expected agent behaviour, with pass/fail criteria. Re-run
the benchmark on every revision of that skill and record the result on the
ticket.

## 5. Specs for code

Use `spec-template.md` for any ticket that changes code: code layout,
non-functional requirements (scale, reliability, cost) and an operational
runbook (release, rollback, traffic spikes, alerting). A section may read
"N/A — <reason>" but it must exist.

## 6. Recurring workflows install a daily brief first

Any workflow that runs on a schedule installs the `daily-brief` skill and its
routine **before** any other routine: one comment per day on a designated
issue — what published, what awaits approval, what failed, what is next. A
missing brief is the outage alert. There is no server-side fallback by design.

## 7. Handoff before stopping

Before any interruption, milestone or hand-over to another agent, post one
comment on the ticket: goal · repo · worktree + branch · done · key files ·
decisions and why · verification run · remaining · blockers · next action.
Address it to "the next agent", never to a specific harness. Resuming means:
read the handoff → open the worktree → `git status` → reconcile (Git wins) →
re-run verification → continue.

## 8. Safety and scope

- Refuse to store credentials, confidential employer data, health or payment
  data or regulated records; ask for a redacted brief instead.
- Stay inside the task's worktree and the repos the ticket names.
- Do not push, merge, deploy or apply migrations unless the ticket says so.
- If a server rule rejects a write (epic limits, orphan issue, gate needs an
  attached document), read the error — it names the rule and the fix.

## Quick reference

| Moment | Call |
|---|---|
| Session start | `usage_guide` |
| Brainstorm | load `grill-me`, then `wayfinder` |
| Chart | `save_work` epic → issues → links; `send_file` spec |
| Gate | one `post_task_update {state: "in_review", reviewRequest}` for map + spec |
| Wait | `get_events {cursor, waitMs: 25000}` |
| Work | `save_work {assignee, state: "started"}` → `post_task_update` → attach mini-spec, acceptance tests, release doc |
| Close | `complete_tasks {tasks: [{id, workStats}]}` |
| Stop | handoff comment on the ticket |
