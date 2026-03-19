import express from "express";
import cors from "cors";
import morgan from "morgan";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  // Health endpoint for validating the server during scaffolding.
  app.get("/api/health", (_req, res) => {
    res.json({ data: { status: "ok" }, error: null, meta: { at: new Date().toISOString() } });
  });

  // Placeholder 404 (real routes come next).
  app.use((_req, res) => {
    res.status(404).json({ data: null, error: { message: "Not found", code: "NOT_FOUND" } });
  });

  return app;
}

