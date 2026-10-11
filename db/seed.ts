// Demo leads for local development and demos: `npm run db:seed`.
// Re-runnable: first removes earlier demo rows, then inserts a fresh set spread over
// the last ~2 weeks, so the dashboard, daily summary and MCP stats all have data.
// Every demo email uses @example.com (a domain reserved for examples), which is how
// demo rows are recognised — never a real person's address.
import { pool } from "@/lib/db";

type Status = "new" | "contacted" | "qualified" | "lost";

const leads: {
  name: string;
  company: string | null;
  source: string;
  status: Status;
  hoursAgo: number;
  message: string;
}[] = [
  { name: "Ana Popescu", company: "Popescu Design", source: "google", status: "new", hoursAgo: 2, message: "We need a new website for our studio, ideally before December." },
  { name: "Mihai Ionescu", company: null, source: "facebook", status: "new", hoursAgo: 5, message: "How much would a simple landing page cost?" },
  { name: "Elena Dumitru", company: "Dumitru & Co", source: "linkedin", status: "new", hoursAgo: 9, message: "Looking for help automating our lead follow-ups." },
  { name: "Andrei Stan", company: "Stan Logistics", source: "website", status: "contacted", hoursAgo: 20, message: "Can you integrate our booking form with our CRM?" },
  { name: "Ioana Marin", company: "Marin Dental", source: "google", status: "contacted", hoursAgo: 30, message: "We want online appointment requests on our site." },
  { name: "Radu Georgescu", company: "RG Consulting", source: "linkedin", status: "qualified", hoursAgo: 44, message: "Interested in a dashboard for our sales team." },
  { name: "Cristina Vasile", company: "Vasile Imobiliare", source: "facebook", status: "new", hoursAgo: 60, message: "Real estate agency, need lead capture for listings." },
  { name: "Bogdan Munteanu", company: null, source: "website", status: "lost", hoursAgo: 75, message: "Just comparing prices for now." },
  { name: "Diana Constantin", company: "Constantin Events", source: "google", status: "qualified", hoursAgo: 96, message: "Event registrations + automatic confirmation emails." },
  { name: "Alexandru Matei", company: "Matei Auto", source: "website", status: "contacted", hoursAgo: 120, message: "Service booking form for our garage." },
  { name: "Raluca Petrescu", company: "Petrescu Legal", source: "linkedin", status: "new", hoursAgo: 150, message: "Contact form with GDPR-compliant storage." },
  { name: "Victor Ilie", company: "Ilie Construct", source: "google", status: "lost", hoursAgo: 200, message: "Went with another provider, thanks." },
  { name: "Simona Toma", company: "Toma Beauty", source: "facebook", status: "qualified", hoursAgo: 260, message: "Need a booking page connected to Instagram ads." },
  { name: "George Dinu", company: null, source: "website", status: "new", hoursAgo: 320, message: "Do you also maintain existing WordPress sites?" },
];

// "Ana Popescu" → "ana.popescu@example.com"
const emailFor = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").replace(/ /g, ".") + "@example.com";

async function main() {
  const client = await pool.connect();
  try {
    // One transaction: a failed seed never leaves the table half-reset.
    await client.query("begin");
    const removed = await client.query("delete from leads where email like '%@example.com'");
    for (const l of leads) {
      await client.query(
        `insert into leads (name, email, company, message, source, status, created_at)
         values ($1, $2, $3, $4, $5, $6, now() - make_interval(hours => $7))`,
        [l.name, emailFor(l.name), l.company, l.message, l.source, l.status, l.hoursAgo],
      );
    }
    await client.query("commit");
    console.log(`Removed ${removed.rowCount} old demo leads, inserted ${leads.length}.`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error("db:seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
