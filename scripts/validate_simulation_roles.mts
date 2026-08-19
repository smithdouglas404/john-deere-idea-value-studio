import { eq } from "drizzle-orm";
import { users, rubricCriteria } from "../drizzle/schema";
import { getDb } from "../server/db";
import { appRouter } from "../server/routers";

function callerFor(user: any) {
  return appRouter.createCaller({ user, req: { headers: {}, protocol: "https" }, res: {} } as any);
}

const db = await getDb();
if (!db) throw new Error("Database unavailable");
const lookup = async (openId: string) => (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
const [participant, mentor, judge, admin] = await Promise.all([
  lookup("simulation_only_participant_v1"),
  lookup("simulation_only_mentor_v1"),
  lookup("simulation_only_judge_v1"),
  lookup("aayMRHbfhDvf89afCe3tVW"),
]);
if (!participant || !mentor || !judge || !admin) throw new Error("Simulation fixture is incomplete");

const participantCaller = callerFor(participant);
const mentorCaller = callerFor(mentor);
const judgeCaller = callerFor(judge);
const adminCaller = callerFor(admin);

const directory = await participantCaller.hackathons.mentorDirectory({ hackathonId: 1 });
const officeHour = directory.officeHours.find(item => item.title.startsWith("SIMULATION ONLY"));
if (!directory.mentors.some(item => item.userId === mentor.id) || !officeHour) throw new Error("Simulation mentor directory was not returned");
const request = await participantCaller.hackathons.requestMentor({ hackathonId: 1, mentorId: mentor.id, projectId: 1, scheduleItemId: officeHour.id, requestNote: "SIMULATION ONLY: Please review the architecture evidence gap and advise the next bounded proof step." });
await mentorCaller.hackathons.respondMentorRequest({ requestId: request.requestId, status: "accepted", responseNote: "SIMULATION ONLY: Bring the architecture boundary and code evidence to the scheduled review." });
const requestStatuses = await participantCaller.hackathons.myMentorRequests({ hackathonId: 1 });

const criteria = await db.select().from(rubricCriteria).where(eq(rubricCriteria.hackathonId, 1));
if (!criteria.length) throw new Error("No rubric criteria available for simulation calibration");
const calibration = await adminCaller.hackathons.createReviewerCalibrationCase({ hackathonId: 1, projectId: 1, title: "SIMULATION ONLY — Evidence calibration" });
await judgeCaller.hackathons.submitReviewerCalibrationResponse({ calibrationCaseId: calibration.caseId, rationale: "SIMULATION ONLY: The evidence supports a provisional technical review but does not establish a complete decision case.", criterionScores: criteria.slice(0, 4).map((criterion, index) => ({ criterionId: criterion.id, score: 60 + index * 5 })) });
const workload = await adminCaller.hackathons.reviewerCalibrationBoard({ hackathonId: 1 });

console.log(JSON.stringify({ mentorDirectory: directory.mentors.length, acceptedMentorRequest: requestStatuses.find(item => item.id === request.requestId)?.status, calibrationCaseId: calibration.caseId, calibrationResponses: workload.cases.find(item => item.id === calibration.caseId)?.responseCount, simulatedJudgeWorkload: workload.workloads.find(item => item.judgeId === judge.id)?.activeAssignments }, null, 2));
