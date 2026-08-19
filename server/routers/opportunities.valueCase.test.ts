import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { appRouter } from "../routers";

vi.mock("../db", () => ({ getDb: vi.fn() }));
const mockedGetDb = vi.mocked(getDb);

function context(role: "user" | "admin"): TrpcContext {
  return {
    user: { id: 9, openId: `value-${role}`, name: role, email: null, loginMethod: null, role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("opportunities.saveValueCase", () => {
  beforeEach(() => mockedGetDb.mockReset());

  it("prevents a non-sponsor participant from changing economic numbers or the investment gate", async () => {
    const db = { select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }) };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.opportunities.saveValueCase({ opportunityId: 1, valueCurrency: "USD", valueDrivers: [], economicAssumptions: [], investmentGate: "proof_sprint" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("persists an administrator-approved value range and human investment gate", async () => {
    let saved: Record<string, unknown> | null = null;
    let readCount = 0;
    const persisted = { id: 1, initialValueLow: "100000", initialValueHigh: "250000", costToProve: "15000", timeToValueMonths: 6, valueCurrency: "USD", investmentGate: "proof_sprint" };
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [++readCount === 1 ? { id: 1 } : persisted] }) }) }),
      update: () => ({ set: (values: Record<string, unknown>) => { saved = values; return { where: async () => undefined }; } }),
    };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.opportunities.saveValueCase({ opportunityId: 1, initialValueLow: 100000, initialValueHigh: 250000, costToProve: 15000, timeToValueMonths: 6, valueCurrency: "USD", valueDrivers: ["Reduce rework"], economicAssumptions: ["Baseline is pending validation"], investmentGate: "proof_sprint", investmentGateRationale: "A bounded proof can validate the operating driver." })).resolves.toEqual({ success: true, opportunity: persisted });
    expect(saved).toMatchObject({ initialValueLow: "100000", initialValueHigh: "250000", costToProve: "15000", timeToValueMonths: 6, investmentGate: "proof_sprint" });
  });
});
