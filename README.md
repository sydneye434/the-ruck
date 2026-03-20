# The Ruck

*Developed by Sydney Edwards.*

Like the rugby ruck it's named after — the contested moment where a team fights for control — The Ruck keeps your sprints, capacity, and retrospectives organized when things get chaotic.

**The Ruck** is a portfolio-quality, scrum-native web app: **React (Vite)** + **Express** + **JSON file persistence** (repository pattern, swappable for Postgres later). No auth in v1 — built for a single team running locally.

**Training:** See **[docs/TRAINING_AGILE_AT_SCALE.md](docs/TRAINING_AGILE_AT_SCALE.md)** for how to use the app to run **Agile at scale** (teams, cadence, capacity, ceremonies, governance habits). **Credits:** [CREDITS.md](CREDITS.md).

---

## Quick start

### Prerequisites
- **Node.js** 18+ (LTS recommended) and **npm**

### Install & run
From the **repository root**:

```bash
npm install
```

(Optional) Load demo data — clears existing JSON data and seeds teams, sprints, stories, retros, activity log, etc.:

```bash
npm run seed
```

Start **client + API** together:

```bash
npm run dev
```

Then:

| What | URL |
|------|-----|
| **Web app (use this for the UI)** | `http://localhost:5173` — **use the URL printed by Vite** if it says the port is in use (e.g. `5174`) |
| **REST API** | `http://localhost:3001` |
| **API health** | `http://localhost:3001/api/health` |
| **Swagger UI** | `http://localhost:3001/api/docs` |

**Important**
- Open the **Vite** URL for the React UI. **`http://localhost:3001` is the API only** (JSON + docs). Opening the API root in a browser shows a small HTML hint page, not the app.
- Ensure **both** processes from `npm run dev` are running (client + server). If the API is down, pages that fetch data will show errors or empty states.

### Other useful commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Production build: `shared` → `server` → `client` |
| `npm run typecheck` | Typecheck all workspaces |
| `npm test` | Run shared unit tests (velocity engine, etc.) |
| `npm run seed` | Reseed `server/data/*.json` (same as `npm -w server run seed`) |
| `npm -w client run dev` | Client only |
| `npm -w server run dev` | API only |

---

## Features

### Dashboard (`/dashboard`)
- Landing page: active sprint snapshot, multi-layer progress vs capacity, velocity sparkline (last completed sprints), team summary, retro summary, overdue action items, recent activity timeline
- Auto-refresh when tab visible; manual refresh; “Getting Started” checklist when data is empty
- Route title: `Dashboard · The Ruck`

### Backlog (`/backlog`)
- Sprint filter chips; flat story list; create/edit via **Story Detail Drawer**
- Markdown description with preview; Fibonacci **or** T-shirt sizing (from settings); assignee, labels, column, acceptance criteria, sprint assignment; auto-save

### Active sprint (`/sprint/active`)
- Kanban (Backlog → In Progress → In Review → Done) with **@dnd-kit** drag-and-drop, optimistic updates, rollback on failure
- Sprint header: goal, dates, days remaining, burndown-style progress, complete sprint (with confirm)

### Sprint history (`/sprints`)
- All sprints, reverse chronological; status, velocity; create sprint; set active (one active sprint rule); **Capacity Planning** slide-over for planning sprints

### Capacity planning
- Velocity window (1 / 2 / 3 / 5 sprints), team availability (days off, subteam grouping), Fibonacci snap, manual override, save **capacity target** + snapshot on sprint
- Defaults (e.g. velocity window) follow **Settings**

### Team (`/team`, `/team/org-chart`)
- Members: roles, capacity multipliers, activate/deactivate, **Teams** tab with hierarchy, memberships, **Org chart** (`/team/org-chart`) with layout from d3-hierarchy + HTML/CSS nodes

### Retros (`/retros`, `/retro/:id`)
- List with past/active/closed; **Create retro** modal (sprint, template, title, anonymous default from settings)
- Board: **Reflect → Discuss → Action items → Closed**; templates (Start/Stop/Continue, 4Ls, Mad/Sad/Glad); cards, upvotes, grouping; action items; carried-over items; close retro with confirmation

### Settings (`/settings`)
- **Sprint defaults:** default sprint length (days), default velocity window, story point scale (Fibonacci vs T-shirt)
- **Retro defaults:** default template, default anonymous mode
- **Display:** theme (synced with sidebar), date format (used app-wide via `formatDate` from settings context)
- **Data:** `GET /api/export` download as JSON; **Reset all data** (double confirm + type `RESET`) → `DELETE /api/reset` clears files and re-seeds

