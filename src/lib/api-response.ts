import { AppError, HTTP_STATUS } from "@/lib/errors";

/** Wraps a REST handler: JSON success body, AppErrors mapped to their HTTP status, everything else 500. */
export async function apiHandler<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    return Response.json({ data: await fn() });
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json(
        { error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } },
        { status: HTTP_STATUS[error.code] },
      );
    }
    console.error(error);
    return Response.json({ error: { code: "INTERNAL", message: "Something went wrong." } }, { status: 500 });
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION", "Request body must be valid JSON.");
  }
}
