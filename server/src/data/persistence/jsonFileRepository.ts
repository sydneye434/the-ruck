// Developed by Sydney Edwards
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Repository } from "@the-ruck/shared";

type Identifiable = { id: string };

type JsonRepositoryOptions<T extends Identifiable> = {
  filePath: string;
  // When true, the repository stores `T[]` directly in the file.
  // If false, it stores `{ items: T[] }`.
  storeShape?: "array" | "object";
};

const fileLocks = new Map<string, Promise<void>>();

async function withFileLock(filePath: string, fn: () => Promise<void>): Promise<void> {
  const prev = fileLocks.get(filePath) ?? Promise.resolve();
  let resolveNext!: () => void;
  const next = new Promise<void>((resolve) => {
    resolveNext = resolve;
  });
  // Ensure lock continues even if a previous operation failed.
  fileLocks.set(filePath, prev.catch(() => undefined).then(() => next));

  try {
    await prev;
    await fn();
  } finally {
    resolveNext();
  }
}

async function ensureFileExists(filePath: string, storeShape: "array" | "object") {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const initial = storeShape === "array" ? [] : { items: [] };
    await fs.writeFile(filePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readItems<T extends Identifiable>(
  filePath: string,
  storeShape: "array" | "object"
): Promise<T[]> {
  const raw = await fs.readFile(filePath, "utf8");
  if (!raw.trim()) return [];

  const parsed = JSON.parse(raw) as unknown;
  if (storeShape === "array") return (parsed as T[]) ?? [];
  return ((parsed as { items?: T[] })?.items as T[]) ?? [];
}

async function writeItems<T extends Identifiable>(
  filePath: string,
  storeShape: "array" | "object",
  items: T[]
): Promise<void> {
  const next = storeShape === "array" ? items : { items };
  await fs.writeFile(filePath, JSON.stringify(next, null, 2), "utf8");
}

export function createJsonRepository<T extends Identifiable>(
  options: JsonRepositoryOptions<T>
): Repository<T> {
  const storeShape = options.storeShape ?? "array";

  async function getAll(): Promise<T[]> {
    await ensureFileExists(options.filePath, storeShape);
    let items: T[] = [];
    await withFileLock(options.filePath, async () => {
      items = await readItems<T>(options.filePath, storeShape);
    });
    return items;
  }

  async function getById(id: string): Promise<T | null> {
    const items = await getAll();
    return items.find((x) => x.id === id) ?? null;
  }

  async function create(input: Omit<T, "id">): Promise<T> {
    let created: T;
    await ensureFileExists(options.filePath, storeShape);
    await withFileLock(options.filePath, async () => {
      const items = await readItems<T>(options.filePath, storeShape);
      const next: T = { ...(input as Omit<T, "id">), id: randomUUID() } as T;
      items.push(next);
      await writeItems(options.filePath, storeShape, items);
      created = next;
    });
    return created!;
  }

  async function update(id: string, patch: Partial<Omit<T, "id">>): Promise<T | null> {
    let updated: T | null = null;
    await ensureFileExists(options.filePath, storeShape);
    await withFileLock(options.filePath, async () => {
      const items = await readItems<T>(options.filePath, storeShape);
      const idx = items.findIndex((x) => x.id === id);
      if (idx === -1) return;

      const next = { ...items[idx], ...(patch as Partial<T>), id };
      items[idx] = next;
      updated = next;
      await writeItems(options.filePath, storeShape, items);
    });
    return updated;
  }

  async function deleteById(id: string): Promise<boolean> {
    let deleted = false;
    await ensureFileExists(options.filePath, storeShape);
    await withFileLock(options.filePath, async () => {
      const items = await readItems<T>(options.filePath, storeShape);
      const next = items.filter((x) => x.id !== id);
      deleted = next.length !== items.length;
      if (!deleted) return;
      await writeItems(options.filePath, storeShape, next);
    });
    return deleted;
  }

  return {
    getAll,
    getById,
    create,
    update,
    delete: deleteById
  };
}

