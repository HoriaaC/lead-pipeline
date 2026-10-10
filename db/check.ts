// Connection smoke test: `npm run db:check`.
import { pool } from "@/lib/db";

async function main() {
  const { rows } = await pool.query(
    "select current_user, now() as server_time, version() as version",
  );
  const r = rows[0];
  console.log(`connected as ${r.current_user}`);
  console.log(`server time  ${r.server_time.toISOString()}`);
  console.log(`version      ${String(r.version).split(" on ")[0]}`);
}

main()
  .catch((err) => {
    console.error("db:check failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
