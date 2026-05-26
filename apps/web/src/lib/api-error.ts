import type { ApiError } from "@/types";

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, body: ApiError) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? {};
  }
}

export const isHttpError = (e: unknown): e is HttpError => e instanceof HttpError;

export const errorMessage = (e: unknown): string => {
  if (isHttpError(e)) return e.message || e.code;
  if (e instanceof Error) return e.message;
  return "unexpected_error";
};
