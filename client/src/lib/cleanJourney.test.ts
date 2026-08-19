import { describe, expect, it } from "vitest";
import { cleanJourney, isCleanPrimaryRoute } from "./cleanJourney";

describe("clean primary journey routes", () => {
  it("keeps campaign, inherited case, shared event, evidence, and human judging inside the clean route family", () => {
    const routes = [cleanJourney.campaign(7), cleanJourney.investmentCase(11), cleanJourney.evidence(11), cleanJourney.event(3), cleanJourney.judging(3)];
    expect(routes).toEqual(["/studio/campaigns/7", "/studio/cases/11", "/studio/cases/11#evidence-agent", "/studio/events/3", "/studio/events/3/judging"]);
    expect(routes.every(isCleanPrimaryRoute)).toBe(true);
  });

  it("does not treat legacy workspace or judging routes as part of the clean primary journey", () => {
    expect(isCleanPrimaryRoute("/workspace")).toBe(false);
    expect(isCleanPrimaryRoute("/hackathons/1")).toBe(false);
    expect(isCleanPrimaryRoute("/judging?project=1")).toBe(false);
  });
});
