# Spec template (code work)

Use this for any Context ticket that changes code. Copy the headings verbatim;
every section must exist — write "N/A — <reason>" rather than deleting one.
Attach the finished spec to the map's epic with `attach_artifact {docKind:
"spec"}` and raise the combined map + spec `request_review` (see `rules`).

---

# <Title> — Spec

**Map:** <epic ticket> · **Ticket:** <ticket> · **Date:** <YYYY-MM-DD> · **Status:** draft | approved

## 1. Goal
What reaching the end looks like, for whom. Two or three sentences.

## 2. Done when
The outputs, and what proves they are good enough (the acceptance tests in
§8 must cover each line here).

## 3. Scope and out of scope
- In: …
- Out: … (explicitly ruled out; never graduates silently)

## 4. Design
The decisions and the reasons. Diagrams welcome. Reference the decision
record for anything the owner chose.

## 5. Code layout
Repos, directories and files touched or created. One line per path, with
what it holds. Name the contract source of truth if more than one server
implements it.

## 6. Data and contracts
Schemas, migrations (forward-only; tested `down` where possible), tool/API
shapes, versioning, compatibility notes for existing callers.

## 7. Non-functional requirements
- **Scale** — expected volume, limits, pagination, caching.
- **Reliability** — failure modes, retries, idempotency, fallbacks.
- **Cost** — infra and per-call cost band; what makes it grow.
- **Security & privacy** — auth, permissions, data classes, secrets (names +
  scope only).

## 8. Acceptance tests
Checklist: each `Done when` line → how it is verified (command, fixture,
expected result). This becomes the ticket's acceptance-tests document.

## 9. Operational runbook
- **Release** — what to deploy in which order (migration → backend → web…).
- **Rollback** — exact steps; what is irreversible.
- **Traffic spikes** — what absorbs them; what to flip if it does not.
- **Alerting** — what signals, where they land, who acts.

## 10. Risks and open questions
Known risks with mitigations; questions that stay open past approval and who
owns them.
