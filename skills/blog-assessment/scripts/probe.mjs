#!/usr/bin/env node
// blog-assessment — agent-side AI-visibility probe (Context Blog E8).
//
// Runs the tenant's target queries against answer engines and writes the exact
// body for the Blog MCP tool `visibility_results_ingest` (minus tenant_slug).
// The server decides cited / mentioned / absent; this script only collects
// answers and citations. Keys come from the environment BY NAME and are never
// printed:
//   OPENROUTER_API_KEY   required for chatgpt / claude / gemini (and perplexity when no direct key)
//   PERPLEXITY_API_KEY   optional: Perplexity Sonar direct
//   SERPAPI_KEY          optional: Google AI Overviews via SerpApi (engine google_aio)
//
// Usage:
//   node probe.mjs --queries queries.json --out results.json
//        [--engines chatgpt,claude,gemini,perplexity,google_aio] [--markets us[,de,fr]]
//        [--max-usd 3] [--samples 1] [--concurrency 3] [--trigger weekly|daily|manual]
//        [--models chatgpt=openai/gpt-5-mini,claude=anthropic/claude-sonnet-4.5,gemini=google/gemini-2.5-flash,perplexity=perplexity/sonar]
//        [--search tools|plugin|online]   how web search is requested on OpenRouter (default tools)
//
// queries.json: [{query, topic?, priority?, active?}] or {queries:[...]} (visibility_report / visibility_queries_set output).
// No dependencies; Node ≥ 20.

import { readFileSync, writeFileSync } from "node:fs";

const args = parseArgs(process.argv.slice(2));
const ENGINES = (args.engines ?? "chatgpt,claude,gemini,perplexity").split(",").map((s) => s.trim()).filter(Boolean);
const MARKETS = (args.markets ?? "us").split(",").map((s) => s.trim()).filter(Boolean);
const MAX_USD = Number(args["max-usd"] ?? 3);
const SAMPLES = Math.max(1, Math.min(3, Number(args.samples ?? 1)));
const CONCURRENCY = Math.max(1, Math.min(6, Number(args.concurrency ?? 3)));
const TRIGGER = args.trigger ?? "weekly";
const SEARCH_MODE = args.search ?? "tools";
const DEFAULT_MODELS = { chatgpt: "openai/gpt-5-mini", claude: "anthropic/claude-sonnet-4.5", gemini: "google/gemini-2.5-flash", perplexity: "perplexity/sonar" };
const MODELS = { ...DEFAULT_MODELS, ...Object.fromEntries((args.models ?? "").split(",").filter(Boolean).map((kv) => kv.split("=").map((s) => s.trim()))) };
// Flat estimates where the provider does not return a cost (USD per call).
const EST = { perplexity_direct: 0.006, google_aio: 0.015, openrouter_fallback: 0.01 };
const PROMPT = (q) => `You are answering a user's question using current web sources. Answer concisely (at most 150 words) and list the sources you relied on.\nQuestion: ${q}`;

if (!args.queries || !args.out) die("usage: probe.mjs --queries <file> --out <file> [options]");
const raw = JSON.parse(readFileSync(args.queries, "utf8"));
const queries = (Array.isArray(raw) ? raw : raw.queries ?? [])
  .filter((q) => q && typeof q.query === "string" && q.active !== false)
  .sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3));
if (!queries.length) die("no active queries in " + args.queries);

const has = (name) => Boolean(process.env[name]);
const notConfigured = [];
if (!has("OPENROUTER_API_KEY")) notConfigured.push("OPENROUTER_API_KEY");
const enabled = ENGINES.filter((e) => {
  if (e === "google_aio") return has("SERPAPI_KEY") || (notConfigured.push("SERPAPI_KEY"), false);
  if (e === "perplexity") return has("PERPLEXITY_API_KEY") || has("OPENROUTER_API_KEY") || (notConfigured.push("PERPLEXITY_API_KEY"), false);
  return has("OPENROUTER_API_KEY");
});
if (!enabled.length) {
  const out = { run: { trigger: TRIGGER, engines: [], cost_usd: 0, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), status: "failed", notes: `not configured: ${[...new Set(notConfigured)].join(", ")}` }, results: [] };
  writeFileSync(args.out, JSON.stringify(out, null, 2));
  console.error(`not configured: ${[...new Set(notConfigured)].join(", ")} — nothing probed (${args.out} written with an empty run)`);
  process.exit(2);
}

