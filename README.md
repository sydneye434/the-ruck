# The Ruck

Like the rugby ruck it's named after — the contested moment where a team fights for control — The Ruck keeps your sprints, capacity, and retrospectives organized when things get chaotic.

This repo currently contains the scaffolding and backend API + a swappable JSON persistence data layer. Frontend feature pages are still placeholders (no sprint/team/retro UX yet). No seed data has been added.

## What’s been built so far

### Monorepo scaffold
- `client/` (React + Vite + React Router v6 + Tailwind)
- `server/` (Node.js + Express REST API, TypeScript)
- `shared/` (TypeScript domain types + shared repository interface)

Root scripts:
- `npm run dev` (runs client + server concurrently)
- `npm run build` (builds `shared`, `server`, then `client`)
- `npm run typecheck` (typechecks `shared`, `server`, `client`)

### Swappable data layer (intentional architecture decision)
- Repository interface (CRUD): `shared/src/repository/Repository.ts`
- JSON file repository implementation (per-file locking): `server/src/data/persistence/jsonFileRepository.ts`
- Resource repositories (team members, sprints, stories, retros, cards, action items, settings):
  - `server/src/repositories/*`
- Swappability guidance:
  - `server/src/repositories/index.ts` documents the rule: migrate by replacing repository modules only.

Persistence location:
- JSON files live in `server/data/*.json`
- Override via `THE_RUCK_DATA_DIR` to persist elsewhere

### Express API routes + consistent envelope
- Global request logging middleware:
  - `server/src/middleware/requestLogger.ts`
- Global error handling middleware (clean `{ data:null, error:{message,code} }` response):
  - `server/src/middleware/errorHandler.ts`
- Consistent response envelope helper:
  - `server/src/utils/envelope.ts`

Mounted routes in `server/src/app.ts` (all responses use `{ data, error, meta }`):
- `GET /api/health`
- `Team`
  - `/api/team-members` (`GET`, `POST`)
  - `/api/team-members/:id` (`GET`, `PATCH`, `DELETE`)
- `Sprints`
  - `/api/sprints` (`GET`, `POST`)
  - `/api/sprints/:id` (`GET`, `PATCH`, `DELETE`)
  - `/api/sprints/:id/complete` (`POST`) computes sprint velocity from `Story.boardColumn === "done"`
- `Stories`
  - `/api/stories` (`GET`, `POST`)
    - `?sprintId=backlog` => unassigned backlog stories (`boardColumn=backlog`)
    - `?sprintId=:id` => stories scoped to a sprint
  - `/api/stories/:id` (`GET`, `PATCH`, `DELETE`)
- `Retros`
  - `/api/retros` (`GET`, `POST`)
  - `/api/retros/:id` (`GET`, `PATCH`, `DELETE`)
- `Retro cards`
  - `/api/retros/:id/cards` (`GET`, `POST`)
  - `/api/retros/:id/cards/:cardId` (`GET`, `PATCH`, `DELETE`)
- `Retro action items`
  - `/api/retros/:id/action-items` (`GET`, `POST`)
  - `/api/retros/:id/action-items/:actionItemId` (`GET`, `PATCH`, `DELETE`)
- `Settings`
  - `/api/settings` (`GET` returns defaults if missing; `PUT` updates)

### API documentation
- Interactive Swagger UI:
  - `GET /api/docs`
- OpenAPI JSON spec:
  - `GET /api/docs/openapi.json`
- Human summary:
  - `server/API.md`

## Frontend status
- The Vite app and left sidebar navigation skeleton exist.
- Each section renders a “Coming soon” placeholder for now.
- Next step is wiring the frontend to the backend API + building the capacity calculator, sprint board (dnd-kit), and retro workflow UX.

## Dev setup
1. `cd` to the repo root.
2. `npm install`
3. Run:
   - `npm run dev`

Common local URLs:
- API: `http://localhost:3001`
- Web: `http://localhost:5173`
- Docs: `http://localhost:3001/api/docs`

## Roadmap (v2 ideas)
- Auth (team-scoped) + user identity
- WebSockets / realtime updates
- Postgres migration via repository swap (Prisma)
- Sprint planning poker
- Better retro clustering + vote aggregation logic
- Capacity UX polish (confidence + transparency improvements)

