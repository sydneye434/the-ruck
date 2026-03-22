// Developed by Sydney Edwards
import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import type { ApiError } from "@the-ruck/shared";
import { HttpError } from "../utils/httpError";
import { sendErrorResponse } from "../utils/envelope";

export function errorHandler(): ErrorRequestHandler {
  return (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    const normalized: ApiError = (() => {
      if (err instanceof HttpError) {
        return { message: err.message, code: err.code };
      }

      if (err && typeof err === "object" && "message" in err) {
        const msg = (err as { message?: unknown }).message;
        return { message: typeof msg === "string" ? msg : String(msg), code: "INTERNAL_ERROR" };
      }

      return { message: "Internal server error", code: "INTERNAL_ERROR" };
    })();

    const statusCode = err instanceof HttpError ? err.statusCode : 500;
    return sendErrorResponse(res, statusCode, normalized);
  };
}

