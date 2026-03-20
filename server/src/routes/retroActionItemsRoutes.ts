import { Router } from "express";
import type { RetroActionItem } from "@the-ruck/shared";
import { retroActionItemsRepository, retrosRepository, teamMembersRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";
import { asyncHandler } from "../utils/asyncHandler";

export const retroActionItemsRoutes = Router({ mergeParams: true });
const VALID_STATUSES = new Set<RetroActionItem["status"]>(["open", "in_progress", "complete"]);

retroActionItemsRoutes.get("/", asyncHandler(async (req, res) => {
  const retroId = (req.params as any).id as string;
  const all = await retroActionItemsRepository.getAll();
  const data = all.filter((i) => i.retroId === retroId);
  return sendSuccess(res, data);
}));

retroActionItemsRoutes.post("/", asyncHandler(async (req, res) => {
  const retroId = (req.params as any).id as string;
  const input = req.body as any;

  if (!input?.description || !input?.ownerId) {
    throw new HttpError({
      statusCode: 400,
      code: "INVALID_REQUEST",
      message: "Missing required action item fields"
    });
  }
  const retro = await retrosRepository.getById(retroId);
  if (!retro) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro not found" });
  const owner = await teamMembersRepository.getById(String(input.ownerId));
  if (!owner || !owner.isActive) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "ownerId must be an active team member" });
  }
  const status = input.status ?? "open";
  if (!VALID_STATUSES.has(status)) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Invalid action item status" });
  }

  const created = await retroActionItemsRepository.create({
    retroId,
    sprintId: retro.sprintId,
    description: String(input.description),
    ownerId: String(input.ownerId),
    dueDate: input.dueDate ? String(input.dueDate) : null,
    status,
    carriedOverFromId: input.carriedOverFromId ? String(input.carriedOverFromId) : null
  } as Omit<RetroActionItem, "id">);

  return sendSuccess(res, created, { location: `/api/retros/${retroId}/action-items/${created.id}` });
}));

retroActionItemsRoutes.get("/:actionItemId", asyncHandler(async (req, res) => {
  const retroId = (req.params as any).id as string;
  const item = await retroActionItemsRepository.getById(req.params.actionItemId);
  if (!item || item.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Action item not found" });
  }
  return sendSuccess(res, item);
}));

retroActionItemsRoutes.patch("/:actionItemId", asyncHandler(async (req, res) => {
  const retroId = (req.params as any).id as string;
  const patch = req.body as any;

  const existing = await retroActionItemsRepository.getById(req.params.actionItemId);
  if (!existing || existing.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Action item not found" });
  }

  if (patch?.ownerId !== undefined) {
    const owner = await teamMembersRepository.getById(String(patch.ownerId));
    if (!owner || !owner.isActive) {
      throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "ownerId must be an active team member" });
    }
  }
  if (patch?.status !== undefined && !VALID_STATUSES.has(String(patch.status) as RetroActionItem["status"])) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Invalid action item status" });
  }

  const updated = await retroActionItemsRepository.update(req.params.actionItemId, {
    ...(patch?.description !== undefined ? { description: String(patch.description) } : {}),
    ...(patch?.ownerId !== undefined ? { ownerId: String(patch.ownerId) } : {}),
    ...(patch?.dueDate !== undefined ? { dueDate: patch.dueDate ? String(patch.dueDate) : null } : {}),
    ...(patch?.status !== undefined ? { status: String(patch.status) as RetroActionItem["status"] } : {}),
    ...(patch?.carriedOverFromId !== undefined
      ? { carriedOverFromId: patch.carriedOverFromId ? String(patch.carriedOverFromId) : null }
      : {}),
    retroId
  });

  if (!updated) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Action item not found" });
  return sendSuccess(res, updated);
}));

retroActionItemsRoutes.delete("/:actionItemId", asyncHandler(async (req, res) => {
  const retroId = (req.params as any).id as string;
  const existing = await retroActionItemsRepository.getById(req.params.actionItemId);
  if (!existing || existing.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Action item not found" });
  }

  const deleted = await retroActionItemsRepository.delete(req.params.actionItemId);
  if (!deleted) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Action item not found" });

  return sendEmptySuccess(res, { deletedId: req.params.actionItemId });
}));

