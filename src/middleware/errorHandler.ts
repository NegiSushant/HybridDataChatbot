import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  status?: number;
  statusCode?: number;
}

/**
 * Global error handler middleware.
 * Must be the last middleware registered in Express.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.status ?? err.statusCode ?? 500;
  const isDev = process.env.NODE_ENV === "development";

  console.error(`❌ Error [${statusCode}]:`, err.message);
  if (isDev) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal Server Error" : "Request Error",
    message: err.message ?? "An unexpected error occurred",
    ...(isDev && { stack: err.stack }),
  });
}
