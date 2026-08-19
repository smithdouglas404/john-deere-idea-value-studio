export type AdvisoryAssessment = { stance: "go" | "hold" | "no_go"; valuationScore: number };

export function summarizeAssessments(records: AdvisoryAssessment[]) {
  const average = records.length ? records.reduce((total, record) => total + record.valuationScore, 0) / records.length : null;
  return {
    records,
    average,
    go: records.filter(record => record.stance === "go").length,
    hold: records.filter(record => record.stance === "hold").length,
    noGo: records.filter(record => record.stance === "no_go").length,
  };
}

export function isEligibleForHackathonPreparation(managerDecision: "advance" | "return_for_enrichment" | "hold" | "decline" | undefined) {
  return managerDecision === "advance";
}
