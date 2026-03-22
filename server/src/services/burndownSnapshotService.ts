// Developed by Sydney Edwards
import type { Sprint, SprintDaySnapshot, Story } from "@the-ruck/shared";
import { formatLocalDateYmd } from "@the-ruck/shared";
import { sprintDaySnapshotRepository, sprintsRepository, storiesRepository } from "../repositories";

export function computeSnapshotPayload(
  sprintId: string,
  stories: Story[],
  dateStr: string
): Omit<SprintDaySnapshot, "id"> {
  const scoped = stories.filter((s) => s.sprintId === sprintId);
  const totalPoints = scoped.reduce((a, s) => a + s.storyPoints, 0);
  const completedPoints = scoped
    .filter((s) => s.boardColumn === "done")
    .reduce((a, s) => a + s.storyPoints, 0);
  const storiesByColumn = {
    backlog: 0,
    in_progress: 0,
    in_review: 0,
    done: 0
  };
  for (const s of scoped) {
    storiesByColumn[s.boardColumn] += 1;
  }
  return {
    sprintId,
    date: dateStr,
    totalPoints,
    completedPoints,
    remainingPoints: Math.max(0, totalPoints - completedPoints),
    storiesByColumn
  };
}

/** Fire-and-forget safe: logs errors, never throws to callers. */
export function recordBurndownSnapshotForSprint(sprintId: string, dateOverride?: string): void {
  void (async () => {
    try {
      const sprint = await sprintsRepository.getById(sprintId);
      if (!sprint) return;
      if (sprint.status !== "active" && sprint.status !== "completed") return;

      const stories = await storiesRepository.getAll();
      const dateStr = dateOverride ?? formatLocalDateYmd(new Date());
      const payload = computeSnapshotPayload(sprintId, stories, dateStr);
      await sprintDaySnapshotRepository.upsertBySprintAndDate(payload);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[burndown] snapshot failed for sprint", sprintId, e);
    }
  })();
}

export async function recordBurndownSnapshotForSprintAsync(sprintId: string, dateOverride?: string): Promise<void> {
  const sprint = await sprintsRepository.getById(sprintId);
  if (!sprint) return;
  if (sprint.status !== "active" && sprint.status !== "completed") return;
  const stories = await storiesRepository.getAll();
  const dateStr = dateOverride ?? formatLocalDateYmd(new Date());
  const payload = computeSnapshotPayload(sprintId, stories, dateStr);
  await sprintDaySnapshotRepository.upsertBySprintAndDate(payload);
}

export function shouldRecordForStoryMove(
  previous: Story | undefined,
  nextColumn: Story["boardColumn"] | undefined
): boolean {
  if (!previous || nextColumn === undefined) return false;
  if (previous.boardColumn === nextColumn) return false;
  return previous.boardColumn === "done" || nextColumn === "done";
}

export function shouldRecordForSprintActivation(
  sprint: Sprint,
  patch: { status?: Sprint["status"] }
): boolean {
  return patch.status === "active" && sprint.status !== "active";
}
