# Design tokens — <Brand>

<!-- send_file {filename: "design-tokens.md", title: "Design tokens", docKind: "design-guide", taskId: <tenant epic id>, content: <this file, filled>}
     and the JSON: send_file {filename: "design-tokens.json", title: "Design tokens (json)", docKind: "design-guide", taskId: <tenant epic id>, content: <design-tokens.json, filled>} -->

**Tenant:** `<slug>` · **Fetched from:** <https://…> on <YYYY-MM-DD> · **Approved by owner:** yes (Round 2)

The JSON file is the machine-readable source (`design-tokens.json`, sent to
the Blog MCP `brand_upsert {design_tokens}` on the Hosted tier). This page
is the human-readable summary of the same values — keep them in sync.

## Proposed from the site (facts)

| Token | Value | Where seen |
|---|---|---|
| Background | `#<hex>` | `body` |
| Text | `#<hex>` | `body` |
| Accent | `#<hex>` | links / buttons |
| Heading font | <Space Grotesk 600> | `h1–h3` |
| Body font | <IBM Plex Sans 400> | `p` |
| Logo | <url> | header |

## Decisions (owner)

- **Style:** <paper-sketch — hand-drawn outlines, off-white paper, no stock photography>
- **Imagery:** <2D outline sketches; one hero per post, 16:9; Instagram 4:5 cards>
- **Byline card:** <Person: name, role, avatar, link to /about>
- **Dark mode:** <follow system / none>

## Where the tokens apply

| Surface | Tokens used |
|---|---|
| Blog post page | color, font, layout, seo |
| Hero / OG image | imagery.ogTemplate, color.accent, logo |
| Instagram card | instagram.template, color, font.heading |
| Landing page | all |
