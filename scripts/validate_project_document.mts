import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({
  user: { id: 1, openId: "test-only-admin-runner", name: "Douglas Smith", email: "smithdo@gmail.com", loginMethod: "system-test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { headers: {}, protocol: "https" },
  res: {},
} as any);

const contents = `# SIMULATION ONLY — Technical BRD\n\n## Requirement\nThe proof must show a bounded authorization decision, code evidence, and a cited market assumption.\n\n## Architecture\nThe reviewer must trace the API boundary, consent record, and human decision rationale.\n\n## Test\nProvide one request trace and one cited evidence record for each claim.`;
const base64 = `data:text/markdown;base64,${Buffer.from(contents).toString("base64")}`;
const result = await caller.hackathons.uploadProjectDocument({ projectId: 1, fileName: "SIMULATION_ONLY_technical_brd.md", mimeType: "text/markdown", base64, consent: true });
const documents = await caller.hackathons.projectDocuments({ projectId: 1 });
const document = documents.find(item => item.id === result.assetId);
console.log(JSON.stringify({ uploaded: Boolean(document), assetId: result.assetId, fileName: document?.originalName, extractionMethod: (document?.extraction as any)?.method, hasExtractedText: Boolean((document?.extraction as any)?.text) }, null, 2));
