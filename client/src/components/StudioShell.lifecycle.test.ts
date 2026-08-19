import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { LifecycleBand, lifecycleZoneForRoute } from "./StudioShell";

describe("Fieldbook lifecycle posture", () => {
  it("maps intake and research routes to the evidence ledger", () => {
    expect(lifecycleZoneForRoute("/workspace")).toBe(0);
    expect(lifecycleZoneForRoute("/opportunities/60001")).toBe(0);
  });

  it("maps proof-building routes to the working value canvas", () => {
    expect(lifecycleZoneForRoute("/hackathons")).toBe(1);
    expect(lifecycleZoneForRoute("/submission-evidence")).toBe(1);
  });

  it("maps review and realization routes to the decision rail", () => {
    expect(lifecycleZoneForRoute("/judging?project=1")).toBe(2);
    expect(lifecycleZoneForRoute("/realization")).toBe(2);
  });

  it("renders lifecycle siblings with stable keys and no React warning", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const html = renderToStaticMarkup(createElement(LifecycleBand, { activeZone: 1 }));
    expect(html).toContain("Working value canvas");
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps the clean campaign portfolio primary and labels legacy routes as reference workspaces", () => {
    const source = readFileSync(new URL("./StudioShell.tsx", import.meta.url), "utf8");
    expect(source).toContain('href="/"');
    expect(source).toContain("Campaign portfolio");
    expect(source).toContain("Reference workspaces");
    expect(source).toContain("legacyNavItems");
  });
});
