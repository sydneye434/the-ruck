import { Router } from "express";
import type { Retro, RetroTemplate } from "@the-ruck/shared";
import { retroCardsRoutes } from "./retroCardsRoutes";
import { retroActionItemsRoutes } from "./retroActionItemsRoutes";
import { retrosRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";

export const retrosRoutes = Router();

const VALID_TEMPLATES = new Set<RetroTemplate>([
  "start_stop_continue",
  "four_ls",
  "mad_sad_glad",
  "custom"
]);

retrosRoutes.use("/:id/cards", retroCardsRoutes);
retrosRoutes.use("/:id/action-items", retroActionItemsRoutes);

retrosRoutes.get("/", async (_req, res) => {
  const data = await retrosRepository.getAll();
  return sendSuccess(res, data);
});

retrosRoutes.post("/", async (req, res) => {
  const input = req.body as any;

  if (!input?.sprintId || !input?.template) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Missing required retro fields" });
  }

  const template = input.template as RetroTemplate;
  if (!VALID_TEMPLATES.has(template)) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Invalid retro template" });
  }

  const created = await retrosRepository.create({
    sprintId: String(input.sprintId),
    template,
    isInProgress: Boolean(input.isInProgress ?? true),
    areCardsAnonymous: Boolean(input.areCardsAnonymous ?? false)
  } as Omit<Retro, "id">);

  return sendSuccess(res, created, { location: `/api/retros/${created.id}` });
});

retrosRoutes.get("/:id", async (req, res) => {
  const retro = await retrosRepository.getById(req.params.id);
  if (!retro) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro not found" });
  return sendSuccess(res, retro);
});

retrosRoutes.patch("/:id", async (req, res) => {
  const patch = req.body as any;

  const updatePatch: Partial<Omit<Retro, "id">> = {
    ...(patch?.sprintId !== undefined ? { sprintId: String(patch.sprintId) } : {}),
    ...(patch?.template !== undefined ? { template: String(patch.template) as RetroTemplate } : {}),
    ...(patch?.isInProgress !== undefined ? { isInProgress: Boolean(patch.isInProgress) } : {}),
    ...(patch?.areCardsAnonymous !== undefined ? { areCardsAnonymous: Boolean(patch.areCardsAnonymous) } : {})
  };

  // If template is being updated, validate it to keep data consistent.
  if (patch?.template !== undefined) {
    const candidate = patch.template as RetroTemplate;
    if (!VALID_TEMPLATES.has(candidate)) {
      throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Invalid retro template" });
    }
  }

  const updated = await retrosRepository.update(req.params.id, updatePatch);
  if (!updated) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro not found" });
  return sendSuccess(res, updated);
});

retrosRoutes.delete("/:id", async (req, res) => {
  const deleted = await retrosRepository.delete(req.params.id);
  if (!deleted) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro not found" });
  return sendEmptySuccess(res, { deletedId: req.params.id });
});

