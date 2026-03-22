// Developed by Sydney Edwards
import { randomUUID } from "node:crypto";
import type { SprintDaySnapshot } from "@the-ruck/shared";
import { atomicJsonArrayMutate, createJsonRepository } from "../data/persistence/jsonFileRepository";
import { getDataFilePath } from "../data/storagePaths";

const base = createJsonRepository<SprintDaySnapshot>({
  filePath: getDataFilePath("sprint-day-snapshots.json")
});

export const sprintDaySnapshotRepository = {
  getAll: base.getAll,
  getById: base.getById,

  async findBySprintId(sprintId: string): Promise<SprintDaySnapshot[]> {
    const all = await base.getAll();
    return all.filter((s) => s.sprintId === sprintId).sort((a, b) => a.date.localeCompare(b.date));
  },

  async upsertBySprintAndDate(payload: Omit<SprintDaySnapshot, "id">): Promise<SprintDaySnapshot> {
    return atomicJsonArrayMutate<SprintDaySnapshot>(getDataFilePath("sprint-day-snapshots.json"), (items) => {
      const hit = items.find((x) => x.sprintId === payload.sprintId && x.date === payload.date);
      if (hit) {
        const updated = { ...hit, ...payload, id: hit.id } as SprintDaySnapshot;
        const nextItems = items.map((x) => (x.id === hit.id ? updated : x));
        return { nextItems, result: updated };
      }
      const created = { ...payload, id: randomUUID() } as SprintDaySnapshot;
      return { nextItems: [...items, created], result: created };
    });
  },

  async createMany(items: Array<Omit<SprintDaySnapshot, "id">>): Promise<void> {
    for (const item of items) {
      await base.create(item);
    }
  },

  delete: base.delete
};
