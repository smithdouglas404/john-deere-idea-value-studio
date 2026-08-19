import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { appRouter } from "../routers";

vi.mock("../db", () => ({ getDb: vi.fn() }));
const mockedGetDb = vi.mocked(getDb);

const investmentCase = { id: 77, campaignId: 1, status: "approved_for_proof", title: "Incubated case", investmentThesis: "A sufficiently detailed investment thesis for scheduled proof.", createdAt: new Date(), updatedAt: new Date() };
const event = { id: 12, title: "Shared proof event", status: "registration", createdAt: new Date(), updatedAt: new Date() };
const latestHoldReview = { id: 9, investmentCaseId: 77, managerId: 1, decision: "hold", rationale: "The manager changed the earlier advance decision to hold pending more evidence.", updatedAt: new Date() };

function adminContext(): TrpcContext {
  return { user: { id: 1, openId: "admin", name: "Admin", email: "admin@example.com", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {}, protocol: "https" } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function dbFor(rows: unknown[][]) {
  let index = 0;
  return {
    select: () => ({ from: () => ({ where: () => {
      const result = rows[index++] || [];
      return { limit: async () => result, orderBy: () => ({ limit: async () => result }) };
    } }) }),
  };
}

describe("studio manager review scheduling gate", () => {
  it("rejects a proof contract when the latest manager review changed an earlier advance to hold", async () => {
    mockedGetDb.mockResolvedValue(dbFor([[investmentCase], [latestHoldReview]]) as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.studio.createProofContract({ investmentCaseId: 77, proofEventId: 12, candidateTitle: "Incubated case", proofQuestion: "Can the case produce a traceable proof against the original business objective?", requiredArtifacts: [{ key: "brd", label: "Business requirements", required: true, purpose: "Define the inherited business objective and acceptance conditions." }], rubric: [{ key: "fit", label: "Business-case fit", weight: 100, description: "Assess the proof against the inherited business case." }] })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("rejects direct candidate scheduling when the latest manager review is hold", async () => {
    mockedGetDb.mockResolvedValue(dbFor([[investmentCase], [event], [latestHoldReview]]) as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.studio.createProofCandidate({ investmentCaseId: 77, proofEventId: 12, title: "Incubated case", proofQuestion: "Can the case produce a traceable proof against the original business objective?", requiredArtifacts: [{ key: "brd", label: "Business requirements", required: true, purpose: "Define the inherited business objective and acceptance conditions." }], rubric: [{ key: "fit", label: "Business-case fit", weight: 100, description: "Assess the proof against the inherited business case." }] })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it.each(["return_for_enrichment", "decline"] as const)("rejects both scheduling procedures when the latest manager review is %s", async decision => {
    const latestReview = { ...latestHoldReview, decision };
    mockedGetDb.mockResolvedValue(dbFor([[investmentCase], [latestReview]]) as Awaited<ReturnType<typeof getDb>>);
    const contractCaller = appRouter.createCaller(adminContext());
    await expect(contractCaller.studio.createProofContract({ investmentCaseId: 77, proofEventId: 12, candidateTitle: "Incubated case", proofQuestion: "Can the case produce a traceable proof against the original business objective?", requiredArtifacts: [{ key: "brd", label: "Business requirements", required: true, purpose: "Define the inherited business objective and acceptance conditions." }], rubric: [{ key: "fit", label: "Business-case fit", weight: 100, description: "Assess the proof against the inherited business case." }] })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    mockedGetDb.mockResolvedValue(dbFor([[investmentCase], [event], [latestReview]]) as Awaited<ReturnType<typeof getDb>>);
    const candidateCaller = appRouter.createCaller(adminContext());
    await expect(candidateCaller.studio.createProofCandidate({ investmentCaseId: 77, proofEventId: 12, title: "Incubated case", proofQuestion: "Can the case produce a traceable proof against the original business objective?", requiredArtifacts: [{ key: "brd", label: "Business requirements", required: true, purpose: "Define the inherited business objective and acceptance conditions." }], rubric: [{ key: "fit", label: "Business-case fit", weight: 100, description: "Assess the proof against the inherited business case." }] })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
