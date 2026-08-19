import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({
  user: {
    id: 1,
    openId: "campaign-scheduling-validation",
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

const overview = await caller.studio.overview();
const campaign = overview.campaigns.find(item => item.title === "Illustrative campaign scheduling validation — test fixture");
const investmentCase = overview.cases.find(item => item.title === "Illustrative technician workflow case — schedule validation");

if (!campaign || !investmentCase) throw new Error("No-event campaign fixture is missing.");

let event = overview.events.find(item => item.title === "Illustrative shared scheduling event — test fixture");
if (!event) {
  event = await caller.studio.createProofEvent({
    title: "Illustrative shared scheduling event — test fixture",
    rules: "Test-only event rules: selected project teams submit required evidence, preserve inherited business-case context, disclose limitations, and respond to human questions. Agents advise; humans decide.",
    updateExpectations: "Test-only update expectation: update the proof record when evidence changes or human questions are answered.",
    status: "registration",
    proofStartsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    submissionClosesAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    judgingStartsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    judgingClosesAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
  });
}

const refreshed = await caller.studio.overview();
const alreadyAttached = refreshed.candidates.some(candidate => candidate.investmentCaseId === investmentCase.id && candidate.proofEventId === event.id);
if (!alreadyAttached) {
  await caller.studio.createProofCandidate({
    investmentCaseId: investmentCase.id,
    proofEventId: event.id,
    title: investmentCase.title,
    proofQuestion: "Can the project demonstrate a traceable technician workflow proof that is responsive to the original business case and suitable for human continuation assessment?",
    requiredArtifacts: [
      { key: "business_requirements", label: "Business requirements", required: true, purpose: "Test inherited business intent and acceptance conditions." },
      { key: "technical_design", label: "Technical design", required: true, purpose: "Test technical design and constraints." },
      { key: "code_or_prototype", label: "Code or prototype", required: true, purpose: "Test implementation or prototype evidence." },
      { key: "demo", label: "Demo evidence", required: true, purpose: "Test proof against the original selected objective." },
    ],
    rubric: [
      { key: "business_case_fit", label: "Business-case fit", weight: 30, description: "Tests the inherited objective." },
      { key: "proof_quality", label: "Proof quality", weight: 30, description: "Tests evidence completeness." },
      { key: "technical_delivery", label: "Technical delivery", weight: 25, description: "Tests feasibility and design." },
      { key: "innovation_and_value", label: "Innovation and value", weight: 15, description: "Tests differentiated value." },
    ],
  });
}

console.log(JSON.stringify({ campaignId: campaign.id, caseId: investmentCase.id, eventId: event.id, attached: true }, null, 2));
