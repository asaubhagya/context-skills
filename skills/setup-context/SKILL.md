---
name: setup-context
description: >-
  Chart a piece of work as a Context map (an Epic plus linked Issues) on
  Context, then work it to done with review gates. Use when the user asks to
  get started, to plan or track work in Context, or when a task needs a plan.
depends: [context, rules, wayfinder, grill-me]
license: MIT
---

# Setup Context

You are the agent working through Context — a tracker built for agent work:
agents write, the human reviews at https://app.onecontext.me (or in the
Context iOS app). This skill turns one job into a **Context map** that is
repeatable. A Context map is one Epic with a set of Issues under it: the work
to be done, the rules, the approvals and the artifacts. What makes it
repeatable is the *guidance* it records — the goal, the rules, which skills,
tools and models to use, at what level the human approves — plus the
aggregate picture after the run (cost, tokens, which models did the work)
and every Artifact. Who did which Issue, in what order, is not prescribed:
that is the orchestrating agent's call and is recorded as it happens. The
next person can open the map and run the same job their way.

This skill inherits `context` (the interface) and `rules` (the Context
harness), and uses Matt Pocock's `grill-me` and `wayfinder` **verbatim** for
the interview and the charting. Load all of them before you start; this
file only adds the Context-specific opening, the artifact templates and the
tool calls.

Credit: inspired by Matt Pocock's wayfinder/grilling skills (MIT,
github.com/mattpocock/skills); an independent rewrite, formerly published as
`context-plan`. His skills work with Context as-is.

## Safety boundary

Before collecting details, tell the user not to provide credentials,
confidential employer information, health or payment data, regulated records,
or anything they are not authorized to share. If such material appears, do
not store or repeat it; ask for a redacted, non-sensitive brief instead.
Context stores only the briefs, decisions, tickets, and artifacts explicitly
sent through its tools. Keys are referred to by **name and scope** only.

This is a conversation, not a form. Ask in this chat and wait for real
replies. Nothing here requires writing files. **Never end a message without
telling the user the next step** — what you will do now, or what they must
do and where (with the link).

## Opening

Call `start_context` first if you have not this session. Then, if the user
has not yet said what they want, open with a short message that does exactly
five things, in this order:

1. Introduce yourself in one line: you plan a job with them, chart it into a
   Context map they can review and share, then work it across whichever
   agents they use — with their approval at the points they choose.
2. Recommend the strongest brain for the planning, in one line, phrased for
   this host: ChatGPT → "switch this chat to a Thinking model"; claude.ai →
   "pick the strongest model and turn on extended thinking"; Claude Code /
   Cursor / Codex → "use your strongest model and highest reasoning level
   for this conversation". The interview is where judgement matters most;
   the tickets can run on cheaper models later.
3. Ask: **"What do you want to do today?"**
4. Offer five one-line examples across domains, e.g. ship a feature
   end-to-end · research a topic and draft a LinkedIn carousel · produce a
   15-second ad · write and schedule an email campaign · compare vendors
   and recommend one.
5. Ask what "done" looks like for them — the goal, in their words.

Keep it to ~10 lines. If the user already stated the job, skip the opening
but still give the model/thinking recommendation (item 2) in one line
before Round 0.

## Round 0: one line

State in one line what you understand you're doing and for whom, from what
the user said. If that line would be a guess, ask it as a single question
and wait before Round 1.

## How every round works — `grill-me`

Run the interview exactly as `grill-me` says: model the plan as a design
tree, ask the **whole frontier at once** as numbered `❓ **Qn** - **title**`
blocks with a `➡️` recommendation each (numbering continues across rounds,
never restarts), wait for the reply, fold the answers in, recompute the
frontier, ask again. Stop only when the frontier is empty. Two Context
additions:

- A skipped question keeps its recommendation. "Go with your
  recommendations" settles **only the questions in this round**.
- Round 1 is preferences, Round 2 is the toolbox, then at least two rounds
  on the job itself before you chart.

Facts are never questions: what a skill contains, what a tool can do, what
the repo looks like, what a format's constraints are — read, search, fetch
or run it yourself and state the result. Only judgement calls reach the
user.

## Round 1: how you want to work

Before any question about the job itself, ask the same five preference
topics as the round's whole frontier:

