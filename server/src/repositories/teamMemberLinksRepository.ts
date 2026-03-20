// Developed by Sydney Edwards
import type { TeamMemberLink } from "@the-ruck/shared";
import { createJsonRepository } from "../data/persistence/jsonFileRepository";
import { getDataFilePath } from "../data/storagePaths";

function nowIso() {
  return new Date().toISOString();
}

const base = createJsonRepository<TeamMemberLink>({
  filePath: getDataFilePath("team-member-links.json")
});

export const teamMemberLinksRepository = {
  getAll: base.getAll,
  getById: base.getById,

  async create(input: Omit<TeamMemberLink, "id">) {
    return base.create({ ...input, createdAt: nowIso(), updatedAt: nowIso() });
  },

  async update(id: string, patch: Partial<Omit<TeamMemberLink, "id">>) {
    return base.update(id, { ...patch, updatedAt: nowIso() });
  },

  delete: base.delete
};

