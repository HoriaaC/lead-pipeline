import assert from "node:assert/strict";
import { test } from "node:test";
import { signWebhook } from "@/lib/webhook";

// Fixed vector: HMAC-SHA256(test WEBHOOK_SECRET, '1700000000.{"id":"1"}').
// Pins the signed format `${timestamp}.${body}` that the n8n workflows verify:
// changing the order or separator would break production, and this test.
test("signWebhook matches the known vector", () => {
  assert.equal(
    signWebhook('{"id":"1"}', "1700000000"),
    "d02ebed5622954575c8e7634399643917ccbbc431334bfd8faa16fd092e014a6",
  );
});

test("signWebhook changes when one byte of the body changes", () => {
  assert.notEqual(signWebhook('{"id":"1"}', "1700000000"), signWebhook('{"id":"2"}', "1700000000"));
});

test("signWebhook changes when the timestamp changes (replay protection)", () => {
  assert.notEqual(signWebhook('{"id":"1"}', "1700000000"), signWebhook('{"id":"1"}', "1700000001"));
});