❓ **Q1** - **Depth**: New to this, or experienced? I'll explain choices
for a newcomer, or stay brief for an expert.
➡️ experienced, brief.

❓ **Q2** - **Gates**: Beyond the one combined map + spec approval, where do
you want to stop and approve: each artifact · final only · nowhere else?
➡️ map + spec, then final.

❓ **Q3** - **Agents, models, budget**: Which agents will you use, and
strongest model or cheapest that works?
➡️ whatever you have (this chat, Claude Code, Cursor, OpenCode,
ChatGPT…); strongest for judgement calls, cheaper for bulk. Guidance
only — whoever picks up a ticket decides.

❓ **Q4** - **Skills**: Do you already use skills or rules for this
(SKILL.md/AGENTS.md)? Should I look for best-in-class ones?
➡️ I search, fetch and store them on the map; you choose.

❓ **Q5** - **Your own guidelines**: Brand or design guidelines,
templates, your own skills or rules, examples you like? Upload or paste
them — I keep the originals on the map and distill them into its rules.
➡️ none yet; sensible defaults, say which.

Wait for the answers. They become the map's Rules — keep them short.

## Research before you ask about the job

If your host can browse, spend a few minutes before Round 2 and summarize
in ≤ 8 lines with sources: how practitioners do this job now; 2–3 candidate
skills (search skills.sh, github.com/mattpocock/skills, github.com/anthropics/skills
and awesome-lists); which models/tools are typically used; a rough
cost/time band. Use this to shape recommendations — don't lecture. If you
cannot browse, say so in one line and rely on what you know (state how
current it is).

Fetch every skill you intend to recommend now (see Conventions) and read
it, so you can say what it does in one line; you store it at chart time.
Inventory this host's toolbox at the same time — it is a fact, not a
question (next section).

## Round 2: the toolbox

Before asking about the job, establish what can do the work. First, as
facts, list in ≤ 10 lines:

