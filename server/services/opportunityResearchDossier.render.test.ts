import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OpportunityResearchDossier } from "../../client/src/components/OpportunityResearchDossier";

describe("OpportunityResearchDossier", () => {
  it("renders category coverage from returned citations without presenting it as demand or outcome data", () => {
    const html = renderToStaticMarkup(React.createElement(OpportunityResearchDossier, {
      research: {
        status: "needs_review",
        summary: "Source-backed review.",
        limitations: "Customer validation remains required.",
        dossier: {
          ideaNarrative: "An evidence-first telemetry opportunity.",
          customerImpact: { audience: "Farm operators", problem: "Unplanned equipment disruptions", involvement: "Interview operators", expectedExperienceShift: "Earlier issue visibility" },
          marketAcceptance: { signal: "emerging_signal", narrative: "The citations show adjacent interest, not validation." },
          operatingImpact: { area: "Equipment monitoring", narrative: "A testable operating hypothesis." },
          valuePerspective: { primaryCategory: "cost_optimization", narrative: "A qualitative category only." },
          evidenceGaps: ["Customer interviews"],
        },
        sources: [
          { id: 1, title: "Market source", url: "https://example.com/market", excerpt: null, relevance: "Market context", evidenceCategory: "market", similarityAssessment: "relevant_precedent" },
          { id: 2, title: "Customer source", url: "https://example.com/customer", excerpt: null, relevance: "Customer context", evidenceCategory: "customer", similarityAssessment: "relevant_precedent" },
          { id: 3, title: "Second customer source", url: "https://example.com/customer-2", excerpt: null, relevance: "Customer context", evidenceCategory: "customer", similarityAssessment: "relevant_precedent" },
        ],
      },
    }));
    expect(html).toContain("Evidence coverage");
    expect(html).toContain("AI market validation");
    expect(html).toContain("Citation count by evidence category");
    expect(html).toContain("Cost optimization");
    expect(html).toContain("Customer interviews");
    expect(html).toContain("not a measure of market size, customer demand, or outcome magnitude");
    expect(html).toContain("Open source");
    expect(html).toContain("line-clamp-2");
  });
});
