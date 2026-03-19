import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    // Requirement: method, path, status code, response time.
    // eslint-disable-next-line no-console
    console.log(
      `[api] ${req.method} ${req.path} -> ${res.statusCode} (${elapsedMs.toFixed(1)}ms)`
    );
  });

  next();
}

