import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { describe, expect, it } from "vitest";
import { SelectedProjectNavigation } from "./SelectedProjectNavigation";

describe("SelectedProjectNavigation", () => {
  it("renders inherited-case and shared-event CTAs inside the clean route family", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Router,
        { ssrPath: "/studio/campaigns/7" },
        createElement(SelectedProjectNavigation, {
          candidates: [{ id: 5, title: "Illustrative selected project", investmentCaseId: 11, proofEventId: 3 }],
          cases: [{ id: 11, title: "Original business case" }],
          events: [{ id: 3, title: "Shared proof event", status: "registration" }],
        }),
      ),
    );

    expect(markup).toContain('href="/studio/cases/11"');
    expect(markup).toContain('href="/studio/events/3"');
    expect(markup).not.toMatch(/href="\/(workspace|hackathons|judging|submission-evidence)/);
  });
});
