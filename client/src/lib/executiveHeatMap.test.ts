import { describe, expect, it } from "vitest";
import { EXECUTIVE_HEAT_DIMENSIONS, averageExecutiveHeatMap, isCompleteExecutiveHeatMap } from "./executiveHeatMap";

const fullMap = (score: number) => ({ dimensions: EXECUTIVE_HEAT_DIMENSIONS.map(dimension => ({ ...dimension, score })) });

describe("executive heat map", () => {
  it("averages only recorded human dimension assessments and leaves missing projects blank", () => {
    const result = averageExecutiveHeatMap([fullMap(4), fullMap(2), null]);
    expect(result).toHaveLength(8);
    expect(result.every(dimension => dimension.score === 3)).toBe(true);
    expect(averageExecutiveHeatMap([null]).every(dimension => dimension.score === null)).toBe(true);
  });

  it("requires one human 1–5 assessment for every distinct value, skill, and will dimension", () => {
    expect(isCompleteExecutiveHeatMap(fullMap(5))).toBe(true);
    expect(isCompleteExecutiveHeatMap({ dimensions: fullMap(4).dimensions.slice(0, 7) })).toBe(false);
    expect(isCompleteExecutiveHeatMap({ dimensions: [...fullMap(4).dimensions.slice(0, 7), { ...fullMap(4).dimensions[0] }] })).toBe(false);
    expect(isCompleteExecutiveHeatMap({ dimensions: fullMap(4).dimensions.map((dimension, index) => index === 0 ? { ...dimension, score: 6 } : dimension) })).toBe(false);
  });
});
