import { describe, it, expect, vi } from "vitest";
import { withRetry } from "./retry";
import { TRPCError } from "@trpc/server";

function networkError(code: string): Error {
  return Object.assign(new Error("network failure"), { code });
}

describe("withRetry", () => {
  it("should return the result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry("test-task", fn);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("should retry on retryable network errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(networkError("ECONNRESET"))
      .mockResolvedValue("recovered");

    const result = await withRetry("test-task", fn, 1);
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should not retry on non-retryable errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Invalid API key"));

    await expect(withRetry("test-task", fn, 1)).rejects.toThrow(TRPCError);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("should not retry on permanent network errors (ENOTFOUND)", async () => {
    const fn = vi.fn().mockRejectedValue(networkError("ENOTFOUND"));

    await expect(withRetry("test-task", fn, 1)).rejects.toThrow(TRPCError);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("should give the transient message after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(networkError("ETIMEDOUT"));

    try {
      await withRetry("test-task", fn, 1);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).message).toContain("Chef is busy");
    }
  });

  it("should give a distinct message for non-retryable failures", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("content policy violation"));

    try {
      await withRetry("test-task", fn, 1);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).message).toContain("couldn't complete");
    }
  });

  it("should respect maxRetries = 0 (no retries)", async () => {
    const fn = vi.fn().mockRejectedValue(networkError("ECONNRESET"));

    await expect(withRetry("test-task", fn, 0)).rejects.toThrow(TRPCError);
    expect(fn).toHaveBeenCalledOnce();
  });
});
