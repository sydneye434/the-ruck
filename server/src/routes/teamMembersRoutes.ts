import { Router } from "express";
import { teamMembersRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";

export const teamMembersRoutes = Router();

teamMembersRoutes.get("/", async (_req, res) => {
  const data = await teamMembersRepository.getAll();
  return sendSuccess(res, data);
});

teamMembersRoutes.post("/", async (req, res) => {
  const input = req.body as any;
  if (!input?.name || !input?.role || !input?.avatar || typeof input.defaultAvailabilityDays !== "number") {
    throw new HttpError({
      statusCode: 400,
      code: "INVALID_REQUEST",
      message: "Missing required team member fields"
    });
  }

  const created = await teamMembersRepository.create({
    name: String(input.name),
    role: input.role,
    avatar: {
      color: String(input.avatar.color),
      initials: String(input.avatar.initials)
    },
    defaultAvailabilityDays: input.defaultAvailabilityDays,
    // Default to active on create unless explicitly provided.
    isActive: input.isActive === undefined ? true : Boolean(input.isActive)
  });

  return sendSuccess(res, created, { location: `/api/team-members/${created.id}` });
});

teamMembersRoutes.get("/:id", async (req, res) => {
  const member = await teamMembersRepository.getById(req.params.id);
  if (!member) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Team member not found" });
  }
  return sendSuccess(res, member);
});

teamMembersRoutes.patch("/:id", async (req, res) => {
  const patch = req.body as any;
  const activeAlias = patch?.active;
  const updated = await teamMembersRepository.update(req.params.id, {
    ...(patch?.name !== undefined ? { name: String(patch.name) } : {}),
    ...(patch?.role !== undefined ? { role: patch.role } : {}),
    ...(patch?.avatar !== undefined
      ? { avatar: { color: String(patch.avatar.color), initials: String(patch.avatar.initials) } }
      : {}),
    ...(patch?.defaultAvailabilityDays !== undefined
      ? { defaultAvailabilityDays: Number(patch.defaultAvailabilityDays) }
      : {}),
    ...(patch?.isActive !== undefined ? { isActive: Boolean(patch.isActive) } : {}),
    ...(activeAlias !== undefined ? { isActive: Boolean(activeAlias) } : {})
  });

  if (!updated) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Team member not found" });
  }

  return sendSuccess(res, updated);
});

teamMembersRoutes.delete("/:id", async (req, res) => {
  const deleted = await teamMembersRepository.delete(req.params.id);
  if (!deleted) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Team member not found" });
  }
  return sendEmptySuccess(res, { deletedId: req.params.id });
});

