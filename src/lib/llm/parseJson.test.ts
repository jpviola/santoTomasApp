import { describe, it, expect } from "vitest";
import { extractJsonBlock, parseJsonWithSchema } from "@/lib/llm/parseJson";
import { z } from "zod";

describe("extractJsonBlock", () => {
  it("returns trimmed plain JSON", () => {
    const input = '  {"key": "value"}  ';
    expect(extractJsonBlock(input)).toBe('{"key": "value"}');
  });

  it("extracts from fenced code block with json hint", () => {
    const input = "```json\n{\"key\": \"value\"}\n```";
    expect(extractJsonBlock(input)).toBe('{"key": "value"}');
  });

  it("extracts from generic fenced code block", () => {
    const input = "```\n{\"key\": \"value\"}\n```";
    expect(extractJsonBlock(input)).toBe('{"key": "value"}');
  });

  it("extracts JSON from text with surrounding prose", () => {
    const input = 'Here is the result:\n{"question": "test"}\nHope this helps.';
    expect(extractJsonBlock(input)).toBe('{"question": "test"}');
  });

  it("extracts JSON arrays from text", () => {
    const input = 'Sure:\n["a", "b", "c"]\nDone.';
    expect(extractJsonBlock(input)).toBe('["a", "b", "c"]');
  });

  it("throws on empty input", () => {
    expect(() => extractJsonBlock("")).toThrow();
    expect(() => extractJsonBlock("   ")).toThrow();
  });

  it("throws when no JSON found", () => {
    expect(() => extractJsonBlock("just plain text")).toThrow();
  });
});

describe("parseJsonWithSchema", () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it("parses valid JSON against schema", () => {
    const result = parseJsonWithSchema('{"name": "John", "age": 30}', schema);
    expect(result).toEqual({ name: "John", age: 30 });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseJsonWithSchema("{bad json}", schema)).toThrow();
  });

  it("throws on schema validation failure", () => {
    expect(() => parseJsonWithSchema('{"name": "John"}', schema)).toThrow();
  });

  it("handles fenced JSON blocks", () => {
    const input = "```json\n{\"name\": \"Jane\", \"age\": 25}\n```";
    const result = parseJsonWithSchema(input, schema);
    expect(result).toEqual({ name: "Jane", age: 25 });
  });
});
