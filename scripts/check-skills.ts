#!/usr/bin/env -S pnpm tsx
/**
 * check-skills — frontmatter sanity for every `skills/**\/SKILL.md`:
 *   - directory name is a valid key (^[a-z0-9][a-z0-9_-]{0,63}$)
 *   - `name` present and equal to the directory name
 *   - `description` present
 *   - `version`, when present, is a positive integer
 *   - every `depends` entry resolves to a skill in this tree
 *     (first-party under skills/<key>/ or third-party under skills/third-party/<key>/)
 *   - every `attach` entry exists and stays inside skills/
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

export type Frontmatter = {
  name?: string;
  description?: string;
  version?: string;
  license?: string;
  source?: string;
  depends: string[];
  attach: string[];
};

/** Minimal YAML-ish frontmatter reader: scalars, `>-` folded blocks, `[a, b]` lists. */
export function parseFrontmatter(markdown: string): Frontmatter {
  const out: Frontmatter = { depends: [], attach: [] };
  const m = /^---\n([\s\S]*?)\n---\n/.exec(markdown);
  if (!m) return out;
  const lines = m[1].split("\n");
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2].trim();
    if (value === ">-" || value === ">" || value === "|" || value === "|-") {
      const parts: string[] = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
      value = parts.join(" ");
    }
    if (key === "depends" || key === "attach") {
      const list = /^\[(.*)\]$/.exec(value);
      out[key] = list ? list[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean) : [];
    } else if (key === "name" || key === "description" || key === "license" || key === "source" || key === "version") {
      out[key] = value.replace(/^['"]|['"]$/g, "");
    }
  }
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
    const fm = parseFrontmatter(readFileSync(join(dir, "SKILL.md"), "utf8"));
    if (!fm.name) problems.push(`${file}: frontmatter name is missing`);
    else if (fm.name !== key) problems.push(`${file}: frontmatter name "${fm.name}" must equal directory name "${key}"`);
    if (!fm.description) problems.push(`${file}: frontmatter description is missing`);
    if (fm.version !== undefined && !(/^[1-9][0-9]*$/.test(fm.version))) problems.push(`${file}: version "${fm.version}" must be a positive integer`);
    for (const dep of fm.depends) if (!keys.has(dep)) problems.push(`${file}: depends on unknown skill "${dep}"`);
    for (const rel of fm.attach) {
      const abs = resolve(dir, rel);
      if (!abs.startsWith(SKILLS_DIR + sep)) problems.push(`${file}: attach path escapes skills/: ${rel}`);
      else if (!existsSync(abs)) problems.push(`${file}: attach path does not exist: ${rel}`);
    }
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
