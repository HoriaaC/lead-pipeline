// Minimal migration runner: `npm run db:migrate`.
//
// Applies db/migrations/*.sql in filename order, each in its own transaction,
// and records it in schema_migrations so it never runs twice.
// RULE: never edit a migration that has been applied — add a new file instead.
import fs from "node:fs";
import path from "node:path";
import { pool } from "@/lib/db";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");
// Arbitrary constant; any process migrating this database takes the same lock.
const LOCK_ID = 727_001;

async function main() {
  const client = await pool.connect();
  try {
    // Two deploys running migrations at once would race; the advisory lock
    // makes the second one wait until the first finishes.
    await client.query("select pg_advisory_lock($1)", [LOCK_ID]);

    await client.query(`
      create table if not exists schema_migrations (
        filename   text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const { rows } = await client.query<{ filename: string }>(
      "select filename from schema_migrations",
    );
    const applied = new Set(rows.map((r) => r.filename));

    const pending = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into schema_migrations (filename) values ($1)", [file]);
        await client.query("commit");
        console.log(`applied  ${file}`);
      } catch (err) {
        await client.query("rollback");
        throw new Error(`${file}: ${(err as Error).message}`);
      }
    }
  } finally {
    await client.query("select pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    client.release();
  }
}

main()
  .catch((err) => {
    console.error("Migration failed, rolled back:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
