// Developed by Sydney Edwards
import type { Request } from "express";

/**
 * Express `req.body` as a plain object — avoids `any` while keeping handlers explicit.
 * Malformed bodies yield `{}` (handlers should still validate required fields).
 */
export function getJsonBody(req: Request): Record<string, unknown> {
  const b = req.body;
  if (b != null && typeof b === "object" && !Array.isArray(b)) {
    return b as Record<string, unknown>;
  }
  return {};
}
