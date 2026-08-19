import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({
  user: {
    id: 1,
    openId: "clean-rebuild-learning-runner",
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

const result = await caller.studio.archiveInvestmentLearning({
  investmentCaseId: 1,
  proofCandidateId: 1,
  judgeDecisionId: 1,
  investmentGateId: 1,
  validatedAssumptions: [
    {
      assumption: "Structured service-signal triage can improve escalation evidence.",
      result: "not_tested",
      evidence: "The test proof includes the configured evidence artifacts, but the governed Agent packet is explicitly awaiting a completed evaluation.",
    },
  ],
  limitations: [
    "The governed Agent evaluation was unavailable for this test fixture, so no AI conclusion is represented as completed.",
    "The human decision returned the proof to the team for additional evidence.",
  ],
  reusableLearning: "A proof contract must keep the investment thesis, required evidence, agent limitations, and human rationale together so future sponsors can inspect why a gate changed.",
  nextInvestmentAction: "Return the proof to the team, complete the governed evidence evaluation or direct human artifact inspection, then reopen the sponsor gate.",
});

console.log(JSON.stringify({ learningId: result.id, testOnly: true }, null, 2));
