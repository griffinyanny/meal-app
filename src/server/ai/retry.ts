import { TRPCError } from "@trpc/server";
import { APICallError } from "ai";

// Transient network conditions worth retrying. ENOTFOUND/ECONNREFUSED are
// excluded — a bad host or refused connection won't fix itself on retry.
const RETRYABLE_NETWORK_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "EPIPE"]);

function isRetryable(error: unknown): boolean {
  // AI SDK provider errors carry an authoritative isRetryable flag derived from
  // the HTTP status (429, 5xx → retryable; 4xx → not).
  if (APICallError.isInstance(error)) {
    return error.isRetryable;
  }
  // Node network errors expose a structured `code` — match on that, not the
  // human-readable message which is brittle and prone to false positives.
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return RETRYABLE_NETWORK_CODES.has((error as { code: string }).code);
  }
  return false;
}

export async function withRetry<T>(
  task: string,
  fn: () => Promise<T>,
  maxRetries = 1
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && isRetryable(error)) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  // Transient failures (rate limits, timeouts, upstream 5xx) are worth retrying,
  // so promise the user another go. Anything else (content policy, invalid
  // request, malformed output) won't improve on retry — give a distinct message
  // so we don't send them in circles. The raw error is logged at the call site.
  const transient = isRetryable(lastError);
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: transient
      ? "Chef is busy — try again in a moment"
      : "The chef couldn't complete that request. Try rephrasing, or a different recipe.",
    cause: lastError,
  });
}
