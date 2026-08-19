import { describe, expect, it } from "vitest";
import { getFileExtension, isSupportedAudioMimeType, normalizeAudioMimeType } from "./voiceTranscription";

describe("voice transcription MIME handling", () => {
  it("normalizes the MediaRecorder WebM codec parameter before creating the Whisper upload filename", () => {
    expect(normalizeAudioMimeType("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(isSupportedAudioMimeType("audio/webm;codecs=opus")).toBe(true);
    expect(getFileExtension("audio/webm;codecs=opus")).toBe("webm");
  });

  it("rejects unsupported audio media types before they reach the transcription service", () => {
    expect(isSupportedAudioMimeType("audio/aac")).toBe(false);
    expect(isSupportedAudioMimeType("video/webm")).toBe(false);
  });
});
