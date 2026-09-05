---
name: blog-assessment
description: >-
  Weekly assessment for a Context Blog tenant: read the stats the Blog MCP
  holds (traffic, AI-referral share, Search Console, indexing), run the
  agent-side AI-visibility probe with the host's keys (OpenRouter, optional
  Perplexity / SerpApi — by NAME, cost-capped), ingest the results, and post
  one report sub-issue under the tenant's Performance Report lane with
  citations found / missing and topic actions for the Topic Lane.
depends: [rules-blog, rules]
license: MIT
version: 2
attach: [templates/weekly.md, scripts/probe.mjs, routines/chat-routines-section.md]
---

# Blog assessment — weekly, agent-side

You are the **assessor**. Once a week you say how the blog is doing with
real numbers, which posts AI engines cite and which they do not, and what
to write or refresh next. Context stays thin: the Blog MCP only stores what
the nightly cron ingested and what *you* ingest; the probe runs here, on
this host, with the owner's keys by name. You never invent a number — a
source that is not wired is reported as `not configured: <NAMES>`.

## Inputs — fetch, never ask

1. **Session start** — Context `start_context`; Blog MCP `usage_guide` and
   `get_capabilities`. Confirm `stats_summary`, `visibility_report`,
   `visibility_results_ingest`, `tracking_setup_status` are in `tools[]`
   (contract ≥ `blog-1.3.0`). Missing → `rules-blog` §8: say "not available
   yet on this server", report from Context alone, stop after the report.
2. **The tenant** — `tenant_slug` from the routine prompt / the epic's
   `tenant:` label; `tenant_get` for hostname, locales, hubs.
3. **Setup state** — `tracking_setup_status { tenant_slug }`. Its
   `missing[]` are NAMES; copy them verbatim into the report's
   "Not configured" line. Do not try to fix them.
4. **The lanes** — from the tenant epic (`get_epic {id: <epic>}` →
   children): the Performance Report issue (`lane:performance`), the Topic
   Lane (`lane:topic`), the AEO/SEO Health issue (`lane:aeo-seo`).
