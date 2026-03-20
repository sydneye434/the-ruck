// Developed by Sydney Edwards
import type { Response } from "express";
import type { ApiResponse, ApiError } from "@the-ruck/shared";

export function sendSuccess<T>(res: Response, data: T, meta?: Record<string, unknown>) {
  const payload: ApiResponse<T> = { data, error: null, meta };
  res.json(payload);
}

export function sendEmptySuccess(res: Response, meta?: Record<string, unknown>) {
  const payload: ApiResponse<null> = { data: null, error: null, meta };
  res.json(payload);
}

export function sendErrorResponse(
  res: Response,
  statusCode: number,
  error: ApiError,
  meta?: Record<string, unknown>
) {
  const payload: ApiResponse<null> = { data: null, error, meta };
  res.status(statusCode).json(payload);
}

