import { describe, expect, it } from "vitest";
import { isEligibleForHackathonPreparation, summarizeAssessments } from "./campaignReview";

describe("campaign community review", () => {
  it("summarizes advisory stances without manufacturing an investment decision", () => {
    const summary = summarizeAssessments([{ stance: "go", valuationScore: 5 }, { stance: "hold", valuationScore: 3 }, { stance: "no_go", valuationScore: 1 }]);
    expect(summary).toMatchObject({ average: 3, go: 1, hold: 1, noGo: 1 });
  });

  it("allows hackathon preparation only after a manager advances the item", () => {
    expect(isEligibleForHackathonPreparation("advance")).toBe(true);
    expect(isEligibleForHackathonPreparation("hold")).toBe(false);
    expect(isEligibleForHackathonPreparation("return_for_enrichment")).toBe(false);
    expect(isEligibleForHackathonPreparation("decline")).toBe(false);
    expect(isEligibleForHackathonPreparation(undefined)).toBe(false);
  });
});