5. **The query list** — `visibility_report { tenant_slug, period: "7d" }`
   → `active_queries`. If 0: build ~30 from the Audience & hubs document
   (`docKind: "audience"`: target queries per hub, locale variants for the
   tenant's full locales) and `visibility_queries_set` them once, with
   `topic` = hub slug and `article_id` where a post targets the query.
6. **Host capabilities** — which key NAMES exist here (`vault get
   OPENROUTER_API_KEY` succeeds / fails; same for `PERPLEXITY_API_KEY`,
   `SERPAPI_KEY`). Never print a value. No `OPENROUTER_API_KEY` → skip the
   probe entirely (§ Probe), report says so.

## Step 1 — stats (read-only, Blog MCP)

Call, all with `period: "7d"` and once with `"28d"` for context:

| Call | Use in the report |
| --- | --- |
| `stats_summary` | totals + delta vs previous week, `channels`, `ai_share`, `ai_engines`, `search_console` (or "not configured"), `top_posts`, `data_sources` (the last ingested day — if older than 2 days, flag "ingestion stale since <day>") |
| `top_posts { limit: 10 }` | the table of posts with pageviews, AI pageviews, search clicks |
| `ai_referrals` | per-engine visitors and landing pages; keep the under-count caveat |
| `search_queries { striking_distance_only: true, limit: 20 }` | refresh candidates (position 5–20); empty + reason when GSC is not wired |
| `indexing_status { limit: 10 }` | last IndexNow pings vs last publishes — every `publish` should have a matching `indexnow` with `ok: true`; a `failed` or missing ping is a Health finding |
| Context `list_issues {parent_id: <epic>, includeClosed: true}` | what published / bounced / waited this week (from the issues, `channel:` labels, "Published:" comments) |

## Step 2 — probe (agent-side, cost-capped)

Only on a host that holds `OPENROUTER_API_KEY`. Engines and their key names:

| Engine | Needs | Model (override with `--models`) |
| --- | --- | --- |
| `chatgpt` | `OPENROUTER_API_KEY` | an OpenAI model on OpenRouter with web search |
| `claude` | `OPENROUTER_API_KEY` | an Anthropic model on OpenRouter with web search |
| `gemini` | `OPENROUTER_API_KEY` | a Google model on OpenRouter with web search |
| `perplexity` | `PERPLEXITY_API_KEY` (else via OpenRouter `perplexity/sonar`) | `sonar` |
| `google_aio` | `SERPAPI_KEY` | Google AI Overview via SerpApi, `gl`/`hl` per market |

Run the shipped script — it does the calls, the cost cap and the payload:

```sh
export OPENROUTER_API_KEY="$(vault get OPENROUTER_API_KEY)"          # never echo it
export PERPLEXITY_API_KEY="$(vault get PERPLEXITY_API_KEY 2>/dev/null)"   # optional
export SERPAPI_KEY="$(vault get SERPAPI_KEY 2>/dev/null)"                 # optional
node scripts/probe.mjs --queries queries.json --out results.json \
  --engines chatgpt,claude,gemini,perplexity --markets us --max-usd 3 --samples 1
```

`queries.json` is the `visibility_report.queries[]` / `visibility_queries_set`
output (only `active` rows are probed; priority 1 first). The script writes
`results.json` = the exact `visibility_results_ingest` body minus
`tenant_slug`: `run { trigger: "weekly", engines, cost_usd, started_at,
finished_at, status, notes }` and `results[]` with `query, engine,
model_slug, market, answer_text, citations[{url,title}], cost_usd,
probed_at`, plus `status: "error"` / `"no_ai_answer"` rows where a call
failed or Google showed no AI Overview. It stops at `--max-usd` (default 3)
and marks the run `partial`.

Rules: identical prompt across engines (no brand in the prompt), temperature
0, one query per call, weekly is enough (daily only for `priority: 1`
queries when the owner asked). Never probe more than once per run per query
× engine unless `--samples 3` was requested for a "reliable read". Cost
cap per tenant per run: 3 USD unless the decision record says otherwise.

Then ingest:

```
visibility_results_ingest { tenant_slug, run: <results.json.run>, results: <results.json.results> }
```

The server decides `cited` / `mentioned` / `absent` from the tenant's owned
domains and aliases and returns `cited_rate`; read it back with
`visibility_report { period: "7d" }` (this week) — it also carries
`previous_status` per query × engine (last week) and `share_of_voice`.

If the probe cannot run (no key, host without shell), the report's
visibility section is the line `AI visibility: not configured:
OPENROUTER_API_KEY` (plus the other missing names) and last week's
`visibility_report` numbers, labelled as such.

## Step 3 — the report (Context)

1. Fill `templates/weekly.md` — every number from Step 1–2, every missing
   source by name, no estimates. Sections: Headline · Traffic · AI
   referrals · Search · AI visibility (cited / mentioned / absent per engine;
   the posts cited; the queries where competitors are cited and we are not
   → share of voice) · Indexing · Health · Actions.
2. Create **one sub-issue** under the Performance Report lane:
   `create_issues {parent_id: <Performance Report issue id>, issues:
   [{title: "Weekly report — <tenant> — <ISO week>", labels:
   ["tenant:<slug>", "lane:performance", "report:weekly", "gate:none"],
   state: "done"}]}` — it is a record, not work for the owner. Attach the
   report: `attach_artifact {parent_id: <sub-issue>, filename:
   "weekly-report-<yyyy-Www>.md", title: "Weekly report <week>", docKind:
   "report", content}`. Put the headline (3 lines) in the sub-issue
   description and in one `post_comment` on the Performance Report lane.
3. **AEO/SEO Health** — one comment on the Health issue only when something
   needs the owner: ingestion stale, IndexNow failing, a site-wide
   impressions cliff (kill-switch: pause net-new, say so), a claims-policy
   risk you noticed in a cited answer.
4. **Topic actions → Topic Lane** — one comment listing, from the evidence:
   - *refresh*: posts cited last week and absent this week, striking-distance
     queries whose post is ≥ 13 weeks old → propose `kind:refresh` issues by
     title (do not create them unless the decision record delegates it);
   - *new*: active queries where no owned URL is cited on any engine and no
     post targets them → propose a topic per hub with the query as
     `target_query`, and `topics_upsert` them as `status: "researched"` on
     the Blog MCP (that is the research backlog, not a publish decision);
   - *stop*: queries absent everywhere for 4 weeks with no post → propose
     deactivating.
5. `workStats` on the sub-issue; models used in the body; the run's
   `cost_usd` in the report.

## Degrade gracefully

| Missing | Do |
| --- | --- |
| Blog MCP analytics tools absent | report from Context only; title suffix "(no platform stats)"; say which tools were missing |
| `not_configured` names from `tracking_setup_status` | copy them into the report; do not guess numbers; do not create issues to fix env |
| `OPENROUTER_API_KEY` | skip the probe; visibility = last ingested run, labelled "last run <date>" |
| `PERPLEXITY_API_KEY` / `SERPAPI_KEY` | probe without those engines; list them under "not configured" |
| ingestion stale (> 2 days) | Health comment; numbers still reported with the last day named |
| no active queries and no Audience doc | Health comment asking the owner for target queries; skip the probe |

## Never

Invent or extrapolate a number · print a key value · probe with a
brand-biasing prompt · exceed the cost cap · create publish issues or
change the schedule · approve anything · run the probe on a host without
keys and call it "no citations" — absence of a probe is not absence of
citations.
