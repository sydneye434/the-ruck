import { Router } from "express";
import path from "node:path";
import type { Retro, RetroTemplate } from "@the-ruck/shared";
import { retroCardsRoutes } from "./retroCardsRoutes";
import { retroActionItemsRoutes } from "./retroActionItemsRoutes";
import { retroActionItemsRepository, retroCardsRepository, retrosRepository, sprintsRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";
import { getCarriedOverItems } from "../utils/getCarriedOverItems";
import { asyncHandler } from "../utils/asyncHandler";

export const retrosRoutes = Router();

const VALID_TEMPLATES = new Set<RetroTemplate>([
  "start_stop_continue",
  "4ls",
  "mad_sad_glad"
]);
const retroTemplates = require(path.join(process.cwd(), "shared", "retroTemplates.js")) as {
  TEMPLATES: Record<string, { columns: Array<{ key: string; label: string; color: string }> }>;
};

retrosRoutes.use("/:id/cards", retroCardsRoutes);
retrosRoutes.use("/:id/action-items", retroActionItemsRoutes);

retrosRoutes.get("/", asyncHandler(async (req, res) => {
  const sprintId = req.query.sprintId ? String(req.query.sprintId) : null;
  const all = await retrosRepository.getAll();
  const data = sprintId ? all.filter((r) => r.sprintId === sprintId) : all;
  return sendSuccess(res, data);
}));

retrosRoutes.post("/", asyncHandler(async (req, res) => {
  const input = req.body as any;
  if (!input?.sprintId || !input?.template) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Missing required retro fields" });
  }

  const sprint = await sprintsRepository.getById(String(input.sprintId));
  if (!sprint) throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Sprint does not exist" });

  const duplicate = (await retrosRepository.getAll()).find((r) => r.sprintId === sprint.id);
  if (duplicate) {
    throw new HttpError({ statusCode: 409, code: "RETRO_EXISTS", message: "A retro already exists for this sprint" });
  }

  const template = input.template as RetroTemplate;
  if (!VALID_TEMPLATES.has(template)) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Invalid retro template" });
  }

  const created = await retrosRepository.create({
    sprintId: sprint.id,
    title: input.title ? String(input.title) : `${sprint.name} Retrospective`,
    template,
    phase: input.phase ?? "reflect",
    isAnonymous: Boolean(input.isAnonymous ?? false)
  } as Omit<Retro, "id">);
  return sendSuccess(res, created, { location: `/api/retros/${created.id}` });
}));

retrosRoutes.get("/:id", asyncHandler(async (req, res) => {
  const retro = await retrosRepository.getById(req.params.id);
  if (!retro) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro not found" });

  const [allCards, allActionItems, carriedOverItems] = await Promise.all([
    retroCardsRepository.getAll(),
    retroActionItemsRepository.getAll(),
    getCarriedOverItems(retro.id)
  ]);
  const columns = retroTemplates.TEMPLATES[retro.template]?.columns ?? [];
  const cards = allCards.filter((c) => c.retroId === retro.id);
  const actionItems = allActionItems.filter((a) => a.retroId === retro.id);

  return sendSuccess(res, { retro, columns, cards, actionItems, carriedOverItems });
}));

retrosRoutes.patch("/:id", asyncHandler(async (req, res) => {
  const patch = req.body as any;
  const updatePatch: Partial<Omit<Retro, "id">> = {
    ...(patch?.title !== undefined ? { title: String(patch.title) } : {}),
    ...(patch?.isAnonymous !== undefined ? { isAnonymous: Boolean(patch.isAnonymous) } : {})
  };

  if (patch?.phase !== undefined) {
    if (!["reflect", "discuss", "action_items"].includes(String(patch.phase))) {
      throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Invalid retro phase" });
    }
    updatePatch.phase = patch.phase;
  }
  if (patch?.template !== undefined) {
    const candidate = String(patch.template) as RetroTemplate;
    if (!VALID_TEMPLATES.has(candidate)) {
      throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Invalid retro template" });
    }
    updatePatch.template = candidate;
  }

  const updated = await retrosRepository.update(req.params.id, updatePatch);
  if (!updated) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro not found" });
  return sendSuccess(res, updated);
}));

retrosRoutes.delete("/:id", asyncHandler(async (req, res) => {
  const deleted = await retrosRepository.delete(req.params.id);
  if (!deleted) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro not found" });
  return sendEmptySuccess(res, { deletedId: req.params.id });
}));

