import assert from "node:assert/strict";
import { test } from "node:test";
import { isAuthorized } from "@/lib/basic-auth";

// Credentials come from test/test.env.
const basic = (s: string) => `Basic ${Buffer.from(s).toString("base64")}`;

test("correct credentials are accepted", () => {
  assert.equal(isAuthorized(basic("admin:test-password-123")), true);
});

test("wrong password or wrong user is rejected", () => {
  assert.equal(isAuthorized(basic("admin:wrong")), false);
  assert.equal(isAuthorized(basic("root:test-password-123")), false);
});

test("missing or malformed headers are rejected", () => {
  assert.equal(isAuthorized(null), false);
  assert.equal(isAuthorized("Bearer abc"), false);
  assert.equal(isAuthorized(basic("no-colon-here")), false);
});

test("splits on the first ':' only, so everything after it is the password", () => {
  // Password here is "test-password-123:extra", which doesn't match → rejected.
  assert.equal(isAuthorized(basic("admin:test-password-123:extra")), false);
});
