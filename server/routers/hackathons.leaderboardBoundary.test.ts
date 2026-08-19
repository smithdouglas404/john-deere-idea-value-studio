import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { appRouter } from "../routers";
import { specialistEvaluations } from "../../drizzle/schema";

vi.mock("../db", () => ({ getDb: vi.fn() }));
const mockedGetDb = vi.mocked(getDb);

function adminContext(): TrpcContext {
  return { user: { id: 1, openId: "admin", name: "Admin", email: null, loginMethod: null, role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {}, protocol: "https" } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("human leaderboard boundary", () => {
  it("uses finalized human scorecards and exposes the audit preview separately without querying specialist evaluations", async () => {
    const rows = [
      [{ id: 9, title: "Proof sprint" }],
      [{ id: 42, title: "Team proof", submittedAt: new Date() }],
      [{ id: 1, weight: "100" }],
      [{ id: 101, projectId: 42, finalized: true }],
      [{ scorecardId: 101, criterionId: 1, score: "8" }],
      [{ id: 55, projectId: 42, status: "complete", finalSuggestedScore: "1.25", createdAt: new Date() }],
    ];
    let call = 0;
    const queriedTables: unknown[] = [];
    const db = {
      select: () => ({ from: (table: unknown) => {
        queriedTables.push(table);
        const selected = rows[call++] || [];
        const query = Object.assign(Promise.resolve(selected), { limit: async () => selected, orderBy: () => query });
        return Object.assign(query, { where: () => query });
      } }),
    };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.hackathons.leaderboard({ hackathonId: 9 })).resolves.toEqual([{ projectId: 42, title: "Team proof", submittedAt: expect.any(Date), finalizedJudgeCount: 1, humanScore: 8, agentPreview: 1.25 }]);
    expect(queriedTables).not.toContain(specialistEvaluations);
  });
});
