# Context plugin submission audit

Prepared 2026-09-08. This is a source and public-endpoint audit, not authenticated end-to-end acceptance evidence.

## Evidence and resulting approach

The production catalog at https://mcp.onecontext.me/.well-known/mcp/server-card.json reports contract 3.0.0, source commit `3ef96e2`, published 2026-09-06, and 53 tools (28 Shared, 25 paired). The audited matching source checkout was `/Users/asaubhagya/worktrees/841aa1de-agents-v2-context-mcp`; it was clean during inspection. Live registry names match the 53 entries in `submission-candidate.json`.

The public Guide at https://agents.onecontext.me/GUIDE.md describes Account → Space → Epic → Issue → Artifact, Google-only Shared access, optional paired private domains, read → act → verify, human review gates, version preconditions and mandatory caller provenance. https://agents.onecontext.me/channels.json reports latest v17, SHA `3ee44dfd6c8cb2a273ceb2f5249f4d214bacf350`, with context@3, daily-brief@5, grill-me@1 and wayfinder@1. These facts support a web-first reviewer sequence using small synthetic work records. No personal data or iPhone is needed to exercise the five core cases.

The owner chose the product name Context, the agent name Nomi and the starter Set up Context. The proposed context@4 onboarding is not yet a published release. Current catalog and initialize instructions still advertise “Nomi, get me started”; both should route to `setup` after the proposed release.

## Blocking findings

1. **Policy identity mismatch.** Live `/.well-known/oauth-protected-resource` links to getmeetly.ai/privacy, /terms and /contact. The returned privacy page identifies Meetly and its meeting recorder. Source: `supabase/functions/mcp/oauth.ts:140`; corresponding assertions: `oauth_test.ts:110`. Context policy URLs https://onecontext.me/privacy, https://onecontext.me/terms and https://onecontext.me/support return 200. Update policy metadata and tests to Context-specific links after confirming their coverage. Context's privacy copy still emphasizes phone custody and should explicitly address server-readable Shared workspace storage before relying on it for this submission.
2. **Confirmed destructive hint mismatch.** `save_skill` accepts an existing `skill_id` and overwrites markdown with no version history (`tools_v3.ts:1989` and legacy skill update behavior). The live annotation is `destructiveHint:false`, produced by the generic factory (`tools_v3.ts:509`). The OpenAI submission skill defines overwrites as destructive. Recommend `destructiveHint:true` for this mode-capable tool; obtain the parent/user's authorized source-change decision, update/deploy the descriptor and regenerate before upload. Do not submit a justification pretending content is preserved.
3. **Mutable metadata review.** `update_epic`, `update_issues`, `update_artifact` and `update_people` replace selected fields, currently with `destructiveHint:false`. These are bounded record edits; whether recoverable change history suffices for the submission convention must be established from the storage path before changing classifications. This audit does not equate every status update with irreversible deletion. The candidate preserves live values and names actual replacement behavior rather than claiming no overwrite. `revise_artifact` is different: it appends immutable revisions and preserves prior content; its non-destructive classification has clear support. `merge_people` preserves data with app undo, also supporting non-destructive classification.
4. **Bundled setup dead end.** `setup.ts:238` selects `human_upload` for chat hosts with missing hashes, even when inline bodies are returned. The instructions at `setup.ts:277` ask for download/upload. All-current but unpaired sessions receive `pair_phone`, although Shared work remains available. Proposed context@4 must use bundled/inline instructions and treat pairing as optional for the core flow. Verify in an installed plugin chat before claiming it fixed.
5. **Reviewer access unresolved.** No authenticated reviewer account walkthrough, web review action test or installed-plugin Try in chat test has been run. Resolve test access without sharing owner credentials and execute the five cases before submission.

Because of the confirmed hint mismatch, the deliverable is named `submission-candidate.json`, not the upload filename. It is an exact-live-annotation preparation artifact, explicitly blocked from upload. The parent must resolve the mismatch and regenerate a truthful live-matching `chatgpt-app-submission.json`; it should not merely rename this file.

## Other review checks

- All 53 catalog tools declare non-null input and output schemas. No missing-outputSchema warning applies.
- All three required hints are present in source, with `openWorldHint:false` on all tools. The public catalog projects readOnly/destructive/idempotent rather than the open-world hint, so the latter was checked in source.
- `log_meal` enqueues a private meal plan; user completion may subsequently write nutrition to Apple Health. The candidate explicitly discloses that downstream effect. Confirm this bounded, user-triggered distinction with the review convention before submission rather than claiming it can never affect another system.
- Private health queries expose authorized sensitive health data. `request_content.selector` can narrow private resources; `save_memories.memories[].text` and `facts[].text` are free text, and people tools accept phone/email and remembered facts. They are workflow-relevant, but disclosures must explain collection, access and optional pairing. No examined input explicitly requests passwords, MFA codes, card numbers, SSNs or government IDs. Do not use actual sensitive data in demonstrations.
- `get_skill` tells agents to follow stored markdown as user instructions. Bound that to authorized user playbooks and higher-priority rules; it must not turn arbitrary retrieved content into authority or allow gate bypass.
- No embedded ChatGPT widget/CSP was identified in this inspected tool surface; no widget-CSP audit result is claimed for uninspected listing assets.
- Guide says PAIRING_REQUIRED is not retryable; `dispatch_v3.ts:106` maps it to retryable true. Avoid automated private retries and align the error contract separately.
- Setup account output currently carries scopes; do not promise that it returns the user's actual email or display identity.
- The prior root submission JSON had 52 matching names and omitted `setup`; its copy overstated private-only custody. The new candidate replaces that positioning with Shared versus optional private access.

## Reviewer access and links verified

- https://app.onecontext.me returned 200 after redirecting to /login.
- https://apps.apple.com/app/id6760629822 returned 200 and resolved to https://apps.apple.com/us/app/context-memory-for-your-ai/id6760629822.
- Context privacy, terms and support returned 200 and the privacy page identified Context.
- OAuth advertises public PKCE clients with token endpoint authentication `none`; private tools are hidden from Shared-only principals (`mcp.ts:2970`) and blocked before dispatch (`mcp.ts:7703`). No reviewer bypass was found in inspected auth code.
- Existing Google verification notes allow reviewers' own Google accounts and say Calendar/Contacts integration authorization does not require payment. That is not evidence that private MCP entitlement is free; verify separately if demonstrating it.

## Proposed tests and checks completed

The JSON candidate contains exactly five positive cases using exact live tool names and three non-trigger cases (weather, email, stock prices). Reviewer notes include optional failure exercises for pairing, human approval and concurrency. These are proposed cases, not passed tests.

Completed checks: public endpoint HTTP/read checks, catalog counts and name comparison, source descriptor/dispatch inspection, JSON parsing and structural assertions. No build, unit suite, production mutation, authenticated end-to-end test, submission or approval was performed for this audit. The parent remains responsible for repository diff review, final release verification, Context logging and delivery.
