import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { parse as parseCookie } from "cookie";
import mammoth from "mammoth";
import { COOKIE_NAME } from "@shared/const";
import {
  announcements,
  announcementAcknowledgements,
  hackathonFaqs,
  hackathonRegistrations,
  mentorRequests,
  hackathonScheduleItems,
  hackathons,
  judgeAssignments,
  opportunities,
  consentRecords,
  opportunityCommunityNotes,
  opportunityEndorsements,
  organizerCopilotDrafts,
  projects,
  projectAssets,
  projectTracks,
  rubricCriteria,
  researchRuns,
  reviewerCalibrationCases,
  reviewerCalibrationResponses,
  scorecards,
  scoreItems,
  specialistEvaluations,
  submissionAudits,
  teamJoinRequests,
  teamAlerts,
  teamMessages,
  teamMembers,
  teams,
  tracks,
  userProfiles,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { averageFinalizedHumanScores } from "../services/scoreAggregation";
import { summarizeMentorCapacity } from "../services/mentorCapacity";
import { draftEventConfigurationFromEvidence, type OrganizerCopilotDraft } from "../services/organizerCopilot";
import { extractPdfEvidence } from "../services/opportunityAi";
import { storageGetSignedUrl, storagePut } from "../storage";
import { createHeartbeatJob, deleteHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The data service is not available." });
  return db;
}

function ensureAdmin(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "This action requires organizer or sponsor authorization." });
}

async function ensureOrganizerOrAdmin(userId: number, role: string) {
  if (role === "admin") return;
  const db = await dbOrThrow();
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (!profile || !["organizer", "sponsor", "admin"].includes(profile.persona)) throw new TRPCError({ code: "FORBIDDEN", message: "This action requires organizer or sponsor authorization." });
}

async function ensureSponsorOrAdmin(userId: number, role: string) {
  if (role === "admin") return;
  const db = await dbOrThrow();
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (profile?.persona !== "sponsor") throw new TRPCError({ code: "FORBIDDEN", message: "This action requires sponsor or administrator authorization." });
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120);
}

function cleanAssetName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

function uploadBuffer(base64: string) {
  const cleaned = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  return Buffer.from(cleaned, "base64");
}

export function buildCommunitySignalProofContext(endorsementCount: number, noteCount: number) {
  if (!endorsementCount && !noteCount) return "";
  return `\n\nCommunity signal context (non-binding): ${endorsementCount} endorsement(s) and ${noteCount} structured observation(s) were recorded before the proof sprint. Treat these as hypotheses and evidence offers to investigate; do not treat popularity as validation or a decision.`;
}

function scheduleSessionToken(cookieHeader: string | undefined) {
  const token = parseCookie(cookieHeader ?? "")[COOKIE_NAME];
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in organizer session is required to manage audit processing." });
  return token;
}

function assertSixFieldCron(cron: string) {
  if (cron.trim().split(/\s+/).length !== 6) throw new TRPCError({ code: "BAD_REQUEST", message: "Audit processing uses a six-field UTC cron expression, for example: 0 */5 * * * *." });
}

export function rankOptInTeamFit(input: { requestedSkills: string[]; memberRoles: string[]; participantSkills: string[]; participantRoles: string[] }) {
  const requested = input.requestedSkills.map(item => item.toLowerCase());
  const mySkills = new Set(input.participantSkills.map(item => item.toLowerCase()));
  const myRoles = Array.from(new Set(input.participantRoles.map(item => item.toLowerCase())));
  const existingRoles = new Set(input.memberRoles.map(item => item.toLowerCase()));
  const directSkillMatches = requested.filter(item => mySkills.has(item));
  const complementaryRoles = myRoles.filter(role => !existingRoles.has(role));
  return {
    score: directSkillMatches.length * 3 + complementaryRoles.length,
    reasons: [
      ...directSkillMatches.map(skill => `Looking for your ${skill} skill`),
      ...complementaryRoles.slice(0, 3).map(role => `Adds a ${role} perspective not yet listed by the team`),
    ],
  };
}

export function deriveEventPulse(input: { registrations: number; teams: number; projects: number; submitted: number; auditsComplete: number; auditsInFlight: number; specialistComplete: number; finalScorecards: number }) {
  const specialistExpected = input.auditsComplete * 5;
  const blockers: string[] = [];
  if (!input.teams) blockers.push("No team has formed yet.");
  if (input.teams && !input.projects) blockers.push("Teams have not created proof projects yet.");
  if (input.projects && !input.submitted) blockers.push("Proof projects remain in draft; final evidence has not been submitted.");
  if (input.submitted && !input.auditsComplete) blockers.push(input.auditsInFlight ? "Submitted proof is awaiting audit completion." : "Submitted proof has no completed audit yet.");
  if (input.auditsComplete && input.specialistComplete < specialistExpected) blockers.push(`Cited specialist reviews are still pending (${input.specialistComplete}/${specialistExpected} complete).`);
  if (input.auditsComplete && input.specialistComplete >= specialistExpected && !input.finalScorecards) blockers.push("Evidence is available; a human decision remains open.");
  return { ...input, specialistExpected, blockers, decisionReady: Boolean(input.auditsComplete && input.specialistComplete >= specialistExpected && input.finalScorecards) };
}

async function ensureMembership(hackathonId: number, userId: number, role: string) {
  const db = await dbOrThrow();
  if (role === "admin") return db;
  const [event] = await db.select().from(hackathons).where(eq(hackathons.id, hackathonId)).limit(1);
  if (event && (event.organizerId === userId || event.sponsorId === userId)) return db;
  const [registration] = await db.select().from(hackathonRegistrations).where(and(eq(hackathonRegistrations.hackathonId, hackathonId), eq(hackathonRegistrations.userId, userId))).limit(1);
  if (!registration) throw new TRPCError({ code: "FORBIDDEN", message: "Register for this hackathon before accessing its workspaces." });
  return db;
}

