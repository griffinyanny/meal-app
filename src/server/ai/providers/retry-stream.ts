// BUG-035 · ONE SILENT RETRY, AND ONLY BEFORE THE FIRST TOKEN.
//
// A real generation stalled server-side and produced nothing (S45, Layer B
// round 1). The user-facing half of that is fixed at the client; this is the
// half that tries to make the failure not happen.
//
// WHY THE RETRY LIVES HERE, at the model layer, rather than in the route or the
// client:
//
//   • The client has already received a 200 with an open body by the time a
//     stall is detectable, so a client retry is a whole second REQUEST — which
//     re-runs `consumeDailyAiBudget` and quietly bills the daily cap twice per
//     attempt. Retrying inside the request that already paid cannot.
//   • This is the only layer that can see "has a token arrived yet" without
//     re-implementing the SDK's response plumbing.
//
// WHY IT STOPS AT THE FIRST TOKEN. `streamObject` parses partial JSON
// progressively, so once a delta has gone downstream the client holds half a
// document. Starting a second attempt would push a fresh, overlapping JSON into
// that same parser and corrupt it. A stall after the first token therefore ends
// the stream and becomes the client's named failure instead — which is exactly
// the case the observed capture was NOT (it came back empty, nothing emitted).
import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3StreamPart,
} from "@ai-sdk/provider";

export interface StreamRetryOptions {
  /**
   * How long ONE attempt may go without producing its first token before it is
   * abandoned. Not a total budget: a stream that has started producing is never
   * cut off by this, because by then the slow path is a slow SUCCESS.
   */
  attemptTimeoutMs: number;
  /** Total attempts, including the first. 2 = one retry. */
  maxAttempts?: number;
  /** Observability hook; called with why the previous attempt was abandoned. */
  onRetry?: (reason: string) => void;
}

/** A stream part that carries model output, as opposed to protocol framing. */
function isToken(part: LanguageModelV3StreamPart): boolean {
  return part.type === "text-delta" || part.type === "tool-input-delta";
}

class AttemptTimeout extends Error {
  constructor(ms: number) {
    super(`no first token within ${ms}ms`);
    this.name = "AttemptTimeout";
  }
}

/**
 * Runs one attempt and resolves as soon as its outcome is decided:
 *
 *   • `committed` — a token arrived. `buffered` holds everything read so far
 *     (in order), `reader` is positioned to continue.
 *   • `failed`    — it errored, aborted, or timed out with nothing emitted.
 *
 * The distinction is the whole point of the file: only `failed` may be retried.
 */
async function runAttempt(
  model: LanguageModelV3,
  options: LanguageModelV3CallOptions,
  attemptTimeoutMs: number
): Promise<
  | {
      outcome: "committed";
      buffered: LanguageModelV3StreamPart[];
      reader: ReadableStreamDefaultReader<LanguageModelV3StreamPart>;
    }
  | { outcome: "failed"; error: unknown }
> {
  // Its own controller so a timed-out attempt is actually cancelled upstream
  // rather than left running while we start another one. Chained to the caller's
  // signal so an outer abort still tears everything down.
  const controller = new AbortController();
  const outerSignal = options.abortSignal;
  const abortOuter = () => controller.abort(outerSignal?.reason);
  if (outerSignal) {
    if (outerSignal.aborted) abortOuter();
    else outerSignal.addEventListener("abort", abortOuter, { once: true });
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
    if (timer) clearTimeout(timer);
    outerSignal?.removeEventListener("abort", abortOuter);
  };

  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const err = new AttemptTimeout(attemptTimeoutMs);
        controller.abort(err);
        reject(err);
      }, attemptTimeoutMs);
    });

    const { stream } = await Promise.race([
      model.doStream({ ...options, abortSignal: controller.signal }),
      timeout,
    ]);

    const reader = stream.getReader();
    const buffered: LanguageModelV3StreamPart[] = [];

    // Read until the attempt commits (a token) or dies. Protocol framing
    // (stream-start, text-start) is buffered rather than forwarded, so a
    // discarded attempt never leaks a half-opened frame downstream.
    for (;;) {
      const { value, done } = await Promise.race([reader.read(), timeout]);

      if (done) {
        // Closed without ever producing a token: an empty week, which is the
        // exact shape the observed failure took.
        return { outcome: "failed", error: new Error("stream closed empty") };
      }
      if (value.type === "error") {
        return { outcome: "failed", error: value.error };
      }

      buffered.push(value);
      if (isToken(value)) {
        cleanup();
        return { outcome: "committed", buffered, reader };
      }
    }
  } catch (error) {
    return { outcome: "failed", error };
  } finally {
    cleanup();
  }
}

/**
 * Wraps a model so `doStream` transparently makes a second attempt when the
 * first dies before producing anything.
 *
 * Everything else on the model is passed straight through — this is deliberately
 * NOT a general retry layer. `generateStructured` already has `withRetry`, and
 * one-shot calls have no "first token" to reason about.
 */
export function withStreamRetry(
  model: LanguageModelV3,
  { attemptTimeoutMs, maxAttempts = 2, onRetry }: StreamRetryOptions
): LanguageModelV3 {
  return {
    ...model,
    doStream: async (options: LanguageModelV3CallOptions) => {
      let lastError: unknown = new Error("no attempt ran");

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const result = await runAttempt(model, options, attemptTimeoutMs);

        if (result.outcome === "committed") {
          const { buffered, reader } = result;
          return {
            stream: new ReadableStream<LanguageModelV3StreamPart>({
              start(controller) {
                for (const part of buffered) controller.enqueue(part);
              },
              async pull(controller) {
                try {
                  const { value, done } = await reader.read();
                  if (done) controller.close();
                  else controller.enqueue(value);
                } catch (error) {
                  // Past the commit point there is no second chance — surface it
                  // as an error part so `streamObject` reports a dead stream
                  // rather than a silently truncated plan.
                  controller.enqueue({ type: "error", error });
                  controller.close();
                }
              },
              cancel: (reason) => reader.cancel(reason),
            }),
          };
        }

        lastError = result.error;
        // An OUTER abort is the caller giving up (total budget spent, request
        // cancelled). Retrying through it would ignore the only stop signal the
        // route has.
        if (options.abortSignal?.aborted) break;
        if (attempt < maxAttempts) {
          onRetry?.(lastError instanceof Error ? lastError.message : String(lastError));
        }
      }

      // Every attempt died before producing anything. Report it in-band so the
      // SDK's onFinish sees an error and the client's failure path fires.
      return {
        stream: new ReadableStream<LanguageModelV3StreamPart>({
          start(controller) {
            controller.enqueue({ type: "error", error: lastError });
            controller.close();
          },
        }),
      };
    },
  };
}
