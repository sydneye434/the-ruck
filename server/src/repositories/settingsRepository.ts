import type { AppSettings } from "@the-ruck/shared";
import { createJsonRepository } from "../data/persistence/jsonFileRepository";
import { getDataFilePath } from "../data/storagePaths";

function nowIso() {
  return new Date().toISOString();
}

const base = createJsonRepository<AppSettings>({
  filePath: getDataFilePath("settings.json")
});

export const settingsRepository = {
  getAll: base.getAll,
  getById: base.getById,

  async create(input: Omit<AppSettings, "id">) {
    return base.create({ ...input, createdAt: nowIso(), updatedAt: nowIso() });
  },

  async update(id: string, patch: Partial<Omit<AppSettings, "id">>) {
    return base.update(id, { ...patch, updatedAt: nowIso() });
  },

  delete: base.delete,

  // Treat settings as a singleton: we always use the "first" record.
  async getOrCreateDefault() {
    const existing = (await base.getAll())[0];
    if (existing) return existing;

    return base.create({
      sprintLengthDefaultDays: 10,
      velocityWindowN: 3,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  }
};

