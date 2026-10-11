import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "must be a postgres:// or postgresql:// connection string",
    }),
  DASHBOARD_USER: z.string().min(1),
  // Basic Auth has no lockout, so the password itself must resist guessing.
  DASHBOARD_PASSWORD: z.string().min(12, "must be at least 12 characters"),
  N8N_WEBHOOK_URL: z.url(),
  N8N_SUMMARY_WEBHOOK_URL: z.url(),
  // Shared with n8n; 32+ chars so the HMAC key can't be brute-forced.
  WEBHOOK_SECRET: z.string().min(32, "must be at least 32 characters"),
});

function loadEnv() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    // List only the key names and reasons — never print the values, they are secrets.
    const problems = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables (see .env.example):\n${problems}`);
  }
  return result.data;
}

export const env = loadEnv();
