import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({
  user: {
    id: 1,
    openId: "test-only-admin-runner",
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

const output = await caller.judging.runEvaluationSynthesis({ projectId: 1 });
console.log(JSON.stringify({ id: output.id, status: output.status, model: output.model, recommendation: output.result.preliminaryRecommendation }, null, 2));
