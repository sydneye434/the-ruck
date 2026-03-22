// Developed by Sydney Edwards
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { TEMPLATES } = require(path.join(__dirname, "..", "retroTemplates.js")) as {
  TEMPLATES: Record<string, { columns: Array<{ key: string }> }>;
};

test("all templates export correct column keys", () => {
  assert.deepEqual(
    TEMPLATES.start_stop_continue.columns.map((c) => c.key),
    ["start", "stop", "continue"]
  );
  assert.deepEqual(
    TEMPLATES["4ls"].columns.map((c) => c.key),
    ["liked", "learned", "lacked", "longed_for"]
  );
  assert.deepEqual(
    TEMPLATES.mad_sad_glad.columns.map((c) => c.key),
    ["mad", "sad", "glad"]
  );
});

test("no two templates share a column key", () => {
  const keys = new Set<string>();
  for (const t of Object.keys(TEMPLATES)) {
    for (const c of TEMPLATES[t].columns) {
      assert.ok(!keys.has(c.key), `duplicate column key ${c.key}`);
      keys.add(c.key);
    }
  }
});

test("each template has at least 2 columns", () => {
  for (const t of Object.keys(TEMPLATES)) {
    assert.ok(TEMPLATES[t].columns.length >= 2, t);
  }
});
