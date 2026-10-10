import { z } from "zod";
import { insertLead, leadInput } from "@/lib/leads";

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

  try {
    const id = await insertLead(parsed.data);
    return Response.json({ id }, { status: 201 });
  } catch (err) {
    // Full detail stays in server logs; the client never sees SQL or stack traces.
    console.error("[api/leads] insert failed:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
