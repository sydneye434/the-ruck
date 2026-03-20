// Developed by Sydney Edwards
import { retroActionItemsRepository, retrosRepository, sprintsRepository } from "../repositories";
import { HttpError } from "./httpError";

export async function getCarriedOverItems(retroId: string) {
  const retro = await retrosRepository.getById(retroId);
  if (!retro) {
    throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Retro not found" });
  }

  const sprint = await sprintsRepository.getById(retro.sprintId);
  if (!sprint) return [];

  const [allRetros, allSprints, allActionItems] = await Promise.all([
    retrosRepository.getAll(),
    sprintsRepository.getAll(),
    retroActionItemsRepository.getAll()
  ]);

  const sprintById = new Map(allSprints.map((s) => [s.id, s]));
  const currentStart = new Date(sprint.startDate).getTime();

  const previousRetroIds = allRetros
    .filter((r) => r.id !== retroId)
    .filter((r) => {
      const linkedSprint = sprintById.get(r.sprintId);
      if (!linkedSprint) return false;
      return new Date(linkedSprint.startDate).getTime() < currentStart;
    })
    .map((r) => r.id);

  const previousRetroSet = new Set(previousRetroIds);
  return allActionItems
    .filter((item) => previousRetroSet.has(item.retroId))
    .filter((item) => item.status === "open" || item.status === "in_progress")
    .sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
}
