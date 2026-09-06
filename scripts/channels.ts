#!/usr/bin/env -S pnpm tsx
/**
 * channels — the two moving channels of this repo, derived from git (§3 of the
 * agents v2 contract). `latest` = newest immutable `vN` tag, `beta` = head of
 * `main`. Git is the source; `channels.json` is a committed projection of it
 * that consumers read from raw.githubusercontent.com.
 *
 *   pnpm channels write            # derive channels.json from the tags + main
 *   pnpm channels check [--soft]   # tags and channels.json agree (CI gate)
 *   pnpm channels move [--push]    # re-point the `latest`/`beta` tags (CI only)
 *
 * Rules:
 *   - `vN` tags are immutable and never touched here.
 *   - `latest` := commit of the newest `vN`. `beta` := head of `main` — more
 *     precisely the newest commit on main that is not a `chore(channels):`
 *     commit, because the channels.json commit cannot contain its own sha.
 *   - `move --push` force-pushes ONLY `refs/tags/latest` and `refs/tags/beta`.
 *   - `check` fails (exit 1) when the `latest` tag is not the newest `vN`, the
 *     `beta` tag is not main's content head, or the committed channels.json
 *     differs from what `write` would produce (generatedAt ignored).
 *     `--soft` turns drift and missing moving tags into warnings (exit 0) —
 *     used on pull requests and on runs that race the tag mover; malformed
 *     channels.json still fails.
 *
 * `main` is read as `origin/main` when that ref exists (what CI and consumers
 * see), else the local `main`. Needs the full history + tags (fetch-depth 0).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHANNELS = join(ROOT, "channels.json");
const REPO = "asaubhagya/context-skills";
const SCHEMA = "context-skills-channels/1";
const MOVING = ["latest", "beta"] as const;
const CHANNELS_COMMIT_PREFIX = "chore(channels):";

type Channel = { ref: string; sha: string; date: string };
type SkillChannels = { latest: number | null; beta: number | null; product: string | null };
export type Channels = {
  schema: string;
  generatedAt: string;
  latest: Channel;
  beta: Channel;
  source: { repo: string; manifest: string; raw: string };
  skills: Record<string, SkillChannels>;
};
type ManifestSkill = { key: string; version: number; product?: string };

function git(args: string[], opts: { quiet?: boolean } = {}): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", opts.quiet ? "ignore" : "inherit"] }).trim();
}
function tryGit(args: string[]): string | null {
  try { return git(args, { quiet: true }); } catch { return null; }
}
const commitOf = (ref: string) => tryGit(["rev-parse", "--verify", `${ref}^{commit}`]);
const dateOf = (sha: string) => git(["log", "-1", "--format=%cI", sha]);
const subjectOf = (sha: string) => git(["log", "-1", "--format=%s", sha]);
const short = (sha: string) => sha.slice(0, 7);

/** Newest immutable `vN` tag by number, or null when there are none. */
export function newestVersionTag(): string | null {
  const tags = git(["tag", "--list", "v*"]).split("\n").filter((t) => /^v\d+$/.test(t));
  tags.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  return tags.at(-1) ?? null;
}

/** `origin/main` when fetched, else local `main`. */
export function mainRef(): string {
  if (commitOf("origin/main")) return "origin/main";
  if (commitOf("main")) return "main";
  throw new Error("neither origin/main nor main exists — fetch the repo with full history (fetch-depth 0)");
}

/** Newest commit reachable from `ref` (first-parent) that is not a channels.json commit. */
export function contentHead(ref: string): string {
  let sha = commitOf(ref);
  if (!sha) throw new Error(`cannot resolve ${ref}`);
  for (let i = 0; i < 50 && subjectOf(sha).startsWith(CHANNELS_COMMIT_PREFIX); i++) {
    const parent = commitOf(`${sha}^`);
    if (!parent) break;
    sha = parent;
  }
  return sha;
}

function manifestAt(sha: string): ManifestSkill[] {
  const raw = tryGit(["show", `${sha}:manifest.json`]);
  if (!raw) return [];
  return (JSON.parse(raw) as { skills?: ManifestSkill[] }).skills ?? [];
}

/** The channels.json this tree's git state implies. */
export function derive(): Channels {
  const latestTag = newestVersionTag();
  if (!latestTag) throw new Error("no vN tags found — cannot derive `latest`");
  const latestSha = commitOf(latestTag)!;
  const betaSha = contentHead(mainRef());

  const latestSkills = manifestAt(latestSha);
  const betaSkills = manifestAt(betaSha);
  const keys = [...new Set([...latestSkills, ...betaSkills].map((s) => s.key))].sort();
  const skills: Record<string, SkillChannels> = {};
  for (const key of keys) {
    const l = latestSkills.find((s) => s.key === key);
    const b = betaSkills.find((s) => s.key === key);
    skills[key] = { latest: l?.version ?? null, beta: b?.version ?? null, product: b?.product ?? l?.product ?? null };
  }

  return {
    schema: SCHEMA,
    generatedAt: new Date().toISOString(),
    latest: { ref: latestTag, sha: latestSha, date: dateOf(latestSha) },
    beta: { ref: "main", sha: betaSha, date: dateOf(betaSha) },
    source: {
      repo: REPO,
      manifest: `https://cdn.jsdelivr.net/gh/${REPO}@{sha}/manifest.json`,
      raw: `https://raw.githubusercontent.com/${REPO}/main/channels.json`,
    },
    skills,
  };
}

