import { describe, expect, it } from "vitest";
import { acceptsDimensionsParam, embeddingConfig } from "@/lib/llm/embeddings";
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

  it("reuses the OpenRouter key with the multilingual bge-m3 model", () => {
    expect(embeddingConfig({ EMBEDDING_PROVIDER: "openrouter", OPENROUTER_API_KEY: "sk-or-x" })).toEqual({
      apiKey: "sk-or-x",
      baseURL: "https://openrouter.ai/api/v1",
      model: "baai/bge-m3",
      provider: "openrouter",
    });
    expect(embeddingConfig({ EMBEDDING_PROVIDER: "openrouter", OPENAI_API_KEY: "sk-or-y" })?.apiKey).toBe("sk-or-y");
    expect(embeddingConfig({ EMBEDDING_PROVIDER: "openrouter" })).toBeNull();
  });

  it("only sends the dimensions parameter to models that support it", () => {
    expect(acceptsDimensionsParam("openai/text-embedding-3-small")).toBe(true);
    expect(acceptsDimensionsParam("qwen3-embedding-0-6b")).toBe(true);
    expect(acceptsDimensionsParam("baai/bge-m3")).toBe(false);
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
