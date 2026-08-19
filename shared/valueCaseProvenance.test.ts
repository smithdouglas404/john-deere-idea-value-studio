import { describe, expect, it } from "vitest";
import { selectSensitivityConditions } from "./valueCaseProvenance";

describe("selectSensitivityConditions", () => {
  it("ignores AI brief assumptions when no sponsor economic condition exists", () => {
    expect(selectSensitivityConditions([], ["AI-derived baseline claim", "AI-derived adoption assumption"])).toEqual({ conditions: [], requiresSponsorInput: true });
  });

  it("uses only sponsor-entered assumptions when both sources exist", () => {
    expect(selectSensitivityConditions(["Sponsor validates baseline"], ["AI-derived assumption"])).toEqual({ conditions: ["Sponsor validates baseline"], requiresSponsorInput: false });
  });
});
