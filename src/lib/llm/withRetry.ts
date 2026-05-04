import { logger } from "@/lib/utils/logger";

type RetryOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  operationName?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 500,
    backoffMultiplier = 2,
    shouldRetry = () => false,
    operationName = "unknown-operation",
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      logger.debug("Retry wrapper attempting operation", {
        operationName,
        attempt,
        maxAttempts,
      });

      return await operation();
    } catch (error) {
      const retry = attempt < maxAttempts && shouldRetry(error, attempt);

      logger.warn("Operation failed", {
        operationName,
        attempt,
        maxAttempts,
        retry,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : "UnknownError",
      });

      if (!retry) {
        throw error;
      }

      await sleep(delay);
      delay = Math.floor(delay * backoffMultiplier);
    }
  }

  throw new Error(`Retry system exhausted unexpectedly for ${operationName}.`);
}
