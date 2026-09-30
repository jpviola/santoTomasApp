import { beforeEach, describe, expect, it, vi } from "vitest";

const streamChatMock = vi.fn();
vi.mock("@/lib/llm/streamChat", () => ({
  streamChat: (...args: unknown[]) => streamChatMock(...args),
}));

import { POST } from "@/app/api/learn/tutor/route";
import { findLesson } from "@/lib/learning/curriculum";
import { buildTutorSystemPrompt } from "@/lib/prompts/tutorPrompt";
import { TutorRequestSchema } from "@/lib/schemas/tutor";

let ip = 0;
function tutorRequest(body: unknown) {
  ip += 1;
  return new Request("http://localhost/api/learn/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${ip}` },
    body: JSON.stringify(body),
  });
}

const question = { lessonId: "ley-natural", language: "es", messages: [{ role: "user", content: "¿Qué es la sindéresis?" }] };

describe("TutorRequestSchema", () => {
  it("requires the last message to come from the student", () => {
    const result = TutorRequestSchema.safeParse({
      ...question,
      messages: [...question.messages, { role: "assistant", content: "Es un hábito." }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty and oversized messages", () => {
    expect(TutorRequestSchema.safeParse({ ...question, messages: [{ role: "user", content: "   " }] }).success).toBe(false);
    expect(TutorRequestSchema.safeParse({ ...question, messages: [{ role: "user", content: "x".repeat(2001) }] }).success).toBe(false);
  });
});

describe("buildTutorSystemPrompt", () => {
  it("grounds the tutor in the lesson and the requested language", () => {
    const prompt = buildTutorSystemPrompt(findLesson("ley-natural", "es")!, "es");
    expect(prompt).toContain("La ley natural");
    expect(prompt).toContain("ST I-II, q.94, a.2");
    expect(prompt).toContain("Reply in Spanish");
    expect(prompt).toMatch(/ONE short question/);
  });
});

describe("POST /api/learn/tutor", () => {
  beforeEach(() => {
    streamChatMock.mockReset();
  });

  it("streams the tutor's reply as plain text", async () => {
    streamChatMock.mockImplementation(async function* () {
      yield "La sindéresis ";
      yield "es un hábito natural.";
    });

    const response = await POST(tutorRequest(question));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(await response.text()).toBe("La sindéresis es un hábito natural.");
    expect(streamChatMock).toHaveBeenCalledWith(expect.objectContaining({ messages: question.messages }));
  });

  it("returns 502 when the provider fails before any text", async () => {
    streamChatMock.mockImplementation(async function* () {
      throw new Error("provider down");
    });

    const response = await POST(tutorRequest(question));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: "LLM_PROVIDER_ERROR" });
  });

  it("returns 404 for an unknown lesson and 400 for an invalid body", async () => {
    expect((await POST(tutorRequest({ ...question, lessonId: "nope" }))).status).toBe(404);
    expect((await POST(tutorRequest({ lessonId: "ley-natural", messages: [] }))).status).toBe(400);
    expect(streamChatMock).not.toHaveBeenCalled();
  });
});
