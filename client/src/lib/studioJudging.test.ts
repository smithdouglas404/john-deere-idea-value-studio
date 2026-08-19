import { describe, expect, it } from "vitest";
import { calculateHumanWeightedScore, rankHumanScorecards } from "./studioJudging";

const rubric = [
  { key: "investment", label: "Investment", weight: 60, description: "" },
  { key: "delivery", label: "Delivery", weight: 40, description: "" },
];

describe("clean studio human judging", () => {
  it("calculates a transparent weighted result from human rubric inputs only", () => {
    expect(calculateHumanWeightedScore(rubric, [
      { key: "investment", score: 80, rationale: "Human rationale" },
      { key: "delivery", score: 50, rationale: "Human rationale" },
    ])).toBe(68);
  });

  it("ranks completed human scorecards and excludes candidates without a human decision", () => {
    const ranked = rankHumanScorecards([
      { id: 1, rubric, scorecards: [{ rubricScores: [{ key: "investment", score: 90, rationale: "Human" }, { key: "delivery", score: 90, rationale: "Human" }] }] },
      { id: 2, rubric, scorecards: [{ rubricScores: [{ key: "investment", score: 80, rationale: "Human" }, { key: "delivery", score: 80, rationale: "Human" }] }] },
      { id: 3, rubric, scorecards: [] },
    ]);
    expect(ranked.map(item => ({ id: item.id, rank: item.rank, score: item.humanScore }))).toEqual([{ id: 1, rank: 1, score: 90 }, { id: 2, rank: 2, score: 80 }]);
  });
});
