import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  JsonExtractionError,
  JsonParseError,
  ModelResponseValidationError,
  LlmProviderError,
  DebatePipelineError,
  DatabaseError,
  isAppError,
} from "@/lib/utils/errors";

describe("AppError", () => {
  it("creates error with all properties", () => {
    const error = new AppError({
      message: "Test error",
      code: "TEST_ERROR",
      statusCode: 418,
      details: { extra: "info" },
      retryable: true,
    });

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.statusCode).toBe(418);
    expect(error.details).toEqual({ extra: "info" });
    expect(error.retryable).toBe(true);
  });

  it("uses defaults for optional fields", () => {
    const error = new AppError({ message: "Error", code: "ERR" });
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(false);
    expect(error.details).toBeUndefined();
  });
});

describe("ValidationError", () => {
  it("has correct defaults", () => {
    const error = new ValidationError("Invalid input");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.statusCode).toBe(400);
    expect(error.retryable).toBe(false);
  });
});

describe("JsonExtractionError", () => {
  it("has correct defaults", () => {
    const error = new JsonExtractionError("No JSON found");
    expect(error.code).toBe("JSON_EXTRACTION_ERROR");
    expect(error.statusCode).toBe(502);
    expect(error.retryable).toBe(true);
  });
});

describe("JsonParseError", () => {
  it("has correct defaults", () => {
    const error = new JsonParseError("Parse failed");
    expect(error.code).toBe("JSON_PARSE_ERROR");
    expect(error.statusCode).toBe(502);
    expect(error.retryable).toBe(true);
  });
});

describe("ModelResponseValidationError", () => {
  it("has correct defaults", () => {
    const error = new ModelResponseValidationError("Validation failed");
    expect(error.code).toBe("MODEL_RESPONSE_VALIDATION_ERROR");
    expect(error.statusCode).toBe(502);
    expect(error.retryable).toBe(true);
  });
});

describe("LlmProviderError", () => {
  it("defaults to retryable", () => {
    const error = new LlmProviderError("Provider error");
    expect(error.code).toBe("LLM_PROVIDER_ERROR");
    expect(error.statusCode).toBe(502);
    expect(error.retryable).toBe(true);
  });

  it("accepts non-retryable flag", () => {
    const error = new LlmProviderError("Permanent failure", undefined, false);
    expect(error.retryable).toBe(false);
  });
});

describe("DebatePipelineError", () => {
  it("has correct defaults", () => {
    const error = new DebatePipelineError("Pipeline failed");
    expect(error.code).toBe("DEBATE_PIPELINE_ERROR");
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(false);
  });
});

describe("DatabaseError", () => {
  it("has correct defaults", () => {
    const error = new DatabaseError("DB connection lost");
    expect(error.code).toBe("DATABASE_ERROR");
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(false);
  });
});

describe("isAppError", () => {
  it("returns true for AppError instances", () => {
    expect(isAppError(new AppError({ message: "test", code: "TEST" }))).toBe(true);
    expect(isAppError(new ValidationError("test"))).toBe(true);
    expect(isAppError(new LlmProviderError("test"))).toBe(true);
  });

  it("returns false for regular errors", () => {
    expect(isAppError(new Error("standard error"))).toBe(false);
    expect(isAppError("string error")).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
  });
});
