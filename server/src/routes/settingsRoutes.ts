// Developed by Sydney Edwards
import { Router } from "express";
import type { AppSettings } from "@the-ruck/shared";
import { settingsRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendSuccess } from "../utils/envelope";
import { asyncHandler } from "../utils/asyncHandler";

export const settingsRoutes = Router();

function asVelocityWindow(v: unknown): AppSettings["velocityWindow"] | null {
  const n = Number(v);
  if (n === 1 || n === 2 || n === 3 || n === 5) return n as AppSettings["velocityWindow"];
  return null;
}

settingsRoutes.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await settingsRepository.getOrCreateDefault();
    return sendSuccess(res, settings);
  })
);

settingsRoutes.put(
  "/",
  asyncHandler(async (req, res) => {
  const input = req.body as any;
  const existing = await settingsRepository.getOrCreateDefault();

  const patch: Partial<Omit<AppSettings, "id">> = {
    ...(input?.sprintLengthDays !== undefined
      ? { sprintLengthDays: Number(input.sprintLengthDays) }
      : {}),
    ...(input?.velocityWindow !== undefined && asVelocityWindow(input.velocityWindow) !== null
      ? { velocityWindow: asVelocityWindow(input.velocityWindow)! }
      : {}),
    ...(input?.storyPointScale !== undefined ? { storyPointScale: input.storyPointScale } : {}),
    ...(input?.defaultRetroTemplate !== undefined
      ? { defaultRetroTemplate: input.defaultRetroTemplate }
      : {}),
    ...(input?.defaultAnonymous !== undefined ? { defaultAnonymous: Boolean(input.defaultAnonymous) } : {}),
    ...(input?.dateFormat !== undefined ? { dateFormat: input.dateFormat } : {})
  };

  if (patch.sprintLengthDays !== undefined && (patch.sprintLengthDays < 1 || patch.sprintLengthDays > 90)) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "sprintLengthDays must be between 1 and 90" });
  }

  if (input?.velocityWindow !== undefined && patch.velocityWindow === undefined) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "velocityWindow must be 1, 2, 3, or 5" });
  }
  if (patch.storyPointScale && !["fibonacci", "tshirt"].includes(patch.storyPointScale)) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "storyPointScale must be fibonacci or tshirt" });
  }
  if (patch.defaultRetroTemplate && !["start_stop_continue", "4ls", "mad_sad_glad"].includes(patch.defaultRetroTemplate)) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "defaultRetroTemplate is invalid" });
  }
  if (patch.dateFormat && !["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].includes(patch.dateFormat)) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "dateFormat is invalid" });
  }

  const updated = await settingsRepository.update(existing.id, patch);
  if (!updated) throw new HttpError({ statusCode: 500, code: "INTERNAL_ERROR", message: "Failed to update settings" });

  return sendSuccess(res, updated);
  })
);

