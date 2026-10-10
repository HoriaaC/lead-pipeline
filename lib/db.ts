import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { env } from "./env";

// Supabase signs its Postgres certificates with its own CA. Verifying against it
// (instead of rejectUnauthorized: false) means we know we're talking to Supabase,
// not just that the traffic is encrypted. The CA cert is public, so it's committed.
const ca = fs.readFileSync(path.join(process.cwd(), "certs", "supabase-ca.crt"), "utf8");

function createPool() {
  // Strip sslmode from the URL: pg lets it override the `ssl` object below,
  // which would silently drop our CA.
  const url = new URL(env.DATABASE_URL);
  url.searchParams.delete("sslmode");

  const pool = new pg.Pool({
    connectionString: url.toString(),
    ssl: { ca, rejectUnauthorized: true },
    // The free Session pooler allows only a handful of connections per project.
    max: 5,
  });

  // An idle client losing its connection emits 'error' on the pool; without a
  // listener Node treats it as unhandled and crashes the process.
  pool.on("error", (err) => console.error("[db] idle client error:", err.message));
  return pool;
}

// In dev, Next.js hot reload re-imports this module; caching the pool on
// globalThis stops every reload from opening new connections until we hit the limit.
const globalForDb = globalThis as unknown as { pgPool?: pg.Pool };

export const pool = globalForDb.pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;
