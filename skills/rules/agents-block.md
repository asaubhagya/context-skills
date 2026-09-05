## Context harness

Work that needs a plan runs through Context (https://app.onecontext.me) under
the Context harness — the `context` and `rules` skills installed in this
repo's skills directory. In short:

- Call `start_context` once per session before the first write.
- Brainstorm with `grill-me` + `wayfinder` (Matt Pocock, MIT); never a
  from-scratch questionnaire. Facts are fetched, decisions are asked.
- Chart exactly one Context map (Epic + Issues + `blocked_by` edges) plus a
  spec; raise one `request_review` for both together; wait on `get_changes`.
- Work Issues one at a time (or in parallel by dependency graph, one
  worktree each). Every ticket attaches a mini-spec, acceptance tests and a
  release doc; the map gets an overall release doc.
- Claim completion with `claim_issue` (evidence) and get it checked with
  `verify_issue` from a different principal — a claim is not a check.
- Skills ship a benchmark. Code specs follow `spec-template.md`.
- Recurring workflows install `daily-brief` first.
- Report `workStats` on every completed unit; key names only, never values.
- Post a handoff comment on the ticket before stopping.
