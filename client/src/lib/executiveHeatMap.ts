export const EXECUTIVE_HEAT_DIMENSIONS = [
  { key: "efficiency", label: "Efficiency" },
  { key: "productivity", label: "Productivity" },
  { key: "cost_takeout", label: "Cost takeout" },
  { key: "innovation", label: "Innovation" },
  { key: "revenue_growth", label: "Revenue growth" },
  { key: "customer_impact", label: "Customer impact" },
  { key: "skill", label: "Skill" },
  { key: "will", label: "Will" },
] as const;

export type ExecutiveHeatDimensionKey = typeof EXECUTIVE_HEAT_DIMENSIONS[number]["key"];
export type ExecutiveHeatDimension = { key: ExecutiveHeatDimensionKey; label: string; score: number };
export type ExecutiveHeatMap = { dimensions: ExecutiveHeatDimension[] };

export function averageExecutiveHeatMap(heatMaps: Array<ExecutiveHeatMap | null | undefined>) {
  return EXECUTIVE_HEAT_DIMENSIONS.map(dimension => {
    const scores = heatMaps
      .flatMap(heatMap => heatMap?.dimensions || [])
      .filter((entry): entry is ExecutiveHeatDimension => entry.key === dimension.key && Number.isFinite(entry.score) && entry.score >= 1 && entry.score <= 5)
      .map(entry => entry.score);
    return { ...dimension, score: scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : null };
  });
}

export function isCompleteExecutiveHeatMap(heatMap: ExecutiveHeatMap) {
  if (heatMap.dimensions.length !== EXECUTIVE_HEAT_DIMENSIONS.length) return false;
  const keys = new Set(heatMap.dimensions.map(dimension => dimension.key));
  return keys.size === EXECUTIVE_HEAT_DIMENSIONS.length
    && EXECUTIVE_HEAT_DIMENSIONS.every(dimension => keys.has(dimension.key))
    && heatMap.dimensions.every(dimension => Number.isInteger(dimension.score) && dimension.score >= 1 && dimension.score <= 5);
}
