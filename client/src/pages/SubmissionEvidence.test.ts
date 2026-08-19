import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { missionControlStatus, ParticipantChallengeStatus } from "./SubmissionEvidence";

describe("participant Mission Control", () => {
  it("derives the next accountable proof action from real submission and review state", () => {
    expect(missionControlStatus(null, undefined, 0).label).toBe("Complete final evidence");
    expect(missionControlStatus(new Date(), "processing", 0).label).toBe("Await evidence audit");
    expect(missionControlStatus(new Date(), "complete", 4).label).toBe("Await specialist evidence");
    expect(missionControlStatus(new Date(), "complete", 5).label).toBe("Review cited findings");
  });

  it("counts completed specialist skills rather than individual criterion findings", () => {
    const skills = new Set(["ux_ui", "ux_ui", "security", "security", "cloud_architecture"]);
    expect(skills.size).toBe(3);
  });

  it("renders a cited specialist challenge, persisted human response, and status in the participant evidence ledger", () => {
    const html = renderToStaticMarkup(React.createElement(ParticipantChallengeStatus, { challenges: [{
      id: 1,
      claimReference: "specialist:77:SEC-01",
      explanation: "The submitted BRD contains the authorization boundary referenced by the security finding.",
      status: "under_review",
      response: "Human reviewer requested the exact BRD section and implementation trace.",
      createdAt: new Date("2026-08-15T10:00:00Z"),
      resolvedAt: null,
    }]}));
    expect(html).toContain("specialist:77:SEC-01");
    expect(html).toContain("under review");
    expect(html).toContain("Human response:");
    expect(html).toContain("authorization boundary");
  });
});
