import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CrowdsourcingCampaign clean CTA routing", () => {
  it("keeps inherited-case and shared-event destinations in the centralized clean route family", () => {
    const source = readFileSync(new URL("./CrowdsourcingCampaign.tsx", import.meta.url), "utf8");

    expect(source).toContain('import { cleanJourney } from "@/lib/cleanJourney";');
    expect(source).toContain("cleanJourney.investmentCase(item.id)");
    expect(source).toContain("cleanJourney.event(sharedEvent.id)");
    expect(source).toContain("cleanJourney.event(candidate.proofEventId)");
    expect(source).not.toContain("`/studio/cases/${item.id}`");
    expect(source).not.toContain("`/studio/events/${sharedEvent.id}`");
    expect(source).not.toContain("`/studio/events/${candidate.proofEventId}`");
  });
});
