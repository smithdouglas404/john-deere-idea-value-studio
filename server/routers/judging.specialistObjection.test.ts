import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { appRouter } from "../routers";

vi.mock("../db", () => ({ getDb: vi.fn() }));
const mockedGetDb = vi.mocked(getDb);

const project = { id: 42, teamId: 84, hackathonId: 9, title: "Proof", description: "Evidence", createdAt: new Date(), updatedAt: new Date() };
const member = { id: 1, teamId: 84, userId: 7, role: "member", joinedAt: new Date() };
const specialistEvaluation = { id: 77, auditId: 5, projectId: 42, skill: "ux_ui", status: "complete", result: { findings: [{ reference: "UX-001", criterion: "Task clarity", finding: "Evidence is incomplete", status: "unclear" }] }, createdAt: new Date() };
const openChallenge = { id: 12, projectId: 42, submittedById: 7, claimReference: "specialist:77:UX-001", explanation: "The linked recording demonstrates the task flow.", status: "under_review", response: "A human reviewer is inspecting the cited recording.", createdAt: new Date(), resolvedAt: null };

function context(): TrpcContext {
  return { user: { id: 7, openId: "participant-7", name: "Participant", email: null, loginMethod: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {}, protocol: "https" } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function sequenceDb(rows: unknown[][]) {
  let selectCall = 0;
  const inserts: unknown[] = [];
  const updates: unknown[] = [];
  return {
    inserts,
    updates,
    db: {
      select: () => ({ from: () => ({ where: () => {
        const selected = rows[selectCall++] || [];
        const query = Object.assign(Promise.resolve(selected), { limit: async () => selected });
        return Object.assign(query, { orderBy: () => query });
      } }) }),
      insert: () => ({ values: async (value: unknown) => { inserts.push(value); return [{ insertId: 11 }]; } }),
      update: () => ({ set: (value: unknown) => ({ where: async () => { updates.push(value); return [{ affectedRows: 1 }]; } }) }),
    },
  };
}

describe("specialist challenge procedures", () => {
  it("returns stable specialist references to a project team member and accepts an objection tied to that persisted finding", async () => {
    const contextRows = [[project], [member], [], [{ id: 5, status: "complete", report: {}, createdAt: new Date() }], [specialistEvaluation], [openChallenge]];
    const first = sequenceDb(contextRows);
    mockedGetDb.mockResolvedValue(first.db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context());
    await expect(caller.judging.objectionContext({ projectId: 42 })).resolves.toMatchObject({ specialistFindings: [{ challengeReference: "specialist:77:UX-001", skill: "ux_ui", criterion: "Task clarity" }], challenges: [{ id: 12, claimReference: "specialist:77:UX-001", status: "under_review", response: "A human reviewer is inspecting the cited recording." }] });

    const objectionRows = [[project], [member], [], [{ id: 5, status: "complete", report: {}, createdAt: new Date() }], [specialistEvaluation]];
    const second = sequenceDb(objectionRows);
    mockedGetDb.mockResolvedValue(second.db as Awaited<ReturnType<typeof getDb>>);
    await expect(caller.judging.submitObjection({ projectId: 42, claimReference: "specialist:77:UX-001", explanation: "The team can provide a directly linked evidence record for this specific finding." })).resolves.toEqual({ success: true });
    expect(second.inserts[0]).toMatchObject({ projectId: 42, submittedById: 7, claimReference: "specialist:77:UX-001" });
  });

  it("does not expose specialist challenge context to a user outside the project team", async () => {
    const denied = sequenceDb([[project], [], []]);
    mockedGetDb.mockResolvedValue(denied.db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context());
    await expect(caller.judging.objectionContext({ projectId: 42 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not allow a non-team user to submit even a syntactically valid specialist challenge reference", async () => {
    const denied = sequenceDb([[project], [], []]);
    mockedGetDb.mockResolvedValue(denied.db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context());
    await expect(caller.judging.submitObjection({ projectId: 42, claimReference: "specialist:77:UX-001", explanation: "A non-team actor must not be able to challenge this persisted specialist finding." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(denied.inserts).toHaveLength(0);
  });

  it("allows an assigned judge to persist a human resolution for a cited participant challenge", async () => {
    const judgeAssignment = { id: 20, projectId: 42, judgeId: 7, isRecused: false };
    const reviewed = sequenceDb([[openChallenge], [project], [], [judgeAssignment]]);
    mockedGetDb.mockResolvedValue(reviewed.db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context());
    await expect(caller.judging.respondToObjection({ objectionId: 12, status: "resolved", response: "The cited recording supports the participant’s clarification; the panel will use that interpretation." })).resolves.toMatchObject({ success: true, objectionId: 12, status: "resolved" });
    expect(reviewed.updates[0]).toMatchObject({ status: "resolved", response: "The cited recording supports the participant’s clarification; the panel will use that interpretation.", reviewedById: 7 });
  });
});
