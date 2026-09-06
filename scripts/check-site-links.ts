#!/usr/bin/env -S pnpm tsx
/**
 * check-site-links — every URL the generated site emits must resolve.
 *
 * Walks site/ (html, md, txt, json) and checks each internal link against the
 * files on disk, Vercel cleanUrls (`/x` → x.html or x/index.html) and the
 * redirects in site/vercel.json. External links are allowed only on a short
 * host allowlist (repo hosts, CDNs, the MCP endpoints); anything else fails.
 *
 *   pnpm build-site && pnpm check-site-links
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const SITE = join(ROOT, "site");
const HOST = "https://agents.onecontext.me";
const ALLOWED_HOSTS = ["json-schema.org", "github.com", "cdn.jsdelivr.net", "raw.githubusercontent.com", "mcp.onecontext.me", "sites.onecontext.me", "app.onecontext.me", "onecontext.me", "getmeetly.ai", "agentskills.io", "llmstxt.org", "docs.anthropic.com", "code.claude.com", "modelcontextprotocol.io"];

if (!existsSync(SITE)) { console.error("site/ missing — run pnpm build-site first"); process.exit(1); }
const vercel = JSON.parse(readFileSync(join(SITE, "vercel.json"), "utf8")) as { redirects?: { source: string; destination: string }[] };
const redirectRes = (vercel.redirects ?? []).map((r) => ({ re: new RegExp("^" + r.source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\:(\w+)/g, "[^/]+") + "$"), destination: r.destination }));

function* walk(dir: string): Generator<string> { for (const e of readdirSync(dir)) { const p = join(dir, e); if (statSync(p).isDirectory()) yield* walk(p); else yield p; } }
const files = [...walk(SITE)].filter((f) => /\.(html|md|txt|json)$/.test(f));

const exists = (path: string): boolean => {
  const p = decodeURIComponent(path.replace(/[?#].*$/, ""));
  if (p === "/" || p === "") return existsSync(join(SITE, "index.html"));
  const rel = p.replace(/^\//, "");
  if (existsSync(join(SITE, rel)) && !statSync(join(SITE, rel)).isDirectory()) return true;
  if (rel.endsWith("/")) return existsSync(join(SITE, rel, "index.html")) || existsSync(join(SITE, `${rel.slice(0, -1)}.html`));
  if (existsSync(join(SITE, `${rel}.html`))) return true;
  if (existsSync(join(SITE, rel, "index.html"))) return true;
  for (const r of redirectRes) if (r.re.test(p)) return true;
  return false;
};

const problems: string[] = [];
let checked = 0;
for (const f of files) {
  const text = readFileSync(f, "utf8"); const rel = relative(SITE, f);
  const links = new Set<string>();
  for (const m of text.matchAll(/href="([^"]+)"/g)) links.add(m[1]);
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) links.add(m[1]);
  for (const m of text.matchAll(/https?:\/\/[^\s"'<>)\]`]+/g)) links.add(m[0]);
  for (const raw of links) {
    let link = raw.replace(/[.,;)]+$/, "");
    if (link.startsWith("#") || link.startsWith("mailto:")) continue;
    if (link.startsWith(HOST)) link = link.slice(HOST.length) || "/";
    if (/^https?:\/\//.test(link)) {
      let host = ""; try { host = new URL(link.replace(/&[a-z]+;.*$/, "")).host; } catch { continue; }   // truncated/escaped example URLs inside prose are not links
      if (!host) continue;
      if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) problems.push(`${rel}: external host not allowed: ${link}`);
      continue;
    }
    if (/\{sha\}|<key>|&lt;key&gt;|<slug>/.test(link)) continue;                 // documented placeholders
    if (!link.startsWith("/") && !/\.(md|html|json)$/.test(link)) continue;    // words inside prose/regex patterns, not links
    checked++;
    if (!link.startsWith("/")) { problems.push(`${rel}: relative link (must be absolute): ${link}`); continue; }
    if (!exists(link)) problems.push(`${rel}: broken link ${link}`);
  }
}
// redirect destinations must resolve too
for (const r of vercel.redirects ?? []) if (!r.destination.includes(":") && !exists(r.destination)) problems.push(`vercel.json: redirect ${r.source} → ${r.destination} does not resolve`);

if (problems.length) { console.error(problems.join("\n")); console.error(`\n${problems.length} problem(s) across ${files.length} files`); process.exit(1); }
console.log(`check-site-links: ${checked} internal links in ${files.length} files resolve; ${vercel.redirects?.length ?? 0} redirects verified`);
