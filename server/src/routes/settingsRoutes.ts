import { Router } from "express";
import type { AppSettings } from "@the-ruck/shared";
import { settingsRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendSuccess } from "../utils/envelope";

export const settingsRoutes = Router();

function asVelocityWindowN(v: unknown): AppSettings["velocityWindowN"] | null {
  const n = Number(v);
  if (n === 1 || n === 2 || n === 3 || n === 5) return n as AppSettings["velocityWindowN"];
  return null;
}

settingsRoutes.get("/", async (_req, res) => {
  const settings = await settingsRepository.getOrCreateDefault();
  return sendSuccess(res, settings);
});

settingsRoutes.put("/", async (req, res) => {
  const input = req.body as any;
  const existing = await settingsRepository.getOrCreateDefault();

  const patch: Partial<Omit<AppSettings, "id">> = {
    ...(input?.sprintLengthDefaultDays !== undefined
      ? { sprintLengthDefaultDays: Number(input.sprintLengthDefaultDays) }
      : {}),
    ...(input?.velocityWindowN !== undefined && asVelocityWindowN(input.velocityWindowN) !== null
      ? { velocityWindowN: asVelocityWindowN(input.velocityWindowN)! }
      : {})
  };

  if (patch.sprintLengthDefaultDays !== undefined && patch.sprintLengthDefaultDays <= 0) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "sprintLengthDefaultDays must be > 0" });
  }

  if (input?.velocityWindowN !== undefined && patch.velocityWindowN === undefined) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "velocityWindowN must be 1, 2, 3, or 5" });
  }

  const updated = await settingsRepository.update(existing.id, patch);
  if (!updated) throw new HttpError({ statusCode: 500, code: "INTERNAL_ERROR", message: "Failed to update settings" });

  return sendSuccess(res, updated);
});

