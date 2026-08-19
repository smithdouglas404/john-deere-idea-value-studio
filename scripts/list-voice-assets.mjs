import { desc, eq } from "drizzle-orm";
import { opportunityAssets } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";

const db = await getDb();
if (!db) throw new Error("Database unavailable");
const rows = await db.select({
  id: opportunityAssets.id,
  opportunityId: opportunityAssets.opportunityId,
  originalName: opportunityAssets.originalName,
  mimeType: opportunityAssets.mimeType,
  byteSize: opportunityAssets.byteSize,
  storageKey: opportunityAssets.storageKey,
  transcript: opportunityAssets.transcript,
  createdAt: opportunityAssets.createdAt,
}).from(opportunityAssets).where(eq(opportunityAssets.assetType, "voice")).orderBy(desc(opportunityAssets.createdAt));
console.log(JSON.stringify(rows, null, 2));
