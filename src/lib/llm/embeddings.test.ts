import { afterEach, describe, expect, it, vi } from "vitest";
import { acceptsDimensionsParam, embedTexts, embeddingConfig, EMBEDDING_DIMENSIONS } from "@/lib/llm/embeddings";
import { toVectorLiteral, vectorStoreConfigured } from "@/lib/knowledge/vectorStore";

describe("embeddingConfig", () => {
  it("is disabled without credentials", () => {
    expect(embeddingConfig({})).toBeNull();
  });

  it("detects the free providers from their keys", () => {
    expect(embeddingConfig({ GEMINI_API_KEY: "g" })).toMatchObject({ provider: "gemini", model: "gemini-embedding-001" });
    expect(embeddingConfig({ JINA_API_KEY: "j" })).toMatchObject({ provider: "jina", model: "jina-embeddings-v5-text-small" });
  });

  it("honours an explicit EMBEDDING_PROVIDER and EMBEDDING_MODEL", () => {
    expect(embeddingConfig({ EMBEDDING_PROVIDER: "jina", GEMINI_API_KEY: "g", JINA_API_KEY: "j" })?.provider).toBe("jina");
    expect(embeddingConfig({ EMBEDDING_PROVIDER: "gemini", GEMINI_API_KEY: "g", EMBEDDING_MODEL: "gemini-embedding-2" })?.model).toBe(
      "gemini-embedding-2",
    );
    expect(embeddingConfig({ EMBEDDING_PROVIDER: "gemini" })).toBeNull();
    expect(embeddingConfig({ EMBEDDING_PROVIDER: "nope", GEMINI_API_KEY: "g" })).toBeNull();
  });

  it("reuses the OpenRouter key with the multilingual bge-m3 model", () => {
    expect(embeddingConfig({ EMBEDDING_PROVIDER: "openrouter", OPENROUTER_API_KEY: "sk-or-x" })).toEqual({
      provider: "openrouter",
      apiKey: "sk-or-x",
      baseURL: "https://openrouter.ai/api/v1",
      model: "baai/bge-m3",
    });
  });

  it("uses OpenAI-compatible and Neon AI Gateway credentials", () => {
    expect(embeddingConfig({ EMBEDDING_API_KEY: "sk-x" })).toMatchObject({ provider: "openai-compatible", model: "text-embedding-3-small" });
    expect(embeddingConfig({ NEON_AI_GATEWAY_TOKEN: "nt", NEON_AI_GATEWAY_BASE_URL: "https://br-abc.neon.tech/" })).toMatchObject({
      provider: "neon-ai-gateway",
      baseURL: "https://br-abc.neon.tech/v1",
    });
  });

  it("only sends the dimensions parameter to models that support it", () => {
    expect(acceptsDimensionsParam("openai/text-embedding-3-small")).toBe(true);
    expect(acceptsDimensionsParam("baai/bge-m3")).toBe(false);
  });
});

describe("embedTexts with native APIs", () => {
  afterEach(() => vi.unstubAllGlobals());
  const vector = (value: number) => Array.from({ length: EMBEDDING_DIMENSIONS }, () => value);

  it("calls Gemini with the retrieval task type and 1024 dimensions, and normalizes", async () => {
    const fetchMock = vi.fn(async () => Response.json({ embeddings: [{ values: vector(2) }, { values: vector(3) }] }));
    vi.stubGlobal("fetch", fetchMock);
    const config = embeddingConfig({ GEMINI_API_KEY: "g" })!;

    const vectors = await embedTexts(["a", "b"], config, "query");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("g");
    expect(body.requests[0]).toMatchObject({ taskType: "RETRIEVAL_QUERY", outputDimensionality: 1024, content: { parts: [{ text: "a" }] } });
    expect(Math.hypot(...vectors[0])).toBeCloseTo(1, 6);
  });

  it("calls Jina with the passage task for documents", async () => {
    const fetchMock = vi.fn(async () => Response.json({ data: [{ index: 0, embedding: vector(0.01) }] }));
    vi.stubGlobal("fetch", fetchMock);

    await embedTexts(["texto"], embeddingConfig({ JINA_API_KEY: "j" })!, "document");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.jina.ai/v1/embeddings");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer j");
    expect(JSON.parse(String(init.body))).toMatchObject({ task: "retrieval.passage", dimensions: 1024, model: "jina-embeddings-v5-text-small" });
  });

  it("retries on rate limits and rejects a wrong vector size", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("quota", { status: 429 }))
      .mockResolvedValueOnce(Response.json({ embeddings: [{ values: [1, 2, 3] }] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(embedTexts(["a"], embeddingConfig({ GEMINI_API_KEY: "g" })!, "document", { maxAttempts: 2, initialDelayMs: 1 })).rejects.toThrow(
      /3 dimensiones/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("vector store helpers", () => {
  it("formats pgvector literals and detects configuration", () => {
    expect(toVectorLiteral([0.5, -1, 0])).toBe("[0.5,-1,0]");
    expect(vectorStoreConfigured({})).toBe(false);
    expect(vectorStoreConfigured({ KNOWLEDGE_DATABASE_URL: "postgresql://x" })).toBe(true);
  });
});
