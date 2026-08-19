import { describe, expect, it } from "vitest";
import { summarizeCampaignOrchestration } from "@/components/CampaignOrchestrationGuide";

describe("campaign orchestration summary", () => {
  it("shows the intake gate as the current starting point", () => {
    const summary = summarizeCampaignOrchestration({ cases: [], signals: [], sharedEvent: null });

    expect(summary.completedStages).toBe(0);
    expect(summary.readiness).toEqual([false, false, false, false, false]);
  });

  it("tracks community evidence, human selection, event setup, and selected proof progress separately", () => {
    const summary = summarizeCampaignOrchestration({
      cases: [
        { id: 1, title: "Dealer service", status: "approved_for_proof", problemStatement: "A documented service delay affects dealer throughput." },
        { id: 2, title: "Field onboarding", status: "submitted", problemStatement: "A documented onboarding gap affects higher-value work." },
      ],
      signals: [
        { id: 10, investmentCaseId: 1, signalType: "comment", content: "Validate the dealer workflow." },
        { id: 11, investmentCaseId: 1, signalType: "endorsement", content: "Strong field signal." },
      ],
      sharedEvent: { id: 20, title: "Proof sprint", status: "registration" },
    });

    expect(summary.totalComments).toBe(1);
    expect(summary.totalEndorsements).toBe(1);
    expect(summary.selectedCount).toBe(1);
    expect(summary.completedStages).toBe(5);
    expect(summary.readiness).toEqual([true, true, true, true, true]);
  });
});
