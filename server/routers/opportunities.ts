import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import mammoth from "mammoth";
import { z } from "zod";
import {
  consentRecords,
  hackathons,
  indicatorSnapshots,
  opportunities,
  opportunityCommunityNotes,
  opportunityEndorsements,
  opportunityAssets,
  researchRuns,
  researchSources,
  rubricCriteria,
  scorecards,
  scoreItems,
  specialistEvaluations,
  submissionAudits,
  projects,
  userProfiles,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { isSupportedAudioMimeType, normalizeAudioMimeType, transcribeAudio } from "../_core/voiceTranscription";
import { protectedProcedure, router } from "../_core/trpc";
import { storageGetSignedUrl, storagePut } from "../storage";
import { conductOpportunityResearch, createOpportunityBrief, extractPdfEvidence } from "../services/opportunityAi";
import { averageFinalizedHumanScores } from "../services/scoreAggregation";
import { deriveProofReadiness } from "../services/proofReadiness";

const assetType = z.enum(["voice", "document", "image", "deck", "video", "other"]);
const uploadSchema = z.object({
  opportunityId: z.number().int().positive(),
  assetType,
  fileName: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(150),
  base64: z.string().min(1),
  consent: z.boolean(),
});

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The data service is not available." });
  return db;
}

async function ownedOpportunity(opportunityId: number, userId: number, allowAdmin: boolean, role: string) {
  const db = await dbOrThrow();
  const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, opportunityId)).limit(1);
  if (!opportunity || (!allowAdmin || role !== "admin") && opportunity.ownerId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found or access is not permitted." });
  }
  return { db, opportunity };
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

function fileBuffer(base64: string) {
  const cleaned = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  return Buffer.from(cleaned, "base64");
}

async function isSponsorOrAdmin(userId: number, role: string) {
  if (role === "admin") return true;
  const db = await dbOrThrow();
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return profile?.persona === "sponsor";
}

