# Vocabulary — the only nouns

Context has six primitives. Nothing else is a container; everything else
(comments, review requests, claims, verifications, changes, `blocked_by`
edges) is a relation between two of these.

## Account

The signed-in Context Account. Google sign-in gives Shared-Space access;
pairing an iPhone (Context iOS app) additionally grants Private-Space and
Personal-domain access. One Account, any number of connected hosts (Claude
Code, Codex, Cursor, ChatGPT, claude.ai…).

## Space

The sole container for Epics, Issues and Artifacts.

- Exactly **one Shared Space** — server-readable by any signed-in connector,
  `privacy: "shared"`. This is where cross-device, cross-agent work lives.
- Any number of **Private Spaces** — iPhone-owned: `personal`, `work`, or a
  named Space the user created. Reading or writing a Private Space requires
  the iPhone to be paired; an unpaired connector gets `PAIRING_REQUIRED`.
- `list_spaces` lists what this Account can see right now. `create_space` /
  `delete_space` need pairing (`context:private` scope).
- Every tool result carries `space: {id, name, privacy}` — read it, don't
  assume.

## Epic

A goal blueprint inside a Space. An Epic's status is **derived** from the
state of its Issues — you never set an Epic's status directly, only its
description/labels/etc. via `update_epic`.

Tools: `list_epics`, `get_epic`, `create_epic` (optionally with a first
batch of Issues), `update_epic`, `delete_epic`.

Hard cap: a small number of active Epics per Account (check `start_context`
or the error message for the current limit) — finish or delete before
starting a new one.

## Issue

The one recursive unit of work. An Issue belongs to exactly one parent,
which is either an Epic or another Issue — there is no separate
"sub-task" concept, and no `issueType` split between simple and complex
work. Decomposition is always more child Issues.

- **Lifecycle** (wire values): `open → in_progress → in_review → done`.
  `canceled` is not a state you set — delete the Issue instead.
- **`blocked`** is derived, never set: an Issue is blocked when its
  `blocked_by` list contains an id that is not yet `done`.
- **Fields**: `acceptance_criteria[]` stays (scored at `verify_issue` time,
  ADR-0008). `steps` and checklists do not exist — use child Issues.
- **`blocked_by: [issueId]`** replaces the old `links` field.

Tools: `list_issues`, `get_issue`, `create_issues` (batch, under an Epic or
a parent Issue), `update_issues` (batch: fields, state, parent,
`blocked_by`), `complete_issues`, `delete_issues`.

## Artifact

One stable, reviewable document attached to an Epic or an Issue.

- **Immutable revisions** — `revise_artifact` creates a new revision; it
  never overwrites the last one in place. `get_artifact` can return any
  revision, current by default.
- **Anchored comments** — `post_comment` on an Artifact can carry an anchor
  (a location inside the document) so feedback attaches to the exact
  passage it is about, not just the document as a whole.
- Small text content can be inlined directly; large or binary content gets
  an upload plan back from `attach_artifact` (PUT the bytes, then complete).

Tools: `list_artifacts`, `get_artifact`, `attach_artifact`,
`revise_artifact`, `update_artifact` (metadata/visibility), `delete_artifacts`,
`get_artifact_transfer`.

## Personal domains (paired only)

The iPhone-held domains that are not work: **Memories**, **Logs** (meals,
workouts), **People**, **Health**, **Calendar**, **Skills** (phone-stored
playbooks). All need `context:private` scope (iPhone paired). See
`references/privacy-and-pairing.md`.

## Relations (never containers)

- **Comments** — `post_comment` on an Epic, Issue or Artifact.
- **Review** — `request_review`, `claim_issue`, `verify_issue`.
- **Changes** — `get_changes` (opaque cursor, bounded wait) is how you learn
  about review decisions, new comments, and phone-originated operations
  without polling blind. `list_mutation_receipts` confirms specific writes
  landed.
- **`blocked_by`** — an edge between two Issues, set via `update_issues`.

## Errors

One envelope: `{ok:false, error:{code, message, retryable, next_action?}}`.
Codes you'll actually see: `PAIRING_REQUIRED`, `NOT_FOUND`,
`PERMISSION_DENIED`, `STALE_VERSION`, `PHONE_OFFLINE`, `VALIDATION_FAILED`,
`RATE_LIMITED`, `OPERATION_PENDING`. Read `message` — it names the rule and
usually the fix.
