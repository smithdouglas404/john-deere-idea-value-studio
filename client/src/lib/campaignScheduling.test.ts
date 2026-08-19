import { describe, expect, it } from "vitest";
import { canAttachSelectedProject, canCreateCampaignEvent, campaignProofContract } from "./campaignScheduling";

describe("campaign-level proof scheduling", () => {
  it("creates a complete inherited evidence contract and a 100-point human rubric", () => {
    const contract = campaignProofContract();
    expect(contract.requiredArtifacts.map(item => item.key)).toEqual(["business_requirements", "technical_design", "code_or_prototype", "demo"]);
    expect(contract.requiredArtifacts.every(item => item.required)).toBe(true);
    expect(contract.rubric.reduce((total, item) => total + item.weight, 0)).toBe(100);
  });

  it("requires an event title and meaningful rules before the first shared event can be created", () => {
    expect(canCreateCampaignEvent({ title: "", rules: "Teams submit evidence before judging." })).toBe(false);
    expect(canCreateCampaignEvent({ title: "Proof", rules: "Too short" })).toBe(false);
    expect(canCreateCampaignEvent({ title: "Dealer proof event", rules: "Teams submit required evidence before human judging begins." })).toBe(true);
  });

  it("requires an explicit proof question before an approved case can attach to the shared event", () => {
    expect(canAttachSelectedProject("Short question")).toBe(false);
    expect(canAttachSelectedProject("Can the team demonstrate the proposed technician service workflow?")).toBe(true);
  });
});
