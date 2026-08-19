import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { projects, repositoryConnections } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { createHeartbeatJob, deleteHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { getGitHubAppConfig, listAuthorizedInstallationRepositories } from "../services/githubApp";
import { searchIndexedCode } from "../services/repositoryCodeIndex";

function parseGitHubUrl(url: string) {
  const match = url.trim().match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/i);
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/, "") } : null;
}

function assertSixFieldCron(cron: string) {
  if (cron.trim().split(/\s+/).length !== 6) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Monitoring uses a six-field UTC cron expression, for example: 0 0 */6 * * *." });
  }
}

function sessionToken(cookieHeader: string | undefined) {
  const token = parseCookie(cookieHeader ?? "")[COOKIE_NAME];
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in organizer session is required to manage monitoring." });
  return token;
}

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The data service is not available." });
  return db;
}

async function requireProjectAdmin(projectId: number, role: string) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only an organizer can authorize, revoke, or schedule repository access." });
  const db = await dbOrThrow();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  return { db, project };
}

export const repositoriesRouter = router({
  listForProject: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only organizers can inspect repository authorization records." });
    return db.select().from(repositoryConnections).where(eq(repositoryConnections.projectId, input.projectId)).orderBy(desc(repositoryConnections.createdAt));
  }),

  searchIndexedEvidence: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), query: z.string().min(3).max(2000), limit: z.number().int().min(1).max(20).default(5) })).query(async ({ ctx, input }) => {
    const { db, project } = await requireProjectAdmin(input.projectId, ctx.user.role);
    const [connection] = await db.select().from(repositoryConnections).where(and(eq(repositoryConnections.projectId, project.id), isNull(repositoryConnections.revokedAt))).orderBy(desc(repositoryConnections.createdAt)).limit(1);
    if (!connection) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Authorize and monitor a repository before searching indexed evidence." });
    return searchIndexedCode({ projectId: project.id, connectionId: connection.id, actorId: ctx.user.id, query: input.query, limit: input.limit });
  }),

  authorize: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), githubUrl: z.string().url().max(600), evidenceMode: z.enum(["public_api", "github_app"]) })).mutation(async ({ ctx, input }) => {
    const { db, project } = await requireProjectAdmin(input.projectId, ctx.user.role);
    const parsed = parseGitHubUrl(input.githubUrl);
    if (!parsed) throw new TRPCError({ code: "BAD_REQUEST", message: "Use a GitHub repository URL in owner/repository form." });
    await db.update(repositoryConnections).set({ revokedAt: new Date(), scheduleCronTaskUid: null }).where(and(eq(repositoryConnections.projectId, project.id), isNull(repositoryConnections.revokedAt)));

    if (input.evidenceMode === "public_api") {
      const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers: { accept: "application/vnd.github+json", "user-agent": "John-Deere-Idea-Value-Studio" } });
      if (!response.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "The public repository could not be verified." });
      const repository = (await response.json()) as { id: number; private: boolean; html_url: string; full_name: string };
      if (repository.private) throw new TRPCError({ code: "BAD_REQUEST", message: "Private repositories require the approved GitHub App evidence mode." });
      await db.insert(repositoryConnections).values({ projectId: project.id, githubUrl: repository.html_url, visibility: "public", accessMode: "public_api", authorizedById: ctx.user.id, authorizedRepositoryId: String(repository.id), authorizationEvidence: { fullName: repository.full_name, verifiedAt: new Date().toISOString(), access: "public_read_only" } });
      await db.update(projects).set({ githubUrl: repository.html_url }).where(eq(projects.id, project.id));
      return { success: true, visibility: "public" as const, accessMode: "public_api" as const };
    }

    const config = await getGitHubAppConfig();
    if (!config) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Private repository access has not been configured for this environment." });
    const authorized = await listAuthorizedInstallationRepositories();
    const repository = authorized.find(item => item.full_name.toLowerCase() === `${parsed.owner}/${parsed.repo}`.toLowerCase());
    if (!repository) throw new TRPCError({ code: "FORBIDDEN", message: "This repository is not in the approved GitHub App installation scope." });
    await db.insert(repositoryConnections).values({ projectId: project.id, githubUrl: repository.html_url, visibility: repository.private ? "private" : "public", accessMode: "github_app", appId: config.appId, installationId: config.installationId, authorizedById: ctx.user.id, authorizedRepositoryId: String(repository.id), authorizationEvidence: { fullName: repository.full_name, verifiedAt: new Date().toISOString(), installationScope: "explicitly_authorized_read_only" } });
    await db.update(projects).set({ githubUrl: repository.html_url }).where(eq(projects.id, project.id));
    return { success: true, visibility: repository.private ? "private" as const : "public" as const, accessMode: "github_app" as const };
  }),

  revoke: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const { db, project } = await requireProjectAdmin(input.projectId, ctx.user.role);
    await db.update(repositoryConnections).set({ revokedAt: new Date(), scheduleCronTaskUid: null }).where(and(eq(repositoryConnections.projectId, project.id), isNull(repositoryConnections.revokedAt)));
    return { success: true };
  }),

  scheduleMonitoring: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), cron: z.string().min(9).max(80), enabled: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
    const { db, project } = await requireProjectAdmin(input.projectId, ctx.user.role);
    assertSixFieldCron(input.cron);
    const [connection] = await db.select().from(repositoryConnections).where(and(eq(repositoryConnections.projectId, project.id), isNull(repositoryConnections.revokedAt))).orderBy(desc(repositoryConnections.createdAt)).limit(1);
    if (!connection) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Authorize a repository before enabling monitoring." });
    const token = sessionToken(ctx.req.headers.cookie);
    if (connection.scheduleCronTaskUid) {
      const update = await updateHeartbeatJob(connection.scheduleCronTaskUid, { cron: input.cron, enable: input.enabled, path: "/api/scheduled/monitorRepository", description: `Repository observation for project ${project.id}` }, token);
      return { taskUid: connection.scheduleCronTaskUid, nextExecutionAt: update.nextExecutionAt ?? null };
    }
    const job = await createHeartbeatJob({ name: `repository-monitor-${connection.id}`, cron: input.cron, path: "/api/scheduled/monitorRepository", payload: {}, description: `Repository observation for project ${project.id}` }, token);
    await db.update(repositoryConnections).set({ scheduleCronTaskUid: job.taskUid }).where(eq(repositoryConnections.id, connection.id));
    return { taskUid: job.taskUid, nextExecutionAt: job.nextExecutionAt ?? null };
  }),

  stopMonitoring: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const { db, project } = await requireProjectAdmin(input.projectId, ctx.user.role);
    const [connection] = await db.select().from(repositoryConnections).where(and(eq(repositoryConnections.projectId, project.id), isNull(repositoryConnections.revokedAt))).orderBy(desc(repositoryConnections.createdAt)).limit(1);
    if (!connection?.scheduleCronTaskUid) return { success: true, skipped: "not_scheduled" as const };
    await deleteHeartbeatJob(connection.scheduleCronTaskUid, sessionToken(ctx.req.headers.cookie));
    await db.update(repositoryConnections).set({ scheduleCronTaskUid: null }).where(eq(repositoryConnections.id, connection.id));
    return { success: true };
  }),
});
