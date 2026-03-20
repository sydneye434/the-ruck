// Developed by Sydney Edwards
import type { Sprint } from "@the-ruck/shared";
import { createJsonRepository } from "../data/persistence/jsonFileRepository";
import { getDataFilePath } from "../data/storagePaths";

function nowIso() {
  return new Date().toISOString();
}

const base = createJsonRepository<Sprint>({
  filePath: getDataFilePath("sprints.json")
});

export const sprintsRepository = {
  getAll: base.getAll,
  getById: base.getById,

  async create(input: Omit<Sprint, "id">) {
    return base.create({ ...input, createdAt: nowIso(), updatedAt: nowIso() });
  },

  async update(id: string, patch: Partial<Omit<Sprint, "id">>) {
    return base.update(id, { ...patch, updatedAt: nowIso() });
  },

  delete: base.delete
};

