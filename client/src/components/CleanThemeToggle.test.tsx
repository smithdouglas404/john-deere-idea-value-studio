import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn(), switchable: true }),
}));

import { CleanThemeToggle } from "@/components/CleanThemeToggle";

describe("CleanThemeToggle", () => {
  it("renders an accessible dark-mode action in light mode", () => {
    const html = renderToStaticMarkup(React.createElement(CleanThemeToggle));
    expect(html).toContain('aria-label="Switch to dark mode"');
    expect(html).toContain("Dark");
    expect(html).toContain("focus-visible:ring");
  });
});
