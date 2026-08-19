import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: { href: string; children?: React.ReactNode; [key: string]: unknown }) => React.createElement("a", { href, ...props }, children),
}));

import { CampaignSchedulingPanel } from "@/components/CampaignSchedulingPanel";

const noop = () => undefined;

function schedulingProps(overrides: Partial<React.ComponentProps<typeof CampaignSchedulingPanel>> = {}): React.ComponentProps<typeof CampaignSchedulingPanel> {
  return {
    sharedEvent: null,
    selectedProjectCount: 0,
    eventSetupOpen: true,
    eventTitle: "Dealer service proof sprint",
    eventRules: "Every project submits cited evidence and receives a human scorecard.",
    eventUpdateExpectations: "Teams update the proof record when evidence changes.",
    eventProofStartsAt: "2026-08-20T09:00",
    eventSubmissionClosesAt: "2026-08-22T17:00",
    eventJudgingStartsAt: "2026-08-23T09:00",
    eventJudgingClosesAt: "2026-08-23T17:00",
    canSubmit: true,
    isPending: false,
    errorMessage: null,
    onToggleSetup: noop,
    onTitleChange: noop,
    onRulesChange: noop,
    onUpdateExpectationsChange: noop,
    onProofStartsAtChange: noop,
    onSubmissionClosesAtChange: noop,
    onJudgingStartsAtChange: noop,
    onJudgingClosesAtChange: noop,
    onCreateEvent: vi.fn(),
    ...overrides,
  };
}

describe("campaign scheduling rendered workflow", () => {
  it("renders the no-event setup inputs and a submit-ready shared-event action", () => {
    const html = renderToStaticMarkup(React.createElement(CampaignSchedulingPanel, schedulingProps()));

    expect(html).toContain("Schedule the controlled proof event.");
    expect(html).toContain('aria-label="Event title"');
    expect(html).toContain('aria-label="Event rules"');
    expect(html).toContain('aria-label="Team update expectations"');
    expect(html).toContain('aria-label="Judging closes"');
    expect(html).toContain("Create shared event");
    expect(html).not.toContain("No projects attached");
  });

  it("renders the same-workspace attached-event state after the create mutation succeeds", () => {
    const html = renderToStaticMarkup(React.createElement(CampaignSchedulingPanel, schedulingProps({
      sharedEvent: { id: 30001, title: "Dealer service proof sprint", status: "registration" },
      selectedProjectCount: 1,
      eventSetupOpen: false,
    })));

    expect(html).toContain("Dealer service proof sprint");
    expect(html).toContain("registration · 1 project attached");
    expect(html).toContain('href="/studio/events/30001"');
    expect(html).toContain("Open scheduled hackathon");
    expect(html).not.toContain("Create shared event");
  });
});
