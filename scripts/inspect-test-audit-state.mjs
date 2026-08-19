import { eq } from "drizzle-orm";
import { submissionAudits } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";

const db = await getDb();
if (!db) throw new Error("Database unavailable");
const rows = await db.select({ id: submissionAudits.id, projectId: submissionAudits.projectId, status: submissionAudits.status, processingStartedAt: submissionAudits.processingStartedAt, completedAt: submissionAudits.completedAt }).from(submissionAudits).where(eq(submissionAudits.projectId, 30001));
console.log(JSON.stringify(rows, null, 2));
