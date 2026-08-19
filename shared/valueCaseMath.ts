export type ValueScenario = {
  label: "Conservative" | "Working midpoint" | "Upside";
  potentialValue: number | null;
  netOfProofCost: number | null;
  assumptions: string[];
};

export function buildValueScenarios(low: number | null, high: number | null, costToProve: number | null, assumptions: string[]): ValueScenario[] {
  const midpoint = low !== null && high !== null ? (low + high) / 2 : null;
  return [
    { label: "Conservative", potentialValue: low, netOfProofCost: low === null || costToProve === null ? null : low - costToProve, assumptions },
    { label: "Working midpoint", potentialValue: midpoint, netOfProofCost: midpoint === null || costToProve === null ? null : midpoint - costToProve, assumptions },
    { label: "Upside", potentialValue: high, netOfProofCost: high === null || costToProve === null ? null : high - costToProve, assumptions },
  ];
}
