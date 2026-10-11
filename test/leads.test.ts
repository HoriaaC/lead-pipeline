import assert from "node:assert/strict";
import { test } from "node:test";
import { leadInput } from "@/lib/leads";

test("valid lead: trims, lowercases email, fills defaults", () => {
  const r = leadInput.parse({ name: "  Ana  ", email: " Ana@Example.COM " });
  assert.deepEqual(r, {
    name: "Ana",
    email: "ana@example.com",
    phone: null,
    company: null,
    message: null,
    source: "website",
  });
});

test("empty optional fields become null, not ''", () => {
  const r = leadInput.parse({ name: "Ana", email: "ana@example.com", company: "  ", phone: "" });
  assert.equal(r.company, null);
  assert.equal(r.phone, null);
});

test("unknown keys are stripped, so clients can't set status or id", () => {
  const r = leadInput.parse({ name: "Ana", email: "ana@example.com", status: "qualified", id: 1 });
  assert.ok(!("status" in r));
  assert.ok(!("id" in r));
});

test("missing name and invalid email are rejected with field errors", () => {
  const r = leadInput.safeParse({ name: "", email: "not-an-email" });
  assert.equal(r.success, false);
  const fields = r.error!.issues.map((i) => i.path[0]);
  assert.ok(fields.includes("name"));
  assert.ok(fields.includes("email"));
});

test("overlong message is rejected", () => {
  const r = leadInput.safeParse({ name: "Ana", email: "ana@example.com", message: "x".repeat(5001) });
  assert.equal(r.success, false);
});
