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

export async function insertLead(lead: LeadInput): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into leads (name, email, phone, company, message, source)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [lead.name, lead.email, lead.phone, lead.company, lead.message, lead.source],
  );
  // pg returns bigint as a string, since it can exceed Number.MAX_SAFE_INTEGER.
  return rows[0].id;
}