export const hackathonsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await dbOrThrow();
    return db.select().from(hackathons).orderBy(desc(hackathons.updatedAt));
  }),

  leaderboard: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await dbOrThrow();
    const [event] = await db.select().from(hackathons).where(eq(hackathons.id, input.hackathonId)).limit(1);
    if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
    const [eventProjects, criteria, allCards, allItems, audits] = await Promise.all([
      db.select().from(projects).where(eq(projects.hackathonId, event.id)),
      db.select().from(rubricCriteria).where(eq(rubricCriteria.hackathonId, event.id)),
      db.select().from(scorecards).where(eq(scorecards.finalized, true)),
      db.select().from(scoreItems),
      db.select().from(submissionAudits).orderBy(desc(submissionAudits.createdAt)),
    ]);
    return eventProjects.map(project => {
      const finalizedCards = allCards.filter(card => card.projectId === project.id);
      const latestAudit = audits.find(audit => audit.projectId === project.id && audit.status === "complete") || null;
      return {
        projectId: project.id,
        title: project.title,
        submittedAt: project.submittedAt,
        finalizedJudgeCount: finalizedCards.length,
        humanScore: averageFinalizedHumanScores(finalizedCards, allItems, criteria),
        agentPreview: latestAudit?.finalSuggestedScore ? Number(latestAudit.finalSuggestedScore) : null,
      };
    }).sort((a, b) => (b.humanScore ?? -1) - (a.humanScore ?? -1) || a.title.localeCompare(b.title));
  }),

  eventPulse: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const [event] = await db.select().from(hackathons).where(eq(hackathons.id, input.hackathonId)).limit(1);
    if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
    const [registrations, eventTeams, eventProjects] = await Promise.all([
      db.select().from(hackathonRegistrations).where(eq(hackathonRegistrations.hackathonId, event.id)),
      db.select().from(teams).where(eq(teams.hackathonId, event.id)),
      db.select().from(projects).where(eq(projects.hackathonId, event.id)),
    ]);
    const projectIds = eventProjects.map(project => project.id);
    if (!projectIds.length) return deriveEventPulse({ registrations: registrations.length, teams: eventTeams.length, projects: 0, submitted: 0, auditsComplete: 0, auditsInFlight: 0, specialistComplete: 0, finalScorecards: 0 });
    const [audits, evaluations, finalCards] = await Promise.all([
      db.select().from(submissionAudits).where(inArray(submissionAudits.projectId, projectIds)),
      db.select().from(specialistEvaluations).where(inArray(specialistEvaluations.projectId, projectIds)),
      db.select().from(scorecards).where(and(inArray(scorecards.projectId, projectIds), eq(scorecards.finalized, true))),
    ]);
    return deriveEventPulse({
      registrations: registrations.length,
      teams: eventTeams.length,
      projects: eventProjects.length,
      submitted: eventProjects.filter(project => Boolean(project.submittedAt)).length,
      auditsComplete: audits.filter(audit => audit.status === "complete").length,
      auditsInFlight: audits.filter(audit => audit.status === "queued" || audit.status === "processing").length,
      specialistComplete: evaluations.filter(evaluation => evaluation.status === "complete").length,
      finalScorecards: finalCards.length,
    });
  }),

  myProjects: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    if (ctx.user.role === "admin") return db.select().from(projects).orderBy(desc(projects.updatedAt));
    const memberships = await db.select().from(teamMembers).where(eq(teamMembers.userId, ctx.user.id));
    const output = [];
    for (const membership of memberships) {
      const [project] = await db.select().from(projects).where(eq(projects.teamId, membership.teamId)).limit(1);
      if (project) output.push(project);
    }
    return output;
  }),

  myCommandEntry: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    const registrations = await db.select().from(hackathonRegistrations).where(eq(hackathonRegistrations.userId, ctx.user.id));
    if (!registrations.length) return [];
    const eventIds = registrations.map(registration => registration.hackathonId);
    const [events, eventProjects] = await Promise.all([
      db.select().from(hackathons).where(inArray(hackathons.id, eventIds)),
      db.select().from(projects).where(inArray(projects.hackathonId, eventIds)),
    ]);
    return registrations.map(registration => {
      const event = events.find(item => item.id === registration.hackathonId);
      const project = eventProjects.find(item => item.hackathonId === registration.hackathonId);
      const nextAction = !project
        ? { label: "Start or join a proof team", route: `/hackathons/${registration.hackathonId}` }
        : !project.submittedAt
          ? { label: "Complete final evidence", route: `/submission-evidence?project=${project.id}` }
          : { label: "Review cited findings", route: `/judging?project=${project.id}` };
      return {
        registrationId: registration.id,
        registrationStatus: registration.status,
        registrationRole: registration.registrationRole,
        hackathonId: registration.hackathonId,
        eventTitle: event?.title || "Proof sprint",
        eventStatus: event?.status || "unknown",
        opportunityId: event?.opportunityId || null,
        projectId: project?.id || null,
        projectTitle: project?.title || null,
        projectSubmittedAt: project?.submittedAt || null,
        nextAction,
      };
    });
  }),

  detail: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [event] = await db.select().from(hackathons).where(eq(hackathons.id, input.hackathonId)).limit(1);
    if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
    const [eventTracks, rubric, eventTeams, eventAnnouncements, eventProjects, myMemberships, faqs, schedule, myRegistration] = await Promise.all([
      db.select().from(tracks).where(eq(tracks.hackathonId, event.id)),
      db.select().from(rubricCriteria).where(eq(rubricCriteria.hackathonId, event.id)),
      db.select().from(teams).where(eq(teams.hackathonId, event.id)),
      db.select().from(announcements).where(eq(announcements.hackathonId, event.id)).orderBy(desc(announcements.createdAt)),
      db.select().from(projects).where(eq(projects.hackathonId, event.id)).orderBy(desc(projects.updatedAt)),
      db.select().from(teamMembers).where(eq(teamMembers.userId, ctx.user.id)),
      db.select().from(hackathonFaqs).where(eq(hackathonFaqs.hackathonId, event.id)).orderBy(hackathonFaqs.displayOrder),
      db.select().from(hackathonScheduleItems).where(eq(hackathonScheduleItems.hackathonId, event.id)).orderBy(hackathonScheduleItems.startsAt),
      db.select().from(hackathonRegistrations).where(and(eq(hackathonRegistrations.hackathonId, event.id), eq(hackathonRegistrations.userId, ctx.user.id))).limit(1),
    ]);
    const eventTeamIds = new Set(eventTeams.map(team => team.id));
    const currentEventMemberships = myMemberships.filter(membership => eventTeamIds.has(membership.teamId));
    return {
      event,
      tracks: eventTracks,
      rubric,
      teams: eventTeams,
      announcements: eventAnnouncements,
      projects: eventProjects,
      faqs,
      schedule,
      myTeamIds: currentEventMemberships.map(membership => membership.teamId),
      myLeaderTeamIds: currentEventMemberships.filter(membership => membership.role === "leader").map(membership => membership.teamId),
      myRegistrationRole: myRegistration[0]?.registrationRole || null,
    };
  }),

  createFromOpportunity: protectedProcedure.input(z.object({
    opportunityId: z.number().int().positive(),
    title: z.string().min(6).max(255),
    tagline: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),
    maxTeamSize: z.number().int().min(2).max(12).default(4),
  })).mutation(async ({ ctx, input }) => {
    await ensureSponsorOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, input.opportunityId)).limit(1);
    if (!opportunity) throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found." });
    if (opportunity.status !== "selected") throw new TRPCError({ code: "BAD_REQUEST", message: "Select the opportunity before creating a hackathon challenge." });
    const [endorsements, communityNotes] = await Promise.all([
      db.select().from(opportunityEndorsements).where(eq(opportunityEndorsements.opportunityId, opportunity.id)),
      db.select().from(opportunityCommunityNotes).where(eq(opportunityCommunityNotes.opportunityId, opportunity.id)),
    ]);
    const communityContext = buildCommunitySignalProofContext(endorsements.length, communityNotes.length);
    const slug = `${slugify(input.title)}-${nanoid(6).toLowerCase()}`;
    const created = await db.insert(hackathons).values({
      opportunityId: opportunity.id,
      organizerId: ctx.user.id,
      sponsorId: ctx.user.id,
      title: input.title,
      slug,
      tagline: input.tagline,
      description: `${input.description || opportunity.problemStatement}${communityContext}`,
      maxTeamSize: input.maxTeamSize,
    });
    const hackathonId = Number(created[0].insertId);
    await Promise.all([
      db.update(opportunities).set({ stage: "hackathon" }).where(eq(opportunities.id, opportunity.id)),
      db.insert(tracks).values({ hackathonId, title: "Primary value proof", description: "Test the assumption most likely to change the investment decision." }),
      db.insert(rubricCriteria).values([
        { hackathonId, title: "Technical execution", description: "Verified implementation evidence, architecture, and delivery viability.", weight: "35.00", maxScore: 10, evaluationMethod: "Evidence from code, test results, and working integration." },
        { hackathonId, title: "Claim integrity", description: "Alignment between pitch claims and submitted evidence.", weight: "25.00", maxScore: 10, evaluationMethod: "Claim-by-claim audit with citations." },
        { hackathonId, title: "Product originality", description: "Relevant precedent and differentiation, not a legal novelty conclusion.", weight: "20.00", maxScore: 10, evaluationMethod: "Source-backed similarity screen and human interpretation." },
        { hackathonId, title: "Pitch and problem fit", description: "Clarity of problem, value hypothesis, and decision-ready next step.", weight: "20.00", maxScore: 10, evaluationMethod: "Human judge assessment informed by the fieldbook baseline." },
      ]),
    ]);
    return { hackathonId, slug };
  }),

  updateStatus: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), status: z.enum(["draft", "registration_open", "hacking_active", "judging_active", "completed"]) })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.update(hackathons).set({ status: input.status }).where(eq(hackathons.id, input.hackathonId));
    return { success: true };
  }),

  updateEventConfiguration: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), title: z.string().min(6).max(255), tagline: z.string().max(500).optional(), description: z.string().max(5000).optional(), bannerUrl: z.string().url().optional().or(z.literal("")), rules: z.string().max(15000).optional(), maxTeamSize: z.number().int().min(2).max(12), registrationStart: z.coerce.date().optional(), registrationEnd: z.coerce.date().optional(), hackingStart: z.coerce.date().optional(), hackingEnd: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const { hackathonId, bannerUrl, ...configuration } = input;
    await db.update(hackathons).set({ ...configuration, bannerUrl: bannerUrl || null }).where(eq(hackathons.id, hackathonId));
    return { success: true };
  }),

  scheduleAuditWorker: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), cron: z.string().min(9).max(80), enabled: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    assertSixFieldCron(input.cron);
    const db = await dbOrThrow();
    const [event] = await db.select().from(hackathons).where(eq(hackathons.id, input.hackathonId)).limit(1);
    if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
    const token = scheduleSessionToken(ctx.req.headers.cookie);
    if (event.auditScheduleCronTaskUid) {
      const update = await updateHeartbeatJob(event.auditScheduleCronTaskUid, { cron: input.cron, enable: input.enabled, path: "/api/scheduled/processHackathonAudits", description: `Queued Hackathon Agent audits for event ${event.id}` }, token);
      return { taskUid: event.auditScheduleCronTaskUid, nextExecutionAt: update.nextExecutionAt ?? null };
    }
    const job = await createHeartbeatJob({ name: `hackathon-audit-worker-${event.id}`, cron: input.cron, path: "/api/scheduled/processHackathonAudits", payload: {}, description: `Queued Hackathon Agent audits for event ${event.id}` }, token);
    await db.update(hackathons).set({ auditScheduleCronTaskUid: job.taskUid }).where(eq(hackathons.id, event.id));
    return { taskUid: job.taskUid, nextExecutionAt: job.nextExecutionAt ?? null };
  }),

  stopAuditWorker: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [event] = await db.select().from(hackathons).where(eq(hackathons.id, input.hackathonId)).limit(1);
    if (!event?.auditScheduleCronTaskUid) return { success: true, skipped: "not_scheduled" as const };
    await deleteHeartbeatJob(event.auditScheduleCronTaskUid, scheduleSessionToken(ctx.req.headers.cookie));
    await db.update(hackathons).set({ auditScheduleCronTaskUid: null }).where(eq(hackathons.id, event.id));
    return { success: true };
  }),

  createScheduleItem: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), kind: z.enum(["opening", "workshop", "office_hours", "submission_deadline", "demo", "judging", "awards", "other"]), title: z.string().min(3).max(255), description: z.string().max(3000).optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const created = await db.insert(hackathonScheduleItems).values({ ...input, createdById: ctx.user.id });
    return { scheduleItemId: Number(created[0].insertId) };
  }),

  deleteScheduleItem: protectedProcedure.input(z.object({ scheduleItemId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.delete(hackathonScheduleItems).where(eq(hackathonScheduleItems.id, input.scheduleItemId));
    return { success: true };
  }),

  createTrack: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), title: z.string().min(3).max(160), description: z.string().max(3000).optional(), prizeAmount: z.number().min(0).max(100000000).optional(), sponsorName: z.string().max(160).optional() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const created = await db.insert(tracks).values({ ...input, prizeAmount: input.prizeAmount?.toFixed(2) });
    return { trackId: Number(created[0].insertId) };
  }),

  createRubricCriterion: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), title: z.string().min(3).max(120), description: z.string().max(3000).optional(), maxScore: z.number().int().min(1).max(100).default(10), weight: z.number().min(0.01).max(100), evaluationMethod: z.string().max(200).optional() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const created = await db.insert(rubricCriteria).values({ ...input, weight: input.weight.toFixed(2) });
    return { criterionId: Number(created[0].insertId) };
  }),

  createFaq: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), question: z.string().min(5).max(500), answer: z.string().min(5).max(10000), displayOrder: z.number().int().min(0).max(9999).default(0) })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const created = await db.insert(hackathonFaqs).values({ ...input, createdById: ctx.user.id });
    return { faqId: Number(created[0].insertId) };
  }),

  updateFaq: protectedProcedure.input(z.object({ faqId: z.number().int().positive(), question: z.string().min(5).max(500), answer: z.string().min(5).max(10000), displayOrder: z.number().int().min(0).max(9999) })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.update(hackathonFaqs).set({ question: input.question, answer: input.answer, displayOrder: input.displayOrder }).where(eq(hackathonFaqs.id, input.faqId));
    return { success: true };
  }),

  deleteFaq: protectedProcedure.input(z.object({ faqId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.delete(hackathonFaqs).where(eq(hackathonFaqs.id, input.faqId));
    return { success: true };
  }),

  register: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), role: z.enum(["participant", "mentor", "judge"]).default("participant") })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [event] = await db.select().from(hackathons).where(eq(hackathons.id, input.hackathonId)).limit(1);
    if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
    await db.insert(hackathonRegistrations).values({ hackathonId: event.id, userId: ctx.user.id, registrationRole: input.role }).onDuplicateKeyUpdate({ set: { status: "registered", registrationRole: input.role } });
    return { success: true };
  }),

  mentorDirectory: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const [mentorRows, officeHours] = await Promise.all([
      db.select().from(hackathonRegistrations).where(and(eq(hackathonRegistrations.hackathonId, input.hackathonId), eq(hackathonRegistrations.registrationRole, "mentor"), eq(hackathonRegistrations.status, "registered"))),
      db.select().from(hackathonScheduleItems).where(and(eq(hackathonScheduleItems.hackathonId, input.hackathonId), eq(hackathonScheduleItems.kind, "office_hours"))).orderBy(hackathonScheduleItems.startsAt),
    ]);
    const mentorIds = mentorRows.map(row => row.userId);
    const [profiles, people] = mentorIds.length ? await Promise.all([
      db.select().from(userProfiles).where(inArray(userProfiles.userId, mentorIds)),
      db.select().from(users).where(inArray(users.id, mentorIds)),
    ]) : [[], []];
    const profileByUser = new Map(profiles.filter(profile => profile.talentConsent).map(profile => [profile.userId, profile]));
    return {
      mentors: mentorRows.map(row => {
        const profile = profileByUser.get(row.userId);
        const person = people.find(item => item.id === row.userId);
        return { userId: row.userId, name: profile ? person?.name || "Registered mentor" : "Registered mentor", skills: profile?.skills || [], availabilityRoles: profile?.availabilityRoles || [], bio: profile?.bio || null, consented: Boolean(profile) };
      }),
      officeHours: officeHours.map(item => ({ id: item.id, title: item.title, description: item.description || null, startsAt: item.startsAt, endsAt: item.endsAt || null })),
      notice: "Mentor detail is shown only when the mentor has provided talent consent. Routing remains a participant request; no availability is implied by registration alone.",
    };
  }),

  createTeam: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), name: z.string().min(2).max(150), lookingForMembers: z.boolean().default(false), lookingForSkills: z.array(z.string().max(80)).max(12).default([]) })).mutation(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const created = await db.insert(teams).values({ hackathonId: input.hackathonId, name: input.name, inviteCode: nanoid(10), lookingForMembers: input.lookingForMembers, lookingForSkills: input.lookingForSkills });
    const teamId = Number(created[0].insertId);
    await db.insert(teamMembers).values({ teamId, userId: ctx.user.id, role: "leader" });
    return { teamId };
  }),

  requestTeamJoin: protectedProcedure.input(z.object({ teamId: z.number().int().positive(), message: z.string().max(800).optional() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [team] = await db.select().from(teams).where(eq(teams.id, input.teamId)).limit(1);
    if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
    await ensureMembership(team.hackathonId, ctx.user.id, ctx.user.role);
    await db.insert(teamJoinRequests).values({ teamId: input.teamId, userId: ctx.user.id, message: input.message }).onDuplicateKeyUpdate({ set: { status: "pending", message: input.message } });
    return { success: true };
  }),

  suggestTeams: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const [profile, eventTeams, allMemberships, allProfiles] = await Promise.all([
      db.select().from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1).then(rows => rows[0]),
      db.select().from(teams).where(and(eq(teams.hackathonId, input.hackathonId), eq(teams.lookingForMembers, true))),
      db.select().from(teamMembers),
      db.select().from(userProfiles),
    ]);
    if (!profile?.lookingForTeam) return { recommendations: [], notice: "Turn on team availability in your profile to receive opt-in recommendations." };
    const currentTeamIds = new Set(allMemberships.filter(member => member.userId === ctx.user.id).map(member => member.teamId));
    const profileByUser = new Map(allProfiles.map(item => [item.userId, item]));
    const recommendations = eventTeams.filter(team => !currentTeamIds.has(team.id)).map(team => {
      const members = allMemberships.filter(member => member.teamId === team.id);
      const ranked = rankOptInTeamFit({ requestedSkills: team.lookingForSkills || [], memberRoles: members.flatMap(member => profileByUser.get(member.userId)?.availabilityRoles || []), participantSkills: profile.skills || [], participantRoles: profile.availabilityRoles || [] });
      return { teamId: team.id, name: team.name, lookingForSkills: team.lookingForSkills || [], memberCount: members.length, score: ranked.score, reasons: ranked.reasons.length ? ranked.reasons : ["Open team; review its stated needs before requesting to join."] };
    }).sort((left, right) => right.score - left.score || left.name.localeCompare(right.name)).slice(0, 8);
    return { recommendations, notice: recommendations.length ? null : "No open teams currently match your stated availability. You can still browse teams or update your profile." };
  }),

  joinRequests: protectedProcedure.input(z.object({ teamId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [membership] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, input.teamId), eq(teamMembers.userId, ctx.user.id))).limit(1);
    if (ctx.user.role !== "admin" && membership?.role !== "leader") throw new TRPCError({ code: "FORBIDDEN", message: "Only a team leader can view team-join requests." });
    return db.select().from(teamJoinRequests).where(eq(teamJoinRequests.teamId, input.teamId)).orderBy(desc(teamJoinRequests.createdAt));
  }),

  decideJoinRequest: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), decision: z.enum(["accepted", "declined"]) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [request] = await db.select().from(teamJoinRequests).where(eq(teamJoinRequests.id, input.requestId)).limit(1);
    if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Join request not found." });
    const [membership] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, request.teamId), eq(teamMembers.userId, ctx.user.id))).limit(1);
    if (ctx.user.role !== "admin" && membership?.role !== "leader") throw new TRPCError({ code: "FORBIDDEN", message: "Only a team leader can decide this join request." });
    await db.update(teamJoinRequests).set({ status: input.decision, decidedAt: new Date() }).where(eq(teamJoinRequests.id, request.id));
    if (input.decision === "accepted") await db.insert(teamMembers).values({ teamId: request.teamId, userId: request.userId, role: "member" }).onDuplicateKeyUpdate({ set: { role: "member" } });
    return { success: true };
  }),

  createProject: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), teamId: z.number().int().positive(), trackId: z.number().int().positive().optional(), title: z.string().min(4).max(255), tagline: z.string().max(500).optional(), description: z.string().min(20).max(6000), techStack: z.array(z.string().max(80)).max(30).default([]), githubUrl: z.string().url().optional(), demoUrl: z.string().url().optional(), videoUrl: z.string().url().optional(), pitchDeckUrl: z.string().url().optional() })).mutation(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const [membership] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, input.teamId), eq(teamMembers.userId, ctx.user.id))).limit(1);
    if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Only team members can create a project submission." });
    const created = await db.insert(projects).values({ ...input, trackId: input.trackId, techStack: input.techStack });
    return { projectId: Number(created[0].insertId) };
  }),

  submitProject: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), githubUrl: z.string().url().optional(), demoUrl: z.string().url().optional(), videoUrl: z.string().url().optional(), pitchDeckUrl: z.string().url().optional() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
    const [membership] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, ctx.user.id))).limit(1);
    if (!membership && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only team members can submit this project." });
    await db.update(projects).set({ githubUrl: input.githubUrl, demoUrl: input.demoUrl, videoUrl: input.videoUrl, pitchDeckUrl: input.pitchDeckUrl, submittedAt: new Date() }).where(eq(projects.id, project.id));
    return { success: true };
  }),

  uploadProjectDocument: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), fileName: z.string().min(1).max(300), mimeType: z.string().min(1).max(150), base64: z.string().min(1), consent: z.literal(true) })).mutation(async ({ ctx, input }) => {
    const allowedMimeTypes = new Set(["text/plain", "text/markdown", "text/csv", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
    if (!allowedMimeTypes.has(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Deep evaluation supports plain text, Markdown, CSV, PDF, and DOCX BRD or technical documents." });
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
    const [membership] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, ctx.user.id))).limit(1);
    if (!membership && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only project team members can add evaluation evidence." });
    const buffer = uploadBuffer(input.base64);
    if (buffer.length > 8 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "A BRD or technical document must be 8 MB or smaller." });
    const stored = await storagePut(`users/${ctx.user.id}/projects/${project.id}/${cleanAssetName(input.fileName)}`, buffer, input.mimeType);
    let extraction: Record<string, unknown>;
    if (input.mimeType.startsWith("text/")) extraction = { text: buffer.toString("utf8").slice(0, 30000), method: "direct_text" };
    else if (input.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
      extraction = { text: result.value.slice(0, 30000), warnings: result.messages, method: "docx_raw_text" };
    } else {
      const signedUrl = await storageGetSignedUrl(stored.key);
      extraction = { ...(await extractPdfEvidence(signedUrl)), method: "ai_pdf_extraction" };
    }
    await db.insert(consentRecords).values({ userId: ctx.user.id, scope: "document_processing", accepted: true, policyVersion: "v1" });
    const inserted = await db.insert(projectAssets).values({ projectId: project.id, uploadedById: ctx.user.id, assetType: "document", storageKey: stored.key, storageUrl: stored.url, originalName: cleanAssetName(input.fileName), mimeType: input.mimeType, byteSize: buffer.length, extraction, contributorConfirmed: true });
    return { assetId: Number(inserted[0].insertId), originalName: cleanAssetName(input.fileName), extraction, storageUrl: stored.url };
  }),

  projectDocuments: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
    const [membership, assignment] = await Promise.all([
      db.select().from(teamMembers).where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, ctx.user.id))).limit(1),
      db.select().from(judgeAssignments).where(and(eq(judgeAssignments.projectId, project.id), eq(judgeAssignments.judgeId, ctx.user.id))).limit(1),
    ]);
    if (ctx.user.role !== "admin" && !membership && !assignment?.[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Only an authorized team member or judge can view project evaluation documents." });
    return db.select().from(projectAssets).where(and(eq(projectAssets.projectId, project.id), eq(projectAssets.assetType, "document"))).orderBy(desc(projectAssets.createdAt));
  }),

  setProjectTracks: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), trackIds: z.array(z.number().int().positive()).min(1).max(10) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
    const [membership] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, ctx.user.id))).limit(1);
    if (ctx.user.role !== "admin" && membership?.role !== "leader") throw new TRPCError({ code: "FORBIDDEN", message: "Only a team leader can route a project to prize tracks." });
    const eventTracks = await db.select().from(tracks).where(eq(tracks.hackathonId, project.hackathonId));
    const allowed = new Set(eventTracks.map(track => track.id));
    const uniqueIds = Array.from(new Set(input.trackIds));
    if (uniqueIds.some(trackId => !allowed.has(trackId))) throw new TRPCError({ code: "BAD_REQUEST", message: "Every selected track must belong to this hackathon." });
    await db.delete(projectTracks).where(eq(projectTracks.projectId, project.id));
    await db.insert(projectTracks).values(uniqueIds.map(trackId => ({ projectId: project.id, trackId })));
    await db.update(projects).set({ trackId: uniqueIds[0] }).where(eq(projects.id, project.id));
    return { success: true, trackIds: uniqueIds };
  }),

  projectTrackRouting: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
    const [membership] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, ctx.user.id))).limit(1);
    if (ctx.user.role !== "admin" && !membership) throw new TRPCError({ code: "FORBIDDEN", message: "Only team members can view project prize routing." });
    const [eventTracks, routing] = await Promise.all([
      db.select().from(tracks).where(eq(tracks.hackathonId, project.hackathonId)),
      db.select().from(projectTracks).where(eq(projectTracks.projectId, project.id)),
    ]);
    const selectedTrackIds = routing.length ? routing.map(item => item.trackId) : project.trackId ? [project.trackId] : [];
    return { tracks: eventTracks, selectedTrackIds, canEdit: ctx.user.role === "admin" || membership?.role === "leader" };
  }),

  teamMessages: protectedProcedure.input(z.object({ teamId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [membership] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, input.teamId), eq(teamMembers.userId, ctx.user.id))).limit(1);
    if (ctx.user.role !== "admin" && !membership) throw new TRPCError({ code: "FORBIDDEN", message: "Only team members can read team collaboration messages." });
    return db.select().from(teamMessages).where(eq(teamMessages.teamId, input.teamId)).orderBy(teamMessages.createdAt);
  }),

  postTeamMessage: protectedProcedure.input(z.object({ teamId: z.number().int().positive(), body: z.string().min(1).max(3000) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [membership] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, input.teamId), eq(teamMembers.userId, ctx.user.id))).limit(1);
    if (!membership && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only team members can post collaboration messages." });
    const created = await db.insert(teamMessages).values({ teamId: input.teamId, senderId: ctx.user.id, body: input.body.trim() });
    return { messageId: Number(created[0].insertId) };
  }),

  announce: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), title: z.string().min(3).max(255), body: z.string().min(3).max(5000), audience: z.enum(["all", "participants", "judges", "mentors"]).default("all") })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.insert(announcements).values({ ...input, createdById: ctx.user.id });
    return { success: true };
  }),

  communicationsFeed: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const [registration, profile, eventTeams, memberships, eventAnnouncements, eventSchedule] = await Promise.all([
      db.select().from(hackathonRegistrations).where(and(eq(hackathonRegistrations.hackathonId, input.hackathonId), eq(hackathonRegistrations.userId, ctx.user.id))).limit(1),
      db.select().from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1),
      db.select().from(teams).where(eq(teams.hackathonId, input.hackathonId)),
      db.select().from(teamMembers).where(eq(teamMembers.userId, ctx.user.id)),
      db.select().from(announcements).where(eq(announcements.hackathonId, input.hackathonId)).orderBy(desc(announcements.createdAt)),
      db.select().from(hackathonScheduleItems).where(eq(hackathonScheduleItems.hackathonId, input.hackathonId)).orderBy(hackathonScheduleItems.startsAt),
    ]);
    const organizer = ctx.user.role === "admin" || ["organizer", "sponsor", "admin"].includes(profile[0]?.persona || "");
    const audience = ({ participant: "participants", judge: "judges", mentor: "mentors" } as const)[registration[0]?.registrationRole || "participant"];
    const visibleAnnouncements = organizer ? eventAnnouncements : eventAnnouncements.filter(item => item.audience === "all" || item.audience === audience);
    const announcementIds = visibleAnnouncements.map(item => item.id);
    const acknowledgements = announcementIds.length ? await db.select().from(announcementAcknowledgements).where(inArray(announcementAcknowledgements.announcementId, announcementIds)) : [];
    const eventTeamIds = new Set(eventTeams.map(team => team.id));
    const myTeamIds = memberships.filter(membership => eventTeamIds.has(membership.teamId)).map(membership => membership.teamId);
    const alerts = organizer ? await db.select().from(teamAlerts).where(eq(teamAlerts.hackathonId, input.hackathonId)).orderBy(desc(teamAlerts.createdAt)) : myTeamIds.length ? await db.select().from(teamAlerts).where(inArray(teamAlerts.teamId, myTeamIds)).orderBy(desc(teamAlerts.createdAt)) : [];
    const timeline = [
      ...visibleAnnouncements.map(item => ({ id: `announcement-${item.id}`, type: "announcement" as const, title: item.title, detail: item.body, occurredAt: item.createdAt })),
      ...eventSchedule.map(item => ({ id: `schedule-${item.id}`, type: "schedule" as const, title: item.title, detail: item.description || item.kind.replace("_", " "), occurredAt: item.startsAt })),
      ...alerts.map(item => ({ id: `alert-${item.id}`, type: "team_alert" as const, title: item.title, detail: item.body, occurredAt: item.createdAt })),
    ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    return { isOrganizer: organizer, teams: eventTeams.map(team => ({ id: team.id, name: team.name })), announcements: visibleAnnouncements.map(item => ({ ...item, acknowledged: acknowledgements.some(ack => ack.announcementId === item.id && ack.userId === ctx.user.id), acknowledgementCount: acknowledgements.filter(ack => ack.announcementId === item.id).length })), alerts, timeline };
  }),

  acknowledgeAnnouncement: protectedProcedure.input(z.object({ announcementId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [announcement] = await db.select().from(announcements).where(eq(announcements.id, input.announcementId)).limit(1);
    if (!announcement) throw new TRPCError({ code: "NOT_FOUND", message: "Announcement not found." });
    await ensureMembership(announcement.hackathonId, ctx.user.id, ctx.user.role);
    const [registration] = await db.select().from(hackathonRegistrations).where(and(eq(hackathonRegistrations.hackathonId, announcement.hackathonId), eq(hackathonRegistrations.userId, ctx.user.id))).limit(1);
    const recipientAudience = ({ participant: "participants", judge: "judges", mentor: "mentors" } as const)[registration?.registrationRole || "participant"];
    if (ctx.user.role !== "admin" && announcement.audience !== "all" && announcement.audience !== recipientAudience) throw new TRPCError({ code: "FORBIDDEN", message: "This announcement is not addressed to your event role." });
    await db.insert(announcementAcknowledgements).values({ announcementId: announcement.id, userId: ctx.user.id }).onDuplicateKeyUpdate({ set: { acknowledgedAt: new Date() } });
    return { success: true };
  }),

  createTeamAlert: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), teamId: z.number().int().positive(), title: z.string().min(3).max(255), body: z.string().min(3).max(5000) })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [team] = await db.select().from(teams).where(and(eq(teams.id, input.teamId), eq(teams.hackathonId, input.hackathonId))).limit(1);
    if (!team) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a team from this proof sprint." });
    const created = await db.insert(teamAlerts).values({ ...input, createdById: ctx.user.id });
    return { alertId: Number(created[0].insertId) };
  }),

  organizerCopilotDrafts: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    return db.select().from(organizerCopilotDrafts).where(eq(organizerCopilotDrafts.hackathonId, input.hackathonId)).orderBy(desc(organizerCopilotDrafts.createdAt));
  }),

  draftFromOpportunity: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [event] = await db.select().from(hackathons).where(eq(hackathons.id, input.hackathonId)).limit(1);
    if (!event?.opportunityId) throw new TRPCError({ code: "BAD_REQUEST", message: "This Event HQ is not linked to a selected opportunity." });
    const [opportunity, research] = await Promise.all([
      db.select().from(opportunities).where(eq(opportunities.id, event.opportunityId)).limit(1),
      db.select().from(researchRuns).where(eq(researchRuns.opportunityId, event.opportunityId)).orderBy(desc(researchRuns.createdAt)).limit(1),
    ]);
    if (!opportunity[0]) throw new TRPCError({ code: "NOT_FOUND", message: "The selected opportunity was not found." });
    const payload = await draftEventConfigurationFromEvidence({ opportunity: opportunity[0], research: research[0] || null });
    const created = await db.insert(organizerCopilotDrafts).values({ hackathonId: event.id, opportunityId: event.opportunityId, requestedById: ctx.user.id, payload });
    return { draftId: Number(created[0].insertId), payload };
  }),

  adoptOrganizerCopilotDraft: protectedProcedure.input(z.object({
    draftId: z.number().int().positive(),
    tracks: z.array(z.object({ title: z.string().min(3).max(160), description: z.string().min(3).max(3000) })).min(1).max(6),
    rubric: z.array(z.object({ title: z.string().min(3).max(120), description: z.string().min(3).max(3000), evaluationMethod: z.string().max(200), weight: z.number().min(1).max(100) })).min(1).max(8),
  })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [draft] = await db.select().from(organizerCopilotDrafts).where(eq(organizerCopilotDrafts.id, input.draftId)).limit(1);
    if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Organizer copilot draft not found." });
    if (draft.status === "adopted") throw new TRPCError({ code: "CONFLICT", message: "This draft has already been adopted. Create a new draft for another configuration change." });
    const payload = draft.payload as OrganizerCopilotDraft;
    const adoptedPayload = { ...payload, adoptedConfiguration: { tracks: input.tracks, rubric: input.rubric, adoptedAt: new Date().toISOString(), adoptedBy: ctx.user.id } };
    for (const track of input.tracks) await db.insert(tracks).values({ hackathonId: draft.hackathonId, title: track.title.trim(), description: track.description.trim() });
    for (const criterion of input.rubric) await db.insert(rubricCriteria).values({ hackathonId: draft.hackathonId, title: criterion.title.trim(), description: criterion.description.trim(), evaluationMethod: criterion.evaluationMethod.trim() || null, weight: criterion.weight.toFixed(2), maxScore: 10 });
    await db.update(organizerCopilotDrafts).set({ status: "adopted", adoptedById: ctx.user.id, adoptedAt: new Date(), payload: adoptedPayload }).where(eq(organizerCopilotDrafts.id, draft.id));
    return { success: true, hackathonId: draft.hackathonId };
  }),

  reviewerCalibrationBoard: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [profile, registration] = await Promise.all([
      db.select().from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1),
      db.select().from(hackathonRegistrations).where(and(eq(hackathonRegistrations.hackathonId, input.hackathonId), eq(hackathonRegistrations.userId, ctx.user.id), eq(hackathonRegistrations.registrationRole, "judge"))).limit(1),
    ]);
    const isOrganizer = ctx.user.role === "admin" || ["organizer", "sponsor", "admin"].includes(profile[0]?.persona || "");
    const isJudge = Boolean(registration[0] && registration[0].status !== "withdrawn");
    if (!isOrganizer && !isJudge) throw new TRPCError({ code: "FORBIDDEN", message: "Only event organizers and registered judges can access reviewer calibration." });
    const [judges, assignments, cards, eventProjects, eventCases, responses, criteria, mentors, mentorHelpRequests] = await Promise.all([
      db.select().from(hackathonRegistrations).where(and(eq(hackathonRegistrations.hackathonId, input.hackathonId), eq(hackathonRegistrations.registrationRole, "judge"))),
      db.select().from(judgeAssignments).where(eq(judgeAssignments.hackathonId, input.hackathonId)),
      db.select().from(scorecards),
      db.select().from(projects).where(eq(projects.hackathonId, input.hackathonId)),
      db.select().from(reviewerCalibrationCases).where(eq(reviewerCalibrationCases.hackathonId, input.hackathonId)).orderBy(desc(reviewerCalibrationCases.createdAt)),
      db.select().from(reviewerCalibrationResponses),
      db.select().from(rubricCriteria).where(eq(rubricCriteria.hackathonId, input.hackathonId)),
      db.select().from(hackathonRegistrations).where(and(eq(hackathonRegistrations.hackathonId, input.hackathonId), eq(hackathonRegistrations.registrationRole, "mentor"))),
      db.select().from(mentorRequests).where(eq(mentorRequests.hackathonId, input.hackathonId)),
    ]);
    const reviewerAndMentorIds = Array.from(new Set([...judges.map(judge => judge.userId), ...mentors.map(mentor => mentor.userId)]));
    const people = reviewerAndMentorIds.length ? await db.select().from(users).where(inArray(users.id, reviewerAndMentorIds)) : [];
    const projectIds = new Set(eventProjects.map(project => project.id));
    const relevantCards = cards.filter(card => projectIds.has(card.projectId));
    const workloads = judges.filter(judge => judge.status !== "withdrawn").map(judge => ({
      judgeId: judge.userId,
      name: people.find(person => person.id === judge.userId)?.name || "Registered judge",
      activeAssignments: assignments.filter(assignment => assignment.judgeId === judge.userId && !assignment.isRecused).length,
      recusedAssignments: assignments.filter(assignment => assignment.judgeId === judge.userId && assignment.isRecused).length,
      finalizedReviews: relevantCards.filter(card => card.judgeId === judge.userId && card.finalized).length,
    }));
    const mentorWorkloads = summarizeMentorCapacity(mentors, people, mentorHelpRequests);
    const caseIds = new Set(eventCases.map(item => item.id));
    const calibrationResponses = responses.filter(response => caseIds.has(response.calibrationCaseId));
    const cases = eventCases.map(item => {
      const caseResponses = calibrationResponses.filter(response => response.calibrationCaseId === item.id);
      const byCriterion = new Map<number, number[]>();
      for (const response of caseResponses) for (const score of response.criterionScores || []) byCriterion.set(score.criterionId, [...(byCriterion.get(score.criterionId) || []), score.score]);
      const variance = Array.from(byCriterion.entries()).map(([criterionId, scores]) => ({ criterionId, title: criteria.find(criterion => criterion.id === criterionId)?.title || "Criterion", reviewerCount: scores.length, minimum: Math.min(...scores), maximum: Math.max(...scores), spread: Math.max(...scores) - Math.min(...scores) }));
      return { ...item, projectTitle: eventProjects.find(project => project.id === item.projectId)?.title || "Calibration project", responseCount: caseResponses.length, myResponse: caseResponses.find(response => response.judgeId === ctx.user.id) || null, variance: isOrganizer || item.status === "closed" ? variance : [] };
    });
    return { isOrganizer, isJudge, workloads, mentorWorkloads, projects: eventProjects.map(project => ({ id: project.id, title: project.title, submittedAt: project.submittedAt })), criteria, cases };
  }),

  createReviewerCalibrationCase: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), projectId: z.number().int().positive(), title: z.string().min(4).max(255) })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(and(eq(projects.id, input.projectId), eq(projects.hackathonId, input.hackathonId))).limit(1);
    if (!project) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a proof project from this event for calibration." });
    const created = await db.insert(reviewerCalibrationCases).values({ ...input, createdById: ctx.user.id });
    return { caseId: Number(created[0].insertId) };
  }),

  submitReviewerCalibrationResponse: protectedProcedure.input(z.object({ calibrationCaseId: z.number().int().positive(), rationale: z.string().min(20).max(6000), criterionScores: z.array(z.object({ criterionId: z.number().int().positive(), score: z.number().min(0).max(100) })).min(1).max(12) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [calibrationCase] = await db.select().from(reviewerCalibrationCases).where(eq(reviewerCalibrationCases.id, input.calibrationCaseId)).limit(1);
    if (!calibrationCase || calibrationCase.status !== "open") throw new TRPCError({ code: "BAD_REQUEST", message: "This calibration case is not open for reviewer rationale." });
    const [registration] = await db.select().from(hackathonRegistrations).where(and(eq(hackathonRegistrations.hackathonId, calibrationCase.hackathonId), eq(hackathonRegistrations.userId, ctx.user.id), eq(hackathonRegistrations.registrationRole, "judge"))).limit(1);
    if (ctx.user.role !== "admin" && (!registration || registration.status === "withdrawn")) throw new TRPCError({ code: "FORBIDDEN", message: "Only a registered judge can submit independent calibration rationale." });
    const criteria = await db.select().from(rubricCriteria).where(eq(rubricCriteria.hackathonId, calibrationCase.hackathonId));
    const allowedIds = new Set(criteria.map(criterion => criterion.id));
    if (input.criterionScores.some(score => !allowedIds.has(score.criterionId))) throw new TRPCError({ code: "BAD_REQUEST", message: "Calibration scores must use this event’s rubric criteria." });
    await db.insert(reviewerCalibrationResponses).values({ calibrationCaseId: calibrationCase.id, judgeId: ctx.user.id, rationale: input.rationale.trim(), criterionScores: input.criterionScores }).onDuplicateKeyUpdate({ set: { rationale: input.rationale.trim(), criterionScores: input.criterionScores } });
    return { success: true };
  }),

  closeReviewerCalibrationCase: protectedProcedure.input(z.object({ calibrationCaseId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.update(reviewerCalibrationCases).set({ status: "closed", closedAt: new Date() }).where(eq(reviewerCalibrationCases.id, input.calibrationCaseId));
    return { success: true };
  }),

  requestMentor: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive(), mentorId: z.number().int().positive(), projectId: z.number().int().positive().optional(), scheduleItemId: z.number().int().positive().optional(), requestNote: z.string().min(10).max(3000) })).mutation(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const [mentor] = await db.select().from(hackathonRegistrations).where(and(eq(hackathonRegistrations.hackathonId, input.hackathonId), eq(hackathonRegistrations.userId, input.mentorId), eq(hackathonRegistrations.registrationRole, "mentor"))).limit(1);
    if (!mentor) throw new TRPCError({ code: "BAD_REQUEST", message: "This mentor is not registered for the selected proof sprint." });
    if (input.projectId) {
      const [project] = await db.select().from(projects).where(and(eq(projects.id, input.projectId), eq(projects.hackathonId, input.hackathonId))).limit(1);
      if (!project) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected project does not belong to this proof sprint." });
      const [membership] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, ctx.user.id))).limit(1);
      if (ctx.user.role !== "admin" && !membership) throw new TRPCError({ code: "FORBIDDEN", message: "Only a team member may request mentoring for this project." });
    }
    const created = await db.insert(mentorRequests).values({ ...input, requesterId: ctx.user.id, requestNote: input.requestNote.trim() });
    return { requestId: Number(created[0].insertId), status: "pending" as const };
  }),

  myMentorRequests: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    return db.select().from(mentorRequests).where(and(eq(mentorRequests.requesterId, ctx.user.id), eq(mentorRequests.hackathonId, input.hackathonId))).orderBy(desc(mentorRequests.createdAt));
  }),

  mentorRequestQueue: protectedProcedure.input(z.object({ hackathonId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [profile, registration] = await Promise.all([
      db.select().from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1),
      db.select().from(hackathonRegistrations).where(and(eq(hackathonRegistrations.hackathonId, input.hackathonId), eq(hackathonRegistrations.userId, ctx.user.id), eq(hackathonRegistrations.registrationRole, "mentor"))).limit(1),
    ]);
    const organizer = ctx.user.role === "admin" || ["organizer", "sponsor", "admin"].includes(profile[0]?.persona || "");
    const mentor = Boolean(registration[0] && registration[0].status !== "withdrawn");
    if (!organizer && !mentor) throw new TRPCError({ code: "FORBIDDEN", message: "Only registered mentors and event organizers can view this request queue." });
    const rows = await db.select().from(mentorRequests).where(organizer ? eq(mentorRequests.hackathonId, input.hackathonId) : and(eq(mentorRequests.hackathonId, input.hackathonId), eq(mentorRequests.mentorId, ctx.user.id))).orderBy(desc(mentorRequests.createdAt));
    const requesterIds = Array.from(new Set(rows.map(row => row.requesterId)));
    const projectIds = rows.flatMap(row => row.projectId ? [row.projectId] : []);
    const [requesters, eventProjects] = await Promise.all([
      requesterIds.length ? db.select().from(users).where(inArray(users.id, requesterIds)) : [],
      projectIds.length ? db.select().from(projects).where(inArray(projects.id, projectIds)) : [],
    ]);
    return {
      isOrganizer: organizer,
      requests: rows.map(row => ({
        ...row,
        requesterName: requesters.find(person => person.id === row.requesterId)?.name || "Participant",
        projectTitle: row.projectId ? eventProjects.find(project => project.id === row.projectId)?.title || "Linked proof project" : null,
      })),
    };
  }),

  respondMentorRequest: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), status: z.enum(["accepted", "declined", "redirected"]), responseNote: z.string().max(1500).optional() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [request] = await db.select().from(mentorRequests).where(eq(mentorRequests.id, input.requestId)).limit(1);
    if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Mentor request not found." });
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1);
    const organizer = ctx.user.role === "admin" || ["organizer", "sponsor", "admin"].includes(profile?.persona || "");
    if (!organizer && request.mentorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the selected mentor or an event organizer may respond to this request." });
    await db.update(mentorRequests).set({ status: input.status, responseNote: input.responseNote?.trim() || null, respondedAt: new Date() }).where(eq(mentorRequests.id, input.requestId));
    return { success: true };
  }),
});
