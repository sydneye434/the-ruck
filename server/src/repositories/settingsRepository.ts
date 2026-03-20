// Developed by Sydney Edwards
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
    if (existing) {
      const patch: Partial<Omit<AppSettings, "id">> = {};
      if ((existing as any).sprintLengthDays == null && (existing as any).sprintLengthDefaultDays != null) {
        patch.sprintLengthDays = Number((existing as any).sprintLengthDefaultDays) || 10;
      }
      if ((existing as any).velocityWindow == null && (existing as any).velocityWindowN != null) {
        patch.velocityWindow = (Number((existing as any).velocityWindowN) as 1 | 2 | 3 | 5) || 3;
      }
      if (existing.storyPointScale == null) patch.storyPointScale = "fibonacci";
      if (existing.defaultRetroTemplate == null) patch.defaultRetroTemplate = "start_stop_continue";
      if (existing.defaultAnonymous == null) patch.defaultAnonymous = false;
      if (existing.dateFormat == null) patch.dateFormat = "MM/DD/YYYY";
      if (Object.keys(patch).length === 0) return existing;
      const updated = await base.update(existing.id, { ...patch, updatedAt: nowIso() });
      return updated ?? { ...existing, ...patch };
    }

    return base.create({
      sprintLengthDays: 10,
      velocityWindow: 3,
      storyPointScale: "fibonacci",
      defaultRetroTemplate: "start_stop_continue",
      defaultAnonymous: false,
      dateFormat: "MM/DD/YYYY",
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  }
};

