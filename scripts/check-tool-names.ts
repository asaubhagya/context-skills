#!/usr/bin/env -S pnpm tsx
/**
 * check-tool-names — the Guide(s) and every SKILL.md may only name tools that exist.
 *
 * A candidate is a backticked snake_case identifier (`get_issue`) whose first
 * token is a verb/noun some real tool starts with (get_, list_, article_, …);
 * field names and states (`parent_id`, `in_review`) never match and are
 * ignored. Each candidate must exist in a committed catalog (mcp/*.json).
 * Legitimate non-tools that share a prefix go in scripts/tool-names.allow.
 *
 *   pnpm check-tool-names
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const ALLOW = join(ROOT, "scripts", "tool-names.allow");

const tools = new Set<string>();
for (const f of readdirSync(join(ROOT, "mcp")).filter((f) => f.endsWith(".json"))) {
  const cat = JSON.parse(readFileSync(join(ROOT, "mcp", f), "utf8"));
  for (const g of cat.toolGroups ?? []) for (const t of g.tools ?? []) tools.add(t.name);
}
const prefixes = new Set([...tools].map((t) => t.split("_")[0]));
const allow = new Set(existsSync(ALLOW) ? readFileSync(ALLOW, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")) : []);

function* walk(dir: string): Generator<string> { for (const e of readdirSync(dir)) { const p = join(dir, e); if (e === "node_modules" || e === "site" || e.startsWith(".")) continue; if (statSync(p).isDirectory()) yield* walk(p); else yield p; } }
const docs = [...walk(ROOT)].filter((p) => /(^|\/)(GUIDE\.md|SKILL\.md)$/.test(p) || /^guides\/.*\.md$/.test(relative(ROOT, p)));

const problems: string[] = []; let seen = 0;
for (const f of docs) {
  const text = readFileSync(f, "utf8").replace(/```[\s\S]*?```/g, "");            // fenced blocks are examples, not claims
  for (const m of text.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)(?:\s*\{[^`]*\})?`/g)) {
    const name = m[1]; if (allow.has(name) || !prefixes.has(name.split("_")[0])) continue;
    seen++;
    if (!tools.has(name)) problems.push(`${relative(ROOT, f)}: \`${name}\` is not a tool on any catalog (add to scripts/tool-names.allow if it is not meant to be one)`);
  }
}
const unique = [...new Set(problems)];
if (unique.length) { console.error(unique.join("\n")); console.error(`\n${unique.length} unknown tool name(s) in ${docs.length} docs (${tools.size} tools known)`); process.exit(1); }
console.log(`check-tool-names: ${seen} tool references in ${docs.length} docs all exist (${tools.size} tools across ${readdirSync(join(ROOT, "mcp")).filter((f) => f.endsWith(".json")).length} catalogs)`);
