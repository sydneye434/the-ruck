// Developed by Sydney Edwards
import assert from "node:assert/strict";

/** Superagent uses `status`; fall back for compatibility. */
export function assertStatus(res: { status?: number; statusCode?: number; body?: unknown }, code: number) {
  const got = res.status ?? res.statusCode;
  assert.equal(
    got,
    code,
    `expected HTTP ${code}, got ${got}. body=${JSON.stringify(res.body)}`
  );
}
