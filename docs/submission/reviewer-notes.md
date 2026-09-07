# Context — reviewer notes (draft; not submitted)

Context is the product; Nomi is the agent who introduces the workflow. The listing subtitle is **Your context across agents**. The proposed Try in chat starter is **Set up Context**; **Nomi, get me started** remains an accepted equivalent.

## Access and requirements

Connect the plugin to `https://mcp.onecontext.me/mcp` and choose Google sign-in. The core Shared workspace supports plans, Issues, documents, comments and human reviews without an iPhone. The same account can inspect work at https://app.onecontext.me. “Shared” means server-readable workspace storage within the user's authorized account; it does not mean public internet publication.

Reviewer credentials and any required test-account provisioning remain unresolved. No authenticated reviewer walkthrough has been completed in this preparation. Do not interpret the cases below as passed test results. Do not place the owner's credentials, tokens or personal records in the submission.

The optional private path requires the Context iPhone app, pairing to the same account, and reconnecting the plugin to obtain private access. Download: https://apps.apple.com/us/app/context-memory-for-your-ai/id6760629822. Private memories, people, logs, health, calendar and stored playbooks appear only when pairing and authorization permit them. No private MCP entitlement or payment exemption is promised here; that path needs separate verification.

## Core walkthrough

1. Start a fresh chat and use **Set up Context**. Nomi should introduce Context, call `setup`, explain that Shared is available, and ask for one goal. A bundled installation should not ask for manual skill uploads or require a phone for this core flow.
2. Ask: **Create a Shared plan called Weekend reading, with two Issues: choose a book and schedule one reading session.** Expect a saved Epic and two child Issues. Open the web workspace using the same account and inspect them.
3. Ask: **Find my Weekend reading plan in Context and show its unfinished Issues.** Expect the records just created, not fabricated sample data.
4. Ask: **Attach a short reading checklist to the choose-a-book Issue, then revise the checklist to include a Sunday session.** Expect an attached document and a new revision; prior content should remain available.
5. Ask: **Ask me to review the reading checklist and wait for my decision.** Expect a pending human review. The agent must not approve its own request. Inspect the review in the web UI; the exact web decision path still requires an authenticated walkthrough.

Every tool requires `caller` provenance. The agent should use the real model identifier when exposed, otherwise `unknown`. Writes need a read-back before the agent claims they landed. Mutation receipts and change events distinguish pending delivery from completed state.

## Boundaries and recovery

- A fresh unpaired account cannot read private health or calendar data. Explain pairing and reconnecting; continue usable Shared work and do not retry private calls repeatedly.
- Human reviews belong to the reviewer. A chat comment that says “approved” is not an authenticated gate decision.
- A stale Issue version or Artifact revision must be re-read before retrying; do not overwrite newer work.
- The plugin does not supply live weather or stock quotes and cannot send email. The three negative cases in the JSON candidate cover those non-triggers.
- Deletion tools are destructive and require the applicable permission. Use only synthetic reviewer data for any optional deletion test and get an explicit request for the target deletion.

## Package and release status

Production currently publishes 53 tools: 28 Shared and 25 paired. The current public skill channel is v17: context@3, daily-brief@5, grill-me@1 and wayfinder@1. This submission proposes **context@4** to introduce Nomi, route the setup phrases and accommodate bundled skills; its release/promotion is pending and must not be represented as live. Package the Guide plus the Context skill references, including charting and the spec template. Context Sites is excluded.

Before upload, resolve the audit blockers and produce a live-matching `chatgpt-app-submission.json`. `submission-candidate.json` is preparation only and must not be uploaded in its current state. No submission or acceptance result is claimed.