### App shell & UX
- Persistent sidebar (collapsible, persisted state); dark/light theme (CSS variables, hot pink accents)
- Shared UI: `PageHeader`, `Card`, `Badge`, `Avatar`, `EmptyState`, `ConfirmDialog`, `Spinner`, toasts
- **SettingsContext:** loads settings once; `useSettings()` / `updateSetting`; shared `formatDate()`
- **404** route with link home; **document titles** per route; **error boundary** for runtime errors
- Client resolves `@the-ruck/shared` via **Vite alias** to `shared/src` (see `client/vite.config.ts`) so the UI works without building `shared/dist` first

### Backend & data
- **JSON repositories** under `server/data/` (override with `THE_RUCK_DATA_DIR`)
- **Activity log** for dashboard feed (story moves, sprint completed, retro cards, action items, etc.)
- **Velocity engine** (`shared/src/velocityEngine.ts`) — shared TypeScript module (no Node `module.exports` in the browser bundle)
- **OpenAPI** + Swagger UI (`/api/docs`) and `server/API.md`

---

## API overview (all responses `{ data, error, meta }`)

Core resources:
- `GET/POST /api/team-members`, `GET/PATCH/DELETE /api/team-members/:id`
- `GET/POST /api/teams`, tree, members, hierarchy (see `server/src/routes/teamsRoutes.ts`)
- `GET/POST /api/sprints`, `GET/PATCH/DELETE /api/sprints/:id`, `POST /api/sprints/:id/complete`, `GET /api/sprints/:id/capacity-context`
- `GET/POST /api/stories`, `GET/PATCH/DELETE /api/stories/:id` — `?sprintId=backlog` or sprint id
- `GET/POST /api/retros`, nested cards & action items under `/api/retros/:id/...`
- `GET/PUT /api/settings` — extended settings (sprint length, velocity window, story scale, retro defaults, date format)
- `GET /api/dashboard` — aggregated dashboard payload
- `GET /api/export` — full JSON export
- `DELETE /api/reset` — clear data files and re-run seed

Details: **`server/API.md`** and **`http://localhost:3001/api/docs`** (when running).

---

## Architecture

- **Repository pattern:** handlers use repositories only; swap `server/src/repositories/*` implementations to move to Postgres/Prisma without changing business logic.
- **Shared package (`shared/`):** domain types (`shared/src/types`), `velocityEngine`, `buildTeamTree`, API types. Client imports source via Vite alias; server uses TypeScript path mapping to `shared/src`.
- **SettingsContext:** single settings fetch, centralized `formatDate` and `updateSetting` for consistent UX.

---

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| **Blank white page** | Use the **Vite** URL from the terminal, not port `3001`. Hard refresh (Cmd+Shift+R). Open DevTools → Console for errors. |
| **`module is not defined` (velocity)** | Fixed in current code: engine lives in `shared/src/velocityEngine.ts`. Pull latest and restart `npm run dev`. |
| **API 404 on `/`** | Normal for JSON clients; browser GET `/` on the API returns a small HTML help page. |
| **`shared/dist` / package main** | The client does **not** rely on `shared/dist` for dev — the Vite alias points at `shared/src`. For production builds of the `shared` package alone, run `npm -w shared run build`. |

---

## Screenshots

- [Screenshot: Dashboard]
- [Screenshot: Backlog]
- [Screenshot: Sprint Board]
- [Screenshot: Capacity Planner]
- [Screenshot: Retrospective Board]
- [Screenshot: Team Management]
- [Screenshot: Org Chart]
- [Screenshot: Settings]

---

## Roadmap (v2 ideas)

- Auth (team-scoped) + user identity  
- WebSockets / realtime updates  
- Postgres migration via repository swap (Prisma)  
- Sprint planning poker  
- Richer retro clustering & voting  
- Capacity UX polish  

---

## Contributing

1. Fork the repo and create a feature branch.  
2. Run `npm install` and `npm run typecheck` before opening a PR.  
3. Run `npm test` when touching shared logic (velocity engine).  
4. Keep UI/API changes documented in the PR; update **`README.md`**, **`server/API.md`**, and the OpenAPI spec when endpoints change.

---

*Developed by Sydney Edwards.*
