#!/usr/bin/env -S pnpm tsx
/**
 * register-catalog — the registration step of the agents v2 contract (§6).
 * Fetches each MCP server's own card (`/.well-known/mcp/server-card.json`),
 * validates it with the check-mcp-catalogs rules, and writes `mcp/<key>.json`
 * ONLY when the content differs from what is committed (deploy timestamps
 * ignored — see check-catalogs-live.ts). When anything was written it runs
 * `pnpm build-manifest` and, with `--commit`, makes one commit per key:
 * `chore(mcp): register <key> catalog <sourceCommit>`.
 *
 *   pnpm register-catalog all               # every known server
 *   pnpm register-catalog context --commit  # one server, commit the result (CI)
 *
 * A server that cannot be fetched or serves an invalid card is an error: the
 * script still registers the others, then exits 1 with a clear message so the
 * workflow is marked failed — never a silent success. Writes
 * `changed=true|false` to $GITHUB_OUTPUT when present.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { comparable, fetchCard, readCommitted, ROOT, SERVER_CARDS } from "./check-catalogs-live";

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { cwd: ROOT, stdio: "inherit" });

async function main() {
  const argv = process.argv.slice(2);
  const commit = argv.includes("--commit");
  const target = argv.find((a) => !a.startsWith("--")) ?? "all";
  const keys = target === "all" ? Object.keys(SERVER_CARDS) : [target];
  const unknown = keys.filter((k) => !SERVER_CARDS[k]);
  if (unknown.length) { console.error(`register-catalog: unknown server ${unknown.join(", ")} — known: ${Object.keys(SERVER_CARDS).join(", ")}, all`); process.exit(2); }

  const failures: string[] = [];
  const written: { key: string; sourceCommit: string }[] = [];

  for (const key of keys) {
    try {
      const live = await fetchCard(key);
      const committed = readCommitted(key);
      if (committed && comparable(committed) === comparable(live)) { console.log(`register-catalog: ${key} unchanged`); continue; }
      writeFileSync(join(ROOT, "mcp", `${key}.json`), JSON.stringify(live, null, 2) + "\n");
      const sourceCommit = String((live.server as { sourceCommit?: string }).sourceCommit ?? "unknown");
      written.push({ key, sourceCommit });
      console.log(`register-catalog: wrote mcp/${key}.json (sourceCommit ${sourceCommit}, ${live.counts?.total ?? "?"} tools)`);
    } catch (e) {
      failures.push((e as Error).message);
    }
  }

  if (written.length) {
    run("pnpm", ["build-manifest"]);
    if (commit) {
      for (const { key, sourceCommit } of written) {
        run("git", ["add", `mcp/${key}.json`, "manifest.json"]);
        run("git", ["commit", "-m", `chore(mcp): register ${key} catalog ${sourceCommit}`]);
      }
    }
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${written.length > 0}\n`);

  if (failures.length) {
    for (const f of failures) console.error(`register-catalog: ${f}`);
    console.error(`register-catalog: ${failures.length} server(s) not registered`);
    process.exit(1);
  }
  console.log(`register-catalog: ${written.length} catalog(s) written, ${keys.length - written.length} unchanged`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
