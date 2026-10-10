import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "must be a postgres:// or postgresql:// connection string",
    }),
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
