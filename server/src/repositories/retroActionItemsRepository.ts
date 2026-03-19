import type { RetroActionItem } from "@the-ruck/shared";
import { createJsonRepository } from "../data/persistence/jsonFileRepository";
import { getDataFilePath } from "../data/storagePaths";

function nowIso() {
  return new Date().toISOString();
}

const base = createJsonRepository<RetroActionItem>({
  filePath: getDataFilePath("retro-action-items.json")
});

export const retroActionItemsRepository = {
  getAll: base.getAll,
  getById: base.getById,

  async create(input: Omit<RetroActionItem, "id">) {
    return base.create({ ...input, createdAt: nowIso(), updatedAt: nowIso() });
  },

  async update(id: string, patch: Partial<Omit<RetroActionItem, "id">>) {
    return base.update(id, { ...patch, updatedAt: nowIso() });
  },

  delete: base.delete
};

