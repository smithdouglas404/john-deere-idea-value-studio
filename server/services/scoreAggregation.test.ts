import { describe, expect, it } from "vitest";
import { averageFinalizedHumanScores, calculateWeightedScore } from "./scoreAggregation";

describe("deterministic human score aggregation", () => {
  const criteria = [{ id: 1, weight: "35.00" }, { id: 2, weight: "25.00" }, { id: 3, weight: "20.00" }, { id: 4, weight: "20.00" }];
  it("calculates a score from persisted rubric items rather than an LLM result", () => {
    expect(calculateWeightedScore([{ criterionId: 1, score: "8" }, { criterionId: 2, score: "6" }, { criterionId: 3, score: "7" }, { criterionId: 4, score: "9" }], criteria)).toBe(7.5);
  });
  it("averages only finalized human scorecards supplied to the leaderboard", () => {
    expect(averageFinalizedHumanScores([{ id: 10 }, { id: 11 }], [{ scorecardId: 10, criterionId: 1, score: "8" }, { scorecardId: 11, criterionId: 1, score: "6" }], criteria)).toBe(7);
  });

  it("excludes AI specialist records because only persisted human scorecard IDs can contribute items", () => {
    const humanScore = averageFinalizedHumanScores(
      [{ id: 10 }],
      [
        { scorecardId: 10, criterionId: 1, score: "8" },
        // A specialist result cannot match a human scorecard ID and is therefore not an aggregation input.
        { scorecardId: 9001, criterionId: 1, score: "0" },
      ],
      criteria,
    );
    expect(humanScore).toBe(8);
  });
});
