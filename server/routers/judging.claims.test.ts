import { describe, expect, it } from "vitest";
import { auditContainsClaim, parseSpecialistChallengeReference, requireAuditedClaim, specialistChallengeReference } from "./judging";

describe("audited claim references", () => {
  const report = { claims: [{ claimReference: "CLAIM-01", claim: "A bounded repository evidence path exists." }] };

  it("accepts an override reference that belongs to the persisted audit report", () => {
    expect(auditContainsClaim(report, "CLAIM-01")).toBe(true);
  });

  it("rejects a free-text or absent audit reference", () => {
    expect(auditContainsClaim(report, "integrity finding 02")).toBe(false);
    expect(auditContainsClaim({}, "CLAIM-01")).toBe(false);
  });

  it("allows the persisted claim used by override or objection procedures", async () => {
    const db = { select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [{ report }] }) }) }) }) } as any;
    await expect(requireAuditedClaim(db, 42, "CLAIM-01")).resolves.toBeUndefined();
  });

  it("rejects an override or objection reference absent from the latest audit", async () => {
    const db = { select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [{ report }] }) }) }) }) } as any;
    await expect(requireAuditedClaim(db, 42, "unverified-free-text")).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts a participant challenge only when it maps to a persisted specialist finding", async () => {
    const reference = specialistChallengeReference(77, "FILE: README.md");
    expect(parseSpecialistChallengeReference(reference)).toEqual({ evaluationId: 77, findingReference: "FILE: README.md" });
    let call = 0;
    const db = {
      select: () => ({ from: () => ({ where: () => {
        call += 1;
        const rows = call === 1
          ? [{ report }]
          : [{ id: 77, result: { findings: [{ reference: "FILE: README.md" }] } }];
        const query = Promise.resolve(rows);
        return Object.assign(query, { orderBy: () => ({ limit: async () => rows }) });
      } }) }),
    } as any;
    await expect(requireAuditedClaim(db, 42, reference)).resolves.toBeUndefined();
    await expect(requireAuditedClaim(db, 42, specialistChallengeReference(99, "FILE: README.md"))).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
