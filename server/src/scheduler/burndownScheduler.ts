// Developed by Sydney Edwards
import cron from "node-cron";
import { sprintsRepository } from "../repositories";
import { recordBurndownSnapshotForSprintAsync } from "../services/burndownSnapshotService";

export function startBurndownScheduler(): void {
  cron.schedule("59 23 * * *", async () => {
    try {
      const active = (await sprintsRepository.getAll()).filter((s) => s.status === "active");
      for (const s of active) {
        await recordBurndownSnapshotForSprintAsync(s.id);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[burndown] cron snapshot run failed", e);
    }
  });
  // eslint-disable-next-line no-console
  console.log("Burndown snapshot scheduler registered");
}
