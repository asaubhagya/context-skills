# Page brief — <title>

<!-- send_file {filename: "page-brief.md", title: "Page brief", docKind: "brief", taskId: <page issue id>, content: <this file, filled>} -->

**Tenant:** `<slug>` · **Page:** `<page slug>` · **Locale:** `<en>` · **Will live at:** <https://host/mount/slug> · **Date:** <YYYY-MM-DD> · **Owner's go:** yes (interview round <n>)

## Goal

<the one action the reader takes; the single CTA href and label>

## Audience

- **Who lands here:** <one line>
- **What they already know:** <one line>
- **First objection to answer:** <one line>

## Sections (in order)

| # | section | type | what it says | backed by |
|---|---|---|---|---|
| 1 | Hero | 2 × `paragraph` | <what it is, in the product's words> | <brief / product doc> |
| 2 | How it works | `heading` + ordered `list` (≤ 5) | <steps as verbs> | <…> |
| 3 | Tiers | `heading` + `comparisonTable` | <one row per tier, who publishes> | <…> |
| 4 | Proof | `quote` / `image` / `callout` — or omitted | <only what is real> | <…> |
| 5 | Trust | `heading` + `paragraph` | <keys, data, limits> | <…> |
| 6 | Pricing | `callout` | <owner's exact words> | owner |
| 7 | CTA | one `appCta` | <text, href, label> | goal |

## Copy rules

- Voice: <adjectives> / never <anti-adjectives> — sample paragraph from the brand persona.
- Banned phrases: <from the brand profile>.
- Claims we make: <…> · Claims we never make: <…>.
- Inline HTML: `em`, `strong`, `a[href=https]` only (no `code`).

## Design tokens

`design-tokens.json` revision <n> on the tenant: background <#hex> · surface <#hex> · text <#hex> · accent <#hex> · heading <font> · body <font>. Proposed from <the brand's site URL>.

## SEO

- `description` (≤ 1000): <…>
- `seo.answer`: <one paragraph an engine may lift>
- `seo.keywords`: <≤ 20>

## Decisions

| # | decision | from | why |
|---|---|---|---|
| 1 | slug `<…>` not `/` | agent | the tenant root is the hub view |
| 2 | <…> | user | <…> |
