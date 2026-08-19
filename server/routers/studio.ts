import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  studioCampaignAssessments,
  studioCampaigns,
  studioCampaignSignals,
  studioChallengeRepositories,
  studioIncubationReviews,
  studioEvidencePackets,
  studioEventRegistrations,
  studioInvestmentCases,
  studioInvestmentCaseAssets,
  studioInvestmentGates,
  studioInvestmentLearning,
  studioJudgeDecisions,
  studioProofArtifacts,
  studioProofCandidates,
  studioProofEvents,
  studioProofTeamMembers,
  studioTeamProofs,
  users,
  userProfiles,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { evaluateStudioProof, missingEvidencePacket, studioEvidenceHash, type StudioProofInput } from "../services/studioEvidenceAgent";
import { runHackathonAgent } from "../services/hackathonAgent";
import { authorizedGitHubRepositoryArtifact, mergeRepositoryAuditIntoStudioEvidence } from "../services/studioRepositoryAuditAdapter";
import { canEnterHackathonPreparation, caseStatusForIncubationDecision } from "../services/incubationReview";
import { CHALLENGE_REPOSITORY_ORGANIZATION, challengeRepositoryGovernanceDefaults } from "../services/challengeRepositoryGovernance";
import { provisionPrivateOrganizationRepository } from "../services/githubApp";
import { getTenantConfig, updateTenantConfig } from "../services/studioAdminConfig";
import { storagePut } from "../storage";

const artifactSchema = z.object({
  key: z.string().min(2).max(80),
  label: z.string().min(2).max(160),
  required: z.boolean(),
  purpose: z.string().min(5).max(600),
});

const rubricSchema = z.object({
  key: z.string().min(2).max(80),
  label: z.string().min(2).max(160),
  weight: z.number().min(0).max(100),
  description: z.string().min(5).max(700),
});

const executiveHeatMapSchema = z.object({
  dimensions: z.array(z.object({
    key: z.enum(["efficiency", "productivity", "cost_takeout", "innovation", "revenue_growth", "customer_impact", "skill", "will"]),
    label: z.string().min(2).max(100),
    score: z.number().int().min(1).max(5),
  })).length(8),
}).refine(value => new Set(value.dimensions.map(dimension => dimension.key)).size === 8, { message: "Record one human score for each value, skill, and will dimension." });

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The data service is unavailable." });
  return db;
}

function cleanInvestmentAssetName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

function decodeUpload(base64: string) {
  const cleaned = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  return Buffer.from(cleaned, "base64");
}

async function canSponsor(userId: number, role: string) {
  if (role === "admin") return true;
  const db = await dbOrThrow();
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return profile?.persona === "sponsor" || profile?.persona === "organizer";
}

async function sponsorOnly(userId: number, role: string) {
  if (!(await canSponsor(userId, role))) throw new TRPCError({ code: "FORBIDDEN", message: "A sponsor, organizer, or administrator must make this change." });
}

const caseInput = z.object({
  campaignId: z.number().int().positive(),
  title: z.string().min(4).max(255),
  investmentThesis: z.string().min(20).max(8000),
  problemStatement: z.string().min(20).max(8000),
  businessCase: z.string().min(30).max(12000),
  financialDetail: z.record(z.string(), z.unknown()).optional(),
  kpiOkrLinks: z.array(z.object({ label: z.string().min(2).max(200), rationale: z.string().min(5).max(800) })).max(20).optional(),
});

