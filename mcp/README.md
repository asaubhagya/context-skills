# MCP catalogs

This directory holds one JSON file per Context MCP server —
`mcp/context.json` for the Context MCP, `mcp/context-blog.json` for the
Context Blog MCP, and so on. Each file is a **catalog of that server's real
tool registry**: its tool groups, every tool's name/title/description, and
summary counts.

These files are **generated, never hand-edited**. Each MCP server's own repo
ships an `export-mcp-catalog` script that introspects its live tool
definitions and writes the catalog. This repo only stores the committed
output, the same way it stores skills — `manifest.json` indexes both.

## Schema

Every file here has a top-level `schema: "context-mcp-catalog/1"`:

```json
{
  "schema": "context-mcp-catalog/1",
  "server": {
    "key": "context",
    "name": "Context MCP",
    "endpoint": "https://mcp.onecontext.me/mcp",
    "contractVersion": "1"
  },
  "toolGroups": [
    {
      "name": "issues",
      "tools": [
        {
          "name": "claim_issue",
          "title": "Claim issue",
          "description": "…",
          "inputSchema": { "type": "object", "properties": {} },
          "outputSchema": null
        }
      ]
    }
  ],
  "counts": { "total": 1, "shared": 1, "paired": 0 }
}
```

- `server.key` must equal the filename (`mcp/<key>.json`).
- `server.endpoint` must be an `https://` URL.
- Tool names must be unique across all `toolGroups[].tools[]`.
- `counts.total` must equal the number of tools; `counts.shared + counts.paired`
  must equal `counts.total` (a tool is either usable from a Shared Space, a
  Paired/Private one, or both — `shared`/`paired` count membership in each,
  so a tool available in both counts toward both).
- Every tool needs a non-empty `name`, `title` and `description`.
- A tool may optionally carry `inputSchema` (an object with `type: "object"`)
  and `outputSchema` (an object, or `null`) — the catalogs now embed the
  exact schemas the server's own `tools/list` response returns, so a
  consumer never has to guess a tool's parameters or result shape.

`pnpm check-mcp-catalogs` (also run by `pnpm check-skills` and `pnpm check`)
validates all of this. `pnpm build-manifest` indexes every catalog that
passes into `manifest.json`'s top-level `mcp[]`, alongside `skills[]`.

## Refreshing a catalog

1. In the MCP server's own repo, run its `export-mcp-catalog` script against
   the live tool registry. It writes the catalog JSON.
2. Copy that output here as `mcp/<key>.json`, replacing the existing file.
3. `pnpm check-mcp-catalogs` (or `pnpm check-skills`) locally, then commit.
4. Tag a release the same way skills are released (see the root
   [README.md](../README.md#versions-and-rollback)) — both MCPs and
   [app.onecontext.me/mcp](https://app.onecontext.me/mcp) read `mcp/*.json`
   from `manifest.json` at the pinned tag through jsDelivr, and verify each
   file's `sha256` before rendering it.

Never edit a `mcp/*.json` file by hand — re-run the exporter in the server
repo and copy its output here instead, so the catalog always reflects the
server's real tool registry.
