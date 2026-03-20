// Developed by Sydney Edwards
import type { ActivityLog } from "@the-ruck/shared";
import { createJsonRepository } from "../data/persistence/jsonFileRepository";
import { getDataFilePath } from "../data/storagePaths";

function nowIso() {
  return new Date().toISOString();
}

const base = createJsonRepository<ActivityLog>({
  filePath: getDataFilePath("activity-log.json")
});

export const activityLogRepository = {
  getAll: base.getAll,
  getById: base.getById,

  async create(input: Omit<ActivityLog, "id">) {
    return base.create({
      ...input,
      createdAt: input.createdAt ?? nowIso()
    });
  },

  // Activity logs are append-only in practice, but keep interface parity.
  async update(id: string, patch: Partial<Omit<ActivityLog, "id">>) {
    return base.update(id, patch);
  },

  delete: base.delete
};
