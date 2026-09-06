#!/usr/bin/env -S pnpm tsx
/**
 * check-catalogs-live — gate 4 of the agents v2 contract (§8): every committed
 * `mcp/<key>.json` must equal the card its server serves live at
 * `GET <origin>/.well-known/mcp/server-card.json` (§6), ignoring the deploy
 * timestamps (`server.publishedAt`, and the exporter's `server.generatedAt`).
 *
 *   pnpm check-catalogs-live            # hard: unreachable or different → exit 1 (main)
 *   pnpm check-catalogs-live --soft     # warn and exit 0 (pull requests)
 *   pnpm check-catalogs-live context    # only these keys
 *
 * Never writes. `register-catalog.ts` is the script that writes.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MCP_CATALOG_SCHEMA, validateCatalog, type McpCatalog } from "./check-mcp-catalogs";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const MCP_DIR = join(ROOT, "mcp");

/** Server card URL per catalog key (contract §6). Other keys derive it from their committed endpoint. */
export const SERVER_CARDS: Record<string, string> = {
  context: "https://mcp.onecontext.me/.well-known/mcp/server-card.json",
  "context-blog": "https://sites.onecontext.me/.well-known/mcp/server-card.json",
};

/** Fields that legitimately differ between two exports of the same registry. */
const VOLATILE = ["publishedAt", "generatedAt"];

export function cardUrlFor(key: string): string {
  if (SERVER_CARDS[key]) return SERVER_CARDS[key];
  const committed = readCommitted(key);
  const endpoint = committed?.server?.endpoint;
  if (!endpoint) throw new Error(`${key}: no server card URL known and no committed mcp/${key}.json endpoint to derive it from`);
  return `${new URL(endpoint).origin}/.well-known/mcp/server-card.json`;
}

export function readCommitted(key: string): McpCatalog | null {
  const abs = join(MCP_DIR, `${key}.json`);
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, "utf8")) as McpCatalog;
}

/** Keys of every committed catalog with the MCP catalog schema. */
export function committedKeys(): string[] {
  if (!existsSync(MCP_DIR)) return [];
  return readdirSync(MCP_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => basename(f, ".json"))
    .filter((k) => readCommitted(k)?.schema === MCP_CATALOG_SCHEMA)
    .sort();
}

/** Deterministic JSON with the volatile server fields removed — the equality used everywhere here. */
export function comparable(catalog: McpCatalog): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])]));
    return v;
  };
  const server = { ...(catalog.server ?? {}) } as Record<string, unknown>;
  for (const f of VOLATILE) delete server[f];
  return JSON.stringify(sort({ ...catalog, server }));
}

/** GET the live card; throws with a one-line reason when it is not a valid catalog for `key`. */
export async function fetchCard(key: string): Promise<McpCatalog> {
  const url = cardUrlFor(key);
  let res: Response;
  try {
    res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  } catch (e) {
    throw new Error(`${key}: GET ${url} failed (${(e as Error).message})`);
  }
  if (!res.ok) throw new Error(`${key}: GET ${url} → HTTP ${res.status} — the server does not serve its card yet (contract §6)`);
  let card: McpCatalog;
  try { card = (await res.json()) as McpCatalog; } catch { throw new Error(`${key}: GET ${url} is not JSON`); }
  const problems = validateCatalog(`live ${url}`, key, card);
  if (problems.length) throw new Error(`${key}: live card is invalid:\n  ${problems.join("\n  ")}`);
  return card;
}

async function main() {
  const argv = process.argv.slice(2);
  const soft = argv.includes("--soft");
  const keys = argv.filter((a) => !a.startsWith("--"));
  const targets = keys.length ? keys : committedKeys();
  const problems: string[] = [];

  for (const key of targets) {
    const committed = readCommitted(key);
    if (!committed) { problems.push(`${key}: mcp/${key}.json is not committed — run \`pnpm register-catalog ${key}\``); continue; }
    try {
      const live = await fetchCard(key);
      if (comparable(live) !== comparable(committed)) {
        problems.push(`${key}: mcp/${key}.json differs from the live card (live sourceCommit ${(live.server as { sourceCommit?: string }).sourceCommit ?? "?"}, committed ${(committed.server as { sourceCommit?: string }).sourceCommit ?? "?"}) — run \`pnpm register-catalog ${key}\``);
      } else {
        console.log(`check-catalogs-live: ${key} matches the live card`);
      }
    } catch (e) {
      problems.push((e as Error).message);
    }
  }

  if (problems.length === 0) { console.log(`check-catalogs-live: ${targets.length} catalog(s) OK`); return; }
  for (const p of problems) console[soft ? "warn" : "error"](`${soft ? "::warning::" : ""}check-catalogs-live: ${p}`);
  if (!soft) process.exit(1);
  console.log("check-catalogs-live (--soft): reported as warnings only");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
