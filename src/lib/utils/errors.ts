export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly retryable: boolean;

  constructor(params: {
    message: string;
    code: string;
    statusCode?: number;
    details?: unknown;
    retryable?: boolean;
  }) {
    super(params.message);
    this.name = this.constructor.name;
    this.code = params.code;
    this.statusCode = params.statusCode ?? 500;
    this.details = params.details;
    this.retryable = params.retryable ?? false;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super({
      message,
      code: "VALIDATION_ERROR",
      statusCode: 400,
      details,
      retryable: false,
    });
  }
}

export class JsonExtractionError extends AppError {
  constructor(message: string, details?: unknown) {
    super({
      message,
      code: "JSON_EXTRACTION_ERROR",
      statusCode: 502,
      details,
      retryable: true,
    });
  }
}

export class JsonParseError extends AppError {
  constructor(message: string, details?: unknown) {
    super({
      message,
      code: "JSON_PARSE_ERROR",
      statusCode: 502,
      details,
      retryable: true,
    });
  }
}

export class ModelResponseValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super({
      message,
      code: "MODEL_RESPONSE_VALIDATION_ERROR",
      statusCode: 502,
      details,
      retryable: true,
    });
  }
}

export class LlmProviderError extends AppError {
  constructor(message: string, details?: unknown, retryable = true) {
    super({
      message,
      code: "LLM_PROVIDER_ERROR",
      statusCode: 502,
      details,
      retryable,
    });
  }
}

export class DebatePipelineError extends AppError {
  constructor(message: string, details?: unknown) {
    super({
      message,
      code: "DEBATE_PIPELINE_ERROR",
      statusCode: 500,
      details,
      retryable: false,
    });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super({
      message,
      code: "DATABASE_ERROR",
      statusCode: 500,
      details,
      retryable: false,
    });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
