import { describe, expect, it, vi } from "vitest";

vi.mock("../_core/llm", () => ({ invokeLLM: vi.fn() }));

import { invokeLLM } from "../_core/llm";
import { conductOpportunityResearch } from "./opportunityAi";

const completeResearch = {
  summary: "Sourced research summary.",
  limitations: "Human review remains required.",
  dossier: {
    ideaNarrative: "A concise evidence-backed opportunity.",
    customerImpact: { audience: "Operators", problem: "A documented operating problem", involvement: "Interview users", expectedExperienceShift: "A testable shift" },
    marketAcceptance: { signal: "insufficient_evidence", narrative: "Public sources require validation." },
    operatingImpact: { area: "Operations", narrative: "A testable operating hypothesis." },
    valuePerspective: { primaryCategory: "other", narrative: "Qualitative context only." },
    evidenceGaps: ["Primary research"],
  },
  sources: [],
};

describe("conductOpportunityResearch structured retry", () => {
  it("retries once with a compact source-backed request when the first model result is incomplete JSON", async () => {
    const mockedInvoke = vi.mocked(invokeLLM);
    mockedInvoke.mockReset();
    mockedInvoke.mockResolvedValueOnce({ choices: [{ message: { content: "" } }] } as never);
    mockedInvoke.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(completeResearch) } }] } as never);

    await expect(conductOpportunityResearch({ title: "Telemetry", problemStatement: "Reduce unplanned interruption", assets: [] })).resolves.toEqual(completeResearch);
    expect(mockedInvoke).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(mockedInvoke.mock.calls[1][0])).toContain("previous structured response was incomplete");
    expect(mockedInvoke.mock.calls[1][0].maxCompletionTokens).toBe(2800);
  });
});
