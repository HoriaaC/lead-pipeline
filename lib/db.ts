import type pg from "pg";
import { env } from "./env";
import { createPool } from "./pg-pool";

// In dev, Next.js hot reload re-imports this module; caching the pool on
// globalThis stops every reload from opening new connections until we hit the limit.
const globalForDb = globalThis as unknown as { pgPool?: pg.Pool };

export const pool = globalForDb.pgPool ?? createPool(env.DATABASE_URL, "db");
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;
