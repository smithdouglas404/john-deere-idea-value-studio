import { eq } from "drizzle-orm";
import { opportunityAssets } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { storageGetSignedUrl } from "../server/storage.ts";
import { normalizeAudioMimeType, transcribeAudio } from "../server/_core/voiceTranscription.ts";

const assetId = Number(process.argv[2] || 2);
const db = await getDb();
if (!db) throw new Error("Database unavailable");
const [asset] = await db.select().from(opportunityAssets).where(eq(opportunityAssets.id, assetId)).limit(1);
if (!asset || asset.assetType !== "voice") throw new Error(`Voice asset ${assetId} not found`);

const result = await transcribeAudio({
  audioUrl: await storageGetSignedUrl(asset.storageKey),
  language: "en",
  prompt: "Transcribe an opportunity explanation for an innovation portfolio.",
});
if ("error" in result) throw new Error(`${result.code}: ${result.error}${result.details ? ` — ${result.details}` : ""}`);

await db.update(opportunityAssets).set({
  mimeType: normalizeAudioMimeType(asset.mimeType),
  transcript: result.text,
  extraction: { language: result.language, duration: result.duration, segments: result.segments },
}).where(eq(opportunityAssets.id, asset.id));

console.log(JSON.stringify({ assetId: asset.id, mimeType: normalizeAudioMimeType(asset.mimeType), language: result.language, duration: result.duration, transcriptLength: result.text.length }, null, 2));
