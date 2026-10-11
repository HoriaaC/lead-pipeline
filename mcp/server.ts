// Read-only MCP server over stdio: lets an agent (e.g. Claude Code) query leads.
// Run: `npm run mcp` (registered for Claude Code in .mcp.json).
//
// IMPORTANT: stdout is the MCP protocol channel. Never console.log here — any stray
// output corrupts the protocol. Diagnostics go to stderr (console.error).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createPool } from "@/lib/pg-pool";

// Own env check instead of lib/env.ts: this process needs only the read-only URL,
// not the app's dashboard password or webhook secret.
const envResult = z
  .object({ MCP_DATABASE_URL: z.string().startsWith("postgres") })
  .safeParse(process.env);
if (!envResult.success) {
  console.error("[mcp] MCP_DATABASE_URL is missing or invalid (see .env.example)");
  process.exit(1);
}

// Connects as leads_reader (db/migrations/002): even a buggy or misused tool can't write.
const pool = createPool(envResult.data.MCP_DATABASE_URL, "mcp");

const PERIOD_HOURS = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 } as const;

const server = new McpServer({ name: "lead-pipeline", version: "0.1.0" });

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

server.registerTool(
  "list_leads",
  {
    title: "List leads",
    description:
      "Latest leads, newest first. Optionally only leads created at or after `since` (ISO 8601).",
    inputSchema: {
      limit: z.number().int().min(1).max(100).default(20),
      since: z.iso.datetime({ offset: true }).optional(),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ limit, since }) => {
    const { rows } = await pool.query(
      `select id, name, email, phone, company, message, source, status, created_at
       from leads
       where $2::timestamptz is null or created_at >= $2::timestamptz
       order by created_at desc
       limit $1`,
      [limit, since ?? null],
    );
    return json(rows);
  },
);

server.registerTool(
  "lead_stats",
  {
    title: "Lead statistics",
    description: "Lead counts for a period: total, per source and per status.",
    inputSchema: { period: z.enum(["24h", "7d", "30d"]).default("7d") },
    annotations: { readOnlyHint: true },
  },
  async ({ period }) => {
    const hours = PERIOD_HOURS[period];
    // count(*) is bigint (returned as a string by pg); ::int is safe at this scale.
    const [bySource, byStatus] = await Promise.all([
      pool.query<{ source: string; count: number }>(
        `select source, count(*)::int as count
         from leads where created_at >= now() - make_interval(hours => $1)
         group by source order by count desc, source`,
        [hours],
      ),
      pool.query<{ status: string; count: number }>(
        `select status, count(*)::int as count
         from leads where created_at >= now() - make_interval(hours => $1)
         group by status order by count desc, status`,
        [hours],
      ),
    ]);
    return json({
      period,
      total: bySource.rows.reduce((sum, r) => sum + r.count, 0),
      by_source: bySource.rows,
      by_status: byStatus.rows,
    });
  },
);

// No top-level await: without "type": "module" in package.json, tsx runs this as CommonJS.
server
  .connect(new StdioServerTransport())
  .then(() => console.error("[mcp] lead-pipeline server running on stdio"))
  .catch((err) => {
    console.error("[mcp] failed to start:", err.message);
    process.exit(1);
  });
