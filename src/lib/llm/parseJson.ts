import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import {
  JsonExtractionError,
  JsonParseError,
  ModelResponseValidationError,
} from "@/lib/utils/errors";

export function extractJsonBlock(raw: string): string {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new JsonExtractionError("Model response was empty.");
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  const fencedJsonMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedJsonMatch?.[1]) {
    return fencedJsonMatch[1].trim();
  }

  const fencedMatch = trimmed.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1);
  }

  throw new JsonExtractionError("No JSON block found in model response.", {
    preview: trimmed.slice(0, 500),
  });
}

export function parseJsonWithSchema<T>(raw: string, schema: ZodType<T, ZodTypeDef, unknown>): T {
  const jsonText = extractJsonBlock(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new JsonParseError("Failed to parse model JSON.", {
      rawJson: jsonText,
      parseError: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ModelResponseValidationError("Model JSON failed schema validation.", {
        issues: error.issues,
        parsed,
      });
    }

    throw error;
  }
}