export const opportunitiesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    const where = ctx.user.role === "admin" ? undefined : eq(opportunities.ownerId, ctx.user.id);
    return where
      ? db.select().from(opportunities).where(where).orderBy(desc(opportunities.updatedAt))
      : db.select().from(opportunities).orderBy(desc(opportunities.updatedAt));
  }),

  detail: protectedProcedure.input(z.object({ opportunityId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, true, ctx.user.role);
    const [assets, runs, indicators, endorsements, communityNotes, linkedEvents] = await Promise.all([
      db.select().from(opportunityAssets).where(eq(opportunityAssets.opportunityId, opportunity.id)).orderBy(desc(opportunityAssets.createdAt)),
      db.select().from(researchRuns).where(eq(researchRuns.opportunityId, opportunity.id)).orderBy(desc(researchRuns.createdAt)),
      db.select().from(indicatorSnapshots).where(eq(indicatorSnapshots.opportunityId, opportunity.id)).orderBy(desc(indicatorSnapshots.createdAt)),
      db.select().from(opportunityEndorsements).where(eq(opportunityEndorsements.opportunityId, opportunity.id)),
      db.select().from(opportunityCommunityNotes).where(eq(opportunityCommunityNotes.opportunityId, opportunity.id)).orderBy(desc(opportunityCommunityNotes.createdAt)),
      db.select().from(hackathons).where(eq(hackathons.opportunityId, opportunity.id)).orderBy(desc(hackathons.createdAt)),
    ]);
    const linkedProjects = linkedEvents.length
      ? await db.select().from(projects).where(inArray(projects.hackathonId, linkedEvents.map(event => event.id))).orderBy(desc(projects.updatedAt))
      : [];
    const linkedEvent = linkedEvents[0] || null;
    const linkedProject = linkedEvent ? linkedProjects.find(project => project.hackathonId === linkedEvent.id) || null : null;
    const sourceRows = runs.length
      ? await db.select().from(researchSources).where(eq(researchSources.researchRunId, runs[0].id))
      : [];
    return {
      opportunity,
      assets,
      research: runs[0] ? { ...runs[0], sources: sourceRows } : null,
      proofHandoff: linkedEvent ? {
        hackathonId: linkedEvent.id,
        eventTitle: linkedEvent.title,
        eventStatus: linkedEvent.status,
        projectId: linkedProject?.id || null,
        projectTitle: linkedProject?.title || null,
        projectSubmittedAt: linkedProject?.submittedAt || null,
      } : null,
      indicators,
      community: {
        endorsementCount: endorsements.length,
        viewerEndorsed: endorsements.some(endorsement => endorsement.userId === ctx.user.id),
        notes: communityNotes.map(note => ({ id: note.id, category: note.category, body: note.body, evidenceUrl: note.evidenceUrl, createdAt: note.createdAt })),
      },
    };
  }),

  communityBoard: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    const [rows, endorsements, notes] = await Promise.all([
      db.select().from(opportunities).orderBy(desc(opportunities.updatedAt)),
      db.select().from(opportunityEndorsements),
      db.select().from(opportunityCommunityNotes).orderBy(desc(opportunityCommunityNotes.createdAt)),
    ]);
    return rows
      .filter(opportunity => opportunity.status !== "rejected" && opportunity.status !== "archived" && opportunity.stage !== "closed")
      .map(opportunity => {
        const opportunityEndorsements = endorsements.filter(item => item.opportunityId === opportunity.id);
        const opportunityNotes = notes.filter(item => item.opportunityId === opportunity.id).slice(0, 3);
        return {
          id: opportunity.id,
          title: opportunity.title,
          problemStatement: opportunity.problemStatement,
          domain: opportunity.domain,
          targetUser: opportunity.targetUser,
          stage: opportunity.stage,
          endorsementCount: opportunityEndorsements.length,
          viewerEndorsed: opportunityEndorsements.some(item => item.userId === ctx.user.id),
          noteCount: notes.filter(item => item.opportunityId === opportunity.id).length,
          notes: opportunityNotes.map(note => ({ id: note.id, category: note.category, body: note.body, evidenceUrl: note.evidenceUrl, createdAt: note.createdAt })),
        };
      });
  }),

  toggleEndorsement: protectedProcedure.input(z.object({ opportunityId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, input.opportunityId)).limit(1);
    if (!opportunity || opportunity.status === "rejected" || opportunity.status === "archived" || opportunity.stage === "closed") throw new TRPCError({ code: "NOT_FOUND", message: "This opportunity is not open for early signals." });
    const [existing] = await db.select().from(opportunityEndorsements).where(and(eq(opportunityEndorsements.opportunityId, input.opportunityId), eq(opportunityEndorsements.userId, ctx.user.id))).limit(1);
    if (existing) {
      await db.delete(opportunityEndorsements).where(eq(opportunityEndorsements.id, existing.id));
      return { endorsed: false };
    }
    await db.insert(opportunityEndorsements).values({ opportunityId: input.opportunityId, userId: ctx.user.id });
    return { endorsed: true };
  }),

  addCommunityNote: protectedProcedure.input(z.object({
    opportunityId: z.number().int().positive(),
    category: z.enum(["customer_signal", "market_signal", "operating_signal", "evidence_offer", "question", "other"]),
    body: z.string().min(10).max(1200),
    evidenceUrl: z.string().url().max(1000).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, input.opportunityId)).limit(1);
    if (!opportunity || opportunity.status === "rejected" || opportunity.status === "archived" || opportunity.stage === "closed") throw new TRPCError({ code: "NOT_FOUND", message: "This opportunity is not open for early signals." });
    const created = await db.insert(opportunityCommunityNotes).values({
      opportunityId: input.opportunityId,
      authorId: ctx.user.id,
      category: input.category,
      body: input.body,
      evidenceUrl: input.evidenceUrl,
    });
    return { noteId: Number(created[0].insertId) };
  }),

  proofReadiness: protectedProcedure.input(z.object({ opportunityId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, true, ctx.user.role);
    const events = await db.select().from(hackathons).where(eq(hackathons.opportunityId, opportunity.id));
    if (!events.length) return { ...deriveProofReadiness({ events: 0, projects: 0, completedAudits: 0, finalizedScorecards: 0, finalizedHumanScore: null }), finalizedHumanScore: null, finalizedScorecards: 0, completedAudits: 0, projects: 0 };
    const eventIds = events.map(event => event.id);
    const eventProjects = await db.select().from(projects).where(inArray(projects.hackathonId, eventIds));
    if (!eventProjects.length) return { ...deriveProofReadiness({ events: events.length, projects: 0, completedAudits: 0, finalizedScorecards: 0, finalizedHumanScore: null }), finalizedHumanScore: null, finalizedScorecards: 0, completedAudits: 0, projects: 0 };
    const projectIds = eventProjects.map(project => project.id);
    const [finalCards, items, audits, criteria] = await Promise.all([
      db.select().from(scorecards).where(and(inArray(scorecards.projectId, projectIds), eq(scorecards.finalized, true))),
      db.select().from(scoreItems),
      db.select().from(submissionAudits).where(and(inArray(submissionAudits.projectId, projectIds), eq(submissionAudits.status, "complete"))),
      db.select().from(rubricCriteria).where(inArray(rubricCriteria.hackathonId, eventIds)),
    ]);
    const humanScore = averageFinalizedHumanScores(finalCards, items.filter(item => finalCards.some(card => card.id === item.scorecardId)), criteria);
    return { ...deriveProofReadiness({ events: events.length, projects: eventProjects.length, completedAudits: audits.length, finalizedScorecards: finalCards.length, finalizedHumanScore: humanScore }), finalizedHumanScore: humanScore, finalizedScorecards: finalCards.length, completedAudits: audits.length, projects: eventProjects.length };
  }),

  specialistReviewPlan: protectedProcedure.input(z.object({ opportunityId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, true, ctx.user.role);
    const events = await db.select().from(hackathons).where(eq(hackathons.opportunityId, opportunity.id)).orderBy(desc(hackathons.updatedAt));
    if (!events.length) return { project: null, evaluations: [] as Array<{ skill: string; status: string }> };
    const eventIds = events.map(event => event.id);
    const eventProjects = await db.select().from(projects).where(inArray(projects.hackathonId, eventIds)).orderBy(desc(projects.updatedAt));
    const project = eventProjects[0];
    if (!project) return { project: null, evaluations: [] as Array<{ skill: string; status: string }> };
    const evaluations = await db.select({ skill: specialistEvaluations.skill, status: specialistEvaluations.status })
      .from(specialistEvaluations)
      .where(eq(specialistEvaluations.projectId, project.id));
    return { project: { id: project.id, title: project.title, submittedAt: project.submittedAt }, evaluations };
  }),

  create: protectedProcedure.input(z.object({
    title: z.string().min(5).max(255),
    problemStatement: z.string().min(20).max(8000),
    targetUser: z.string().max(255).optional(),
    domain: z.string().max(160).optional(),
    narrative: z.string().max(12000).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const result = await db.insert(opportunities).values({
      ownerId: ctx.user.id,
      title: input.title,
      problemStatement: input.problemStatement,
      opportunityNarrative: input.narrative,
      targetUser: input.targetUser,
      domain: input.domain,
    });
    const opportunityId = Number(result[0].insertId);
    return { opportunityId };
  }),

  uploadAsset: protectedProcedure.input(uploadSchema).mutation(async ({ ctx, input }) => {
    if (!input.consent) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Explicit consent is required before processing a voice or document asset." });
    }
    const supportedDocumentTypes = new Set([
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    if (input.assetType === "document" && !supportedDocumentTypes.has(input.mimeType)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Supported opportunity documents are plain text, Markdown, CSV, PDF, and DOCX files." });
    }
    const normalizedMimeType = input.assetType === "voice" ? normalizeAudioMimeType(input.mimeType) : input.mimeType;
    if (input.assetType === "voice" && !isSupportedAudioMimeType(normalizedMimeType)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Supported voice formats are WebM, MP3, WAV, OGG, and M4A. Please choose one of these formats and try again." });
    }
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, false, ctx.user.role);
    const buffer = fileBuffer(input.base64);
    const maximum = input.assetType === "voice" ? 16 * 1024 * 1024 : 8 * 1024 * 1024;
    if (buffer.length > maximum) {
      throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: `This ${input.assetType} exceeds the supported size limit.` });
    }
    const keyPrefix = `users/${ctx.user.id}/opportunities/${opportunity.id}`;
    const stored = await storagePut(`${keyPrefix}/${cleanFileName(input.fileName)}`, buffer, normalizedMimeType);
    const assetScope = input.assetType === "voice" ? "voice_transcription" : "document_processing";
    await db.insert(consentRecords).values({ userId: ctx.user.id, scope: assetScope, accepted: true, policyVersion: "v1" });
    const inserted = await db.insert(opportunityAssets).values({
      opportunityId: opportunity.id,
      uploadedById: ctx.user.id,
      assetType: input.assetType,
      storageKey: stored.key,
      storageUrl: stored.url,
      originalName: cleanFileName(input.fileName),
      mimeType: normalizedMimeType,
      byteSize: buffer.length,
      contributorConfirmed: false,
    });
    const assetId = Number(inserted[0].insertId);
    let transcript: string | undefined;
    let extraction: Record<string, unknown> | undefined;

    if (input.assetType === "voice") {
      const signedUrl = await storageGetSignedUrl(stored.key);
      const result = await transcribeAudio({ audioUrl: signedUrl, language: "en", prompt: "Transcribe an opportunity explanation for an innovation portfolio." });
      if ("error" in result) {
        console.error("Voice transcription failed", { opportunityId: opportunity.id, assetId, code: result.code, details: result.details });
        throw new TRPCError({ code: "BAD_REQUEST", message: result.error, cause: result.details });
      }
      transcript = result.text;
      extraction = { language: result.language, duration: result.duration, segments: result.segments };
    } else if (input.assetType === "document" && input.mimeType.startsWith("text/")) {
      extraction = { text: buffer.toString("utf8").slice(0, 30_000), method: "direct_text" };
    } else if (input.assetType === "document" && (input.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || input.fileName.toLowerCase().endsWith(".docx"))) {
      const result = await mammoth.extractRawText({ buffer });
      extraction = { text: result.value.slice(0, 30_000), warnings: result.messages, method: "docx_raw_text" };
    } else if (input.assetType === "document" && input.mimeType === "application/pdf") {
      const signedUrl = await storageGetSignedUrl(stored.key);
      extraction = { ...(await extractPdfEvidence(signedUrl)), method: "ai_pdf_extraction" };
    } else if (input.assetType === "document") {
      extraction = { status: "stored_for_review", note: "This file type is retained as source evidence but needs a compatible extraction pathway before synthesis." };
    }

    if (transcript || extraction) {
      await db.update(opportunityAssets).set({ transcript, extraction }).where(eq(opportunityAssets.id, assetId));
    }
    return { assetId, transcript, extraction, storageUrl: stored.url };
  }),

  confirmAsset: protectedProcedure.input(z.object({ assetId: z.number().int().positive(), opportunityId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const { db } = await ownedOpportunity(input.opportunityId, ctx.user.id, false, ctx.user.role);
    await db.update(opportunityAssets).set({ contributorConfirmed: true }).where(and(eq(opportunityAssets.id, input.assetId), eq(opportunityAssets.opportunityId, input.opportunityId)));
    return { success: true };
  }),

  generateBrief: protectedProcedure.input(z.object({ opportunityId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, false, ctx.user.role);
    const assets = await db.select().from(opportunityAssets).where(eq(opportunityAssets.opportunityId, opportunity.id));
    const brief = await createOpportunityBrief({ ...opportunity, assets });
    await db.update(opportunities).set({
      title: brief.title.slice(0, 255),
      aiBrief: brief,
      evidenceGaps: brief.evidenceGaps,
      stage: "shaping",
    }).where(eq(opportunities.id, opportunity.id));
    return brief;
  }),

  research: protectedProcedure.input(z.object({ opportunityId: z.number().int().positive(), consent: z.boolean() })).mutation(async ({ ctx, input }) => {
    if (!input.consent) throw new TRPCError({ code: "BAD_REQUEST", message: "Confirm the approved external-research scope before starting a research run." });
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, true, ctx.user.role);
    await db.insert(consentRecords).values({ userId: ctx.user.id, scope: "external_research", accepted: true, policyVersion: "v1" });
    const created = await db.insert(researchRuns).values({ opportunityId: opportunity.id, requestedById: ctx.user.id, scope: "Public web research for comparable offerings and relevant precedents.", status: "running" });
    const researchRunId = Number(created[0].insertId);
    try {
      const assets = await db.select().from(opportunityAssets).where(eq(opportunityAssets.opportunityId, opportunity.id));
      const research = await conductOpportunityResearch({ ...opportunity, assets });
      await db.update(researchRuns).set({ status: "needs_review", summary: research.summary, limitations: research.limitations, dossier: research.dossier, completedAt: new Date() }).where(eq(researchRuns.id, researchRunId));
      if (research.sources.length) {
        await db.insert(researchSources).values(research.sources.map(source => ({
          researchRunId,
          url: source.url,
          title: source.title.slice(0, 500),
          excerpt: source.excerpt,
          relevance: source.relevance,
          evidenceCategory: source.evidenceCategory,
          similarityAssessment: source.assessment,
        })));
      }
      await db.update(opportunities).set({ stage: "evidence" }).where(eq(opportunities.id, opportunity.id));
      return { researchRunId, ...research };
    } catch (error) {
      await db.update(researchRuns).set({ status: "failed", completedAt: new Date() }).where(eq(researchRuns.id, researchRunId));
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Research could not be completed." });
    }
  }),

  setSelection: protectedProcedure.input(z.object({ opportunityId: z.number().int().positive(), status: z.enum(["selected", "deferred", "rejected"]) })).mutation(async ({ ctx, input }) => {
    if (!(await isSponsorOrAdmin(ctx.user.id, ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN", message: "Only an authorized sponsor or administrator can record the selection decision." });
    const db = await dbOrThrow();
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, input.opportunityId)).limit(1);
    if (!opportunity) throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found." });
    const selected = input.status === "selected";
    await db.update(opportunities).set({
      status: input.status,
      stage: selected ? "selected" : opportunity.stage,
      selectedAt: selected ? new Date() : null,
    }).where(eq(opportunities.id, opportunity.id));
    return { success: true };
  }),

  saveValueCase: protectedProcedure.input(z.object({
    opportunityId: z.number().int().positive(),
    initialValueLow: z.number().min(0).max(1_000_000_000).optional(),
    initialValueHigh: z.number().min(0).max(1_000_000_000).optional(),
    valueCurrency: z.string().min(3).max(8),
    costToProve: z.number().min(0).max(1_000_000_000).optional(),
    timeToValueMonths: z.number().int().min(0).max(240).optional(),
    valueCaseNarrative: z.string().max(6000).optional(),
    valueDrivers: z.array(z.string().min(2).max(240)).max(12),
    economicAssumptions: z.array(z.string().min(2).max(500)).max(16),
    investmentGate: z.enum(["shape_value_case", "research", "proof_sprint", "hold", "advance"]),
    investmentGateRationale: z.string().max(4000).optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!(await isSponsorOrAdmin(ctx.user.id, ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN", message: "Only an authorized sponsor or administrator can set the economic case and investment gate." });
    if (input.initialValueLow !== undefined && input.initialValueHigh !== undefined && input.initialValueLow > input.initialValueHigh) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "The conservative value range cannot exceed the upside range." });
    }
    const db = await dbOrThrow();
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, input.opportunityId)).limit(1);
    if (!opportunity) throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found." });
    await db.update(opportunities).set({
      initialValueLow: input.initialValueLow === undefined ? null : String(input.initialValueLow),
      initialValueHigh: input.initialValueHigh === undefined ? null : String(input.initialValueHigh),
      valueCurrency: input.valueCurrency.toUpperCase(),
      costToProve: input.costToProve === undefined ? null : String(input.costToProve),
      timeToValueMonths: input.timeToValueMonths ?? null,
      valueCaseNarrative: input.valueCaseNarrative || null,
      valueDrivers: input.valueDrivers,
      economicAssumptions: input.economicAssumptions,
      investmentGate: input.investmentGate,
      investmentGateRationale: input.investmentGateRationale || null,
    }).where(eq(opportunities.id, opportunity.id));
    const [persistedOpportunity] = await db.select().from(opportunities).where(eq(opportunities.id, opportunity.id)).limit(1);
    if (!persistedOpportunity) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The saved economic case could not be read back." });
    return { success: true, opportunity: persistedOpportunity };
  }),

  recordIndicator: protectedProcedure.input(z.object({
    opportunityId: z.number().int().positive(),
    category: z.enum(["customer_value", "operating_value", "evidence_confidence", "technical_execution", "claim_integrity", "originality", "delivery_fit"]),
    label: z.string().min(3).max(255),
    value: z.number(),
    unit: z.string().min(1).max(80),
    evidence: z.string().min(10).max(5000),
  })).mutation(async ({ ctx, input }) => {
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, true, ctx.user.role);
    await db.insert(indicatorSnapshots).values({ ...input, opportunityId: opportunity.id, value: String(input.value), createdById: ctx.user.id });
    if (input.category === "evidence_confidence") {
      await db.update(opportunities).set({ confidence: Math.max(0, Math.min(100, Math.round(input.value))) }).where(eq(opportunities.id, opportunity.id));
    }
    return { success: true };
  }),
});
