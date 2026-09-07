# Context plugin skills

The source of truth is https://agents.onecontext.me. The product is **Context**;
Nomi is its agent. Download the stable skill ZIPs from the
[Context skills page](https://agents.onecontext.me/skills) and upload those exact
files to the existing Context listing at https://platform.openai.com/plugins.

## Public downloads

Every site build packages `product=context` skills and their transitive dependency
closure from the full stable SHA in canonical `channels.json`. The build fails
if that SHA differs from the stable tag the site advertises. Manifest, skill
files, guide and license all come from that commit, never from beta or working
files. Dependencies are included even when their product differs; unrelated
Context Sites skills are excluded.

Each skill ZIP contains one skill folder with SKILL.md, every manifest reference
file, GUIDE.md and LICENSE. Third-party skills also carry attribution and their
pinned source URLs. The ZIPs are ready for individual portal upload.

- `/downloads/context/latest/context.zip` (and each other selected skill ZIP)
  redirects to the current stable snapshot.
- `/downloads/context/<full-sha>/<skill>.zip` identifies exact immutable bytes.
- `provenance.json` and `SHA256SUMS` are available in both locations.

The stable directory is linked from `/skills`, including every dependency ZIP.
The existing build-and-deploy flow publishes these files with the website;
there is no separate GitHub artifact or publication workflow. SHA downloads are
cached as immutable; latest aliases revalidate. The current release's SHA path
is emitted in each build; archive downloaded packages if long-term retention of
older releases is needed.

## Local validation

```sh
pnpm test-plugin-package
pnpm build-site
pnpm check-site-links
```

Full Git history and current channel refs are required. To preview the current
canonical remote main without changing the local checkout, run
`SITE_BETA_REF=origin/main pnpm build-site` after fetching origin.

For a standalone package, use a new or empty output directory:

```sh
pnpm package-context-plugin --source-ref origin/main --out /tmp/context-plugin-upload
cd /tmp/context-plugin-upload
shasum -a 256 -c SHA256SUMS
```

The packager rejects hash/size mismatches, unsafe paths, symlinks, missing
files/dependencies, dependency cycles, destination collisions and unknown
licenses/attributions. ZIP ordering, metadata and timestamps are fixed; entries
are stored without compression for reproducibility across Python hosts.
Provenance records input hashes, skill versions and archive hashes. The same
stable commit produces byte-identical ZIPs.

## Submission

Download all individual ZIPs shown on the skills page and verify the checksum
file. Upload those exact ZIPs, scan, and review the existing Context listing.
Use **Set up Context** as the first conversation prompt. Reviewer notes should
identify the stable SHA and tested OAuth, web-only Shared workspace, and
optional iPhone pairing flows.

Skills are snapshotted at the portal scan. Promoting a new stable release updates
the public downloads but does not replace the published plugin snapshot. Submit
updated skills through the portal when needed; approval/publication remains a
portal operation. No supported public publication API is configured. See
[OpenAI submission guidance](https://developers.openai.com/plugins/deploy/submission).
