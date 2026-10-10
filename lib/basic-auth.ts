import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "./env";

// Checks an `Authorization: Basic <base64(user:pass)>` header against the env credentials.
export function isAuthorized(header: string | null): boolean {
  if (!header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const i = decoded.indexOf(":");
  if (i === -1) return false;
  // Both compared before combining, so a wrong user doesn't return faster than a wrong password.
  const userOk = safeEqual(decoded.slice(0, i), env.DASHBOARD_USER);
  const passOk = safeEqual(decoded.slice(i + 1), env.DASHBOARD_PASSWORD);
  return userOk && passOk;
}

// `===` stops at the first differing character, so response timing leaks how much
// of a guess was right. Hash both sides to equal length, then compare in constant time.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
