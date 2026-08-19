import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  aiOverrides,
  hackathons,
  hackathonRegistrations,
  judgeAssignments,
  evaluationSyntheses,
  humanReviewAnnotations,
  objections,
  opportunities,
  projects,
  projectAssets,
  repositoryConnections,
  researchRuns,
  rubricCriteria,
  scorecards,
  scoreItems,
  specialistEvaluations,
  submissionAudits,
  teamMembers,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { runHackathonAgent } from "../services/hackathonAgent";
import { processQueuedAudit } from "../services/auditQueue";
import { buildSharedEvidencePacket, evidencePacketFreshness, runSpecialistEvaluator, shouldReuseSpecialistEvaluation, specialistSkills } from "../services/specialistEvaluators";
import { runEvaluationSynthesis } from "../services/evaluationSynthesis";

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The data service is not available." });
  return db;
}

async function projectAccess(projectId: number, userId: number, role: string) {
  const db = await dbOrThrow();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  const [membership, assignment] = await Promise.all([
    db.select().from(teamMembers).where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, userId))).limit(1),
    db.select().from(judgeAssignments).where(and(eq(judgeAssignments.projectId, project.id), eq(judgeAssignments.judgeId, userId))).limit(1),
  ]);
  return { db, project, isTeamMember: Boolean(membership[0]), isAssignedJudge: Boolean(assignment[0]) && !assignment[0].isRecused, isAdmin: role === "admin" };
}

function requireJudgeOrAdmin(access: Awaited<ReturnType<typeof projectAccess>>) {
  if (!access.isAdmin && !access.isAssignedJudge) throw new TRPCError({ code: "FORBIDDEN", message: "This review is available only to an assigned judge." });
}

export function auditContainsClaim(report: unknown, claimReference: string) {
  if (!report || typeof report !== "object" || Array.isArray(report)) return false;
  const claims = (report as { claims?: unknown }).claims;
  return Array.isArray(claims) && claims.some(claim => claim && typeof claim === "object" && (claim as { claimReference?: unknown }).claimReference === claimReference);
}

export function specialistContainsFinding(result: unknown, reference: string) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return false;
  const findings = (result as { findings?: unknown }).findings;
  return Array.isArray(findings) && findings.some(finding => finding && typeof finding === "object" && (finding as { reference?: unknown }).reference === reference);
}

export function specialistChallengeReference(evaluationId: number, findingReference: string) {
  return `specialist:${evaluationId}:${findingReference}`;
}

export function parseSpecialistChallengeReference(reference: string) {
  const match = /^specialist:(\d+):(.+)$/.exec(reference);
  return match ? { evaluationId: Number(match[1]), findingReference: match[2] } : null;
}

export async function requireAuditedClaim(db: Awaited<ReturnType<typeof dbOrThrow>>, projectId: number, claimReference: string) {
  const [latestAudit] = await db.select().from(submissionAudits).where(and(eq(submissionAudits.projectId, projectId), eq(submissionAudits.status, "complete"))).orderBy(desc(submissionAudits.createdAt)).limit(1);
  if (latestAudit && auditContainsClaim(latestAudit.report, claimReference)) return;
  const specialist = await db.select().from(specialistEvaluations).where(and(eq(specialistEvaluations.projectId, projectId), eq(specialistEvaluations.status, "complete")));
  const specialistRows = Array.isArray(specialist) ? specialist : [];
  const specialistChallenge = parseSpecialistChallengeReference(claimReference);
  const specialistFindingExists = specialistChallenge
    ? specialistRows.some(evaluation => evaluation.id === specialistChallenge.evaluationId && specialistContainsFinding(evaluation.result, specialistChallenge.findingReference))
    : specialistRows.some(evaluation => specialistContainsFinding(evaluation.result, claimReference));
  if (!specialistFindingExists) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Select a claim from the latest completed Hackathon Agent audit." });
  }
}

