import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { hackathons, opportunities, projects, repositoryConnections, researchRuns, submissionAudits } from "../../drizzle/schema";
import { getDb } from "../db";
import { runHackathonAgent } from "./hackathonAgent";

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new Error("The data service is not available.");
  return db;
}

export const AUDIT_STALE_AFTER_MS = 10 * 60 * 1000;

export function isAuditProcessingStale(processingStartedAt: Date | null, now = new Date()) {
  return Boolean(processingStartedAt && now.getTime() - processingStartedAt.getTime() >= AUDIT_STALE_AFTER_MS);
}

export async function recoverStaleProcessingAudits(now = new Date()) {
  const db = await dbOrThrow();
  const cutoff = new Date(now.getTime() - AUDIT_STALE_AFTER_MS);
  await db.update(submissionAudits).set({ status: "queued", processingStartedAt: null }).where(and(eq(submissionAudits.status, "processing"), lt(submissionAudits.processingStartedAt, cutoff)));
}

export async function processQueuedAudit(auditId: number) {
  const db = await dbOrThrow();
  const [audit] = await db.select().from(submissionAudits).where(eq(submissionAudits.id, auditId)).limit(1);
  if (!audit) return { auditId, status: "skipped" as const, reason: "not_found" };
  if (audit.status === "complete" || audit.status === "needs_review") return { auditId, status: "skipped" as const, reason: "already_final" };
  if (audit.status === "processing") return { auditId, status: "skipped" as const, reason: "already_processing" };

  await db.update(submissionAudits).set({ status: "processing", processingStartedAt: new Date() }).where(eq(submissionAudits.id, audit.id));
  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, audit.projectId)).limit(1);
    if (!project) throw new Error("The submitted project no longer exists.");
    const [event, connection] = await Promise.all([
      db.select().from(hackathons).where(eq(hackathons.id, project.hackathonId)).limit(1).then(rows => rows[0]),
      db.select().from(repositoryConnections).where(and(eq(repositoryConnections.projectId, project.id), isNull(repositoryConnections.revokedAt))).limit(1).then(rows => rows[0]),
    ]);
    const [opportunity] = event?.opportunityId ? await db.select().from(opportunities).where(eq(opportunities.id, event.opportunityId)).limit(1) : [];
    const [research] = opportunity ? await db.select().from(researchRuns).where(eq(researchRuns.opportunityId, opportunity.id)).orderBy(desc(researchRuns.createdAt)).limit(1) : [];
    const connectionMatchesProjectRepository = Boolean(connection && project.githubUrl && connection.githubUrl.replace(/\.git$/, "") === project.githubUrl.replace(/\.git$/, ""));
    const agentAudit = await runHackathonAgent({
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
      extractionMethod: agentAudit.findings.some(finding => finding.finding.includes("LOCAL_SHALLOW_CLONE")) ? "shallow_clone" : project.githubUrl ? "github_api" : "manual",
      technicalScore: String(agentAudit.technicalScore),
      integrityScore: String(agentAudit.integrityScore),
      originalityScore: String(agentAudit.originalityScore),
      pitchFitScore: String(agentAudit.pitchFitScore),
      finalSuggestedScore: String(agentAudit.finalSuggestedScore),
      report: agentAudit,
      completedAt: new Date(),
    }).where(eq(submissionAudits.id, audit.id));
    return { auditId, status: "complete" as const };
  } catch (error) {
    await db.update(submissionAudits).set({ status: "failed", report: { error: error instanceof Error ? error.message : "Unknown audit failure" }, completedAt: new Date() }).where(eq(submissionAudits.id, audit.id));
    return { auditId, status: "failed" as const };
  }
}

export async function processQueuedAuditBatch(limit = 3, hackathonId?: number) {
  const db = await dbOrThrow();
  await recoverStaleProcessingAudits();
  const queued = await db.select().from(submissionAudits).where(eq(submissionAudits.status, "queued")).orderBy(submissionAudits.createdAt).limit(Math.min(Math.max(limit, 1), 5));
  const results = [];
  for (const audit of queued) {
    if (hackathonId) {
      const [project] = await db.select().from(projects).where(eq(projects.id, audit.projectId)).limit(1);
      if (!project || project.hackathonId !== hackathonId) continue;
    }
    results.push(await processQueuedAudit(audit.id));
  }
  return results;
}
