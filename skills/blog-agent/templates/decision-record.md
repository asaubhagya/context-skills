# Decision record — <Brand> Blog

<!-- send_file {filename: "decision-record.md", title: "Decision record", docKind: "decisions", taskId: <tenant epic id>, content: <this file, filled>}
     Later steers: update_document with a new revision — add a row `from: user`, mark the replaced row superseded. -->

**Tenant:** `<slug>` · **Date:** <YYYY-MM-DD> · **Rounds:** 0–4

One row per settled question. `from` is the `Qn` it came from, `default` if
the owner never answered it (recommendation kept), or `user` for an
unprompted steer. Never a row without an `options` column — the reader must
see what was *not* chosen.

| # | decision | options | chosen | why | from |
|---|---|---|---|---|---|
| 1 | WHAT | blog · site · instagram · combinations | <blog + instagram> | <…> | Q1 |
| 2 | HOW OFTEN | once · recurring (cadence per channel) | <recurring: blog 3/wk, IG 4/wk> | <…> | Q2 |
| 3 | OUTPUT tier | artifact · review & self-publish · hosted | <hosted> | <…> | Q3 |
| 4 | Host for the loop | this host · Claude Code · Codex | <…> | <what this host can/cannot do — fact> | Q4 |
| 5 | Locales | <en only · en+de · en+de+fr(reduced)> | <…> | <…> | Q<n> |
| 6 | Byline | named human (Person) · organisation | <…> | <…> | Q<n> |
| 7 | Voice adjectives | <proposed set> | <…> | <…> | Q<n> |
| 8 | Competitor stance | name · never name · facts only | <…> | <…> | Q<n> |
| 9 | Claims policy | <…> | <no HIPAA claims> | <…> | Q<n> |
| 10 | Design style | <proposed from site> | <paper-sketch> | <…> | Q<n> |
| 11 | Hubs | <4–6 proposed> | <…> | <…> | Q<n> |
| 12 | Cadence & slots & timezone | <…> | <…> | <…> | Q<n> |
| 13 | Routines this host installs | daily brief · drafter · publisher · assessment | <…> | daily brief first (rules-blog §7) | Q<n> |
| 14 | Key names | `OPENROUTER_API_KEY` · `POSTIZ_API_KEY` · `BLOG_ACCESS_KEY` | <names + where kept> | names only, never values | Q<n> |
| 15 | Domain shape (Hosted) | `/blog` proxy · `blog.` CNAME · `<slug>.sites.onecontext.me` | <…> | <…> | Q<n> |
| 16 | Analytics (Hosted) | BYO GA4 · none | <…> | <…> | Q<n> |
| 17 | Search Console grant (Hosted) | grant · skip | <…> | <…> | Q<n> |
| 18 | Per-locale review | cascade from EN · review each | <cascade> | rules-blog §5 | Q<n> |
| 19 | Gates | artifact · final | <artifact per publish> | <…> | Q<n> |
| 20 | Models | strongest for drafts & checker · cheaper for bulk | <…> | <…> | Q<n> |
