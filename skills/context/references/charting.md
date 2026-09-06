# Charting — turn a job into a Context map

A **Context map** is one Epic with the Issues under it: the work, the rules,
the gates and the Artifacts. What makes it repeatable is the *guidance* it
records — goal, rules, which skills/tools/models, where the human approves —
plus the trace after the run (`work_stats`) and every Artifact. Who did
which Issue is not prescribed; it is recorded as it happens.

Load this reference when the user asks to get started, to plan or track work
in Context, or when a task needs a plan. It inherits `SKILL.md` and uses
Matt Pocock's `grill-me` (interview) and `wayfinder` (charting) **verbatim**
— `setup` lists both; load them before you start. This file adds only the
Context-specific opening, the map shape and the tool calls.

## Safety boundary

Before collecting details, tell the user not to provide credentials,
confidential employer information, health or payment data, regulated
records, or anything they are not authorized to share. If such material
appears, do not store or repeat it; ask for a redacted brief. Keys are
referred to by **name and scope** only. This is a conversation, not a form:
ask in chat and wait for real replies. Never end a message without saying
the next step — what you will do now, or what the user must do and where.

## Opening

Call `setup` first if you have not this session. If the user has not yet
said what they want, open with ≤ 10 lines that do exactly five things:

1. One line on what you do: plan the job with them, chart it into a map they
   can review and share, then work it across whichever agents they use, with
   their approval at the points they choose.
