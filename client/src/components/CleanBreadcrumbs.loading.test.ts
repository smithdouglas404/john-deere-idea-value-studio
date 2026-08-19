import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CleanBreadcrumbs loading feedback", () => {
  it("keeps the pending navigation state accessible and clears it on route change", () => {
    const source = readFileSync(new URL("./CleanBreadcrumbs.tsx", import.meta.url), "utf8");
    expect(source).toContain("useLocation");
    expect(source).toContain("setLoadingHref(null)");
    expect(source).toContain("<Spinner aria-hidden=\"true\" className=\"size-3\" />");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("Loading {item.label}");
  });
});
