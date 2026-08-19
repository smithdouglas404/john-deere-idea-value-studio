import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({
  user: {
    id: 1,
    openId: "clean-rebuild-human-decision-runner",
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

await caller.studio.recordJudgeDecision({
  teamProofId: 1,
  evidencePacketId: 1,
  decision: "return_to_proof",
  rationale: "Test-only human decision: the required artifacts are present, but the governed Agent packet did not complete and additional evidence is needed before advancing the investment case.",
  rubricScores: [
    { key: "investment_case_fit", score: 62, rationale: "The problem is connected to the stated investment thesis, but the proof must substantiate its expected effect." },
    { key: "proof_quality", score: 45, rationale: "Required artifacts are attached, but the Agent evidence assessment must be rerun before this proof can be relied upon." },
    { key: "technical_delivery", score: 55, rationale: "Technical evidence is available for human inspection; it needs a completed evidence packet." },
    { key: "innovation_value", score: 58, rationale: "The concept may improve evidence triage, but comparative proof is still required." },
  ],
  evidenceCorrections: [{ reference: "packet:1", action: "requires_retry", rationale: "The governed Agent returned an explicit readiness state rather than a completed AI assessment." }],
});

await caller.studio.setInvestmentGate({
  investmentCaseId: 1,
  proofCandidateId: 1,
  status: "return_to_proof",
  rationale: "Test-only sponsor gate: return this proof to the team until the Agent packet can complete or judges have inspected the required artifacts directly.",
  assumptionMovement: [{ assumption: "Structured service-signal triage can improve escalation evidence", movement: "missing_evidence", rationale: "The test proof contains required artifacts, but an Agent evidence assessment did not complete." }],
});

console.log(JSON.stringify({ decision: "return_to_proof", gate: "return_to_proof", testOnly: true }, null, 2));
