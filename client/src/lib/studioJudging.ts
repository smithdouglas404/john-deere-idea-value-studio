export type StudioRubric = { key: string; label: string; weight: number; description: string };
export type StudioRubricScore = { key: string; score: number; rationale: string };

export function calculateHumanWeightedScore(rubric: StudioRubric[], rubricScores: StudioRubricScore[]) {
  const scoreByKey = new Map(rubricScores.map(item => [item.key, item.score]));
  return rubric.reduce((total, item) => total + ((scoreByKey.get(item.key) || 0) / 100) * item.weight, 0);
}

export function rankHumanScorecards<T extends { id: number; rubric: StudioRubric[]; scorecards: Array<{ rubricScores: StudioRubricScore[] }> }>(rows: T[]) {
  return rows
    .map(row => ({ ...row, humanScore: row.scorecards.length ? row.scorecards.reduce((total, scorecard) => total + calculateHumanWeightedScore(row.rubric, scorecard.rubricScores), 0) / row.scorecards.length : null }))
    .filter((row): row is T & { humanScore: number } => row.humanScore !== null)
    .sort((left, right) => right.humanScore - left.humanScore)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
