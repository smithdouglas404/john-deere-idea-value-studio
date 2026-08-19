import { eq } from "drizzle-orm";
import { opportunities, users } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { appRouter } from "../server/routers.ts";

const opportunityId = Number(process.argv[2] || 60001);
const db = await getDb();
if (!db) throw new Error("Database unavailable");
const [[opportunity], [user]] = await Promise.all([
  db.select().from(opportunities).where(eq(opportunities.id, opportunityId)).limit(1),
  db.select().from(users).where(eq(users.id, 1)).limit(1),
]);
if (!opportunity || !user) throw new Error("Opportunity or authorized workspace user not found");

const caller = appRouter.createCaller({ user, req: { headers: {}, protocol: "https" }, res: {} });
const result = await caller.opportunities.research({ opportunityId, consent: true });
console.log(JSON.stringify(result, null, 2));
