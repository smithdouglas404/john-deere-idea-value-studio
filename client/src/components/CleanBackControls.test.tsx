import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CleanBackControls", () => {
  it("provides an explicit previous-screen action and a separate portfolio destination", () => {
    const source = readFileSync(new URL("./CleanBackControls.tsx", import.meta.url), "utf8");

    expect(source).toContain('aria-label="Back to previous screen"');
    expect(source).toContain("window.history.back()");
    expect(source).toContain('setLocation("/")');
    expect(source).toContain('href="/"');
    expect(source).toContain("Back to previous screen");
    expect(source).toContain("ArrowLeft");
    expect(source).toContain("group-hover:-translate-x-0.5");
    expect(source).toContain("focus-visible:ring-2");
  });
});
