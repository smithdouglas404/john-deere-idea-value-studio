import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({
  user: {
    id: 1,
    openId: "test-only-judge-packet-runner",
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

const brief = await caller.judging.runEvaluationSynthesis({ projectId: 1, auditId: 1 });
console.log(JSON.stringify({ auditId: 1, synthesisId: brief.id, status: brief.status, model: brief.model, recommendation: brief.result.preliminaryRecommendation }, null, 2));
