# Context plugin release

The source of truth is the repository served at https://agents.onecontext.me.
The plugin is **Context**; Nomi is the agent. Bundle a snapshot of the stable
channel, not beta or a mixture of current working files and released files.

## Prepare the upload

After the release has been promoted to `latest` and the site deployed, run:

```sh
pnpm test-plugin-package
pnpm package-context-plugin --out /tmp/context-plugin-upload
cd /tmp/context-plugin-upload
shasum -a 256 -c SHA256SUMS
```

Use a new or empty output directory. The packager reads `channels.json` at HEAD
(or `--source-ref <commit>`), resolves its full `latest.sha`, and reads the
manifest, all skill files, GUIDE.md and LICENSE from that exact Git commit.
Fetch full repository history first if the stable commit is not present locally.
It never downloads mutable URLs or incorporates uncommitted skill edits.

Each `product=context` skill is selected, together with its transitive dependency
closure. Context Sites is excluded unless explicitly required by a selected
skill dependency. Each ZIP has one skill directory containing SKILL.md, every
manifest file at its declared installation path, GUIDE.md, and LICENSE.
Third-party skills also contain attribution and pinned source URLs. Unknown
licenses/attributions fail for review. Missing dependencies/files, cycles,
symlinks, unsafe paths, destination collisions and hash/size mismatches fail.

ZIP entry order, metadata and timestamps are fixed. `provenance.json` records
the stable commit, skill versions, manifest input hashes, guide/license hashes
and archive hashes; `SHA256SUMS` covers every upload ZIP and provenance.
The same stable commit produces byte-identical output on supported Python 3
hosts, independent of local ZIP compression libraries (entries are stored).

## Automated release preparation

The existing serialized deploy pipeline packages only after an actual successful
Vercel deployment. It resolves the stable SHA and checks for a nonexpired Actions
artifact named `context-plugin-<full-sha>` before building. Main/beta changes do
not produce new packages when stable is unchanged. Retries reuse the retained
artifact; expired/deleted artifacts may be rebuilt identically. Retention is 90
days, so download the submission evidence for longer-term retention.

The packaging stage does not push commits/tags, modify channels, or trigger
another deploy. It needs `actions:read` for deduplication; artifact upload uses
the workflow's Actions runtime token. Missing deploy credentials skip packaging
along with deployment. A failed packaging stage fails the workflow visibly.

## Portal handoff and review

Download the artifact, verify SHA256SUMS, and upload **all individual skill ZIPs**
to the existing Context listing at https://platform.openai.com/plugins. The
outer GitHub artifact ZIP is a transport container, not a skill upload. Use
“Set up Context” as the first conversation prompt and validate it against the
bundled onboarding instructions. Confirm the MCP endpoint, OAuth login, shared
workspace flow without an iPhone, and optional iPhone pairing separately.
Include the tested steps and the exact stable SHA in reviewer notes.

Skills are snapshotted when the portal scans the plugin. A later stable promotion
does not update an already published snapshot: upload and scan the replacement
skills and submit a new version for review. Review the scan results and the
listing before submitting. Track approval and publish through the portal when
its approved state allows it. No verified supported public scan/submission/
publication API is configured, so CI automates preparation, **not publication**.
See [OpenAI submission guidance](https://developers.openai.com/plugins/deploy/submission).
