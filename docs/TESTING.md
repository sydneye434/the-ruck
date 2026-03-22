# Testing in The Ruck

*Developed by Sydney Edwards.*

This document describes **how tests are organized**, **which tools run where**, and **conventions for writing new tests**.

---

## Running tests

From the **repository root**:

| Command | What runs |
|---------|-----------|
| `npm test` | All workspaces that define a `test` script, in the order listed in the root **`package.json`** **`workspaces`** array (**client**, then **server**, then **shared**). |
| `npm run test:coverage` | Coverage scripts per workspace (where defined). |

Per workspace:

| Workspace | Command | Runner |
|-----------|---------|--------|
| **shared** | `npm -w shared test` | Node.js **native test runner** (`node --test`) + **tsx** for TypeScript |
| **server** | `npm -w server test` | Node **native test runner** + **tsx** + **supertest** |
| **client** | `npm -w client test` | **Vitest** (`vitest run`), **jsdom**, **@testing-library** where used |

Always run **`npm run typecheck`** before a PR; tests do not replace type safety.

---

## Why server tests use `--test-concurrency=1`

Server integration tests write to **`server/tests/test-data/`** (via `DATA_DIR` in `server/tests/setup.mjs`). Parallel test **files** would corrupt shared JSON files. The server `test` script lists explicit test files and sets **`--test-concurrency=1`**.

When you add a **new** server test file, **append its path** to the `test` and `test:coverage` scripts in `server/package.json`.

---

## Shared (`shared/`)

### Role

Pure **unit tests** for library code: velocity engine, team tree, retro templates, dashboard helpers, **burndown math** (`burndownUtils`), etc. No I/O; fast and deterministic.

### Layout

- Tests live **next to sources** as `*.test.ts` under `shared/src/` (e.g. `burndownUtils.test.ts`).
- The `shared` `package.json` **test** script **enumerates** test entry files (same idea as the server: controlled ordering and discovery).

### Conventions

- Use Node’s **`node:test`** (`import { test } from "node:test"`) and **`node:assert/strict`**.
- Test **behavior and edge cases**, not implementation details of private helpers unless necessary.
- Prefer **clear scenario names** in the test title string.

### Adding a new shared test file

1. Add `src/yourModule.test.ts`.
2. Register the file in **`shared/package.json`** `test` and `test:coverage` scripts.

---

## Server (`server/`)

### Role

**HTTP integration tests** against a real Express app (`createApp()` from `server/src/app.ts`), real repositories, and **isolated** JSON files under `server/tests/test-data/`.

### Setup

- **`server/tests/setup.mjs`** runs first (via `node --import ./tests/setup.mjs`). It sets:

  `process.env.DATA_DIR` → `server/tests/test-data`

  so production `server/data/` is never touched.

- **`server/tests/testData.js`** provides **`seedEmptyStores()`**, **`wipeTestDataDir()`**, and helpers to reset JSON files between tests.

- Typical pattern in a test file:

  - `before()` → wipe + seed empty stores  
  - `after()` → wipe again  
  - Use **supertest** `request(app).get/post/patch/...` and shared **`assertResponse`** helpers where applicable.

### Layout

- Tests live under **`server/tests/`** as `*.test.ts` (e.g. `burndown.test.ts`, `sprints.test.ts`).
- Helpers: `assertResponse.ts`, `testData.js`, `setup.mjs`.

### Conventions

- Assert on **HTTP status** and **envelope shape** `{ data, error }` (and relevant fields).
- For routes that mutate JSON, assert **persistence** when the behavior matters (e.g. one snapshot row per sprint+day).
- Avoid relying on wall-clock unless you control dates in fixtures.

### Adding a new server test file

1. Add `tests/yourFeature.test.ts`.
2. Append the path to **`server/package.json`** `test` and `test:coverage` scripts (keep **`--test-concurrency=1`**).

---

## Client (`client/`)

### Role

- **Vitest** + **jsdom** for components and **`src/lib`** utilities.
- **`client/vitest.config.ts`** restricts **coverage** thresholds to **`src/lib/**/*.ts`** (library-style code), not the entire app shell.

### Layout

- Tests under **`client/tests/`** with names `*.test.ts` or `*.test.tsx`.
- **`client/tests/setupTests.ts`** registers **`@testing-library/jest-dom`** matchers and mocks **localStorage**.

### Conventions

- Prefer testing **hooks and pure helpers** in `src/lib` with stable coverage.
- For UI, mock **`fetch`** / API where needed (see **`api.smoke.test.ts`** for exercising the API client surface with a single mocked `fetch`).
- Use **`describe` / `it`** from Vitest (globals enabled in config).

### API client smoke test

**`client/tests/api.smoke.test.ts`** stubs `fetch` and calls **every** `api.*` method once so URL paths and request shapes stay in sync. If you add an API method, **add a branch** to the mock and **invoke** the new method in the test.

---

## Coverage notes (summary)

- **Client:** Coverage thresholds apply to **`src/lib/**`** only (see `client/vitest.config.ts`).
- **Shared / server:** Node **`--experimental-test-coverage`** includes broad trees; interpret percentages in context (e.g. `seed.ts` may be lightly exercised).

---

## Checklist for new features

1. **Shared logic** → unit tests in `shared/src/*.test.ts` + register in `shared/package.json`.
2. **REST behavior** → integration tests in `server/tests/*.test.ts` + register in `server/package.json`.
3. **Client API or lib** → Vitest tests + update **`api.smoke.test.ts`** if you add **`api.*`** methods.

For coding conventions when writing tests and production code, see **[STYLE_GUIDE.md](./STYLE_GUIDE.md)**.

---

*Developed by Sydney Edwards.*
