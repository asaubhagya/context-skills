#!/usr/bin/env -S pnpm tsx
/** Verify the public cold-start route contains a complete, progressive path. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const start = readFileSync(join(root, "site", "start.md"), "utf8");
const home = readFileSync(join(root, "site", "index.md"), "utf8");
const llms = readFileSync(join(root, "site", "llms.txt"), "utf8");
const required = ["https://mcp.onecontext.me/mcp", "Call `setup` before another Context tool.", '"caller"', "install_skills", "pair_phone", "list_spaces", "search_context", "https://agents.onecontext.me/GUIDE.md", "https://agents.onecontext.me/tools/context.md"];
const failures = [...required.filter((text) => !start.includes(text)), /{{[A-Z_]+}}/.test(start) ? "unresolved template" : "", !home.includes("/start.md") ? "home link" : "", !llms.includes("/start.md") ? "llms link" : ""].filter(Boolean);
if (failures.length) {
  console.error(`cold-start check failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("check-cold-start: public start route, home link and llms pointer are complete");
