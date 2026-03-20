// Developed by Sydney Edwards
import type { RetroCard } from "@the-ruck/shared";
import { createJsonRepository } from "../data/persistence/jsonFileRepository";
import { getDataFilePath } from "../data/storagePaths";

function nowIso() {
  return new Date().toISOString();
}

const base = createJsonRepository<RetroCard>({
  filePath: getDataFilePath("retro-cards.json")
});

export const retroCardsRepository = {
  getAll: base.getAll,
  getById: base.getById,

  async create(input: Omit<RetroCard, "id">) {
    return base.create({ ...input, createdAt: nowIso(), updatedAt: nowIso() });
  },

  async update(id: string, patch: Partial<Omit<RetroCard, "id">>) {
    return base.update(id, { ...patch, updatedAt: nowIso() });
  },

  delete: base.delete
};

