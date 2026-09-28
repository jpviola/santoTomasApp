import { describe, expect, it } from "vitest";
import { embeddingConfig } from "@/lib/llm/embeddings";
import { toVectorLiteral, vectorStoreConfigured } from "@/lib/knowledge/vectorStore";

describe("embeddingConfig", () => {
  it("is disabled without credentials", () => {
    expect(embeddingConfig({})).toBeNull();
  });

  it("uses an OpenAI-compatible provider when EMBEDDING_API_KEY is set", () => {
    expect(embeddingConfig({ EMBEDDING_API_KEY: "sk-x" })).toEqual({
      apiKey: "sk-x",
      baseURL: "https://api.openai.com/v1",
      model: "text-embedding-3-small",
      provider: "openai-compatible",
    });
  });

  it("uses the Neon AI Gateway with the multilingual qwen3 model", () => {
    expect(embeddingConfig({ NEON_AI_GATEWAY_TOKEN: "nt_live_x", NEON_AI_GATEWAY_BASE_URL: "https://br-abc.neon.tech/" })).toEqual({
      apiKey: "nt_live_x",
      baseURL: "https://br-abc.neon.tech/v1",
      model: "qwen3-embedding-0-6b",
      provider: "neon-ai-gateway",
    });
  });

  it("prefers EMBEDDING_API_KEY and honours EMBEDDING_MODEL", () => {
    const config = embeddingConfig({
      EMBEDDING_API_KEY: "sk-x",
      EMBEDDING_MODEL: "custom",
      NEON_AI_GATEWAY_TOKEN: "nt_live_x",
      NEON_AI_GATEWAY_BASE_URL: "https://br-abc.neon.tech",
    });
    expect(config).toMatchObject({ provider: "openai-compatible", model: "custom" });
  });
});

describe("vector store helpers", () => {
  it("formats pgvector literals and detects configuration", () => {
    expect(toVectorLiteral([0.5, -1, 0])).toBe("[0.5,-1,0]");
    expect(vectorStoreConfigured({})).toBe(false);
    expect(vectorStoreConfigured({ KNOWLEDGE_DATABASE_URL: "postgresql://x" })).toBe(true);
  });
});
