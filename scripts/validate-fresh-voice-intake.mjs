import { eq } from "drizzle-orm";
import { opportunityAssets, users } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { appRouter } from "../server/routers.ts";
import { storageGetSignedUrl } from "../server/storage.ts";

const sourceAssetId = Number(process.argv[2] || 2);
const opportunityId = Number(process.argv[3] || 60001);
const db = await getDb();
if (!db) throw new Error("Database unavailable");
const [[sourceAsset], [user]] = await Promise.all([
  db.select().from(opportunityAssets).where(eq(opportunityAssets.id, sourceAssetId)).limit(1),
  db.select().from(users).where(eq(users.id, 1)).limit(1),
]);
if (!sourceAsset || sourceAsset.assetType !== "voice") throw new Error(`Voice source asset ${sourceAssetId} not found`);
if (!user) throw new Error("Validation user not found");

const response = await fetch(await storageGetSignedUrl(sourceAsset.storageKey));
if (!response.ok) throw new Error(`Could not read source audio: ${response.status}`);
const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
const caller = appRouter.createCaller({
  user,
  req: { headers: {}, protocol: "https" },
  res: {},
});
const result = await caller.opportunities.uploadAsset({
  opportunityId,
  assetType: "voice",
  fileName: `fresh-webm-validation-${Date.now()}.webm`,
  mimeType: "audio/webm;codecs=opus",
  base64,
  consent: true,
});
const [stored] = await db.select().from(opportunityAssets).where(eq(opportunityAssets.id, result.assetId)).limit(1);
console.log(JSON.stringify({
  assetId: result.assetId,
  storedMimeType: stored?.mimeType,
  transcriptLength: stored?.transcript?.length || 0,
  hasExtraction: Boolean(stored?.extraction),
}, null, 2));
