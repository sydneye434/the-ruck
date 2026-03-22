// Developed by Sydney Edwards
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const TEST_DATA_DIR = path.join(__dirname, "test-data");

const FILES = [
  "team-members.json",
  "sprints.json",
  "stories.json",
  "retros.json",
  "retro-cards.json",
  "retro-action-items.json",
  "settings.json",
  "teams.json",
  "team-member-links.json",
  "activity-log.json"
];

/** Remove the entire test data directory (used after each test file). */
export function wipeTestDataDir() {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
}

/** Write minimal empty stores so repositories can run. */
export function seedEmptyStores() {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
  for (const f of FILES) {
    const p = path.join(TEST_DATA_DIR, f);
    const body = f === "settings.json" ? "[]" : "[]";
    writeFileSync(p, body, "utf8");
  }
}

/** Write custom JSON payloads for integration tests. */
export function writeStore(fileName, data) {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
  writeFileSync(path.join(TEST_DATA_DIR, fileName), JSON.stringify(data, null, 2), "utf8");
}
