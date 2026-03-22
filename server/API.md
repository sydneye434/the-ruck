# The Ruck API (v1)

Base URL: `http://localhost:3001`

All responses use this envelope:

```json
{ "data": null, "error": { "message": "string", "code": "string" }, "meta": {} }
```

## Interactive docs

- OpenAPI JSON: `GET /api/docs/openapi.json`
- Swagger UI: `GET /api/docs`

## Routes

### Team Members
- `GET /api/team-members`
- `POST /api/team-members`
- `GET /api/team-members/:id`
- `PATCH /api/team-members/:id`
- `DELETE /api/team-members/:id`

### Sprints
- `GET /api/sprints`
- `POST /api/sprints`
- `GET /api/sprints/:id`
- `PATCH /api/sprints/:id`
- `DELETE /api/sprints/:id`
- `POST /api/sprints/:id/complete`
- `GET /api/sprints/:id/capacity-context` — capacity planning context (velocity window, teams, working days)
- `GET /api/sprints/:id/burndown` — sprint summary, **snapshots**, **ideal burndown** (working days), **projected completion**, **projected line** for charts

### Stories
- `GET /api/stories`
  - `?sprintId=backlog` returns backlog stories (`boardColumn=backlog`)
  - `?sprintId=:id` returns stories for that sprint
- `POST /api/stories`
- `GET /api/stories/:id`
- `PATCH /api/stories/:id`
- `DELETE /api/stories/:id`

### Retros
- `GET /api/retros`
- `POST /api/retros`
- `GET /api/retros/:id`
- `PATCH /api/retros/:id`
- `DELETE /api/retros/:id`

#### Cards
- `GET /api/retros/:id/cards`
- `POST /api/retros/:id/cards`
- `GET /api/retros/:id/cards/:cardId`
- `PATCH /api/retros/:id/cards/:cardId`
- `DELETE /api/retros/:id/cards/:cardId`

#### Action Items
- `GET /api/retros/:id/action-items`
- `POST /api/retros/:id/action-items`
- `GET /api/retros/:id/action-items/:actionItemId`
- `PATCH /api/retros/:id/action-items/:actionItemId`
- `DELETE /api/retros/:id/action-items/:actionItemId`

### Settings
- `GET /api/settings`
- `PUT /api/settings`

---

*Developed by Sydney Edwards.*
