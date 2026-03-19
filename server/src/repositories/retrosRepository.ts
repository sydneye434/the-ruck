import type { Retro } from "@the-ruck/shared";
import { createJsonRepository } from "../data/persistence/jsonFileRepository";
import { getDataFilePath } from "../data/storagePaths";

function nowIso() {
  return new Date().toISOString();
}

const base = createJsonRepository<Retro>({
  filePath: getDataFilePath("retros.json")
});

export const retrosRepository = {
  getAll: base.getAll,
  getById: base.getById,

  async create(input: Omit<Retro, "id">) {
    return base.create({ ...input, createdAt: nowIso(), updatedAt: nowIso() });
  },

  async update(id: string, patch: Partial<Omit<Retro, "id">>) {
    return base.update(id, { ...patch, updatedAt: nowIso() });
  },

  delete: base.delete
};

