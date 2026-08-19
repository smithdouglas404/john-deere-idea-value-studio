import { describe, expect, it } from "vitest";
import { specialistReviewPlanItems } from "./SpecialistReviewPlan";

describe("specialist review plan", () => {
  it("makes the five governed specialists visible before proof submission", () => {
    expect(specialistReviewPlanItems.map(item => item.key)).toEqual(["ux_ui", "cloud_architecture", "security", "development_quality", "value_feasibility"]);
    for (const item of specialistReviewPlanItems) expect(item.evidence.length).toBeGreaterThan(20);
  });
});
