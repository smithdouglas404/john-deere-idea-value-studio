import { describe, expect, it } from "vitest";
import { organizerCopilotPolicy } from "./organizerCopilot";

describe("organizer copilot governance", () => {
  it("keeps drafts advisory, evidence-bounded, and outside sponsor economics and human decisions", () => {
    expect(organizerCopilotPolicy).toContain("only the supplied opportunity and research packet");
    expect(organizerCopilotPolicy).toContain("starts unadopted");
    expect(organizerCopilotPolicy).toContain("sponsor economics or ROI");
    expect(organizerCopilotPolicy).toContain("winners, finalists, investments, or human decisions");
    expect(organizerCopilotPolicy).toContain("Do not invent facts");
  });
});
