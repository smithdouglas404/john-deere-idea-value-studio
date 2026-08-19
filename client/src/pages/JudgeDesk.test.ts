import { describe, expect, it } from "vitest";
import { requestedAuditId, requestedProjectId } from "./JudgeDesk";

describe("Judge Desk project deep links", () => {
  it("accepts only a positive integer project query parameter", () => {
    expect(requestedProjectId("?project=1")).toBe(1);
    expect(requestedProjectId("?project=30001&other=value")).toBe(30001);
    expect(requestedProjectId("?project=0")).toBeNull();
    expect(requestedProjectId("?project=1.5")).toBeNull();
    expect(requestedProjectId("?project=unknown")).toBeNull();
  });

  it("accepts only a positive integer audit query parameter for a historical evidence packet", () => {
    expect(requestedAuditId("?project=1&audit=1")).toBe(1);
    expect(requestedAuditId("?audit=60001&project=1")).toBe(60001);
    expect(requestedAuditId("?audit=0")).toBeUndefined();
    expect(requestedAuditId("?audit=1.5")).toBeUndefined();
    expect(requestedAuditId("?audit=unknown")).toBeUndefined();
  });
});
