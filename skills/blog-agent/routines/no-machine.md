# Routines without a machine — GitHub Actions / Vercel cron (hint)

For an owner whose laptop is not on at 02:00. Not a full install recipe:
the agent CLI must run somewhere with the Context and Blog MCP keys **by
name** as secrets, and the routine prompts are the same four sections of
`chat-routines.md`, filled. Print this filled, verify with the provider's
run log, and record the result the same way as launchd / cron.

## GitHub Actions (cron)

`.github/workflows/context-blog.yml` in the tenant's host repo:

```yaml
name: context-blog-<tenant>
on:
  schedule:
    - cron: "0 0 * * *"      # daily-brief   08:00 <tz> expressed in UTC (Asia/Singapore 08:00 = 00:00 UTC)
    - cron: "0 18 * * *"     # blog-drafter  02:00 <tz>
    - cron: "0 */3 * * *"    # blog-publisher every 3 h
    - cron: "0 1 * * 1"      # blog-assessment Mon 09:00 <tz>
  workflow_dispatch:
    inputs: { routine: { description: "daily-brief|blog-drafter|blog-publisher|blog-assessment", required: true } }
jobs:
  routine:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    env:
      CONTEXT_BLOG_TENANT: <tenant slug>
      TZ: <Asia/Singapore>
      CONTEXT_MCP_TOKEN: ${{ secrets.CONTEXT_MCP_TOKEN }}          # Context Access Key, by name
      CONTEXT_BLOG_MCP_TOKEN: ${{ secrets.CONTEXT_BLOG_MCP_TOKEN }} # Blog Access Key (= BLOG_ACCESS_KEY), by name
      OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
      POSTIZ_API_KEY: ${{ secrets.POSTIZ_API_KEY }}                # Instagram tenants only
    steps:
      - uses: actions/checkout@v4
      - run: npm i -g @anthropic-ai/claude-code   # or the Codex CLI
      - run: scripts/run-routine.sh "${{ github.event.inputs.routine || 'auto' }}"
        # 'auto' = pick the routine from the cron expression that fired (compare `github.event.schedule`).
```

Verify: Actions → the workflow → a green run per schedule, and the comment
on the Daily Brief issue. Cron on GitHub can lag by minutes; the publisher's
3-hour window absorbs that.

## Vercel cron (hint)

`vercel.json` → `{"crons": [{"path": "/api/routine/daily-brief", "schedule": "0 0 * * *"}, …]}`
where the function invokes the agent CLI with the same prompt sections and
secrets by name from the project's environment variables. Functions have a
hard execution limit (check the plan); the drafter usually needs a longer
runner — use it for the daily brief and the publisher, keep the drafter on
GitHub Actions or a machine.

## Neither

Hand the owner the four prompt sections and the schedule, say which routine
cannot run from this host (`rules-blog` §8), and record "not installed —
owner schedules" in the epic's `## Runs` `routines:` line. A missing daily
brief is still the alert.
