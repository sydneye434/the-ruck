import { Router } from "express";
import path from "node:path";
import type { RetroCard } from "@the-ruck/shared";
import { retroCardsRepository, retrosRepository, teamMembersRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";
import { asyncHandler } from "../utils/asyncHandler";

export const retroCardsRoutes = Router({ mergeParams: true });

const retroTemplates = require(path.join(process.cwd(), "shared", "retroTemplates.js")) as {
  TEMPLATES: Record<string, { columns: Array<{ key: string }> }>;
};

retroCardsRoutes.get("/", asyncHandler(async (req, res) => {
  const retroId = (req.params as any).id as string;
  const all = await retroCardsRepository.getAll();
  const data = all.filter((c) => c.retroId === retroId);
  return sendSuccess(res, data);
}));

retroCardsRoutes.post("/", asyncHandler(async (req, res) => {
  const retroId = (req.params as any).id as string;
  const input = req.body as any;

  if (!retroId || !input?.content || !input?.authorId || !input?.columnKey) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Missing required card fields" });
  }
  if (String(input.content).trim().length > 500) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Card content exceeds 500 characters" });
  }
  const retro = await retrosRepository.getById(retroId);
  if (!retro) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro not found" });
  const template = retroTemplates.TEMPLATES[retro.template];
  const validColumnKeys = new Set((template?.columns ?? []).map((c) => c.key));
  if (!validColumnKeys.has(String(input.columnKey))) {
    throw new HttpError({ statusCode: 400, code: "INVALID_COLUMN_KEY", message: "Invalid columnKey for template" });
  }
  const member = await teamMembersRepository.getById(String(input.authorId));
  if (!member) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "authorId must be a valid team member" });
  }

  const created = await retroCardsRepository.create({
    retroId,
    columnKey: String(input.columnKey),
    content: String(input.content),
    authorId: String(input.authorId),
    upvotes: Array.isArray(input.upvotes) ? input.upvotes.map(String) : [],
    groupId: input.groupId === null || input.groupId === undefined ? null : String(input.groupId)
  } as Omit<RetroCard, "id">);

  return sendSuccess(res, created, { location: `/api/retros/${retroId}/cards/${created.id}` });
}));

retroCardsRoutes.get("/:cardId", asyncHandler(async (req, res) => {
  const retroId = (req.params as any).id as string;
  const card = await retroCardsRepository.getById(req.params.cardId);
  if (!card || card.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro card not found" });
  }
  return sendSuccess(res, card);
}));

retroCardsRoutes.patch("/:cardId", asyncHandler(async (req, res) => {
  const retroId = (req.params as any).id as string;
  const patch = req.body as any;

  const updatePatch: Partial<Omit<RetroCard, "id">> = {
    ...(patch?.columnKey !== undefined ? { columnKey: String(patch.columnKey) } : {}),
    ...(patch?.content !== undefined ? { content: String(patch.content) } : {}),
    ...(patch?.authorId !== undefined ? { authorId: String(patch.authorId) } : {}),
    ...(patch?.groupId !== undefined
      ? { groupId: patch.groupId === null ? null : String(patch.groupId) }
      : {})
  };
  if (patch?.upvotes !== undefined && Array.isArray(patch.upvotes)) {
    updatePatch.upvotes = patch.upvotes.map(String);
  }
  if (patch?.content !== undefined && String(patch.content).trim().length > 500) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Card content exceeds 500 characters" });
  }

  const existing = await retroCardsRepository.getById(req.params.cardId);
  if (!existing || existing.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro card not found" });
  }
  if (patch?.columnKey !== undefined) {
    const retro = await retrosRepository.getById(retroId);
    if (!retro) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro not found" });
    const template = retroTemplates.TEMPLATES[retro.template];
    const validColumnKeys = new Set((template?.columns ?? []).map((c) => c.key));
    if (!validColumnKeys.has(String(patch.columnKey))) {
      throw new HttpError({ statusCode: 400, code: "INVALID_COLUMN_KEY", message: "Invalid columnKey for template" });
    }
  }

  const updated = await retroCardsRepository.update(req.params.cardId, {
    ...updatePatch,
    retroId
  });

  if (!updated) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro card not found" });
  return sendSuccess(res, updated);
}));

retroCardsRoutes.delete("/:cardId", asyncHandler(async (req, res) => {
  const retroId = (req.params as any).id as string;
  const existing = await retroCardsRepository.getById(req.params.cardId);
  if (!existing || existing.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro card not found" });
  }

  const deleted = await retroCardsRepository.delete(req.params.cardId);
  if (!deleted) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro card not found" });
  return sendEmptySuccess(res, { deletedId: req.params.cardId });
}));

retroCardsRoutes.post("/:cardId/upvote", asyncHandler(async (req, res) => {
  const retroId = (req.params as any).id as string;
  const memberId = req.body?.memberId ? String(req.body.memberId) : null;
  if (!memberId) throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "memberId is required" });
  const card = await retroCardsRepository.getById(req.params.cardId);
  if (!card || card.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro card not found" });
  }

  const upvotes = new Set(card.upvotes ?? []);
  if (upvotes.has(memberId)) upvotes.delete(memberId);
  else upvotes.add(memberId);

  const updated = await retroCardsRepository.update(card.id, { upvotes: [...upvotes] });
  return sendSuccess(res, updated);
}));

retroCardsRoutes.post("/:cardId/group", asyncHandler(async (req, res) => {
  const retroId = (req.params as any).id as string;
  const card = await retroCardsRepository.getById(req.params.cardId);
  if (!card || card.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro card not found" });
  }
  const groupId = req.body?.groupId === null || req.body?.groupId === undefined ? null : String(req.body.groupId);
  const updated = await retroCardsRepository.update(card.id, { groupId });
  return sendSuccess(res, updated);
}));

