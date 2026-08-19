import { describe, expect, it } from "vitest";
import { buildValueScenarios } from "./valueCaseMath";

describe("buildValueScenarios", () => {
  it("preserves sponsor-entered assumptions as explicit conditions on every arithmetic scenario", () => {
    const assumptions = ["Baseline rework hours are validated", "Pilot adoption reaches the agreed cohort"];
    const scenarios = buildValueScenarios(100000, 250000, 15000, assumptions);
    expect(scenarios).toEqual([
      { label: "Conservative", potentialValue: 100000, netOfProofCost: 85000, assumptions },
      { label: "Working midpoint", potentialValue: 175000, netOfProofCost: 160000, assumptions },
      { label: "Upside", potentialValue: 250000, netOfProofCost: 235000, assumptions },
    ]);
  });

  it("does not fabricate a net value when a sponsor has not entered proof cost", () => {
    expect(buildValueScenarios(100000, 200000, null, ["A stated condition"])[0]?.netOfProofCost).toBeNull();
  });

  it("keeps scenario conditions empty when no sponsor condition was provided", () => {
    expect(buildValueScenarios(100000, 200000, 10000, []).every(scenario => scenario.assumptions.length === 0)).toBe(true);
  });
});
