#!/usr/bin/env -S pnpm tsx
/**
 * build-manifest — walk `skills/**` and emit `manifest.json`, the one file the
 * three Context MCPs (iOS, Web, Blog) and the Skills hub read at a pinned git
 * ref through jsDelivr (`https://cdn.jsdelivr.net/gh/<repo>@<ref>/manifest.json`).
 *
 *   pnpm build-manifest            # rewrite manifest.json
 *   pnpm build-manifest --check    # exit 1 if manifest.json is stale (CI)
 *   pnpm build-manifest --ref v3   # stamp the ref you are about to tag
 *
 * Per skill: key = directory name (`skills/<key>/` or `skills/third-party/<key>/`),
 * kind (`rules` for `rules` and `rules-*`, else `skill`), title/description/
 * version/deps/license/source_url from SKILL.md frontmatter, and `files[]` =
 * SKILL.md first, then every file under the skill directory (subfolders
 * included), then any `attach:` entries — paths relative to the skill dir
 * (`path`, what a host installs) plus the repo path to fetch (`src`), a
 * sha256 and the byte size. Loaders verify each downloaded file against
 * `sha256` before serving it. `depends` must resolve to a skill in this tree.
 *
 * Deterministic: same tree → same manifest (except `generatedAt`, which
 * `--check` ignores). No network, no database.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, walkSkillDirs, KEY_RE, MAX_FILE_BYTES } from "./check-skills";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, "skills");
const MANIFEST = join(ROOT, "manifest.json");

export type ManifestFile = { path: string; src: string; sha256: string; bytes: number };
export type ManifestSkill = {
  key: string;
  kind: "rules" | "skill";
  title: string;
  description: string;
  version: number;
  deps: string[];
  license: string | null;
  source_url: string | null;
  primary: string;
  files: ManifestFile[];
};
export type Manifest = { generatedAt: string; ref?: string; skills: ManifestSkill[] };

const argv = process.argv.slice(2);
const check = argv.includes("--check");
const refIdx = argv.indexOf("--ref");
const ref = refIdx >= 0 ? argv[refIdx + 1] : undefined;

const toPosix = (p: string) => p.split(sep).join("/");

function readChecked(abs: string): Buffer {
  const buf = readFileSync(abs);
  if (buf.byteLength === 0 || buf.byteLength > MAX_FILE_BYTES) {
    throw new Error(`${toPosix(relative(ROOT, abs))}: ${buf.byteLength} bytes (must be 1..${MAX_FILE_BYTES})`);
  }
  return buf;
}

function fileEntry(path: string, abs: string): ManifestFile {
  const buf = readChecked(abs);
  return { path, src: toPosix(relative(ROOT, abs)), sha256: createHash("sha256").update(buf).digest("hex"), bytes: buf.byteLength };
}

/** Every regular file under `dir`, depth-first, sorted, as skill-relative posix paths. */
function walkFiles(dir: string, base = dir, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkFiles(full, base, acc);
    else acc.push(toPosix(relative(base, full)));
  }
  return acc;
}

export function collect(): ManifestSkill[] {
  const skills: ManifestSkill[] = [];
  for (const dir of walkSkillDirs(SKILLS_DIR).sort()) {
    const key = dir.split(sep).pop()!;
    if (!KEY_RE.test(key)) throw new Error(`skill directory name is not a valid key: ${key}`);
    const skillMd = join(dir, "SKILL.md");
    const fm = parseFrontmatter(readFileSync(skillMd, "utf8"));
    if (fm.name && fm.name !== key) throw new Error(`${key}/SKILL.md: frontmatter name "${fm.name}" must equal the directory name`);
    if (!fm.description) throw new Error(`${key}/SKILL.md: frontmatter description is required`);
    const version = fm.version === undefined ? 1 : Number(fm.version);
    if (!Number.isSafeInteger(version) || version < 1) throw new Error(`${key}/SKILL.md: version must be a positive integer`);

    const files: ManifestFile[] = [fileEntry("SKILL.md", skillMd)];
    for (const rel of walkFiles(dir)) {
      if (rel === "SKILL.md") continue;
      files.push(fileEntry(rel, join(dir, rel)));
    }
    for (const rel of fm.attach) {
      const abs = resolve(dir, rel);
      if (!abs.startsWith(SKILLS_DIR + sep)) throw new Error(`${key}: attach path escapes skills/: ${rel}`);
      if (!existsSync(abs)) throw new Error(`${key}: attach path does not exist: ${rel}`);
      // Inside the skill dir → already walked (keep its relative path);
      // outside (e.g. ../spec-template.md) → installed under its basename.
      const inside = abs.startsWith(dir + sep);
      const path = inside ? toPosix(relative(dir, abs)) : rel.split("/").pop()!;
      if (files.some((f) => f.path === path)) continue;
      files.push(fileEntry(path, abs));
    }

    skills.push({
      key,
      kind: key === "rules" || key.startsWith("rules-") ? "rules" : "skill",
      title: fm.name ?? key,
      description: fm.description,
      version,
      deps: fm.depends,
      license: fm.license ?? null,
      source_url: fm.source ?? null,
      primary: toPosix(relative(ROOT, skillMd)),
      files,
    });
  }
  const keys = new Set(skills.map((s) => s.key));
  for (const s of skills) {
    for (const dep of s.deps) if (!keys.has(dep)) throw new Error(`${s.key} depends on unknown skill "${dep}"`);
  }
  return skills;
}

function main() {
  const manifest: Manifest = { generatedAt: new Date().toISOString(), ...(ref ? { ref } : {}), skills: collect() };
  const next = JSON.stringify(manifest, null, 2) + "\n";
  if (check) {
    if (!existsSync(MANIFEST)) { console.error("manifest.json is missing — run `pnpm build-manifest`"); process.exit(1); }
    const cur = JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest;
    const strip = (m: Manifest) => JSON.stringify({ ...m, generatedAt: undefined, ref: undefined });
    if (strip(cur) !== strip(manifest)) {
      console.error("manifest.json is stale — run `pnpm build-manifest` and commit the result");
      process.exit(1);
    }
    console.log(`manifest.json is up to date (${manifest.skills.length} skills)`);
    return;
  }
  writeFileSync(MANIFEST, next);
  console.log(`manifest.json: ${manifest.skills.length} skills, ${manifest.skills.reduce((n, s) => n + s.files.length, 0)} files${ref ? `, ref ${ref}` : ""}`);
}

main();
