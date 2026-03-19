import type { Identifiable } from "../types/domain";

export type Repository<T extends Identifiable> = {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(input: Omit<T, "id">): Promise<T>;
  update(id: string, patch: Partial<Omit<T, "id">>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
};

