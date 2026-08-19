import { and, desc, eq } from "drizzle-orm";
import {
  hackathons,
  opportunities,
  projects,
  researchRuns,
  specialistEvaluations,
  submissionAudits,
} from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import {
  buildSharedEvidencePacket,
  runSpecialistEvaluator,
  specialistSkills,
} from "../server/services/specialistEvaluators.ts";

const projectId = Number(process.argv[2] || 1);
const db = await getDb();
if (!db) throw new Error("Database unavailable");

const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
if (!project) throw new Error(`Project ${projectId} not found`);
const [audit] = await db
  .select()
  .from(submissionAudits)
  .where(and(eq(submissionAudits.projectId, projectId), eq(submissionAudits.status, "complete")))
  .orderBy(desc(submissionAudits.createdAt))
  .limit(1);
if (!audit || !audit.report || typeof audit.report !== "object" || Array.isArray(audit.report)) {
  throw new Error("A completed structured Hackathon Agent audit is required");
}

const [event] = await db.select().from(hackathons).where(eq(hackathons.id, project.hackathonId)).limit(1);
const [opportunity] = event?.opportunityId
  ? await db.select().from(opportunities).where(eq(opportunities.id, event.opportunityId)).limit(1)
  : [];
const [research] = opportunity
  ? await db.select().from(researchRuns).where(eq(researchRuns.opportunityId, opportunity.id)).orderBy(desc(researchRuns.createdAt)).limit(1)
  : [];

const packet = buildSharedEvidencePacket({
  project,
  auditReport: audit.report,
  opportunity,
  researchSummary: research?.summary || null,
});

const outcomes = [];
for (const skill of specialistSkills) {
  const [existing] = await db
    .select()
    .from(specialistEvaluations)
    .where(and(eq(specialistEvaluations.auditId, audit.id), eq(specialistEvaluations.skill, skill)))
    .limit(1);

  const evaluationId = existing?.id ?? Number((await db.insert(specialistEvaluations).values({
    auditId: audit.id,
    projectId,
    skill,
    version: "v1",
    policyVersion: packet.policyVersion,
    evidenceHash: packet.evidenceHash,
    status: "processing",
  }))[0].insertId);
  await db.update(specialistEvaluations).set({
    status: "processing",
    evidenceHash: packet.evidenceHash,
    result: null,
    completedAt: null,
  }).where(eq(specialistEvaluations.id, evaluationId));

  try {
    const result = await runSpecialistEvaluator(skill, packet);
    await db.update(specialistEvaluations).set({
      status: "complete",
      provisionalScore: String(result.provisionalScore),
      result,
      completedAt: new Date(),
    }).where(eq(specialistEvaluations.id, evaluationId));
    outcomes.push({ skill, status: "complete", findings: result.findings.length, citedFindings: result.findings.filter(finding => finding.citations.length > 0).length, provisionalScore: result.provisionalScore });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown specialist evaluation failure";
    await db.update(specialistEvaluations).set({ status: "failed", result: { error: message }, completedAt: new Date() }).where(eq(specialistEvaluations.id, evaluationId));
    outcomes.push({ skill, status: "failed", error: message });
  }
}

console.log(JSON.stringify({ projectId, auditId: audit.id, evidenceHash: packet.evidenceHash, outcomes }, null, 2));
