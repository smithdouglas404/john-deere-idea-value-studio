import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({
  user: { id: 1, openId: "shared-event-test", name: "Douglas Smith", email: "smithdo@gmail.com", loginMethod: "system-test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { headers: {}, protocol: "https" },
  res: {},
} as any);

const overview = await caller.studio.overview();
const campaign = overview.campaigns[0];
const event = overview.events[0];
if (!campaign || !event) throw new Error("The clean shared-event demonstration requires an existing campaign and scheduled proof event.");

const title = "Illustrative dealer technician knowledge proof — shared event";
const existing = overview.cases.find(item => item.title === title);
if (existing) {
  const existingCandidate = overview.candidates.find(item => item.investmentCaseId === existing.id);
  console.log(JSON.stringify({ reused: true, campaignId: campaign.id, eventId: event.id, caseId: existing.id, candidateId: existingCandidate?.id || null }, null, 2));
} else {
  const investmentCase = await caller.studio.createInvestmentCase({
    campaignId: campaign.id,
    title,
    investmentThesis: "Test whether a structured technician knowledge-capture proof can produce evidence for a future investment assessment without claiming a realized outcome.",
    problemStatement: "Service teams may lose reusable diagnostic knowledge across cases; this controlled proof will test traceability and review readiness.",
    businessCase: "Test-only shared-event business case. This second case intentionally joins the existing scheduled hackathon so multiple approved cases can be proven and later judged against their own evidence contracts.",
    financialDetail: { status: "test_only", note: "No financial outcome is asserted." },
  });
  await caller.studio.approveForProof({ caseId: investmentCase.id, rationale: "Test-only selection into a shared scheduled proof event; this is not an investment decision." });
  const contract = await caller.studio.createProofContract({
    investmentCaseId: investmentCase.id,
    proofEventId: event.id,
    candidateTitle: "Illustrative technician knowledge proof",
    proofQuestion: "Can a team demonstrate traceable technician knowledge capture that a human sponsor can assess against the originating investment thesis?",
    requiredArtifacts: [
      { key: "business_summary", label: "Business summary", required: true, purpose: "Connect the proof to the investment thesis." },
      { key: "brd", label: "Business requirements document", required: true, purpose: "Define process requirements and acceptance conditions." },
      { key: "technical_requirements", label: "Technical requirements", required: true, purpose: "Define technical and security constraints." },
      { key: "repository", label: "Repository / code evidence", required: true, purpose: "Provide authorized code evidence." },
      { key: "demo", label: "Working demonstration", required: true, purpose: "Demonstrate the proof outcome." },
    ],
    rubric: [
      { key: "investment_fit", label: "Investment case fit", weight: 30, description: "Tests the originating thesis." },
      { key: "proof_quality", label: "Proof quality", weight: 30, description: "Tests evidence completeness." },
      { key: "technical_delivery", label: "Technical delivery", weight: 25, description: "Tests feasible and secure delivery." },
      { key: "innovation_value", label: "Innovation and value", weight: 15, description: "Tests differentiated value." },
    ],
  });
  console.log(JSON.stringify({ reused: false, campaignId: campaign.id, eventId: event.id, caseId: investmentCase.id, candidateId: contract.candidateId }, null, 2));
}
