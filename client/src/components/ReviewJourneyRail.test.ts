import { describe, expect, it } from "vitest";
import { buildReviewJourneySteps, nextHumanReviewAction } from "./ReviewJourneyRail";

describe("buildReviewJourneySteps", () => {
  it("keeps the selected proof connected from evidence through the human decision route", () => {
    const steps = buildReviewJourneySteps(91);
    expect(steps.map(step => step.label)).toEqual(["Evidence record", "Cited inspection", "Human score", "Decision continuation"]);
    expect(steps[0].href).toBe("/submission-evidence?project=91");
    expect(steps[1].href).toBe("/judging?project=91");
    expect(steps[2].href).toBe("/judging?project=91");
    expect(steps[3].href).toBe("/realization");
  });

  it("prioritizes a cited participant challenge before scoring or realization", () => {
    const next = nextHumanReviewAction({ auditReady: true, specialistReady: true, openChallengeCount: 1, humanScoreRecorded: false, independentRationaleRecorded: false });
    expect(next.title).toBe("Resolve cited participant challenges");
    expect(next.detail).toContain("human response");
  });
});
