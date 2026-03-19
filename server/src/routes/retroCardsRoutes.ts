import { Router } from "express";
import type { RetroCard, RetroPhase } from "@the-ruck/shared";
import { retroCardsRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";

export const retroCardsRoutes = Router({ mergeParams: true });

const VALID_PHASES = new Set<RetroPhase>(["reflect", "discuss", "action_items"]);

function asPhase(v: unknown): RetroPhase | null {
  return typeof v === "string" && VALID_PHASES.has(v as RetroPhase) ? (v as RetroPhase) : null;
}

retroCardsRoutes.get("/", async (req, res) => {
  const retroId = (req.params as any).id as string;
  const all = await retroCardsRepository.getAll();
  const data = all.filter((c) => c.retroId === retroId);
  return sendSuccess(res, data);
});

retroCardsRoutes.post("/", async (req, res) => {
  const retroId = (req.params as any).id as string;
  const input = req.body as any;

  const phase = asPhase(input?.phase);
  if (!retroId || !input?.content || !input?.authorMemberId || !phase) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Missing required card fields" });
  }

  const created = await retroCardsRepository.create({
    retroId,
    phase,
    content: String(input.content),
    authorMemberId: String(input.authorMemberId),
    upvotes: typeof input.upvotes === "number" ? input.upvotes : 0,
    clusterKey: input.clusterKey ? String(input.clusterKey) : undefined
  } as Omit<RetroCard, "id">);

  return sendSuccess(res, created, { location: `/api/retros/${retroId}/cards/${created.id}` });
});

retroCardsRoutes.get("/:cardId", async (req, res) => {
  const retroId = (req.params as any).id as string;
  const card = await retroCardsRepository.getById(req.params.cardId);
  if (!card || card.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro card not found" });
  }
  return sendSuccess(res, card);
});

retroCardsRoutes.patch("/:cardId", async (req, res) => {
  const retroId = (req.params as any).id as string;
  const patch = req.body as any;

  const updatePatch: Partial<Omit<RetroCard, "id">> = {
    ...(patch?.phase !== undefined && asPhase(patch.phase) !== null ? { phase: asPhase(patch.phase)! } : {}),
    ...(patch?.content !== undefined ? { content: String(patch.content) } : {})
  };

  // Ensure we never change retroId from the URL param.
  // Also: the JSON repo will happily accept missing fields; keep patch minimal.
  if (patch?.authorMemberId !== undefined) {
    if (!patch.authorMemberId) {
      throw new HttpError({
        statusCode: 400,
        code: "INVALID_REQUEST",
        message: "authorMemberId cannot be empty"
      });
    }
    updatePatch.authorMemberId = String(patch.authorMemberId);
  }
  if (patch?.upvotes !== undefined && typeof patch.upvotes === "number") {
    updatePatch.upvotes = patch.upvotes;
  }
  if (patch?.clusterKey !== undefined) {
    updatePatch.clusterKey = patch.clusterKey ? String(patch.clusterKey) : undefined;
  }

  const existing = await retroCardsRepository.getById(req.params.cardId);
  if (!existing || existing.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro card not found" });
  }

  const updated = await retroCardsRepository.update(req.params.cardId, {
    ...updatePatch,
    retroId
  });

  if (!updated) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro card not found" });
  return sendSuccess(res, updated);
});

retroCardsRoutes.delete("/:cardId", async (req, res) => {
  const retroId = (req.params as any).id as string;
  const existing = await retroCardsRepository.getById(req.params.cardId);
  if (!existing || existing.retroId !== retroId) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro card not found" });
  }

  const deleted = await retroCardsRepository.delete(req.params.cardId);
  if (!deleted) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro card not found" });
  return sendEmptySuccess(res, { deletedId: req.params.cardId });
});

