import { eq } from "drizzle-orm";
import { hackathons } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";

const db = await getDb();
if (!db) throw new Error("Database unavailable");
const rows = await db.select({ id: hackathons.id, title: hackathons.title, auditScheduleCronTaskUid: hackathons.auditScheduleCronTaskUid }).from(hackathons).where(eq(hackathons.id, 1));
console.log(JSON.stringify(rows, null, 2));
