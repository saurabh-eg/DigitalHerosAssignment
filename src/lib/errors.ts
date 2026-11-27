export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "INTERNAL";

export const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  INTERNAL: 500,
};

/** Expected, user-safe failure. Anything else is treated as an internal error and never shown verbatim. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthenticated = (message = "Please sign in to continue.") => new AppError("UNAUTHENTICATED", message);
export const forbidden = (message = "You do not have access to this.") => new AppError("FORBIDDEN", message);
export const notFound = (message = "Not found.") => new AppError("NOT_FOUND", message);
export const conflict = (message: string) => new AppError("CONFLICT", message);
