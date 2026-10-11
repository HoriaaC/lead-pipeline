import { z } from "zod";
import { pool } from "./db";

// "" from an empty optional input becomes null, so the DB stores NULL, not ''.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

// z.object strips unknown keys, so a client can't set `status`, `id` or `created_at`.
export const leadInput = z.object({
  // `error` covers the missing-field case too; without it zod says "expected string, received undefined".
  name: z.string({ error: "Name is required" }).trim().min(1, "Name is required").max(200),
  // Lowercased so the email index works for dedup lookups ("Ana@x.com" = "ana@x.com").
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .pipe(z.email("Invalid email").max(254)),
  phone: optionalText(50),
  company: optionalText(200),
  message: optionalText(5000),
  source: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || "website"),
});

export type LeadInput = z.infer<typeof leadInput>;

export async function insertLead(lead: LeadInput): Promise<{ id: string; created_at: Date }> {
  const { rows } = await pool.query<{ id: string; created_at: Date }>(
    `insert into leads (name, email, phone, company, message, source)
     values ($1, $2, $3, $4, $5, $6)
     returning id, created_at`,
    [lead.name, lead.email, lead.phone, lead.company, lead.message, lead.source],
  );
  // pg returns bigint as a string, since it can exceed Number.MAX_SAFE_INTEGER.
  return rows[0];
}

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  source: string;
  status: "new" | "contacted" | "qualified" | "lost";
  created_at: Date;
};

export async function listLatestLeads(limit: number): Promise<Lead[]> {
  const { rows } = await pool.query<Lead>(
    `select id, name, email, phone, company, message, source, status, created_at
     from leads
     order by created_at desc
     limit $1`,
    [limit],
  );
  return rows;
}

export type LeadSummary = {
  bySource: { source: string; count: number }[];
  latest: Pick<Lead, "id" | "name" | "company" | "created_at">[];
};

// Leads received in the last `hours` hours: counts per source + the 10 newest.
export async function leadSummarySince(hours: number): Promise<LeadSummary> {
  const [bySource, latest] = await Promise.all([
    // count(*) is bigint, which pg returns as a string; ::int is safe for per-day counts.
    pool.query<{ source: string; count: number }>(
      `select source, count(*)::int as count
       from leads where created_at >= now() - make_interval(hours => $1)
       group by source order by count desc, source`,
      [hours],
    ),
    pool.query<LeadSummary["latest"][number]>(
      `select id, name, company, created_at
       from leads where created_at >= now() - make_interval(hours => $1)
       order by created_at desc limit 10`,
      [hours],
    ),
  ]);
  return { bySource: bySource.rows, latest: latest.rows };
}
