import { getDb } from "../server/db.ts";
import { opportunities } from "../drizzle/schema.ts";

const db = await getDb();
if (!db) throw new Error("Database unavailable");
const rows = await db.select({
  id: opportunities.id,
  title: opportunities.title,
  initialValueLow: opportunities.initialValueLow,
  initialValueHigh: opportunities.initialValueHigh,
  costToProve: opportunities.costToProve,
  timeToValueMonths: opportunities.timeToValueMonths,
}).from(opportunities);
console.log(JSON.stringify(rows, null, 2));
