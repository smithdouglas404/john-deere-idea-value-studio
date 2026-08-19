import { describe, expect, it } from "vitest";
import { canEnterHackathonPreparation, caseStatusForIncubationDecision } from "./incubationReview";

describe("incubation review gate", () => {
  it("allows preparation only for a manager advance decision", () => {
    expect(canEnterHackathonPreparation("advance")).toBe(true);
    expect(canEnterHackathonPreparation("hold")).toBe(false);
    expect(canEnterHackathonPreparation("return_for_enrichment")).toBe(false);
    expect(canEnterHackathonPreparation("decline")).toBe(false);
    expect(canEnterHackathonPreparation(undefined)).toBe(false);
  });

  it("removes proof readiness when a manager holds, returns, or declines an item", () => {
    expect(caseStatusForIncubationDecision("advance")).toBe("approved_for_proof");
    expect(caseStatusForIncubationDecision("hold")).toBe("investment_review");
    expect(caseStatusForIncubationDecision("return_for_enrichment")).toBe("returned");
    expect(caseStatusForIncubationDecision("decline")).toBe("archived");
  });
});
