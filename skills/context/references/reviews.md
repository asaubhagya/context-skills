# Reviews — `request_review`, `claim_issue`, `verify_issue`

Three distinct tools, three distinct jobs. Do not collapse them.

## `request_review` — open a human gate

Call this on an Epic, Issue or Artifact when you want a human decision
before work proceeds. It is what actually notifies the reviewer — moving an
Issue to `in_review` with `update_issues` alone does not raise a gate.

- Give a real, specific reason: what changed, what you want approved, why
  now. A vague reason wastes the reviewer's attention.
- One `request_review` per decision point. Don't batch two separate
  decisions into one request, and don't raise a second one for the same
  decision while the first is still open.
- After requesting, wait on `get_changes {cursor, waitMs}` (bounded long
  poll) for the decision. **Never assume approval** — a session that moves
  on without reading the decision back is guessing.
- On `changes_requested`: the Issue goes back to `in_progress` (or stays
  wherever the reviewer left it); read the note, address it, request review
  again. This is a normal loop, not a failure.

## `claim_issue` — completion claim with evidence

Call this when an agent believes an Issue is actually done, and wants that
belief on the record with what backs it: what was run, what was observed,
which acceptance criteria passed and how you checked. A claim without
evidence is not useful — "done" is not evidence, "ran the test suite, all
47 passed, output attached" is.

**A claim is not a check.** `claim_issue` records that someone asserts the
work is finished; it does not verify anything and it does not close the
loop by itself.

## `verify_issue` — independent check

Call this to actually check a claimed Issue — and it must come from a
**different principal** than whoever called `claim_issue`. If the same
session (or the same agent identity) both claims and verifies, that is not
verification, it's the same assertion said twice. Route verification to a
different agent, a different session, or the human reviewer.

`verify_issue` records what was actually checked and the result. Only after
a genuine independent verification (or an explicit human approval via
`request_review`) should an Issue be treated as trustworthy-done by anyone
downstream of it (e.g. before building on it, or reporting it complete to
the user).

## Putting it together

A typical flow for one Issue with a review gate:

1. Do the work.
2. `attach_artifact` the deliverable(s) to the Issue.
3. `claim_issue {id, evidence: "..."}` — state what you ran and observed.
4. `request_review {parent_id: issue_id, reason: "..."}`.
5. Wait on `get_changes`.
6. On approval, a **different** principal (or the human, via the app) has
   effectively verified it — or explicitly call `verify_issue` yourself
   from a separate session/agent before treating it as trustworthy.
7. `update_issues {ids: [issue_id], state: "done"}` (or `complete_issues`
   if no further step is needed).
