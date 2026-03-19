import type { TeamMember } from "@the-ruck/shared";
import { createJsonRepository } from "../data/persistence/jsonFileRepository";
import { getDataFilePath } from "../data/storagePaths";

function nowIso() {
  return new Date().toISOString();
}

const base = createJsonRepository<TeamMember>({
  filePath: getDataFilePath("team-members.json")
});

export const teamMembersRepository = {
  getAll: base.getAll,
  getById: base.getById,

  async create(input: Omit<TeamMember, "id">) {
    // Repository owns timestamp fields so callers don't need to.
    return base.create({ ...input, createdAt: nowIso(), updatedAt: nowIso() });
  },

  async update(id: string, patch: Partial<Omit<TeamMember, "id">>) {
    return base.update(id, { ...patch, updatedAt: nowIso() });
  },

  delete: base.delete
};