export const judgingRouter = router({
  assignJudge: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), judgeId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only an organizer can assign a judge." });
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
    await db.insert(judgeAssignments).values({ hackathonId: project.hackathonId, projectId: project.id, judgeId: input.judgeId }).onDuplicateKeyUpdate({ set: { isRecused: false } });
    return { success: true };
  }),

  assignBalancedJudge: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only an organizer can assign a judge." });
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
    const candidates = await db.select().from(hackathonRegistrations).where(and(eq(hackathonRegistrations.hackathonId, project.hackathonId), eq(hackathonRegistrations.registrationRole, "judge"), eq(hackathonRegistrations.status, "registered")));
    if (!candidates.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Register at least one active judge before using workload-balanced assignment." });
    const assignments = await db.select().from(judgeAssignments).where(eq(judgeAssignments.hackathonId, project.hackathonId));
    const workload = new Map<number, number>();
    for (const candidate of candidates) workload.set(candidate.userId, assignments.filter(assignment => assignment.judgeId === candidate.userId && !assignment.isRecused).length);
    const selected = [...candidates].sort((a, b) => (workload.get(a.userId)! - workload.get(b.userId)!) || (a.userId - b.userId))[0];
    await db.insert(judgeAssignments).values({ hackathonId: project.hackathonId, projectId: project.id, judgeId: selected.userId }).onDuplicateKeyUpdate({ set: { isRecused: false } });
    return { success: true, judgeId: selected.userId, existingActiveAssignments: workload.get(selected.userId) ?? 0 };
  }),

  queueAgentAudit: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only an organizer can queue an AI audit." });
    const { db, project } = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    const [existing] = await db.select().from(submissionAudits).where(and(eq(submissionAudits.projectId, project.id), eq(submissionAudits.status, "queued"))).orderBy(desc(submissionAudits.createdAt)).limit(1);
    if (existing) return { auditId: existing.id, status: "queued" as const, reused: true };
    const created = await db.insert(submissionAudits).values({ projectId: project.id, status: "queued", extractionMethod: project.githubUrl ? "github_api" : "manual", report: {} });
    const auditId = Number(created[0].insertId);
    // Best-effort immediate processing improves local responsiveness; the persisted queued row is the durable source of truth for the scheduled worker.
    void processQueuedAudit(auditId);
    return { auditId, status: "queued" as const, reused: false };
  }),

  agentAudit: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only an organizer can start an AI audit." });
    const { db, project } = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    const [event, connection] = await Promise.all([
      db.select().from(hackathons).where(eq(hackathons.id, project.hackathonId)).limit(1).then(rows => rows[0]),
      db.select().from(repositoryConnections).where(and(eq(repositoryConnections.projectId, project.id), isNull(repositoryConnections.revokedAt))).limit(1).then(rows => rows[0]),
    ]);
    const [opportunity] = event?.opportunityId ? await db.select().from(opportunities).where(eq(opportunities.id, event.opportunityId)).limit(1) : [];
    const connectionMatchesProjectRepository = Boolean(connection && project.githubUrl && connection.githubUrl.replace(/\.git$/, "") === project.githubUrl.replace(/\.git$/, ""));
    const [research] = opportunity
      ? await db.select().from(researchRuns).where(eq(researchRuns.opportunityId, opportunity.id)).orderBy(desc(researchRuns.createdAt)).limit(1)
      : [];
    const processingAudit = await db.insert(submissionAudits).values({ projectId: project.id, status: "processing", extractionMethod: project.githubUrl ? "github_api" : "manual", report: {} });
    const auditId = Number(processingAudit[0].insertId);
    try {
      const audit = await runHackathonAgent({
        title: project.title,
        description: project.description,
        techStack: project.techStack,
        githubUrl: project.githubUrl,
        demoUrl: project.demoUrl,
        videoUrl: project.videoUrl,
        pitchDeckUrl: project.pitchDeckUrl,
        opportunityContext: opportunity ? `${opportunity.problemStatement}\nValue range: ${opportunity.initialValueLow || "Not supplied"}–${opportunity.initialValueHigh || "Not supplied"}\nEvidence gaps: ${JSON.stringify(opportunity.evidenceGaps || [])}` : null,
        researchSummary: research ? `${research.summary || ""}\nLimitations: ${research.limitations || ""}` : null,
        repositoryAccessMode: connectionMatchesProjectRepository ? connection!.accessMode : "public_api",
      });
      await db.update(submissionAudits).set({
        status: "complete",
        extractionMethod: project.githubUrl ? "github_api" : "manual",
        technicalScore: String(audit.technicalScore),
        integrityScore: String(audit.integrityScore),
        originalityScore: String(audit.originalityScore),
        pitchFitScore: String(audit.pitchFitScore),
        finalSuggestedScore: String(audit.finalSuggestedScore),
        report: audit,
        completedAt: new Date(),
      }).where(eq(submissionAudits.id, auditId));
      return { auditId, ...audit };
    } catch (error) {
      await db.update(submissionAudits).set({ status: "failed", report: { error: error instanceof Error ? error.message : "Unknown audit failure" }, completedAt: new Date() }).where(eq(submissionAudits.id, auditId));
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The audit could not be completed. Review the submission evidence and try again." });
    }
  }),

  auditReport: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    if (!access.isAdmin && !access.isAssignedJudge && !access.isTeamMember) throw new TRPCError({ code: "FORBIDDEN", message: "This audit is not available to the current user." });
    const [audit] = await access.db.select().from(submissionAudits).where(eq(submissionAudits.projectId, input.projectId)).orderBy(desc(submissionAudits.createdAt)).limit(1);
    return audit || null;
  }),

  objectionContext: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    if (!access.isAdmin && !access.isTeamMember) throw new TRPCError({ code: "FORBIDDEN", message: "Only a project team member can review challengeable evidence." });
    const [audit] = await access.db.select().from(submissionAudits).where(eq(submissionAudits.projectId, input.projectId)).orderBy(desc(submissionAudits.createdAt)).limit(1);
    const evaluations = audit?.status === "complete"
      ? await access.db.select().from(specialistEvaluations).where(and(eq(specialistEvaluations.auditId, audit.id), eq(specialistEvaluations.status, "complete")))
      : [];
    const submittedChallenges = await access.db.select().from(objections).where(and(eq(objections.projectId, input.projectId), eq(objections.submittedById, ctx.user.id))).orderBy(desc(objections.createdAt));
    const specialistFindings = evaluations.flatMap(evaluation => {
      const result = evaluation.result;
      const findings = result && typeof result === "object" && !Array.isArray(result) && Array.isArray((result as { findings?: unknown }).findings)
        ? (result as { findings: Array<Record<string, unknown>> }).findings
        : [];
      return findings
        .filter(finding => typeof finding.reference === "string" && typeof finding.criterion === "string" && typeof finding.finding === "string")
        .map(finding => ({
          challengeReference: specialistChallengeReference(evaluation.id, String(finding.reference)),
          skill: evaluation.skill,
          reference: String(finding.reference),
          criterion: String(finding.criterion),
          finding: String(finding.finding),
          status: String(finding.status || "unclear"),
        }));
    });
    return {
      audit: audit || null,
      specialistFindings,
      challenges: submittedChallenges.map(challenge => ({
        id: challenge.id,
        claimReference: challenge.claimReference,
        explanation: challenge.explanation,
        status: challenge.status,
        response: challenge.response,
        createdAt: challenge.createdAt,
        resolvedAt: challenge.resolvedAt,
      })),
    };
  }),

  runSpecialistEvaluation: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), skill: z.enum(specialistSkills) })).mutation(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    const [audit] = await access.db.select().from(submissionAudits).where(and(eq(submissionAudits.projectId, input.projectId), eq(submissionAudits.status, "complete"))).orderBy(desc(submissionAudits.createdAt)).limit(1);
    if (!audit) throw new TRPCError({ code: "BAD_REQUEST", message: "Complete the Hackathon Agent evidence audit before running a specialist evaluator." });
    const [event] = await access.db.select().from(hackathons).where(eq(hackathons.id, access.project.hackathonId)).limit(1);
    const [opportunity] = event?.opportunityId ? await access.db.select().from(opportunities).where(eq(opportunities.id, event.opportunityId)).limit(1) : [];
    const [research] = opportunity ? await access.db.select().from(researchRuns).where(eq(researchRuns.opportunityId, opportunity.id)).orderBy(desc(researchRuns.createdAt)).limit(1) : [];
    const documents = await access.db.select().from(projectAssets).where(and(eq(projectAssets.projectId, input.projectId), eq(projectAssets.assetType, "document")));
    const packet = buildSharedEvidencePacket({ project: access.project, auditReport: audit.report, opportunity, researchSummary: research?.summary || null, projectDocuments: documents });
    const [existing] = await access.db.select().from(specialistEvaluations).where(and(eq(specialistEvaluations.auditId, audit.id), eq(specialistEvaluations.skill, input.skill))).limit(1);
    if (shouldReuseSpecialistEvaluation(existing, packet.evidenceHash)) return { evaluation: existing, reused: true };
    const evaluationId = existing?.id ?? Number((await access.db.insert(specialistEvaluations).values({ auditId: audit.id, projectId: access.project.id, skill: input.skill, version: "v1", policyVersion: packet.policyVersion, evidenceHash: packet.evidenceHash, status: "processing" }))[0].insertId);
    if (existing) await access.db.update(specialistEvaluations).set({ status: "processing", evidenceHash: packet.evidenceHash, result: null, completedAt: null }).where(eq(specialistEvaluations.id, existing.id));
    try {
      const result = await runSpecialistEvaluator(input.skill, packet);
      await access.db.update(specialistEvaluations).set({ status: "complete", provisionalScore: result.provisionalScore === null ? null : String(result.provisionalScore), result, completedAt: new Date() }).where(eq(specialistEvaluations.id, evaluationId));
      return { evaluation: { id: evaluationId, skill: input.skill, status: "complete", ...result, evidenceHash: packet.evidenceHash }, reused: false };
    } catch (error) {
      await access.db.update(specialistEvaluations).set({ status: "failed", result: { error: error instanceof Error ? error.message : "Unknown specialist evaluation failure" }, completedAt: new Date() }).where(eq(specialistEvaluations.id, evaluationId));
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The specialist evaluation could not be completed. The human review remains available." });
    }
  }),

  reviewContext: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), auditId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    const [auditRows, criteria, overrides, scorecardRows, specialist, challengeRows, synthesisRows, annotationRows] = await Promise.all([
      access.db.select().from(submissionAudits).where(input.auditId ? and(eq(submissionAudits.projectId, input.projectId), eq(submissionAudits.id, input.auditId)) : eq(submissionAudits.projectId, input.projectId)).orderBy(desc(submissionAudits.createdAt)).limit(1),
      access.db.select().from(rubricCriteria).where(eq(rubricCriteria.hackathonId, access.project.hackathonId)),
      access.db.select().from(aiOverrides).where(eq(aiOverrides.projectId, input.projectId)).orderBy(desc(aiOverrides.createdAt)),
      access.db.select().from(scorecards).where(and(eq(scorecards.projectId, input.projectId), eq(scorecards.judgeId, ctx.user.id))).limit(1),
      access.db.select().from(specialistEvaluations).where(input.auditId ? and(eq(specialistEvaluations.projectId, input.projectId), eq(specialistEvaluations.auditId, input.auditId)) : eq(specialistEvaluations.projectId, input.projectId)).orderBy(desc(specialistEvaluations.createdAt)),
      access.db.select().from(objections).where(eq(objections.projectId, input.projectId)).orderBy(desc(objections.createdAt)),
      access.db.select().from(evaluationSyntheses).where(input.auditId ? and(eq(evaluationSyntheses.projectId, input.projectId), eq(evaluationSyntheses.auditId, input.auditId)) : eq(evaluationSyntheses.projectId, input.projectId)).orderBy(desc(evaluationSyntheses.createdAt)).limit(1),
      access.db.select().from(humanReviewAnnotations).where(eq(humanReviewAnnotations.projectId, input.projectId)).orderBy(desc(humanReviewAnnotations.createdAt)),
    ]);
    const audit = auditRows[0] || null;
    let evidenceFreshness: ReturnType<typeof evidencePacketFreshness> | null = null;
    if (audit?.status === "complete") {
      const [event] = await access.db.select().from(hackathons).where(eq(hackathons.id, access.project.hackathonId)).limit(1);
      const [opportunity] = event?.opportunityId ? await access.db.select().from(opportunities).where(eq(opportunities.id, event.opportunityId)).limit(1) : [];
      const [research] = opportunity ? await access.db.select().from(researchRuns).where(eq(researchRuns.opportunityId, opportunity.id)).orderBy(desc(researchRuns.createdAt)).limit(1) : [];
      const documents = await access.db.select().from(projectAssets).where(and(eq(projectAssets.projectId, input.projectId), eq(projectAssets.assetType, "document")));
      const packet = buildSharedEvidencePacket({ project: access.project, auditReport: audit.report, opportunity, researchSummary: research?.summary || null, projectDocuments: documents });
      evidenceFreshness = evidencePacketFreshness(packet.evidenceHash, specialist, synthesisRows[0] || null);
    }
    return { project: access.project, audit, criteria, overrides, scorecard: scorecardRows[0] || null, specialistEvaluations: specialist, challenges: challengeRows, synthesis: synthesisRows[0] || null, annotations: annotationRows, evidenceFreshness };
  }),

  teamImprovementGuidance: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    if (!access.isTeamMember && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only a participating team member can view this improvement guidance." });
    const [synthesis] = await access.db.select().from(evaluationSyntheses).where(and(eq(evaluationSyntheses.projectId, input.projectId), eq(evaluationSyntheses.status, "complete"))).orderBy(desc(evaluationSyntheses.createdAt)).limit(1);
    const result = synthesis?.result && typeof synthesis.result === "object" && !Array.isArray(synthesis.result) ? synthesis.result as Record<string, unknown> : null;
    return {
      available: Boolean(synthesis && result),
      evidenceHash: synthesis?.evidenceHash || null,
      createdAt: synthesis?.createdAt || null,
      teamActions: Array.isArray(result?.teamActions) ? result.teamActions : [],
      innovationOpportunities: Array.isArray(result?.innovationOpportunities) ? result.innovationOpportunities : [],
      humanQuestions: Array.isArray(result?.humanQuestions) ? result.humanQuestions : [],
      limitations: Array.isArray(result?.limitations) ? result.limitations : [],
    };
  }),

  judgeQueue: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    if (ctx.user.role === "admin") return db.select().from(projects).orderBy(desc(projects.updatedAt));
    const assignments = await db.select().from(judgeAssignments).where(and(eq(judgeAssignments.judgeId, ctx.user.id), eq(judgeAssignments.isRecused, false)));
    if (!assignments.length) return [];
    const output = [];
    for (const assignment of assignments) {
      const [project] = await db.select().from(projects).where(eq(projects.id, assignment.projectId)).limit(1);
      if (project) output.push(project);
    }
    return output;
  }),

  submitScorecard: protectedProcedure.input(z.object({
    projectId: z.number().int().positive(),
    items: z.array(z.object({ criterionId: z.number().int().positive(), score: z.number().min(0).max(10), feedback: z.string().max(3000).optional() })).min(1),
    privateNotes: z.string().max(5000).optional(),
    finalized: z.boolean().default(false),
    needsSecondaryReview: z.boolean().default(false),
  })).mutation(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    const criteria = await access.db.select().from(rubricCriteria).where(eq(rubricCriteria.hackathonId, access.project.hackathonId));
    const allowedCriteria = new Set(criteria.map(item => item.id));
    if (input.items.some(item => !allowedCriteria.has(item.criterionId))) throw new TRPCError({ code: "BAD_REQUEST", message: "One or more rubric criteria do not belong to this hackathon." });
    const [existing] = await access.db.select().from(scorecards).where(and(eq(scorecards.projectId, input.projectId), eq(scorecards.judgeId, ctx.user.id))).limit(1);
    if (existing?.finalized) throw new TRPCError({ code: "FORBIDDEN", message: "A finalized scorecard is immutable. Use a documented organizer review process for any correction." });
    const scorecardId = existing?.id ?? Number((await access.db.insert(scorecards).values({ projectId: input.projectId, judgeId: ctx.user.id, privateNotes: input.privateNotes, finalized: input.finalized, needsSecondaryReview: input.needsSecondaryReview }))[0].insertId);
    if (existing) await access.db.update(scorecards).set({ privateNotes: input.privateNotes, finalized: input.finalized, needsSecondaryReview: input.needsSecondaryReview }).where(eq(scorecards.id, scorecardId));
    for (const item of input.items) {
      await access.db.insert(scoreItems).values({ scorecardId, criterionId: item.criterionId, score: String(item.score), feedback: item.feedback }).onDuplicateKeyUpdate({ set: { score: String(item.score), feedback: item.feedback } });
    }
    return { scorecardId };
  }),

  runEvaluationSynthesis: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), auditId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    const [audit] = await access.db.select().from(submissionAudits).where(input.auditId ? and(eq(submissionAudits.projectId, input.projectId), eq(submissionAudits.status, "complete"), eq(submissionAudits.id, input.auditId)) : and(eq(submissionAudits.projectId, input.projectId), eq(submissionAudits.status, "complete"))).orderBy(desc(submissionAudits.createdAt)).limit(1);
    if (!audit) throw new TRPCError({ code: "BAD_REQUEST", message: "Complete the evidence audit before producing a preliminary cross-skill recommendation." });
    const evaluations = await access.db.select().from(specialistEvaluations).where(and(eq(specialistEvaluations.projectId, input.projectId), eq(specialistEvaluations.auditId, audit.id), eq(specialistEvaluations.status, "complete")));
    const completedResults = evaluations.flatMap(evaluation => evaluation.result && typeof evaluation.result === "object" && !Array.isArray(evaluation.result) ? [{ skill: evaluation.skill, result: evaluation.result as any }] : []);
    if (!completedResults.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Run at least one cited specialist evaluation before requesting a cross-skill synthesis." });
    const [event] = await access.db.select().from(hackathons).where(eq(hackathons.id, access.project.hackathonId)).limit(1);
    const [opportunity] = event?.opportunityId ? await access.db.select().from(opportunities).where(eq(opportunities.id, event.opportunityId)).limit(1) : [];
    const [research] = opportunity ? await access.db.select().from(researchRuns).where(eq(researchRuns.opportunityId, opportunity.id)).orderBy(desc(researchRuns.createdAt)).limit(1) : [];
    const documents = await access.db.select().from(projectAssets).where(and(eq(projectAssets.projectId, input.projectId), eq(projectAssets.assetType, "document")));
    const packet = buildSharedEvidencePacket({ project: access.project, auditReport: audit.report, opportunity, researchSummary: research?.summary || null, projectDocuments: documents });
    const created = await access.db.insert(evaluationSyntheses).values({ projectId: input.projectId, auditId: audit.id, initiatedById: ctx.user.id, model: "claude-sonnet-4-6", policyVersion: "evidence-synthesis-v1", evidenceHash: packet.evidenceHash, status: "processing" });
    const synthesisId = Number(created[0].insertId);
    try {
      const output = await runEvaluationSynthesis(packet, completedResults);
      await access.db.update(evaluationSyntheses).set({ status: "complete", model: output.model, result: output.result, completedAt: new Date() }).where(eq(evaluationSyntheses.id, synthesisId));
      return { id: synthesisId, status: "complete", model: output.model, result: output.result, evidenceHash: packet.evidenceHash };
    } catch (error) {
      await access.db.update(evaluationSyntheses).set({ status: "failed", result: { error: error instanceof Error ? error.message : "Unknown synthesis failure" }, completedAt: new Date() }).where(eq(evaluationSyntheses.id, synthesisId));
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The preliminary AI recommendation could not be created. Human review remains available." });
    }
  }),

  addHumanAnnotation: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), targetType: z.enum(["synthesis", "finding", "claim", "market_research"]), targetReference: z.string().min(1).max(300), annotationType: z.enum(["note", "voice_transcript", "evidence_correction", "independent_determination"]), body: z.string().min(3).max(6000), audioStorageKey: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    const inserted = await access.db.insert(humanReviewAnnotations).values({ projectId: input.projectId, judgeId: ctx.user.id, targetType: input.targetType, targetReference: input.targetReference, annotationType: input.annotationType, body: input.body, audioStorageKey: input.audioStorageKey });
    return { id: Number(inserted[0].insertId), success: true };
  }),

  overrideAgent: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), claimReference: z.string().min(1).max(255), action: z.enum(["dismiss", "confirm", "escalate"]), reason: z.string().min(10).max(5000) })).mutation(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    await requireAuditedClaim(access.db, input.projectId, input.claimReference);
    await access.db.insert(aiOverrides).values({ projectId: input.projectId, judgeId: ctx.user.id, claimReference: input.claimReference, action: input.action, reason: input.reason });
    return { success: true };
  }),

  recuse: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    await db.update(judgeAssignments).set({ isRecused: true }).where(and(eq(judgeAssignments.projectId, input.projectId), eq(judgeAssignments.judgeId, ctx.user.id)));
    return { success: true };
  }),

  submitObjection: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), claimReference: z.string().min(1).max(255), explanation: z.string().min(20).max(6000) })).mutation(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    if (!access.isTeamMember) throw new TRPCError({ code: "FORBIDDEN", message: "Only a project team member can submit an audit objection." });
    await requireAuditedClaim(access.db, input.projectId, input.claimReference);
    await access.db.insert(objections).values({ projectId: input.projectId, submittedById: ctx.user.id, claimReference: input.claimReference, explanation: input.explanation });
    return { success: true };
  }),

  respondToObjection: protectedProcedure.input(z.object({
    objectionId: z.number().int().positive(),
    status: z.enum(["under_review", "resolved", "declined"]),
    response: z.string().min(10).max(6000),
  })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [objection] = await db.select().from(objections).where(eq(objections.id, input.objectionId)).limit(1);
    if (!objection) throw new TRPCError({ code: "NOT_FOUND", message: "Participant challenge not found." });
    const access = await projectAccess(objection.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    const resolvedAt = input.status === "resolved" || input.status === "declined" ? new Date() : null;
    await db.update(objections).set({ status: input.status, response: input.response, reviewedById: ctx.user.id, resolvedAt }).where(eq(objections.id, objection.id));
    return { success: true, objectionId: objection.id, status: input.status, resolvedAt };
  }),
});