const jobs = [];
for (const q of queries) for (const engine of enabled) for (const market of MARKETS) for (let s = 1; s <= SAMPLES; s++) jobs.push({ query: q.query, engine, market, sample_no: s });

const startedAt = new Date().toISOString();
let spent = 0;
let stopped = false;
const results = [];
let cursor = 0;
async function worker() {
  while (cursor < jobs.length && !stopped) {
    const job = jobs[cursor++];
    const estimate = job.engine === "google_aio" ? EST.google_aio : job.engine === "perplexity" && has("PERPLEXITY_API_KEY") ? EST.perplexity_direct : EST.openrouter_fallback;
    if (spent + estimate > MAX_USD) {
      stopped = true;
      break;
    }
    const r = await probe(job).catch((e) => ({ ...job, status: "error", answer_text: null, citations: [], cost_usd: 0, probed_at: new Date().toISOString(), raw_response: { error: String(e?.message ?? e) } }));
    spent += r.cost_usd ?? 0;
    results.push(r);
    process.stderr.write(`${job.engine} ${job.market} ${r.status ?? "ok"} $${spent.toFixed(3)} — ${job.query}\n`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const out = {
  run: {
    trigger: TRIGGER,
    engines: enabled,
    cost_usd: round(spent, 4),
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: stopped ? "partial" : "done",
    notes: [`models: ${enabled.map((e) => `${e}=${e === "google_aio" ? "serpapi/google" : e === "perplexity" && has("PERPLEXITY_API_KEY") ? "sonar" : MODELS[e]}`).join(", ")}`, `search: ${SEARCH_MODE}`, stopped ? `stopped at cost cap ${MAX_USD} USD after ${results.length}/${jobs.length} calls` : `${results.length} calls`, notConfigured.length ? `not configured: ${[...new Set(notConfigured)].join(", ")}` : ""].filter(Boolean).join(" · "),
  },
  results,
};
writeFileSync(args.out, JSON.stringify(out, null, 2));
console.error(`wrote ${args.out}: ${results.length} results, ${out.run.status}, $${out.run.cost_usd}`);

// ---------------------------------------------------------------------------
async function probe(job) {
  if (job.engine === "google_aio") return serpApi(job);
  if (job.engine === "perplexity" && has("PERPLEXITY_API_KEY")) return perplexityDirect(job);
  return openRouter(job);
}

async function openRouter(job) {
  const model = MODELS[job.engine] ?? MODELS.chatgpt;
  const body = { model, temperature: 0, messages: [{ role: "user", content: PROMPT(job.query) }], usage: { include: true } };
  if (SEARCH_MODE === "tools") body.tools = [{ type: "openrouter:web_search", max_results: 10 }];
  else if (SEARCH_MODE === "plugin") body.plugins = [{ id: "web", max_results: 10 }];
  else body.model = `${model}:online`;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "content-type": "application/json", "HTTP-Referer": "https://sites.onecontext.me", "X-Title": "Context Blog assessment" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`openrouter ${model}: HTTP ${res.status} ${json?.error?.message ?? ""}`.trim());
  const msg = json.choices?.[0]?.message ?? {};
  const citations = [];
  for (const a of msg.annotations ?? []) if (a?.type === "url_citation" && a.url_citation?.url) citations.push({ url: a.url_citation.url, title: a.url_citation.title ?? undefined });
  for (const u of extractUrls(typeof msg.content === "string" ? msg.content : "")) if (!citations.some((c) => c.url === u)) citations.push({ url: u });
  const cost = typeof json.usage?.cost === "number" ? json.usage.cost : EST.openrouter_fallback;
  return { query: job.query, engine: job.engine, model_slug: json.model ?? model, market: job.market, sample_no: job.sample_no, answer_text: typeof msg.content === "string" ? msg.content.slice(0, 20000) : null, citations: citations.slice(0, 100), cost_usd: round(cost, 5), probed_at: new Date().toISOString(), raw_response: slim(json) };
}

async function perplexityDirect(job) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "sonar", temperature: 0, messages: [{ role: "user", content: PROMPT(job.query) }], web_search_options: { search_context_size: "low" } }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`perplexity: HTTP ${res.status} ${json?.error?.message ?? ""}`.trim());
  const content = json.choices?.[0]?.message?.content ?? null;
  const citations = [];
  for (const r of json.search_results ?? []) if (r?.url) citations.push({ url: r.url, title: r.title ?? undefined });
  for (const u of json.citations ?? []) if (typeof u === "string" && !citations.some((c) => c.url === u)) citations.push({ url: u });
  return { query: job.query, engine: "perplexity", model_slug: json.model ?? "sonar", market: job.market, sample_no: job.sample_no, answer_text: content, citations: citations.slice(0, 100), cost_usd: EST.perplexity_direct, probed_at: new Date().toISOString(), raw_response: slim(json) };
}

