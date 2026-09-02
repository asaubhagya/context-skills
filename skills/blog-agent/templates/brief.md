# Context brief — <Brand> Blog

<!-- Show this to the owner before storing. Then:
     send_file {filename: "context-brief.md", title: "Context brief", docKind: "brief", taskId: <tenant epic id>, content: <this file, filled>} -->

**Tenant:** `<slug>` · **Site:** <https://…> · **Date:** <YYYY-MM-DD> · **Host:** <claude-code | chatgpt | claude-ai | codex>

## Goal
<What reaching the end looks like, for whom. Two or three sentences. E.g. "A recurring EN/DE/FR blog and Instagram loop for Meetly that brings privacy-conscious professionals to the App Store, with every piece approved by the founder in Context before it goes live.">

## What · how often · tier
- **WHAT:** <blog + instagram>
- **HOW OFTEN:** <blog Mon/Wed/Fri 22:00 Asia/Singapore · Instagram 4/wk 19:00 America/New_York>
- **TIER:** <hosted — published at <domain shape>, analytics <GA4 id name>, AI-visibility probe on>

## Audience
<personas in one line each; link: Audience & hubs document>

## Inputs
- Site: <url> (palette, fonts, logo fetched → Design tokens)
- Owner's writing: <3–5 URLs> → Brand persona sample paragraph
- Competitors: <names/urls> and what formats they use
- Existing content to refresh: <urls or "none">

## Done when
- <n> pieces published per week per channel at the agreed slots, each `done` in Context with checker verdict + preview attached before review
- Daily brief posted every day on the Daily Brief issue
- Weekly assessment on the Performance Report issue
- <Hosted: domain resolves, sitemap + JSON-LD valid, GA4 receiving>

## Constraints
- Voice: <adjectives> / never <anti-adjectives>
- Claims: <policy; e.g. no HIPAA claims; competitors by facts only>
- Locales: <en master · de full · fr reduced>; EN approval cascades
- Keys by name only: <OPENROUTER_API_KEY, POSTIZ_API_KEY, BLOG_ACCESS_KEY> kept in <KeyVault / host secret store>

## Review gates
- Map + spec: one combined `reviewRequest` (this epic)
- Each publish: `gate:artifact` — checker verdict + rendered preview + models on the issue before `reviewRequest`
- <Anything else the owner asked for>

## Routines (this host)
1. daily-brief 08:00 <tz> — first
2. blog-drafter nightly <time>
3. blog-publisher every 3 h
4. blog-assessment weekly <day time>

## Exclusions
- <what was ruled out — e.g. paid ads, TikTok, English-only comparison pages>
