import type { ActivityLog } from "@the-ruck/shared";
import { activityLogRepository } from "../repositories";

type ActivityInput = Omit<ActivityLog, "id" | "createdAt"> & { createdAt?: string };

export function logActivity(input: ActivityInput) {
  void (async () => {
    try {
      await activityLogRepository.create({
        type: input.type,
        description: input.description,
        actorId: input.actorId ?? null,
        metadata: input.metadata ?? {},
        createdAt: input.createdAt ?? new Date().toISOString()
      });
    } catch {
      // Fire-and-forget by design: never break primary operation.
    }
  })();
}
