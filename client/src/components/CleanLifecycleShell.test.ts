import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { describe, expect, it } from "vitest";
import { cleanJourney } from "@/lib/cleanJourney";
import { CleanLifecycleShell } from "./CleanLifecycleShell";

describe("clean lifecycle shell route contract", () => {
  it("keeps each available lifecycle handoff in the clean primary route family", () => {
    expect([cleanJourney.campaign(1), cleanJourney.investmentCase(1), cleanJourney.event(1), cleanJourney.judging(1)]).toEqual([
      "/studio/campaigns/1",
      "/studio/cases/1",
      "/studio/events/1",
      "/studio/events/1/judging",
    ]);
  });

  it("renders campaign, case, event, and human-judging handoffs without a legacy destination", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Router,
        { ssrPath: "/studio/cases/8" },
        createElement(CleanLifecycleShell, { stage: "case", campaignId: 4, caseId: 8, eventId: 12 }),
      ),
    );

    expect(markup).toContain('href="/studio/campaigns/4"');
    expect(markup).toContain('href="/studio/cases/8"');
    expect(markup).toContain('href="/studio/events/12"');
    expect(markup).toContain('href="/studio/events/12/judging"');
    expect(markup).not.toMatch(/href="\/(workspace|hackathons|judging|submission-evidence)/);
  });
});
