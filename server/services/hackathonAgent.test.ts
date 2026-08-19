import { describe, expect, it, vi } from "vitest";

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            technicalScore: 7,
            integrityScore: 6,
            originalityScore: 5,
            pitchFitScore: 8,
            claims: [
              {
                claimReference: "CLAIM-01",
                claim: "The project includes a working evidence path.",
                verdict: "unclear",
                rationale: "The test fixture has no repository evidence.",
                citations: [],
              },
            ],
            findings: [],
            questionsForJudges: ["What evidence would change the sponsor decision?"],
            limitations: ["No repository evidence was provided."],
          }),
        },
      },
    ],
  }),
}));

import { runHackathonAgent, summarizeSource } from "./hackathonAgent";
import { invokeLLM } from "../_core/llm";

describe("runHackathonAgent", () => {
  it("derives bounded AST evidence from TypeScript imports, declarations, routes, and tests", () => {
    const summary = summarizeSource("server/routes.ts", 'import express from "express";\nexport async function inspectProof() {}\napp.get("/audit", inspectProof);\ndescribe("audit", () => it("checks evidence", () => {}));');
    expect(summary.summary).toContain("[AST Imports]");
    expect(summary.summary).toContain("express");
    expect(summary.summary).toContain("Function inspectProof");
    expect(summary.summary).toContain("[AST Route Signals]");
    expect(summary.summary).toContain("[AST Test Signals]");
  });

  it("calculates the suggested score with the locked 35/25/20/20 rubric", async () => {
    const result = await runHackathonAgent({
      title: "Evidence-led proof",
      description: "A submission that tests a defined field problem.",
    });

    expect(result.finalSuggestedScore).toBe(6.55);
    expect(result.technicalScore).toBe(7);
    expect(result.claims[0]?.claimReference).toBe("CLAIM-01");
    expect(result.limitations).toContain("No repository URL was supplied.");
  });

  it("includes bounded repository text, PDF deck, and video inputs in an evidence-first review request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input);
      if (url.endsWith("/repos/acme/proof")) return new Response(JSON.stringify({ default_branch: "main", html_url: "https://github.com/acme/proof" }), { status: 200 });
      if (url.includes("/commits?")) return new Response(JSON.stringify([]), { status: 200 });
      if (url.includes("/git/trees/")) return new Response(JSON.stringify({ tree: [{ path: "README.md", type: "blob" }] }), { status: 200 });
      if (url.includes("/contents/README.md")) return new Response(JSON.stringify({ content: Buffer.from("# Evidence\nImplemented route proof.").toString("base64"), html_url: "https://github.com/acme/proof/blob/main/README.md" }), { status: 200 });
      return new Response("not found", { status: 404 });
    });
    const result = await runHackathonAgent({
      title: "Multimodal proof",
      description: "Tests the governed evidence path.",
      githubUrl: "https://github.com/acme/proof",
      pitchDeckUrl: "https://assets.example.com/proof.pdf",
      videoUrl: "https://assets.example.com/demo.mp4",
    });
    const call = vi.mocked(invokeLLM).mock.calls.at(-1)?.[0];
    const parts = call?.messages?.[1]?.content as Array<{ type?: string; file_url?: { url?: string } }>;
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(JSON.stringify(parts)).toContain("Implemented route proof.");
    expect(parts.some(part => part.type === "file_url" && part.file_url?.url === "https://assets.example.com/proof.pdf")).toBe(true);
    expect(parts.some(part => part.type === "file_url" && part.file_url?.url === "https://assets.example.com/demo.mp4")).toBe(true);
    expect(result.claims[0]?.claimReference).toBe("CLAIM-01");
    fetchMock.mockRestore();
  });
});
