# Work model — Epic / Issue structure, lifecycle, `blocked_by`

## Shape

```
Space
└── Epic (goal blueprint; status derived from its Issues)
    └── Issue (recursive: parent is the Epic or another Issue)
        └── Issue (child — decomposition, not a "subtask" type)
            └── Artifact (attached to the Epic or any Issue)
```

There is no separate "task" object and no simple/complex Issue split. If a
piece of work needs to be broken down, create child Issues under it with
`create_issues {parent_id: <issue>}` — never a `steps[]` field, never an
`issueType` label.

## Lifecycle

Wire values, in order: `open → in_progress → in_review → done`.

- Move an Issue forward with `update_issues {ids, state}` — batch-capable,
  so update several Issues in one call when they share a transition.
- `in_review` is where a human gate lives: pair it with `request_review`
  (see `references/reviews.md`) rather than just flipping state — a state
  change alone does not notify anyone.
- `complete_issues` is the shortcut for "done, and here's the completion
  record" in one call, when no review gate applies.
- There is no `canceled` state on the wire. Abandoned work is deleted
  (`delete_issues`), not marked canceled.

## `blocked` is derived

Set dependencies with `update_issues {ids: [issueId], blocked_by:
[otherIssueId, ...]}`. The Issue's `blocked` flag is then computed by the
server: true whenever any id in `blocked_by` is not `done`. You never write
`blocked` directly, and you never read it as a promise — re-fetch
(`get_issue` / `list_issues`) after the blocking Issue changes state rather
than tracking it yourself.

`list_issues {parent_id, ...}` returns **direct children only** — Issues
several levels down are reached through their immediate parent, never
directly through an ancestor Epic.

## Epic status

An Epic's status is never set with `update_epic {status: ...}` — there is
no such field. It is computed from the state of its Issues (e.g. an Epic
with every Issue `done` reads as done). `update_epic` changes the Epic's
own fields: title, description, labels, and similar metadata.

## Artifacts on Epics and Issues

Either an Epic or any Issue can carry Artifacts (`attach_artifact
{parent_id: <epic-or-issue-id>, ...}`). Attach the plan/spec-shaped
document to the Epic; attach per-ticket deliverables (mini-spec, acceptance
tests, release notes) to the Issue that produced them.
