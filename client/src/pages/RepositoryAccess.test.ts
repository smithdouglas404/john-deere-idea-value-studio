import { describe, expect, it } from "vitest";
import { requestedRepositoryProjectId } from "./RepositoryAccess";

describe("repository evidence project deep links", () => {
  it("accepts only a positive integer project context and rejects invalid or missing values", () => {
    expect(requestedRepositoryProjectId("?project=30001")).toBe("30001");
    expect(requestedRepositoryProjectId("?project=30001&view=evidence")).toBe("30001");
    expect(requestedRepositoryProjectId("?project=0")).toBe("");
    expect(requestedRepositoryProjectId("?project=1.5")).toBe("");
    expect(requestedRepositoryProjectId("?project=invalid")).toBe("");
  });
});
