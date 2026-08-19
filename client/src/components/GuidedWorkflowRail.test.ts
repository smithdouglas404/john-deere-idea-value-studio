import { describe, expect, it } from "vitest";
import { buildGuidedWorkflowSteps } from "./GuidedWorkflowRail";

describe("GuidedWorkflowRail", () => {
  it("builds the governed value-case through realization journey with real record routes", () => {
    const steps = buildGuidedWorkflowSteps({
      hackathonId: 8,
      opportunityId: 12,
      projectId: 33,
      eventTitle: "Telemetry proof sprint",
      eventStatus: "hacking_active",
      projectTitle: "Telemetry evidence record",
      projectSubmittedAt: null,
      nextAction: { label: "Complete final evidence", route: "/submission-evidence?project=33" },
    });
    expect(steps.map(step => step.label)).toEqual(["Value case", "Proof design", "Mobilize", "Evidence", "Human review", "Realize"]);
    expect(steps[0].href).toBe("/opportunities/12");
    expect(steps[3].href).toBe("/submission-evidence?project=33");
    expect(steps[4].href).toBe("/reviewer-calibration");
  });
});
