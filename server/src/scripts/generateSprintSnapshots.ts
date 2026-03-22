// Developed by Sydney Edwards
import type { Sprint, Story } from "@the-ruck/shared";
import { burndownProgressSCurve, formatLocalDateYmd, listWorkingDaysInRange } from "@the-ruck/shared";
import { sprintDaySnapshotRepository } from "../repositories";

function lerpInt(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function adjustColumnCounts(
  c: { backlog: number; in_progress: number; in_review: number; done: number },
  totalStories: number
) {
  const out = { ...c };
  let sum = out.backlog + out.in_progress + out.in_review + out.done;
  while (sum > totalStories) {
    if (out.backlog > 0) out.backlog -= 1;
    else if (out.in_progress > 0) out.in_progress -= 1;
    else if (out.in_review > 0) out.in_review -= 1;
    else if (out.done > 0) out.done -= 1;
    sum -= 1;
  }
  while (sum < totalStories) {
    out.backlog += 1;
    sum += 1;
  }
  return out;
}

/**
 * Generates one snapshot per working day with an S-curve burndown of points
 * and interpolated column counts from "all backlog" → final story distribution.
 */
export async function generateSprintSnapshots(sprint: Sprint, stories: Story[]): Promise<void> {
  const scoped = stories.filter((s) => s.sprintId === sprint.id);
  if (scoped.length === 0) return;

  const totalStories = scoped.length;
  const totalPoints = scoped.reduce((a, s) => a + (s.storyPoints ?? 0), 0);
  if (totalPoints <= 0) return;

  const finalCol = {
    backlog: scoped.filter((s) => s.boardColumn === "backlog").length,
    in_progress: scoped.filter((s) => s.boardColumn === "in_progress").length,
    in_review: scoped.filter((s) => s.boardColumn === "in_review").length,
    done: scoped.filter((s) => s.boardColumn === "done").length
  };
  const startCol = { backlog: totalStories, in_progress: 0, in_review: 0, done: 0 };

  let workingDays = listWorkingDaysInRange(sprint.startDate, sprint.endDate);
  const today = formatLocalDateYmd(new Date());
  if (sprint.status === "active") {
    workingDays = workingDays.filter((d) => d < today);
  }

  const n = workingDays.length;
  if (n === 0) return;

  for (let i = 0; i < n; i++) {
    const date = workingDays[i];
    const tLin = n === 1 ? 1 : i / (n - 1);
    const w = burndownProgressSCurve(tLin);
    const storiesByColumn = adjustColumnCounts(
      {
        backlog: lerpInt(startCol.backlog, finalCol.backlog, w),
        in_progress: lerpInt(startCol.in_progress, finalCol.in_progress, w),
        in_review: lerpInt(startCol.in_review, finalCol.in_review, w),
        done: lerpInt(startCol.done, finalCol.done, w)
      },
      totalStories
    );

    const finalCompletedPoints = scoped
      .filter((s) => s.boardColumn === "done")
      .reduce((a, s) => a + (s.storyPoints ?? 0), 0);
    const completedPoints = Math.min(totalPoints, Math.round(finalCompletedPoints * w));
    const remainingPoints = Math.max(0, totalPoints - completedPoints);

    await sprintDaySnapshotRepository.upsertBySprintAndDate({
      sprintId: sprint.id,
      date,
      totalPoints,
      completedPoints,
      remainingPoints,
      storiesByColumn
    });
  }
}
