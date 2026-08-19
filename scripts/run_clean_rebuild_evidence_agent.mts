import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({
  user: {
    id: 1,
    openId: "clean-rebuild-evidence-agent-runner",
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

const packet = await caller.studio.runEvidencePacket({ teamProofId: 1 });
console.log(JSON.stringify({ id: packet?.id, status: packet?.status, findings: Array.isArray(packet?.agentFindings) ? packet.agentFindings.length : 0, skills: Array.isArray(packet?.skillFindings) ? packet.skillFindings.length : 0 }, null, 2));
