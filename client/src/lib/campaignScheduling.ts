export const CAMPAIGN_STANDARD_ARTIFACTS = [
  { key: "business_requirements", label: "Business requirements", required: true, purpose: "Clarify the problem, stakeholders, acceptance conditions, and inherited business intent." },
  { key: "technical_design", label: "Technical design", required: true, purpose: "Show the technical approach, integration constraints, and operating design." },
  { key: "code_or_prototype", label: "Code or prototype", required: true, purpose: "Provide inspectable implementation or demonstrable prototype evidence." },
  { key: "demo", label: "Demo evidence", required: true, purpose: "Show how the team tested the original selected-project objective." },
];

export const CAMPAIGN_STANDARD_RUBRIC = [
  { key: "business_case_fit", label: "Business-case fit", weight: 30, description: "Does the proof test the inherited business case and selected objective?" },
  { key: "proof_quality", label: "Proof quality", weight: 30, description: "Is the submitted evidence credible, complete, and responsive to the proof question?" },
  { key: "technical_delivery", label: "Technical delivery", weight: 25, description: "Is the technical approach viable, secure, and explained?" },
  { key: "innovation_and_value", label: "Innovation and value", weight: 15, description: "Does the proof surface differentiated value worth further human assessment?" },
];

export function campaignProofContract() {
  return { requiredArtifacts: [...CAMPAIGN_STANDARD_ARTIFACTS], rubric: [...CAMPAIGN_STANDARD_RUBRIC] };
}

export function canCreateCampaignEvent(input: { title: string; rules: string }) {
  return input.title.trim().length >= 4 && input.rules.trim().length >= 20;
}

export function canAttachSelectedProject(proofQuestion: string) {
  return proofQuestion.trim().length >= 15;
}
