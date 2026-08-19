import { describe, expect, it } from "vitest";
import { resolveOpportunityGuideAction } from "./opportunityGuide";

const eventOnly = { hackathonId: 8, eventTitle: "Telemetry proof", eventStatus: "hacking_active", projectId: null, projectTitle: null, projectSubmittedAt: null };

describe("resolveOpportunityGuideAction", () => {
  it("keeps an unselected opportunity at its human selection action", () => {
    expect(resolveOpportunityGuideAction("active", null).label).toBe("Select for controlled proof");
  });

  it("keeps a selected opportunity without an event at its human launch action", () => {
    expect(resolveOpportunityGuideAction("selected", null).label).toBe("Launch controlled proof sprint");
  });

  it("opens the linked Event HQ when an event exists without a project", () => {
    expect(resolveOpportunityGuideAction("selected", eventOnly).href).toBe("/hackathons/8");
  });

  it("opens evidence or human review based on the real linked project state", () => {
    expect(resolveOpportunityGuideAction("selected", { ...eventOnly, projectId: 17, projectTitle: "Proof", projectSubmittedAt: null }).href).toBe("/submission-evidence?project=17");
    expect(resolveOpportunityGuideAction("selected", { ...eventOnly, projectId: 17, projectTitle: "Proof", projectSubmittedAt: "2026-08-13" }).href).toBe("/judging?project=17");
  });
});
