import { describe, expect, it } from "vitest";
import { buildCommunitySignalProofContext } from "./hackathons";

describe("pre-proof community signals", () => {
  it("preserves early signals as non-binding investigation context rather than a decision score", () => {
    const context = buildCommunitySignalProofContext(8, 3);
    expect(context).toContain("Community signal context (non-binding)");
    expect(context).toContain("8 endorsement(s)");
    expect(context).toContain("3 structured observation(s)");
    expect(context).toContain("do not treat popularity as validation or a decision");
  });

  it("does not add context when no community signal exists", () => {
    expect(buildCommunitySignalProofContext(0, 0)).toBe("");
  });
});