const render = (c: Channels) => JSON.stringify(c, null, 2) + "\n";
const comparable = (c: Channels) => JSON.stringify({ ...c, generatedAt: undefined });

function readCommitted(): Channels {
  if (!existsSync(CHANNELS)) throw new Error("channels.json is missing — run `pnpm channels write` and commit it");
  let parsed: Channels;
  try { parsed = JSON.parse(readFileSync(CHANNELS, "utf8")); } catch (e) { throw new Error(`channels.json is not valid JSON: ${(e as Error).message}`); }
  if (parsed.schema !== SCHEMA) throw new Error(`channels.json schema "${parsed.schema}" must be "${SCHEMA}"`);
  for (const name of MOVING) {
    const ch = parsed[name];
    if (!ch || !/^[0-9a-f]{40}$/.test(ch.sha ?? "")) throw new Error(`channels.json ${name}.sha must be a full 40-hex commit sha`);
  }
  if (!/^v\d+$/.test(parsed.latest.ref)) throw new Error(`channels.json latest.ref "${parsed.latest.ref}" must be a vN tag`);
  if (parsed.beta.ref !== "main") throw new Error(`channels.json beta.ref must be "main"`);
  if (!parsed.skills || typeof parsed.skills !== "object") throw new Error("channels.json skills must be an object");
  return parsed;
}

function cmdWrite() {
  const c = derive();
  writeFileSync(CHANNELS, render(c));
  console.log(`channels.json: latest ${c.latest.ref} (${short(c.latest.sha)}), beta main@${short(c.beta.sha)}, ${Object.keys(c.skills).length} skills`);
}

function cmdCheck(soft: boolean) {
  const problems: string[] = [];   // drift: exit 1 unless --soft
  const committed = readCommitted(); // structural: always exit 1 (throws)
  const want = derive();

  const latestTagSha = commitOf("latest");
  if (!latestTagSha) problems.push(`tag \`latest\` does not exist — CI creates it on the next push to main (\`pnpm channels move --push\`); locally run \`git fetch --tags origin\``);
  else if (latestTagSha !== want.latest.sha) problems.push(`tag \`latest\` points at ${short(latestTagSha)} but the newest vN is ${want.latest.ref} at ${short(want.latest.sha)}`);

  const betaTagSha = commitOf("beta");
  if (!betaTagSha) problems.push(`tag \`beta\` does not exist — CI creates it on the next push to main`);
  else if (betaTagSha !== want.beta.sha) problems.push(`tag \`beta\` points at ${short(betaTagSha)} but ${mainRef()}'s content head is ${short(want.beta.sha)}`);

  if (comparable(committed) !== comparable(want)) {
    const diffs: string[] = [];
    for (const name of MOVING) {
      if (committed[name].ref !== want[name].ref || committed[name].sha !== want[name].sha) diffs.push(`${name}: committed ${committed[name].ref}@${short(committed[name].sha)}, expected ${want[name].ref}@${short(want[name].sha)}`);
    }
    if (JSON.stringify(committed.skills) !== JSON.stringify(want.skills)) diffs.push("skills map differs");
    if (JSON.stringify(committed.source) !== JSON.stringify(want.source)) diffs.push("source block differs");
    problems.push(`channels.json is stale (${diffs.join("; ") || "field order or dates differ"}) — run \`pnpm channels write\``);
  }

  if (problems.length === 0) {
    console.log(`check-channels: OK — latest ${want.latest.ref}@${short(want.latest.sha)}, beta main@${short(want.beta.sha)}`);
    return;
  }
  for (const p of problems) console[soft ? "warn" : "error"](`${soft ? "::warning::" : ""}check-channels: ${p}`);
  if (!soft) process.exit(1);
  console.log("check-channels (--soft): drift reported as warnings only");
}

function cmdMove(push: boolean) {
  const want = derive();
  const targets: Record<(typeof MOVING)[number], string> = { latest: want.latest.sha, beta: want.beta.sha };
  for (const name of MOVING) {
    const before = commitOf(name);
    if (before === targets[name]) { console.log(`${name}: unchanged at ${short(before)}`); continue; }
    git(["tag", "--force", name, targets[name]]);
    console.log(`${name}: ${before ? short(before) : "(new)"} -> ${short(targets[name])}${name === "latest" ? ` (${want.latest.ref})` : ""}`);
  }
  if (!push) { console.log("local only — pass --push to force-push refs/tags/latest and refs/tags/beta"); return; }
  // Only these two refspecs are ever forced; vN tags are never in this command.
  git(["push", "--force", "origin", ...MOVING.map((n) => `refs/tags/${n}:refs/tags/${n}`)]);
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  try {
    switch (cmd) {
      case "write": return cmdWrite();
      case "check": return cmdCheck(rest.includes("--soft"));
      case "move": return cmdMove(rest.includes("--push"));
      default:
        console.error("usage: channels <write | check [--soft] | move [--push]>");
        process.exit(2);
    }
  } catch (e) {
    console.error(`channels ${cmd}: ${(e as Error).message}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
