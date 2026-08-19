import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({
  user: {
    id: 1,
    openId: "clean-rebuild-demo-runner",
    name: "Douglas Smith",
    email: "smithdo@gmail.com",
    loginMethod: "system-test",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { headers: {}, protocol: "https" },
  res: {},
} as any);

const existing = await caller.studio.overview();
const previous = existing.cases.find(item => item.title === "Illustrative dealer service proof — clean rebuild");
if (previous) {
  console.log(JSON.stringify({ reused: true, caseId: previous.id }, null, 2));
  process.exit(0);
}

const campaign = await caller.studio.createCampaign({
  title: "Illustrative dealer service efficiency campaign — test fixture",
  challengeBrief: "Test-only campaign. Identify a controlled proof that reduces time spent locating recurring dealer service issues while preserving technician judgment and documenting the evidence needed for an investment decision.",
});
const investmentCase = await caller.studio.createInvestmentCase({
  campaignId: campaign.id,
  title: "Illustrative dealer service proof — clean rebuild",
  investmentThesis: "Test-only investment thesis: a guided service-signal triage workflow may reduce time spent identifying recurring dealer service problems and improve the quality of escalation evidence.",
  problemStatement: "Test-only problem statement: service teams need a traceable way to move from recurring field signals to an evidenced proof of operational value without treating a prototype as a funding decision.",
  businessCase: "Test-only business case: the proof will test whether standardized evidence capture, requirement tracing, and a human-reviewed recommendation can create an actionable investment record. No savings, ROI, or customer outcome is asserted until real evidence is accepted by a sponsor.",
  financialDetail: { status: "test_only", note: "No sponsor-entered financial assumptions have been supplied." },
  kpiOkrLinks: [{ label: "Service efficiency", rationale: "Test-only optional operating linkage; it is not a promised outcome." }],
});
await caller.studio.approveForProof({
  caseId: investmentCase.id,
  rationale: "Test-only approval for a controlled proof. This authorizes evidence collection only and is not an investment decision.",
});
const contract = await caller.studio.createProofContract({
  investmentCaseId: investmentCase.id,
  eventTitle: "Illustrative dealer service proof event — test fixture",
  rules: "Test-only rules: teams must submit the required evidence, distinguish observed facts from assumptions, disclose limitations, and respond to human judge questions. Agents advise; human judges decide.",
  candidateTitle: "Illustrative dealer service proof",
  proofQuestion: "Can a team demonstrate that a structured service-signal triage workflow produces traceable evidence that helps a human sponsor decide whether further investment assessment is warranted?",
  requiredArtifacts: [
    { key: "business_summary", label: "Business summary", required: true, purpose: "Connect the proposed proof to the investment thesis and operational problem." },
    { key: "brd", label: "Business requirements document", required: true, purpose: "State process requirements, stakeholders, and acceptance conditions." },
    { key: "technical_requirements", label: "Technical requirements", required: true, purpose: "Describe architecture, integration, security, and operating constraints." },
    { key: "repository", label: "Repository / code evidence", required: true, purpose: "Provide authorized implementation evidence for technical review." },
    { key: "demo", label: "Working demonstration", required: true, purpose: "Show the proof outcome against the stated proof question." },
  ],
  rubric: [
    { key: "investment_fit", label: "Investment case fit", weight: 30, description: "Tests whether proof evidence speaks to the originating investment thesis." },
    { key: "proof_quality", label: "Proof quality", weight: 30, description: "Tests whether evidence is complete, traceable, and limitation-aware." },
    { key: "technical_delivery", label: "Technical delivery", weight: 25, description: "Tests feasible, maintainable, and secure implementation evidence." },
    { key: "innovation_value", label: "Innovation and value", weight: 15, description: "Tests differentiated value without fabricating realized benefits." },
  ],
});
const proof = await caller.studio.createTeamProof({
  proofCandidateId: contract.candidateId,
  teamName: "Illustrative service signal team",
  solutionSummary: "Test-only team proof: a workflow prototype that records recurring field-service signals, maps them to requirements, and prepares cited evidence for a human investment gate.",
});
const artifacts = [
  ["business_summary", "Illustrative business summary", "https://example.test/clean-rebuild/business-summary", "Test-only business summary. The proof tests traceable escalation evidence; it does not claim financial impact."],
  ["brd", "Illustrative BRD", "https://example.test/clean-rebuild/brd", "Test-only BRD. Requirement: a user can record a field signal, connect it to a service pattern, and preserve the evidence source for human review."],
  ["technical_requirements", "Illustrative technical requirements", "https://example.test/clean-rebuild/technical-requirements", "Test-only technical requirements. The prototype must provide role-aware access, audit visibility, and explicit human decision boundaries."],
  ["repository", "Illustrative repository reference", "https://example.test/clean-rebuild/repository", "Test-only repository evidence. The implementation review must identify limits and never assert security or quality without inspected code."],
  ["demo", "Illustrative working demonstration", "https://example.test/clean-rebuild/demo", "Test-only demonstration evidence. It shows a signal being documented and prepared for a human-sponsored proof decision."],
] as const;
for (const [artifactType, title, evidenceUrl, extractedText] of artifacts) {
  await caller.studio.addArtifact({ teamProofId: proof.id, artifactKey: artifactType, artifactType, title, evidenceUrl, extractedText, consentConfirmed: true });
}

console.log(JSON.stringify({ campaignId: campaign.id, caseId: investmentCase.id, eventId: contract.eventId, candidateId: contract.candidateId, proofId: proof.id, artifactCount: artifacts.length }, null, 2));
