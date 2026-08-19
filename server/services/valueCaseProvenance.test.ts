import { describe, expect, it } from "vitest";
import { buildValueScenarios } from "../../shared/valueCaseMath";
import { selectSensitivityConditions } from "../../shared/valueCaseProvenance";

describe("value-case sensitivity provenance", () => {
  it("uses no AI-derived condition when the sponsor has not recorded an economic assumption", () => {
    const selected = selectSensitivityConditions([], ["AI-derived baseline claim", "AI-derived adoption assumption"]);
    expect(selected).toEqual({ conditions: [], requiresSponsorInput: true });
    expect(buildValueScenarios(100000, 200000, 10000, selected.conditions).every(scenario => scenario.assumptions.length === 0)).toBe(true);
  });

  it("preserves sponsor conditions on each arithmetic scenario", () => {
    const selected = selectSensitivityConditions(["Sponsor validates baseline"], ["AI-derived assumption"]);
    const scenarios = buildValueScenarios(100000, 250000, 15000, selected.conditions);
    expect(scenarios[0]).toMatchObject({ label: "Conservative", netOfProofCost: 85000, assumptions: ["Sponsor validates baseline"] });
    expect(scenarios[1]).toMatchObject({ label: "Working midpoint", netOfProofCost: 160000, assumptions: ["Sponsor validates baseline"] });
  });
});
