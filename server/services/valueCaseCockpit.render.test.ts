import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ opportunities: { detail: { invalidate: vi.fn() } } }),
    opportunities: { saveValueCase: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) } },
  },
}));

import { ValueCaseCockpit } from "../../client/src/components/ValueCaseCockpit";

describe("ValueCaseCockpit sensitivity provenance", () => {
  it("shows the sponsor-input empty state instead of using AI brief assumptions as sensitivity conditions", () => {
    const html = renderToStaticMarkup(React.createElement(ValueCaseCockpit, {
      canAdminister: false,
      indicators: [],
      opportunity: {
        id: 1,
        confidence: 72,
        initialValueLow: "100000",
        initialValueHigh: "200000",
        valueCurrency: "USD",
        costToProve: "10000",
        timeToValueMonths: 6,
        valueCaseNarrative: null,
        valueDrivers: [],
        economicAssumptions: [],
        investmentGate: "proof_sprint",
        investmentGateRationale: null,
        aiBrief: { assumptions: ["AI-derived adoption assumption"] },
      },
    }));
    const sensitivitySection = html.slice(html.indexOf("Sponsor conditions applied to every scenario"), html.indexOf("This is arithmetic on sponsor-entered values"));
    expect(sensitivitySection).toContain("Add sponsor-owned economic assumptions before relying on these arithmetic cases.");
    expect(sensitivitySection).not.toContain("AI-derived adoption assumption");
    expect(html).toContain("value-case-cockpit");
  });

  it("opens the sponsor economics form when the required value range is absent", () => {
    const html = renderToStaticMarkup(React.createElement(ValueCaseCockpit, {
      canAdminister: true,
      indicators: [],
      opportunity: {
        id: 2,
        confidence: 0,
        initialValueLow: null,
        initialValueHigh: null,
        valueCurrency: "USD",
        costToProve: null,
        timeToValueMonths: null,
        valueCaseNarrative: null,
        valueDrivers: [],
        economicAssumptions: [],
        investmentGate: "shape_value_case",
        investmentGateRationale: null,
        aiBrief: null,
      },
    }));
    expect(html).toContain("Sponsor economics: enter the value range now");
    expect(html).toContain("Set the value range and proof economics");
    expect(html).toContain("Conservative annual value");
    expect(html).toContain("Save economic case and gate");
  });

  it("shows community signal context without presenting it as economics or a decision score", () => {
    const html = renderToStaticMarkup(React.createElement(ValueCaseCockpit, {
      canAdminister: true,
      indicators: [],
      community: { endorsementCount: 2, viewerEndorsed: false, notes: [{ id: 1, category: "customer_signal", body: "", evidenceUrl: null, createdAt: new Date() }] },
      opportunity: {
        id: 3, confidence: 0, initialValueLow: null, initialValueHigh: null, valueCurrency: "USD", costToProve: null, timeToValueMonths: null,
        valueCaseNarrative: null, valueDrivers: [], economicAssumptions: [], investmentGate: "shape_value_case", investmentGateRationale: null, aiBrief: null,
      },
    }));
    expect(html).toContain("Community signal / sponsor review");
    expect(html).toContain("do not affect the value range, evidence confidence, scorecards, or the investment gate");
    expect(html).toContain("customer signal");
  });
});
