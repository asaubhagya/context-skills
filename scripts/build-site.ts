/**
 * Build the static agent hub (agents.onecontext.me) from this repo's git history.
 *
 *   pnpm build-site            → site/  (ignored; deploy with `vercel --prod site`)
 *
 * Channels: `latest` = highest vN tag, `beta` = main. Every tagged version of
 * every skill gets an immutable page + raw .md; MCP catalogs get one page per
 * server. No runtime, no loader: what is deployed is exactly what a tag holds.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { marked } from "marked";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const OUT = join(ROOT, "site");
const HOST = "https://agents.onecontext.me";
const REPO = "asaubhagya/context-skills";

type ManifestSkill = { key: string; description: string; version: number; deps?: string[]; license?: string; primary: string; files: { path: string; src: string; sha256: string; bytes: number }[] };
type ManifestMcp = { key: string; path: string; sha256: string; server: { name: string; endpoint: string; contractVersion: string }; toolCount: number };
type Manifest = { generatedAt: string; skills: ManifestSkill[]; mcp?: ManifestMcp[] };
type Tool = { name: string; title?: string; description: string; readOnly?: boolean; destructive?: boolean; idempotent?: boolean; scopes?: string[]; inputSchema?: any; outputSchema?: any };
type Catalog = { schema: string; server: any; connect?: Record<string, string>; skills?: { key: string; role: string; description: string }[]; toolGroups: { key: string; title: string; access?: string; tools: Tool[] }[]; counts: { total: number; shared: number; paired: number } };
type Ref = { name: string; sha: string; date: string; manifest: Manifest };
type SkillVersion = { ref: string; version: number; date: string; sha256: string; changes: string[] };

const git = (cmd: string) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8" }).trim();
const show = (ref: string, path: string) => { try { return execSync(`git show ${ref}:${path}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const rel = (iso: string) => { const d = (Date.now() - Date.parse(iso)) / 864e5; return d < 1 ? "today" : d < 2 ? "yesterday" : d < 30 ? `${Math.floor(d)}d ago` : d < 365 ? `${Math.floor(d / 30)}mo ago` : `${Math.floor(d / 365)}y ago`; };
const time = (iso: string) => `<time datetime="${iso}" title="${iso.slice(0, 10)}">${rel(iso)}</time>`;
const write = (path: string, body: string) => { const f = join(OUT, path); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, body); };
const stripFm = (md: string) => md.replace(/^---\n[\s\S]*?\n---\n?/, "");

// ---------- collect ----------
const tags = git("tag --list 'v*' --sort=v:refname").split("\n").filter(Boolean);
const refs: Ref[] = [];
for (const name of [...tags, "main"]) {
  const raw = show(name, "manifest.json"); if (!raw) continue;
  refs.push({ name, sha: git(`rev-parse --short ${name}`), date: git(`log -1 --format=%cI ${name}`), manifest: JSON.parse(raw) });
}
const latest = refs.filter((r) => r.name !== "main").at(-1)!;
const beta = refs.find((r) => r.name === "main")!;
const betaIsLatest = beta.sha === git(`rev-parse --short ${latest.name}`);
const generatedAt = new Date().toISOString();

const skillKeys = [...new Set(refs.flatMap((r) => r.manifest.skills.map((s) => s.key)))].sort();
const history = new Map<string, SkillVersion[]>();
for (const key of skillKeys) {
  const versions: SkillVersion[] = []; let prev: Ref | null = null;
  for (const r of refs) {
    const s = r.manifest.skills.find((x) => x.key === key);
    if (s) {
      const primary = s.files.find((f) => f.src === s.primary) ?? s.files[0];
      const changed = !prev || prev.manifest.skills.find((x) => x.key === key)?.files.find((f) => f.src === s.primary)?.sha256 !== primary.sha256;
      if (changed) {
        const range = prev ? `${prev.name}..${r.name}` : r.name;
        const changes = git(`log --format=%s ${range} -- skills/${key}`).split("\n").filter(Boolean).slice(0, 8);
        versions.push({ ref: r.name, version: s.version, date: r.date, sha256: primary.sha256, changes });
      }
    }
    prev = r;
  }
  history.set(key, versions);
}
const skillAt = (ref: string, key: string) => refs.find((r) => r.name === ref)?.manifest.skills.find((s) => s.key === key) ?? null;

// ---------- layout ----------
const CSS = `
:root{--ink:#1a1a1a;--mute:#6b6b6b;--line:#e3e3e3;--bg:#fff;--soft:#f6f6f6;--accent:#0b6bcb;--ok:#1a7f37;--warn:#9a6700;--code:#f2f2f2}
@media(prefers-color-scheme:dark){:root{--ink:#e8e8e8;--mute:#9a9a9a;--line:#2c2c2c;--bg:#111;--soft:#1a1a1a;--accent:#6cb4ff;--ok:#4ac26b;--warn:#d4a72c;--code:#1e1e1e}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
main{max-width:720px;margin:0 auto;padding:16px 16px 64px}
nav.top{display:flex;gap:14px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line);font-size:14px;max-width:720px;margin:0 auto}
nav.top a{color:var(--ink);text-decoration:none}nav.top a.brand{font-weight:700}nav.top .r{margin-left:auto;color:var(--mute)}
a{color:var(--accent)}h1{font-size:26px;line-height:1.2;margin:18px 0 8px}h2{font-size:20px;margin:28px 0 8px}h3{font-size:17px;margin:20px 0 6px}
p{margin:8px 0}.mute{color:var(--mute)}.meta{font-size:14px;color:var(--mute);display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center}
code,pre,kbd{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em}code{background:var(--code);padding:1px 5px;border-radius:4px;word-break:break-word}
pre{background:var(--code);padding:12px;border-radius:8px;overflow-x:auto;-webkit-overflow-scrolling:touch}pre code{background:none;padding:0}
.badge{display:inline-block;font-size:12px;font-weight:600;padding:1px 8px;border-radius:999px;border:1px solid var(--line);color:var(--mute);vertical-align:middle}
.badge.latest{background:var(--ok);border-color:var(--ok);color:#fff}.badge.beta{border-color:var(--warn);color:var(--warn)}.badge.pinned{border-color:var(--mute)}
.badge.ro{border-color:var(--ok);color:var(--ok)}.badge.danger{border-color:#c33;color:#c33}
.list{list-style:none;padding:0;margin:12px 0}.list li{padding:12px 0;border-top:1px solid var(--line)}.list li:first-child{border-top:0}
.list .t{font-weight:600;font-size:17px}.list .d{color:var(--mute);font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.list .m{font-size:13px;color:var(--mute);margin-top:4px;display:flex;gap:10px;flex-wrap:wrap}
.banner{background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:10px 12px;font-size:14px;margin:12px 0}
select{font:inherit;font-size:15px;padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);max-width:100%}
.chips a{display:inline-block;margin:0 6px 6px 0;padding:3px 10px;border:1px solid var(--line);border-radius:999px;font-size:14px;text-decoration:none;color:var(--ink)}
.copy{display:flex;gap:8px;align-items:stretch}.copy pre{flex:1;margin:0}.copy button{font:inherit;font-size:13px;border:1px solid var(--line);background:var(--soft);color:var(--ink);border-radius:8px;padding:0 10px}
details{border-top:1px solid var(--line);padding:10px 0}details summary{cursor:pointer;list-style:none;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
details summary::-webkit-details-marker{display:none}summary .n{font-family:ui-monospace,Menlo,monospace;font-weight:600}summary .d{color:var(--mute);font-size:14px;flex-basis:100%;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
details[open] summary .d{display:none}.tool p{font-size:15px}.tool{scroll-margin-top:12px}
details.grp{border-top:2px solid var(--line);padding:12px 0 4px}details.grp>summary .gt{font-weight:700;font-size:17px}details.grp .tool{margin-left:0}
.card details.grp:first-child{border-top:0}
button.tgl{font:inherit;font-size:13px;border:1px solid var(--line);background:var(--soft);color:var(--ink);border-radius:999px;padding:3px 10px}
dl.params{margin:8px 0 0;padding:0}dl.params dt{margin-top:10px;font-family:ui-monospace,Menlo,monospace;font-weight:600}dl.params dt .ty{font-family:-apple-system,system-ui,sans-serif;font-weight:400;color:var(--mute);font-size:13px}
dl.params dt .req{color:#c33;font-weight:400;font-size:13px}dl.params dd{margin:2px 0 0;font-size:14px;color:var(--mute)}dl.params dl.params{border-left:2px solid var(--line);padding-left:10px;margin-left:2px}
.md img{max-width:100%}.md table{display:block;overflow-x:auto;border-collapse:collapse;font-size:14px}.md th,.md td{border:1px solid var(--line);padding:4px 8px;text-align:left}.md blockquote{margin:8px 0;padding-left:12px;border-left:3px solid var(--line);color:var(--mute)}
.md h1{font-size:22px}.md h2{font-size:19px}.md h3{font-size:16px}
footer{margin-top:40px;font-size:13px;color:var(--mute);border-top:1px solid var(--line);padding-top:12px}
.grid{display:grid;gap:12px}.card{border:1px solid var(--line);border-radius:10px;padding:12px 14px}.card a.t{font-weight:600;font-size:17px;text-decoration:none;color:var(--ink)}
.toc{font-size:14px;columns:2;column-gap:18px}.toc a{display:block;text-decoration:none;color:var(--accent);padding:2px 0;font-family:ui-monospace,Menlo,monospace;font-size:13px}
`;
const JS = `document.querySelectorAll('select[data-nav]').forEach(s=>s.addEventListener('change',()=>location.href=s.value));
document.querySelectorAll('.copy button').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.previousElementSibling.textContent);b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1200)}catch{}}));
document.querySelectorAll('button.tgl').forEach(b=>b.addEventListener('click',()=>document.querySelectorAll('details.tool,details.grp').forEach(d=>d.open=b.dataset.open==='1')));
if(location.hash){const d=document.getElementById(location.hash.slice(1));if(d&&d.tagName==='DETAILS'){d.open=true;let p=d.parentElement;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement}d.scrollIntoView()}}`;

function page(title: string, body: string, opts: { alt?: string; desc?: string } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — agents.onecontext.me</title>${opts.desc ? `<meta name="description" content="${esc(opts.desc)}">` : ""}${opts.alt ? `<link rel="alternate" type="text/markdown" href="${opts.alt}">` : ""}<style>${CSS}</style></head><body><nav class="top"><a class="brand" href="/">agents.onecontext.me</a><a href="/skills">Skills</a><a href="/mcp">MCP</a><a href="/guides">Guides</a><span class="r">${latest.name}</span></nav><main>${body}<footer>Built ${time(generatedAt)} from <a href="https://github.com/${REPO}">${REPO}</a> · latest <code>${latest.name}</code> · beta <code>main@${beta.sha}</code> · <a href="/llms.txt">llms.txt</a> · <a href="/README.md">README.md</a></footer></main><script>${JS}</script></body></html>`;
}
const copyBox = (cmd: string) => `<div class="copy"><pre><code>${esc(cmd)}</code></pre><button type="button">Copy</button></div>`;

// ---------- skills ----------
function skillPage(key: string, ref: Ref, mode: "latest" | "beta" | "pinned") {
  const s = skillAt(ref.name, key)!;
  const md = show(ref.name, s.primary) ?? "";
  const versions = history.get(key)!;
  const current = versions.find((v) => v.ref === ref.name) ?? [...versions].reverse().find((v) => v.version <= s.version)!;
  const latestSkill = skillAt(latest.name, key);
  const betaSkill = skillAt("main", key);
  const label = mode === "latest" ? `latest · v${s.version}` : mode === "beta" ? `beta · v${s.version} · main@${beta.sha}` : `pinned · v${s.version} · ${ref.name}`;
  const opts = [
    latestSkill ? `<option value="/skills/${key}" ${mode === "latest" ? "selected" : ""}>latest → v${latestSkill.version} (${latest.name})</option>` : "",
    betaSkill && !betaIsLatest ? `<option value="/skills/${key}@beta" ${mode === "beta" ? "selected" : ""}>beta → v${betaSkill.version} (main@${beta.sha})</option>` : "",
    ...[...versions].reverse().map((v) => `<option value="/skills/${key}@${v.ref}" ${mode === "pinned" && ref.name === v.ref ? "selected" : ""}>v${v.version} · ${v.ref} · ${v.date.slice(0, 10)}</option>`),
  ].join("");
  const rawPath = mode === "latest" ? `/skills/${key}.md` : `/skills/${key}@${mode === "beta" ? "beta" : ref.name}.md`;
  const banner = mode === "pinned" && latestSkill && latestSkill.version !== s.version ? `<div class="banner">You are reading <b>v${s.version}</b> (${ref.name}), not the current stable — latest is <a href="/skills/${key}">v${latestSkill.version}</a>.</div>` : mode === "beta" ? `<div class="banner">Beta channel: <code>main</code> at <code>${beta.sha}</code>. Stable is <a href="/skills/${key}">v${latestSkill?.version ?? "—"}</a>.</div>` : "";
  const deps = (s.deps ?? []).length ? `<h2>Depends on</h2><div class="chips">${s.deps!.map((d) => `<a href="/skills/${d}">${esc(d)}</a>`).join("")}</div>` : "";
  const files = s.files.filter((f) => f.src !== s.primary);
  const attach = files.length ? `<h2>Files</h2><ul>${files.map((f) => `<li><a href="https://cdn.jsdelivr.net/gh/${REPO}@${ref.name}/${f.src}"><code>${esc(f.path)}</code></a> <span class="mute">${(f.bytes / 1024).toFixed(1)} KB</span></li>`).join("")}</ul>` : "";
  const changelog = `<h2>Changelog</h2><ul class="list">${[...versions].reverse().map((v) => `<li id="v${v.version}"><div class="t">v${v.version} <span class="badge ${v.ref === latest.name ? "latest" : v.ref === "main" ? "beta" : "pinned"}">${v.ref === "main" ? "beta" : v.ref}</span> <span class="mute" style="font-weight:400;font-size:14px">${time(v.date)}</span></div>${v.changes.length ? `<ul class="mute" style="font-size:14px;margin:4px 0 0 18px;padding:0">${v.changes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : `<div class="mute" style="font-size:14px">First published.</div>`}<div class="m"><a href="/skills/${key}@${v.ref === "main" ? "beta" : v.ref}">read</a><a href="/skills/${key}@${v.ref === "main" ? "beta" : v.ref}.md">raw .md</a><code>${v.sha256.slice(0, 12)}</code></div></li>`).join("")}</ul>`;
  const body = `<h1>${esc(key)} <span class="badge ${mode}">${mode}</span></h1>
<div class="meta"><span>v${s.version}</span><span>${esc(ref.name === "main" ? `main@${beta.sha}` : ref.name)}</span><span>updated ${time(current.date)}</span><span>${esc(s.license ?? "")}</span><span>sha256 <code>${current.sha256.slice(0, 12)}</code></span></div>
<p>${esc(s.description)}</p>
${banner}
<p><label class="mute" style="font-size:13px">Version</label><br><select data-nav>${opts}</select></p>
<div class="meta"><a href="${rawPath}">Raw .md</a><a href="/skills/${key}/versions.json">versions.json</a><a href="/skills/${key}@${ref.name === "main" ? "beta" : ref.name}">Permalink</a><a href="https://github.com/${REPO}/blob/${ref.name}/${s.primary}">Source</a></div>
<h2>Install</h2>${copyBox(`curl -fsSL ${HOST}${rawPath} -o .claude/skills/${key}/SKILL.md`)}
${deps}${attach}
<h2>SKILL.md</h2><div class="md">${marked.parse(stripFm(md))}</div>
${changelog}`;
  return page(`${key} v${s.version}`, body, { alt: rawPath, desc: s.description });
}

for (const key of skillKeys) {
  const versions = history.get(key)!;
  if (skillAt(latest.name, key)) {
    write(`skills/${key}.html`, skillPage(key, latest, "latest"));
    write(`skills/${key}.md`, show(latest.name, skillAt(latest.name, key)!.primary)!);
  }
  if (skillAt("main", key)) {
    write(`skills/${key}@beta.html`, skillPage(key, beta, "beta"));
    write(`skills/${key}@beta.md`, show("main", skillAt("main", key)!.primary)!);
  }
  for (const v of versions.filter((v) => v.ref !== "main")) {
    const ref = refs.find((r) => r.name === v.ref)!;
    write(`skills/${key}@${v.ref}.html`, skillPage(key, ref, v.ref === latest.name ? "latest" : "pinned"));
    write(`skills/${key}@${v.ref}.md`, show(v.ref, skillAt(v.ref, key)!.primary)!);
  }
  write(`skills/${key}/versions.json`, JSON.stringify({ key, generatedAt, latest: skillAt(latest.name, key)?.version ?? null, beta: skillAt("main", key)?.version ?? null, versions: [...versions].reverse().map((v) => ({ version: v.version, ref: v.ref, date: v.date, sha256: v.sha256, url: `${HOST}/skills/${key}@${v.ref}.md`, changes: v.changes })) }, null, 2));
}

const skillsIndexBody = `<h1>Skills</h1><p class="mute">${skillKeys.length} skills · latest <code>${latest.name}</code> ${time(latest.date)} · beta <code>main@${beta.sha}</code> ${time(beta.date)}. Skills wrap the MCP tools: an agent loads them once per session (<code>start_context</code> / <code>setup</code>) and refreshes when the channel moves.</p>
<div class="meta"><a href="/skills/index.json">index.json</a><a href="/channels.json">channels.json</a><a href="https://cdn.jsdelivr.net/gh/${REPO}@${latest.name}/manifest.json">manifest.json</a></div>
<ul class="list">${skillKeys.map((key) => { const l = skillAt(latest.name, key); const b = skillAt("main", key); const v = history.get(key)!; const cur = [...v].reverse().find((x) => x.ref !== "main") ?? v.at(-1)!; return `<li><a class="t" href="/skills/${key}">${esc(key)}</a> ${l ? `<span class="badge latest">v${l.version}</span>` : `<span class="badge beta">beta only</span>`}${b && l && b.version !== l.version ? ` <span class="badge beta">beta v${b.version}</span>` : ""}<div class="d">${esc((l ?? b)!.description)}</div><div class="m"><span>updated ${time(cur.date)}</span><span>${v.length} version${v.length === 1 ? "" : "s"}</span>${(l ?? b)!.deps?.length ? `<span>depends: ${(l ?? b)!.deps!.join(", ")}</span>` : ""}</div></li>`; }).join("")}</ul>`;
write("skills/index.html", page("Skills", skillsIndexBody, { alt: "/skills/index.json" }));
write("skills/index.json", JSON.stringify({ generatedAt, latest: { ref: latest.name, sha: git(`rev-parse --short ${latest.name}`), date: latest.date }, beta: { ref: "main", sha: beta.sha, date: beta.date }, skills: skillKeys.map((key) => { const l = skillAt(latest.name, key); const b = skillAt("main", key); return { key, description: (l ?? b)!.description, latest: l?.version ?? null, beta: b?.version ?? null, deps: (l ?? b)!.deps ?? [], url: `${HOST}/skills/${key}`, raw: `${HOST}/skills/${key}.md`, versions: `${HOST}/skills/${key}/versions.json` }; }) }, null, 2));
write("channels.json", JSON.stringify({ generatedAt, latest: latest.name, beta: `main@${beta.sha}`, source: `https://cdn.jsdelivr.net/gh/${REPO}@${latest.name}/`, contract: Object.fromEntries((latest.manifest.mcp ?? []).map((m) => [m.key, m.server.contractVersion])), skills: Object.fromEntries(skillKeys.map((key) => [key, { latest: skillAt(latest.name, key)?.version ?? null, beta: skillAt("main", key)?.version ?? null }])) }, null, 2));

// ---------- mcp ----------
function schemaType(s: any): string {
  if (!s) return "any";
  if (s.const !== undefined) return `= ${JSON.stringify(s.const)}`;
  if (s.enum) return "enum";
  if (Array.isArray(s.type)) return s.type.join(" | ");
  if (s.type === "array") return `${schemaType(s.items)}[]`;
  if (s.anyOf || s.oneOf) return (s.anyOf ?? s.oneOf).map(schemaType).join(" | ");
  return s.type ?? (s.properties ? "object" : "any");
}
function params(schema: any, depth = 0): string {
  const props = schema?.properties ?? {}; const req = new Set<string>(schema?.required ?? []);
  const keys = Object.keys(props); if (!keys.length) return `<p class="mute">No parameters.</p>`;
  if (depth >= 3) return `<pre><code>${esc(JSON.stringify(schema, null, 1))}</code></pre>`;
  return `<dl class="params">${keys.map((k) => { const p = props[k]; const enums = p.enum ? `<div>one of: ${p.enum.slice(0, 6).map((e: any) => `<code>${esc(e)}</code>`).join(" | ")}${p.enum.length > 6 ? ` <details style="display:inline;border:0;padding:0"><summary style="display:inline">+${p.enum.length - 6} more</summary>${p.enum.slice(6).map((e: any) => `<code>${esc(e)}</code>`).join(" | ")}</details>` : ""}</div>` : ""; const def = p.default !== undefined ? `<div>default: <code>${esc(JSON.stringify(p.default))}</code></div>` : ""; const nested = p.type === "object" && p.properties ? (depth === 0 ? params(p, depth + 1) : `<details style="border:0;padding:4px 0"><summary class="mute">Show ${Object.keys(p.properties).length} fields</summary>${params(p, depth + 1)}</details>`) : p.type === "array" && p.items?.properties ? `<details style="border:0;padding:4px 0"><summary class="mute">Item fields (${Object.keys(p.items.properties).length})</summary>${params(p.items, depth + 1)}</details>` : ""; return `<dt>${esc(k)} <span class="ty">· ${esc(schemaType(p))}</span>${req.has(k) ? ` <span class="req">● required</span>` : ""}</dt><dd>${esc(p.description ?? "")}${enums}${def}${nested}</dd>`; }).join("")}</dl>`;
}
function toolBlock(t: Tool) {
  const flags = [t.readOnly ? `<span class="badge ro">read-only</span>` : "", t.destructive ? `<span class="badge danger">destructive</span>` : "", t.idempotent && !t.readOnly ? `<span class="badge">idempotent</span>` : ""].join(" ");
  const out = t.outputSchema && Object.keys(t.outputSchema.properties ?? {}).length ? `<details style="border:0"><summary class="mute">Output</summary>${params(t.outputSchema, 1)}</details>` : "";
  return `<details class="tool" id="${esc(t.name)}" open><summary><span class="n">${esc(t.name)}</span> ${flags}<span class="d">${esc(firstSentence(t.description))}</span></summary>${t.title ? `<p><b>${esc(t.title)}</b></p>` : ""}<p>${esc(t.description)}</p>${t.scopes?.length ? `<p class="mute" style="font-size:13px">scopes: ${t.scopes.map((s) => `<code>${esc(s)}</code>`).join(" ")}</p>` : ""}<h3 style="margin-top:12px">Parameters</h3>${params(t.inputSchema)}${out}<p class="mute" style="font-size:13px"><a href="#${esc(t.name)}">#${esc(t.name)}</a></p></details>`;
}
const catalogs = (latest.manifest.mcp ?? []).map((m) => ({ m, cat: JSON.parse(show(latest.name, m.path)!) as Catalog }));
const firstSentence = (s: string) => s.split(/(?<=\.)\s/)[0];
const toolFlags = (t: Tool) => [t.readOnly ? `<span class="badge ro">read-only</span>` : "", t.destructive ? `<span class="badge danger">destructive</span>` : ""].filter(Boolean).join(" ");
// One shape for both pages: header → groups (<details class="grp">) → tools. `full` renders parameters; otherwise a link row.
function serverHeader(m: ManifestMcp, cat: Catalog, full: boolean) {
  const s = cat.server; const n = cat.toolGroups.reduce((a, g) => a + g.tools.length, 0);
  const title = full ? `<h1>${esc(s.name)} <span class="badge latest">MCP</span></h1>` : `<h2 style="margin-top:0"><a href="/mcp/${m.key}" style="text-decoration:none;color:inherit">${esc(s.name)}</a> <span class="badge latest">MCP</span></h2>`;
  return `${title}
<div class="meta"><span>${n} tools</span><span>contract <code>${esc(s.contractVersion)}</code></span><span>catalog ${time(s.generatedAt ?? latest.date)}</span>${s.sourceCommit ? `<span>source <code>${esc(s.sourceCommit)}</code></span>` : ""}</div>
<p>${esc(s.purpose ?? "")}</p>
${copyBox(s.endpoint)}
<div class="meta" style="margin-top:8px">${full ? "" : `<a href="/mcp/${m.key}">all parameters</a>`}<a href="/mcp/${m.key}/tools.json">tools.json</a><a href="https://cdn.jsdelivr.net/gh/${REPO}@${latest.name}/${m.path}">raw catalog</a>${s.auth ? `<span>auth: ${esc(s.auth.type)}${s.auth.signIn ? ` · ${esc(s.auth.signIn)}` : ""}</span>` : ""}${s.startingPrompt ? `<span>say: <code>${esc(s.startingPrompt)}</code></span>` : ""}</div>`;
}
function groupBlock(m: ManifestMcp, g: Catalog["toolGroups"][number], full: boolean) {
  const rows = full ? g.tools.map(toolBlock).join("") : `<ul class="list" style="margin:4px 0 0">${g.tools.map((t) => `<li style="padding:8px 0"><a class="n" href="/mcp/${m.key}#${esc(t.name)}" style="text-decoration:none">${esc(t.name)}</a> ${toolFlags(t)}<div class="d">${esc(firstSentence(t.description))}</div></li>`).join("")}</ul>`;
  return `<details class="grp" id="group-${esc(g.key)}"${full ? " open" : ""}><summary><span class="gt">${esc(g.title)}</span> <span class="mute" style="font-size:13px">${g.tools.length}${g.access ? ` · ${esc(g.access)}` : ""}</span></summary>${rows}</details>`;
}
for (const { m, cat } of catalogs) {
  const s = cat.server; const tools = cat.toolGroups.flatMap((g) => g.tools);
  const connect = cat.connect ? `<h2>Connect</h2>${Object.entries(cat.connect).map(([h, c]) => `<p><b>${esc(h)}</b></p>${c.startsWith("claude mcp") ? copyBox(c) : `<p class="mute" style="font-size:14px">${esc(c)}</p>`}`).join("")}` : "";
  const skills = cat.skills?.length ? `<h2>Skills that wrap this server</h2><ul>${cat.skills.map((k) => `<li><a href="/skills/${k.key}">${esc(k.key)}</a> <span class="badge">${esc(k.role)}</span> <span class="mute">${esc(k.description)}</span></li>`).join("")}</ul>` : "";
  const body = `${serverHeader(m, cat, true)}
${connect}${skills}
<h2>Tools <span class="mute" style="font-weight:400;font-size:14px">${tools.length}</span></h2><p class="meta"><button type="button" class="tgl" data-open="0">Collapse all</button><button type="button" class="tgl" data-open="1">Expand all</button><span>tap a group or a tool to fold it</span></p>
${cat.toolGroups.map((g) => groupBlock(m, g, true)).join("")}`;
  write(`mcp/${m.key}.html`, page(`${s.name} MCP`, body, { alt: `/mcp/${m.key}/tools.json`, desc: s.purpose }));
  write(`mcp/${m.key}/tools.json`, JSON.stringify({ generatedAt, server: s, tools: tools.map(({ name, title, description, readOnly, destructive, idempotent, scopes, inputSchema, outputSchema }) => ({ name, title, description, readOnly, destructive, idempotent, scopes, inputSchema, outputSchema })) }, null, 2));
}
write("mcp/index.html", page("MCP servers", `<h1>MCP servers</h1><p class="mute">Two servers, one catalog each — generated from the servers' own <code>tools/list</code> at <code>${latest.name}</code>. Connect the endpoint, then load the skills that wrap it. Tap a group to see its tools; tap a tool for its parameters.</p>
${catalogs.map(({ m, cat }) => `<section class="card" style="margin:16px 0">${serverHeader(m, cat, false)}<div style="margin-top:10px">${cat.toolGroups.map((g) => groupBlock(m, g, false)).join("")}</div></section>`).join("")}`, { alt: "/mcp/index.json" }));
write("mcp/index.json", JSON.stringify({ generatedAt, servers: catalogs.map(({ m, cat }) => ({ key: m.key, name: cat.server.name, endpoint: cat.server.endpoint, contractVersion: cat.server.contractVersion, toolCount: m.toolCount, url: `${HOST}/mcp/${m.key}`, tools: `${HOST}/mcp/${m.key}/tools.json` })) }, null, 2));

// ---------- guides (guides/<key>.md on main; frontmatter title/description/server/updated) ----------
type Guide = { key: string; title: string; description: string; server?: string; updated?: string; body: string; raw: string };
const guides: Guide[] = git("ls-tree --name-only main guides/ 2>/dev/null || true").split("\n").filter((p) => p.endsWith(".md")).map((p) => {
  const raw = show("main", p)!; const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/)?.[1] ?? "";
  const get = (k: string) => fm.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
  return { key: p.replace(/^guides\//, "").replace(/\.md$/, ""), title: get("title") || p, description: get("description"), server: get("server"), updated: get("updated"), body: stripFm(raw), raw };
});
for (const g of guides) {
  write(`guides/${g.key}.md`, g.raw);
  write(`guides/${g.key}.html`, page(g.title, `<h1>${esc(g.title)}</h1><div class="meta">${g.server ? `<span>server <a href="/mcp/${esc(g.server === "context-blog" ? "context-blog" : g.server)}">${esc(g.server)}</a></span>` : ""}${g.updated ? `<span>updated ${esc(g.updated)}</span>` : ""}<span>beta <code>main@${beta.sha}</code></span><a href="/guides/${g.key}.md">Raw .md</a><a href="https://github.com/${REPO}/blob/main/guides/${g.key}.md">Source</a></div><p>${esc(g.description)}</p><div class="md">${marked.parse(g.body)}</div>`, { alt: `/guides/${g.key}.md`, desc: g.description }));
}
write("guides/index.html", page("Guides", `<h1>Guides</h1><p class="mute">Short, agent-readable guides — what each server is, how to connect, the loop, the rules that bite, and a tool map. Served from <code>main</code>; every page has a raw <code>.md</code> sibling.</p><ul class="list">${guides.map((g) => `<li><a class="t" href="/guides/${g.key}">${esc(g.title)}</a>${g.server ? ` <span class="badge">${esc(g.server)}</span>` : ""}<div class="d">${esc(g.description)}</div><div class="m">${g.updated ? `<span>updated ${esc(g.updated)}</span>` : ""}<a href="/guides/${g.key}.md">raw .md</a></div></li>`).join("") || `<li class="mute">No guides yet.</li>`}</ul>`, { alt: "/guides/index.json" }));
write("guides/index.json", JSON.stringify({ generatedAt, source: `main@${beta.sha}`, guides: guides.map((g) => ({ key: g.key, title: g.title, description: g.description, server: g.server || null, updated: g.updated || null, url: `${HOST}/guides/${g.key}`, raw: `${HOST}/guides/${g.key}.md` })) }, null, 2));

// ---------- README / root ----------
const ctx = catalogs.find((c) => c.m.key === "context"); const blog = catalogs.find((c) => c.m.key !== "context");
const readme = `# agents.onecontext.me

The agent interface for Context. Everything an agent (or a person) needs to start working with Context lives here: the two MCP servers, the skills that wrap their tools, and the channel each is published on. \`app.onecontext.me\` and \`sites.onecontext.me\` are the human GUIs; this site is the machine-readable side.

## What Context is

${ctx?.cat.server.purpose ?? ""}

**Context Sites** (Context Blog) is the publishing half: it drafts and publishes blog posts, sites and Instagram content for a tenant; approvals stay in Context.

## Connect

| Server | Endpoint | Contract | Tools |
|---|---|---|---|
${catalogs.map(({ m, cat }) => `| ${cat.server.name} | \`${cat.server.endpoint}\` | ${cat.server.contractVersion} | [${m.toolCount}](${HOST}/mcp/${m.key}) |`).join("\n")}

Claude Code:

\`\`\`
${catalogs.map(({ cat }) => cat.connect?.["claude-code"] ?? `claude mcp add --transport http ${cat.server.key} ${cat.server.endpoint}`).join("\n")}
\`\`\`

claude.ai / ChatGPT / Cursor: add a custom connector with the endpoint URL. Sign in with Google; pair your iPhone in the Context app for private Spaces.

## Guides

${guides.map((g) => `- [${g.title}](${HOST}/guides/${g.key}) — ${g.description} ([raw](${HOST}/guides/${g.key}.md))`).join("\n") || "_none yet_"}

## Start

1. Call \`start_context\` on the Context server (or say **"${ctx?.cat.server.startingPrompt ?? "Nomi, get me started"}"**). It reports your account, Spaces, the \`context\` skill with its version and sha256, and a \`nextAction\`.
2. For a blog or site, call \`setup {workflow: "blog"}\` on Context Sites and follow its \`nextStep\`.
3. Load the skills your host names. Coding hosts write them to \`.claude/skills/<key>/SKILL.md\`; chat hosts read the raw \`.md\` links below.

## Skills

Skills wrap the MCP tools — they say when to call what. Published from [${REPO}](https://github.com/${REPO}) on two channels:

- **latest** — tag \`${latest.name}\` (${latest.date.slice(0, 10)}). Stable. Default for every harness.
- **beta** — \`main@${beta.sha}\` (${beta.date.slice(0, 10)}). Experimental; opt in per harness or per call.

| Skill | latest | beta | Raw |
|---|---|---|---|
${skillKeys.map((k) => `| [${k}](${HOST}/skills/${k}) | ${skillAt(latest.name, k) ? `v${skillAt(latest.name, k)!.version}` : "—"} | ${skillAt("main", k) ? `v${skillAt("main", k)!.version}` : "—"} | [.md](${HOST}/skills/${k}.md) |`).join("\n")}

Every version is immutable at \`/skills/<key>@vN.md\`; \`/skills/<key>@beta.md\` tracks main. Machine indexes: [channels.json](${HOST}/channels.json), [skills/index.json](${HOST}/skills/index.json), per-skill \`versions.json\`, per-server \`tools.json\`.

## Rules of the road

- Resolve \`latest\` at session start; pin a version only when you have a reason, and record what you ran with in \`work_stats\`.
- If the skills you hold differ from what the channel serves, refresh them (coding hosts) or finish the work and tell the owner (chat hosts).
- Never publish without an approval recorded in Context. Refer to credentials by name, never by value.

_Built ${generatedAt} · Context contract ${ctx?.cat.server.contractVersion ?? "?"} · Sites contract ${blog?.cat.server.contractVersion ?? "?"}_
`;
write("README.md", readme);
write("index.html", page("Agent interface for Context", `<div class="md">${marked.parse(readme.replace(/^# .*\n/, "<h1>Agent interface for Context</h1>\n"))}</div>`, { alt: "/README.md", desc: "MCP servers, skills and channels for agents working with Context." }));
write("llms.txt", `# agents.onecontext.me\n\n> Agent interface for Context: MCP endpoints, tool catalogs, and versioned skills on latest/beta channels.\n\n## Start\n- ${HOST}/README.md\n- ${HOST}/channels.json\n\n## Guides\n${guides.map((g) => `- ${g.title}: ${HOST}/guides/${g.key}.md`).join("\n")}\n\n## MCP\n${catalogs.map(({ m, cat }) => `- ${cat.server.name}: ${cat.server.endpoint} — catalog ${HOST}/mcp/${m.key}/tools.json`).join("\n")}\n\n## Skills (latest ${latest.name})\n${skillKeys.map((k) => `- ${k}: ${HOST}/skills/${k}.md — versions ${HOST}/skills/${k}/versions.json`).join("\n")}\n`);

// ---------- vercel ----------
write("vercel.json", JSON.stringify({ cleanUrls: true, trailingSlash: false, headers: [
  { source: "/(.*)\\.md", headers: [{ key: "Content-Type", value: "text/markdown; charset=utf-8" }, { key: "Access-Control-Allow-Origin", value: "*" }] },
  { source: "/(.*)\\.json", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] },
  { source: "/llms.txt", headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }] },
  { source: "/skills/(.*)@v(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
  { source: "/(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=300, must-revalidate" }] },
], redirects: [{ source: "/skills/:key.zip", destination: "https://cdn.jsdelivr.net/gh/" + REPO + "@" + latest.name + "/skills/:key/SKILL.md", permanent: false }] }, null, 2));

console.log(`site/: ${skillKeys.length} skills, ${refs.length} refs (latest ${latest.name}, beta main@${beta.sha}), ${catalogs.length} MCP catalogs`);
