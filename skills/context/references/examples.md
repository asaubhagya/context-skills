# Examples — concrete tool-call sequences

All examples use v3 tool names and the field names from the live catalog
(`https://agents.onecontext.me/tools/context`). Every call also carries
`caller: {agent, model}`, omitted here for brevity.

## 1. Chart an Epic with Issues

```
create_epic {
  space: "shared",
  title: "Ship the onboarding rewrite",
  goal: "## Goal\n...\n## Done when\n...\n## Milestones\n...\n## Rules\n...\n## Out of scope\n...",
  issues: [
    {title: "Map + spec review", labels: ["gate:plan"]},
    {title: "Audit current onboarding flow", labels: ["gate:none"]}
  ]
}
→ {ok: true, epic: {id: "epic_123", ...}, issue_ids: ["iss_1", "iss_2"], space: {id, name, privacy: "shared"}}

create_issues {
  parent_id: "epic_123",
  issues: [
    {title: "Draft new copy and screens", acceptance_criteria: [{text: "Copy approved by owner"}], labels: ["gate:artifact"]},
    {title: "Implement screens", labels: ["gate:final"]}
  ]
}
→ {ok: true, issue_ids: ["iss_3", "iss_4"], ...}
```

Keep create batches to ≤ 2 Issues today; wire `blocked_by` in a second pass.

## 2. Wire `blocked_by`, pick up work

```
get_issue {issue_id: "iss_4"}
→ {ok: true, issue: {id: "iss_4", version: 1, state: "open", ...}}

update_issues {issues: [{issue_id: "iss_4", blocked_by: ["iss_3"], expected_version: 1}]}
→ iss_4 now reads `blocked: true` until iss_3 is `done` — derived, never set.

update_issues {issues: [{issue_id: "iss_3", state: "in_progress", assignee: "claude-code", expected_version: 1}]}
```

A stale `expected_version` is rejected with `STALE_VERSION`: re-read with
`get_issue` and retry with the current `version`.

## 3. Attach an Artifact and request review

```
attach_artifact {
  target: {kind: "issue", id: "iss_3"},
  title: "Onboarding copy v1",
  mime: "text/markdown",
  content: "# New onboarding copy\n\n..."
}
→ {ok: true, artifact: {id: "art_1", revision_id: "rev_1"}, space: {...}}

post_comment {target: {kind: "issue", id: "iss_3"}, body: "Copy drafted from the approved brief; attached as 'Onboarding copy v1'."}

update_issues {issues: [{issue_id: "iss_3", state: "in_review", expected_version: 2}]}

request_review {
  target: {kind: "issue", id: "iss_3"},
  reason: "New onboarding copy drafted from the approved brief — ready for a read before implementation starts.",
  blocking: true
}
→ {ok: true, request_id: "req_1"}

get_changes {cursor: "<last-cursor>", wait_ms: 25000}
→ {ok: true, changes: [{type: "review.decided", target: {kind: "issue", id: "iss_3"}, decision: "approved", ...}], cursor: "<new-cursor>"}
```

A revision after feedback:

```
revise_artifact {artifact_id: "art_1", expected_revision_id: "rev_1", content: "# New onboarding copy (v2)\n\n...", change_summary: "Shortened step 2 per review"}
→ {ok: true, artifact: {id: "art_1", revision_id: "rev_2"}}
```

For a binary, pass `filename`, `size`, `sha256` (and `mime`) instead of
`content`; the response is an upload plan — one PUT of the raw bytes, then
the completion call it names — finish before it expires.

## 4. Claim, verify, complete

```
claim_issue {
  issue_id: "iss_4", request_id: "req_2", expected_version: 5,
  summary: "Screens implemented per the approved copy; full suite green.",
  evidence: [{kind: "artifact", reference: "art_9", summary: "test output, 47/47 passed"}]
}
→ {ok: true, claim_id: "clm_1"}
```

Verification must come from a **different** principal — another session,
another agent, or the human in the app — never the session that claimed:

```
# From a separate session/agent:
verify_issue {
  issue_id: "iss_4", request_id: "req_2", expected_version: 6, claim_id: "clm_1",
  method: "Re-ran the suite from a clean checkout; walked the flow on the iOS 18 simulator.",
  outcome: "passed", independence: "independent",
  results: [{criterion_id: "ac_1", outcome: "passed", note: "47/47"}],
  evidence: [{kind: "artifact", reference: "art_10", summary: "clean-checkout run log"}]
}
```

After the human's approval arrives on `get_changes`:

```
complete_issues {
  issue_ids: ["iss_4"],
  work_stats: {schemaVersion: 2, unitId: "<uuid>", wallDurationSec: 5400, contributors: [
    {role: "primary", model: "claude-fable-5-1", tokensIn: 120000, tokensOut: 9000, activeDurationSec: 3600, costUsd: 0.8,
     skills: [{name: "context@2", count: 1}], tools: [{name: "update_issues", count: 4}]}
  ]}
}
```

A gate Issue refuses `complete_issues` from an agent (`verification_required`)
— the human accepts it in the app.

## 5. Unpaired vs paired behaviour

```
list_issues {space: "personal"}
→ {ok: false, error: {code: "PAIRING_REQUIRED", message: "This Space requires a paired iPhone.", retryable: false, next_action: "pair_phone"}}
```

Tell the user "pair your iPhone in the Context app, then I need to reconnect
before I can see this" — do not retry the same call in a loop. After the
pairing and a reconnect:

```
list_spaces {}
→ {ok: true, spaces: [{id: "space_shared", name: "Shared", privacy: "shared"}, {id: "space_personal", name: "personal", privacy: "private"}]}

list_issues {space: "personal"}
→ {ok: true, issues: [...], space: {id: "space_personal", name: "personal", privacy: "private"}}
```

Confirm provenance from the `space` field on the result, not from which
Space you passed in.
