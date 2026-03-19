import { Router } from "express";
import { teamMembersRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";

export const teamMembersRoutes = Router();

function normalizeMember(member: any) {
  const roleType =
    member.roleType ??
    (typeof member.role === "string" && member.role.toLowerCase().includes("scrum")
      ? "scrum_master"
      : typeof member.role === "string" && member.role.toLowerCase().includes("product")
        ? "product_owner"
        : "team_member");
  return {
    ...member,
    roleType,
    coordinatorTitle: member.coordinatorTitle ?? "",
    capacityMultiplier: typeof member.capacityMultiplier === "number" ? member.capacityMultiplier : 100,
    coordinatorTeamIds: Array.isArray(member.coordinatorTeamIds) ? member.coordinatorTeamIds : []
  };
}

teamMembersRoutes.get("/", async (_req, res) => {
  const data = (await teamMembersRepository.getAll()).map(normalizeMember);
  return sendSuccess(res, data);
});

teamMembersRoutes.post("/", async (req, res) => {
  const input = req.body as any;
  if (!input?.name || !input?.avatar || typeof input.defaultAvailabilityDays !== "number") {
    throw new HttpError({
      statusCode: 400,
      code: "INVALID_REQUEST",
      message: "Missing required team member fields"
    });
  }

  const roleType =
    input.roleType ??
    (typeof input.role === "string" && input.role.toLowerCase().includes("scrum")
      ? "scrum_master"
      : typeof input.role === "string" && input.role.toLowerCase().includes("product")
        ? "product_owner"
        : "team_member");

  if (roleType === "coordinator" && !String(input.coordinatorTitle ?? "").trim()) {
    throw new HttpError({
      statusCode: 400,
      code: "INVALID_REQUEST",
      message: "Coordinator title is required when roleType is coordinator"
    });
  }

  const created = await teamMembersRepository.create({
    name: String(input.name),
    roleType,
    coordinatorTitle:
      roleType === "coordinator" ? String(input.coordinatorTitle ?? "").trim() : undefined,
    avatar: {
      color: String(input.avatar.color),
      initials: String(input.avatar.initials)
    },
    defaultAvailabilityDays: input.defaultAvailabilityDays,
    capacityMultiplier:
      typeof input.capacityMultiplier === "number" ? Number(input.capacityMultiplier) : 100,
    // Default to active on create unless explicitly provided.
    isActive: input.isActive === undefined ? true : Boolean(input.isActive),
    coordinatorTeamIds: Array.isArray(input.coordinatorTeamIds)
      ? input.coordinatorTeamIds.map((x: unknown) => String(x))
      : []
  });

  return sendSuccess(res, created, { location: `/api/team-members/${created.id}` });
});

teamMembersRoutes.get("/:id", async (req, res) => {
  const member = await teamMembersRepository.getById(req.params.id);
  if (!member) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Team member not found" });
  }
  return sendSuccess(res, normalizeMember(member));
});

teamMembersRoutes.patch("/:id", async (req, res) => {
  const patch = req.body as any;
  const activeAlias = patch?.active;
  const roleType = patch?.roleType;
  if (roleType === "coordinator" && patch?.coordinatorTitle !== undefined && !String(patch.coordinatorTitle).trim()) {
    throw new HttpError({
      statusCode: 400,
      code: "INVALID_REQUEST",
      message: "Coordinator title is required when roleType is coordinator"
    });
  }
  const updated = await teamMembersRepository.update(req.params.id, {
    ...(patch?.name !== undefined ? { name: String(patch.name) } : {}),
    ...(patch?.roleType !== undefined ? { roleType: patch.roleType } : {}),
    ...(patch?.coordinatorTitle !== undefined
      ? { coordinatorTitle: patch.coordinatorTitle ? String(patch.coordinatorTitle) : undefined }
      : {}),
    ...(patch?.avatar !== undefined
      ? { avatar: { color: String(patch.avatar.color), initials: String(patch.avatar.initials) } }
      : {}),
    ...(patch?.defaultAvailabilityDays !== undefined
      ? { defaultAvailabilityDays: Number(patch.defaultAvailabilityDays) }
      : {}),
    ...(patch?.capacityMultiplier !== undefined
      ? { capacityMultiplier: Number(patch.capacityMultiplier) }
      : {}),
    ...(patch?.coordinatorTeamIds !== undefined
      ? {
          coordinatorTeamIds: Array.isArray(patch.coordinatorTeamIds)
            ? patch.coordinatorTeamIds.map((x: unknown) => String(x))
            : []
        }
      : {}),
    ...(patch?.isActive !== undefined ? { isActive: Boolean(patch.isActive) } : {}),
    ...(activeAlias !== undefined ? { isActive: Boolean(activeAlias) } : {})
  });

  if (!updated) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Team member not found" });
  }

  return sendSuccess(res, normalizeMember(updated));
});

teamMembersRoutes.delete("/:id", async (req, res) => {
  const deleted = await teamMembersRepository.delete(req.params.id);
  if (!deleted) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Team member not found" });
  }
  return sendEmptySuccess(res, { deletedId: req.params.id });
});