async function serpApi(job) {
  const hl = { us: "en", de: "de", fr: "fr", gb: "en", au: "en", in: "en" }[job.market] ?? "en";
  const q = new URLSearchParams({ engine: "google", q: job.query, gl: job.market, hl, api_key: process.env.SERPAPI_KEY });
  const res = await fetch(`https://serpapi.com/search.json?${q}`);
  let json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`serpapi: HTTP ${res.status} ${json?.error ?? ""}`.trim());
  let aio = json.ai_overview;
  if (aio?.page_token) {
    const q2 = new URLSearchParams({ engine: "google_ai_overview", page_token: aio.page_token, api_key: process.env.SERPAPI_KEY });
    const r2 = await fetch(`https://serpapi.com/search.json?${q2}`);
    const j2 = await r2.json().catch(() => ({}));
    if (r2.ok) aio = j2.ai_overview ?? aio;
  }
  const base = { query: job.query, engine: "google_aio", model_slug: "serpapi/google", market: job.market, sample_no: job.sample_no, cost_usd: EST.google_aio, probed_at: new Date().toISOString() };
  if (!aio || (!aio.text_blocks && !aio.references)) return { ...base, status: "no_ai_answer", answer_text: null, citations: [], raw_response: { has_ai_overview: false } };
  const text = (aio.text_blocks ?? []).map((b) => b.snippet ?? (b.list ?? []).map((l) => l.snippet).join(" ")).filter(Boolean).join("\n");
  const citations = (aio.references ?? []).filter((r) => r?.link).map((r) => ({ url: r.link, title: r.title ?? undefined }));
  return { ...base, answer_text: text.slice(0, 20000) || null, citations: citations.slice(0, 100), raw_response: { references: citations.length, text_blocks: (aio.text_blocks ?? []).length } };
}

// ---------------------------------------------------------------------------
function extractUrls(text) {
  return [...new Set((text.match(/https?:\/\/[^\s)\]>"']+/g) ?? []).map((u) => u.replace(/[.,;:!?]+$/, "")))];
}
function slim(json) {
  // Keep the response small: model, usage, first choice metadata; the answer and citations are stored in their own columns.
  return { id: json.id, model: json.model, usage: json.usage, finish_reason: json.choices?.[0]?.finish_reason };
}
function round(n, d) {
  return Math.round(n * 10 ** d) / 10 ** d;
}
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = "true";
    else out[key] = argv[++i];
  }
  return out;
}
function die(msg) {
  console.error(msg);
  process.exit(1);
}
