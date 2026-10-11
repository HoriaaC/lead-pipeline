import fs from "node:fs";
import path from "node:path";
import pg from "pg";

// Supabase signs its Postgres certificates with its own CA. Verifying against it
// (instead of rejectUnauthorized: false) means we know we're talking to Supabase,
// not just that the traffic is encrypted. The CA cert is public, so it's committed.
const ca = fs.readFileSync(path.join(process.cwd(), "certs", "supabase-ca.crt"), "utf8");

// No env import here: the MCP server reuses this with its own read-only URL and
// must not need the app's other secrets.
export function createPool(connectionString: string, label: string) {
  // Strip sslmode from the URL: pg lets it override the `ssl` object below,
  // which would silently drop our CA.
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");

  const pool = new pg.Pool({
    connectionString: url.toString(),
    ssl: { ca, rejectUnauthorized: true },
    // The free Session pooler allows only a handful of connections per project.
    max: 5,
  });

  // An idle client losing its connection emits 'error' on the pool; without a
  // listener Node treats it as unhandled and crashes the process.
  // console.error writes to stderr, which is safe for the MCP server too.
  pool.on("error", (err) => console.error(`[${label}] idle client error:`, err.message));
  return pool;
}