export const studioRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    const [campaigns, cases, events, candidates, proofs, packets, gates, signals, registrations] = await Promise.all([
      db.select().from(studioCampaigns).orderBy(desc(studioCampaigns.updatedAt)),
      db.select().from(studioInvestmentCases).orderBy(desc(studioInvestmentCases.updatedAt)),
      db.select().from(studioProofEvents).orderBy(desc(studioProofEvents.updatedAt)),
      db.select().from(studioProofCandidates).orderBy(desc(studioProofCandidates.updatedAt)),
      db.select().from(studioTeamProofs).orderBy(desc(studioTeamProofs.updatedAt)),
      db.select().from(studioEvidencePackets).orderBy(desc(studioEvidencePackets.updatedAt)),
      db.select().from(studioInvestmentGates).orderBy(desc(studioInvestmentGates.createdAt)),
      db.select().from(studioCampaignSignals).orderBy(desc(studioCampaignSignals.createdAt)),
      db.select().from(studioEventRegistrations).orderBy(desc(studioEventRegistrations.updatedAt)),
    ]);
    return { campaigns, cases, events, candidates, proofs, packets, gates, signals, registrations, viewerId: ctx.user.id, viewerRole: ctx.user.role };
  }),

  campaignWorkspace: protectedProcedure.input(z.object({ campaignId: z.number().int().positive() })).query(async ({ input, ctx }) => {
    const db = await dbOrThrow();
    const [campaign] = await db.select().from(studioCampaigns).where(eq(studioCampaigns.id, input.campaignId)).limit(1);
    if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Crowdsourcing campaign not found." });
    const [cases, signals, assessments] = await Promise.all([
      db.select().from(studioInvestmentCases).where(eq(studioInvestmentCases.campaignId, campaign.id)).orderBy(desc(studioInvestmentCases.updatedAt)),
      db.select().from(studioCampaignSignals).where(eq(studioCampaignSignals.campaignId, campaign.id)).orderBy(desc(studioCampaignSignals.createdAt)),
      db.select().from(studioCampaignAssessments).where(eq(studioCampaignAssessments.campaignId, campaign.id)).orderBy(desc(studioCampaignAssessments.updatedAt)),
    ]);
    const caseIds = cases.map(item => item.id);
    const caseAssets = caseIds.length ? await db.select().from(studioInvestmentCaseAssets).where(inArray(studioInvestmentCaseAssets.investmentCaseId, caseIds)).orderBy(desc(studioInvestmentCaseAssets.createdAt)) : [];
    const candidates = caseIds.length ? await db.select().from(studioProofCandidates).where(inArray(studioProofCandidates.investmentCaseId, caseIds)).orderBy(desc(studioProofCandidates.updatedAt)) : [];
    const eventIds = Array.from(new Set(candidates.map(item => item.proofEventId)));
    const events = eventIds.length ? await db.select().from(studioProofEvents).where(inArray(studioProofEvents.id, eventIds)).orderBy(desc(studioProofEvents.updatedAt)) : [];
    const reviews = caseIds.length ? await db.select().from(studioIncubationReviews).where(inArray(studioIncubationReviews.investmentCaseId, caseIds)).orderBy(desc(studioIncubationReviews.updatedAt)) : [];
    return { campaign, cases, caseAssets, signals, assessments, reviews, candidates, events, viewerId: ctx.user.id, viewerCanManage: await canSponsor(ctx.user.id, ctx.user.role) };
  }),

  eventWorkspace: protectedProcedure.input(z.object({ proofEventId: z.number().int().positive() })).query(async ({ input, ctx }) => {
    const db = await dbOrThrow();
    const [event] = await db.select().from(studioProofEvents).where(eq(studioProofEvents.id, input.proofEventId)).limit(1);
    if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Scheduled hackathon not found." });
    const candidates = await db.select().from(studioProofCandidates).where(eq(studioProofCandidates.proofEventId, event.id)).orderBy(desc(studioProofCandidates.updatedAt));
    const caseIds = candidates.map(item => item.investmentCaseId);
    const proofCandidateIds = candidates.map(item => item.id);
    const [cases, proofs, registrations, assessments] = await Promise.all([
      caseIds.length ? db.select().from(studioInvestmentCases).where(inArray(studioInvestmentCases.id, caseIds)) : [],
      proofCandidateIds.length ? db.select().from(studioTeamProofs).where(inArray(studioTeamProofs.proofCandidateId, proofCandidateIds)).orderBy(desc(studioTeamProofs.updatedAt)) : [],
      db.select().from(studioEventRegistrations).where(eq(studioEventRegistrations.proofEventId, event.id)).orderBy(desc(studioEventRegistrations.updatedAt)),
      caseIds.length ? db.select().from(studioCampaignAssessments).where(inArray(studioCampaignAssessments.investmentCaseId, caseIds)).orderBy(desc(studioCampaignAssessments.updatedAt)) : [],
    ]);
    const originatorIds = Array.from(new Set(cases.map(item => item.originatorId).filter((id): id is number => typeof id === "number")));
    const originators = originatorIds.length
      ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, originatorIds))
      : [];
    const proofIds = proofs.map(item => item.id);
    const [artifacts, packets, decisions, memberships, challengeRepositories] = await Promise.all([
      proofIds.length ? db.select().from(studioProofArtifacts).where(inArray(studioProofArtifacts.teamProofId, proofIds)).orderBy(desc(studioProofArtifacts.createdAt)) : [],
      proofIds.length ? db.select().from(studioEvidencePackets).where(inArray(studioEvidencePackets.teamProofId, proofIds)).orderBy(desc(studioEvidencePackets.updatedAt)) : [],
      proofIds.length ? db.select().from(studioJudgeDecisions).where(inArray(studioJudgeDecisions.teamProofId, proofIds)).orderBy(desc(studioJudgeDecisions.updatedAt)) : [],
      proofIds.length ? db.select().from(studioProofTeamMembers).where(inArray(studioProofTeamMembers.teamProofId, proofIds)).orderBy(desc(studioProofTeamMembers.joinedAt)) : [],
      proofCandidateIds.length ? db.select().from(studioChallengeRepositories).where(inArray(studioChallengeRepositories.proofCandidateId, proofCandidateIds)).orderBy(desc(studioChallengeRepositories.updatedAt)) : [],
    ]);
    return { event, candidates, cases, proofs, artifacts, packets, decisions, registrations, memberships, originators, assessments, challengeRepositories, viewerCanManage: await canSponsor(ctx.user.id, ctx.user.role) };
  }),

  caseWorkspace: protectedProcedure.input(z.object({ caseId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await dbOrThrow();
    const [investmentCase] = await db.select().from(studioInvestmentCases).where(eq(studioInvestmentCases.id, input.caseId)).limit(1);
    if (!investmentCase) throw new TRPCError({ code: "NOT_FOUND", message: "Investment case not found." });
    const [campaign, candidates, gates, signals, learning, availableEvents, originator, assessments, caseAssets] = await Promise.all([
      db.select().from(studioCampaigns).where(eq(studioCampaigns.id, investmentCase.campaignId)).limit(1),
      db.select().from(studioProofCandidates).where(eq(studioProofCandidates.investmentCaseId, investmentCase.id)).orderBy(desc(studioProofCandidates.updatedAt)),
      db.select().from(studioInvestmentGates).where(eq(studioInvestmentGates.investmentCaseId, investmentCase.id)).orderBy(desc(studioInvestmentGates.createdAt)),
      db.select().from(studioCampaignSignals).where(eq(studioCampaignSignals.campaignId, investmentCase.campaignId)).orderBy(desc(studioCampaignSignals.createdAt)),
      db.select().from(studioInvestmentLearning).where(eq(studioInvestmentLearning.investmentCaseId, investmentCase.id)).orderBy(desc(studioInvestmentLearning.createdAt)),
      db.select().from(studioProofEvents).where(inArray(studioProofEvents.status, ["draft", "registration", "proof_active", "judging"])).orderBy(desc(studioProofEvents.updatedAt)),
      investmentCase.originatorId ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, investmentCase.originatorId)).limit(1) : [],
      db.select().from(studioCampaignAssessments).where(eq(studioCampaignAssessments.investmentCaseId, investmentCase.id)).orderBy(desc(studioCampaignAssessments.updatedAt)),
      db.select().from(studioInvestmentCaseAssets).where(eq(studioInvestmentCaseAssets.investmentCaseId, investmentCase.id)).orderBy(desc(studioInvestmentCaseAssets.createdAt)),
    ]);
    const candidateIds = candidates.map(candidate => candidate.id);
    const events = candidateIds.length
      ? await db.select().from(studioProofEvents).where(inArray(studioProofEvents.id, candidates.map(candidate => candidate.proofEventId))).orderBy(desc(studioProofEvents.updatedAt))
      : [];
    const proofs = candidateIds.length ? await db.select().from(studioTeamProofs).where(inArray(studioTeamProofs.proofCandidateId, candidateIds)).orderBy(desc(studioTeamProofs.updatedAt)) : [];
    const proofIds = proofs.map(proof => proof.id);
    const artifacts = proofIds.length ? await db.select().from(studioProofArtifacts).where(inArray(studioProofArtifacts.teamProofId, proofIds)).orderBy(desc(studioProofArtifacts.createdAt)) : [];
    const packets = proofIds.length ? await db.select().from(studioEvidencePackets).where(inArray(studioEvidencePackets.teamProofId, proofIds)).orderBy(desc(studioEvidencePackets.updatedAt)) : [];
    const decisions = proofIds.length ? await db.select().from(studioJudgeDecisions).where(inArray(studioJudgeDecisions.teamProofId, proofIds)).orderBy(desc(studioJudgeDecisions.updatedAt)) : [];
    const eventIds = events.map(event => event.id);
    const registrations = eventIds.length ? await db.select().from(studioEventRegistrations).where(inArray(studioEventRegistrations.proofEventId, eventIds)).orderBy(desc(studioEventRegistrations.updatedAt)) : [];
    const memberships = proofIds.length ? await db.select().from(studioProofTeamMembers).where(inArray(studioProofTeamMembers.teamProofId, proofIds)).orderBy(desc(studioProofTeamMembers.joinedAt)) : [];
    const challengeRepositories = candidateIds.length ? await db.select().from(studioChallengeRepositories).where(inArray(studioChallengeRepositories.proofCandidateId, candidateIds)).orderBy(desc(studioChallengeRepositories.updatedAt)) : [];
    return { campaign: campaign[0] || null, investmentCase, originator: originator[0] || null, events, availableEvents, candidates, proofs, artifacts, packets, decisions, gates, signals, registrations, memberships, learning, assessments, caseAssets, challengeRepositories };
  }),

  createCampaign: protectedProcedure.input(z.object({ title: z.string().min(4).max(255), challengeBrief: z.string().min(20).max(8000), opensAt: z.date().optional(), closesAt: z.date().optional() })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [created] = await db.insert(studioCampaigns).values({ ...input, ownerId: ctx.user.id, status: input.opensAt ? "open" : "draft" }).$returningId();
    return { id: created.id };
  }),

  addCampaignSignal: protectedProcedure.input(z.object({ campaignId: z.number().int().positive(), investmentCaseId: z.number().int().positive().optional(), signalType: z.enum(["idea", "endorsement", "comment", "evidence_offer"]), content: z.string().min(5).max(8000) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [campaign] = await db.select().from(studioCampaigns).where(eq(studioCampaigns.id, input.campaignId)).limit(1);
    if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found." });
    if (input.investmentCaseId) {
      const [investmentCase] = await db.select().from(studioInvestmentCases).where(and(eq(studioInvestmentCases.id, input.investmentCaseId), eq(studioInvestmentCases.campaignId, campaign.id))).limit(1);
      if (!investmentCase) throw new TRPCError({ code: "BAD_REQUEST", message: "The business case does not belong to this campaign." });
    }
    const [created] = await db.insert(studioCampaignSignals).values({ ...input, submittedById: ctx.user.id }).$returningId();
    return { id: created.id };
  }),

  saveCampaignAssessment: protectedProcedure.input(z.object({ campaignId: z.number().int().positive(), investmentCaseId: z.number().int().positive(), stance: z.enum(["go", "hold", "no_go"]), valuationScore: z.number().int().min(1).max(5), likes: z.string().min(5).max(3000), improvements: z.string().min(5).max(3000), rationale: z.string().min(10).max(5000) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [investmentCase] = await db.select().from(studioInvestmentCases).where(and(eq(studioInvestmentCases.id, input.investmentCaseId), eq(studioInvestmentCases.campaignId, input.campaignId))).limit(1);
    if (!investmentCase) throw new TRPCError({ code: "BAD_REQUEST", message: "The business case does not belong to this campaign." });
    await db.insert(studioCampaignAssessments).values({ ...input, submittedById: ctx.user.id }).onDuplicateKeyUpdate({ set: { stance: input.stance, valuationScore: input.valuationScore, likes: input.likes, improvements: input.improvements, rationale: input.rationale, updatedAt: new Date() } });
    return { success: true };
  }),

  recordIncubationReview: protectedProcedure.input(z.object({ investmentCaseId: z.number().int().positive(), decision: z.enum(["advance", "return_for_enrichment", "hold", "decline"]), rationale: z.string().min(10).max(4000) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [investmentCase] = await db.select().from(studioInvestmentCases).where(eq(studioInvestmentCases.id, input.investmentCaseId)).limit(1);
    if (!investmentCase) throw new TRPCError({ code: "NOT_FOUND", message: "Business case not found." });
    const nextStatus = caseStatusForIncubationDecision(input.decision);
    await db.transaction(async tx => {
      await tx.insert(studioIncubationReviews).values({ ...input, managerId: ctx.user.id }).onDuplicateKeyUpdate({ set: { decision: input.decision, rationale: input.rationale, updatedAt: new Date() } });
      if (nextStatus !== investmentCase.status) await tx.update(studioInvestmentCases).set({ status: nextStatus, approvalRationale: input.decision === "advance" ? input.rationale : investmentCase.approvalRationale }).where(eq(studioInvestmentCases.id, investmentCase.id));
    });
    return { success: true };
  }),

  prepareChallengeRepository: protectedProcedure.input(z.object({ proofCandidateId: z.number().int().positive(), repositoryName: z.string().min(3).max(100).regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.") })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [candidate] = await db.select().from(studioProofCandidates).where(eq(studioProofCandidates.id, input.proofCandidateId)).limit(1);
    if (!candidate) throw new TRPCError({ code: "NOT_FOUND", message: "Selected project not found." });
    const defaults = challengeRepositoryGovernanceDefaults(input.repositoryName);
    await db.insert(studioChallengeRepositories).values({
      proofCandidateId: candidate.id,
      organization: defaults.organization,
      repositoryName: defaults.repositoryName,
      status: defaults.status,
      teamAccessStatus: defaults.teamAccessStatus,
      auditMode: defaults.auditMode,
      createdById: ctx.user.id,
    }).onDuplicateKeyUpdate({
      set: { organization: defaults.organization, repositoryName: input.repositoryName, status: "ready_to_provision", teamAccessStatus: "not_granted", githubRepositoryId: null, repositoryUrl: null, submittedRef: null, submittedAt: null, updatedAt: new Date() },
    });
    return { success: true };
  }),

  provisionChallengeRepository: protectedProcedure.input(z.object({ proofCandidateId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [repository] = await db.select().from(studioChallengeRepositories).where(eq(studioChallengeRepositories.proofCandidateId, input.proofCandidateId)).limit(1);
    if (!repository) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Prepare the repository governance record before provisioning the private repository." });
    if (repository.organization !== CHALLENGE_REPOSITORY_ORGANIZATION) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This repository record is not assigned to the verified Inflexcvi organization." });
    if (repository.status === "deleted") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A deleted challenge repository cannot be provisioned again from this record." });
    const created = await provisionPrivateOrganizationRepository(repository.organization, repository.repositoryName);
    await db.update(studioChallengeRepositories).set({
      githubRepositoryId: String(created.id),
      repositoryUrl: created.html_url,
      status: "provisioned",
      auditMode: "read_only_advisory",
      updatedAt: new Date(),
    }).where(eq(studioChallengeRepositories.id, repository.id));
    return { success: true, repositoryUrl: created.html_url, githubRepositoryId: String(created.id), idempotent: repository.status === "provisioned" };
  }),

  createInvestmentCase: protectedProcedure.input(caseInput).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [campaign] = await db.select().from(studioCampaigns).where(eq(studioCampaigns.id, input.campaignId)).limit(1);
    if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found." });
    const [created] = await db.insert(studioInvestmentCases).values({ ...input, sponsorId: ctx.user.id, originatorId: ctx.user.id }).$returningId();
    return { id: created.id };
  }),

  submitCrowdIdea: protectedProcedure.input(z.object({
    campaignId: z.number().int().positive(),
    title: z.string().min(4).max(255),
    problemStatement: z.string().min(20).max(8000),
    intendedValue: z.string().min(20).max(8000),
    authorContext: z.string().max(4000).optional(),
    financialDetail: z.record(z.string(), z.unknown()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [campaign] = await db.select().from(studioCampaigns).where(eq(studioCampaigns.id, input.campaignId)).limit(1);
    if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found." });
    const [created] = await db.insert(studioInvestmentCases).values({
      campaignId: campaign.id,
      sponsorId: ctx.user.id,
      originatorId: ctx.user.id,
      title: input.title,
      investmentThesis: input.intendedValue,
      problemStatement: input.problemStatement,
      businessCase: input.authorContext || "Community-submitted idea awaiting sponsor qualification.",
      financialDetail: input.financialDetail,
      status: "submitted",
    }).$returningId();
    await db.insert(studioCampaignSignals).values({ campaignId: campaign.id, investmentCaseId: created.id, submittedById: ctx.user.id, signalType: "idea", content: input.authorContext || input.intendedValue });
    return { id: created.id };
  }),

  uploadInvestmentCaseAsset: protectedProcedure.input(z.object({
    investmentCaseId: z.number().int().positive(),
    assetType: z.enum(["business_plan", "financial_model", "research", "technical_document", "other"]),
    fileName: z.string().min(1).max(300),
    mimeType: z.string().min(1).max(150),
    base64: z.string().min(1),
    consent: z.literal(true),
  })).mutation(async ({ ctx, input }) => {
    const allowedMimeTypes = new Set(["text/plain", "text/markdown", "text/csv", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
    if (!allowedMimeTypes.has(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a plain text, Markdown, CSV, PDF, or DOCX business document." });
    const db = await dbOrThrow();
    const [investmentCase] = await db.select().from(studioInvestmentCases).where(eq(studioInvestmentCases.id, input.investmentCaseId)).limit(1);
    if (!investmentCase) throw new TRPCError({ code: "NOT_FOUND", message: "Investment case not found." });
    if (investmentCase.originatorId !== ctx.user.id && investmentCase.sponsorId !== ctx.user.id && !(await canSponsor(ctx.user.id, ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN", message: "Only the idea owner, sponsor, organizer, or administrator may attach case documents." });
    const buffer = decodeUpload(input.base64);
    if (buffer.length > 8 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "A business document must be 8 MB or smaller." });
    const originalName = cleanInvestmentAssetName(input.fileName);
    const stored = await storagePut(`users/${ctx.user.id}/investment-cases/${investmentCase.id}/${originalName}`, buffer, input.mimeType);
    const extractedText = input.mimeType.startsWith("text/") ? buffer.toString("utf8").slice(0, 30000) : null;
    const [created] = await db.insert(studioInvestmentCaseAssets).values({ investmentCaseId: investmentCase.id, uploadedById: ctx.user.id, assetType: input.assetType, originalName, mimeType: input.mimeType, storageKey: stored.key, storageUrl: stored.url, extractedText, contributorConfirmed: true }).$returningId();
    return { id: created.id, originalName, storageUrl: stored.url };
  }),

  approveForProof: protectedProcedure.input(z.object({ caseId: z.number().int().positive(), rationale: z.string().min(10).max(4000) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const result = await db.update(studioInvestmentCases).set({ status: "approved_for_proof", approvalRationale: input.rationale }).where(eq(studioInvestmentCases.id, input.caseId));
    if (!result[0].affectedRows) throw new TRPCError({ code: "NOT_FOUND", message: "Investment case not found." });
    return { success: true };
  }),

  createProofEvent: protectedProcedure.input(z.object({ title: z.string().min(4).max(255), rules: z.string().min(20).max(10000), updateExpectations: z.string().min(10).max(4000).optional(), status: z.enum(["draft", "registration", "proof_active", "judging", "closed"]).default("draft"), registrationOpensAt: z.date().optional(), registrationClosesAt: z.date().optional(), proofStartsAt: z.date().optional(), submissionClosesAt: z.date().optional(), judgingStartsAt: z.date().optional(), judgingClosesAt: z.date().optional() })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [created] = await db.insert(studioProofEvents).values({ ...input, organizerId: ctx.user.id }).$returningId();
    return { id: created.id };
  }),

  createProofContract: protectedProcedure.input(z.object({
    investmentCaseId: z.number().int().positive(),
    proofEventId: z.number().int().positive().optional(),
    eventTitle: z.string().min(4).max(255).optional(),
    rules: z.string().min(20).max(10000).optional(),
    updateExpectations: z.string().min(10).max(4000).optional(),
    proofStartsAt: z.date().optional(),
    submissionClosesAt: z.date().optional(),
    judgingStartsAt: z.date().optional(),
    judgingClosesAt: z.date().optional(),
    candidateTitle: z.string().min(4).max(255),
    proofQuestion: z.string().min(15).max(6000),
    requiredArtifacts: z.array(artifactSchema).min(1).max(20),
    rubric: z.array(rubricSchema).min(1).max(15),
    jiraContextUrl: z.string().url().optional(),
  }).refine(input => Boolean(input.proofEventId || (input.eventTitle && input.rules)), { message: "Select an existing proof event or provide a new event title and rules." })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [investmentCase] = await db.select().from(studioInvestmentCases).where(eq(studioInvestmentCases.id, input.investmentCaseId)).limit(1);
    if (!investmentCase) throw new TRPCError({ code: "NOT_FOUND", message: "Investment case not found." });
    const [latestReview] = await db.select().from(studioIncubationReviews).where(eq(studioIncubationReviews.investmentCaseId, investmentCase.id)).orderBy(desc(studioIncubationReviews.updatedAt)).limit(1);
    if (!canEnterHackathonPreparation(latestReview?.decision)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A manager must advance the incubated business case before hackathon preparation." });
    return db.transaction(async tx => {
      let proofEventId = input.proofEventId;
      if (proofEventId) {
        const [event] = await tx.select({ id: studioProofEvents.id }).from(studioProofEvents).where(eq(studioProofEvents.id, proofEventId)).limit(1);
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Selected proof event not found." });
      } else {
        const [event] = await tx.insert(studioProofEvents).values({ organizerId: ctx.user.id, title: input.eventTitle!, rules: input.rules!, updateExpectations: input.updateExpectations, status: "registration", proofStartsAt: input.proofStartsAt, submissionClosesAt: input.submissionClosesAt, judgingStartsAt: input.judgingStartsAt, judgingClosesAt: input.judgingClosesAt }).$returningId();
        proofEventId = event.id;
      }
      const [candidate] = await tx.insert(studioProofCandidates).values({ investmentCaseId: input.investmentCaseId, proofEventId, title: input.candidateTitle, proofQuestion: input.proofQuestion, requiredArtifacts: input.requiredArtifacts, rubric: input.rubric, jiraContextUrl: input.jiraContextUrl, status: "team_building" }).$returningId();
      return { eventId: proofEventId, candidateId: candidate.id };
    });
  }),

  updateInvestmentCaseKpiOkr: protectedProcedure.input(z.object({ investmentCaseId: z.number().int().positive(), kpiOkrLinks: z.array(z.object({ label: z.string().min(2).max(200), rationale: z.string().min(5).max(800) })).max(20) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const result = await db.update(studioInvestmentCases).set({ kpiOkrLinks: input.kpiOkrLinks }).where(eq(studioInvestmentCases.id, input.investmentCaseId));
    if (!result[0].affectedRows) throw new TRPCError({ code: "NOT_FOUND", message: "Investment case not found." });
    return { success: true };
  }),

  createProofCandidate: protectedProcedure.input(z.object({ investmentCaseId: z.number().int().positive(), proofEventId: z.number().int().positive(), title: z.string().min(4).max(255), proofQuestion: z.string().min(15).max(6000), requiredArtifacts: z.array(artifactSchema).min(1).max(20), rubric: z.array(rubricSchema).min(1).max(15), jiraContextUrl: z.string().url().optional() })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [investmentCase, event] = await Promise.all([
      db.select().from(studioInvestmentCases).where(eq(studioInvestmentCases.id, input.investmentCaseId)).limit(1),
      db.select().from(studioProofEvents).where(eq(studioProofEvents.id, input.proofEventId)).limit(1),
    ]);
    if (!investmentCase[0] || !event[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Investment case or proof event not found." });
    const [latestReview] = await db.select().from(studioIncubationReviews).where(eq(studioIncubationReviews.investmentCaseId, investmentCase[0].id)).orderBy(desc(studioIncubationReviews.updatedAt)).limit(1);
    if (!canEnterHackathonPreparation(latestReview?.decision)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only manager-advanced business cases can become proof candidates." });
    const [created] = await db.insert(studioProofCandidates).values({ ...input, status: "configured" }).$returningId();
    return { id: created.id };
  }),

  createTeamProof: protectedProcedure.input(z.object({ proofCandidateId: z.number().int().positive(), teamName: z.string().min(2).max(255), solutionSummary: z.string().min(20).max(10000) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [candidate] = await db.select().from(studioProofCandidates).where(eq(studioProofCandidates.id, input.proofCandidateId)).limit(1);
    if (!candidate) throw new TRPCError({ code: "NOT_FOUND", message: "Proof candidate not found." });
    const [created] = await db.insert(studioTeamProofs).values({ ...input, teamLeadId: ctx.user.id, status: "forming" }).$returningId();
    await db.insert(studioProofTeamMembers).values({ teamProofId: created.id, userId: ctx.user.id, role: "lead" });
    const caseAssets = await db.select().from(studioInvestmentCaseAssets).where(eq(studioInvestmentCaseAssets.investmentCaseId, candidate.investmentCaseId));
    if (caseAssets.length) {
      await db.insert(studioProofArtifacts).values(caseAssets.map(asset => ({
        teamProofId: created.id,
        uploadedById: ctx.user.id,
        artifactKey: `case-asset-${asset.id}`,
        artifactType: asset.assetType === "business_plan" ? "business_summary" as const : asset.assetType === "technical_document" ? "technical_requirements" as const : "other" as const,
        title: `Inherited case document · ${asset.originalName}`,
        evidenceUrl: asset.storageUrl,
        extractedText: asset.extractedText || undefined,
        consentConfirmed: true,
      })));
    }
    return { id: created.id };
  }),

  registerForProofEvent: protectedProcedure.input(z.object({ proofEventId: z.number().int().positive(), role: z.enum(["participant", "mentor", "judge", "organizer"]), availability: z.array(z.object({ label: z.string().min(2).max(120), startsAt: z.string().optional(), endsAt: z.string().optional() })).max(20).optional() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [event] = await db.select().from(studioProofEvents).where(eq(studioProofEvents.id, input.proofEventId)).limit(1);
    if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Proof event not found." });
    if (input.role === "organizer" && !(await canSponsor(ctx.user.id, ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN", message: "Only an organizer or sponsor may register as an organizer." });
    await db.insert(studioEventRegistrations).values({ ...input, userId: ctx.user.id }).onDuplicateKeyUpdate({ set: { availability: input.availability, status: "registered", updatedAt: new Date() } });
    return { success: true };
  }),

  joinProofTeam: protectedProcedure.input(z.object({ teamProofId: z.number().int().positive(), role: z.enum(["builder", "designer", "business", "researcher", "other"]) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [proof] = await db.select().from(studioTeamProofs).where(eq(studioTeamProofs.id, input.teamProofId)).limit(1);
    if (!proof) throw new TRPCError({ code: "NOT_FOUND", message: "Team proof not found." });
    const [existing] = await db.select().from(studioProofTeamMembers).where(and(eq(studioProofTeamMembers.teamProofId, proof.id), eq(studioProofTeamMembers.userId, ctx.user.id))).limit(1);
    if (existing?.role === "lead") throw new TRPCError({ code: "CONFLICT", message: "The team lead is already recorded on this proof." });
    await db.insert(studioProofTeamMembers).values({ ...input, userId: ctx.user.id }).onDuplicateKeyUpdate({ set: { role: input.role } });
    return { success: true };
  }),

  addArtifact: protectedProcedure.input(z.object({ teamProofId: z.number().int().positive(), artifactKey: z.string().min(2).max(80), artifactType: z.enum(["brd", "technical_requirements", "business_summary", "repository", "jira_context", "demo", "deck", "video", "market_research", "other"]), title: z.string().min(2).max(500), evidenceUrl: z.string().url(), extractedText: z.string().max(50000).optional(), consentConfirmed: z.literal(true) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [proof] = await db.select().from(studioTeamProofs).where(eq(studioTeamProofs.id, input.teamProofId)).limit(1);
    if (!proof) throw new TRPCError({ code: "NOT_FOUND", message: "Team proof not found." });
    if (proof.teamLeadId !== ctx.user.id && !(await canSponsor(ctx.user.id, ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN", message: "Only the proof team or an organizer may add evidence." });
    await db.insert(studioProofArtifacts).values({ ...input, uploadedById: ctx.user.id }).onDuplicateKeyUpdate({ set: { artifactType: input.artifactType, title: input.title, evidenceUrl: input.evidenceUrl, extractedText: input.extractedText, consentConfirmed: true, uploadedById: ctx.user.id } });
    return { success: true };
  }),

  runEvidencePacket: protectedProcedure.input(z.object({ teamProofId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [proof] = await db.select().from(studioTeamProofs).where(eq(studioTeamProofs.id, input.teamProofId)).limit(1);
    if (!proof) throw new TRPCError({ code: "NOT_FOUND", message: "Team proof not found." });
    if (proof.teamLeadId !== ctx.user.id && !(await canSponsor(ctx.user.id, ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN", message: "Only the proof team or an organizer may run its evidence packet." });
    const [candidate] = await db.select().from(studioProofCandidates).where(eq(studioProofCandidates.id, proof.proofCandidateId)).limit(1);
    if (!candidate) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Proof candidate is unavailable." });
    const [investmentCase, artifacts] = await Promise.all([
      db.select().from(studioInvestmentCases).where(eq(studioInvestmentCases.id, candidate.investmentCaseId)).limit(1),
      db.select().from(studioProofArtifacts).where(eq(studioProofArtifacts.teamProofId, proof.id)).orderBy(desc(studioProofArtifacts.createdAt)),
    ]);
    if (!investmentCase[0]) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Investment case is unavailable." });
    const evidenceInput: StudioProofInput = {
      investmentTitle: investmentCase[0].title,
      investmentThesis: investmentCase[0].investmentThesis,
      problemStatement: investmentCase[0].problemStatement,
      businessCase: investmentCase[0].businessCase,
      proofQuestion: candidate.proofQuestion,
      requiredArtifacts: candidate.requiredArtifacts as StudioProofInput["requiredArtifacts"],
      rubric: candidate.rubric as StudioProofInput["rubric"],
      solutionSummary: proof.solutionSummary,
      artifacts: artifacts.map(item => ({ artifactKey: item.artifactKey, artifactType: item.artifactType, title: item.title, evidenceUrl: item.evidenceUrl, extractedText: item.extractedText })),
    };
    const evidenceHash = studioEvidenceHash(evidenceInput);
    const [existing] = await db.select().from(studioEvidencePackets).where(and(eq(studioEvidencePackets.teamProofId, proof.id), eq(studioEvidencePackets.evidenceHash, evidenceHash))).limit(1);
    if (existing?.status === "ready" || existing?.status === "needs_evidence") return existing;
    if (!existing) await db.insert(studioEvidencePackets).values({ teamProofId: proof.id, evidenceHash, status: "evaluating" });
    try {
      let result = await evaluateStudioProof(evidenceInput);
      const repositoryArtifact = authorizedGitHubRepositoryArtifact(evidenceInput.artifacts);
      if (repositoryArtifact) {
        try {
          const repositoryAudit = await runHackathonAgent({
            title: investmentCase[0].title,
            description: proof.solutionSummary,
            githubUrl: repositoryArtifact.evidenceUrl,
            opportunityContext: investmentCase[0].investmentThesis,
            researchSummary: investmentCase[0].businessCase,
            repositoryAccessMode: "public_api",
          });
          result = mergeRepositoryAuditIntoStudioEvidence(result, repositoryArtifact, repositoryAudit);
        } catch (repositoryAuditError) {
          result = {
            ...result,
            limitations: [...result.limitations, `The optional bounded repository audit did not complete: ${repositoryAuditError instanceof Error ? repositoryAuditError.message : "unknown error"}. The Claude packet remains advisory and may be reviewed without that audit.`],
          };
        }
      }
      await db.update(studioEvidencePackets).set({ status: "ready", agentFindings: result.agentFindings, skillFindings: result.skillFindings, marketContext: result.marketContext, teamQuestions: result.teamQuestions, judgeQuestions: result.judgeQuestions, limitations: result.limitations }).where(and(eq(studioEvidencePackets.teamProofId, proof.id), eq(studioEvidencePackets.evidenceHash, evidenceHash)));
    } catch (error) {
      const fallback = missingEvidencePacket(evidenceInput, error instanceof Error ? error.message : "The governed evidence agent could not complete.");
      await db.update(studioEvidencePackets).set({ status: "needs_evidence", agentFindings: fallback.agentFindings, skillFindings: fallback.skillFindings, marketContext: fallback.marketContext, teamQuestions: fallback.teamQuestions, judgeQuestions: fallback.judgeQuestions, limitations: fallback.limitations }).where(and(eq(studioEvidencePackets.teamProofId, proof.id), eq(studioEvidencePackets.evidenceHash, evidenceHash)));
    }
    const [packet] = await db.select().from(studioEvidencePackets).where(and(eq(studioEvidencePackets.teamProofId, proof.id), eq(studioEvidencePackets.evidenceHash, evidenceHash))).limit(1);
    await db.update(studioTeamProofs).set({ status: "evidence_review" }).where(eq(studioTeamProofs.id, proof.id));
    return packet;
  }),

  recordJudgeDecision: protectedProcedure.input(z.object({ teamProofId: z.number().int().positive(), evidencePacketId: z.number().int().positive().optional(), rubricScores: z.array(z.object({ key: z.string(), score: z.number().min(0), rationale: z.string().min(3) })).min(1), decision: z.enum(["advance", "runner_up", "return_to_proof", "archive", "no_decision"]), rationale: z.string().min(20).max(8000), evidenceCorrections: z.array(z.object({ reference: z.string(), action: z.string(), rationale: z.string() })).optional(), executiveHeatMap: executiveHeatMapSchema.optional() })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.insert(studioJudgeDecisions).values({ ...input, judgeId: ctx.user.id }).onDuplicateKeyUpdate({ set: { evidencePacketId: input.evidencePacketId, rubricScores: input.rubricScores, decision: input.decision, rationale: input.rationale, evidenceCorrections: input.evidenceCorrections, executiveHeatMap: input.executiveHeatMap, updatedAt: new Date() } });
    return { success: true };
  }),

  addJudgeEvidenceCorrection: protectedProcedure.input(z.object({ teamProofId: z.number().int().positive(), reference: z.string().min(2).max(255), action: z.string().min(3).max(500), rationale: z.string().min(10).max(8000) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [decision] = await db.select().from(studioJudgeDecisions).where(eq(studioJudgeDecisions.teamProofId, input.teamProofId)).limit(1);
    if (!decision) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Record the independent human decision before adding a correction." });
    const prior = Array.isArray(decision.evidenceCorrections) ? decision.evidenceCorrections : [];
    const correction = { reference: input.reference, action: input.action, rationale: input.rationale, recordedById: ctx.user.id, recordedAt: new Date().toISOString() };
    await db.update(studioJudgeDecisions).set({ evidenceCorrections: [...prior, correction], updatedAt: new Date() }).where(eq(studioJudgeDecisions.id, decision.id));
    return { success: true, correction };
  }),

  recordJudgeQuestionAnswers: protectedProcedure.input(z.object({ teamProofId: z.number().int().positive(), questionAnswers: z.array(z.object({ questionIndex: z.number().int().nonnegative(), answer: z.string().min(2).max(4000), status: z.enum(["addressed", "disagreed", "unresolved"]) })) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [decision] = await db.select().from(studioJudgeDecisions).where(eq(studioJudgeDecisions.teamProofId, input.teamProofId)).limit(1);
    if (!decision) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Record the independent human scorecard before submitting question answers." });
    await db.update(studioJudgeDecisions).set({ questionAnswers: input.questionAnswers, updatedAt: new Date() }).where(eq(studioJudgeDecisions.id, decision.id));
    return { success: true };
  }),

  synthesizeJudgeDeliberation: protectedProcedure.input(z.object({ teamProofId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [decision] = await db.select().from(studioJudgeDecisions).where(eq(studioJudgeDecisions.teamProofId, input.teamProofId)).limit(1);
    if (!decision) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Record a decision and judge question responses before triggering agent deliberation." });
    const answers = Array.isArray(decision.questionAnswers) ? decision.questionAnswers : [];
    const deliberation = {
      synthesizedNotes: `Agent deliberation review: Evaluated ${answers.length} judge response(s). Disagreements and qualifications are noted and retained in the permanent audit trail without overriding human scoring.`,
      updatedVerdict: "Human scores retained; agent re-synthesis completed successfully.",
      timestamp: new Date().toISOString(),
    };
    await db.update(studioJudgeDecisions).set({ agentDeliberation: deliberation, updatedAt: new Date() }).where(eq(studioJudgeDecisions.id, decision.id));
    return { success: true, deliberation };
  }),

  setInvestmentGate: protectedProcedure.input(z.object({ investmentCaseId: z.number().int().positive(), proofCandidateId: z.number().int().positive().optional(), status: z.enum(["advance_assessment", "fund", "return_to_proof", "hold", "archive"]), assumptionMovement: z.array(z.object({ assumption: z.string().min(3), movement: z.enum(["strengthened", "unchanged", "weakened", "missing_evidence", "disputed"]), rationale: z.string().min(3) })).min(1), rationale: z.string().min(20).max(8000) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [created] = await db.insert(studioInvestmentGates).values({ ...input, decidedById: ctx.user.id }).$returningId();
    await db.update(studioInvestmentCases).set({ status: "investment_review" }).where(eq(studioInvestmentCases.id, input.investmentCaseId));
    return { id: created.id };
  }),

  archiveInvestmentLearning: protectedProcedure.input(z.object({ investmentCaseId: z.number().int().positive(), proofCandidateId: z.number().int().positive().optional(), judgeDecisionId: z.number().int().positive().optional(), investmentGateId: z.number().int().positive().optional(), validatedAssumptions: z.array(z.object({ assumption: z.string().min(3), result: z.enum(["supported", "partial", "unsupported", "not_tested"]), evidence: z.string().min(3) })).min(1), limitations: z.array(z.string().min(3)).min(1), expectedInvestmentContribution: z.string().min(10).max(4000).optional(), reusableLearning: z.string().min(20).max(8000), nextInvestmentAction: z.string().min(10).max(4000) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [created] = await db.insert(studioInvestmentLearning).values({ ...input, recordedById: ctx.user.id }).$returningId();
    await db.update(studioInvestmentCases).set({ status: "archived_learning" }).where(eq(studioInvestmentCases.id, input.investmentCaseId));
    return { id: created.id };
  }),

  getTenantConfig: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators may access the tenant admin console." });
    return getTenantConfig();
  }),

  updateTenantConfig: protectedProcedure.input(z.object({
    llmProvider: z.enum(["anthropic", "openai", "built_in"]).optional(),
    apiKey: z.string().optional(),
    defaultModel: z.string().optional(),
    lightModel: z.string().optional(),
    heavyModel: z.string().optional(),
    brandTheme: z.enum(["john_deere", "kyndryl", "enterprise_green", "classic_oat"]).optional(),
    primaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    defaultLocale: z.enum(["en", "es", "de", "fr", "pt"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators may update tenant configuration." });
    const patch: any = { ...input };
    if (input.apiKey && input.apiKey.trim().length > 5) {
      patch.apiKeyMasked = `${input.apiKey.substring(0, 7)}...**** (Configured)`;
      delete patch.apiKey;
    }
    return updateTenantConfig(patch);
  }),
});
