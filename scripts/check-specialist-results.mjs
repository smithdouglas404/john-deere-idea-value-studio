import { eq } from "drizzle-orm";
import { specialistEvaluations } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { specialistSkills } from "../server/services/specialistEvaluators.ts";

const db = await getDb();
if (!db) throw new Error("Database unavailable");
const rows = await db.select().from(specialistEvaluations).where(eq(specialistEvaluations.projectId, 1));
const verification = specialistSkills.map(skill => {
  const row = rows.find(item => item.skill === skill);
  const result = row?.result;
  const findings = result && typeof result === "object" && !Array.isArray(result) && Array.isArray(result.findings) ? result.findings : [];
  const hasCitedConfidenceFindings = findings.length > 0 && findings.every(finding => finding && typeof finding === "object" && typeof finding.confidence === "string" && Array.isArray(finding.citations) && finding.citations.length > 0);
  const hasLimitations = Boolean(result && typeof result === "object" && !Array.isArray(result) && Array.isArray(result.limitations));
  const hasHumanQuestions = Boolean(result && typeof result === "object" && !Array.isArray(result) && Array.isArray(result.questionsForHumanJudge));
  return { skill, status: row?.status || "missing", hasCitedConfidenceFindings, hasLimitations, hasHumanQuestions };
});
if (verification.some(item => item.status !== "complete" || !item.hasCitedConfidenceFindings || !item.hasLimitations || !item.hasHumanQuestions)) {
  throw new Error(`Specialist validation failed: ${JSON.stringify(verification)}`);
}
console.log(JSON.stringify({ projectId: 1, verified: verification }, null, 2));
