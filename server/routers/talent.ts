import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { developerTelemetry, projects, teamMembers, userProfiles } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The data service is not available." });
  return db;
}

function parseGitHubRepository(url: string) {
  const match = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/i);
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/, "") } : null;
}

function profileGitHubLogin(url?: string | null) {
  if (!url) return null;
  const match = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/#?]+)/i);
  return match ? match[1].toLowerCase() : null;
}

const availabilityRoles = z.enum(["developer", "designer", "product_manager", "domain_expert", "data_scientist", "researcher", "mentor"]);

export const talentRouter = router({
  myProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1);
    return profile || null;
  }),

  saveMyProfile: protectedProcedure.input(z.object({
    bio: z.string().max(3000).optional(),
    githubUrl: z.string().url().optional().or(z.literal("")),
    gitlabUrl: z.string().url().optional().or(z.literal("")),
    portfolioUrl: z.string().url().optional().or(z.literal("")),
    linkedinUrl: z.string().url().optional().or(z.literal("")),
    skills: z.array(z.string().min(1).max(80)).max(40),
    availabilityRoles: z.array(availabilityRoles).max(10),
    lookingForTeam: z.boolean(),
    talentConsent: z.boolean(),
  })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const values = {
      bio: input.bio,
      githubUrl: input.githubUrl || null,
      gitlabUrl: input.gitlabUrl || null,
      portfolioUrl: input.portfolioUrl || null,
      linkedinUrl: input.linkedinUrl || null,
      skills: input.skills,
      availabilityRoles: input.availabilityRoles,
      lookingForTeam: input.lookingForTeam,
      talentConsent: input.talentConsent,
    };
    await db.insert(userProfiles).values({ userId: ctx.user.id, ...values }).onDuplicateKeyUpdate({ set: values });
    return { success: true };
  }),

  verifiedProfiles: protectedProcedure.input(z.object({ query: z.string().max(100).optional() })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Talent intelligence is restricted to authorized workforce and program administrators." });
    const db = await dbOrThrow();
    const profiles = await db.select().from(userProfiles).where(eq(userProfiles.talentConsent, true));
    const rows = [];
    for (const profile of profiles) {
      const telemetry = await db.select().from(developerTelemetry).where(eq(developerTelemetry.userId, profile.userId)).orderBy(desc(developerTelemetry.updatedAt)).limit(1);
      const terms = [profile.bio || "", ...(profile.skills || []), ...(profile.availabilityRoles || [])].join(" ").toLowerCase();
      if (!input.query || terms.includes(input.query.toLowerCase())) rows.push({ profile, telemetry: telemetry[0] || null });
    }
    return rows;
  }),

  recordVerifiedTelemetry: protectedProcedure.input(z.object({
    userId: z.number().int().positive(),
    hackathonId: z.number().int().positive(),
    commitCount: z.number().int().min(0),
    bulkCommitFlag: z.boolean(),
    codeIntegrityScore: z.number().min(0).max(10).optional(),
    verifiedSkills: z.array(z.string().max(80)).max(40),
    profileSummary: z.string().max(3000).optional(),
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only authorized administrators can record verified capability evidence." });
    const db = await dbOrThrow();
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, input.userId)).limit(1);
    if (!profile?.talentConsent) throw new TRPCError({ code: "BAD_REQUEST", message: "This member has not opted in to the consent-based talent intelligence record." });
    await db.insert(developerTelemetry).values({ ...input, codeIntegrityScore: input.codeIntegrityScore?.toString() });
    return { success: true };
  }),

  syncProjectRepository: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only an authorized administrator can sync contribution records." });
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
    if (!project?.githubUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "A public GitHub repository URL is required before contribution sync can run." });
    const repository = parseGitHubRepository(project.githubUrl);
    if (!repository) throw new TRPCError({ code: "BAD_REQUEST", message: "This release supports public GitHub repository URLs only." });
    const response = await fetch(`https://api.github.com/repos/${repository.owner}/${repository.repo}/contributors?per_page=100`, { headers: { accept: "application/vnd.github+json", "user-agent": "Value-Fieldbook-Agent" } });
    if (!response.ok) throw new TRPCError({ code: "BAD_REQUEST", message: `GitHub contribution data could not be read (HTTP ${response.status}).` });
    const contributors = await response.json() as Array<{ login?: string; contributions?: number }>;
    const members = await db.select().from(teamMembers).where(eq(teamMembers.teamId, project.teamId));
    let synced = 0;
    for (const member of members) {
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, member.userId)).limit(1);
      const login = profileGitHubLogin(profile?.githubUrl);
      const contributor = login ? contributors.find(item => item.login?.toLowerCase() === login) : undefined;
      if (!profile?.talentConsent || !contributor) continue;
      await db.insert(developerTelemetry).values({
        userId: member.userId,
        hackathonId: project.hackathonId,
        commitCount: contributor.contributions || 0,
        bulkCommitFlag: false,
        verifiedSkills: profile.skills,
        profileSummary: `Public GitHub contribution count synchronized from ${project.githubUrl}; human review is still required to interpret contribution scope.`,
      });
      synced += 1;
    }
    return { synced };
  }),
});
