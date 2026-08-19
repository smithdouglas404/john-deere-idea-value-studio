import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { appRouter } from "../routers";
import { getDb } from "../db";

vi.mock("../db", () => ({ getDb: vi.fn() }));

const mockedGetDb = vi.mocked(getDb);
const project = { id: 42, teamId: 84, hackathonId: 9, title: "Proof", description: "Evidence", createdAt: new Date(), updatedAt: new Date() };
const assignment = { id: 1, projectId: 42, judgeId: 7, hackathonId: 9, isRecused: false, assignedAt: new Date() };
const membership = { id: 1, teamId: 84, userId: 7, role: "member", joinedAt: new Date() };
const auditedReport = { claims: [{ claimReference: "CLAIM-01", claim: "The repository contains the declared evidence path." }] };

function createDb() {
  const inserts: unknown[] = [];
  let selectCall = 0;
  const rowsForNextSelect = () => {
    selectCall += 1;
    if (selectCall === 1) return [project];
    if (selectCall === 2) return [membership];
    if (selectCall === 3) return [assignment];
    if (selectCall === 4) return [{ id: 5, status: "complete", report: auditedReport, createdAt: new Date() }];
    return [];
  };
  const db = {
    select: () => ({
      from: () => {
        const rows = rowsForNextSelect();
        return {
        where: () => ({
          limit: async () => rows,
          orderBy: () => ({ limit: async () => rows }),
        }),
      };
      },
    }),
    insert: () => ({ values: async (value: unknown) => { inserts.push(value); return [{ insertId: 1 }]; } }),
  };
  return { db, inserts };
}

function judgeContext(): TrpcContext {
  return {
    user: { id: 7, openId: "judge-7", name: "Judge", email: null, loginMethod: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("judging claim-reference procedures", () => {
  beforeEach(() => mockedGetDb.mockResolvedValue(createDb().db as Awaited<ReturnType<typeof getDb>>));

  it("accepts an override whose reference is present in the latest audit", async () => {
    const caller = appRouter.createCaller(judgeContext());
    await expect(caller.judging.overrideAgent({ projectId: 42, claimReference: "CLAIM-01", action: "confirm", reason: "The cited code and demo evidence support this claim." })).resolves.toEqual({ success: true });
  });

  it("rejects an override with a free-text reference that is absent from the audit", async () => {
    const caller = appRouter.createCaller(judgeContext());
    await expect(caller.judging.overrideAgent({ projectId: 42, claimReference: "integrity finding 02", action: "dismiss", reason: "This must not be accepted without an audited claim." })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a participant objection with an unknown claim reference", async () => {
    const caller = appRouter.createCaller(judgeContext());
    await expect(caller.judging.submitObjection({ projectId: 42, claimReference: "unverified-free-text", explanation: "This objection must be tied to a claim emitted by the evidence-first audit." })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a change to a finalized judge scorecard", async () => {
    let selectCall = 0;
    const rows = [[project], [membership], [assignment], [{ id: 3, hackathonId: 9, title: "Technical execution" }], [{ id: 19, projectId: 42, judgeId: 7, finalized: true }]];
    const db = {
      select: () => ({ from: () => ({ where: () => {
        const selected = rows[selectCall++] || [];
        return Object.assign(Promise.resolve(selected), { limit: async () => selected });
      } }) }),
      insert: () => ({ values: async () => [{ insertId: 1 }] }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
    };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(judgeContext());
    await expect(caller.judging.submitScorecard({ projectId: 42, items: [{ criterionId: 3, score: 9 }], finalized: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("persists a secondary-review request with a final scorecard", async () => {
    let selectCall = 0;
    const rows = [[project], [membership], [assignment], [{ id: 3, hackathonId: 9, title: "Technical execution" }], []];
    const inserted: unknown[] = [];
    const db = {
      select: () => ({ from: () => ({ where: () => {
        const selected = rows[selectCall++] || [];
        return Object.assign(Promise.resolve(selected), { limit: async () => selected });
      } }) }),
      insert: () => ({ values: (value: unknown) => {
        inserted.push(value);
        const result = [{ insertId: inserted.length }];
        return Object.assign(Promise.resolve(result), { onDuplicateKeyUpdate: async () => result });
      } }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
    };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(judgeContext());
    await expect(caller.judging.submitScorecard({ projectId: 42, items: [{ criterionId: 3, score: 9 }], finalized: true, needsSecondaryReview: true })).resolves.toEqual({ scorecardId: 1 });
    expect(inserted[0]).toMatchObject({ projectId: 42, judgeId: 7, finalized: true, needsSecondaryReview: true });
  });

  it("returns the saved secondary-review request in the assigned judge review context", async () => {
    let selectCall = 0;
    const rows = [
      [project],
      [membership],
      [assignment],
      [{ id: 5, status: "complete", report: auditedReport, createdAt: new Date() }],
      [{ id: 3, hackathonId: 9, title: "Technical execution", weight: "35" }],
      [],
      [{ id: 19, projectId: 42, judgeId: 7, finalized: true, needsSecondaryReview: true, privateNotes: "Needs a second independent look." }],
    ];
    const db = {
      select: () => ({ from: () => ({ where: () => {
        const selected = rows[selectCall++] || [];
        const query = Object.assign(Promise.resolve(selected), { limit: async () => selected });
        return Object.assign(query, { orderBy: () => query });
      } }) }),
    };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(judgeContext());
    const context = await caller.judging.reviewContext({ projectId: 42 });
    expect(context.scorecard).toMatchObject({ id: 19, finalized: true, needsSecondaryReview: true });
  });
});
