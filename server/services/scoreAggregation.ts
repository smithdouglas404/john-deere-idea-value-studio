export type WeightedCriterion = { id: number; weight: string | number };
export type HumanScoreItem = { criterionId: number; score: string | number };

export function calculateWeightedScore(items: HumanScoreItem[], criteria: WeightedCriterion[]) {
  const weightByCriterion = new Map(criteria.map(criterion => [criterion.id, Number(criterion.weight)]));
  const weightsPresent = items.reduce((sum, item) => sum + (weightByCriterion.get(item.criterionId) || 0), 0);
  if (!items.length || weightsPresent <= 0) return null;
  const weighted = items.reduce((sum, item) => sum + Number(item.score) * (weightByCriterion.get(item.criterionId) || 0), 0);
  return Number((weighted / weightsPresent).toFixed(2));
}

export function averageFinalizedHumanScores(scorecards: Array<{ id: number }>, items: Array<{ scorecardId: number; criterionId: number; score: string | number }>, criteria: WeightedCriterion[]) {
  const scores = scorecards.map(card => calculateWeightedScore(items.filter(item => item.scorecardId === card.id), criteria)).filter((score): score is number => score !== null);
  if (!scores.length) return null;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2));
}
