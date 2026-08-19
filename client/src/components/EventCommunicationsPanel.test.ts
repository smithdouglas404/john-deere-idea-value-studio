import { describe, expect, it } from "vitest";
import { communicationsUnavailableMessage } from "./EventCommunicationsPanel";

describe("communicationsUnavailableMessage", () => {
  it("keeps an explicit safe failure explanation when no request error is available", () => {
    expect(communicationsUnavailableMessage()).toBe("The event communication feed could not be loaded. No acknowledgement or team alert has been sent.");
  });

  it("preserves the actionable server error for the visible retry state", () => {
    expect(communicationsUnavailableMessage("You are not an event member.")).toBe("You are not an event member.");
  });
});
