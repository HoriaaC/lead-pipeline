// Fake leads for local development: `npm run db:seed`.
// Tagged source = 'seed' so they can be removed with:
//   delete from leads where source = 'seed';
import { pool } from "@/lib/db";

const leads = [
  { name: "Ana Popescu", email: "ana.popescu@example.com", company: "Popescu Design", daysAgo: 0 },
  { name: "Mihai Ionescu", email: "mihai@example.com", company: null, daysAgo: 1 },
  { name: "Elena Dumitru", email: "elena.d@example.com", company: "Dumitru & Co", daysAgo: 2 },
  { name: "Andrei Stan", email: "andrei.stan@example.com", company: "Stan Logistics", daysAgo: 3 },
  { name: "Ioana Marin", email: "ioana.marin@example.com", company: null, daysAgo: 5 },
  { name: "Radu Georgescu", email: "radu@example.com", company: "RG Consulting", daysAgo: 6 },
];

async function main() {
  for (const l of leads) {
    await pool.query(
      `insert into leads (name, email, company, message, source, created_at)
       values ($1, $2, $3, $4, 'seed', now() - make_interval(days => $5))`,
      [l.name, l.email, l.company, "Seed lead for local testing.", l.daysAgo],
    );
  }
  console.log(`Inserted ${leads.length} seed leads.`);
}

main()
  .catch((err) => {
    console.error("db:seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