- **This host's built-ins** — ChatGPT: image generation, python sandbox
  (PDF/PPTX/CSV, charts), browsing, canvas — but the python sandbox has no
  network egress (verified 2026-08-30), so it can never upload a binary
  itself; claude.ai: the connected MCP servers and skills you can see
  (name them), artifacts, web search; Claude Code / Cursor / Codex: local
  tools, installed skills, connected MCPs, shell. Say plainly what you
  *cannot* do here (e.g. "this host can't attach binaries to Context —
  I'll use the upload route or tell you what to drop where").
- **External options** worth the money for this job — e.g. Higgsfield or
  Midjourney for images/video, Canva for layouts, ElevenLabs for voice, a
  specialist API — with a rough cost each. Name the key each one needs
  (name + scope only) and ask where the user keeps it.
- **Skills** you found and read (source, licence, one line on what each
  does).

Then ask the frontier: for **each deliverable** the job produces, one ❓
question — which tool, which model, which thinking level, at what cost —
with your ➡️ recommendation:

❓ **Q6** - **Slide images**: generate the 8 slide visuals with this
host's image generation, Higgsfield (≈$0.10/image, stronger typography),
or you in Canva?
➡️ Built-in image generation — free here, fine for flat illustrations;
Higgsfield if the first pass looks generic.

The answers land in two places at chart time: a `Tools & models:` line
under `## Rules` (per deliverable — tool · model · thinking · cost) and
rows in the decision record.

## Rounds 3–N: the job itself

Now the design questions: audience, scope, structure, style, constraints,
success criteria, sequencing — whatever this job's tree contains. Ask at
least two rounds, however few questions remain; keep going until the
frontier is empty. Never ask what you can find out yourself.

If the job is bigger than one session can hold and the way is still foggy,
switch to `wayfinder`'s **Chart the map** mode: name the destination, map
the frontier breadth-first, and ticket only what you can specify now; the
rest goes to *Not yet specified*. The map you create below is that
wayfinder map.

## Chart the plan

Once the frontier is empty:

1. `create_epic` with a short title, and this `description` (markdown,
   exactly these five headings — the same shape on every map so a reader
   always knows where the goal, the finish line, the checkpoints and the
   rules are; keep it short):

   ```
   ## Goal
   <the destination — what reaching the end looks like, for whom; two or three sentences>

   ## Done when
   <the outputs, and what proves they're good enough>

   ## Milestones
   1. Map + spec approved (gate: plan)
   2. <checkpoint on the way, in order — name the gate if the human approves here>
   3. <the last one is Done when, approved (gate: final)>

   ## Rules
   <one block, short bullets: depth (newcomer/experienced) · gates (where the human approves) · skills to use · tools & models guidance by kind of work · the user's standing rules · distilled brand/design/template rules from their uploads · assets attached · rough cost/time · Tools & models: <per deliverable — tool · model · thinking · cost> · always include: "no invented anecdotes, numbers or quotes — only facts from the attached briefs; say 'I' only for things the user told you">

   ## Out of scope
   - <what was explicitly ruled out>
   ```

2. Store what the user gave you: each upload/paste → `attach_artifact
   {parent_id: <epic>, title, content, docKind: "<brand-guide | design-guide
   | template | example | brief | repo-notes>"}` (binaries via the upload
   plan `attach_artifact` returns, see "Artifacts back to Context"). Then
   **distill** each into 3–8 short bullets under `## Rules`; the original
   stays attached for reference. Every skill you recommended and the user
   accepted → `attach_artifact {parent_id: <epic>, title: "<skill name>",
   docKind: "skill", content}` with a header block first: `Source: <url>` ·
   `Licence: <licence>` · `Fetched: <date>` · `Why: <one line>`. Only
   permissively licensed skills (MIT/Apache/CC-BY) are stored; otherwise
   link them in the description. The user's own skill files are stored as
   `docKind: "skill"` too.
3. Attach the records to the epic, before any ticket. Do **not** store a
   verbatim conversation transcript:
   - `attach_artifact {parent_id: <epic>, title: "Context brief", docKind:
     "brief", content}` — an approved, concise brief covering goal,
     audience, done criteria, constraints, inputs, preferences, review
     gates, and exclusions. Show it to the user before storing it.
   - `attach_artifact {parent_id: <epic>, title: "Decision record", docKind:
     "decisions", content}` — one markdown table, one row per settled
     question: `| # | decision | options | chosen | why | from |`, where
     `from` is the `Qn` it came from, `default` if the user never answered
     it, or `user` for an unprompted steer. Include the toolbox rows.
   - For code work, `attach_artifact {parent_id: <epic>, title: "Spec",
     docKind: "spec", content}` following `spec-template.md` (code layout,
     NFRs, runbook — every section present).
4. The tickets are the charted path between the milestones.
   `create_issues {parent_id: <epic>, issues: [...]}` — one entry per
   ticket, each with `title`, `description` (the work and the guidance:
   which stored skill to load, which tool/model/thinking from the Rules,
   the rules that bite here, and the reminder that the ticket ships a
   mini-spec, acceptance tests and a release doc), `acceptance_criteria`
   (5–12 tickets total, one agent session each), and:
   - one label `gate:<artifact|final|none>` — the level at which the human
     approves this ticket's output. Add `skill:<name>` **only if an
     Artifact titled `<name>` with `docKind: "skill"` is attached to the
     epic** (step 2); otherwise the description says `Skill: built-in —
     none`. **Do not assign tickets or pin models at chart time** — leave
     `assignee` empty; whoever claims the ticket records who it is and what
     it ran on (`workStats`). The one exception is work the human must do
     themselves: `assignee: "me"`. Decomposition is child Issues
     (`create_issues {parent_id: <this issue>}`), never a `steps` list.
   - `blocked_by: [issueId]` only for real dependencies — never to impose
     an order of your own. Wire these in a second pass, once every ticket
     has an id (`update_issues {ids: [id], blocked_by: [...]}`).
5. **One combined gate.** The first ticket is "Map + spec review"
   (`gate:plan`, assigned to you); everything else is `blocked_by` it.
   Right after charting: `post_comment {parent_id: <review issue>, body:
   "Map and spec charted — please review both"}`, `update_issues {ids:
   [<review issue>], state: "in_review"}`, then `request_review {parent_id:
   <review issue>, reason}` where `reason` (≤ 500 chars) is a real summary
   in this order: `<goal, one line> · done when: <one line> · <n>
   milestones · <n> tickets · <n> decisions · skills stored: <names or
   none> · tools/models: <one line> · est. <cost / time>`. Hand the user
   the epic `url`. This is the only `request_review` for the plan; never
   raise a second one for the spec alone.
6. Re-read the epic with `get_epic` to confirm the shape, then report the
   epic's link (`https://app.onecontext.me/e/<id>`) and the next step.

Remember the hard cap (2 active epics, 5 total) — finish or delete before
starting a new one.

## When the user steers mid-run

Any change of direction after charting ("make it 6 slides", "drop the
video") is a new decision: `revise_artifact` the Decision record with a
new revision — add a row with `from: user` and mark the row it replaces as
superseded — `update_epic {id, description}` with the amended `## Rules`,
and say in the ticket's next update which row changed. The record is what
the next run reads; keep it true.

## Work the tickets

1. `list_issues {parent_id: <epic>, ready: true}` — the frontier of
   unblocked work. Pick one you're suited to (the map's Rules and the
   ticket's guidance tell you which skill/model fits). **Parallel** mode:
   spin one subagent per ready ticket, each in its own task-owned worktree,
   and keep integration and verification yourself. **Single** mode: one
   ticket, start to finish. The split between agents is yours.
2. Claim it as yourself: `update_issues {ids: [id], assignee:
   "agent:<harness>", state: "in_progress"}` — `<harness>` is what you are:
   `chatgpt`, `claude-ai`, `claude-code`, `cursor`, `codex`, `opencode`,
   `gemini`, or another lower-case host name.
3. Do the work with the skills the ticket names. Post progress with
   `post_comment {parent_id: id, body}` as you go. **Every intermediate and
   final output goes back to Context, attached to this ticket** — see
   "Artifacts back to Context" — before you ask for review. At minimum:
   `Mini-spec` (`docKind: "spec"`), `Acceptance tests` (`docKind: "tests"`,
   each item with how it was verified) and `Release` (`docKind: "release"`).
   If the ticket produced a skill, also `Benchmark` (`docKind:
   "benchmark"`).
4. Mark acceptance criteria passed — `update_issues {ids: [id],
   acceptance_criteria: [{text, passed: true}]}` — then move to review when
   the ticket's gate says so: `claim_issue {id, evidence}` →
   `update_issues {ids: [id], state: "in_review"}` → `request_review
   {parent_id: id, reason}`. Gate `none` → `complete_issues` directly.
5. Wait for the decision with `get_changes {cursor, waitMs: 25000}` (the
   only event channel — no SSE). On a decision event, `get_issue`:
   - `approved` → the ticket is `done`; move to the next ready ticket.
     Where the harness requires independent verification, route
     `verify_issue` to a **different** principal before treating it as
     trustworthy-done.
   - `changes_requested` → it is back in `in_progress`; read the note,
     address it, request review again.
   If the host can't hold a long poll, fall back to `get_issue` every 5 s up
   to 10 times, then stop and tell the user you're waiting and where to
   approve.
6. **Report who did it on every update that completes a unit of work**:
   `workStats: {harness, model, role, thinking, tokensIn, tokensOut,
   costUsd, durationSec, skills: [names], estimated?}` — `harness` is what
   you *are* (`chatgpt`, `claude-ai`, `claude-code`, `opencode`, …) even
   when several agents share one account; `model` is the exact id you ran
   on, **lower-case**; `role` is `driver` for the agent orchestrating the
   map (it charted it or holds the conversation with the user) and
   `worker` for an agent doing one ticket; `thinking` is the reasoning
   level as this host names it (`low` / `medium` / `high` / `max`, or a
   host name like `thinking`, `instant`, `extended`). Example:
   `{"harness":"chatgpt","model":"gpt-5","role":"driver","thinking":"thinking","tokensIn":42000,"tokensOut":9000,"costUsd":0.6,"durationSec":1500,"skills":["linkedin-carousel"],"estimated":true}`
   If you don't know exact numbers, estimate and add `estimated: true`.
   Never omit `harness`, `model` or `role`.
7. Handing a ticket to another agent (your choice, or the user's), or
   stopping for any reason: post the handoff comment `rules` prescribes
   (goal · repo · worktree · done · remaining · next action) with
   `post_comment`, clear or reset `assignee`, and tell the user which agent
   to open and what to say.
8. When every ticket is done or canceled the epic's status becomes `done`
   by itself (derived, never set directly). Attach the **overall release
   doc** to the epic (`docKind: "release"`, linking each ticket's release
   doc) and close with the epic link — its Overview now shows the whole
   run: total cost, tokens and time, which models and agents did the work,
   the gates the human took. New maps are private; the owner may make a
   map public or private in Context Web. Never change sharing through MCP
   tools.

## Artifacts back to Context

The reviewer approves what they can see on the ticket — never something
that only exists in this chat.

- **Everything goes back, to its ticket**: drafts, briefs, prompts, data,
  intermediate renders, the final file — `parent_id` = the ticket that made
  it. The server rejects `in_review` on a ticket gated `artifact` or
  `final` until at least one Artifact is attached to it.
- **Text** (markdown, HTML, JSON, CSV — ≤ 512 KB): `attach_artifact
  {title, content, parent_id, docKind}`.
- **Binary** (PDF, PNG, PPTX, MP4… ≤ 25 MB): never put file bytes or
  base64 into tool arguments. `attach_artifact {filename, size, sha256,
  contentType}` returns an upload plan — one `PUT` of the raw bytes to
  `uploadUrl` (header `content-type`) → `POST completeUrl` with
  `{filename, title?, parent_id, docKind?}`. Try this first whenever your
  sandbox has network (Claude Code, Codex, Cursor). Finish before
  `expiresAt`. **ChatGPT's python sandbox has no network egress** (verified
  2026-08-30 — DNS fails for both the Supabase upload host and this app):
  never attempt the raw `PUT` there, and never burn a turn checking — go
  straight to the fallback below.
- **If you cannot upload** (no network from the sandbox — always true on
  ChatGPT — or the file is > 25 MB): attach a small self-contained
  `preview.html` via `attach_artifact` (≤ 512 KB: slide text + layout,
  images only as tiny `data:` URIs or omitted, `docKind: "preview"`) so the
  reviewer sees something on the ticket now, give the real file to the
  user in chat, and post the exact hand-off in that same `post_comment`,
  one line per file: `Drop <filename> (<size>) on ticket #n → <ticket url>
  → Artifacts`. The ticket page has a drop zone. Then wait on `get_changes`
  for an artifact-attached event on this ticket before requesting the
  final review — the server rejects `in_review` on a `gate:final`/
  `gate:artifact` ticket with no Artifact attached.
- **Visual deliverables get a preview** (carousel, slides, ad frames,
  layouts, charts): also attach `title: "<name> preview.html"`, `mime:
  "text/html"`, `docKind: "preview"` — one self-contained page ≤ 512 KB:
  inline CSS, inline SVG or `data:` images (downscaled to fit), no
  external assets, no scripts that fetch — so the reviewer sees the thing
  on the ticket, not a filename.
- The **final deliverable** (the file the user will actually use — the PDF,
  the post, the memo) is attached with `docKind: "deliverable"`; the map's
  Overview highlights it as the Output.
- Name what you attached, by title, in the same `post_comment`.

## Returning users

If the user comes back mid-run ("where are we?", "continue"): `list_issues
{ready: true}` plus `get_epic` on the epic; summarize state in ≤ 5 lines
(done · in review · blocked · next), then either continue the next ready
ticket or say exactly what you're waiting on and where.

Search public maps before charting from scratch — an owner may have shared
something close enough to reuse (`search_context {query}` → `get_epic` the
hit → read its Rules/skills as your starting point).

## Conventions

- Reference tickets in prose as their `#n` ticket number, wrapped in their
  name (wayfinder: refer by name, never a bare id).
- One `request_review` per decision point — don't batch decisions; the map +
  spec gate is the one exception, by design.
- Model ids in `workStats` are always lower-case (`gpt-5`, not `GPT-5`).
- Fetching a skill: never guess a raw-file path. List the repository (its
  page or `api.github.com/repos/<owner>/<repo>/contents/<dir>`), then fetch
  the exact `SKILL.md`, and record the URL you actually fetched in the
  header.
- If a write rejects a hard rule (Epic limits, orphan ticket, bad shape),
  read the message — it names the rule and how to unblock it.
