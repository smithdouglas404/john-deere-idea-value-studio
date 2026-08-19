import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cleanJourney } from "@/lib/cleanJourney";
import { CleanBreadcrumbs } from "./CleanBreadcrumbs";

describe("CleanBreadcrumbs", () => {
  it("renders accessible breadcrumb navigation with linked ancestors and a current page", () => {
    const source = readFileSync(new URL("./CleanBreadcrumbs.tsx", import.meta.url), "utf8");

    expect(source).toContain('aria-label="Breadcrumb"');
    expect(source).toContain("aria-current={item.current ? \"page\" : undefined}");
    expect(source).toContain("<Link href={item.href}");
    expect(source).toContain("key={`${item.label}-${index}`}");
  });

  it("renders clean campaign, case, event, and judging destinations without legacy paths", () => {
    const html = renderToStaticMarkup(
      createElement(CleanBreadcrumbs, {
        items: [
          { label: "Innovation Portfolio", href: "/" },
          { label: "Campaign", href: cleanJourney.campaign(1) },
          { label: "Investment case", href: cleanJourney.investmentCase(1) },
          { label: "Shared hackathon", href: cleanJourney.event(1) },
          { label: "Human judging", current: true },
        ],
      }),
    );

    expect(html).toContain('href="/"');
    expect(html).toContain('href="/studio/campaigns/1"');
    expect(html).toContain('href="/studio/cases/1"');
    expect(html).toContain('href="/studio/events/1"');
    expect(html).not.toContain("/judging");
    expect(html).toContain('aria-current="page"');
  });
});
