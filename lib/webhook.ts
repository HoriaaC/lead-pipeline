import { createHmac } from "node:crypto";
import { env } from "./env";

// Only what n8n needs for the notification email. No phone/message, no secrets.
export type LeadWebhookPayload = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  source: string;
  created_at: string;
};

// Signs `${timestamp}.${body}` with HMAC-SHA256. The timestamp is inside the signature,
// so n8n can reject old requests and a captured request can't be replayed later.
export function signWebhook(raw: string, timestamp: string): string {
  return createHmac("sha256", env.WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest("hex");
}

// Throws on network errors, timeouts and non-2xx responses; callers decide whether
// a failure is fatal (daily summary) or only logged (lead form).
export async function postSigned(url: string, payload: unknown, timeoutMs = 5000): Promise<void> {
  // Serialize ONCE: sign these exact bytes and send these exact bytes.
  // Stringifying again could change key order/whitespace and break the signature.
  const raw = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();

  const res = await fetch(url, {
    method: "POST",
    body: raw,
    headers: {
      "Content-Type": "application/json",
      "X-Timestamp": ts,
      "X-Signature": `sha256=${signWebhook(raw, ts)}`,
    },
    // A hung n8n must not keep requests open forever.
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`n8n responded ${res.status}`);
}

// Never throws: the visitor already got their 201, a webhook failure is only logged.
export async function sendLeadWebhook(lead: LeadWebhookPayload): Promise<void> {
  try {
    await postSigned(env.N8N_WEBHOOK_URL, lead);
  } catch (err) {
    // Log the id only — the payload is personal data.
    console.error(`[webhook] lead ${lead.id}: ${(err as Error).message}`);
  }
}
