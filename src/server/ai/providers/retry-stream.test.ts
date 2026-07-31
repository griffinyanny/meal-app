import { describe, it, expect, vi } from "vitest";
import type {
  LanguageModelV3,
  LanguageModelV3StreamPart,
} from "@ai-sdk/provider";
import { withStreamRetry } from "./retry-stream";

function streamOf(
  parts: LanguageModelV3StreamPart[]
): ReadableStream<LanguageModelV3StreamPart> {
  return new ReadableStream({
    start(controller) {
      for (const p of parts) controller.enqueue(p);
      controller.close();
    },
  });
}

const START: LanguageModelV3StreamPart = { type: "stream-start", warnings: [] };
const TEXT_START: LanguageModelV3StreamPart = { type: "text-start", id: "1" };
function delta(text: string): LanguageModelV3StreamPart {
  return { type: "text-delta", id: "1", delta: text };
}

/** A model whose doStream behaviour is scripted per attempt. */
function scriptedModel(
  attempts: Array<() => Promise<{ stream: ReadableStream<LanguageModelV3StreamPart> }>>
): { model: LanguageModelV3; calls: () => number } {
  let call = 0;
  const model = {
    specificationVersion: "v3",
    provider: "test",
    modelId: "test",
    supportedUrls: {},
    doGenerate: vi.fn(),
    doStream: () => {
      const run = attempts[Math.min(call, attempts.length - 1)];
      call++;
      return run();
    },
  } as unknown as LanguageModelV3;
  return { model, calls: () => call };
}

async function drain(
  stream: ReadableStream<LanguageModelV3StreamPart>
): Promise<LanguageModelV3StreamPart[]> {
  const out: LanguageModelV3StreamPart[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out.push(value);
  }
  return out;
}

describe("withStreamRetry", () => {
  it("should pass a healthy stream through untouched, in order, with one attempt", async () => {
    const { model, calls } = scriptedModel([
      async () => ({ stream: streamOf([START, TEXT_START, delta("a"), delta("b")]) }),
    ]);

    const wrapped = withStreamRetry(model, { attemptTimeoutMs: 1000 });
    const { stream } = await wrapped.doStream({ prompt: [] } as never);

    expect(await drain(stream)).toEqual([START, TEXT_START, delta("a"), delta("b")]);
    expect(calls()).toBe(1);
  });

  it("should retry when the first attempt closes without ever producing a token", async () => {
    const { model, calls } = scriptedModel([
      // Attempt 1: opens the frame, then closes empty — the observed failure.
      async () => ({ stream: streamOf([START, TEXT_START]) }),
      async () => ({ stream: streamOf([START, TEXT_START, delta("ok")]) }),
    ]);

    const wrapped = withStreamRetry(model, { attemptTimeoutMs: 1000 });
    const { stream } = await wrapped.doStream({ prompt: [] } as never);

    // The dead attempt's framing must NOT be forwarded — the consumer sees one
    // clean stream, not two overlapping ones.
    expect(await drain(stream)).toEqual([START, TEXT_START, delta("ok")]);
    expect(calls()).toBe(2);
  });

  it("should retry when the first attempt errors before its first token", async () => {
    const boom = new Error("provider exploded");
    const { model, calls } = scriptedModel([
      async () => ({ stream: streamOf([START, { type: "error", error: boom }]) }),
      async () => ({ stream: streamOf([START, TEXT_START, delta("ok")]) }),
    ]);

    const wrapped = withStreamRetry(model, { attemptTimeoutMs: 1000 });
    const { stream } = await wrapped.doStream({ prompt: [] } as never);

    expect(await drain(stream)).toEqual([START, TEXT_START, delta("ok")]);
    expect(calls()).toBe(2);
  });

  it("should retry when the first attempt stalls past the attempt timeout", async () => {
    const { model, calls } = scriptedModel([
      // Never resolves: the stall that started BUG-035.
      () => new Promise(() => {}),
      async () => ({ stream: streamOf([START, TEXT_START, delta("ok")]) }),
    ]);

    const wrapped = withStreamRetry(model, { attemptTimeoutMs: 25 });
    const { stream } = await wrapped.doStream({ prompt: [] } as never);

    expect(await drain(stream)).toEqual([START, TEXT_START, delta("ok")]);
    expect(calls()).toBe(2);
  });

  // The rule that makes this safe: a corrupted parse is worse than a failure.
  it("should NOT retry once a token has been emitted, ending the stream with an error instead", async () => {
    const { model, calls } = scriptedModel([
      async () => {
        // Pull-based on purpose: `controller.error()` inside `start()` resets
        // the queue and discards everything already enqueued, so a start-based
        // fixture would never deliver the token this test is about.
        const parts = [START, TEXT_START, delta("half a plan")];
        let i = 0;
        return {
          stream: new ReadableStream<LanguageModelV3StreamPart>({
            pull(controller) {
              if (i < parts.length) controller.enqueue(parts[i++]);
              else controller.error(new Error("died mid-pipe"));
            },
          }),
        };
      },
      async () => ({ stream: streamOf([START, TEXT_START, delta("SHOULD NOT APPEAR")]) }),
    ]);

    const wrapped = withStreamRetry(model, { attemptTimeoutMs: 1000 });
    const { stream } = await wrapped.doStream({ prompt: [] } as never);
    const parts = await drain(stream);

    expect(calls()).toBe(1);
    expect(parts.slice(0, 3)).toEqual([START, TEXT_START, delta("half a plan")]);
    expect(parts[parts.length - 1]).toMatchObject({ type: "error" });
  });

  it("should give up after maxAttempts and report the last error in-band", async () => {
    const boom = new Error("still broken");
    const { model, calls } = scriptedModel([
      async () => ({ stream: streamOf([START, { type: "error", error: boom }]) }),
    ]);

    const wrapped = withStreamRetry(model, { attemptTimeoutMs: 1000 });
    const { stream } = await wrapped.doStream({ prompt: [] } as never);

    expect(await drain(stream)).toEqual([{ type: "error", error: boom }]);
    expect(calls()).toBe(2);
  });

  it("should honour an outer abort rather than retrying through it", async () => {
    const controller = new AbortController();
    const { model, calls } = scriptedModel([
      async () => {
        controller.abort(new Error("total budget spent"));
        return { stream: streamOf([START]) };
      },
    ]);

    const wrapped = withStreamRetry(model, { attemptTimeoutMs: 1000 });
    const { stream } = await wrapped.doStream({
      prompt: [],
      abortSignal: controller.signal,
    } as never);

    await drain(stream);
    // One attempt only: the caller gave up, so a second would ignore the only
    // stop signal the route has.
    expect(calls()).toBe(1);
  });

  it("should report why it retried, for the server log", async () => {
    const onRetry = vi.fn();
    const { model } = scriptedModel([
      async () => ({ stream: streamOf([START, TEXT_START]) }),
      async () => ({ stream: streamOf([START, TEXT_START, delta("ok")]) }),
    ]);

    const wrapped = withStreamRetry(model, { attemptTimeoutMs: 1000, onRetry });
    await drain((await wrapped.doStream({ prompt: [] } as never)).stream);

    expect(onRetry).toHaveBeenCalledWith("stream closed empty");
  });
});