2. Recommend the strongest brain for the planning, phrased for this host
   (ChatGPT → "switch to a Thinking model"; claude.ai → "strongest model,
   extended thinking on"; Claude Code / Cursor / Codex → "strongest model,
   highest reasoning"). The interview is where judgement matters.
3. Ask: **"What do you want to do today?"**
4. Five one-line examples across domains (ship a feature · research a topic
   and draft a carousel · produce a 15-second ad · write and schedule an
   email campaign · compare vendors and recommend one).
5. Ask what "done" looks like, in their words.

If the job is already stated, skip the opening but still give item 2 in one
line. Then **Round 0**: state in one line what you understand you are doing
and for whom; if that line would be a guess, ask it as one question first.

## Rounds — `grill-me`

Run the interview exactly as `grill-me` says: model the plan as a design
tree, ask the **whole frontier at once** as numbered `❓ **Qn** - **title**`
blocks with a `➡️` recommendation each (numbering never restarts), wait,
fold the answers in, recompute, ask again; stop only when the frontier is
empty. Two Context additions: a skipped question keeps its recommendation,
and "go with your recommendations" settles only that round. **Facts are
fetched, decisions are asked** — what a skill contains, what a tool can do,
what the repo looks like: read, search or run it yourself and state it.

**Round 1 — how you want to work** (always these five, before the job):

- **Q1 Depth**: newcomer (explain choices) or experienced (brief)? ➡️ brief.
- **Q2 Gates**: beyond the one combined map + spec approval, stop at each
  artifact · final only · nowhere else? ➡️ map + spec, then final.
- **Q3 Agents, models, budget**: which agents; strongest or cheapest that
  works? ➡️ whatever they have; strongest for judgement, cheaper for bulk.
  Guidance only — whoever picks up a ticket decides.
- **Q4 Skills**: already using skills/rules for this? Should I look for
  best-in-class ones? ➡️ I search, fetch and store them on the map.
- **Q5 Your own guidelines**: brand/design guides, templates, examples?
  ➡️ none yet; sensible defaults, say which.

The answers become the map's Rules — keep them short.

**Research before Round 2.** If the host can browse, spend a few minutes and
summarize in ≤ 8 lines with sources: how practitioners do this job, 2–3
candidate skills (skills.sh, github.com/mattpocock/skills,
github.com/anthropics/skills), typical models/tools, a rough cost/time band.
Fetch every skill you intend to recommend and read it — never guess a raw
path: list the repo directory, fetch the exact `SKILL.md`, record the URL.

**Round 2 — the toolbox.** As facts, in ≤ 10 lines: this host's built-ins
and what it *cannot* do (ChatGPT's python sandbox has no network egress, so
it can never upload a binary itself; claude.ai: the connected MCPs and
skills you can see; coding hosts: local tools, shell, installed skills);
external options worth the money with rough cost and the key each needs
(name + scope); the skills you found (source, licence, one line). Then one
❓ per deliverable — which tool, which model, which thinking level, at what
cost — with a ➡️ each. The answers land in `Tools & models:` under
`## Rules` and as rows in the decision record.

**Rounds 3–N — the job.** Audience, scope, structure, style, constraints,
success criteria, sequencing. At least two rounds; keep going until the
frontier is empty. If the job is bigger than one session and the way is
foggy, switch to `wayfinder`'s **Chart the map** mode: name the destination,
map the frontier breadth-first, ticket only what you can specify now, keep
the rest in *Not yet specified*.

## Chart the plan

Search public maps first — `search_context {query}` → `get_epic` — an owner
may have shared something close enough to reuse. Then:

1. `create_epic {space, title, goal}` — `goal` is markdown with exactly
   these headings, short:

   ```
   ## Goal
   <the destination, for whom; two or three sentences>
   ## Done when
   <the outputs, and what proves they are good enough>
   ## Milestones
   1. Map + spec approved (gate: plan)
   2. <checkpoint, in order — name the gate if the human approves here>
   3. <the last one is Done when, approved (gate: final)>
   ## Rules
   <one block of short bullets: depth · gates · skills · tools & models per
   deliverable (tool · model · thinking · cost) · the user's standing rules ·
   distilled brand/design rules · assets attached · rough cost/time · always:
   "no invented anecdotes, numbers or quotes — only facts from the attached
   briefs; say 'I' only for things the user told you">
   ## Out of scope
   - <what was explicitly ruled out>
   ```

2. Store what the user gave you on the Epic with `attach_artifact {target:
   {kind: "epic", id}, title, mime, content}` (binaries via the upload plan)
   and distill each into 3–8 bullets under `## Rules`. Every skill the user
   accepted → one Artifact titled `<skill name>` with a header block
   (`Source:` · `Licence:` · `Fetched:` · `Why:`); store only permissively
   licensed skills (MIT/Apache/CC-BY), link the rest.
3. Attach the records, before any ticket — never a verbatim transcript:
   **Context brief** (goal, audience, done criteria, constraints, inputs,
   preferences, gates, exclusions — show it to the user first), **Decision
   record** (one table: `| # | decision | options | chosen | why | from |`,
   `from` = the `Qn`, `default`, or `user`), and for code work a **Spec**
   following `spec-template.md`.
4. Tickets: `create_issues {parent_id: <epic>, issues: [...]}` — ≤ 2 per
   call today; 5–12 tickets total, one agent session each; every ticket
   carries `title`, `description` (the work and the guidance: which stored
   skill, which tool/model/thinking from the Rules, the rules that bite, and
   that it ships a mini-spec, acceptance tests and a release doc),
   `acceptance_criteria[]`, and one label `gate:<artifact|final|none>`. Add
   `skill:<name>` only if an Artifact titled `<name>` is attached to the
   Epic. Leave `assignee` empty — never assign or pin models at chart time;
   the one exception is work only the human can do: `assignee: "me"`.
   Decomposition is child Issues, never a steps list.
5. `blocked_by` only for real dependencies, wired in a second pass once ids
   exist: `update_issues {issues: [{issue_id, blocked_by: [...],
   expected_version}]}`.
6. **One combined gate.** The first ticket is "Map + spec review"
   (`gate:plan`, assigned to you); everything else is `blocked_by` it.
   `post_comment {target, body: "Map and spec charted — please review
   both"}`, `update_issues {… state: "in_review"}`, then one `request_review
   {target: {kind: "issue", id}, reason, blocking: true}` — `reason` ≤ 500
   chars: `<goal> · done when: <one line> · <n> milestones · <n> tickets ·
   <n> decisions · skills stored: <names or none> · tools/models: <one line>
   · est. <cost / time>`. Never raise a second request for the spec alone.
7. `get_epic` to confirm the shape, then give the user the Epic link
   (`https://app.onecontext.me/e/<id>`) and the next step. Mind the Epic cap
   (`setup` reports it) — finish or delete before starting a new one.

## Steering mid-run

Any change of direction after charting is a new decision: `revise_artifact
{artifact_id, expected_revision_id, content}` on the Decision record (add a
row `from: user`, mark the superseded row), `update_epic {epic_id, goal}`
with the amended `## Rules`, and say in the ticket's next comment which row
changed. The record is what the next run reads; keep it true.

## Working the map

`SKILL.md` §"Working an Issue" is the loop. Charting-specific additions:

- Pick from the unblocked frontier: `list_issues {parent_id: <epic>}` and
  skip anything `blocked`. Parallel mode: one subagent per ready ticket, each
  in its own task-owned worktree; you keep integration and verification.
- Gate `none` → `complete_issues` directly. Gate `artifact`/`final` → the
  server rejects `in_review` until at least one Artifact is attached.
- Visual deliverables (carousel, slides, layouts, charts) also get one
  self-contained preview (`<name> preview.html`, `mime: "text/html"`, ≤ 512
  KB, inline CSS/SVG or `data:` images, no external assets). The final
  deliverable is the file the user will actually use; name what you attached
  in the same `post_comment`.
- When you cannot upload a binary (no network from the sandbox — always
  true on ChatGPT — or > 25 MB): attach a small preview, give the file to the
  user in chat, and post the hand-off in the same comment, one line per file:
  `Drop <filename> (<size>) on ticket #n → <url> → Artifacts`. Then wait on
  `get_changes` for the artifact event before requesting the final review.
- When every ticket is done the Epic completes by itself. Attach the overall
  release doc to the Epic (linking each ticket's release doc) and close with
  the Epic link. New maps are private; sharing is changed only in the app.

## Returning users

"Where are we?" / "continue": `get_epic` plus `list_issues {parent_id}`;
summarize in ≤ 5 lines (done · in review · blocked · next), then continue the
next ready ticket or say exactly what you are waiting on and where.

## Conventions

- Reference tickets as `#n` wrapped in their name, never a bare id.
- One `request_review` per decision point; the map + spec gate is the one
  designed exception.
- Model ids in `work_stats` are lower-case (`gpt-5`, not `GPT-5`).
- If a write rejects a rule (Epic cap, orphan ticket, gate needs an
  Artifact), read the message — it names the rule and how to unblock it.
