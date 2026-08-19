import { describe, expect, it } from "vitest";
import { rankOptInTeamFit } from "./hackathons";

describe("opt-in team matching", () => {
  it("prioritizes a stated skill need and a complementary participant role", () => {
    const result = rankOptInTeamFit({ requestedSkills: ["data engineering", "ux research"], memberRoles: ["developer"], participantSkills: ["data engineering", "agronomy"], participantRoles: ["data scientist", "developer"] });
    expect(result.score).toBe(4);
    expect(result.reasons).toContain("Looking for your data engineering skill");
    expect(result.reasons).toContain("Adds a data scientist perspective not yet listed by the team");
  });
});
