/**
 * Build the static agent home (agents.onecontext.me) from this repo's git history.
 *
 *   pnpm build-site            → site/  (ignored; deployed by CI)
 *
 * Three primitives, one source of truth:
 *   Guide  — GUIDE.md (core) and extensions/<slug>/GUIDE.md, rendered as each home page
 *   Skills — skills/<key>/SKILL.md, channels `latest` (newest vN tag) / `beta` (main)
 *   Tools  — mcp/<key>.json catalogs, registered by each MCP at deploy time (read from main)
 * Product membership is data: skill `product` in manifest.json, `server.product` in a catalog.
 * Every HTML page has a same-content `.md` sibling. No runtime except a version <select> and copy buttons.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { marked } from "marked";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const OUT = join(ROOT, "site");
const HOST = "https://agents.onecontext.me";
const REPO = "asaubhagya/context-skills";
const CORE = "context";

type ManifestSkill = { key: string; description: string; version: number; deps?: string[]; license?: string; product?: string; primary: string; files: { path: string; src: string; sha256: string; bytes: number }[] };
type ManifestMcp = { key: string; path: string; sha256: string; server: { name: string; endpoint: string; contractVersion: string }; toolCount: number };
type Manifest = { generatedAt: string; skills: ManifestSkill[]; mcp?: ManifestMcp[]; retired?: { key: string; replacedBy?: string }[] };
type Tool = { name: string; title?: string; description: string; readOnly?: boolean; destructive?: boolean; idempotent?: boolean; scopes?: string[]; inputSchema?: any; outputSchema?: any };
type Catalog = { schema: string; server: any; connect?: Record<string, string>; skills?: { key: string; role: string; description: string }[]; toolGroups: { key: string; title: string; access?: string; tools: Tool[] }[]; counts: { total: number; shared: number; paired: number } };
type Ref = { name: string; sha: string; full: string; date: string; manifest: Manifest };
type SkillVersion = { ref: string; version: number; date: string; sha256: string; changes: string[] };
type Guide = { product: string; title: string; description: string; updated: string; body: string; raw: string; path: string; ref: string; betaDiffers: boolean };
type Server = { key: string; product: string; cat: Catalog; path: string; tools: Tool[] };

/** `beta` is main. Locally, SITE_BETA_REF=HEAD builds the current branch as beta (CI never sets it). */
const MAIN_REF = process.env.SITE_BETA_REF || "main";
const gitRef = (ref: string) => (ref === "main" ? MAIN_REF : ref);
const git = (cmd: string) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8" }).trim();
const show = (ref: string, path: string) => { try { return execSync(`git show ${gitRef(ref)}:${path}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const rel = (iso: string) => { const d = (Date.now() - Date.parse(iso)) / 864e5; return d < 1 ? "today" : d < 2 ? "yesterday" : d < 30 ? `${Math.floor(d)}d ago` : d < 365 ? `${Math.floor(d / 30)}mo ago` : `${Math.floor(d / 365)}y ago`; };
const time = (iso: string) => `<time datetime="${iso}" title="${iso.slice(0, 10)}">${rel(iso)}</time>`;
const write = (path: string, body: string) => { const f = join(OUT, path); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, body); };
const stripFm = (md: string) => md.replace(/^---\n[\s\S]*?\n---\n?/, "");
const fmGet = (md: string, k: string) => (md.match(/^---\n([\s\S]*?)\n---\n?/)?.[1] ?? "").match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
const md2html = (md: string) => marked.parse(md) as string;
const sha12 = (s: string) => s.slice(0, 12);

// ---------- collect: refs, channels ----------
const tags = git("tag --list 'v*' --sort=v:refname").split("\n").filter(Boolean);
const refs: Ref[] = [];
for (const name of [...tags, "main"]) {
  const raw = show(name, "manifest.json"); if (!raw) continue;
  refs.push({ name, sha: git(`rev-parse --short ${gitRef(name)}`), full: git(`rev-parse ${gitRef(name)}`), date: git(`log -1 --format=%cI ${gitRef(name)}`), manifest: JSON.parse(raw) });
}
const latest = refs.filter((r) => r.name !== "main").at(-1)!;
const beta = refs.find((r) => r.name === "main")!;
const betaIsLatest = beta.full === latest.full;
const generatedAt = new Date().toISOString();
const committedChannels = show("main", "channels.json");

// ---------- collect: skills (product from manifest; transitional fallback by key) ----------
const productOf = (s: ManifestSkill) => s.product ?? (/^(blog-|instagram-)|^(rules-blog|site-builder)$/.test(s.key) ? "context-sites" : CORE);
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
        const range = prev ? `${gitRef(prev.name)}..${gitRef(r.name)}` : gitRef(r.name);
        const changes = git(`log --format=%s ${range} -- skills/${key}`).split("\n").filter(Boolean).slice(0, 8);
        versions.push({ ref: r.name, version: s.version, date: r.date, sha256: primary.sha256, changes });
      }
    }
    prev = r;
  }
  history.set(key, versions);
}
const skillAt = (ref: string, key: string) => refs.find((r) => r.name === ref)?.manifest.skills.find((s) => s.key === key) ?? null;
const lastSeen = (key: string) => [...refs].reverse().map((r) => r.manifest.skills.find((s) => s.key === key)).find(Boolean)!;
const current = (key: string) => skillAt(latest.name, key) ?? skillAt("main", key) ?? lastSeen(key);   // channel view; retired keys fall back to their last tag
const skillProduct = new Map(skillKeys.map((k) => [k, productOf(current(k))]));
const retired = (beta.manifest.retired ?? []).filter((r) => !skillAt("main", r.key));
const activeKeys = skillKeys.filter((k) => skillAt(latest.name, k) || skillAt("main", k));

// ---------- collect: tool catalogs (registered on main) ----------
const catalogPaths = git(`ls-tree --name-only ${MAIN_REF} mcp/`).split("\n").filter((p) => p.endsWith(".json"));
const servers: Server[] = catalogPaths.map((path) => {
  const cat = JSON.parse(show("main", path)!) as Catalog;
  const key = cat.server.key ?? path.replace(/^mcp\//, "").replace(/\.json$/, "");
  const product = cat.server.product ?? (key === CORE ? CORE : "context-sites");
  return { key, product, cat, path, tools: cat.toolGroups.flatMap((g) => g.tools) };
}).sort((a, b) => (a.product === CORE ? -1 : b.product === CORE ? 1 : a.key.localeCompare(b.key)));
const catalogSha = (path: string) => git(`log -1 --format=%h ${MAIN_REF} -- ${path}`);
const catalogDate = (path: string) => git(`log -1 --format=%cI ${MAIN_REF} -- ${path}`);

// ---------- collect: guides (GUIDE.md at latest tag, else main; transitional: guides/<x>.md) ----------
function loadGuide(product: string): Guide | null {
  const path = product === CORE ? "GUIDE.md" : `extensions/${product}/GUIDE.md`;
  const legacy = product === CORE ? "guides/context.md" : `guides/${product}.md`;
  const pick = (ref: string) => { const a = show(ref, path); if (a) return { raw: a, path }; const b = show(ref, legacy); return b ? { raw: b, path: legacy } : null; };
  const atLatest = pick(latest.name), atMain = pick("main");
  const chosen = atLatest ?? atMain; if (!chosen) return null;
  const ref = atLatest ? latest.name : "main";
  return { product, path: chosen.path, ref, raw: chosen.raw, body: stripFm(chosen.raw), title: fmGet(chosen.raw, "title") || (product === CORE ? "Context — agent guide" : product), description: fmGet(chosen.raw, "description"), updated: fmGet(chosen.raw, "updated"), betaDiffers: !!atMain && !!atLatest && atMain.raw !== atLatest.raw };
}
const products = [CORE, ...[...new Set([...skillProduct.values(), ...servers.map((s) => s.product)])].filter((p) => p !== CORE).sort()];
const guides = new Map(products.map((p) => [p, loadGuide(p)]));
const productTitle = (p: string) => p === CORE ? "Context" : (guides.get(p)?.title.replace(/\s*[—-]\s*agent guide$/i, "") || servers.find((s) => s.product === p)?.cat.server.name || p);
const base = (p: string) => (p === CORE ? "" : `/extensions/${p}`);           // URL prefix for a product's pages
const skillUrl = (key: string, suffix = "") => `${base(skillProduct.get(key) ?? CORE)}/skills/${key}${suffix}`;
const serverUrl = (s: Server, suffix = "") => `${base(s.product)}/tools/${s.key}${suffix}`;

// ---------- layout ----------
const CSS = `
:root{--ink:#1a1a1a;--mute:#6b6b6b;--line:#e3e3e3;--bg:#fff;--soft:#f6f6f6;--accent:#0b6bcb;--ok:#1a7f37;--warn:#9a6700;--code:#f2f2f2}
@media(prefers-color-scheme:dark){:root{--ink:#e8e8e8;--mute:#9a9a9a;--line:#2c2c2c;--bg:#111;--soft:#1a1a1a;--accent:#6cb4ff;--ok:#4ac26b;--warn:#d4a72c;--code:#1e1e1e}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
main{max-width:720px;margin:0 auto;padding:16px 16px 64px}
nav.top{display:flex;gap:14px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line);font-size:14px;max-width:720px;margin:0 auto;flex-wrap:wrap}
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
button.tgl{font:inherit;font-size:13px;border:1px solid var(--line);background:var(--soft);color:var(--ink);border-radius:999px;padding:3px 10px}
dl.params{margin:8px 0 0;padding:0}dl.params dt{margin-top:10px;font-family:ui-monospace,Menlo,monospace;font-weight:600}dl.params dt .ty{font-family:-apple-system,system-ui,sans-serif;font-weight:400;color:var(--mute);font-size:13px}
dl.params dt .req{color:#c33;font-weight:400;font-size:13px}dl.params dd{margin:2px 0 0;font-size:14px;color:var(--mute)}dl.params dl.params{border-left:2px solid var(--line);padding-left:10px;margin-left:2px}
.md img{max-width:100%}.md table{display:block;overflow-x:auto;border-collapse:collapse;font-size:14px}.md th,.md td{border:1px solid var(--line);padding:4px 8px;text-align:left}.md blockquote{margin:8px 0;padding-left:12px;border-left:3px solid var(--line);color:var(--mute)}
.md h1{font-size:24px}.md h2{font-size:19px}.md h3{font-size:16px}
footer{margin-top:40px;font-size:13px;color:var(--mute);border-top:1px solid var(--line);padding-top:12px}
`;
const JS = `document.querySelectorAll('select[data-nav]').forEach(s=>s.addEventListener('change',()=>location.href=s.value));
document.querySelectorAll('.copy button').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.previousElementSibling.textContent);b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1200)}catch{}}));
document.querySelectorAll('button.tgl').forEach(b=>b.addEventListener('click',()=>document.querySelectorAll('details.tool,details.grp').forEach(d=>d.open=b.dataset.open==='1')));
if(location.hash){const d=document.getElementById(location.hash.slice(1));if(d&&d.tagName==='DETAILS'){d.open=true;let p=d.parentElement;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement}d.scrollIntoView()}}`;

function page(title: string, body: string, opts: { alt: string; desc?: string; product?: string }) {
  const p = opts.product ?? CORE; const b = base(p);
  const nav = p === CORE
    ? `<a href="/">Guide</a><a href="/skills">Skills</a><a href="/tools">Tools</a><a href="/extensions">Extensions</a>`
    : `<a href="${b}/">${esc(productTitle(p))}</a><a href="${b}/skills">Skills</a><a href="${b}/tools">Tools</a><a href="/" class="mute">← Context</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — agents.onecontext.me</title>${opts.desc ? `<meta name="description" content="${esc(opts.desc)}">` : ""}<link rel="alternate" type="text/markdown" href="${opts.alt}"><style>${CSS}</style></head><body><nav class="top"><a class="brand" href="/">agents.onecontext.me</a>${nav}<span class="r">${latest.name}</span></nav><main>${body}<footer>Built ${time(generatedAt)} from <a href="https://github.com/${REPO}">${REPO}</a> · latest <code>${latest.name}</code> · beta <code>main@${beta.sha}</code> · <a href="${opts.alt}">this page as markdown</a> · <a href="/llms.txt">llms.txt</a> · <a href="/index.md">index.md</a></footer></main><script>${JS}</script></body></html>`;
}
const copyBox = (cmd: string) => `<div class="copy"><pre><code>${esc(cmd)}</code></pre><button type="button">Copy</button></div>`;
const W = (p: string) => p.replace(/^\//, "");
/** A markdown-first page: the .md is the source, the .html is its rendering. `path` like "" | "/skills" | "/extensions/x/" */
function mdPage(path: string, title: string, md: string, opts: { desc?: string; product?: string } = {}) {
  const dir = path.endsWith("/") || path === "";
  const mdPath = dir ? `${path}index.md` : `${path}.md`;
  const htmlPath = dir ? `${path}index.html` : `${path}.html`;
  write(W(mdPath), md);
  write(W(htmlPath), page(title, `<div class="md">${md2html(md)}</div>`, { alt: mdPath.startsWith("/") ? mdPath : `/${mdPath}`, desc: opts.desc, product: opts.product }));
}

// ---------- skills ----------
function skillPage(key: string, ref: Ref, mode: "latest" | "beta" | "pinned") {
  const s = skillAt(ref.name, key)!; const p = skillProduct.get(key) ?? CORE; const u = (suffix = "") => skillUrl(key, suffix);
  const md = show(ref.name, s.primary) ?? "";
  const versions = history.get(key)!;
  const cur = versions.find((v) => v.ref === ref.name) ?? [...versions].reverse().find((v) => v.version <= s.version)!;
  const latestSkill = skillAt(latest.name, key); const betaSkill = skillAt("main", key);
  const opts = [
    latestSkill ? `<option value="${u()}" ${mode === "latest" ? "selected" : ""}>latest → v${latestSkill.version} (${latest.name})</option>` : "",
    betaSkill && !betaIsLatest ? `<option value="${u("@beta")}" ${mode === "beta" ? "selected" : ""}>beta → v${betaSkill.version} (main@${beta.sha})</option>` : "",
    ...[...versions].reverse().filter((v) => v.ref !== "main").map((v) => `<option value="${u("@" + v.ref)}" ${mode === "pinned" && ref.name === v.ref ? "selected" : ""}>v${v.version} · ${v.ref} · ${v.date.slice(0, 10)}</option>`),
  ].join("");
  const rawPath = mode === "latest" ? u(".md") : u(`@${mode === "beta" ? "beta" : ref.name}.md`);
  const banner = mode === "pinned" && latestSkill && latestSkill.version !== s.version ? `<div class="banner">You are reading <b>v${s.version}</b> (${ref.name}), not the current stable — latest is <a href="${u()}">v${latestSkill.version}</a>.</div>` : mode === "beta" ? `<div class="banner">Beta channel: <code>main</code> at <code>${beta.sha}</code>. Stable is <a href="${u()}">v${latestSkill?.version ?? "—"}</a>.</div>` : "";
  const deps = (s.deps ?? []).length ? `<h2>Depends on</h2><div class="chips">${s.deps!.map((d) => `<a href="${skillUrl(d)}">${esc(d)}</a>`).join("")}</div>` : "";
  const files = s.files.filter((f) => f.src !== s.primary);
  const attach = files.length ? `<h2>Files</h2><ul>${files.map((f) => `<li><a href="https://cdn.jsdelivr.net/gh/${REPO}@${ref.name}/${f.src}"><code>${esc(f.path)}</code></a> <span class="mute">${(f.bytes / 1024).toFixed(1)} KB</span></li>`).join("")}</ul>` : "";
  const changelog = `<h2>Changelog</h2><ul class="list">${[...versions].reverse().map((v) => `<li id="v${v.version}"><div class="t">v${v.version} <span class="badge ${v.ref === latest.name ? "latest" : v.ref === "main" ? "beta" : "pinned"}">${v.ref === "main" ? "beta" : v.ref}</span> <span class="mute" style="font-weight:400;font-size:14px">${time(v.date)}</span></div>${v.changes.length ? `<ul class="mute" style="font-size:14px;margin:4px 0 0 18px;padding:0">${v.changes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : `<div class="mute" style="font-size:14px">First published.</div>`}<div class="m"><a href="${u("@" + (v.ref === "main" ? "beta" : v.ref))}">read</a><a href="${u("@" + (v.ref === "main" ? "beta" : v.ref) + ".md")}">raw .md</a><code>${sha12(v.sha256)}</code></div></li>`).join("")}</ul>`;
  const body = `<h1>${esc(key)} <span class="badge ${mode}">${mode}</span> <span class="badge">${esc(productTitle(p))}</span></h1>
<div class="meta"><span>v${s.version}</span><span>${esc(ref.name === "main" ? `main@${beta.sha}` : ref.name)}</span><span>updated ${time(cur.date)}</span><span>${esc(s.license ?? "")}</span><span>sha256 <code>${sha12(cur.sha256)}</code></span></div>
<p>${esc(s.description)}</p>
${banner}
<p><label class="mute" style="font-size:13px">Version</label><br><select data-nav>${opts}</select></p>
<div class="meta"><a href="${rawPath}">Raw .md</a><a href="${u("/versions.json")}">versions.json</a><a href="${u("@" + (cur.ref === "main" ? "beta" : cur.ref))}">Permalink</a><a href="https://github.com/${REPO}/blob/${ref.name}/${s.primary}">Source</a></div>
<h2>Install</h2>${copyBox(`curl -fsSL ${HOST}${rawPath} --create-dirs -o .claude/skills/${key}/SKILL.md`)}
${deps}${attach}
<h2>SKILL.md</h2><div class="md">${md2html(stripFm(md))}</div>
${changelog}`;
  return page(`${key} v${s.version}`, body, { alt: rawPath, desc: s.description, product: p });
}
for (const key of skillKeys) {
  const versions = history.get(key)!;
  if (skillAt(latest.name, key)) { write(W(skillUrl(key, ".html")), skillPage(key, latest, "latest")); write(W(skillUrl(key, ".md")), show(latest.name, skillAt(latest.name, key)!.primary)!); }
  if (skillAt("main", key)) { write(W(skillUrl(key, "@beta.html")), skillPage(key, beta, "beta")); write(W(skillUrl(key, "@beta.md")), show("main", skillAt("main", key)!.primary)!); }
  for (const v of versions.filter((v) => v.ref !== "main")) {
    const ref = refs.find((r) => r.name === v.ref)!;
    write(W(skillUrl(key, `@${v.ref}.html`)), skillPage(key, ref, v.ref === latest.name ? "latest" : "pinned"));
    write(W(skillUrl(key, `@${v.ref}.md`)), show(v.ref, skillAt(v.ref, key)!.primary)!);
  }
  write(W(skillUrl(key, "/versions.json")), JSON.stringify({ key, product: skillProduct.get(key), generatedAt, latest: skillAt(latest.name, key)?.version ?? null, beta: skillAt("main", key)?.version ?? null, versions: [...versions].reverse().map((v) => ({ version: v.version, ref: v.ref, date: v.date, sha256: v.sha256, url: `${HOST}${skillUrl(key, `@${v.ref === "main" ? "beta" : v.ref}.md`)}`, changes: v.changes })) }, null, 2));
}

const firstSentence = (s: string) => s.split(/(?<=\.)\s/)[0];
const skillRow = (k: string) => { const l = skillAt(latest.name, k), b = skillAt("main", k); return `| [${k}](${HOST}${skillUrl(k)}) | ${l ? `v${l.version}` : "—"} | ${b ? `v${b.version}` : "—"} | ${firstSentence(current(k).description).replace(/\|/g, "\\|")} | [.md](${HOST}${skillUrl(k, ".md")}) |`; };
const skillsTable = (p: string) => { const ks = activeKeys.filter((k) => skillProduct.get(k) === p); return ks.length ? `| Skill | latest | beta | What it is for | Raw |\n|---|---|---|---|---|\n${ks.map(skillRow).join("\n")}` : "_none yet_"; };
const skillsIndexJson = (p: string) => JSON.stringify({ generatedAt, product: p, latest: { ref: latest.name, sha: latest.full, date: latest.date }, beta: { ref: "main", sha: beta.full, date: beta.date }, skills: activeKeys.filter((k) => skillProduct.get(k) === p).map((key) => { const l = skillAt(latest.name, key), b = skillAt("main", key); const c = (l ?? b)!; return { key, product: p, description: c.description, latest: l?.version ?? null, beta: b?.version ?? null, sha256: c.files.find((f) => f.src === c.primary)?.sha256 ?? null, deps: c.deps ?? [], url: `${HOST}${skillUrl(key)}`, raw: `${HOST}${skillUrl(key, ".md")}`, versions: `${HOST}${skillUrl(key, "/versions.json")}` }; }), retired: p === CORE ? retired : [] }, null, 2);
function skillsIndexMd(p: string) {
  const name = productTitle(p); const ks = activeKeys.filter((k) => skillProduct.get(k) === p);
  return `# ${name} skills

${ks.length} skills · latest \`${latest.name}\` (${latest.date.slice(0, 10)}) · beta \`main@${beta.sha}\` (${beta.date.slice(0, 10)})${betaIsLatest ? " — beta is latest" : ""}.
Skills wrap the MCP tools. An agent calls \`setup\` on the server once per session, installs what it lists, and refreshes when \`setup\` reports drift.

Install one: \`curl -fsSL ${HOST}${base(p)}/skills/<key>.md --create-dirs -o .claude/skills/<key>/SKILL.md\` · all: \`npx skills add ${HOST}\`

${skillsTable(p)}

Every version is immutable at \`${base(p)}/skills/<key>@vN.md\`; \`@beta.md\` tracks main. Machine indexes: [index.json](${HOST}${base(p)}/skills/index.json), [channels.json](${HOST}/channels.json), per-skill \`versions.json\`.
${p === CORE && retired.length ? `\nRetired: ${retired.map((r) => `\`${r.key}\`${r.replacedBy ? ` → [${r.replacedBy}](${HOST}${skillUrl(r.replacedBy)})` : ""}`).join(", ")}.\n` : ""}${p === CORE && products.length > 1 ? `\nExtension skills live with their product: ${products.filter((x) => x !== CORE).map((x) => `[${productTitle(x)}](${HOST}${base(x)}/skills)`).join(", ")}.` : ""}`;
}
for (const p of products) {
  mdPage(`${base(p)}/skills`, `${productTitle(p)} skills`, skillsIndexMd(p), { product: p, desc: `Skills for ${productTitle(p)} on the latest and beta channels.` });
  write(W(`${base(p)}/skills/index.json`), skillsIndexJson(p));
}
write("channels.json", committedChannels ?? JSON.stringify({ schema: "context-skills-channels/1", generatedAt, latest: { ref: latest.name, sha: latest.full, date: latest.date }, beta: { ref: "main", sha: beta.full, date: beta.date }, source: { repo: REPO, manifest: `https://cdn.jsdelivr.net/gh/${REPO}@{sha}/manifest.json`, raw: `https://raw.githubusercontent.com/${REPO}/main/channels.json` }, skills: Object.fromEntries(activeKeys.map((key) => [key, { latest: skillAt(latest.name, key)?.version ?? null, beta: skillAt("main", key)?.version ?? null, product: skillProduct.get(key) }])) }, null, 2));

// ---------- tools ----------
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
const toolFlags = (t: Tool) => [t.readOnly ? `<span class="badge ro">read-only</span>` : "", t.destructive ? `<span class="badge danger">destructive</span>` : "", t.idempotent && !t.readOnly ? `<span class="badge">idempotent</span>` : ""].filter(Boolean).join(" ");
const flagWords = (t: Tool) => [t.readOnly ? "read-only" : "", t.destructive ? "destructive" : "", t.idempotent && !t.readOnly ? "idempotent" : ""].filter(Boolean).join(" · ");
function toolBlock(t: Tool) {
  const out = t.outputSchema && Object.keys(t.outputSchema.properties ?? {}).length ? `<details style="border:0"><summary class="mute">Output</summary>${params(t.outputSchema, 1)}</details>` : "";
  return `<details class="tool" id="${esc(t.name)}" open><summary><span class="n">${esc(t.name)}</span> ${toolFlags(t)}<span class="d">${esc(firstSentence(t.description))}</span></summary>${t.title ? `<p><b>${esc(t.title)}</b></p>` : ""}<p>${esc(t.description)}</p>${t.scopes?.length ? `<p class="mute" style="font-size:13px">scopes: ${t.scopes.map((s) => `<code>${esc(s)}</code>`).join(" ")}</p>` : ""}<h3 style="margin-top:12px">Parameters</h3>${params(t.inputSchema)}${out}<p class="mute" style="font-size:13px"><a href="#${esc(t.name)}">#${esc(t.name)}</a></p></details>`;
}
const published = (s: Server) => ({ at: s.cat.server.publishedAt ?? s.cat.server.generatedAt ?? catalogDate(s.path), commit: s.cat.server.sourceCommit ?? "", registered: catalogSha(s.path) });
const serverCard = (s: Server) => s.cat.server.catalogUrl ?? `${new URL(s.cat.server.endpoint).origin}/.well-known/mcp/server-card.json`;
function serverMd(s: Server) {
  const sv = s.cat.server; const pub = published(s);
  const groups = s.cat.toolGroups.map((g) => `## ${g.title} (${g.tools.length}${g.access ? ` · ${g.access}` : ""})\n\n${g.tools.map((t) => `### \`${t.name}\`${flagWords(t) ? ` — ${flagWords(t)}` : ""}\n\n${t.title ? `**${t.title}.** ` : ""}${t.description}${t.scopes?.length ? `\n\nScopes: ${t.scopes.map((x) => `\`${x}\``).join(", ")}` : ""}\n\nInput schema:\n\n\`\`\`json\n${JSON.stringify(t.inputSchema ?? { type: "object", properties: {} }, null, 1)}\n\`\`\`${t.outputSchema && Object.keys(t.outputSchema.properties ?? {}).length ? `\n\nOutput schema:\n\n\`\`\`json\n${JSON.stringify(t.outputSchema, null, 1)}\n\`\`\`` : ""}`).join("\n\n")}`).join("\n\n");
  return `# ${sv.name} — tools

${s.tools.length} tools · contract \`${sv.contractVersion}\` · published ${pub.at.slice(0, 10)}${pub.commit ? ` from \`${pub.commit}\`` : ""} · registered \`${pub.registered}\`

${sv.purpose ?? ""}

Endpoint: \`${sv.endpoint}\`${sv.auth ? ` · auth: ${sv.auth.type}${sv.auth.signIn ? ` (${sv.auth.signIn})` : ""}` : ""}${sv.startingPrompt ? ` · first call: \`setup\` (or say "${sv.startingPrompt}")` : ""}

Machine catalog: [tools.json](${HOST}${serverUrl(s, "/tools.json")}) · live server card: ${serverCard(s)}

${s.cat.connect ? Object.entries(s.cat.connect).map(([h, c]) => `- **${h}**: ${c.startsWith("claude mcp") ? `\`${c}\`` : c}`).join("\n") : ""}
${s.cat.skills?.length ? `\nSkills that wrap this server: ${s.cat.skills.map((k) => `[${k.key}](${HOST}${skillUrl(k.key)}) (${k.role})`).join(", ")}\n` : ""}
${groups}`;
}
function serverHtml(s: Server) {
  const sv = s.cat.server; const pub = published(s);
  const connect = s.cat.connect ? `<h2>Connect</h2>${Object.entries(s.cat.connect).map(([h, c]) => `<p><b>${esc(h)}</b></p>${c.startsWith("claude mcp") ? copyBox(c) : `<p class="mute" style="font-size:14px">${esc(c)}</p>`}`).join("")}` : "";
  const skills = s.cat.skills?.length ? `<h2>Skills that wrap this server</h2><ul>${s.cat.skills.map((k) => `<li><a href="${skillUrl(k.key)}">${esc(k.key)}</a> <span class="badge">${esc(k.role)}</span> <span class="mute">${esc(k.description)}</span></li>`).join("")}</ul>` : "";
  const body = `<h1>${esc(sv.name)} <span class="badge latest">MCP</span> <span class="badge">${esc(productTitle(s.product))}</span></h1>
<div class="meta"><span>${s.tools.length} tools</span><span>contract <code>${esc(sv.contractVersion)}</code></span><span>published ${time(pub.at)}</span>${pub.commit ? `<span>source <code>${esc(pub.commit)}</code></span>` : ""}<span>registered <code>${pub.registered}</code></span></div>
<p>${esc(sv.purpose ?? "")}</p>
${copyBox(sv.endpoint)}
<div class="meta" style="margin-top:8px"><a href="${serverUrl(s, "/tools.json")}">tools.json</a><a href="${serverUrl(s, ".md")}">this page as markdown</a><a href="${esc(serverCard(s))}">live server card</a>${sv.auth ? `<span>auth: ${esc(sv.auth.type)}${sv.auth.signIn ? ` · ${esc(sv.auth.signIn)}` : ""}</span>` : ""}${sv.startingPrompt ? `<span>say: <code>${esc(sv.startingPrompt)}</code></span>` : ""}</div>
${connect}${skills}
<h2>Tools <span class="mute" style="font-weight:400;font-size:14px">${s.tools.length}</span></h2><p class="meta"><button type="button" class="tgl" data-open="0">Collapse all</button><button type="button" class="tgl" data-open="1">Expand all</button><span>tap a group or a tool to fold it</span></p>
${s.cat.toolGroups.map((g) => `<details class="grp" id="group-${esc(g.key)}" open><summary><span class="gt">${esc(g.title)}</span> <span class="mute" style="font-size:13px">${g.tools.length}${g.access ? ` · ${esc(g.access)}` : ""}</span></summary>${g.tools.map(toolBlock).join("")}</details>`).join("")}`;
  return page(`${sv.name} tools`, body, { alt: serverUrl(s, ".md"), desc: sv.purpose, product: s.product });
}
for (const s of servers) {
  write(W(serverUrl(s, ".html")), serverHtml(s));
  write(W(serverUrl(s, ".md")), serverMd(s));
  write(W(serverUrl(s, "/tools.json")), JSON.stringify({ generatedAt, server: { ...s.cat.server, product: s.product, registered: published(s).registered, serverCard: serverCard(s) }, tools: s.tools.map(({ name, title, description, readOnly, destructive, idempotent, scopes, inputSchema, outputSchema }) => ({ name, title, description, readOnly, destructive, idempotent, scopes, inputSchema, outputSchema })) }, null, 2));
}
const serverRow = (s: Server) => { const pub = published(s); return `| [${s.cat.server.name}](${HOST}${serverUrl(s)}) | \`${s.cat.server.endpoint}\` | ${s.cat.server.contractVersion} | ${s.tools.length} | ${pub.at.slice(0, 10)}${pub.commit ? ` · \`${pub.commit}\`` : ""} | [tools.json](${HOST}${serverUrl(s, "/tools.json")}) |`; };
const toolsTable = (p: string) => { const ss = servers.filter((s) => s.product === p); return ss.length ? `| Server | Endpoint | Contract | Tools | Published | Catalog |\n|---|---|---|---|---|---|\n${ss.map(serverRow).join("\n")}` : "_none yet_"; };
function toolsIndexMd(p: string) {
  const ss = servers.filter((s) => s.product === p);
  return `# ${productTitle(p)} tools

MCP servers for ${productTitle(p)}. Each catalog is the server's own \`tools/list\`, registered here when the server deploys — what you read is what is running. Connect the endpoint, call \`setup\` first, then load the skills it lists.

${toolsTable(p)}

${ss.map((s) => `## ${s.cat.server.name}\n\n${s.cat.server.purpose ?? ""}\n\n${s.cat.toolGroups.map((g) => `- **${g.title}** (${g.tools.length}${g.access ? `, ${g.access}` : ""}): ${g.tools.map((t) => `[${t.name}](${HOST}${serverUrl(s)}#${t.name})`).join(", ")}`).join("\n")}`).join("\n\n")}
${p === CORE && products.length > 1 ? `\nExtension servers: ${products.filter((x) => x !== CORE).map((x) => `[${productTitle(x)}](${HOST}${base(x)}/tools)`).join(", ")}.` : ""}`;
}
for (const p of products) {
  mdPage(`${base(p)}/tools`, `${productTitle(p)} tools`, toolsIndexMd(p), { product: p, desc: `MCP servers and tool catalogs for ${productTitle(p)}.` });
  write(W(`${base(p)}/tools/index.json`), JSON.stringify({ generatedAt, product: p, servers: servers.filter((s) => s.product === p).map((s) => ({ key: s.key, product: s.product, name: s.cat.server.name, endpoint: s.cat.server.endpoint, contractVersion: s.cat.server.contractVersion, toolCount: s.tools.length, published: published(s), url: `${HOST}${serverUrl(s)}`, tools: `${HOST}${serverUrl(s, "/tools.json")}`, serverCard: serverCard(s) })) }, null, 2));
}

// ---------- home pages (the Guide + live blocks) ----------
const channelsBlock = () => `**Channels** — latest \`${latest.name}\` (${latest.date.slice(0, 10)}), beta \`main@${beta.sha}\` (${beta.date.slice(0, 10)})${betaIsLatest ? ", identical" : ""}. Resolve at session start via \`setup\`; [channels.json](${HOST}/channels.json).`;
const extensionsBlock = () => products.filter((p) => p !== CORE).map((p) => { const g = guides.get(p); const ss = servers.filter((s) => s.product === p); const ks = activeKeys.filter((k) => skillProduct.get(k) === p); return `- **[${productTitle(p)}](${HOST}${base(p)}/)** — ${g?.description ?? ""} ${ss.length} server${ss.length === 1 ? "" : "s"}, ${ks.length} skills · [guide](${HOST}${base(p)}/index.md) · [skills](${HOST}${base(p)}/skills) · [tools](${HOST}${base(p)}/tools) · [llms.txt](${HOST}${base(p)}/llms.txt)`; }).join("\n") || "_none_";
type LiveName = "channels" | "skills" | "tools" | "extensions";
const liveBlocks = (p: string): Record<LiveName, string> => ({ channels: channelsBlock(), skills: skillsTable(p), tools: toolsTable(p), extensions: p === CORE ? extensionsBlock() : "" });
/** Replace `<!-- live:<name> -->` markers in a Guide; append the unused ones as a Live index. */
function hydrate(md: string, p: string) {
  const blocks = liveBlocks(p); const used = new Set<string>();
  let out = md.replace(/<!--\s*live:(\w+)\s*-->/g, (m, name: string) => { if (name in blocks) { used.add(name); return blocks[name as LiveName]; } return m; });
  const rest = (["channels", "skills", "tools", "extensions"] as LiveName[]).filter((n) => !used.has(n) && blocks[n]);
  if (rest.length) out += `\n\n## Live index\n\n${rest.map((n) => n === "channels" ? blocks.channels : `### ${n[0].toUpperCase() + n.slice(1)}\n\n${blocks[n]}`).join("\n\n")}`;
  return out;
}
function homeMd(p: string) {
  const g = guides.get(p);
  const head = g ? hydrate(g.body, p) : `# ${productTitle(p)} — agent guide\n\n_No GUIDE.md yet._\n${hydrate("", p)}`;
  const foot = `\n\n---\n_${p === CORE ? "This page is the Guide" : `Guide for ${productTitle(p)}`}: \`${g?.path ?? ""}\` at \`${g?.ref ?? ""}\`${g?.betaDiffers ? " (beta on main differs)" : ""} · built ${generatedAt} · [llms.txt](${HOST}${base(p)}/llms.txt) · [index.md](${HOST}${base(p)}/index.md)${p !== CORE ? ` · [Context](${HOST}/)` : ""}_\n`;
  return head + foot;
}
for (const p of products) {
  const g = guides.get(p);
  mdPage(p === CORE ? "" : `${base(p)}/`, g?.title ?? `${productTitle(p)} — agent guide`, homeMd(p), { product: p, desc: g?.description });
}
mdPage("/extensions", "Extensions", `# Extensions\n\nProducts that extend Context. Each has its own Guide, skills and MCP server under \`/extensions/<slug>/\`; approvals for all of them stay in Context.\n\n${extensionsBlock()}\n`, { desc: "Extension products: each with its own guide, skills and tools." });
write("extensions/index.json", JSON.stringify({ generatedAt, extensions: products.filter((p) => p !== CORE).map((p) => ({ slug: p, title: productTitle(p), description: guides.get(p)?.description ?? "", url: `${HOST}${base(p)}/`, guide: `${HOST}${base(p)}/index.md`, skills: `${HOST}${base(p)}/skills/index.json`, tools: `${HOST}${base(p)}/tools/index.json`, llms: `${HOST}${base(p)}/llms.txt` })) }, null, 2));

// ---------- llms.txt / llms-full.txt / .well-known ----------
function llms(p: string) {
  const g = guides.get(p); const ks = activeKeys.filter((k) => skillProduct.get(k) === p); const ss = servers.filter((s) => s.product === p); const b = base(p);
  return `# ${p === CORE ? "agents.onecontext.me" : `${productTitle(p)} (Context extension)`}

> ${g?.description ?? `Agent interface for ${productTitle(p)}: guide, versioned skills (latest ${latest.name} / beta main), and MCP tool catalogs.`}

## Guide
- ${g?.title ?? "Agent guide"}: ${HOST}${b}/index.md

## Skills (latest ${latest.name})
${ks.map((k) => `- ${k}: ${HOST}${skillUrl(k, ".md")}`).join("\n") || "- none"}
- index: ${HOST}${b}/skills/index.json · channels: ${HOST}/channels.json

## Tools
${ss.map((s) => `- ${s.cat.server.name}: ${s.cat.server.endpoint} — catalog ${HOST}${serverUrl(s, "/tools.json")} — docs ${HOST}${serverUrl(s, ".md")}`).join("\n") || "- none"}
${p === CORE ? `\n## Extensions\n${products.filter((x) => x !== CORE).map((x) => `- ${productTitle(x)}: ${HOST}${base(x)}/llms.txt`).join("\n") || "- none"}\n\n## Optional\n- Everything in one file: ${HOST}/llms-full.txt\n- Skill index for installers: ${HOST}/.well-known/skills/index.json\n` : `\n## Optional\n- Context (core): ${HOST}/llms.txt\n`}`;
}
for (const p of products) write(W(`${base(p)}/llms.txt`), llms(p));
write("llms-full.txt", [
  homeMd(CORE),
  ...products.filter((p) => p !== CORE).map((p) => `\n\n---\n\n${homeMd(p)}`),
  ...activeKeys.map((k) => `\n\n---\n\n<!-- skill: ${k} (${skillProduct.get(k)}) v${current(k).version} -->\n\n${stripFm(show(skillAt(latest.name, k) ? latest.name : "main", current(k).primary) ?? "")}`),
  ...servers.map((s) => `\n\n---\n\n## ${s.cat.server.name} tools (${s.tools.length})\n\n${s.cat.toolGroups.map((g) => `- **${g.title}**: ${g.tools.map((t) => `\`${t.name}\``).join(", ")}`).join("\n")}\n\nFull schemas: ${HOST}${serverUrl(s, ".md")}`),
].join(""));
const wellKnown = JSON.stringify({ version: "0.2.0", generatedAt, skills: activeKeys.filter((k) => skillAt(latest.name, k)).map((k) => { const s = skillAt(latest.name, k)!; const f = s.files.find((x) => x.src === s.primary)!; return { name: k, type: "skill-md", description: s.description, url: `${HOST}${skillUrl(k, ".md")}`, digest: `sha256:${f.sha256}`, metadata: { product: skillProduct.get(k), version: s.version } }; }) }, null, 2);
write(".well-known/skills/index.json", wellKnown);
write(".well-known/agent-skills/index.json", wellKnown);

// ---------- vercel.json (redirects keep every v1 URL alive) ----------
const redirects: { source: string; destination: string; permanent: boolean }[] = [
  { source: "/README.md", destination: "/index.md", permanent: true },
  { source: "/guide", destination: "/", permanent: true }, { source: "/guide.md", destination: "/index.md", permanent: true },
  { source: "/guides", destination: "/", permanent: true }, { source: "/guides/index.json", destination: "/extensions/index.json", permanent: true },
  { source: "/mcp", destination: "/tools", permanent: true }, { source: "/mcp.md", destination: "/tools.md", permanent: true }, { source: "/mcp/index.json", destination: "/tools/index.json", permanent: true },
];
for (const p of products) {
  redirects.push({ source: `/guides/${p === CORE ? "context" : p}`, destination: `${base(p)}/`, permanent: true }, { source: `/guides/${p === CORE ? "context" : p}.md`, destination: `${base(p)}/index.md`, permanent: true });
}
for (const s of servers) {
  redirects.push({ source: `/mcp/${s.key}`, destination: serverUrl(s), permanent: true }, { source: `/mcp/${s.key}/tools.json`, destination: serverUrl(s, "/tools.json"), permanent: true });
  if (s.product !== CORE) redirects.push({ source: `/tools/${s.key}`, destination: serverUrl(s), permanent: true }, { source: `/tools/${s.key}.md`, destination: serverUrl(s, ".md"), permanent: true }, { source: `/tools/${s.key}/tools.json`, destination: serverUrl(s, "/tools.json"), permanent: true });
}
for (const k of skillKeys) if (skillProduct.get(k) !== CORE) redirects.push({ source: `/skills/${k}`, destination: skillUrl(k), permanent: true }, { source: `/skills/${k}.md`, destination: skillUrl(k, ".md"), permanent: true }, { source: `/skills/${k}@:ref`, destination: skillUrl(k, "@:ref"), permanent: true }, { source: `/skills/${k}/versions.json`, destination: skillUrl(k, "/versions.json"), permanent: true });
for (const r of retired) if (r.replacedBy) redirects.push({ source: `/skills/${r.key}`, destination: skillUrl(r.replacedBy), permanent: true }, { source: `/skills/${r.key}.md`, destination: skillUrl(r.replacedBy, ".md"), permanent: true });
write("vercel.json", JSON.stringify({ cleanUrls: true, trailingSlash: false, headers: [
  { source: "/(.*)\\.md", headers: [{ key: "Content-Type", value: "text/markdown; charset=utf-8" }, { key: "Access-Control-Allow-Origin", value: "*" }] },
  { source: "/(.*)\\.json", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] },
  { source: "/(.*)llms(.*)\\.txt", headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }, { key: "Access-Control-Allow-Origin", value: "*" }] },
  { source: "/(.*)@v(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
  { source: "/(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=300, must-revalidate" }] },
], redirects }, null, 2));

console.log(`site/: ${activeKeys.length} skills (${products.map((p) => `${p}: ${activeKeys.filter((k) => skillProduct.get(k) === p).length}`).join(", ")}), ${refs.length} refs (latest ${latest.name}, beta main@${beta.sha}), ${servers.length} servers, guides: ${products.map((p) => `${p}=${guides.get(p)?.path ?? "none"}@${guides.get(p)?.ref ?? "-"}`).join(" ")}, ${redirects.length} redirects`);
