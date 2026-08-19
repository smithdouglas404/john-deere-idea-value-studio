import { describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { AUDIT_STALE_AFTER_MS, isAuditProcessingStale, processQueuedAudit } from "./auditQueue";

vi.mock("../db", () => ({ getDb: vi.fn() }));

const mockedGetDb = vi.mocked(getDb);

describe("managed audit queue equivalent", () => {
  it("identifies only interrupted audits older than the bounded recovery window as stale", () => {
    const now = new Date("2026-08-06T04:00:00.000Z");
    expect(isAuditProcessingStale(new Date(now.getTime() - AUDIT_STALE_AFTER_MS), now)).toBe(true);
    expect(isAuditProcessingStale(new Date(now.getTime() - AUDIT_STALE_AFTER_MS + 1), now)).toBe(false);
    expect(isAuditProcessingStale(null, now)).toBe(false);
  });

  it("does not reprocess a completed durable audit job", async () => {
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 81, status: "complete", projectId: 19 }] }) }) }),
      update: vi.fn(),
    };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);

    await expect(processQueuedAudit(81)).resolves.toEqual({ auditId: 81, status: "skipped", reason: "already_final" });
    expect(db.update).not.toHaveBeenCalled();
  });
});
