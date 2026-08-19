import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "../server/db";
import { appRouter } from "../server/routers";

const db = await getDb();
if (!db) throw new Error("Database unavailable");
const userByOpenId = async (openId: string) => (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
const [participant, judge] = await Promise.all([userByOpenId("simulation_only_participant_v1"), userByOpenId("simulation_only_judge_v1")]);
if (!participant || !judge) throw new Error("Simulation roles are missing");
const callerFor = (user: any) => appRouter.createCaller({ user, req: { headers: {}, protocol: "https" }, res: {} } as any);
const participantCaller = callerFor(participant);
const judgeCaller = callerFor(judge);
let evidenceBefore = await participantCaller.judging.objectionContext({ projectId: 1 });
let challenge = evidenceBefore.challenges.find(item => item.claimReference === "specialist:30001:UX-F1");
let submitted = false;
if (!challenge) {
  await participantCaller.judging.submitObjection({ projectId: 1, claimReference: "specialist:30001:UX-F1", explanation: "SIMULATION ONLY: The team requests a human review of the cited UX evidence gap and will provide a structured interaction-flow artifact." });
  submitted = true;
  evidenceBefore = await participantCaller.judging.objectionContext({ projectId: 1 });
  challenge = evidenceBefore.challenges.find(item => item.claimReference === "specialist:30001:UX-F1");
}
if (!challenge) throw new Error("Submitted simulation challenge was not returned to participant evidence context");
await judgeCaller.judging.respondToObjection({ objectionId: challenge.id, status: "under_review", response: "SIMULATION ONLY: Human reviewer confirms the challenge is in scope. Provide the interaction flow, accessibility assumptions, and evidence of user task completion." });
const review = await judgeCaller.judging.reviewContext({ projectId: 1 });
const resolved = review.challenges.find(item => item.id === challenge.id);
console.log(JSON.stringify({ submitted, participantVisible: Boolean(challenge), judgeVisible: Boolean(resolved), status: resolved?.status, hasHumanResponse: Boolean(resolved?.response) }, null, 2));
