import { after } from "next/server";
import { z } from "zod";
import { insertLead, leadInput } from "@/lib/leads";
import { sendLeadWebhook } from "@/lib/webhook";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leadInput.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const lead = parsed.data;
  let inserted: Awaited<ReturnType<typeof insertLead>>;
  try {
    inserted = await insertLead(lead);
  } catch (err) {
    // Full detail stays in server logs; the client never sees SQL or stack traces.
    console.error("[api/leads] insert failed:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Runs after the 201 is sent, so a slow or down n8n never delays or fails the form.
  after(() =>
    sendLeadWebhook({
      id: inserted.id,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      source: lead.source,
      created_at: inserted.created_at.toISOString(),
    }),
  );

  return Response.json({ id: inserted.id }, { status: 201 });
}
