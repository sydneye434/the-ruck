import { Router } from "express";
import type { RetroActionItem } from "@the-ruck/shared";
import { retroActionItemsRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";

export const retroActionItemsRoutes = Router({ mergeParams: true });

retroActionItemsRoutes.get("/", async (req, res) => {
  const retroId = (req.params as any).id as string;
  const all = await retroActionItemsRepository.getAll();
  const data = all.filter((i) => i.retroId === retroId);
  return sendSuccess(res, data);
});

retroActionItemsRoutes.post("/", async (req, res) => {
  const retroId = (req.params as any).id as string;
  const input = req.body as any;

  if (!input?.description || !input?.ownerMemberId || !input?.dueDate) {
    throw new HttpError({
      statusCode: 400,
      code: "INVALID_REQUEST",
      message: "Missing required action item fields"
    });
  }

  const created = await retroActionItemsRepository.create({
    retroId,
    description: String(input.description),
    ownerMemberId: String(input.ownerMemberId),
    dueDate: String(input.dueDate),
    isCompleted: Boolean(input.isCompleted)
  } as Omit<RetroActionItem, "id">);

  return sendSuccess(res, created, { location: `/api/retros/${retroId}/action-items/${created.id}` });
});

retroActionItemsRoutes.get("/:actionItemId", async (req, res) => {
  const retroId = (req.params as any).id as string;
  const item = await retroActionItemsRepository.getById(req.params.actionItemId);
  if (!item || item.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Action item not found" });
  }
  return sendSuccess(res, item);
});

retroActionItemsRoutes.patch("/:actionItemId", async (req, res) => {
  const retroId = (req.params as any).id as string;
  const patch = req.body as any;

  const existing = await retroActionItemsRepository.getById(req.params.actionItemId);
  if (!existing || existing.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Action item not found" });
  }

  const updated = await retroActionItemsRepository.update(req.params.actionItemId, {
    ...(patch?.description !== undefined ? { description: String(patch.description) } : {}),
    ...(patch?.ownerMemberId !== undefined ? { ownerMemberId: String(patch.ownerMemberId) } : {}),
    ...(patch?.dueDate !== undefined ? { dueDate: String(patch.dueDate) } : {}),
    ...(patch?.isCompleted !== undefined ? { isCompleted: Boolean(patch.isCompleted) } : {}),
    retroId
  });

  if (!updated) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Action item not found" });
  return sendSuccess(res, updated);
});

retroActionItemsRoutes.delete("/:actionItemId", async (req, res) => {
  const retroId = (req.params as any).id as string;
  const existing = await retroActionItemsRepository.getById(req.params.actionItemId);
  if (!existing || existing.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Action item not found" });
  }

  const deleted = await retroActionItemsRepository.delete(req.params.actionItemId);
  if (!deleted) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Action item not found" });

  return sendEmptySuccess(res, { deletedId: req.params.actionItemId });
});

