# Blog checker — checklist

Work through it top to bottom on every round. `M` = MACHINE (Blog MCP
`content_lint`, or by hand if the tool is absent — say which). `J` =
JUDGEMENT (you). `F` = fact-check (fetch). Nothing is "probably fine".

## Before the checks

- [ ] I did not draft this piece in this session (else hand off).
- [ ] Context `usage_guide`; Blog `usage_guide` + `get_capabilities` — `content_lint`, `preview_render`, `check_record` present?
- [ ] Draft fetched from the issue (latest `deliverable` / `draft`) or the upsert payload; normalised to `kind, title, description, sections, faq, seo`.
- [ ] Brand persona, audience & hubs, `design-tokens.json` fetched from the tenant epic.
- [ ] Last 5 published styles listed; `check_list {subject_ref}` read → this round = prior + 1.

## M — content_lint (severity `error` = playbook violated)

- [ ] `seo.answer` present, ≤ 60 words
- [ ] every H2 followed by a 40–75-word paragraph
- [ ] comparison · listicle · how-to: table or list present
- [ ] FAQ 3–5 items, each 80–150 words (articles)
- [ ] inline HTML only `em`, `strong`, `a[href=https?]`
- [ ] ≥ 2 outbound citations (own hosts excluded)
- [ ] ≥ 2 numeric statistics
- [ ] ≥ 1 original artifact marked
- [ ] hub assigned
- [ ] locale variant: slug, title, description differ from the master
- [ ] no banned phrase
- [ ] style rotation (warn) · first-person density (warn) — judged below

## J — judgement

- [ ] Voice: adjectives audible, no anti-adjectives, matches the approved sample paragraph
- [ ] Localisation, not translation (variants only)
- [ ] Every `original: true` marker is honest (backed by brief / maker's notes)
- [ ] Preview opened: fonts, accent, background match `design-tokens.json`
- [ ] Claims policy: nothing forbidden; no medical / legal / financial / compliance claim without a decision-record row → **escalate**
- [ ] Structure reads: answer answers the target query; H2s work as a ToC; one CTA

## F — facts

- [ ] every URL in `stats.urls` fetched; resolves to the page cited (not a home page / parked domain)
- [ ] every attributed statistic found on its source page, wording allowed to differ
- [ ] every `original` number found in the brief / maker's notes on the issue
- [ ] anything unverifiable either way → **escalate**, not pass

## Verdict and posting

- [ ] pass: no M error · every J pass/n-a · every F verified
- [ ] bounce: round ≤ 2; findings listed with `path` and the change required
- [ ] escalate: round would be 3 · claims/safety/legal · unverifiable fact
- [ ] `send_file` verdict (`docKind: "review"`) · `preview_render` → `send_file` HTML (`docKind: "preview"`) · `check_record` → `check_id`
- [ ] `post_task_update` with verdict line, preview URL, check_id, maker + checker models, `workStats`
- [ ] pass only: `post_task_update {state: "in_review", reviewRequest: {blocking: true, reason}}` — once
