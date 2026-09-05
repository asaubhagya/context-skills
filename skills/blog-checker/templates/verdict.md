# Checker verdict — <title> (round <n>)

<!-- attach_artifact {parent_id: <issue id>, filename: "checker-verdict-r<n>.md", title: "Checker verdict, round <n>", docKind: "review", content: <this file, filled>}
     Then check_record {tenant_slug, subject_kind, subject_ref: <issue id>, round: <n>, verdict, findings: <the two tables as JSON>, models}. -->

**Verdict:** `pass | bounce | escalate` · **Issue:** <CONT-…> · **Tenant:** `<slug>` · **Channel/locale:** <blog/en> · **Hub:** <hub> · **Style:** <style> · **Round:** <n> of ≤ 2 bounces
**Maker:** <model, harness> · **Checker:** <model, harness> · **Machine checks:** `content_lint` (`blog-1.1.0`) | local
**Preview:** <url from preview_render> · **check_id:** <from check_record> · **Date:** <ISO 8601>

## Findings the maker must act on

<!-- bounce only. One row per finding, nothing else. Empty on pass. -->

| # | check | path | what to change |
|---|---|---|---|
| 1 | <code or judgement check> | <sections[3].text> | <one line> |

## Escalation

<!-- escalate only: the finding, why the owner must decide, what the options are. -->

## MACHINE checks (`content_lint`)

`stats`: <words> words · <h2s> H2 · <citations> citations · <numbers> statistics · <faq> FAQ · <artifacts> artifact(s)

| code | severity | path | message |
|---|---|---|---|
| <none> | | | |

## JUDGEMENT checks

| check | result | note |
|---|---|---|
| Voice (adjectives / anti-adjectives, sample paragraph) | pass · fail · n/a | <…> |
| Localisation, not translation | pass · fail · n/a | <…> |
| Original artifact is honest | pass · fail · n/a | <…> |
| Design tokens applied in the preview | pass · fail · n/a | <…> |
| Claims policy (no medical / legal / financial / compliance claims) | pass · fail | <…> |
| Structure reads (answer answers the query, H2s as ToC, one CTA) | pass · fail | <…> |

## Facts

| URL | resolved | statistic attributed | found on page | note |
|---|---|---|---|---|
| <https://…> | yes · no | <"4 minutes 12 seconds"> | yes · no · n/a | <what the page says> |

Original artifacts (`original: true`) checked against the brief / maker's notes: <list, each verified yes/no>.

## What the maker changed since the last round

<!-- round ≥ 2: copy the previous round's findings and mark each fixed / not fixed. -->
