import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({
  user: { id: 1, openId: "test-only-admin-runner", name: "Douglas Smith", email: "smithdo@gmail.com", loginMethod: "system-test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { headers: {}, protocol: "https" },
  res: {},
} as any);

const skills = ["ux_ui", "cloud_architecture", "security", "development_quality", "value_feasibility"] as const;
const results = [];
for (const skill of skills) {
  const response = await caller.judging.runSpecialistEvaluation({ projectId: 1, skill });
  results.push({ skill, id: response.evaluation.id, status: response.evaluation.status, reused: response.reused });
}
console.log(JSON.stringify(results, null, 2));
