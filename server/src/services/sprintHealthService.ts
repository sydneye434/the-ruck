// Developed by Sydney Edwards
import {
  calculateHealthScore,
  calculateTeamAvailability,
  type HealthScoreResult
} from "@the-ruck/shared";
import type { Sprint, SprintFinalHealthScore } from "@the-ruck/shared";
import {
  retroActionItemsRepository,
  retroCardsRepository,
  retrosRepository,
  sprintDaySnapshotRepository,
  sprintsRepository,
  storiesRepository,
  teamMembersRepository
} from "../repositories";

export type HealthHistoryRow = {
  sprintId: string;
  name: string;
  total: number;
  grade: string;
  completedAt?: string;
};

function previousSprintHealthTotal(
  sprintId: string,
  completedSorted: Sprint[]
): number | null {
  const idx = completedSorted.findIndex((s) => s.id === sprintId);
  if (idx >= 0) {
    return completedSorted[idx + 1]?.finalHealthScore?.total ?? null;
  }
  const other = completedSorted.filter((s) => s.id !== sprintId);
  return other[0]?.finalHealthScore?.total ?? null;
}

export type BuildHealthOptions = {
  /** For velocity / "as of" date (e.g. sprint end when completing). */
  asOfDateYmd?: string;
};

/**
 * Computes sprint health from current repositories (pure calculation in @the-ruck/shared).
 */
export async function buildHealthPayloadForSprintId(
  sprintId: string,
  options?: BuildHealthOptions
): Promise<{
  healthScore: HealthScoreResult;
  calculatedAt: string;
  history: HealthHistoryRow[];
} | null> {
  const sprint = await sprintsRepository.getById(sprintId);
  if (!sprint) return null;

  const snapshots = await sprintDaySnapshotRepository.findBySprintId(sprintId);
  const allStories = await storiesRepository.getAll();
  const stories = allStories.filter((s) => s.sprintId === sprintId);
  const allSprints = await sprintsRepository.getAll();
  const retros = await retrosRepository.getAll();
  const retro = retros.find((r) => r.sprintId === sprintId) ?? null;
  const cards = await retroCardsRepository.getAll();
  const retroCardCount = retro ? cards.filter((c) => c.retroId === retro.id).length : 0;
  const allActions = await retroActionItemsRepository.getAll();
  const actionItems = retro ? allActions.filter((a) => a.retroId === retro.id) : [];

  const completedSorted = allSprints
    .filter((s) => s.status === "completed" && s.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  const lastTwoRetroIds = completedSorted
    .filter((s) => s.id !== sprintId)
    .slice(0, 2)
    .map((s) => retros.find((r) => r.sprintId === s.id)?.id)
    .filter((id): id is string => Boolean(id));

  const previousRetrosActionItems = allActions.filter((a) => lastTwoRetroIds.includes(a.retroId));

  const members = await teamMembersRepository.getAll();
  const activeMembers = members
    .filter((m) => m.isActive)
    .map((m) => ({
      id: m.id,
      defaultAvailabilityDays: m.defaultAvailabilityDays,
      capacityMultiplier: m.capacityMultiplier ?? 100
    }));
  const liveRatio = calculateTeamAvailability(activeMembers, {}).teamAvailabilityRatio;

  const healthScore = calculateHealthScore({
    asOfDateYmd: options?.asOfDateYmd,
    snapshots,
    sprint,
    stories,
    retro,
    retroCardCount,
    actionItems,
    previousRetrosActionItems,
    previousSprintHealthTotal: previousSprintHealthTotal(sprintId, completedSorted),
    liveTeamAvailabilityRatio: liveRatio
  });

  const history: HealthHistoryRow[] = completedSorted
    .filter((s) => s.finalHealthScore != null && typeof s.finalHealthScore.total === "number")
    .slice(0, 5)
    .reverse()
    .map((s) => ({
      sprintId: s.id,
      name: s.name,
      total: s.finalHealthScore!.total,
      grade: s.finalHealthScore!.grade,
      completedAt: s.completedAt
    }));

  return {
    healthScore,
    calculatedAt: new Date().toISOString(),
    history
  };
}

export function toStoredFinalHealth(health: HealthScoreResult): SprintFinalHealthScore {
  return {
    total: health.total,
    grade: health.grade,
    components: health.components as unknown as SprintFinalHealthScore["components"]
  };
}
