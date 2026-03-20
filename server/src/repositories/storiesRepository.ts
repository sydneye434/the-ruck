// Developed by Sydney Edwards
import type { Story } from "@the-ruck/shared";
import { createJsonRepository } from "../data/persistence/jsonFileRepository";
import { getDataFilePath } from "../data/storagePaths";

function nowIso() {
  return new Date().toISOString();
}

const base = createJsonRepository<Story>({
  filePath: getDataFilePath("stories.json")
});

export const storiesRepository = {
  getAll: base.getAll,
  getById: base.getById,

  async create(input: Omit<Story, "id">) {
    return base.create({ ...input, createdAt: nowIso(), updatedAt: nowIso() });
  },

  async update(id: string, patch: Partial<Omit<Story, "id">>) {
    return base.update(id, { ...patch, updatedAt: nowIso() });
  },

  delete: base.delete
};

