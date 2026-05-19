import { describe, expect, it } from "vitest";
import { assessQuestionScope } from "@/lib/guardrails/questionScope";

describe("assessQuestionScope", () => {
  it("allows explicitly Thomistic questions", () => {
    const decision = assessQuestionScope("Que dice Santo Tomás sobre la justicia?", "es");

    expect(decision.allowed).toBe(true);
  });

  it("allows ambiguous questions to avoid overblocking", () => {
    const decision = assessQuestionScope("Que es una vida buena?", "es");

    expect(decision.allowed).toBe(true);
  });

  it("blocks clearly out-of-scope operational questions", () => {
    const decision = assessQuestionScope("Cual es el clima de Buenos Aires hoy?", "es");

    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("OUT_OF_SCOPE_QUESTION");
    expect(decision.message).toContain("cuestiones escolásticas");
  });

  it("allows in-scope questions even when they mention a normally blocked domain", () => {
    const decision = assessQuestionScope("Como evaluaria Santo Tomás la etica de invertir en acciones?", "es");

    expect(decision.allowed).toBe(true);
  });
});
