import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({
  user: {
    id: 1,
    openId: "clean-market-context-runner",
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

const result = await caller.studio.addArtifact({
  teamProofId: 1,
  artifactKey: "market_research",
  artifactType: "market_research",
  title: "John Deere — Our Commitment to Customers: Service and Repair Resources",
  evidenceUrl: "https://www.deere.com/en-us/our-company/service-repair-resources",
  extractedText: "John Deere states that Operations Center PRO Service helps customers remotely monitor equipment, review productivity metrics, access service information, diagnose issues, and make repairs. This source is attached only as cited operating context for the dealer service proof; it does not establish adoption, value, or investment outcomes.",
  consentConfirmed: true,
});

console.log(JSON.stringify({ success: result.success, source: "John Deere Service and Repair Resources", testOnly: true }, null, 2));
