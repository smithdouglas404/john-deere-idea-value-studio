import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { appRouter } from "../routers";

vi.mock("../db", () => ({ getDb: vi.fn() }));
vi.mock("../storage", () => ({
  storagePut: vi.fn(),
  storageGetSignedUrl: vi.fn(),
}));
vi.mock("../_core/voiceTranscription", () => ({
  normalizeAudioMimeType: (mimeType: string) => mimeType.split(";", 1)[0].trim().toLowerCase(),
  isSupportedAudioMimeType: (mimeType: string) => mimeType.split(";", 1)[0].trim().toLowerCase() === "audio/webm",
  transcribeAudio: vi.fn(),
}));

const mockedGetDb = vi.mocked(getDb);

function context(): TrpcContext {
  return {
    user: { id: 9, openId: "voice-user", name: "Voice user", email: null, loginMethod: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("opportunities.uploadAsset voice intake", () => {
  beforeEach(async () => {
    mockedGetDb.mockReset();
    const storage = await import("../storage");
    const voice = await import("../_core/voiceTranscription");
    vi.mocked(storage.storagePut).mockReset();
    vi.mocked(storage.storageGetSignedUrl).mockReset();
    vi.mocked(voice.transcribeAudio).mockReset();
  });

  it("normalizes MediaRecorder WebM codecs before storage and persists the returned transcript", async () => {
    const storage = await import("../storage");
    const voice = await import("../_core/voiceTranscription");
    let insertId = 0;
    const updates: Record<string, unknown>[] = [];
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 42, ownerId: 9 }] }) }) }),
      insert: () => ({ values: async () => [{ insertId: ++insertId }] }),
      update: () => ({ set: (values: Record<string, unknown>) => { updates.push(values); return { where: async () => undefined }; } }),
    };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    vi.mocked(storage.storagePut).mockResolvedValue({ key: "voice/validated.webm", url: "https://storage.example/validated.webm" });
    vi.mocked(storage.storageGetSignedUrl).mockResolvedValue("https://signed.example/validated.webm");
    vi.mocked(voice.transcribeAudio).mockResolvedValue({ task: "transcribe", language: "en", duration: 4.2, text: "A bounded tractor telemetry opportunity.", segments: [] });

    const caller = appRouter.createCaller(context());
    await expect(caller.opportunities.uploadAsset({
      opportunityId: 42,
      assetType: "voice",
      fileName: "opportunity-note.webm",
      mimeType: "audio/webm;codecs=opus",
      base64: Buffer.from("webm payload").toString("base64"),
      consent: true,
    })).resolves.toMatchObject({ assetId: 2, transcript: "A bounded tractor telemetry opportunity." });

    expect(storage.storagePut).toHaveBeenCalledWith(expect.any(String), expect.any(Buffer), "audio/webm");
    expect(updates[0]).toMatchObject({ transcript: "A bounded tractor telemetry opportunity." });
  });
});
