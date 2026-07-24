export type SafeErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "STALE_DATA"
  | "TIMEOUT"
  | "SERVICE_UNAVAILABLE"
  | "MAINTENANCE"
  | "UNKNOWN";

export class ApplicationError extends Error {
  constructor(
    readonly code: SafeErrorCode,
    message: string,
    readonly correlationId: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof ApplicationError) return error.message;
  return "The request could not be completed safely.";
}
