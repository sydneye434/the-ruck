// Developed by Sydney Edwards
import express from "express";
import cors from "cors";
import { teamMembersRoutes } from "./routes/teamMembersRoutes";
import { sprintsRoutes } from "./routes/sprintsRoutes";
import { storiesRoutes } from "./routes/storiesRoutes";
import { retrosRoutes } from "./routes/retrosRoutes";
import { settingsRoutes } from "./routes/settingsRoutes";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { apiDocsRoutes } from "./routes/apiDocsRoutes";
import { teamsRoutes } from "./routes/teamsRoutes";
import { dashboardRoutes } from "./routes/dashboardRoutes";
import { dataManagementRoutes } from "./routes/dataManagementRoutes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  // Browsers often open the API port directly; without this, GET / returns JSON 404 and looks like a blank page.
  app.get("/", (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>The Ruck — API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.5">
  <h1>The Ruck API</h1>
  <p>This port serves the <strong>REST API</strong> only. The web app runs separately.</p>
  <p>Open the UI in dev at <a href="http://localhost:5173">http://localhost:5173</a> (Vite prints the exact URL if the port changes).</p>
  <p>API docs: <a href="/api/docs">/api/docs</a> · Health: <a href="/api/health">/api/health</a></p>
</body>
</html>`);
  });

  // Health endpoint for validating the server during scaffolding.
  app.get("/api/health", (_req, res) => {
    res.json({ data: { status: "ok" }, error: null, meta: { at: new Date().toISOString() } });
  });

  app.use("/api/docs", apiDocsRoutes);

  app.use("/api/team-members", teamMembersRoutes);
  app.use("/api/sprints", sprintsRoutes);
  app.use("/api/stories", storiesRoutes);
  app.use("/api/retros", retrosRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/teams", teamsRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api", dataManagementRoutes);

  // Placeholder 404 (real routes come next).
  app.use((_req, res) => {
    res.status(404).json({ data: null, error: { message: "Not found", code: "NOT_FOUND" } });
  });

  // Global error handler must be last.
  app.use(errorHandler());

  return app;
}

