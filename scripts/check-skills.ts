#!/usr/bin/env -S pnpm tsx
/**
 * check-skills — frontmatter + body sanity for every `skills/**\/SKILL.md`:
 *   - directory name is a valid key (^[a-z0-9][a-z0-9_-]{0,63}$)
 *   - top-level frontmatter keys ⊆ {name, description, license, compatibility,
 *     metadata, allowed-tools} (the Agent Skills spec); everything of ours
 *     lives under `metadata:` (product, version, depends, attach, source…)
 *   - `name` present and equal to the directory name; `description` present
 *   - `metadata.product` present and one of `context` | `context-sites`
 *   - `metadata.version`, when present, is a positive integer
 *   - every `metadata.depends` entry resolves to a skill in this tree
 *     (first-party under skills/<key>/ or third-party under skills/third-party/<key>/)
 *   - every `metadata.attach` entry exists and stays inside skills/
 *   - the body (after the frontmatter) is < 500 lines and < 20,000 chars
 *   - every file is 1..256 KB
 *
 * Exit 1 with one line per problem. No database, no network.
 *
 *   pnpm check-skills
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const KEY_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
export const MAX_FILE_BYTES = 256 * 1024;
export const MAX_BODY_LINES = 500;
export const MAX_BODY_CHARS = 20_000;
export const SPEC_KEYS = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
export const PRODUCTS = new Set(["context", "context-sites"]);

export type Frontmatter = {
  /** Top-level keys, in file order (checked against SPEC_KEYS). */
  keys: string[];
  name?: string;
  description?: string;
  license?: string;
  /** Everything under `metadata:`; lists (`[a, b]`) become string[]. */
  metadata: Record<string, string | string[]>;
  // Convenience views of `metadata`.
  product?: string;
  version?: string;
  source?: string;
  depends: string[];
  attach: string[];
};

/** Split a SKILL.md into its frontmatter block (without the fences) and the body after it. */
export function splitFrontmatter(markdown: string): { frontmatter: string | null; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(markdown);
  return m ? { frontmatter: m[1], body: markdown.slice(m[0].length) } : { frontmatter: null, body: markdown };
}

const unquote = (s: string) => s.replace(/^['"]|['"]$/g, "");
const parseValue = (s: string): string | string[] => {
  const list = /^\[(.*)\]$/.exec(s);
  return list ? list[1].split(",").map((x) => unquote(x.trim())).filter(Boolean) : unquote(s);
};

/**
 * Minimal YAML-ish frontmatter reader: top-level scalars, `>-` folded blocks,
 * `[a, b]` lists, and one nested map (`metadata:` with indented children).
 */
export function parseFrontmatter(markdown: string): Frontmatter {
  const out: Frontmatter = { keys: [], metadata: {}, depends: [], attach: [] };
  const { frontmatter } = splitFrontmatter(markdown);
  if (frontmatter === null) return out;
  const lines = frontmatter.split("\n");
  let inMetadata = false;
  for (let i = 0; i < lines.length; i++) {
    const kv = /^(\s*)([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    const indent = kv[1].length;
    const key = kv[2];
    let value = kv[3].trim();
    if (value === ">-" || value === ">" || value === "|" || value === "|-") {
      const parts: string[] = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1]) && (lines[i + 1].match(/^\s*/)![0].length > indent)) parts.push(lines[++i].trim());
      value = parts.join(" ");
    }
    if (indent === 0) {
      out.keys.push(key);
      inMetadata = key === "metadata";
      if (key === "name" || key === "description" || key === "license") out[key] = unquote(value);
    } else if (inMetadata) {
      out.metadata[key] = parseValue(value);
    }
  }
  const str = (k: string) => (typeof out.metadata[k] === "string" ? (out.metadata[k] as string) : undefined);
  const list = (k: string) => (Array.isArray(out.metadata[k]) ? (out.metadata[k] as string[]) : []);
  out.product = str("product");
  out.version = str("version");
  out.source = str("source");
  out.depends = list("depends");
  out.attach = list("attach");
  return out;
}

/** Directories containing a SKILL.md (a skill never nests another skill). */
export function walkSkillDirs(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (existsSync(join(full, "SKILL.md"))) acc.push(full);
    else walkSkillDirs(full, acc);
  }
  return acc;
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function main() {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const SKILLS_DIR = join(ROOT, "skills");
  const dirs = walkSkillDirs(SKILLS_DIR).sort();
  const keys = new Set(dirs.map((d) => d.split(sep).pop()!));
  const problems: string[] = [];

  for (const dir of dirs) {
    const key = dir.split(sep).pop()!;
    const file = relative(ROOT, join(dir, "SKILL.md"));
    if (!KEY_RE.test(key)) problems.push(`${file}: directory name "${key}" is not a valid key`);
    const markdown = readFileSync(join(dir, "SKILL.md"), "utf8");
    const fm = parseFrontmatter(markdown);
    for (const k of fm.keys) if (!SPEC_KEYS.has(k)) problems.push(`${file}: top-level frontmatter key "${k}" is not in the Agent Skills spec — move it under metadata`);
    if (!fm.name) problems.push(`${file}: frontmatter name is missing`);
    else if (fm.name !== key) problems.push(`${file}: frontmatter name "${fm.name}" must equal directory name "${key}"`);
    if (!fm.description) problems.push(`${file}: frontmatter description is missing`);
    if (!fm.product) problems.push(`${file}: metadata.product is missing (context | context-sites)`);
    else if (!PRODUCTS.has(fm.product)) problems.push(`${file}: metadata.product "${fm.product}" must be one of ${[...PRODUCTS].join(" | ")}`);
    if (fm.version !== undefined && !(/^[1-9][0-9]*$/.test(fm.version))) problems.push(`${file}: metadata.version "${fm.version}" must be a positive integer`);
    for (const dep of fm.depends) if (!keys.has(dep)) problems.push(`${file}: depends on unknown skill "${dep}"`);
    for (const rel of fm.attach) {
      const abs = resolve(dir, rel);
      if (!abs.startsWith(SKILLS_DIR + sep)) problems.push(`${file}: attach path escapes skills/: ${rel}`);
      else if (!existsSync(abs)) problems.push(`${file}: attach path does not exist: ${rel}`);
    }
    const { body } = splitFrontmatter(markdown);
    const bodyLines = body.split("\n").length;
    if (bodyLines >= MAX_BODY_LINES) problems.push(`${file}: body is ${bodyLines} lines (must be < ${MAX_BODY_LINES})`);
    if (body.length >= MAX_BODY_CHARS) problems.push(`${file}: body is ${body.length} chars (must be < ${MAX_BODY_CHARS})`);
    for (const f of walkFiles(dir)) {
      const bytes = statSync(f).size;
      if (bytes === 0 || bytes > MAX_FILE_BYTES) problems.push(`${relative(ROOT, f)}: ${bytes} bytes (must be 1..${MAX_FILE_BYTES})`);
    }
  }

  if (problems.length > 0) {
    for (const p of problems) console.error(p);
    process.exit(1);
  }
  console.log(`check-skills: ${dirs.length} skills OK (${[...keys].sort().join(", ")})`);
}

// Run only as a script (build-manifest imports the helpers).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
