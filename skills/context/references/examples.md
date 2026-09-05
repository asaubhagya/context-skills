# Examples — concrete tool-call sequences

All examples use v3 tool names. Fields are illustrative; check the live
tool schema (`tools/list`) for exact required fields.

## 1. Chart an Epic with 5 Issues

```
create_epic {
  space_id: "<shared-space-id>",
  title: "Ship the onboarding rewrite",
  description: "## Goal\n...\n## Done when\n...",
  issues: [
    {title: "Audit current onboarding flow"},
    {title: "Draft new copy and screens"},
    {title: "Implement screens"},
    {title: "QA pass across devices"},
    {title: "Ship + monitor first week"}
  ]
}
→ {ok: true, epic: {id: "epic_123", ...}, issue_ids: ["iss_1", "iss_2", "iss_3", "iss_4", "iss_5"], space: {id, name, privacy: "shared"}}
```

If the Issues weren't created inline, do it as a second batch call:

```
create_issues {
  parent_id: "epic_123",
  issues: [
    {title: "Audit current onboarding flow"},
    {title: "Draft new copy and screens"},
    {title: "Implement screens"},
    {title: "QA pass across devices"},
    {title: "Ship + monitor first week"}
  ]
}
```

## 2. Update states and wire `blocked_by`

Move the first Issue to `in_progress`, and make the implementation Issue
depend on the draft Issue:

```
update_issues {ids: ["iss_1"], state: "in_progress"}

update_issues {ids: ["iss_3"], blocked_by: ["iss_2"]}
```

Now `get_issue {id: "iss_3"}` reports `blocked: true` until `iss_2` is
`done` — that flag is computed, never set directly.

```
update_issues {ids: ["iss_2"], state: "done"}
→ iss_3's derived `blocked` becomes false on the next read.
```

## 3. Attach an Artifact and request review

```
attach_artifact {
  parent_id: "iss_2",
  title: "Onboarding copy v1",
  content: "# New onboarding copy\n\n...",
  content_type: "text/markdown"
}
→ {ok: true, artifact: {id: "art_1", revision: 1}, space: {...}}

request_review {
  parent_id: "iss_2",
  reason: "New onboarding copy drafted from the approved brief — ready for a read before implementation starts."
}
→ {ok: true} — wait on get_changes for the decision.

get_changes {cursor: "<last-cursor>", waitMs: 25000}
→ {ok: true, changes: [{type: "review.decided", parent_id: "iss_2", decision: "approved", ...}], cursor: "<new-cursor>"}
```

A revision, after feedback:

```
revise_artifact {id: "art_1", content: "# New onboarding copy (v2)\n\n..."}
→ {ok: true, artifact: {id: "art_1", revision: 2}}
```

## 4. Claim + verify

```
claim_issue {
  id: "iss_3",
  evidence: "Implemented screens per the approved copy; ran the full test suite locally (47/47 passed, output attached as Artifact art_9); manually walked the flow on iOS 18 simulator."
}
→ {ok: true}
```

Verification must come from a **different** principal (a different agent
session, a teammate, or the human via the app) — never the same session
that claimed it:

```
# From a separate verification session/agent:
verify_issue {
  id: "iss_3",
  result: "verified",
  notes: "Re-ran the test suite from a clean checkout (47/47 passed); confirmed the flow against the approved copy Artifact art_1 rev 2."
}
→ {ok: true}

update_issues {ids: ["iss_3"], state: "done"}
```

## 5. Unpaired vs paired behaviour

Unpaired connector tries to read Private Space work:

```
list_issues {space_id: "<private-personal-space-id>"}
→ {ok: false, error: {code: "PAIRING_REQUIRED", message: "This Space requires a paired iPhone.", retryable: false, next_action: "pair_phone"}}
```

Correct handling: tell the user "pair your iPhone in the Context iOS app,
then I'll need to reconnect before I can see this" — do not retry the same
call in a loop.

After the user pairs and the connector reconnects:

```
list_spaces {}
→ {ok: true, spaces: [
    {id: "space_shared", name: "Shared", privacy: "shared"},
    {id: "space_personal", name: "personal", privacy: "private"}
  ]}

list_issues {space_id: "space_personal"}
→ {ok: true, issues: [...], space: {id: "space_personal", name: "personal", privacy: "private"}}
```

Note the `space` field on the result — always confirm provenance from it,
not from which Space id you happened to pass in.
