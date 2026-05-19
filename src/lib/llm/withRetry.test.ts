import { describe, it, expect, vi } from "vitest";
import { withRetry } from "@/lib/llm/withRetry";

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn, { maxAttempts: 3 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount < 3) throw new Error("fail");
      return "success";
    });

    const result = await withRetry(fn, {
      maxAttempts: 3,
      initialDelayMs: 1,
      shouldRetry: () => true,
    });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));

    await expect(
      withRetry(fn, {
        maxAttempts: 2,
        initialDelayMs: 1,
        shouldRetry: () => true,
      }),
    ).rejects.toThrow("always fails");

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respects shouldRetry predicate", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("non-retryable"));

    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        initialDelayMs: 1,
        shouldRetry: (error) => error instanceof Error && error.message !== "non-retryable",
      }),
    ).rejects.toThrow("non-retryable");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry when shouldRetry returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("stop"));

    await expect(
      withRetry(fn, {
        maxAttempts: 5,
        initialDelayMs: 1,
        shouldRetry: () => false,
      }),
    ).rejects.toThrow("stop");

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
