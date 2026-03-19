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

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

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

  // Placeholder 404 (real routes come next).
  app.use((_req, res) => {
    res.status(404).json({ data: null, error: { message: "Not found", code: "NOT_FOUND" } });
  });

  // Global error handler must be last.
  app.use(errorHandler());

  return app;
}

