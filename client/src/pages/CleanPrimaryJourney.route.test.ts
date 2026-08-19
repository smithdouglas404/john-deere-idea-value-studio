import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("clean primary journey route wiring", () => {
  it("routes the root and /studio entry through the campaign-first InvestmentStudio", () => {
    const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    const studioSource = readFileSync(new URL("./InvestmentStudio.tsx", import.meta.url), "utf8");

    expect(appSource).toContain('<Route path={"/"} component={InvestmentStudio} />');
    expect(appSource).toContain('<Route path={"/studio"} component={InvestmentStudio} />');
    expect(studioSource).toContain("Innovation Portfolio");
    expect(studioSource).not.toContain('navigate("/workspace")');
  });

  it("keeps the portfolio's visible case and event CTAs behind cleanJourney", () => {
    const studioSource = readFileSync(new URL("./InvestmentStudio.tsx", import.meta.url), "utf8");

    expect(studioSource).toContain("cleanJourney.investmentCase(result.id)");
    expect(studioSource).toContain("cleanJourney.investmentCase(activeCase.id)");
    expect(studioSource).toContain("PortfolioActiveLinks");
    expect(studioSource).not.toContain("href={`/studio/cases/");
    expect(studioSource).not.toContain("href={`/studio/events/");
  });

  it("keeps visible evidence and judging CTAs inside the clean journey", () => {
    const caseSource = readFileSync(new URL("./InvestmentCaseWorkspace.tsx", import.meta.url), "utf8");
    const judgingSource = readFileSync(new URL("./EventJudgingWorkspace.tsx", import.meta.url), "utf8");

    expect(caseSource).toContain('useRoute("/studio/cases/:id")');
    expect(caseSource).toContain("CleanEvidenceDecisionPanel");
    expect(caseSource).toContain("InvestmentCaseContextLinks");
    expect(caseSource).not.toContain('href={`/judging?');
    expect(judgingSource).toContain("HumanJudgingProjectLinks");
    expect(judgingSource).not.toContain('href={`/judging?');
  });
});
