# The Ruck

Like the rugby ruck it's named after — the contested moment where a team fights for control — The Ruck keeps your sprints, capacity, and retrospectives organized when things get chaotic.

This repo now includes a working full-stack foundation with a functional React shell, Team Management, Backlog + Story Detail workflow, Active Sprint kanban with drag-and-drop, Sprint History + Sprint Creation, and a documented Express API on top of a swappable JSON persistence layer.

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
    - supports sprint statuses: `planning`, `active`, `completed`
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

## Frontend features implemented

### App shell + theming
- Persistent sidebar navigation with active route highlighting
- Collapsible icon-only sidebar with persisted state (`localStorage`)
- Dark/light theme toggle with persisted state and no-flash bootstrapping
- CSS-variable-driven design system (no hardcoded component colors)
- Pink-focused visual theme (including pink avatar palette tokens)
- Shared component library:
  - `PageHeader`, `Card`, `Badge`, `Avatar`, `EmptyState`
  - `ConfirmDialog`, `Spinner`, toast system (`useToast`)
- Central typed API client (`client/src/lib/api.ts`) that unwraps `{ data, error }` envelope and throws typed API errors

### Team Management (`/team`)
- Real team lineup page with API-backed CRUD
- Active and Inactive sections with counts and separate grids
- Member cards with:
  - avatar, name, role, default availability
  - status badge
  - overflow actions (`Edit`, `Deactivate/Reactivate`, `Delete`)
- Add/Edit member right-side drawer:
  - inline field validation
  - avatar swatch picker
  - loading submit state
- Delete confirmation dialog + success/failure toasts
- Loading skeleton cards and error retry state

### Backlog + Story Detail (`/backlog`)
- Real backlog page with:
  - sprint filter chips (`Backlog` + all sprints)
  - API-backed story list sorted by created date
  - story rows (points, title, assignee, labels, status)
- Story Detail Drawer (create + edit mode):
  - title inline edit (save on blur)
  - description editor with markdown preview toggle
  - points segmented control (1/2/3/5/8/13)
  - assignee picker with avatars
  - labels add/remove inline
  - board column selector
  - acceptance criteria editor
  - sprint assignment selector
  - created/updated timestamps
  - save indicator (`Saving...` -> `Saved`)
- Auto-save behavior:
  - immediate save on points/assignee/column/sprint changes
  - blur-save for title/description/acceptance criteria
- Story create and delete (with confirm dialog), plus loading/error/empty states

### Active Sprint Board (`/sprint/active`)
- Sprint header with:
  - sprint name + goal
  - date range
  - days remaining
  - burndown-style points progress bar (`done / total`, percentage)
  - Complete Sprint action with confirmation
- 4-column kanban:
  - Backlog, In Progress, In Review, Done
  - per-column story count + total points
- Story cards with hover affordances and drag handle
- Drag-and-drop via `@dnd-kit/core` + `@dnd-kit/sortable`:
  - reorder within columns
  - move between columns
  - drag overlay
  - optimistic updates + rollback on API failure
- Click card to open Story Detail Drawer
- Empty state if no active sprint, plus loading/error states

### Sprint Management (`/sprints`)
- Sprint History page with reverse chronological sprint list
- Row details include:
  - name
  - date range
  - status badge (`Planning | Active | Completed`)
  - velocity badge for completed sprints
- Create Sprint centered modal:
  - suggested default sprint name (`Sprint N`)
  - goal with character counter
  - start/end date validation (end after start)
  - inline field validation + toasts
- One-active-sprint UI rule:
  - planning sprints expose `Set Active`
  - when an active sprint exists, `Set Active` on other planning sprints is disabled
  - hover tooltip text: `"Complete the current active sprint first"`

## Dev setup
1. `cd` to the repo root.
2. `npm install`
3. Run:
   - `npm run dev`

Common local URLs:
- API: `http://localhost:3001`
- Web: `http://localhost:5173`
- Docs: `http://localhost:3001/api/docs`

## Running + accessing API docs
If you only want to run the API and view docs:

1. Install dependencies at repo root:
   - `npm install`
2. Start just the backend:
   - `npm -w server run dev`
3. Open the interactive docs in your browser:
   - [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
4. Optional: fetch raw OpenAPI JSON:
   - [http://localhost:3001/api/docs/openapi.json](http://localhost:3001/api/docs/openapi.json)

If you run the full stack (`npm run dev`), docs are still available at the same URL.

## Roadmap (v2 ideas)
- Auth (team-scoped) + user identity
- WebSockets / realtime updates
- Postgres migration via repository swap (Prisma)
- Sprint planning poker
- Better retro clustering + vote aggregation logic
- Capacity UX polish (confidence + transparency improvements)

