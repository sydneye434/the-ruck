# Code style guide — The Ruck

*Developed by Sydney Edwards.*

This project does not enforce a single formatter across all workspaces in CI; these guidelines keep **TypeScript**, **React**, and **Node** code consistent and easy to review.

---

## General principles

- **Clarity over cleverness** — prefer explicit names and small functions.
- **Type safety** — use TypeScript types; avoid `any` unless bridging untyped boundaries (then narrow or document).
- **Single responsibility** — routes delegate to repositories/services; shared pure logic lives in **`@the-ruck/shared`**.
- **Consistency** — match surrounding files (imports, quote style, test runner patterns).

---

## TypeScript

- Use **`interface` / `type`** from **`shared/src/types`** for domain shapes; avoid duplicating API types in the client.
- Prefer **`const`** for bindings that are not reassigned.
- Use **optional chaining** and **nullish coalescing** where they improve readability.
- **Narrow** unknown/error values in `catch` (e.g. `e instanceof Error`) before logging or showing messages.

---

## React (client)

- **Functional components** and hooks only (no class components).
- **File naming:** `PascalCase.tsx` for components, `camelCase.ts` for non-component modules.
- **Imports:** group external packages first, then internal aliases (`@/`, `@the-ruck/shared`), then relative paths.
- **Styling:** Tailwind-style utility classes with **CSS variables** for theme tokens (e.g. `var(--color-accent)`). Prefer semantic tokens over raw hex in new UI.
- **Data fetching:** use the **`api`** module in `client/src/lib/api.ts` — do not scatter raw `fetch` URLs.
- **Accessibility:** interactive elements should be **keyboard-focusable**; use `<button type="button">` for non-submit actions; provide labels where needed.

---

## Express / server

- **Handlers:** keep route handlers thin; validate input, call repositories/services, return **`sendSuccess` / `sendEmptySuccess`** (or throw **`HttpError`**).
- **Async:** use **`asyncHandler`** (or equivalent) so rejected promises become proper HTTP errors.
- **Persistence:** all file access goes through **repositories** under `server/src/repositories/`. Do not read/write `server/data/*.json` directly from routes.
- **Side effects:** background work (e.g. activity log, burndown snapshots) should **not block** the response; use fire-and-forget with internal error logging.
- **Env:** respect **`DATA_DIR`** / **`THE_RUCK_DATA_DIR`** for data location (see server docs / README).

---

## Shared package

- **No Node-only APIs** in modules imported by the browser (e.g. `fs`, `path` from Node). Keep browser-safe code in **`shared/src`**.
- **Pure functions** for calculations (velocity, burndown, trees) — easier to test and reuse on client and server.
- Export public APIs through **`shared/src/index.ts`**.

---

## Naming

- **Components:** `PascalCase`.
- **Functions / variables:** `camelCase`.
- **Constants:** `SCREAMING_SNAKE` only for true module-level constants when it helps readability.
- **API routes:** plural resources (`/api/sprints`, `/api/stories`), kebab-case or lowercase path segments consistent with existing routes.

---

## Comments & attribution

- New files may include a one-line attribution: `// Developed by Sydney Edwards` (match existing files in the same area).
- **Explain why**, not what, when the code is non-obvious (workarounds, spec edge cases, performance).

---

## Testing (style)

- Prefer **descriptive test names** that state expected behavior.
- **Shared:** `node:test` + `assert/strict`.
- **Server:** supertest + same assert style; reset test data in `before`/`after`.
- **Client:** Vitest; mock network at the boundary.

See **[TESTING.md](./TESTING.md)** for structure and commands.

---

## Git & PRs

- **Branch** from `main` for features/fixes.
- **Commits:** clear, imperative messages when possible.
- **PR description:** note user-visible changes, API changes, and updates to **README**, **`server/API.md`**, OpenAPI, or this doc when behavior or conventions change.

---

*Developed by Sydney Edwards.*
