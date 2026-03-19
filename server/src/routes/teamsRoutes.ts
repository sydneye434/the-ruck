import { Router, type NextFunction, type Request, type Response } from "express";
import { buildTeamTree, withComputedDepth, type Team } from "@the-ruck/shared";
import { teamMemberLinksRepository, teamMembersRepository, teamsRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";

export const teamsRoutes = Router();
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

function ensureNoCircularParent(teams: Team[], teamId: string, nextParentId: string | null) {
  if (!nextParentId) return;
  if (nextParentId === teamId) {
    throw new HttpError({
      statusCode: 400,
      code: "INVALID_REQUEST",
      message: "A team cannot be its own parent"
    });
  }

  const byId = new Map(teams.map((team) => [team.id, team]));
  const visited = new Set<string>();

  const walkAncestors = (cursorId: string | null): void => {
    if (!cursorId) return; // reached root (null parent) safely
    if (cursorId === teamId) {
      throw new HttpError({
        statusCode: 400,
        code: "INVALID_REQUEST",
        message: "Circular reference detected in team hierarchy"
      });
    }
    if (visited.has(cursorId)) return;
    visited.add(cursorId);
    const parentId = byId.get(cursorId)?.parentTeamId ?? null;
    walkAncestors(parentId);
  };

  walkAncestors(nextParentId);
}

teamsRoutes.get("/", asyncHandler(async (_req: Request, res: Response) => {
  const teams = await teamsRepository.getAll();
  return sendSuccess(res, withComputedDepth(teams));
}));

teamsRoutes.get("/memberships", asyncHandler(async (_req: Request, res: Response) => {
  const links = await teamMemberLinksRepository.getAll();
  return sendSuccess(res, links);
}));

teamsRoutes.get("/tree", asyncHandler(async (_req: Request, res: Response) => {
  const teams = await teamsRepository.getAll();
  return sendSuccess(res, buildTeamTree(teams));
}));

teamsRoutes.post("/", asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as any;
  if (!input?.name) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Team name is required" });
  }

  const all = await teamsRepository.getAll();
  const parentTeamId = input.parentTeamId ? String(input.parentTeamId) : null;
  // Validate parent exists when provided.
  if (parentTeamId && !all.some((team) => team.id === parentTeamId)) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Parent team not found" });
  }

  const created = await teamsRepository.create({
    name: String(input.name),
    description: input.description ? String(input.description) : "",
    parentTeamId,
    color: String(input.color ?? "var(--color-accent)")
  });
  return sendSuccess(res, created, { location: `/api/teams/${created.id}` });
}));

teamsRoutes.patch("/:id", asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const patch = req.body as any;
  const all = await teamsRepository.getAll();
  const existing = all.find((team) => team.id === id);
  if (!existing) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Team not found" });
  }

  const nextParentTeamId =
    patch?.parentTeamId === undefined
      ? existing.parentTeamId
      : patch.parentTeamId
        ? String(patch.parentTeamId)
        : null;
  ensureNoCircularParent(all, id, nextParentTeamId);

  if (nextParentTeamId && !all.some((team) => team.id === nextParentTeamId)) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Parent team not found" });
  }

  const updated = await teamsRepository.update(id, {
    ...(patch?.name !== undefined ? { name: String(patch.name) } : {}),
    ...(patch?.description !== undefined ? { description: String(patch.description) } : {}),
    ...(patch?.color !== undefined ? { color: String(patch.color) } : {}),
    ...(patch?.parentTeamId !== undefined ? { parentTeamId: nextParentTeamId } : {})
  });
  if (!updated) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Team not found" });
  }
  return sendSuccess(res, updated);
}));

teamsRoutes.delete("/:id", asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const mode = String(req.query.mode ?? "single");
  if (!["single", "cascade"].includes(mode)) {
    throw new HttpError({
      statusCode: 400,
      code: "INVALID_REQUEST",
      message: "Delete mode must be single or cascade"
    });
  }

  const teams = await teamsRepository.getAll();
  if (!teams.some((team) => team.id === id)) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Team not found" });
  }

  const descendants = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    descendants.add(current);
    teams
      .filter((team) => team.parentTeamId === current)
      .forEach((child) => queue.push(child.id));
  }

  if (mode === "single") {
    const children = teams.filter((team) => team.parentTeamId === id);
    for (const child of children) {
      await teamsRepository.update(child.id, { parentTeamId: null });
    }
    await teamsRepository.delete(id);
    return sendEmptySuccess(res, { deletedId: id, mode });
  }

  // cascade
  const links = await teamMemberLinksRepository.getAll();
  for (const teamId of descendants) {
    await teamsRepository.delete(teamId);
  }
  for (const link of links.filter((link) => descendants.has(link.teamId))) {
    await teamMemberLinksRepository.delete(link.id);
  }
  return sendEmptySuccess(res, { deletedId: id, mode, deletedCount: descendants.size });
}));

teamsRoutes.post("/:id/members", asyncHandler(async (req: Request, res: Response) => {
  const teamId = req.params.id;
  const memberId = String((req.body as any)?.memberId ?? "");
  if (!memberId) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "memberId is required" });
  }

  const [team, member] = await Promise.all([
    teamsRepository.getById(teamId),
    teamMembersRepository.getById(memberId)
  ]);
  if (!team) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Team not found" });
  if (!member) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Member not found" });

  const existing = await teamMemberLinksRepository.getAll();
  if (existing.some((x) => x.teamId === teamId && x.memberId === memberId)) {
    return sendSuccess(res, { teamId, memberId, alreadyMember: true });
  }

  const created = await teamMemberLinksRepository.create({
    teamId,
    memberId,
    joinedAt: new Date().toISOString()
  });
  return sendSuccess(res, created);
}));

teamsRoutes.get("/:id/members", asyncHandler(async (req: Request, res: Response) => {
  const teamId = req.params.id;
  const links = await teamMemberLinksRepository.getAll();
  return sendSuccess(
    res,
    links.filter((link) => link.teamId === teamId)
  );
}));

teamsRoutes.delete("/:id/members/:memberId", asyncHandler(async (req: Request, res: Response) => {
  const teamId = req.params.id;
  const memberId = req.params.memberId;
  const links = await teamMemberLinksRepository.getAll();
  const target = links.find((x) => x.teamId === teamId && x.memberId === memberId);
  if (!target) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Membership not found" });
  }
  await teamMemberLinksRepository.delete(target.id);
  return sendEmptySuccess(res, { teamId, memberId });
}));

