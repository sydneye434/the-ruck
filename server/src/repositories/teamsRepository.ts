// Developed by Sydney Edwards
import type { Team } from "@the-ruck/shared";
import { createJsonRepository } from "../data/persistence/jsonFileRepository";
import { getDataFilePath } from "../data/storagePaths";

function nowIso() {
  return new Date().toISOString();
}

const base = createJsonRepository<Team>({
  filePath: getDataFilePath("teams.json")
});

export const teamsRepository = {
  getAll: base.getAll,
  getById: base.getById,

  async create(input: Omit<Team, "id">) {
    return base.create({ ...input, createdAt: nowIso(), updatedAt: nowIso() });
  },

  async update(id: string, patch: Partial<Omit<Team, "id">>) {
    return base.update(id, { ...patch, updatedAt: nowIso() });
  },

  delete: base.delete
};

