import { desc, eq } from "drizzle-orm";
import { specialistEvaluations } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";

const db = await getDb();
if (!db) throw new Error("Database unavailable");
const rows = await db
  .select({ id: specialistEvaluations.id, skill: specialistEvaluations.skill, status: specialistEvaluations.status, result: specialistEvaluations.result, createdAt: specialistEvaluations.createdAt, completedAt: specialistEvaluations.completedAt })
  .from(specialistEvaluations)
  .where(eq(specialistEvaluations.projectId, 1))
  .orderBy(desc(specialistEvaluations.createdAt));
console.log(JSON.stringify(rows, null, 2));
