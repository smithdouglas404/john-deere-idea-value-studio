import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { appRouter } from "../routers";
import { getDb } from "../db";

vi.mock("../db", () => ({ getDb: vi.fn() }));
const mockedGetDb = vi.mocked(getDb);

function context(role: "user" | "admin"): TrpcContext {
  return {
    user: { id: 12, openId: `user-${role}`, name: role, email: null, loginMethod: null, role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("role isolation", () => {
  beforeEach(() => mockedGetDb.mockReset());

  it("blocks a participant from changing a proof-sprint status", async () => {
    const db = { select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }) };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.hackathons.updateStatus({ hackathonId: 1, status: "judging_active" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an organizer to change a proof-sprint status", async () => {
    const db = { update: () => ({ set: () => ({ where: async () => undefined }) }) };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.hackathons.updateStatus({ hackathonId: 1, status: "judging_active" })).resolves.toEqual({ success: true });
  });

  it("blocks a registered participant from creating a project for a team they do not belong to", async () => {
    let selectCount = 0;
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => { selectCount += 1; return selectCount === 1 ? [{ id: 1, hackathonId: 1, userId: 12 }] : []; } }) }) }),
    };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.hackathons.createProject({ hackathonId: 1, teamId: 44, title: "Unauthorized proof", description: "This participant is not a member of the specified team.", techStack: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows a registered participant to request a place on an open team", async () => {
    let selectCount = 0;
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => { selectCount += 1; return selectCount === 1 ? [{ id: 44, hackathonId: 1 }] : [{ id: 1, hackathonId: 1, userId: 12 }]; } }) }) }),
      insert: () => ({ values: () => ({ onDuplicateKeyUpdate: async () => undefined }) }),
    };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.hackathons.requestTeamJoin({ teamId: 44, message: "I can contribute field-data validation." })).resolves.toEqual({ success: true });
  });

  it("allows a team member to submit repository, demo, video, and deck links for their own project", async () => {
    let selectCount = 0;
    let persistedEvidence: Record<string, unknown> | undefined;
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => { selectCount += 1; return selectCount === 1 ? [{ id: 91, teamId: 44 }] : [{ id: 1, teamId: 44, userId: 12, role: "member" }]; } }) }) }),
      update: () => ({ set: (value: Record<string, unknown>) => { persistedEvidence = value; return { where: async () => undefined }; } }),
    };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.hackathons.submitProject({ projectId: 91, githubUrl: "https://github.com/acme/proof", demoUrl: "https://demo.example.com", videoUrl: "https://video.example.com/proof.mp4", pitchDeckUrl: "https://assets.example.com/proof.pdf" })).resolves.toEqual({ success: true });
    expect(persistedEvidence).toMatchObject({ githubUrl: "https://github.com/acme/proof", demoUrl: "https://demo.example.com", videoUrl: "https://video.example.com/proof.mp4", pitchDeckUrl: "https://assets.example.com/proof.pdf" });
  });

  it("allows a designated sponsor to hand a selected opportunity into a governed proof sprint", async () => {
    let selectCount = 0;
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => { selectCount += 1; return selectCount === 1 ? [{ userId: 12, persona: "sponsor" }] : [{ id: 77, status: "selected", problemStatement: "Reduce manual field-inspection friction." }]; } }) }) }),
      insert: () => ({ values: async () => [{ insertId: 33 }] }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
    };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.hackathons.createFromOpportunity({ opportunityId: 77, title: "Field inspection proof sprint", description: "Validate a source-backed solution path." })).resolves.toMatchObject({ hackathonId: 33 });
  });

  it("blocks a non-member from changing a project’s prize-track routing", async () => {
    let selectCount = 0;
    const db = { select: () => ({ from: () => ({ where: () => ({ limit: async () => { selectCount += 1; return selectCount === 1 ? [{ id: 91, teamId: 44, hackathonId: 1 }] : []; } }) }) }) };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.hackathons.setProjectTracks({ projectId: 91, trackIds: [3] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks a non-member from reading team collaboration messages", async () => {
    const db = { select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }) };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.hackathons.teamMessages({ teamId: 44 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks a participant from searching the audited repository evidence index", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.repositories.searchIndexedEvidence({ projectId: 91, query: "secure audit route" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows a team member to post a bounded collaboration message", async () => {
    let persistedMessage: Record<string, unknown> | undefined;
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ teamId: 44, userId: 12, role: "member" }] }) }) }),
      insert: () => ({ values: async (value: Record<string, unknown>) => { persistedMessage = value; return [{ insertId: 31 }]; } }),
    };
    mockedGetDb.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.hackathons.postTeamMessage({ teamId: 44, body: "I will validate the telemetry evidence before the judging checkpoint." })).resolves.toEqual({ messageId: 31 });
    expect(persistedMessage).toMatchObject({ teamId: 44, senderId: 12 });
  });
});
