import { describe, expect, it } from "vitest";
import { deriveEventPulse } from "./hackathons";

describe("event pulse", () => {
  it("reports evidence blockers from real-state counts without creating a ranking", () => {
    expect(deriveEventPulse({ registrations: 4, teams: 2, projects: 2, submitted: 2, auditsComplete: 1, auditsInFlight: 0, specialistComplete: 5, finalScorecards: 0 })).toMatchObject({ decisionReady: false, specialistExpected: 5, blockers: ["Evidence is available; a human decision remains open."] });
  });

  it("reports an evidence-ready state only after human scorecards exist", () => {
    expect(deriveEventPulse({ registrations: 4, teams: 2, projects: 2, submitted: 2, auditsComplete: 1, auditsInFlight: 0, specialistComplete: 5, finalScorecards: 1 })).toMatchObject({ decisionReady: true, blockers: [] });
  });

  it("reports pending specialist evidence before allowing a decision-ready state", () => {
    expect(deriveEventPulse({ registrations: 4, teams: 2, projects: 1, submitted: 1, auditsComplete: 1, auditsInFlight: 0, specialistComplete: 2, finalScorecards: 1 })).toMatchObject({ decisionReady: false, blockers: ["Cited specialist reviews are still pending (2/5 complete)."] });
  });
});
