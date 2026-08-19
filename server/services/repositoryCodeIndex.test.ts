import { describe, expect, it } from "vitest";
import { cosineSimilarity, deterministicEmbedding, fingerprintEvidenceQuery } from "./repositoryCodeIndex";

describe("repository code index vectors", () => {
  it("creates a normalized, deterministic 1536-dimension vector", () => {
    const first = deterministicEmbedding("File: src/app.ts\nDiff: add secure evidence audit route");
    const second = deterministicEmbedding("File: src/app.ts\nDiff: add secure evidence audit route");
    expect(first).toHaveLength(1536);
    expect(first).toEqual(second);
    expect(cosineSimilarity(first, second)).toBeCloseTo(1, 8);
  });

  it("records a privacy-preserving stable fingerprint for equivalent semantic retrieval audits", () => {
    expect(fingerprintEvidenceQuery("  Evidence Route  ")).toBe(fingerprintEvidenceQuery("evidence route"));
    expect(fingerprintEvidenceQuery("evidence route")).toHaveLength(64);
  });
});
