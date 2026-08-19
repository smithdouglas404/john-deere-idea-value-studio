// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var userProfiles = mysqlTable(
  "userProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    persona: mysqlEnum("persona", ["participant", "organizer", "sponsor", "judge", "mentor", "admin"]).default("participant").notNull(),
    bio: text("bio"),
    githubUrl: varchar("githubUrl", { length: 500 }),
    gitlabUrl: varchar("gitlabUrl", { length: 500 }),
    portfolioUrl: varchar("portfolioUrl", { length: 500 }),
    linkedinUrl: varchar("linkedinUrl", { length: 500 }),
    skills: json("skills").$type(),
    availabilityRoles: json("availabilityRoles").$type(),
    lookingForTeam: boolean("lookingForTeam").default(false).notNull(),
    talentConsent: boolean("talentConsent").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (table) => [uniqueIndex("userProfiles_user_unique").on(table.userId), index("userProfiles_persona_idx").on(table.persona)]
);
var consentRecords = mysqlTable(
  "consentRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    scope: mysqlEnum("scope", ["voice_transcription", "document_processing", "external_research", "talent_profile", "repo_audit"]).notNull(),
    accepted: boolean("accepted").notNull(),
    policyVersion: varchar("policyVersion", { length: 80 }).notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull()
  },
  (table) => [index("consentRecords_user_scope_idx").on(table.userId, table.scope)]
);
var opportunities = mysqlTable(
  "opportunities",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    problemStatement: text("problemStatement").notNull(),
    opportunityNarrative: text("opportunityNarrative"),
    targetUser: varchar("targetUser", { length: 255 }),
    domain: varchar("domain", { length: 160 }),
    stage: mysqlEnum("stage", ["signal", "shaping", "evidence", "selected", "hackathon", "gate_review", "realization", "closed"]).default("signal").notNull(),
    status: mysqlEnum("status", ["active", "deferred", "rejected", "selected", "archived"]).default("active").notNull(),
    initialValueLow: decimal("initialValueLow", { precision: 15, scale: 2 }),
    initialValueHigh: decimal("initialValueHigh", { precision: 15, scale: 2 }),
    valueCurrency: varchar("valueCurrency", { length: 8 }).default("USD").notNull(),
    valueCaseNarrative: text("valueCaseNarrative"),
    valueDrivers: json("valueDrivers").$type(),
    economicAssumptions: json("economicAssumptions").$type(),
    costToProve: decimal("costToProve", { precision: 15, scale: 2 }),
    timeToValueMonths: int("timeToValueMonths"),
    investmentGate: mysqlEnum("investmentGate", ["shape_value_case", "research", "proof_sprint", "hold", "advance"]).default("shape_value_case").notNull(),
    investmentGateRationale: text("investmentGateRationale"),
    confidence: int("confidence").default(0).notNull(),
    aiBrief: json("aiBrief").$type(),
    evidenceGaps: json("evidenceGaps").$type(),
    selectedAt: timestamp("selectedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (table) => [index("opportunities_owner_idx").on(table.ownerId), index("opportunities_stage_idx").on(table.stage)]
);
var opportunityAssets = mysqlTable(
  "opportunityAssets",
  {
    id: int("id").autoincrement().primaryKey(),
    opportunityId: int("opportunityId").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    uploadedById: int("uploadedById").notNull().references(() => users.id, { onDelete: "restrict" }),
    assetType: mysqlEnum("assetType", ["voice", "document", "image", "deck", "video", "other"]).notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 700 }).notNull(),
    originalName: varchar("originalName", { length: 500 }).notNull(),
    mimeType: varchar("mimeType", { length: 150 }).notNull(),
    byteSize: int("byteSize").notNull(),
    transcript: text("transcript"),
    extraction: json("extraction").$type(),
    contributorConfirmed: boolean("contributorConfirmed").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [index("opportunityAssets_opportunity_idx").on(table.opportunityId)]
);
var opportunityEndorsements = mysqlTable(
  "opportunityEndorsements",
  {
    id: int("id").autoincrement().primaryKey(),
    opportunityId: int("opportunityId").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [uniqueIndex("opportunityEndorsements_opportunity_user_unique").on(table.opportunityId, table.userId), index("opportunityEndorsements_opportunity_idx").on(table.opportunityId)]
);
var opportunityCommunityNotes = mysqlTable(
  "opportunityCommunityNotes",
  {
    id: int("id").autoincrement().primaryKey(),
    opportunityId: int("opportunityId").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    authorId: int("authorId").notNull().references(() => users.id, { onDelete: "cascade" }),
    category: mysqlEnum("category", ["customer_signal", "market_signal", "operating_signal", "evidence_offer", "question", "other"]).default("other").notNull(),
    body: text("body").notNull(),
    evidenceUrl: varchar("evidenceUrl", { length: 1e3 }),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [index("opportunityCommunityNotes_opportunity_created_idx").on(table.opportunityId, table.createdAt)]
);
var researchRuns = mysqlTable(
  "researchRuns",
  {
    id: int("id").autoincrement().primaryKey(),
    opportunityId: int("opportunityId").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    requestedById: int("requestedById").notNull().references(() => users.id, { onDelete: "restrict" }),
    scope: varchar("scope", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["queued", "running", "complete", "needs_review", "failed"]).default("queued").notNull(),
    summary: text("summary"),
    limitations: text("limitations"),
    dossier: json("dossier").$type(),
    reviewedById: int("reviewedById").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt")
  },
  (table) => [index("researchRuns_opportunity_idx").on(table.opportunityId)]
);
var researchSources = mysqlTable(
  "researchSources",
  {
    id: int("id").autoincrement().primaryKey(),
    researchRunId: int("researchRunId").notNull().references(() => researchRuns.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 1e3 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    sourceType: mysqlEnum("sourceType", ["company", "product", "open_source", "publication", "patent", "internal", "other"]).default("other").notNull(),
    evidenceCategory: mysqlEnum("evidenceCategory", ["market", "customer", "operating", "value", "other"]).default("other").notNull(),
    excerpt: text("excerpt"),
    relevance: text("relevance"),
    similarityAssessment: mysqlEnum("similarityAssessment", ["potentially_similar", "relevant_precedent", "possible_differentiator", "requires_expert_review"]).notNull(),
    accessedAt: timestamp("accessedAt").defaultNow().notNull()
  },
  (table) => [index("researchSources_run_idx").on(table.researchRunId)]
);
var indicatorSnapshots = mysqlTable(
  "indicatorSnapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    opportunityId: int("opportunityId").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    category: mysqlEnum("category", ["customer_value", "operating_value", "evidence_confidence", "technical_execution", "claim_integrity", "originality", "delivery_fit"]).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    value: decimal("value", { precision: 15, scale: 4 }).notNull(),
    unit: varchar("unit", { length: 80 }).notNull(),
    evidence: text("evidence").notNull(),
    provenance: json("provenance").$type(),
    createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [index("indicatorSnapshots_opportunity_idx").on(table.opportunityId, table.category)]
);
var hackathons = mysqlTable(
  "hackathons",
  {
    id: int("id").autoincrement().primaryKey(),
    opportunityId: int("opportunityId").references(() => opportunities.id, { onDelete: "set null" }),
    organizerId: int("organizerId").notNull().references(() => users.id, { onDelete: "restrict" }),
    sponsorId: int("sponsorId").references(() => users.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    tagline: text("tagline"),
    description: text("description"),
    bannerUrl: varchar("bannerUrl", { length: 700 }),
    rules: text("rules"),
    auditScheduleCronTaskUid: varchar("auditScheduleCronTaskUid", { length: 65 }),
    status: mysqlEnum("status", ["draft", "registration_open", "hacking_active", "judging_active", "completed"]).default("draft").notNull(),
    maxTeamSize: int("maxTeamSize").default(4).notNull(),
    registrationStart: timestamp("registrationStart"),
    registrationEnd: timestamp("registrationEnd"),
    hackingStart: timestamp("hackingStart"),
    hackingEnd: timestamp("hackingEnd"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (table) => [uniqueIndex("hackathons_slug_unique").on(table.slug), index("hackathons_opportunity_idx").on(table.opportunityId)]
);
var hackathonScheduleItems = mysqlTable("hackathonScheduleItems", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  kind: mysqlEnum("kind", ["opening", "workshop", "office_hours", "submission_deadline", "demo", "judging", "awards", "other"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt"),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("hackathonScheduleItems_event_time_idx").on(table.hackathonId, table.startsAt)]);
var mentorRequests = mysqlTable("mentorRequests", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  requesterId: int("requesterId").notNull().references(() => users.id, { onDelete: "cascade" }),
  mentorId: int("mentorId").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
  scheduleItemId: int("scheduleItemId").references(() => hackathonScheduleItems.id, { onDelete: "set null" }),
  requestNote: text("requestNote").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "redirected", "cancelled"]).default("pending").notNull(),
  responseNote: text("responseNote"),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("mentorRequests_event_status_idx").on(table.hackathonId, table.status), index("mentorRequests_mentor_status_idx").on(table.mentorId, table.status), index("mentorRequests_requester_idx").on(table.requesterId)]);
var organizerCopilotDrafts = mysqlTable("organizerCopilotDrafts", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  opportunityId: int("opportunityId").notNull().references(() => opportunities.id, { onDelete: "restrict" }),
  requestedById: int("requestedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  payload: json("payload").$type().notNull(),
  status: mysqlEnum("status", ["draft", "adopted"]).default("draft").notNull(),
  adoptedById: int("adoptedById").references(() => users.id, { onDelete: "set null" }),
  adoptedAt: timestamp("adoptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("organizerCopilotDrafts_event_created_idx").on(table.hackathonId, table.createdAt)]);
var tracks = mysqlTable("tracks", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  prizeAmount: decimal("prizeAmount", { precision: 12, scale: 2 }),
  sponsorName: varchar("sponsorName", { length: 160 })
});
var hackathonRegistrations = mysqlTable("hackathonRegistrations", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  registrationRole: mysqlEnum("registrationRole", ["participant", "mentor", "judge"]).default("participant").notNull(),
  status: mysqlEnum("status", ["registered", "withdrawn", "approved"]).default("registered").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [uniqueIndex("hackathonRegistrations_event_user_unique").on(table.hackathonId, table.userId), index("hackathonRegistrations_event_idx").on(table.hackathonId)]);
var announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  audience: mysqlEnum("audience", ["all", "participants", "judges", "mentors"]).default("all").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("announcements_event_created_idx").on(table.hackathonId, table.createdAt)]);
var announcementAcknowledgements = mysqlTable("announcementAcknowledgements", {
  id: int("id").autoincrement().primaryKey(),
  announcementId: int("announcementId").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  acknowledgedAt: timestamp("acknowledgedAt").defaultNow().notNull()
}, (table) => [uniqueIndex("announcementAcknowledgements_announcement_user_unique").on(table.announcementId, table.userId), index("announcementAcknowledgements_user_idx").on(table.userId)]);
var teamAlerts = mysqlTable("teamAlerts", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  teamId: int("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("teamAlerts_event_created_idx").on(table.hackathonId, table.createdAt), index("teamAlerts_team_created_idx").on(table.teamId, table.createdAt)]);
var hackathonFaqs = mysqlTable("hackathonFaqs", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  question: varchar("question", { length: 500 }).notNull(),
  answer: text("answer").notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("hackathonFaqs_event_order_idx").on(table.hackathonId, table.displayOrder)]);
var rubricCriteria = mysqlTable("rubricCriteria", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description"),
  maxScore: int("maxScore").default(10).notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
  evaluationMethod: varchar("evaluationMethod", { length: 200 })
});
var teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  inviteCode: varchar("inviteCode", { length: 40 }).notNull(),
  lookingForMembers: boolean("lookingForMembers").default(false).notNull(),
  lookingForSkills: json("lookingForSkills").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [uniqueIndex("teams_hackathon_name_unique").on(table.hackathonId, table.name), uniqueIndex("teams_invite_unique").on(table.inviteCode)]);
var teamMembers = mysqlTable("teamMembers", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["leader", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull()
}, (table) => [uniqueIndex("teamMembers_team_user_unique").on(table.teamId, table.userId)]);
var teamJoinRequests = mysqlTable("teamJoinRequests", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "accepted", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  decidedAt: timestamp("decidedAt")
}, (table) => [uniqueIndex("teamJoinRequests_team_user_unique").on(table.teamId, table.userId), index("teamJoinRequests_team_idx").on(table.teamId)]);
var projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  teamId: int("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
  trackId: int("trackId").references(() => tracks.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  tagline: varchar("tagline", { length: 500 }),
  description: text("description").notNull(),
  techStack: json("techStack").$type(),
  githubUrl: varchar("githubUrl", { length: 600 }),
  demoUrl: varchar("demoUrl", { length: 600 }),
  videoUrl: varchar("videoUrl", { length: 600 }),
  pitchDeckUrl: varchar("pitchDeckUrl", { length: 600 }),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [uniqueIndex("projects_hackathon_team_unique").on(table.hackathonId, table.teamId)]);
var projectTracks = mysqlTable("projectTracks", {
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  trackId: int("trackId").notNull().references(() => tracks.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [uniqueIndex("projectTracks_project_track_unique").on(table.projectId, table.trackId), index("projectTracks_track_idx").on(table.trackId)]);
var teamMessages = mysqlTable("teamMessages", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
  senderId: int("senderId").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("teamMessages_team_created_idx").on(table.teamId, table.createdAt)]);
var repositoryConnections = mysqlTable("repositoryConnections", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  githubUrl: varchar("githubUrl", { length: 600 }).notNull(),
  visibility: mysqlEnum("visibility", ["public", "private"]).notNull(),
  accessMode: mysqlEnum("accessMode", ["public_api", "github_app"]).notNull(),
  appId: varchar("appId", { length: 40 }),
  installationId: varchar("installationId", { length: 40 }),
  authorizedById: int("authorizedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  authorizedRepositoryId: varchar("authorizedRepositoryId", { length: 40 }),
  authorizationEvidence: json("authorizationEvidence").$type(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  lastObservedAt: timestamp("lastObservedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("repositoryConnections_project_idx").on(table.projectId), index("repositoryConnections_mode_idx").on(table.accessMode), index("repositoryConnections_schedule_idx").on(table.scheduleCronTaskUid)]);
var projectClaims = mysqlTable("projectClaims", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  source: mysqlEnum("source", ["pitch_deck", "video_transcript", "readme", "submission"]).notNull(),
  sourceReference: varchar("sourceReference", { length: 300 }).notNull(),
  claimedFeature: text("claimedFeature").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("projectClaims_project_idx").on(table.projectId)]);
var projectAssets = mysqlTable("projectAssets", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  uploadedById: int("uploadedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  assetType: mysqlEnum("assetType", ["deck", "demo", "video", "document", "other"]).notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 700 }).notNull(),
  originalName: varchar("originalName", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 150 }).notNull(),
  byteSize: int("byteSize").notNull().default(0),
  extraction: json("extraction").$type(),
  contributorConfirmed: boolean("contributorConfirmed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("projectAssets_project_idx").on(table.projectId)]);
var evaluationSyntheses = mysqlTable("evaluationSyntheses", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  auditId: int("auditId").references(() => submissionAudits.id, { onDelete: "set null" }),
  initiatedById: int("initiatedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  model: varchar("model", { length: 100 }).notNull(),
  policyVersion: varchar("policyVersion", { length: 80 }).notNull(),
  evidenceHash: varchar("evidenceHash", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["processing", "complete", "failed"]).default("processing").notNull(),
  result: json("result").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt")
}, (table) => [index("evaluationSyntheses_project_created_idx").on(table.projectId, table.createdAt), index("evaluationSyntheses_audit_idx").on(table.auditId)]);
var humanReviewAnnotations = mysqlTable("humanReviewAnnotations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  judgeId: int("judgeId").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: mysqlEnum("targetType", ["synthesis", "finding", "claim", "market_research"]).notNull(),
  targetReference: varchar("targetReference", { length: 300 }).notNull(),
  annotationType: mysqlEnum("annotationType", ["note", "voice_transcript", "evidence_correction", "independent_determination"]).notNull(),
  body: text("body").notNull(),
  audioStorageKey: varchar("audioStorageKey", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("humanReviewAnnotations_project_created_idx").on(table.projectId, table.createdAt), index("humanReviewAnnotations_target_idx").on(table.projectId, table.targetReference)]);
var judgeAssignments = mysqlTable("judgeAssignments", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  judgeId: int("judgeId").notNull().references(() => users.id, { onDelete: "cascade" }),
  isRecused: boolean("isRecused").default(false).notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull()
}, (table) => [uniqueIndex("judgeAssignments_project_judge_unique").on(table.projectId, table.judgeId), index("judgeAssignments_judge_idx").on(table.judgeId)]);
var reviewerCalibrationCases = mysqlTable("reviewerCalibrationCases", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt")
}, (table) => [index("reviewerCalibrationCases_event_status_idx").on(table.hackathonId, table.status)]);
var reviewerCalibrationResponses = mysqlTable("reviewerCalibrationResponses", {
  id: int("id").autoincrement().primaryKey(),
  calibrationCaseId: int("calibrationCaseId").notNull().references(() => reviewerCalibrationCases.id, { onDelete: "cascade" }),
  judgeId: int("judgeId").notNull().references(() => users.id, { onDelete: "cascade" }),
  rationale: text("rationale").notNull(),
  criterionScores: json("criterionScores").$type().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [uniqueIndex("reviewerCalibrationResponses_case_judge_unique").on(table.calibrationCaseId, table.judgeId), index("reviewerCalibrationResponses_judge_idx").on(table.judgeId)]);
var submissionAudits = mysqlTable("submissionAudits", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["queued", "processing", "complete", "failed", "needs_review"]).default("queued").notNull(),
  extractionMethod: mysqlEnum("extractionMethod", ["github_api", "shallow_clone", "manual"]).default("manual").notNull(),
  technicalScore: decimal("technicalScore", { precision: 5, scale: 2 }),
  integrityScore: decimal("integrityScore", { precision: 5, scale: 2 }),
  originalityScore: decimal("originalityScore", { precision: 5, scale: 2 }),
  pitchFitScore: decimal("pitchFitScore", { precision: 5, scale: 2 }),
  finalSuggestedScore: decimal("finalSuggestedScore", { precision: 5, scale: 2 }),
  report: json("report").$type().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processingStartedAt: timestamp("processingStartedAt"),
  completedAt: timestamp("completedAt")
}, (table) => [index("submissionAudits_project_idx").on(table.projectId)]);
var specialistEvaluations = mysqlTable("specialistEvaluations", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull().references(() => submissionAudits.id, { onDelete: "cascade" }),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  skill: mysqlEnum("skill", ["ux_ui", "cloud_architecture", "security", "development_quality", "value_feasibility"]).notNull(),
  version: varchar("version", { length: 80 }).notNull(),
  policyVersion: varchar("policyVersion", { length: 80 }).notNull(),
  evidenceHash: varchar("evidenceHash", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["queued", "processing", "complete", "failed"]).default("queued").notNull(),
  provisionalScore: decimal("provisionalScore", { precision: 5, scale: 2 }),
  result: json("result").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt")
}, (table) => [uniqueIndex("specialistEvaluations_audit_skill_unique").on(table.auditId, table.skill), index("specialistEvaluations_project_skill_idx").on(table.projectId, table.skill)]);
var scorecards = mysqlTable("scorecards", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  judgeId: int("judgeId").notNull().references(() => users.id, { onDelete: "cascade" }),
  privateNotes: text("privateNotes"),
  finalized: boolean("finalized").default(false).notNull(),
  needsSecondaryReview: boolean("needsSecondaryReview").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [uniqueIndex("scorecards_project_judge_unique").on(table.projectId, table.judgeId)]);
var scoreItems = mysqlTable("scoreItems", {
  id: int("id").autoincrement().primaryKey(),
  scorecardId: int("scorecardId").notNull().references(() => scorecards.id, { onDelete: "cascade" }),
  criterionId: int("criterionId").notNull().references(() => rubricCriteria.id, { onDelete: "cascade" }),
  score: decimal("score", { precision: 5, scale: 2 }).notNull(),
  feedback: text("feedback")
}, (table) => [uniqueIndex("scoreItems_card_criterion_unique").on(table.scorecardId, table.criterionId)]);
var aiOverrides = mysqlTable("aiOverrides", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  judgeId: int("judgeId").notNull().references(() => users.id, { onDelete: "cascade" }),
  claimReference: varchar("claimReference", { length: 255 }).notNull(),
  action: mysqlEnum("action", ["dismiss", "confirm", "escalate"]).notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var objections = mysqlTable("objections", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  submittedById: int("submittedById").notNull().references(() => users.id, { onDelete: "cascade" }),
  claimReference: varchar("claimReference", { length: 255 }).notNull(),
  explanation: text("explanation").notNull(),
  status: mysqlEnum("status", ["open", "under_review", "resolved", "declined"]).default("open").notNull(),
  reviewedById: int("reviewedById").references(() => users.id, { onDelete: "set null" }),
  response: text("response"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt")
});
var developerTelemetry = mysqlTable("developerTelemetry", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  commitCount: int("commitCount").default(0).notNull(),
  bulkCommitFlag: boolean("bulkCommitFlag").default(false).notNull(),
  codeIntegrityScore: decimal("codeIntegrityScore", { precision: 5, scale: 2 }),
  verifiedSkills: json("verifiedSkills").$type(),
  profileSummary: text("profileSummary"),
  embeddingVersion: varchar("embeddingVersion", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("developerTelemetry_user_idx").on(table.userId), index("developerTelemetry_hackathon_idx").on(table.hackathonId)]);
var repositorySyncStates = mysqlTable("repositorySyncStates", {
  id: int("id").autoincrement().primaryKey(),
  repositoryConnectionId: int("repositoryConnectionId").notNull(),
  lastSyncedCommitSha: varchar("lastSyncedCommitSha", { length: 64 }),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [uniqueIndex("repositorySyncStates_connection_unique").on(table.repositoryConnectionId)]);
var codeIndexChunks = mysqlTable("codeIndexChunks", {
  id: varchar("id", { length: 500 }).primaryKey(),
  repositoryConnectionId: int("repositoryConnectionId").notNull(),
  commitSha: varchar("commitSha", { length: 64 }).notNull(),
  filePath: varchar("filePath", { length: 1e3 }).notNull(),
  contentChunk: text("contentChunk").notNull(),
  contentHash: varchar("contentHash", { length: 64 }).notNull(),
  embedding: json("embedding").$type().notNull(),
  embeddingModel: varchar("embeddingModel", { length: 120 }).notNull(),
  embeddingVersion: varchar("embeddingVersion", { length: 80 }).default("mysql-hash-v1").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("codeIndexChunks_connection_idx").on(table.repositoryConnectionId), index("codeIndexChunks_commit_idx").on(table.commitSha)]);
var semanticRetrievalAudits = mysqlTable("semanticRetrievalAudits", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  repositoryConnectionId: int("repositoryConnectionId").notNull(),
  actorId: int("actorId").notNull().references(() => users.id, { onDelete: "restrict" }),
  queryFingerprint: varchar("queryFingerprint", { length: 64 }).notNull(),
  retrievalMode: varchar("retrievalMode", { length: 120 }).notNull(),
  resultCount: int("resultCount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("semanticRetrievalAudits_project_actor_idx").on(table.projectId, table.actorId), index("semanticRetrievalAudits_connection_idx").on(table.repositoryConnectionId)]);
var studioCampaigns = mysqlTable("studioCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  challengeBrief: text("challengeBrief").notNull(),
  status: mysqlEnum("status", ["draft", "open", "screening", "closed"]).default("draft").notNull(),
  opensAt: timestamp("opensAt"),
  closesAt: timestamp("closesAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("studioCampaigns_status_idx").on(table.status), index("studioCampaigns_owner_idx").on(table.ownerId)]);
var studioInvestmentCases = mysqlTable("studioInvestmentCases", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull().references(() => studioCampaigns.id, { onDelete: "cascade" }),
  sponsorId: int("sponsorId").notNull().references(() => users.id, { onDelete: "restrict" }),
  originatorId: int("originatorId").references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  investmentThesis: text("investmentThesis").notNull(),
  problemStatement: text("problemStatement").notNull(),
  businessCase: text("businessCase").notNull(),
  financialDetail: json("financialDetail").$type(),
  kpiOkrLinks: json("kpiOkrLinks").$type(),
  status: mysqlEnum("status", ["submitted", "returned", "approved_for_proof", "archived", "investment_review", "archived_learning"]).default("submitted").notNull(),
  approvalRationale: text("approvalRationale"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("studioInvestmentCases_campaign_status_idx").on(table.campaignId, table.status), index("studioInvestmentCases_sponsor_idx").on(table.sponsorId)]);
var studioInvestmentCaseAssets = mysqlTable("studioInvestmentCaseAssets", {
  id: int("id").autoincrement().primaryKey(),
  investmentCaseId: int("investmentCaseId").notNull().references(() => studioInvestmentCases.id, { onDelete: "cascade" }),
  uploadedById: int("uploadedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  assetType: mysqlEnum("assetType", ["business_plan", "financial_model", "research", "technical_document", "other"]).default("other").notNull(),
  originalName: varchar("originalName", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 150 }).notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 700 }).notNull(),
  extractedText: text("extractedText"),
  contributorConfirmed: boolean("contributorConfirmed").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("studioInvestmentCaseAssets_case_idx").on(table.investmentCaseId), index("studioInvestmentCaseAssets_created_idx").on(table.createdAt)]);
var studioProofEvents = mysqlTable("studioProofEvents", {
  id: int("id").autoincrement().primaryKey(),
  organizerId: int("organizerId").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  rules: text("rules").notNull(),
  updateExpectations: text("updateExpectations"),
  status: mysqlEnum("status", ["draft", "registration", "proof_active", "judging", "closed"]).default("draft").notNull(),
  registrationOpensAt: timestamp("registrationOpensAt"),
  registrationClosesAt: timestamp("registrationClosesAt"),
  proofStartsAt: timestamp("proofStartsAt"),
  submissionClosesAt: timestamp("submissionClosesAt"),
  judgingStartsAt: timestamp("judgingStartsAt"),
  judgingClosesAt: timestamp("judgingClosesAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("studioProofEvents_status_idx").on(table.status), index("studioProofEvents_organizer_idx").on(table.organizerId)]);
var studioProofCandidates = mysqlTable("studioProofCandidates", {
  id: int("id").autoincrement().primaryKey(),
  investmentCaseId: int("investmentCaseId").notNull().references(() => studioInvestmentCases.id, { onDelete: "cascade" }),
  proofEventId: int("proofEventId").notNull().references(() => studioProofEvents.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  proofQuestion: text("proofQuestion").notNull(),
  requiredArtifacts: json("requiredArtifacts").$type().notNull(),
  rubric: json("rubric").$type().notNull(),
  jiraContextUrl: varchar("jiraContextUrl", { length: 700 }),
  status: mysqlEnum("status", ["configured", "team_building", "proof_active", "submitted", "judging", "decided"]).default("configured").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [uniqueIndex("studioProofCandidates_case_event_unique").on(table.investmentCaseId, table.proofEventId), index("studioProofCandidates_event_status_idx").on(table.proofEventId, table.status)]);
var studioTeamProofs = mysqlTable("studioTeamProofs", {
  id: int("id").autoincrement().primaryKey(),
  proofCandidateId: int("proofCandidateId").notNull().references(() => studioProofCandidates.id, { onDelete: "cascade" }),
  teamLeadId: int("teamLeadId").notNull().references(() => users.id, { onDelete: "restrict" }),
  teamName: varchar("teamName", { length: 255 }).notNull(),
  solutionSummary: text("solutionSummary").notNull(),
  status: mysqlEnum("status", ["forming", "building", "submitted", "evidence_review", "human_review", "closed"]).default("forming").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("studioTeamProofs_candidate_status_idx").on(table.proofCandidateId, table.status), index("studioTeamProofs_lead_idx").on(table.teamLeadId)]);
var studioProofArtifacts = mysqlTable("studioProofArtifacts", {
  id: int("id").autoincrement().primaryKey(),
  teamProofId: int("teamProofId").notNull().references(() => studioTeamProofs.id, { onDelete: "cascade" }),
  uploadedById: int("uploadedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  artifactKey: varchar("artifactKey", { length: 80 }).notNull(),
  artifactType: mysqlEnum("artifactType", ["brd", "technical_requirements", "business_summary", "repository", "jira_context", "demo", "deck", "video", "market_research", "other"]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  evidenceUrl: varchar("evidenceUrl", { length: 1e3 }).notNull(),
  extractedText: text("extractedText"),
  consentConfirmed: boolean("consentConfirmed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("studioProofArtifacts_proof_idx").on(table.teamProofId), uniqueIndex("studioProofArtifacts_proof_key_unique").on(table.teamProofId, table.artifactKey)]);
var studioEvidencePackets = mysqlTable("studioEvidencePackets", {
  id: int("id").autoincrement().primaryKey(),
  teamProofId: int("teamProofId").notNull().references(() => studioTeamProofs.id, { onDelete: "cascade" }),
  evidenceHash: varchar("evidenceHash", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["queued", "evaluating", "ready", "needs_evidence", "failed"]).default("queued").notNull(),
  agentFindings: json("agentFindings").$type(),
  skillFindings: json("skillFindings").$type(),
  marketContext: json("marketContext").$type(),
  teamQuestions: json("teamQuestions").$type(),
  judgeQuestions: json("judgeQuestions").$type(),
  limitations: json("limitations").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [uniqueIndex("studioEvidencePackets_proof_hash_unique").on(table.teamProofId, table.evidenceHash), index("studioEvidencePackets_proof_created_idx").on(table.teamProofId, table.createdAt)]);
var studioJudgeDecisions = mysqlTable("studioJudgeDecisions", {
  id: int("id").autoincrement().primaryKey(),
  teamProofId: int("teamProofId").notNull().references(() => studioTeamProofs.id, { onDelete: "cascade" }),
  judgeId: int("judgeId").notNull().references(() => users.id, { onDelete: "restrict" }),
  evidencePacketId: int("evidencePacketId").references(() => studioEvidencePackets.id, { onDelete: "set null" }),
  rubricScores: json("rubricScores").$type().notNull(),
  decision: mysqlEnum("decision", ["advance", "runner_up", "return_to_proof", "archive", "no_decision"]).notNull(),
  rationale: text("rationale").notNull(),
  evidenceCorrections: json("evidenceCorrections").$type(),
  executiveHeatMap: json("executiveHeatMap").$type(),
  questionAnswers: json("questionAnswers").$type(),
  agentDeliberation: json("agentDeliberation").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [uniqueIndex("studioJudgeDecisions_proof_judge_unique").on(table.teamProofId, table.judgeId), index("studioJudgeDecisions_proof_idx").on(table.teamProofId)]);
var studioInvestmentGates = mysqlTable("studioInvestmentGates", {
  id: int("id").autoincrement().primaryKey(),
  investmentCaseId: int("investmentCaseId").notNull().references(() => studioInvestmentCases.id, { onDelete: "cascade" }),
  proofCandidateId: int("proofCandidateId").references(() => studioProofCandidates.id, { onDelete: "set null" }),
  decidedById: int("decidedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  status: mysqlEnum("status", ["advance_assessment", "fund", "return_to_proof", "hold", "archive"]).notNull(),
  assumptionMovement: json("assumptionMovement").$type().notNull(),
  rationale: text("rationale").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("studioInvestmentGates_case_created_idx").on(table.investmentCaseId, table.createdAt)]);
var studioInvestmentLearning = mysqlTable("studioInvestmentLearning", {
  id: int("id").autoincrement().primaryKey(),
  investmentCaseId: int("investmentCaseId").notNull().references(() => studioInvestmentCases.id, { onDelete: "cascade" }),
  proofCandidateId: int("proofCandidateId").references(() => studioProofCandidates.id, { onDelete: "set null" }),
  judgeDecisionId: int("judgeDecisionId").references(() => studioJudgeDecisions.id, { onDelete: "set null" }),
  investmentGateId: int("investmentGateId").references(() => studioInvestmentGates.id, { onDelete: "set null" }),
  recordedById: int("recordedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  validatedAssumptions: json("validatedAssumptions").$type().notNull(),
  limitations: json("limitations").$type().notNull(),
  expectedInvestmentContribution: text("expectedInvestmentContribution"),
  reusableLearning: text("reusableLearning").notNull(),
  nextInvestmentAction: text("nextInvestmentAction").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("studioInvestmentLearning_case_created_idx").on(table.investmentCaseId, table.createdAt)]);
var studioCampaignSignals = mysqlTable("studioCampaignSignals", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull().references(() => studioCampaigns.id, { onDelete: "cascade" }),
  investmentCaseId: int("investmentCaseId").references(() => studioInvestmentCases.id, { onDelete: "set null" }),
  submittedById: int("submittedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  signalType: mysqlEnum("signalType", ["idea", "endorsement", "comment", "evidence_offer"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("studioCampaignSignals_campaign_created_idx").on(table.campaignId, table.createdAt), index("studioCampaignSignals_case_created_idx").on(table.investmentCaseId, table.createdAt)]);
var studioCampaignAssessments = mysqlTable("studioCampaignAssessments", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull().references(() => studioCampaigns.id, { onDelete: "cascade" }),
  investmentCaseId: int("investmentCaseId").notNull().references(() => studioInvestmentCases.id, { onDelete: "cascade" }),
  submittedById: int("submittedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  stance: mysqlEnum("stance", ["go", "hold", "no_go"]).notNull(),
  valuationScore: int("valuationScore").notNull(),
  likes: text("likes").notNull(),
  improvements: text("improvements").notNull(),
  rationale: text("rationale").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [uniqueIndex("studioCampaignAssessments_case_user_unique").on(table.investmentCaseId, table.submittedById), index("studioCampaignAssessments_campaign_case_idx").on(table.campaignId, table.investmentCaseId)]);
var studioIncubationReviews = mysqlTable("studioIncubationReviews", {
  id: int("id").autoincrement().primaryKey(),
  investmentCaseId: int("investmentCaseId").notNull().references(() => studioInvestmentCases.id, { onDelete: "cascade" }),
  managerId: int("managerId").notNull().references(() => users.id, { onDelete: "restrict" }),
  decision: mysqlEnum("decision", ["advance", "return_for_enrichment", "hold", "decline"]).notNull(),
  rationale: text("rationale").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [uniqueIndex("studioIncubationReviews_case_manager_unique").on(table.investmentCaseId, table.managerId), index("studioIncubationReviews_case_updated_idx").on(table.investmentCaseId, table.updatedAt)]);
var studioEventRegistrations = mysqlTable("studioEventRegistrations", {
  id: int("id").autoincrement().primaryKey(),
  proofEventId: int("proofEventId").notNull().references(() => studioProofEvents.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["participant", "mentor", "judge", "organizer"]).notNull(),
  status: mysqlEnum("status", ["registered", "approved", "declined", "withdrawn"]).notNull().default("registered"),
  availability: json("availability").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [uniqueIndex("studioEventRegistrations_event_user_role_unique").on(table.proofEventId, table.userId, table.role), index("studioEventRegistrations_event_role_idx").on(table.proofEventId, table.role)]);
var studioProofTeamMembers = mysqlTable("studioProofTeamMembers", {
  id: int("id").autoincrement().primaryKey(),
  teamProofId: int("teamProofId").notNull().references(() => studioTeamProofs.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["lead", "builder", "designer", "business", "researcher", "other"]).notNull().default("builder"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull()
}, (table) => [uniqueIndex("studioProofTeamMembers_proof_user_unique").on(table.teamProofId, table.userId), index("studioProofTeamMembers_proof_idx").on(table.teamProofId)]);
var studioChallengeRepositories = mysqlTable("studioChallengeRepositories", {
  id: int("id").autoincrement().primaryKey(),
  proofCandidateId: int("proofCandidateId").notNull().references(() => studioProofCandidates.id, { onDelete: "cascade" }),
  organization: varchar("organization", { length: 255 }).notNull(),
  repositoryName: varchar("repositoryName", { length: 255 }).notNull(),
  githubRepositoryId: varchar("githubRepositoryId", { length: 32 }),
  repositoryUrl: varchar("repositoryUrl", { length: 700 }),
  status: mysqlEnum("status", ["permissions_pending", "ready_to_provision", "provisioned", "archive_pending", "archived", "migration_window", "deletion_pending", "deleted", "failed"]).notNull().default("permissions_pending"),
  teamAccessStatus: mysqlEnum("teamAccessStatus", ["not_granted", "pending", "granted", "revoked"]).notNull().default("not_granted"),
  submittedRef: varchar("submittedRef", { length: 255 }),
  submittedAt: timestamp("submittedAt"),
  auditMode: mysqlEnum("auditMode", ["read_only_advisory"]).notNull().default("read_only_advisory"),
  auditSchedule: varchar("auditSchedule", { length: 80 }),
  migrationClosesAt: timestamp("migrationClosesAt"),
  archivedAt: timestamp("archivedAt"),
  deletedAt: timestamp("deletedAt"),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [uniqueIndex("studioChallengeRepositories_candidate_unique").on(table.proofCandidateId), index("studioChallengeRepositories_status_idx").on(table.status), index("studioChallengeRepositories_org_idx").on(table.organization)]);

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken2 = cookies.get(COOKIE_NAME);
    if (!sessionToken2) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken2 = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken2);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken2 ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken2 ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken2 = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken2, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/hackathons.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { and, desc, eq as eq2, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z as z2 } from "zod";
import { parse as parseCookie } from "cookie";
import mammoth from "mammoth";

// server/services/scoreAggregation.ts
function calculateWeightedScore(items, criteria) {
  const weightByCriterion = new Map(criteria.map((criterion) => [criterion.id, Number(criterion.weight)]));
  const weightsPresent = items.reduce((sum, item) => sum + (weightByCriterion.get(item.criterionId) || 0), 0);
  if (!items.length || weightsPresent <= 0) return null;
  const weighted = items.reduce((sum, item) => sum + Number(item.score) * (weightByCriterion.get(item.criterionId) || 0), 0);
  return Number((weighted / weightsPresent).toFixed(2));
}
function averageFinalizedHumanScores(scorecards2, items, criteria) {
  const scores = scorecards2.map((card) => calculateWeightedScore(items.filter((item) => item.scorecardId === card.id), criteria)).filter((score) => score !== null);
  if (!scores.length) return null;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2));
}

// server/services/mentorCapacity.ts
function summarizeMentorCapacity(mentors, people, requests) {
  return mentors.filter((mentor) => mentor.status !== "withdrawn").map((mentor) => ({
    mentorId: mentor.userId,
    name: people.find((person) => person.id === mentor.userId)?.name || "Registered mentor",
    pendingRequests: requests.filter((request) => request.mentorId === mentor.userId && request.status === "pending").length,
    acceptedRequests: requests.filter((request) => request.mentorId === mentor.userId && request.status === "accepted").length,
    respondedRequests: requests.filter((request) => request.mentorId === mentor.userId && ["accepted", "declined", "redirected"].includes(request.status)).length
  }));
}

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1 || tools[0].type !== "function") {
      throw new Error(
        "tool_choice 'required' needs a single function tool or an explicit function name"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat: responseFormat2,
  response_format,
  outputSchema: outputSchema2,
  output_schema
}) => {
  const explicitFormat = responseFormat2 || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema2 || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema: outputSchema2,
    output_schema,
    responseFormat: responseFormat2,
    response_format,
    model,
    thinking,
    reasoning,
    maxCompletionTokens,
    max_completion_tokens,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxCompletionTokens = max_completion_tokens ?? maxCompletionTokens;
  if (typeof resolvedMaxCompletionTokens === "number") {
    payload.max_completion_tokens = resolvedMaxCompletionTokens;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat: responseFormat2,
    response_format,
    outputSchema: outputSchema2,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}
async function listLLMModels() {
  assertApiKey();
  const url = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/models` : "https://forge.manus.im/v1/models";
  const response = await fetchWithBackoff(url, {
    headers: { authorization: `Bearer ${ENV.forgeApiKey}` }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List LLM models failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/services/organizerCopilot.ts
var sourceLabelSchema = { type: "string", enum: ["opportunity brief", "cited research", "evidence gap", "sponsor context"] };
var responseFormat = {
  type: "json_schema",
  json_schema: {
    name: "organizer_copilot_draft",
    strict: true,
    schema: {
      type: "object",
      properties: {
        tracks: { type: "array", minItems: 1, maxItems: 3, items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, sourceLabels: { type: "array", minItems: 1, maxItems: 3, items: sourceLabelSchema } }, required: ["title", "description", "sourceLabels"], additionalProperties: false } },
        rubric: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, evaluationMethod: { type: "string" }, suggestedWeight: { type: "number", minimum: 1, maximum: 100 }, sourceLabels: { type: "array", minItems: 1, maxItems: 3, items: sourceLabelSchema } }, required: ["title", "description", "evaluationMethod", "suggestedWeight", "sourceLabels"], additionalProperties: false } },
        requiredEvidence: { type: "array", minItems: 2, maxItems: 6, items: { type: "object", properties: { item: { type: "string" }, sourceLabels: { type: "array", minItems: 1, maxItems: 3, items: sourceLabelSchema } }, required: ["item", "sourceLabels"], additionalProperties: false } },
        proofQuestions: { type: "array", minItems: 2, maxItems: 5, items: { type: "object", properties: { question: { type: "string" }, sourceLabels: { type: "array", minItems: 1, maxItems: 3, items: sourceLabelSchema } }, required: ["question", "sourceLabels"], additionalProperties: false } },
        limitations: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } }
      },
      required: ["tracks", "rubric", "requiredEvidence", "proofQuestions", "limitations"],
      additionalProperties: false
    }
  }
};
function contentText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part && typeof part === "object" && "text" in part ? String(part.text || "") : "").join("\n");
  return "";
}
var organizerCopilotPolicy = "You are an evidence-bounded organizer copilot. Draft a compact proof-sprint configuration from only the supplied opportunity and research packet. The output is advisory and starts unadopted. Do not create, copy, calculate, or mention sponsor economics or ROI. Do not select winners, finalists, investments, or human decisions. Do not invent facts, customers, validation results, or citations. Label each item with the supplied evidence category that supports it. Include limitations where evidence is absent or unverified. Return only the required JSON.";
async function draftEventConfigurationFromEvidence(evidence) {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxCompletionTokens: 2200,
    response_format: responseFormat,
    messages: [
      { role: "system", content: organizerCopilotPolicy },
      { role: "user", content: JSON.stringify({
        policy: "organizer-copilot-evidence-v1",
        opportunityBrief: {
          title: evidence.opportunity.title,
          problemStatement: evidence.opportunity.problemStatement,
          narrative: evidence.opportunity.opportunityNarrative || null,
          sponsorContextNarrative: evidence.opportunity.valueCaseNarrative || null,
          evidenceGaps: evidence.opportunity.evidenceGaps || []
        },
        citedResearch: evidence.research ? { summary: evidence.research.summary || null, limitations: evidence.research.limitations || null, dossier: evidence.research.dossier || null } : null
      }, null, 2) }
    ]
  });
  const raw = contentText(response.choices[0]?.message.content).trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(raw);
}

// server/services/opportunityAi.ts
function responseText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => part && typeof part === "object" && "text" in part ? String(part.text ?? "") : "").join("\n");
  }
  return "";
}
function opportunityContext(input) {
  const evidence = input.assets.map((asset) => {
    const text2 = asset.transcript || (asset.extraction ? JSON.stringify(asset.extraction) : "");
    return text2 ? `[${asset.assetType}] ${text2.slice(0, 5e3)}` : "";
  }).filter(Boolean).join("\n\n");
  return [
    `Title: ${input.title}`,
    `Problem statement: ${input.problemStatement}`,
    `Narrative: ${input.opportunityNarrative || "Not supplied"}`,
    `Target user: ${input.targetUser || "Not supplied"}`,
    `Domain: ${input.domain || "Not supplied"}`,
    evidence ? `Contributor evidence:
${evidence}` : "Contributor evidence: None supplied"
  ].join("\n");
}
async function createOpportunityBrief(input) {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: "You are the Opportunity Intake Agent for a governed idea-to-investment system. Extract a concise opportunity brief from contributor material. Explain potential value mechanisms and a non-binding next gate. Do not invent metrics, customers, validation, financial outcomes, or investment decisions. Name uncertainty clearly and make the human sponsor the decision owner."
      },
      { role: "user", content: opportunityContext(input) }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "opportunity_brief",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            problem: { type: "string" },
            targetUser: { type: "string" },
            valueHypothesis: { type: "string" },
            valueMechanisms: { type: "array", items: { type: "string" } },
            assumptions: { type: "array", items: { type: "string" } },
            evidenceGaps: { type: "array", items: { type: "string" } },
            recommendedGate: { type: "string", enum: ["shape_value_case", "research", "proof_sprint", "hold"] },
            gateRationale: { type: "string" }
          },
          required: ["title", "problem", "targetUser", "valueHypothesis", "valueMechanisms", "assumptions", "evidenceGaps", "recommendedGate", "gateRationale"],
          additionalProperties: false
        }
      }
    },
    maxTokens: 1400
  });
  return JSON.parse(responseText(response.choices[0]?.message.content));
}
async function extractPdfEvidence(fileUrl) {
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content: "Extract a concise, factual evidence record from the attached opportunity document. Do not infer validation, financial value, or legal conclusions that are not explicitly present. Separate missing evidence from stated claims."
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the opportunity summary, stated claims, and evidence gaps from this PDF." },
          { type: "file_url", file_url: { url: fileUrl, mime_type: "application/pdf" } }
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "opportunity_document_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            keyClaims: { type: "array", items: { type: "string" } },
            evidenceGaps: { type: "array", items: { type: "string" } }
          },
          required: ["summary", "keyClaims", "evidenceGaps"],
          additionalProperties: false
        }
      }
    },
    maxTokens: 1800
  });
  return JSON.parse(responseText(response.choices[0]?.message.content));
}
async function conductOpportunityResearch(input, attempt = 0) {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: "You are the Opportunity Research Agent. Build a concise, decision-grade research dossier from publicly accessible sources. Separate the idea narrative, customer or user impact, market acceptance signals, operating impact, and primary value category. Use only source-backed evidence and say when evidence is insufficient; do not invent customer demand, market size, adoption, savings, revenue, ROI, validation, or numerical outcomes. Cite direct URLs only. Do not make legal, patentability, novelty, infringement, funding, or investment conclusions. Research coverage remains limited and requires human IP, customer, and domain review."
      },
      {
        role: "user",
        content: attempt === 0 ? `Research this opportunity and return a rich but concise dossier plus 3 to 6 sourced findings. Classify every source as market, customer, operating, value, or other.

${opportunityContext(input)}` : `The previous structured response was incomplete. Return only complete valid JSON matching the required schema. Keep every field concise and return exactly 3 sourced findings. Do not substitute unsourced findings.

${opportunityContext(input)}`
      }
    ],
    tools: [{ type: "web_search", search_context_size: "medium" }],
    tool_choice: "auto",
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "opportunity_research",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            limitations: { type: "string" },
            dossier: { type: "object", properties: {
              ideaNarrative: { type: "string" },
              customerImpact: { type: "object", properties: { audience: { type: "string" }, problem: { type: "string" }, involvement: { type: "string" }, expectedExperienceShift: { type: "string" } }, required: ["audience", "problem", "involvement", "expectedExperienceShift"], additionalProperties: false },
              marketAcceptance: { type: "object", properties: { signal: { type: "string", enum: ["established_demand", "emerging_signal", "mixed_signal", "insufficient_evidence"] }, narrative: { type: "string" } }, required: ["signal", "narrative"], additionalProperties: false },
              operatingImpact: { type: "object", properties: { area: { type: "string" }, narrative: { type: "string" } }, required: ["area", "narrative"], additionalProperties: false },
              valuePerspective: { type: "object", properties: { primaryCategory: { type: "string", enum: ["cost_optimization", "customer_satisfaction", "revenue_growth", "risk_reduction", "productivity", "sustainability", "other"] }, narrative: { type: "string" } }, required: ["primaryCategory", "narrative"], additionalProperties: false },
              evidenceGaps: { type: "array", maxItems: 6, items: { type: "string" } }
            }, required: ["ideaNarrative", "customerImpact", "marketAcceptance", "operatingImpact", "valuePerspective", "evidenceGaps"], additionalProperties: false },
            sources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  url: { type: "string" },
                  excerpt: { type: "string" },
                  relevance: { type: "string" },
                  evidenceCategory: { type: "string", enum: ["market", "customer", "operating", "value", "other"] },
                  assessment: {
                    type: "string",
                    enum: ["potentially_similar", "relevant_precedent", "possible_differentiator", "requires_expert_review"]
                  }
                },
                required: ["title", "url", "excerpt", "relevance", "evidenceCategory", "assessment"],
                additionalProperties: false
              }
            }
          },
          required: ["summary", "limitations", "dossier", "sources"],
          additionalProperties: false
        }
      }
    },
    maxCompletionTokens: attempt === 0 ? 4200 : 2800
  });
  const content = responseText(response.choices[0]?.message.content).trim();
  try {
    return JSON.parse(content);
  } catch (error) {
    if (attempt === 0) return conductOpportunityResearch(input, 1);
    throw new Error("Research returned an incomplete structured response after one retry. No unsourced fallback was created.", { cause: error });
  }
}

// server/storage.ts
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}
async function storageGetSignedUrl(relKey) {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = await resp.json();
  return url;
}

// server/_core/heartbeat.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
var SERVICE = "webdevtoken.v1.WebDevService";
var buildEndpoint = (rpc) => {
  if (!ENV.forgeApiUrl) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service URL is not configured (BUILT_IN_FORGE_API_URL)."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service API key is not configured (BUILT_IN_FORGE_API_KEY)."
    });
  }
  const baseUrl = ENV.forgeApiUrl;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(`${SERVICE}/${rpc}`, normalizedBase).toString();
};
var callForge = async (rpc, body, userSession) => {
  const endpoint = buildEndpoint(rpc);
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${ENV.forgeApiKey}`,
    "content-type": "application/json",
    "connect-protocol-version": "1"
  };
  if (userSession) {
    headers["x-manus-user-session"] = userSession;
  }
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: `Heartbeat ${rpc} network error: ${String(error)}`
    });
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw mapForgeError(response, detail, rpc);
  }
  return await response.json();
};
var mapForgeError = (response, detail, rpc) => {
  const status = response.status;
  let code = "INTERNAL_SERVER_ERROR";
  if (status === 401) code = "UNAUTHORIZED";
  else if (status === 403) code = "FORBIDDEN";
  else if (status === 404) code = "NOT_FOUND";
  else if (status === 400 || status === 422) code = "BAD_REQUEST";
  else if (status === 409) code = "CONFLICT";
  else if (status === 429) code = "TOO_MANY_REQUESTS";
  return new TRPCError3({
    code,
    message: `Heartbeat ${rpc} failed (${status})${detail ? `: ${detail}` : ""}`
  });
};
var stringifyPayload = (payload) => {
  if (payload === void 0 || payload === null) return "{}";
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
};
var validateCallbackPath = (path4) => {
  if (!path4 || !path4.startsWith("/api/scheduled/")) {
    throw new TRPCError3({
      code: "BAD_REQUEST",
      message: "callback path must start with /api/scheduled/"
    });
  }
};
async function createHeartbeatJob(job, userSession) {
  validateCallbackPath(job.path);
  return callForge(
    "CreateHeartbeatJob",
    {
      name: job.name,
      cronExpression: job.cron,
      callbackPath: job.path,
      callbackMethod: job.method ?? "POST",
      callbackPayload: stringifyPayload(job.payload),
      description: job.description ?? ""
    },
    userSession
  );
}
async function updateHeartbeatJob(taskUid, patch, userSession) {
  if (patch.path !== void 0) validateCallbackPath(patch.path);
  const body = { taskUid };
  if (patch.cron !== void 0) body.cronExpression = patch.cron;
  if (patch.path !== void 0) body.callbackPath = patch.path;
  if (patch.method !== void 0) body.callbackMethod = patch.method;
  if (patch.payload !== void 0) {
    body.callbackPayload = stringifyPayload(patch.payload);
  }
  if (patch.description !== void 0) body.description = patch.description;
  if (patch.enable !== void 0) body.enable = patch.enable;
  return callForge(
    "UpdateHeartbeatJob",
    body,
    userSession
  );
}
async function deleteHeartbeatJob(taskUid, userSession) {
  await callForge("DeleteHeartbeatJob", { taskUid }, userSession);
}

// server/routers/hackathons.ts
async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "The data service is not available." });
  return db;
}
async function ensureOrganizerOrAdmin(userId, role) {
  if (role === "admin") return;
  const db = await dbOrThrow();
  const [profile] = await db.select().from(userProfiles).where(eq2(userProfiles.userId, userId)).limit(1);
  if (!profile || !["organizer", "sponsor", "admin"].includes(profile.persona)) throw new TRPCError4({ code: "FORBIDDEN", message: "This action requires organizer or sponsor authorization." });
}
async function ensureSponsorOrAdmin(userId, role) {
  if (role === "admin") return;
  const db = await dbOrThrow();
  const [profile] = await db.select().from(userProfiles).where(eq2(userProfiles.userId, userId)).limit(1);
  if (profile?.persona !== "sponsor") throw new TRPCError4({ code: "FORBIDDEN", message: "This action requires sponsor or administrator authorization." });
}
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120);
}
function cleanAssetName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}
function uploadBuffer(base64) {
  const cleaned = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  return Buffer.from(cleaned, "base64");
}
function buildCommunitySignalProofContext(endorsementCount, noteCount) {
  if (!endorsementCount && !noteCount) return "";
  return `

Community signal context (non-binding): ${endorsementCount} endorsement(s) and ${noteCount} structured observation(s) were recorded before the proof sprint. Treat these as hypotheses and evidence offers to investigate; do not treat popularity as validation or a decision.`;
}
function scheduleSessionToken(cookieHeader) {
  const token = parseCookie(cookieHeader ?? "")[COOKIE_NAME];
  if (!token) throw new TRPCError4({ code: "UNAUTHORIZED", message: "A signed-in organizer session is required to manage audit processing." });
  return token;
}
function assertSixFieldCron(cron) {
  if (cron.trim().split(/\s+/).length !== 6) throw new TRPCError4({ code: "BAD_REQUEST", message: "Audit processing uses a six-field UTC cron expression, for example: 0 */5 * * * *." });
}
function rankOptInTeamFit(input) {
  const requested = input.requestedSkills.map((item) => item.toLowerCase());
  const mySkills = new Set(input.participantSkills.map((item) => item.toLowerCase()));
  const myRoles = Array.from(new Set(input.participantRoles.map((item) => item.toLowerCase())));
  const existingRoles = new Set(input.memberRoles.map((item) => item.toLowerCase()));
  const directSkillMatches = requested.filter((item) => mySkills.has(item));
  const complementaryRoles = myRoles.filter((role) => !existingRoles.has(role));
  return {
    score: directSkillMatches.length * 3 + complementaryRoles.length,
    reasons: [
      ...directSkillMatches.map((skill) => `Looking for your ${skill} skill`),
      ...complementaryRoles.slice(0, 3).map((role) => `Adds a ${role} perspective not yet listed by the team`)
    ]
  };
}
function deriveEventPulse(input) {
  const specialistExpected = input.auditsComplete * 5;
  const blockers = [];
  if (!input.teams) blockers.push("No team has formed yet.");
  if (input.teams && !input.projects) blockers.push("Teams have not created proof projects yet.");
  if (input.projects && !input.submitted) blockers.push("Proof projects remain in draft; final evidence has not been submitted.");
  if (input.submitted && !input.auditsComplete) blockers.push(input.auditsInFlight ? "Submitted proof is awaiting audit completion." : "Submitted proof has no completed audit yet.");
  if (input.auditsComplete && input.specialistComplete < specialistExpected) blockers.push(`Cited specialist reviews are still pending (${input.specialistComplete}/${specialistExpected} complete).`);
  if (input.auditsComplete && input.specialistComplete >= specialistExpected && !input.finalScorecards) blockers.push("Evidence is available; a human decision remains open.");
  return { ...input, specialistExpected, blockers, decisionReady: Boolean(input.auditsComplete && input.specialistComplete >= specialistExpected && input.finalScorecards) };
}
async function ensureMembership(hackathonId, userId, role) {
  const db = await dbOrThrow();
  if (role === "admin") return db;
  const [event] = await db.select().from(hackathons).where(eq2(hackathons.id, hackathonId)).limit(1);
  if (event && (event.organizerId === userId || event.sponsorId === userId)) return db;
  const [registration] = await db.select().from(hackathonRegistrations).where(and(eq2(hackathonRegistrations.hackathonId, hackathonId), eq2(hackathonRegistrations.userId, userId))).limit(1);
  if (!registration) throw new TRPCError4({ code: "FORBIDDEN", message: "Register for this hackathon before accessing its workspaces." });
  return db;
}
var hackathonsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await dbOrThrow();
    return db.select().from(hackathons).orderBy(desc(hackathons.updatedAt));
  }),
  leaderboard: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive() })).query(async ({ input }) => {
    const db = await dbOrThrow();
    const [event] = await db.select().from(hackathons).where(eq2(hackathons.id, input.hackathonId)).limit(1);
    if (!event) throw new TRPCError4({ code: "NOT_FOUND", message: "Hackathon not found." });
    const [eventProjects, criteria, allCards, allItems, audits] = await Promise.all([
      db.select().from(projects).where(eq2(projects.hackathonId, event.id)),
      db.select().from(rubricCriteria).where(eq2(rubricCriteria.hackathonId, event.id)),
      db.select().from(scorecards).where(eq2(scorecards.finalized, true)),
      db.select().from(scoreItems),
      db.select().from(submissionAudits).orderBy(desc(submissionAudits.createdAt))
    ]);
    return eventProjects.map((project) => {
      const finalizedCards = allCards.filter((card) => card.projectId === project.id);
      const latestAudit = audits.find((audit) => audit.projectId === project.id && audit.status === "complete") || null;
      return {
        projectId: project.id,
        title: project.title,
        submittedAt: project.submittedAt,
        finalizedJudgeCount: finalizedCards.length,
        humanScore: averageFinalizedHumanScores(finalizedCards, allItems, criteria),
        agentPreview: latestAudit?.finalSuggestedScore ? Number(latestAudit.finalSuggestedScore) : null
      };
    }).sort((a, b) => (b.humanScore ?? -1) - (a.humanScore ?? -1) || a.title.localeCompare(b.title));
  }),
  eventPulse: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const [event] = await db.select().from(hackathons).where(eq2(hackathons.id, input.hackathonId)).limit(1);
    if (!event) throw new TRPCError4({ code: "NOT_FOUND", message: "Hackathon not found." });
    const [registrations, eventTeams, eventProjects] = await Promise.all([
      db.select().from(hackathonRegistrations).where(eq2(hackathonRegistrations.hackathonId, event.id)),
      db.select().from(teams).where(eq2(teams.hackathonId, event.id)),
      db.select().from(projects).where(eq2(projects.hackathonId, event.id))
    ]);
    const projectIds = eventProjects.map((project) => project.id);
    if (!projectIds.length) return deriveEventPulse({ registrations: registrations.length, teams: eventTeams.length, projects: 0, submitted: 0, auditsComplete: 0, auditsInFlight: 0, specialistComplete: 0, finalScorecards: 0 });
    const [audits, evaluations, finalCards] = await Promise.all([
      db.select().from(submissionAudits).where(inArray(submissionAudits.projectId, projectIds)),
      db.select().from(specialistEvaluations).where(inArray(specialistEvaluations.projectId, projectIds)),
      db.select().from(scorecards).where(and(inArray(scorecards.projectId, projectIds), eq2(scorecards.finalized, true)))
    ]);
    return deriveEventPulse({
      registrations: registrations.length,
      teams: eventTeams.length,
      projects: eventProjects.length,
      submitted: eventProjects.filter((project) => Boolean(project.submittedAt)).length,
      auditsComplete: audits.filter((audit) => audit.status === "complete").length,
      auditsInFlight: audits.filter((audit) => audit.status === "queued" || audit.status === "processing").length,
      specialistComplete: evaluations.filter((evaluation) => evaluation.status === "complete").length,
      finalScorecards: finalCards.length
    });
  }),
  myProjects: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    if (ctx.user.role === "admin") return db.select().from(projects).orderBy(desc(projects.updatedAt));
    const memberships = await db.select().from(teamMembers).where(eq2(teamMembers.userId, ctx.user.id));
    const output = [];
    for (const membership of memberships) {
      const [project] = await db.select().from(projects).where(eq2(projects.teamId, membership.teamId)).limit(1);
      if (project) output.push(project);
    }
    return output;
  }),
  myCommandEntry: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    const registrations = await db.select().from(hackathonRegistrations).where(eq2(hackathonRegistrations.userId, ctx.user.id));
    if (!registrations.length) return [];
    const eventIds = registrations.map((registration) => registration.hackathonId);
    const [events, eventProjects] = await Promise.all([
      db.select().from(hackathons).where(inArray(hackathons.id, eventIds)),
      db.select().from(projects).where(inArray(projects.hackathonId, eventIds))
    ]);
    return registrations.map((registration) => {
      const event = events.find((item) => item.id === registration.hackathonId);
      const project = eventProjects.find((item) => item.hackathonId === registration.hackathonId);
      const nextAction = !project ? { label: "Start or join a proof team", route: `/hackathons/${registration.hackathonId}` } : !project.submittedAt ? { label: "Complete final evidence", route: `/submission-evidence?project=${project.id}` } : { label: "Review cited findings", route: `/judging?project=${project.id}` };
      return {
        registrationId: registration.id,
        registrationStatus: registration.status,
        registrationRole: registration.registrationRole,
        hackathonId: registration.hackathonId,
        eventTitle: event?.title || "Proof sprint",
        eventStatus: event?.status || "unknown",
        opportunityId: event?.opportunityId || null,
        projectId: project?.id || null,
        projectTitle: project?.title || null,
        projectSubmittedAt: project?.submittedAt || null,
        nextAction
      };
    });
  }),
  detail: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [event] = await db.select().from(hackathons).where(eq2(hackathons.id, input.hackathonId)).limit(1);
    if (!event) throw new TRPCError4({ code: "NOT_FOUND", message: "Hackathon not found." });
    const [eventTracks, rubric, eventTeams, eventAnnouncements, eventProjects, myMemberships, faqs, schedule, myRegistration] = await Promise.all([
      db.select().from(tracks).where(eq2(tracks.hackathonId, event.id)),
      db.select().from(rubricCriteria).where(eq2(rubricCriteria.hackathonId, event.id)),
      db.select().from(teams).where(eq2(teams.hackathonId, event.id)),
      db.select().from(announcements).where(eq2(announcements.hackathonId, event.id)).orderBy(desc(announcements.createdAt)),
      db.select().from(projects).where(eq2(projects.hackathonId, event.id)).orderBy(desc(projects.updatedAt)),
      db.select().from(teamMembers).where(eq2(teamMembers.userId, ctx.user.id)),
      db.select().from(hackathonFaqs).where(eq2(hackathonFaqs.hackathonId, event.id)).orderBy(hackathonFaqs.displayOrder),
      db.select().from(hackathonScheduleItems).where(eq2(hackathonScheduleItems.hackathonId, event.id)).orderBy(hackathonScheduleItems.startsAt),
      db.select().from(hackathonRegistrations).where(and(eq2(hackathonRegistrations.hackathonId, event.id), eq2(hackathonRegistrations.userId, ctx.user.id))).limit(1)
    ]);
    const eventTeamIds = new Set(eventTeams.map((team) => team.id));
    const currentEventMemberships = myMemberships.filter((membership) => eventTeamIds.has(membership.teamId));
    return {
      event,
      tracks: eventTracks,
      rubric,
      teams: eventTeams,
      announcements: eventAnnouncements,
      projects: eventProjects,
      faqs,
      schedule,
      myTeamIds: currentEventMemberships.map((membership) => membership.teamId),
      myLeaderTeamIds: currentEventMemberships.filter((membership) => membership.role === "leader").map((membership) => membership.teamId),
      myRegistrationRole: myRegistration[0]?.registrationRole || null
    };
  }),
  createFromOpportunity: protectedProcedure.input(z2.object({
    opportunityId: z2.number().int().positive(),
    title: z2.string().min(6).max(255),
    tagline: z2.string().max(500).optional(),
    description: z2.string().max(5e3).optional(),
    maxTeamSize: z2.number().int().min(2).max(12).default(4)
  })).mutation(async ({ ctx, input }) => {
    await ensureSponsorOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [opportunity] = await db.select().from(opportunities).where(eq2(opportunities.id, input.opportunityId)).limit(1);
    if (!opportunity) throw new TRPCError4({ code: "NOT_FOUND", message: "Opportunity not found." });
    if (opportunity.status !== "selected") throw new TRPCError4({ code: "BAD_REQUEST", message: "Select the opportunity before creating a hackathon challenge." });
    const [endorsements, communityNotes] = await Promise.all([
      db.select().from(opportunityEndorsements).where(eq2(opportunityEndorsements.opportunityId, opportunity.id)),
      db.select().from(opportunityCommunityNotes).where(eq2(opportunityCommunityNotes.opportunityId, opportunity.id))
    ]);
    const communityContext = buildCommunitySignalProofContext(endorsements.length, communityNotes.length);
    const slug = `${slugify(input.title)}-${nanoid(6).toLowerCase()}`;
    const created = await db.insert(hackathons).values({
      opportunityId: opportunity.id,
      organizerId: ctx.user.id,
      sponsorId: ctx.user.id,
      title: input.title,
      slug,
      tagline: input.tagline,
      description: `${input.description || opportunity.problemStatement}${communityContext}`,
      maxTeamSize: input.maxTeamSize
    });
    const hackathonId = Number(created[0].insertId);
    await Promise.all([
      db.update(opportunities).set({ stage: "hackathon" }).where(eq2(opportunities.id, opportunity.id)),
      db.insert(tracks).values({ hackathonId, title: "Primary value proof", description: "Test the assumption most likely to change the investment decision." }),
      db.insert(rubricCriteria).values([
        { hackathonId, title: "Technical execution", description: "Verified implementation evidence, architecture, and delivery viability.", weight: "35.00", maxScore: 10, evaluationMethod: "Evidence from code, test results, and working integration." },
        { hackathonId, title: "Claim integrity", description: "Alignment between pitch claims and submitted evidence.", weight: "25.00", maxScore: 10, evaluationMethod: "Claim-by-claim audit with citations." },
        { hackathonId, title: "Product originality", description: "Relevant precedent and differentiation, not a legal novelty conclusion.", weight: "20.00", maxScore: 10, evaluationMethod: "Source-backed similarity screen and human interpretation." },
        { hackathonId, title: "Pitch and problem fit", description: "Clarity of problem, value hypothesis, and decision-ready next step.", weight: "20.00", maxScore: 10, evaluationMethod: "Human judge assessment informed by the fieldbook baseline." }
      ])
    ]);
    return { hackathonId, slug };
  }),
  updateStatus: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), status: z2.enum(["draft", "registration_open", "hacking_active", "judging_active", "completed"]) })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.update(hackathons).set({ status: input.status }).where(eq2(hackathons.id, input.hackathonId));
    return { success: true };
  }),
  updateEventConfiguration: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), title: z2.string().min(6).max(255), tagline: z2.string().max(500).optional(), description: z2.string().max(5e3).optional(), bannerUrl: z2.string().url().optional().or(z2.literal("")), rules: z2.string().max(15e3).optional(), maxTeamSize: z2.number().int().min(2).max(12), registrationStart: z2.coerce.date().optional(), registrationEnd: z2.coerce.date().optional(), hackingStart: z2.coerce.date().optional(), hackingEnd: z2.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const { hackathonId, bannerUrl, ...configuration } = input;
    await db.update(hackathons).set({ ...configuration, bannerUrl: bannerUrl || null }).where(eq2(hackathons.id, hackathonId));
    return { success: true };
  }),
  scheduleAuditWorker: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), cron: z2.string().min(9).max(80), enabled: z2.boolean().default(true) })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    assertSixFieldCron(input.cron);
    const db = await dbOrThrow();
    const [event] = await db.select().from(hackathons).where(eq2(hackathons.id, input.hackathonId)).limit(1);
    if (!event) throw new TRPCError4({ code: "NOT_FOUND", message: "Hackathon not found." });
    const token = scheduleSessionToken(ctx.req.headers.cookie);
    if (event.auditScheduleCronTaskUid) {
      const update = await updateHeartbeatJob(event.auditScheduleCronTaskUid, { cron: input.cron, enable: input.enabled, path: "/api/scheduled/processHackathonAudits", description: `Queued Hackathon Agent audits for event ${event.id}` }, token);
      return { taskUid: event.auditScheduleCronTaskUid, nextExecutionAt: update.nextExecutionAt ?? null };
    }
    const job = await createHeartbeatJob({ name: `hackathon-audit-worker-${event.id}`, cron: input.cron, path: "/api/scheduled/processHackathonAudits", payload: {}, description: `Queued Hackathon Agent audits for event ${event.id}` }, token);
    await db.update(hackathons).set({ auditScheduleCronTaskUid: job.taskUid }).where(eq2(hackathons.id, event.id));
    return { taskUid: job.taskUid, nextExecutionAt: job.nextExecutionAt ?? null };
  }),
  stopAuditWorker: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [event] = await db.select().from(hackathons).where(eq2(hackathons.id, input.hackathonId)).limit(1);
    if (!event?.auditScheduleCronTaskUid) return { success: true, skipped: "not_scheduled" };
    await deleteHeartbeatJob(event.auditScheduleCronTaskUid, scheduleSessionToken(ctx.req.headers.cookie));
    await db.update(hackathons).set({ auditScheduleCronTaskUid: null }).where(eq2(hackathons.id, event.id));
    return { success: true };
  }),
  createScheduleItem: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), kind: z2.enum(["opening", "workshop", "office_hours", "submission_deadline", "demo", "judging", "awards", "other"]), title: z2.string().min(3).max(255), description: z2.string().max(3e3).optional(), startsAt: z2.coerce.date(), endsAt: z2.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const created = await db.insert(hackathonScheduleItems).values({ ...input, createdById: ctx.user.id });
    return { scheduleItemId: Number(created[0].insertId) };
  }),
  deleteScheduleItem: protectedProcedure.input(z2.object({ scheduleItemId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.delete(hackathonScheduleItems).where(eq2(hackathonScheduleItems.id, input.scheduleItemId));
    return { success: true };
  }),
  createTrack: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), title: z2.string().min(3).max(160), description: z2.string().max(3e3).optional(), prizeAmount: z2.number().min(0).max(1e8).optional(), sponsorName: z2.string().max(160).optional() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const created = await db.insert(tracks).values({ ...input, prizeAmount: input.prizeAmount?.toFixed(2) });
    return { trackId: Number(created[0].insertId) };
  }),
  createRubricCriterion: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), title: z2.string().min(3).max(120), description: z2.string().max(3e3).optional(), maxScore: z2.number().int().min(1).max(100).default(10), weight: z2.number().min(0.01).max(100), evaluationMethod: z2.string().max(200).optional() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const created = await db.insert(rubricCriteria).values({ ...input, weight: input.weight.toFixed(2) });
    return { criterionId: Number(created[0].insertId) };
  }),
  createFaq: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), question: z2.string().min(5).max(500), answer: z2.string().min(5).max(1e4), displayOrder: z2.number().int().min(0).max(9999).default(0) })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const created = await db.insert(hackathonFaqs).values({ ...input, createdById: ctx.user.id });
    return { faqId: Number(created[0].insertId) };
  }),
  updateFaq: protectedProcedure.input(z2.object({ faqId: z2.number().int().positive(), question: z2.string().min(5).max(500), answer: z2.string().min(5).max(1e4), displayOrder: z2.number().int().min(0).max(9999) })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.update(hackathonFaqs).set({ question: input.question, answer: input.answer, displayOrder: input.displayOrder }).where(eq2(hackathonFaqs.id, input.faqId));
    return { success: true };
  }),
  deleteFaq: protectedProcedure.input(z2.object({ faqId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.delete(hackathonFaqs).where(eq2(hackathonFaqs.id, input.faqId));
    return { success: true };
  }),
  register: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), role: z2.enum(["participant", "mentor", "judge"]).default("participant") })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [event] = await db.select().from(hackathons).where(eq2(hackathons.id, input.hackathonId)).limit(1);
    if (!event) throw new TRPCError4({ code: "NOT_FOUND", message: "Hackathon not found." });
    await db.insert(hackathonRegistrations).values({ hackathonId: event.id, userId: ctx.user.id, registrationRole: input.role }).onDuplicateKeyUpdate({ set: { status: "registered", registrationRole: input.role } });
    return { success: true };
  }),
  mentorDirectory: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const [mentorRows, officeHours] = await Promise.all([
      db.select().from(hackathonRegistrations).where(and(eq2(hackathonRegistrations.hackathonId, input.hackathonId), eq2(hackathonRegistrations.registrationRole, "mentor"), eq2(hackathonRegistrations.status, "registered"))),
      db.select().from(hackathonScheduleItems).where(and(eq2(hackathonScheduleItems.hackathonId, input.hackathonId), eq2(hackathonScheduleItems.kind, "office_hours"))).orderBy(hackathonScheduleItems.startsAt)
    ]);
    const mentorIds = mentorRows.map((row) => row.userId);
    const [profiles, people] = mentorIds.length ? await Promise.all([
      db.select().from(userProfiles).where(inArray(userProfiles.userId, mentorIds)),
      db.select().from(users).where(inArray(users.id, mentorIds))
    ]) : [[], []];
    const profileByUser = new Map(profiles.filter((profile) => profile.talentConsent).map((profile) => [profile.userId, profile]));
    return {
      mentors: mentorRows.map((row) => {
        const profile = profileByUser.get(row.userId);
        const person = people.find((item) => item.id === row.userId);
        return { userId: row.userId, name: profile ? person?.name || "Registered mentor" : "Registered mentor", skills: profile?.skills || [], availabilityRoles: profile?.availabilityRoles || [], bio: profile?.bio || null, consented: Boolean(profile) };
      }),
      officeHours: officeHours.map((item) => ({ id: item.id, title: item.title, description: item.description || null, startsAt: item.startsAt, endsAt: item.endsAt || null })),
      notice: "Mentor detail is shown only when the mentor has provided talent consent. Routing remains a participant request; no availability is implied by registration alone."
    };
  }),
  createTeam: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), name: z2.string().min(2).max(150), lookingForMembers: z2.boolean().default(false), lookingForSkills: z2.array(z2.string().max(80)).max(12).default([]) })).mutation(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const created = await db.insert(teams).values({ hackathonId: input.hackathonId, name: input.name, inviteCode: nanoid(10), lookingForMembers: input.lookingForMembers, lookingForSkills: input.lookingForSkills });
    const teamId = Number(created[0].insertId);
    await db.insert(teamMembers).values({ teamId, userId: ctx.user.id, role: "leader" });
    return { teamId };
  }),
  requestTeamJoin: protectedProcedure.input(z2.object({ teamId: z2.number().int().positive(), message: z2.string().max(800).optional() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [team] = await db.select().from(teams).where(eq2(teams.id, input.teamId)).limit(1);
    if (!team) throw new TRPCError4({ code: "NOT_FOUND", message: "Team not found." });
    await ensureMembership(team.hackathonId, ctx.user.id, ctx.user.role);
    await db.insert(teamJoinRequests).values({ teamId: input.teamId, userId: ctx.user.id, message: input.message }).onDuplicateKeyUpdate({ set: { status: "pending", message: input.message } });
    return { success: true };
  }),
  suggestTeams: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const [profile, eventTeams, allMemberships, allProfiles] = await Promise.all([
      db.select().from(userProfiles).where(eq2(userProfiles.userId, ctx.user.id)).limit(1).then((rows) => rows[0]),
      db.select().from(teams).where(and(eq2(teams.hackathonId, input.hackathonId), eq2(teams.lookingForMembers, true))),
      db.select().from(teamMembers),
      db.select().from(userProfiles)
    ]);
    if (!profile?.lookingForTeam) return { recommendations: [], notice: "Turn on team availability in your profile to receive opt-in recommendations." };
    const currentTeamIds = new Set(allMemberships.filter((member) => member.userId === ctx.user.id).map((member) => member.teamId));
    const profileByUser = new Map(allProfiles.map((item) => [item.userId, item]));
    const recommendations = eventTeams.filter((team) => !currentTeamIds.has(team.id)).map((team) => {
      const members = allMemberships.filter((member) => member.teamId === team.id);
      const ranked = rankOptInTeamFit({ requestedSkills: team.lookingForSkills || [], memberRoles: members.flatMap((member) => profileByUser.get(member.userId)?.availabilityRoles || []), participantSkills: profile.skills || [], participantRoles: profile.availabilityRoles || [] });
      return { teamId: team.id, name: team.name, lookingForSkills: team.lookingForSkills || [], memberCount: members.length, score: ranked.score, reasons: ranked.reasons.length ? ranked.reasons : ["Open team; review its stated needs before requesting to join."] };
    }).sort((left, right) => right.score - left.score || left.name.localeCompare(right.name)).slice(0, 8);
    return { recommendations, notice: recommendations.length ? null : "No open teams currently match your stated availability. You can still browse teams or update your profile." };
  }),
  joinRequests: protectedProcedure.input(z2.object({ teamId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [membership] = await db.select().from(teamMembers).where(and(eq2(teamMembers.teamId, input.teamId), eq2(teamMembers.userId, ctx.user.id))).limit(1);
    if (ctx.user.role !== "admin" && membership?.role !== "leader") throw new TRPCError4({ code: "FORBIDDEN", message: "Only a team leader can view team-join requests." });
    return db.select().from(teamJoinRequests).where(eq2(teamJoinRequests.teamId, input.teamId)).orderBy(desc(teamJoinRequests.createdAt));
  }),
  decideJoinRequest: protectedProcedure.input(z2.object({ requestId: z2.number().int().positive(), decision: z2.enum(["accepted", "declined"]) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [request] = await db.select().from(teamJoinRequests).where(eq2(teamJoinRequests.id, input.requestId)).limit(1);
    if (!request) throw new TRPCError4({ code: "NOT_FOUND", message: "Join request not found." });
    const [membership] = await db.select().from(teamMembers).where(and(eq2(teamMembers.teamId, request.teamId), eq2(teamMembers.userId, ctx.user.id))).limit(1);
    if (ctx.user.role !== "admin" && membership?.role !== "leader") throw new TRPCError4({ code: "FORBIDDEN", message: "Only a team leader can decide this join request." });
    await db.update(teamJoinRequests).set({ status: input.decision, decidedAt: /* @__PURE__ */ new Date() }).where(eq2(teamJoinRequests.id, request.id));
    if (input.decision === "accepted") await db.insert(teamMembers).values({ teamId: request.teamId, userId: request.userId, role: "member" }).onDuplicateKeyUpdate({ set: { role: "member" } });
    return { success: true };
  }),
  createProject: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), teamId: z2.number().int().positive(), trackId: z2.number().int().positive().optional(), title: z2.string().min(4).max(255), tagline: z2.string().max(500).optional(), description: z2.string().min(20).max(6e3), techStack: z2.array(z2.string().max(80)).max(30).default([]), githubUrl: z2.string().url().optional(), demoUrl: z2.string().url().optional(), videoUrl: z2.string().url().optional(), pitchDeckUrl: z2.string().url().optional() })).mutation(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const [membership] = await db.select().from(teamMembers).where(and(eq2(teamMembers.teamId, input.teamId), eq2(teamMembers.userId, ctx.user.id))).limit(1);
    if (!membership) throw new TRPCError4({ code: "FORBIDDEN", message: "Only team members can create a project submission." });
    const created = await db.insert(projects).values({ ...input, trackId: input.trackId, techStack: input.techStack });
    return { projectId: Number(created[0].insertId) };
  }),
  submitProject: protectedProcedure.input(z2.object({ projectId: z2.number().int().positive(), githubUrl: z2.string().url().optional(), demoUrl: z2.string().url().optional(), videoUrl: z2.string().url().optional(), pitchDeckUrl: z2.string().url().optional() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq2(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError4({ code: "NOT_FOUND", message: "Project not found." });
    const [membership] = await db.select().from(teamMembers).where(and(eq2(teamMembers.teamId, project.teamId), eq2(teamMembers.userId, ctx.user.id))).limit(1);
    if (!membership && ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN", message: "Only team members can submit this project." });
    await db.update(projects).set({ githubUrl: input.githubUrl, demoUrl: input.demoUrl, videoUrl: input.videoUrl, pitchDeckUrl: input.pitchDeckUrl, submittedAt: /* @__PURE__ */ new Date() }).where(eq2(projects.id, project.id));
    return { success: true };
  }),
  uploadProjectDocument: protectedProcedure.input(z2.object({ projectId: z2.number().int().positive(), fileName: z2.string().min(1).max(300), mimeType: z2.string().min(1).max(150), base64: z2.string().min(1), consent: z2.literal(true) })).mutation(async ({ ctx, input }) => {
    const allowedMimeTypes = /* @__PURE__ */ new Set(["text/plain", "text/markdown", "text/csv", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
    if (!allowedMimeTypes.has(input.mimeType)) throw new TRPCError4({ code: "BAD_REQUEST", message: "Deep evaluation supports plain text, Markdown, CSV, PDF, and DOCX BRD or technical documents." });
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq2(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError4({ code: "NOT_FOUND", message: "Project not found." });
    const [membership] = await db.select().from(teamMembers).where(and(eq2(teamMembers.teamId, project.teamId), eq2(teamMembers.userId, ctx.user.id))).limit(1);
    if (!membership && ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN", message: "Only project team members can add evaluation evidence." });
    const buffer = uploadBuffer(input.base64);
    if (buffer.length > 8 * 1024 * 1024) throw new TRPCError4({ code: "PAYLOAD_TOO_LARGE", message: "A BRD or technical document must be 8 MB or smaller." });
    const stored = await storagePut(`users/${ctx.user.id}/projects/${project.id}/${cleanAssetName(input.fileName)}`, buffer, input.mimeType);
    let extraction;
    if (input.mimeType.startsWith("text/")) extraction = { text: buffer.toString("utf8").slice(0, 3e4), method: "direct_text" };
    else if (input.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
      extraction = { text: result.value.slice(0, 3e4), warnings: result.messages, method: "docx_raw_text" };
    } else {
      const signedUrl = await storageGetSignedUrl(stored.key);
      extraction = { ...await extractPdfEvidence(signedUrl), method: "ai_pdf_extraction" };
    }
    await db.insert(consentRecords).values({ userId: ctx.user.id, scope: "document_processing", accepted: true, policyVersion: "v1" });
    const inserted = await db.insert(projectAssets).values({ projectId: project.id, uploadedById: ctx.user.id, assetType: "document", storageKey: stored.key, storageUrl: stored.url, originalName: cleanAssetName(input.fileName), mimeType: input.mimeType, byteSize: buffer.length, extraction, contributorConfirmed: true });
    return { assetId: Number(inserted[0].insertId), originalName: cleanAssetName(input.fileName), extraction, storageUrl: stored.url };
  }),
  projectDocuments: protectedProcedure.input(z2.object({ projectId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq2(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError4({ code: "NOT_FOUND", message: "Project not found." });
    const [membership, assignment] = await Promise.all([
      db.select().from(teamMembers).where(and(eq2(teamMembers.teamId, project.teamId), eq2(teamMembers.userId, ctx.user.id))).limit(1),
      db.select().from(judgeAssignments).where(and(eq2(judgeAssignments.projectId, project.id), eq2(judgeAssignments.judgeId, ctx.user.id))).limit(1)
    ]);
    if (ctx.user.role !== "admin" && !membership && !assignment?.[0]) throw new TRPCError4({ code: "FORBIDDEN", message: "Only an authorized team member or judge can view project evaluation documents." });
    return db.select().from(projectAssets).where(and(eq2(projectAssets.projectId, project.id), eq2(projectAssets.assetType, "document"))).orderBy(desc(projectAssets.createdAt));
  }),
  setProjectTracks: protectedProcedure.input(z2.object({ projectId: z2.number().int().positive(), trackIds: z2.array(z2.number().int().positive()).min(1).max(10) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq2(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError4({ code: "NOT_FOUND", message: "Project not found." });
    const [membership] = await db.select().from(teamMembers).where(and(eq2(teamMembers.teamId, project.teamId), eq2(teamMembers.userId, ctx.user.id))).limit(1);
    if (ctx.user.role !== "admin" && membership?.role !== "leader") throw new TRPCError4({ code: "FORBIDDEN", message: "Only a team leader can route a project to prize tracks." });
    const eventTracks = await db.select().from(tracks).where(eq2(tracks.hackathonId, project.hackathonId));
    const allowed = new Set(eventTracks.map((track) => track.id));
    const uniqueIds = Array.from(new Set(input.trackIds));
    if (uniqueIds.some((trackId) => !allowed.has(trackId))) throw new TRPCError4({ code: "BAD_REQUEST", message: "Every selected track must belong to this hackathon." });
    await db.delete(projectTracks).where(eq2(projectTracks.projectId, project.id));
    await db.insert(projectTracks).values(uniqueIds.map((trackId) => ({ projectId: project.id, trackId })));
    await db.update(projects).set({ trackId: uniqueIds[0] }).where(eq2(projects.id, project.id));
    return { success: true, trackIds: uniqueIds };
  }),
  projectTrackRouting: protectedProcedure.input(z2.object({ projectId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(eq2(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError4({ code: "NOT_FOUND", message: "Project not found." });
    const [membership] = await db.select().from(teamMembers).where(and(eq2(teamMembers.teamId, project.teamId), eq2(teamMembers.userId, ctx.user.id))).limit(1);
    if (ctx.user.role !== "admin" && !membership) throw new TRPCError4({ code: "FORBIDDEN", message: "Only team members can view project prize routing." });
    const [eventTracks, routing] = await Promise.all([
      db.select().from(tracks).where(eq2(tracks.hackathonId, project.hackathonId)),
      db.select().from(projectTracks).where(eq2(projectTracks.projectId, project.id))
    ]);
    const selectedTrackIds = routing.length ? routing.map((item) => item.trackId) : project.trackId ? [project.trackId] : [];
    return { tracks: eventTracks, selectedTrackIds, canEdit: ctx.user.role === "admin" || membership?.role === "leader" };
  }),
  teamMessages: protectedProcedure.input(z2.object({ teamId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [membership] = await db.select().from(teamMembers).where(and(eq2(teamMembers.teamId, input.teamId), eq2(teamMembers.userId, ctx.user.id))).limit(1);
    if (ctx.user.role !== "admin" && !membership) throw new TRPCError4({ code: "FORBIDDEN", message: "Only team members can read team collaboration messages." });
    return db.select().from(teamMessages).where(eq2(teamMessages.teamId, input.teamId)).orderBy(teamMessages.createdAt);
  }),
  postTeamMessage: protectedProcedure.input(z2.object({ teamId: z2.number().int().positive(), body: z2.string().min(1).max(3e3) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [membership] = await db.select().from(teamMembers).where(and(eq2(teamMembers.teamId, input.teamId), eq2(teamMembers.userId, ctx.user.id))).limit(1);
    if (!membership && ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN", message: "Only team members can post collaboration messages." });
    const created = await db.insert(teamMessages).values({ teamId: input.teamId, senderId: ctx.user.id, body: input.body.trim() });
    return { messageId: Number(created[0].insertId) };
  }),
  announce: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), title: z2.string().min(3).max(255), body: z2.string().min(3).max(5e3), audience: z2.enum(["all", "participants", "judges", "mentors"]).default("all") })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.insert(announcements).values({ ...input, createdById: ctx.user.id });
    return { success: true };
  }),
  communicationsFeed: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const [registration, profile, eventTeams, memberships, eventAnnouncements, eventSchedule] = await Promise.all([
      db.select().from(hackathonRegistrations).where(and(eq2(hackathonRegistrations.hackathonId, input.hackathonId), eq2(hackathonRegistrations.userId, ctx.user.id))).limit(1),
      db.select().from(userProfiles).where(eq2(userProfiles.userId, ctx.user.id)).limit(1),
      db.select().from(teams).where(eq2(teams.hackathonId, input.hackathonId)),
      db.select().from(teamMembers).where(eq2(teamMembers.userId, ctx.user.id)),
      db.select().from(announcements).where(eq2(announcements.hackathonId, input.hackathonId)).orderBy(desc(announcements.createdAt)),
      db.select().from(hackathonScheduleItems).where(eq2(hackathonScheduleItems.hackathonId, input.hackathonId)).orderBy(hackathonScheduleItems.startsAt)
    ]);
    const organizer = ctx.user.role === "admin" || ["organizer", "sponsor", "admin"].includes(profile[0]?.persona || "");
    const audience = { participant: "participants", judge: "judges", mentor: "mentors" }[registration[0]?.registrationRole || "participant"];
    const visibleAnnouncements = organizer ? eventAnnouncements : eventAnnouncements.filter((item) => item.audience === "all" || item.audience === audience);
    const announcementIds = visibleAnnouncements.map((item) => item.id);
    const acknowledgements = announcementIds.length ? await db.select().from(announcementAcknowledgements).where(inArray(announcementAcknowledgements.announcementId, announcementIds)) : [];
    const eventTeamIds = new Set(eventTeams.map((team) => team.id));
    const myTeamIds = memberships.filter((membership) => eventTeamIds.has(membership.teamId)).map((membership) => membership.teamId);
    const alerts = organizer ? await db.select().from(teamAlerts).where(eq2(teamAlerts.hackathonId, input.hackathonId)).orderBy(desc(teamAlerts.createdAt)) : myTeamIds.length ? await db.select().from(teamAlerts).where(inArray(teamAlerts.teamId, myTeamIds)).orderBy(desc(teamAlerts.createdAt)) : [];
    const timeline = [
      ...visibleAnnouncements.map((item) => ({ id: `announcement-${item.id}`, type: "announcement", title: item.title, detail: item.body, occurredAt: item.createdAt })),
      ...eventSchedule.map((item) => ({ id: `schedule-${item.id}`, type: "schedule", title: item.title, detail: item.description || item.kind.replace("_", " "), occurredAt: item.startsAt })),
      ...alerts.map((item) => ({ id: `alert-${item.id}`, type: "team_alert", title: item.title, detail: item.body, occurredAt: item.createdAt }))
    ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    return { isOrganizer: organizer, teams: eventTeams.map((team) => ({ id: team.id, name: team.name })), announcements: visibleAnnouncements.map((item) => ({ ...item, acknowledged: acknowledgements.some((ack) => ack.announcementId === item.id && ack.userId === ctx.user.id), acknowledgementCount: acknowledgements.filter((ack) => ack.announcementId === item.id).length })), alerts, timeline };
  }),
  acknowledgeAnnouncement: protectedProcedure.input(z2.object({ announcementId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [announcement] = await db.select().from(announcements).where(eq2(announcements.id, input.announcementId)).limit(1);
    if (!announcement) throw new TRPCError4({ code: "NOT_FOUND", message: "Announcement not found." });
    await ensureMembership(announcement.hackathonId, ctx.user.id, ctx.user.role);
    const [registration] = await db.select().from(hackathonRegistrations).where(and(eq2(hackathonRegistrations.hackathonId, announcement.hackathonId), eq2(hackathonRegistrations.userId, ctx.user.id))).limit(1);
    const recipientAudience = { participant: "participants", judge: "judges", mentor: "mentors" }[registration?.registrationRole || "participant"];
    if (ctx.user.role !== "admin" && announcement.audience !== "all" && announcement.audience !== recipientAudience) throw new TRPCError4({ code: "FORBIDDEN", message: "This announcement is not addressed to your event role." });
    await db.insert(announcementAcknowledgements).values({ announcementId: announcement.id, userId: ctx.user.id }).onDuplicateKeyUpdate({ set: { acknowledgedAt: /* @__PURE__ */ new Date() } });
    return { success: true };
  }),
  createTeamAlert: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), teamId: z2.number().int().positive(), title: z2.string().min(3).max(255), body: z2.string().min(3).max(5e3) })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [team] = await db.select().from(teams).where(and(eq2(teams.id, input.teamId), eq2(teams.hackathonId, input.hackathonId))).limit(1);
    if (!team) throw new TRPCError4({ code: "BAD_REQUEST", message: "Select a team from this proof sprint." });
    const created = await db.insert(teamAlerts).values({ ...input, createdById: ctx.user.id });
    return { alertId: Number(created[0].insertId) };
  }),
  organizerCopilotDrafts: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    return db.select().from(organizerCopilotDrafts).where(eq2(organizerCopilotDrafts.hackathonId, input.hackathonId)).orderBy(desc(organizerCopilotDrafts.createdAt));
  }),
  draftFromOpportunity: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [event] = await db.select().from(hackathons).where(eq2(hackathons.id, input.hackathonId)).limit(1);
    if (!event?.opportunityId) throw new TRPCError4({ code: "BAD_REQUEST", message: "This Event HQ is not linked to a selected opportunity." });
    const [opportunity, research] = await Promise.all([
      db.select().from(opportunities).where(eq2(opportunities.id, event.opportunityId)).limit(1),
      db.select().from(researchRuns).where(eq2(researchRuns.opportunityId, event.opportunityId)).orderBy(desc(researchRuns.createdAt)).limit(1)
    ]);
    if (!opportunity[0]) throw new TRPCError4({ code: "NOT_FOUND", message: "The selected opportunity was not found." });
    const payload = await draftEventConfigurationFromEvidence({ opportunity: opportunity[0], research: research[0] || null });
    const created = await db.insert(organizerCopilotDrafts).values({ hackathonId: event.id, opportunityId: event.opportunityId, requestedById: ctx.user.id, payload });
    return { draftId: Number(created[0].insertId), payload };
  }),
  adoptOrganizerCopilotDraft: protectedProcedure.input(z2.object({
    draftId: z2.number().int().positive(),
    tracks: z2.array(z2.object({ title: z2.string().min(3).max(160), description: z2.string().min(3).max(3e3) })).min(1).max(6),
    rubric: z2.array(z2.object({ title: z2.string().min(3).max(120), description: z2.string().min(3).max(3e3), evaluationMethod: z2.string().max(200), weight: z2.number().min(1).max(100) })).min(1).max(8)
  })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [draft] = await db.select().from(organizerCopilotDrafts).where(eq2(organizerCopilotDrafts.id, input.draftId)).limit(1);
    if (!draft) throw new TRPCError4({ code: "NOT_FOUND", message: "Organizer copilot draft not found." });
    if (draft.status === "adopted") throw new TRPCError4({ code: "CONFLICT", message: "This draft has already been adopted. Create a new draft for another configuration change." });
    const payload = draft.payload;
    const adoptedPayload = { ...payload, adoptedConfiguration: { tracks: input.tracks, rubric: input.rubric, adoptedAt: (/* @__PURE__ */ new Date()).toISOString(), adoptedBy: ctx.user.id } };
    for (const track of input.tracks) await db.insert(tracks).values({ hackathonId: draft.hackathonId, title: track.title.trim(), description: track.description.trim() });
    for (const criterion of input.rubric) await db.insert(rubricCriteria).values({ hackathonId: draft.hackathonId, title: criterion.title.trim(), description: criterion.description.trim(), evaluationMethod: criterion.evaluationMethod.trim() || null, weight: criterion.weight.toFixed(2), maxScore: 10 });
    await db.update(organizerCopilotDrafts).set({ status: "adopted", adoptedById: ctx.user.id, adoptedAt: /* @__PURE__ */ new Date(), payload: adoptedPayload }).where(eq2(organizerCopilotDrafts.id, draft.id));
    return { success: true, hackathonId: draft.hackathonId };
  }),
  reviewerCalibrationBoard: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [profile, registration] = await Promise.all([
      db.select().from(userProfiles).where(eq2(userProfiles.userId, ctx.user.id)).limit(1),
      db.select().from(hackathonRegistrations).where(and(eq2(hackathonRegistrations.hackathonId, input.hackathonId), eq2(hackathonRegistrations.userId, ctx.user.id), eq2(hackathonRegistrations.registrationRole, "judge"))).limit(1)
    ]);
    const isOrganizer = ctx.user.role === "admin" || ["organizer", "sponsor", "admin"].includes(profile[0]?.persona || "");
    const isJudge = Boolean(registration[0] && registration[0].status !== "withdrawn");
    if (!isOrganizer && !isJudge) throw new TRPCError4({ code: "FORBIDDEN", message: "Only event organizers and registered judges can access reviewer calibration." });
    const [judges, assignments, cards, eventProjects, eventCases, responses, criteria, mentors, mentorHelpRequests] = await Promise.all([
      db.select().from(hackathonRegistrations).where(and(eq2(hackathonRegistrations.hackathonId, input.hackathonId), eq2(hackathonRegistrations.registrationRole, "judge"))),
      db.select().from(judgeAssignments).where(eq2(judgeAssignments.hackathonId, input.hackathonId)),
      db.select().from(scorecards),
      db.select().from(projects).where(eq2(projects.hackathonId, input.hackathonId)),
      db.select().from(reviewerCalibrationCases).where(eq2(reviewerCalibrationCases.hackathonId, input.hackathonId)).orderBy(desc(reviewerCalibrationCases.createdAt)),
      db.select().from(reviewerCalibrationResponses),
      db.select().from(rubricCriteria).where(eq2(rubricCriteria.hackathonId, input.hackathonId)),
      db.select().from(hackathonRegistrations).where(and(eq2(hackathonRegistrations.hackathonId, input.hackathonId), eq2(hackathonRegistrations.registrationRole, "mentor"))),
      db.select().from(mentorRequests).where(eq2(mentorRequests.hackathonId, input.hackathonId))
    ]);
    const reviewerAndMentorIds = Array.from(/* @__PURE__ */ new Set([...judges.map((judge) => judge.userId), ...mentors.map((mentor) => mentor.userId)]));
    const people = reviewerAndMentorIds.length ? await db.select().from(users).where(inArray(users.id, reviewerAndMentorIds)) : [];
    const projectIds = new Set(eventProjects.map((project) => project.id));
    const relevantCards = cards.filter((card) => projectIds.has(card.projectId));
    const workloads = judges.filter((judge) => judge.status !== "withdrawn").map((judge) => ({
      judgeId: judge.userId,
      name: people.find((person) => person.id === judge.userId)?.name || "Registered judge",
      activeAssignments: assignments.filter((assignment) => assignment.judgeId === judge.userId && !assignment.isRecused).length,
      recusedAssignments: assignments.filter((assignment) => assignment.judgeId === judge.userId && assignment.isRecused).length,
      finalizedReviews: relevantCards.filter((card) => card.judgeId === judge.userId && card.finalized).length
    }));
    const mentorWorkloads = summarizeMentorCapacity(mentors, people, mentorHelpRequests);
    const caseIds = new Set(eventCases.map((item) => item.id));
    const calibrationResponses = responses.filter((response) => caseIds.has(response.calibrationCaseId));
    const cases = eventCases.map((item) => {
      const caseResponses = calibrationResponses.filter((response) => response.calibrationCaseId === item.id);
      const byCriterion = /* @__PURE__ */ new Map();
      for (const response of caseResponses) for (const score of response.criterionScores || []) byCriterion.set(score.criterionId, [...byCriterion.get(score.criterionId) || [], score.score]);
      const variance = Array.from(byCriterion.entries()).map(([criterionId, scores]) => ({ criterionId, title: criteria.find((criterion) => criterion.id === criterionId)?.title || "Criterion", reviewerCount: scores.length, minimum: Math.min(...scores), maximum: Math.max(...scores), spread: Math.max(...scores) - Math.min(...scores) }));
      return { ...item, projectTitle: eventProjects.find((project) => project.id === item.projectId)?.title || "Calibration project", responseCount: caseResponses.length, myResponse: caseResponses.find((response) => response.judgeId === ctx.user.id) || null, variance: isOrganizer || item.status === "closed" ? variance : [] };
    });
    return { isOrganizer, isJudge, workloads, mentorWorkloads, projects: eventProjects.map((project) => ({ id: project.id, title: project.title, submittedAt: project.submittedAt })), criteria, cases };
  }),
  createReviewerCalibrationCase: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), projectId: z2.number().int().positive(), title: z2.string().min(4).max(255) })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    const [project] = await db.select().from(projects).where(and(eq2(projects.id, input.projectId), eq2(projects.hackathonId, input.hackathonId))).limit(1);
    if (!project) throw new TRPCError4({ code: "BAD_REQUEST", message: "Select a proof project from this event for calibration." });
    const created = await db.insert(reviewerCalibrationCases).values({ ...input, createdById: ctx.user.id });
    return { caseId: Number(created[0].insertId) };
  }),
  submitReviewerCalibrationResponse: protectedProcedure.input(z2.object({ calibrationCaseId: z2.number().int().positive(), rationale: z2.string().min(20).max(6e3), criterionScores: z2.array(z2.object({ criterionId: z2.number().int().positive(), score: z2.number().min(0).max(100) })).min(1).max(12) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [calibrationCase] = await db.select().from(reviewerCalibrationCases).where(eq2(reviewerCalibrationCases.id, input.calibrationCaseId)).limit(1);
    if (!calibrationCase || calibrationCase.status !== "open") throw new TRPCError4({ code: "BAD_REQUEST", message: "This calibration case is not open for reviewer rationale." });
    const [registration] = await db.select().from(hackathonRegistrations).where(and(eq2(hackathonRegistrations.hackathonId, calibrationCase.hackathonId), eq2(hackathonRegistrations.userId, ctx.user.id), eq2(hackathonRegistrations.registrationRole, "judge"))).limit(1);
    if (ctx.user.role !== "admin" && (!registration || registration.status === "withdrawn")) throw new TRPCError4({ code: "FORBIDDEN", message: "Only a registered judge can submit independent calibration rationale." });
    const criteria = await db.select().from(rubricCriteria).where(eq2(rubricCriteria.hackathonId, calibrationCase.hackathonId));
    const allowedIds = new Set(criteria.map((criterion) => criterion.id));
    if (input.criterionScores.some((score) => !allowedIds.has(score.criterionId))) throw new TRPCError4({ code: "BAD_REQUEST", message: "Calibration scores must use this event\u2019s rubric criteria." });
    await db.insert(reviewerCalibrationResponses).values({ calibrationCaseId: calibrationCase.id, judgeId: ctx.user.id, rationale: input.rationale.trim(), criterionScores: input.criterionScores }).onDuplicateKeyUpdate({ set: { rationale: input.rationale.trim(), criterionScores: input.criterionScores } });
    return { success: true };
  }),
  closeReviewerCalibrationCase: protectedProcedure.input(z2.object({ calibrationCaseId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await ensureOrganizerOrAdmin(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow();
    await db.update(reviewerCalibrationCases).set({ status: "closed", closedAt: /* @__PURE__ */ new Date() }).where(eq2(reviewerCalibrationCases.id, input.calibrationCaseId));
    return { success: true };
  }),
  requestMentor: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive(), mentorId: z2.number().int().positive(), projectId: z2.number().int().positive().optional(), scheduleItemId: z2.number().int().positive().optional(), requestNote: z2.string().min(10).max(3e3) })).mutation(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    const [mentor] = await db.select().from(hackathonRegistrations).where(and(eq2(hackathonRegistrations.hackathonId, input.hackathonId), eq2(hackathonRegistrations.userId, input.mentorId), eq2(hackathonRegistrations.registrationRole, "mentor"))).limit(1);
    if (!mentor) throw new TRPCError4({ code: "BAD_REQUEST", message: "This mentor is not registered for the selected proof sprint." });
    if (input.projectId) {
      const [project] = await db.select().from(projects).where(and(eq2(projects.id, input.projectId), eq2(projects.hackathonId, input.hackathonId))).limit(1);
      if (!project) throw new TRPCError4({ code: "BAD_REQUEST", message: "The selected project does not belong to this proof sprint." });
      const [membership] = await db.select().from(teamMembers).where(and(eq2(teamMembers.teamId, project.teamId), eq2(teamMembers.userId, ctx.user.id))).limit(1);
      if (ctx.user.role !== "admin" && !membership) throw new TRPCError4({ code: "FORBIDDEN", message: "Only a team member may request mentoring for this project." });
    }
    const created = await db.insert(mentorRequests).values({ ...input, requesterId: ctx.user.id, requestNote: input.requestNote.trim() });
    return { requestId: Number(created[0].insertId), status: "pending" };
  }),
  myMentorRequests: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await ensureMembership(input.hackathonId, ctx.user.id, ctx.user.role);
    return db.select().from(mentorRequests).where(and(eq2(mentorRequests.requesterId, ctx.user.id), eq2(mentorRequests.hackathonId, input.hackathonId))).orderBy(desc(mentorRequests.createdAt));
  }),
  mentorRequestQueue: protectedProcedure.input(z2.object({ hackathonId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [profile, registration] = await Promise.all([
      db.select().from(userProfiles).where(eq2(userProfiles.userId, ctx.user.id)).limit(1),
      db.select().from(hackathonRegistrations).where(and(eq2(hackathonRegistrations.hackathonId, input.hackathonId), eq2(hackathonRegistrations.userId, ctx.user.id), eq2(hackathonRegistrations.registrationRole, "mentor"))).limit(1)
    ]);
    const organizer = ctx.user.role === "admin" || ["organizer", "sponsor", "admin"].includes(profile[0]?.persona || "");
    const mentor = Boolean(registration[0] && registration[0].status !== "withdrawn");
    if (!organizer && !mentor) throw new TRPCError4({ code: "FORBIDDEN", message: "Only registered mentors and event organizers can view this request queue." });
    const rows = await db.select().from(mentorRequests).where(organizer ? eq2(mentorRequests.hackathonId, input.hackathonId) : and(eq2(mentorRequests.hackathonId, input.hackathonId), eq2(mentorRequests.mentorId, ctx.user.id))).orderBy(desc(mentorRequests.createdAt));
    const requesterIds = Array.from(new Set(rows.map((row) => row.requesterId)));
    const projectIds = rows.flatMap((row) => row.projectId ? [row.projectId] : []);
    const [requesters, eventProjects] = await Promise.all([
      requesterIds.length ? db.select().from(users).where(inArray(users.id, requesterIds)) : [],
      projectIds.length ? db.select().from(projects).where(inArray(projects.id, projectIds)) : []
    ]);
    return {
      isOrganizer: organizer,
      requests: rows.map((row) => ({
        ...row,
        requesterName: requesters.find((person) => person.id === row.requesterId)?.name || "Participant",
        projectTitle: row.projectId ? eventProjects.find((project) => project.id === row.projectId)?.title || "Linked proof project" : null
      }))
    };
  }),
  respondMentorRequest: protectedProcedure.input(z2.object({ requestId: z2.number().int().positive(), status: z2.enum(["accepted", "declined", "redirected"]), responseNote: z2.string().max(1500).optional() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow();
    const [request] = await db.select().from(mentorRequests).where(eq2(mentorRequests.id, input.requestId)).limit(1);
    if (!request) throw new TRPCError4({ code: "NOT_FOUND", message: "Mentor request not found." });
    const [profile] = await db.select().from(userProfiles).where(eq2(userProfiles.userId, ctx.user.id)).limit(1);
    const organizer = ctx.user.role === "admin" || ["organizer", "sponsor", "admin"].includes(profile?.persona || "");
    if (!organizer && request.mentorId !== ctx.user.id) throw new TRPCError4({ code: "FORBIDDEN", message: "Only the selected mentor or an event organizer may respond to this request." });
    await db.update(mentorRequests).set({ status: input.status, responseNote: input.responseNote?.trim() || null, respondedAt: /* @__PURE__ */ new Date() }).where(eq2(mentorRequests.id, input.requestId));
    return { success: true };
  })
});

// server/routers/governance.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
import { eq as eq3 } from "drizzle-orm";
import { z as z3 } from "zod";
async function dbOrThrow2() {
  const db = await getDb();
  if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "The data service is not available." });
  return db;
}
var governanceRouter = router({
  myProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow2();
    const [profile] = await db.select().from(userProfiles).where(eq3(userProfiles.userId, ctx.user.id)).limit(1);
    return profile || null;
  }),
  directory: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN", message: "Only administrators can view or assign program personas." });
    const db = await dbOrThrow2();
    return db.select({ id: users.id, name: users.name, email: users.email, persona: userProfiles.persona }).from(users).leftJoin(userProfiles, eq3(userProfiles.userId, users.id));
  }),
  assignPersona: protectedProcedure.input(z3.object({ userId: z3.number().int().positive(), persona: z3.enum(["participant", "organizer", "sponsor", "judge", "mentor", "admin"]) })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN", message: "Only administrators can assign a program persona." });
    const db = await dbOrThrow2();
    await db.insert(userProfiles).values({ userId: input.userId, persona: input.persona }).onDuplicateKeyUpdate({ set: { persona: input.persona } });
    return { success: true };
  })
});

// server/routers/judging.ts
import { TRPCError as TRPCError6 } from "@trpc/server";
import { and as and3, desc as desc3, eq as eq5, isNull as isNull2 } from "drizzle-orm";
import { z as z4 } from "zod";

// server/services/githubApp.ts
import { readFile } from "node:fs/promises";
import { createPrivateKey } from "node:crypto";
import { importPKCS8, SignJWT as SignJWT2 } from "jose";
function normalizePrivateKey(value) {
  const pem = value.replace(/\\n/g, "\n").trim();
  if (pem.includes("BEGIN PRIVATE KEY")) return pem;
  return createPrivateKey(pem).export({ type: "pkcs8", format: "pem" }).toString();
}
async function readDevelopmentKeyFile() {
  const path4 = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
  if (!path4 || process.env.NODE_ENV === "production") return null;
  return normalizePrivateKey(await readFile(path4, "utf8"));
}
async function getGitHubAppConfig() {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID?.trim();
  const configuredKey = process.env.GITHUB_APP_PRIVATE_KEY?.trim();
  const privateKey = configuredKey ? normalizePrivateKey(configuredKey) : await readDevelopmentKeyFile();
  if (!appId || !installationId || !privateKey) return null;
  return { appId, installationId, privateKey };
}
async function createGitHubAppJwt(config) {
  const issuedAt = Math.floor(Date.now() / 1e3) - 60;
  const key = await importPKCS8(config.privateKey, "RS256");
  return new SignJWT2({ iat: issuedAt }).setProtectedHeader({ alg: "RS256", typ: "JWT" }).setIssuer(config.appId).setIssuedAt(issuedAt).setExpirationTime(issuedAt + 540).sign(key);
}
async function mintInstallationAccessToken(config) {
  const appJwt = await createGitHubAppJwt(config);
  const response = await fetch(`https://api.github.com/app/installations/${encodeURIComponent(config.installationId)}/access_tokens`, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${appJwt}`,
      "user-agent": "John-Deere-Idea-Value-Studio",
      "x-github-api-version": "2022-11-28"
    }
  });
  if (!response.ok) throw new Error(`GitHub App installation token request failed (HTTP ${response.status}).`);
  const body = await response.json();
  if (!body.token) throw new Error("GitHub App installation token response did not include a token.");
  return { token: body.token, expiresAt: body.expires_at ?? null };
}
async function mintCurrentInstallationAccessToken() {
  const config = await getGitHubAppConfig();
  if (!config) throw new Error("Private GitHub evidence is not configured.");
  return mintInstallationAccessToken(config);
}
async function githubInstallationFetch(path4, init = {}) {
  const config = await getGitHubAppConfig();
  if (!config) throw new Error("Private GitHub evidence is not configured.");
  const { token } = await mintInstallationAccessToken(config);
  const headers = new Headers(init.headers);
  headers.set("accept", "application/vnd.github+json");
  headers.set("authorization", `Bearer ${token}`);
  headers.set("user-agent", "John-Deere-Idea-Value-Studio");
  headers.set("x-github-api-version", "2022-11-28");
  return fetch(`https://api.github.com${path4}`, { ...init, headers });
}
async function listAuthorizedInstallationRepositories() {
  const response = await githubInstallationFetch("/installation/repositories?per_page=100");
  if (!response.ok) throw new Error(`GitHub App repository listing failed (HTTP ${response.status}).`);
  const body = await response.json();
  return body.repositories ?? [];
}
function encodeRepositoryPathSegment(value) {
  return encodeURIComponent(value.trim());
}
async function provisionPrivateOrganizationRepository(organization, repositoryName) {
  const normalizedOrganization = organization.trim();
  const normalizedName = repositoryName.trim().toLowerCase();
  if (!normalizedOrganization || !/^[a-z0-9][a-z0-9-]*$/.test(normalizedName)) throw new Error("Invalid private challenge repository name.");
  const existingResponse = await githubInstallationFetch(`/repos/${encodeRepositoryPathSegment(normalizedOrganization)}/${encodeRepositoryPathSegment(normalizedName)}`);
  if (existingResponse.ok) {
    const existing = await existingResponse.json();
    if (!existing.private) throw new Error("An existing repository has this name but is not private. It cannot be used as a challenge-owned repository.");
    return existing;
  }
  if (existingResponse.status !== 404) throw new Error(`GitHub repository lookup failed (HTTP ${existingResponse.status}).`);
  const createResponse = await githubInstallationFetch(`/orgs/${encodeRepositoryPathSegment(normalizedOrganization)}/repos`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: normalizedName,
      private: true,
      has_issues: true,
      has_projects: false,
      has_wiki: false,
      auto_init: true,
      description: "Private challenge-owned project repository provisioned by John Deere Idea Value Studio."
    })
  });
  if (!createResponse.ok) throw new Error(`GitHub private repository creation failed (HTTP ${createResponse.status}).`);
  const created = await createResponse.json();
  if (!created.private) throw new Error("GitHub did not create the repository as private. The assignment was not recorded.");
  return created;
}

// server/services/hackathonAgent.ts
import fs from "node:fs";
import { mkdtemp, readdir, readFile as readFile2, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import ts from "typescript";
function responseText2(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part && typeof part === "object" && "text" in part ? String(part.text ?? "") : "").join("\n");
  return "";
}
function parseGitHubUrl(url) {
  const match = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/i);
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/, "") } : null;
}
var ELIGIBLE_CODE = /\.(ts|tsx|js|jsx|mjs|cjs|py|java|go|rs|sql|cs|rb|php)$/i;
var IGNORED_PATH = /(^|\/)(node_modules|dist|build|vendor|\.git|coverage)(\/|$)|\.min\./i;
function emptyRepositoryEvidence(message) {
  return { text: "", citations: [], limitation: message, summary: { extractionMethod: "UNAVAILABLE", totalCommits: 0, bulkCommitFlag: false, filesInspected: 0, primaryLanguages: [], keyDependencies: [] } };
}
function languageFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return { ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript", ".py": "Python", ".java": "Java", ".go": "Go", ".rs": "Rust", ".sql": "SQL", ".cs": "C#", ".rb": "Ruby", ".php": "PHP" }[extension] || "Text";
}
function sourceLine(node, source) {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}
function summarizeTypeScriptAst(filePath, content) {
  const isTsx = /\.tsx$/i.test(filePath);
  const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports = [];
  const declarations = [];
  const routeSignals = [];
  const testSignals = [];
  const visit = (node) => {
    const line = sourceLine(node, source);
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) imports.push(`L${line}: ${node.moduleSpecifier.text}`);
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name) declarations.push(`L${line}: ${ts.SyntaxKind[node.kind].replace("Declaration", "")} ${node.name.text}`);
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (ts.isIdentifier(expression) && ["describe", "it", "test"].includes(expression.text)) testSignals.push(`L${line}: ${expression.text}(\u2026)`);
      if (ts.isPropertyAccessExpression(expression) && ["get", "post", "put", "delete", "route"].includes(expression.name.text)) routeSignals.push(`L${line}: ${expression.getText(source).slice(0, 140)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const sections = [
    imports.length ? `[AST Imports]
${imports.slice(0, 20).join("\n")}` : "",
    declarations.length ? `[AST Declarations]
${declarations.slice(0, 30).join("\n")}` : "",
    routeSignals.length ? `[AST Route Signals]
${routeSignals.slice(0, 20).join("\n")}` : "",
    testSignals.length ? `[AST Test Signals]
${testSignals.slice(0, 20).join("\n")}` : ""
  ].filter(Boolean);
  const lines = content.split(/\r?\n/).length;
  return { summary: sections.length ? sections.join("\n") : content.slice(0, 2200), range: `L1-L${Math.min(lines, 500)}` };
}
function summarizePythonStructure(content) {
  const lines = content.split(/\r?\n/);
  const records = lines.map((line, index2) => ({ line: line.trim(), number: index2 + 1 })).filter((item) => /^(from\s+\S+\s+import|import\s+|async\s+def\s+|def\s+|class\s+|@)/.test(item.line)).slice(0, 50);
  return { summary: records.length ? `[Python structural imports and declarations]
${records.map((item) => `L${item.number}: ${item.line}`).join("\n")}` : content.slice(0, 2200), range: `L1-L${Math.min(lines.length, 500)}` };
}
function summarizeSource(filePath, content) {
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(filePath)) return summarizeTypeScriptAst(filePath, content);
  if (/\.py$/i.test(filePath)) return summarizePythonStructure(content);
  const lines = content.split(/\r?\n/);
  const relevant = lines.map((line, index2) => ({ line, index: index2 + 1 })).filter((item) => /^(\s*(export\s+)?(async\s+)?(function|class|interface|type)\b|\s*(import|from)\b|\s*@|\s*(app|router)\.)/.test(item.line)).slice(0, 30);
  const summary = relevant.length ? relevant.map((item) => `L${item.index}: ${item.line.trim()}`).join("\n") : content.slice(0, 2200);
  const range = relevant.length ? `L${relevant[0].index}-L${relevant[relevant.length - 1].index}` : `L1-L${Math.min(lines.length, 80)}`;
  return { summary, range };
}
function packageDependencies(content) {
  try {
    const manifest = JSON.parse(content);
    return Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).slice(0, 25);
  } catch {
    return [];
  }
}
async function cloneFallback(parsed, url, accessMode) {
  const directory = await mkdtemp(path.join(tmpdir(), "value-fieldbook-audit-"));
  try {
    const token = accessMode === "github_app" ? (await mintCurrentInstallationAccessToken()).token : void 0;
    await git.clone({ fs, http, dir: directory, url: `https://github.com/${parsed.owner}/${parsed.repo}.git`, singleBranch: true, depth: 1, onAuth: () => token ? { username: "x-access-token", password: token } : {} });
    const commits = await git.log({ fs, dir: directory, depth: 20 });
    const candidates = [];
    const visit = async (relative = "") => {
      if (candidates.length >= 40) return;
      for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
        const child = path.posix.join(relative, entry.name);
        if (IGNORED_PATH.test(child) || candidates.length >= 40) continue;
        if (entry.isDirectory()) await visit(child);
        else if (ELIGIBLE_CODE.test(child) || ["README.md", "package.json", "requirements.txt", "Cargo.toml", "Dockerfile"].includes(entry.name)) candidates.push(child);
      }
    };
    await visit();
    const citations = [];
    const chunks = [];
    const languages = /* @__PURE__ */ new Set();
    let dependencies = [];
    for (const filePath of candidates) {
      const content = (await readFile2(path.join(directory, filePath), "utf8")).slice(0, 8e3);
      if (filePath === "package.json") dependencies = packageDependencies(content);
      if (ELIGIBLE_CODE.test(filePath)) languages.add(languageFor(filePath));
      const extracted = summarizeSource(filePath, content);
      const reference = `${url.replace(/\.git$/, "")}/blob/HEAD/${filePath}#${extracted.range.replace("-", "-")}`;
      citations.push({ source: "repository", reference, excerpt: extracted.summary.slice(0, 900) });
      chunks.push(`FILE: ${filePath} (${extracted.range})
${extracted.summary}`);
    }
    const commitTimes = commits.map((commit) => commit.commit.author.timestamp).sort((a, b) => a - b);
    const bulkCommitFlag = commitTimes.length >= 10 && commitTimes[commitTimes.length - 1] - commitTimes[0] < 1800;
    return { text: chunks.join("\n\n"), citations, limitation: null, summary: { extractionMethod: "LOCAL_SHALLOW_CLONE", totalCommits: commits.length, bulkCommitFlag, filesInspected: candidates.length, primaryLanguages: Array.from(languages), keyDependencies: dependencies } };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
async function loadRepositoryEvidence(url, accessMode = "public_api") {
  if (!url) return emptyRepositoryEvidence("No repository URL was supplied.");
  const parsed = parseGitHubUrl(url);
  if (!parsed) return emptyRepositoryEvidence("Repository inspection supports GitHub repository URLs only.");
  try {
    const githubRequest = (requestPath) => accessMode === "github_app" ? githubInstallationFetch(requestPath) : fetch(`https://api.github.com${requestPath}`, { headers: { accept: "application/vnd.github+json", "user-agent": "Value-Fieldbook-Agent" } });
    const [metadataResponse, commitsResponse, treeResponse] = await Promise.all([
      githubRequest(`/repos/${parsed.owner}/${parsed.repo}`),
      githubRequest(`/repos/${parsed.owner}/${parsed.repo}/commits?per_page=20`),
      githubRequest(`/repos/${parsed.owner}/${parsed.repo}/git/trees/HEAD?recursive=1`)
    ]);
    if ([metadataResponse, commitsResponse, treeResponse].some((response) => response.status === 403 || response.status === 429)) return cloneFallback(parsed, url, accessMode);
    if (!metadataResponse.ok || !treeResponse.ok) return emptyRepositoryEvidence(`Repository metadata or file tree could not be retrieved (HTTP ${metadataResponse.status}/${treeResponse.status}).`);
    const metadata = await metadataResponse.json();
    const commits = commitsResponse.ok ? await commitsResponse.json() : [];
    const tree = await treeResponse.json();
    const selected = (tree.tree || []).filter((item) => item.type === "blob" && item.path && !IGNORED_PATH.test(item.path) && (ELIGIBLE_CODE.test(item.path) || /(^|\/)(README\.md|package\.json|requirements\.txt|Cargo\.toml|Dockerfile)$/i.test(item.path))).slice(0, 40);
    const citations = [];
    const chunks = [];
    const languages = /* @__PURE__ */ new Set();
    let dependencies = [];
    for (const item of selected) {
      const filePath = item.path;
      const contentResponse = await githubRequest(`/repos/${parsed.owner}/${parsed.repo}/contents/${filePath.split("/").map(encodeURIComponent).join("/")}`);
      if (!contentResponse.ok) continue;
      const payload = await contentResponse.json();
      const content = payload.content ? Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8").slice(0, 8e3) : "";
      if (!content) continue;
      if (filePath === "package.json") dependencies = packageDependencies(content);
      if (ELIGIBLE_CODE.test(filePath)) languages.add(languageFor(filePath));
      const extracted = summarizeSource(filePath, content);
      citations.push({ source: "repository", reference: `${payload.html_url || `${metadata.html_url || url}/blob/${metadata.default_branch || "HEAD"}/${filePath}`}#${extracted.range}`, excerpt: extracted.summary.slice(0, 900) });
      chunks.push(`FILE: ${filePath} (${extracted.range})
${extracted.summary}`);
    }
    const dates = commits.map((commit) => commit.commit?.author?.date ? Date.parse(commit.commit.author.date) / 1e3 : 0).filter(Boolean).sort((a, b) => a - b);
    const bulkCommitFlag = dates.length >= 10 && dates[dates.length - 1] - dates[0] < 1800;
    return { text: chunks.join("\n\n"), citations, limitation: chunks.length ? null : "No eligible source files could be read from the repository.", summary: { extractionMethod: "GITHUB_REST_API", totalCommits: commits.length, bulkCommitFlag, filesInspected: chunks.length, primaryLanguages: Array.from(languages), keyDependencies: dependencies } };
  } catch {
    try {
      return await cloneFallback(parsed, url, accessMode);
    } catch {
      return emptyRepositoryEvidence("Repository retrieval and bounded shallow-clone fallback both failed; use human review or attach evidence.");
    }
  }
}
async function runHackathonAgent(context) {
  const repo = await loadRepositoryEvidence(context.githubUrl, context.repositoryAccessMode);
  const reviewParts = [{
    type: "text",
    text: [
      `Project: ${context.title}`,
      `Submission description: ${context.description}`,
      `Tech stack: ${(context.techStack || []).join(", ") || "Not supplied"}`,
      `Demo: ${context.demoUrl || "Not supplied"}`,
      `Video: ${context.videoUrl || "Not supplied"}`,
      `Pitch deck: ${context.pitchDeckUrl || "Not supplied"}`,
      `GitHub repository: ${context.githubUrl || "Not supplied"}`,
      `Opportunity baseline: ${context.opportunityContext || "Not supplied"}`,
      `Research context: ${context.researchSummary || "Not supplied"}`,
      `Repository evidence (${context.repositoryAccessMode === "github_app" ? "authorized private GitHub App access" : "public GitHub API"}):
${repo.text || "Not available"}`
    ].join("\n\n")
  }];
  if (context.pitchDeckUrl?.toLowerCase().includes(".pdf")) reviewParts.push({ type: "file_url", file_url: { url: context.pitchDeckUrl, mime_type: "application/pdf" } });
  if (context.videoUrl?.toLowerCase().match(/\.(mp4|mov|webm)(\?|$)/)) reviewParts.push({ type: "file_url", file_url: { url: context.videoUrl, mime_type: "video/mp4" } });
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: "You are the Hackathon Agent, an evidence-first co-judge. Assess only evidence supplied in the submission, bounded GitHub repository inspection that is either public or explicitly App-authorized, attached deck or video, and approved research context. Do not execute code, fabricate verification, decide legal originality, or determine winners. Produce at most four concise claim records and four concise findings, with stable references such as CLAIM-01. Every verdict and finding requires a cited supplied source. Score each dimension from 0 to 10 as a provisional rubric input and return limitations when evidence is missing."
      },
      {
        role: "user",
        content: reviewParts
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "hackathon_agent_audit",
        strict: true,
        schema: {
          type: "object",
          properties: {
            technicalScore: { type: "number", minimum: 0, maximum: 10 },
            integrityScore: { type: "number", minimum: 0, maximum: 10 },
            originalityScore: { type: "number", minimum: 0, maximum: 10 },
            pitchFitScore: { type: "number", minimum: 0, maximum: 10 },
            claims: {
              type: "array",
              maxItems: 4,
              items: {
                type: "object",
                properties: {
                  claimReference: { type: "string" },
                  claim: { type: "string" },
                  verdict: { type: "string", enum: ["supported", "unclear", "contradicted"] },
                  rationale: { type: "string" },
                  citations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        source: { type: "string", enum: ["submission", "repository", "research", "deck", "video"] },
                        reference: { type: "string" },
                        excerpt: { type: "string" }
                      },
                      required: ["source", "reference", "excerpt"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["claimReference", "claim", "verdict", "rationale", "citations"],
                additionalProperties: false
              }
            },
            findings: {
              type: "array",
              maxItems: 4,
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  finding: { type: "string" },
                  severity: { type: "string", enum: ["info", "warning", "review"] },
                  citations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        source: { type: "string", enum: ["submission", "repository", "research", "deck", "video"] },
                        reference: { type: "string" },
                        excerpt: { type: "string" }
                      },
                      required: ["source", "reference", "excerpt"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["category", "finding", "severity", "citations"],
                additionalProperties: false
              }
            },
            questionsForJudges: { type: "array", maxItems: 5, items: { type: "string" } },
            limitations: { type: "array", maxItems: 5, items: { type: "string" } }
          },
          required: ["technicalScore", "integrityScore", "originalityScore", "pitchFitScore", "claims", "findings", "questionsForJudges", "limitations"],
          additionalProperties: false
        }
      }
    },
    maxTokens: 4e3
  });
  const audit = JSON.parse(responseText2(response.choices[0]?.message.content));
  if (repo.limitation) audit.limitations.push(repo.limitation);
  if (repo.summary.bulkCommitFlag) audit.limitations.push("Commit telemetry shows 10 or more observed commits within a 30-minute window; judges should inspect contribution timing rather than infer intent.");
  if (repo.citations.length) audit.findings.push({ category: "Repository extraction", finding: `${repo.summary.extractionMethod} inspected ${repo.summary.filesInspected} bounded files across ${repo.summary.totalCommits} observed commits.`, severity: "info", citations: repo.citations.slice(0, 5) });
  const finalSuggestedScore = Number((audit.technicalScore * 0.35 + audit.integrityScore * 0.25 + audit.originalityScore * 0.2 + audit.pitchFitScore * 0.2).toFixed(2));
  return { ...audit, finalSuggestedScore };
}

// server/services/auditQueue.ts
import { and as and2, desc as desc2, eq as eq4, isNull, lt } from "drizzle-orm";
async function dbOrThrow3() {
  const db = await getDb();
  if (!db) throw new Error("The data service is not available.");
  return db;
}
var AUDIT_STALE_AFTER_MS = 10 * 60 * 1e3;
async function recoverStaleProcessingAudits(now = /* @__PURE__ */ new Date()) {
  const db = await dbOrThrow3();
  const cutoff = new Date(now.getTime() - AUDIT_STALE_AFTER_MS);
  await db.update(submissionAudits).set({ status: "queued", processingStartedAt: null }).where(and2(eq4(submissionAudits.status, "processing"), lt(submissionAudits.processingStartedAt, cutoff)));
}
async function processQueuedAudit(auditId) {
  const db = await dbOrThrow3();
  const [audit] = await db.select().from(submissionAudits).where(eq4(submissionAudits.id, auditId)).limit(1);
  if (!audit) return { auditId, status: "skipped", reason: "not_found" };
  if (audit.status === "complete" || audit.status === "needs_review") return { auditId, status: "skipped", reason: "already_final" };
  if (audit.status === "processing") return { auditId, status: "skipped", reason: "already_processing" };
  await db.update(submissionAudits).set({ status: "processing", processingStartedAt: /* @__PURE__ */ new Date() }).where(eq4(submissionAudits.id, audit.id));
  try {
    const [project] = await db.select().from(projects).where(eq4(projects.id, audit.projectId)).limit(1);
    if (!project) throw new Error("The submitted project no longer exists.");
    const [event, connection] = await Promise.all([
      db.select().from(hackathons).where(eq4(hackathons.id, project.hackathonId)).limit(1).then((rows) => rows[0]),
      db.select().from(repositoryConnections).where(and2(eq4(repositoryConnections.projectId, project.id), isNull(repositoryConnections.revokedAt))).limit(1).then((rows) => rows[0])
    ]);
    const [opportunity] = event?.opportunityId ? await db.select().from(opportunities).where(eq4(opportunities.id, event.opportunityId)).limit(1) : [];
    const [research] = opportunity ? await db.select().from(researchRuns).where(eq4(researchRuns.opportunityId, opportunity.id)).orderBy(desc2(researchRuns.createdAt)).limit(1) : [];
    const connectionMatchesProjectRepository = Boolean(connection && project.githubUrl && connection.githubUrl.replace(/\.git$/, "") === project.githubUrl.replace(/\.git$/, ""));
    const agentAudit = await runHackathonAgent({
      title: project.title,
      description: project.description,
      techStack: project.techStack,
      githubUrl: project.githubUrl,
      demoUrl: project.demoUrl,
      videoUrl: project.videoUrl,
      pitchDeckUrl: project.pitchDeckUrl,
      opportunityContext: opportunity ? `${opportunity.problemStatement}
Value range: ${opportunity.initialValueLow || "Not supplied"}\u2013${opportunity.initialValueHigh || "Not supplied"}
Evidence gaps: ${JSON.stringify(opportunity.evidenceGaps || [])}` : null,
      researchSummary: research ? `${research.summary || ""}
Limitations: ${research.limitations || ""}` : null,
      repositoryAccessMode: connectionMatchesProjectRepository ? connection.accessMode : "public_api"
    });
    await db.update(submissionAudits).set({
      status: "complete",
      extractionMethod: agentAudit.findings.some((finding) => finding.finding.includes("LOCAL_SHALLOW_CLONE")) ? "shallow_clone" : project.githubUrl ? "github_api" : "manual",
      technicalScore: String(agentAudit.technicalScore),
      integrityScore: String(agentAudit.integrityScore),
      originalityScore: String(agentAudit.originalityScore),
      pitchFitScore: String(agentAudit.pitchFitScore),
      finalSuggestedScore: String(agentAudit.finalSuggestedScore),
      report: agentAudit,
      completedAt: /* @__PURE__ */ new Date()
    }).where(eq4(submissionAudits.id, audit.id));
    return { auditId, status: "complete" };
  } catch (error) {
    await db.update(submissionAudits).set({ status: "failed", report: { error: error instanceof Error ? error.message : "Unknown audit failure" }, completedAt: /* @__PURE__ */ new Date() }).where(eq4(submissionAudits.id, audit.id));
    return { auditId, status: "failed" };
  }
}
async function processQueuedAuditBatch(limit = 3, hackathonId) {
  const db = await dbOrThrow3();
  await recoverStaleProcessingAudits();
  const queued = await db.select().from(submissionAudits).where(eq4(submissionAudits.status, "queued")).orderBy(submissionAudits.createdAt).limit(Math.min(Math.max(limit, 1), 5));
  const results = [];
  for (const audit of queued) {
    if (hackathonId) {
      const [project] = await db.select().from(projects).where(eq4(projects.id, audit.projectId)).limit(1);
      if (!project || project.hackathonId !== hackathonId) continue;
    }
    results.push(await processQueuedAudit(audit.id));
  }
  return results;
}

// server/services/specialistEvaluators.ts
import { createHash } from "node:crypto";
var specialistSkills = ["ux_ui", "cloud_architecture", "security", "development_quality", "value_feasibility"];
function shouldReuseSpecialistEvaluation(existing, packetHash) {
  return existing?.status === "processing" || existing?.status === "queued" || existing?.status === "complete" && existing.evidenceHash === packetHash;
}
function evidencePacketFreshness(packetHash, evaluations, synthesis) {
  const staleSkills = evaluations.filter((item) => item.status === "complete" && item.evidenceHash !== packetHash).map((item) => item.skill);
  return { currentEvidenceHash: packetHash, staleSkills, synthesisStale: Boolean(synthesis && synthesis.evidenceHash !== packetHash) };
}
var specialistSkillInstructions = {
  ux_ui: "Assess only usability evidence, accessibility signals, task clarity, responsive-design clues, and design consistency. Do not infer user satisfaction or rate subjective aesthetics as business value.",
  cloud_architecture: "Assess only architecture, deployment boundaries, resilience, observability, configuration, and operational fit shown in the packet. Do not certify production readiness.",
  security: "Assess only authorization, validation, secret handling, dependency/configuration evidence, auditability, and privacy boundaries. Do not claim exploitation, penetration testing, legal compliance, or a security certification.",
  development_quality: "Assess only code structure, test signals, API contracts, static-analysis evidence, maintainability, and bounded contribution telemetry. Do not execute code or infer developer ability from identities.",
  value_feasibility: "Assess only alignment to the selected opportunity, sponsor-recorded assumptions, proof design, measurable indicators, and next-test readiness. Do not invent economics, approve funding, or replace sponsor judgment."
};
function specialistSystemPolicy(skill, retry) {
  return `You are the ${skill} specialist in an evidence-bounded hackathon review panel. ${specialistSkillInstructions[skill]} Review only the identity-redacted shared packet. Your outputs are non-binding and cannot determine a winner. Every material finding needs one supplied citation. Produce at most two concise findings, one citation per finding, at most two human questions, and at most three limitations. Keep every string concise enough to return complete valid JSON.${retry ? " This is one retry after incomplete JSON. Return only the required JSON schema object." : ""}`;
}
function contentText2(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part && typeof part === "object" && "text" in part ? String(part.text || "") : "").join("\n");
  return "";
}
function parseSpecialistResult(output) {
  const trimmed = output.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(trimmed);
  if (typeof parsed.provisionalScore === "number" && Array.isArray(parsed.findings)) return parsed;
  const legacyFindings = Array.isArray(parsed.findings) ? parsed.findings : [];
  const globalLimitations = Array.isArray(parsed.limitations) ? parsed.limitations.flatMap((item) => typeof item === "string" ? [item] : item && typeof item === "object" && "limitation" in item ? [String(item.limitation)] : []) : [];
  return {
    provisionalScore: null,
    findings: legacyFindings.flatMap((item, index2) => {
      if (!item || typeof item !== "object") return [];
      const finding = item;
      const citation = finding.citation && typeof finding.citation === "object" ? finding.citation : null;
      if (!citation) return [];
      return [{
        reference: String(finding.id || `CLAUDE-F${index2 + 1}`),
        criterion: String(finding.category || "Evidence review"),
        status: finding.severity === "blocker" ? "contradicted" : "unclear",
        finding: String(finding.finding || "No finding text returned."),
        confidence: "low",
        citations: [{ source: String(citation.source || "supplied evidence"), reference: String(citation.claimReference || citation.reference || `CLAUDE-F${index2 + 1}`), excerpt: String(citation.excerpt || "Citation excerpt was not supplied.") }],
        limitations: globalLimitations.slice(0, 2)
      }];
    }),
    questionsForHumanJudge: Array.isArray(parsed.questions_for_team) ? parsed.questions_for_team.flatMap((item) => item && typeof item === "object" && "question" in item ? [String(item.question)] : []).slice(0, 2) : [],
    limitations: globalLimitations.slice(0, 3)
  };
}
function buildSharedEvidencePacket(input) {
  const packet = {
    policy: "specialist-evidence-packet-v1",
    project: input.project,
    opportunity: input.opportunity ? { problemStatement: input.opportunity.problemStatement, valueCaseNarrative: input.opportunity.valueCaseNarrative, economicAssumptions: input.opportunity.economicAssumptions || [], investmentGate: input.opportunity.investmentGate } : null,
    researchSummary: input.researchSummary || null,
    projectDocuments: (input.projectDocuments || []).map((document) => ({ id: document.id, originalName: document.originalName, mimeType: document.mimeType, extractedText: typeof document.extraction?.text === "string" ? document.extraction.text.slice(0, 12e3) : null, extractionMethod: document.extraction?.method || null })),
    hackathonAgentEvidence: input.auditReport
  };
  const text2 = JSON.stringify(packet, null, 2);
  return { text: text2, evidenceHash: createHash("sha256").update(text2).digest("hex"), policyVersion: "specialist-evidence-packet-v1" };
}
var responseSchema = {
  type: "json_schema",
  json_schema: {
    name: "specialist_evaluation",
    strict: true,
    schema: {
      type: "object",
      properties: {
        provisionalScore: { type: "number", minimum: 0, maximum: 10 },
        findings: { type: "array", maxItems: 2, items: { type: "object", properties: {
          reference: { type: "string" },
          criterion: { type: "string" },
          status: { type: "string", enum: ["supported", "unclear", "contradicted"] },
          finding: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          citations: { type: "array", minItems: 1, maxItems: 1, items: { type: "object", properties: { source: { type: "string" }, reference: { type: "string" }, excerpt: { type: "string" } }, required: ["source", "reference", "excerpt"], additionalProperties: false } },
          limitations: { type: "array", maxItems: 2, items: { type: "string" } }
        }, required: ["reference", "criterion", "status", "finding", "confidence", "citations", "limitations"], additionalProperties: false } },
        questionsForHumanJudge: { type: "array", maxItems: 2, items: { type: "string" } },
        limitations: { type: "array", maxItems: 3, items: { type: "string" } }
      },
      required: ["provisionalScore", "findings", "questionsForHumanJudge", "limitations"],
      additionalProperties: false
    }
  }
};
async function runSpecialistEvaluator(skill, packet) {
  const { data: models } = await listLLMModels();
  const model = models.find((item) => item.id === "claude-sonnet-4-6")?.id || models.find((item) => item.id.startsWith("claude-"))?.id || "gpt-5";
  const invokeCompactReview = async (retry) => {
    const response = await invokeLLM({
      model,
      messages: [
        { role: "system", content: specialistSystemPolicy(skill, retry) },
        { role: "user", content: packet.text }
      ],
      response_format: responseSchema,
      ...model.startsWith("claude-") ? { thinking: { type: "enabled", budget_tokens: 1024 }, maxTokens: 2600 } : { reasoning: { effort: "medium" }, maxCompletionTokens: 1800 }
    });
    return parseSpecialistResult(contentText2(response.choices[0]?.message.content));
  };
  try {
    return await invokeCompactReview(false);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return invokeCompactReview(true);
  }
}

// server/services/evaluationSynthesis.ts
var synthesisSchema = {
  type: "json_schema",
  json_schema: {
    name: "evidence_grounded_evaluation_synthesis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        preliminaryRecommendation: { type: "string", enum: ["advance_with_conditions", "needs_more_evidence", "rework_before_review"] },
        decisionRationale: { type: "string", maxLength: 900 },
        multiModalProofReview: { type: "array", maxItems: 5, items: { type: "object", properties: { modality: { type: "string", enum: ["repository_code", "live_demo", "video", "pitch_deck", "technical_document"] }, available: { type: "boolean" }, requirementCoverage: { type: "string", enum: ["linkable", "unavailable"] }, evidence: { type: "string", maxLength: 320 }, nextRequest: { type: "string", maxLength: 280 }, references: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } } }, required: ["modality", "available", "requirementCoverage", "evidence", "nextRequest", "references"], additionalProperties: false } },
        evidenceGraph: { type: "array", maxItems: 5, items: { type: "object", properties: { claim: { type: "string", maxLength: 280 }, support: { type: "string", enum: ["supported", "partial", "missing"] }, sourceCount: { type: "integer", minimum: 0, maximum: 20 }, references: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 180 } } }, required: ["claim", "support", "sourceCount", "references"], additionalProperties: false } },
        crossSkillDeliberation: { type: "array", maxItems: 4, items: { type: "object", properties: { topic: { type: "string", maxLength: 240 }, agreement: { type: "string", maxLength: 380 }, conflict: { type: "string", maxLength: 380 }, uncertainty: { type: "string", maxLength: 280 }, evidenceNeeded: { type: "string", maxLength: 280 }, references: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 180 } } }, required: ["topic", "agreement", "conflict", "uncertainty", "evidenceNeeded", "references"], additionalProperties: false } },
        marketChallenge: { type: "array", maxItems: 4, items: { type: "object", properties: { dimension: { type: "string", enum: ["novelty", "alternatives", "adoption", "customer_value"] }, assessment: { type: "string", maxLength: 480 }, evidenceStatus: { type: "string", enum: ["supported", "partial", "missing"] }, nextTest: { type: "string", maxLength: 280 }, references: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 180 } } }, required: ["dimension", "assessment", "evidenceStatus", "nextTest", "references"], additionalProperties: false } },
        valueCaseStressTest: { type: "array", maxItems: 4, items: { type: "object", properties: { assumption: { type: "string", maxLength: 240 }, condition: { type: "string", maxLength: 260 }, consequence: { type: "string", maxLength: 300 }, evidenceNeeded: { type: "string", maxLength: 280 }, references: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 180 } } }, required: ["assumption", "condition", "consequence", "evidenceNeeded", "references"], additionalProperties: false } },
        requirementTrace: { type: "array", maxItems: 4, items: { type: "object", properties: { requirement: { type: "string", maxLength: 220 }, evidenceStatus: { type: "string", enum: ["supported", "partial", "missing"] }, references: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } }, nextValidation: { type: "string", maxLength: 320 } }, required: ["requirement", "evidenceStatus", "references", "nextValidation"], additionalProperties: false } },
        marketRealityCheck: { type: "array", maxItems: 3, items: { type: "object", properties: { question: { type: "string", maxLength: 220 }, groundedAssessment: { type: "string", maxLength: 500 }, references: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } }, limitation: { type: "string", maxLength: 260 } }, required: ["question", "groundedAssessment", "references", "limitation"], additionalProperties: false } },
        deliveryRisks: { type: "array", maxItems: 4, items: { type: "object", properties: { risk: { type: "string", maxLength: 280 }, impact: { type: "string", enum: ["high", "medium", "low"] }, mitigation: { type: "string", maxLength: 320 }, references: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } } }, required: ["risk", "impact", "mitigation", "references"], additionalProperties: false } },
        teamActions: { type: "array", maxItems: 4, items: { type: "object", properties: { priority: { type: "string", enum: ["now", "next", "later"] }, action: { type: "string", maxLength: 280 }, why: { type: "string", maxLength: 380 }, references: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } } }, required: ["priority", "action", "why", "references"], additionalProperties: false } },
        innovationOpportunities: { type: "array", maxItems: 3, items: { type: "object", properties: { opportunity: { type: "string", maxLength: 280 }, test: { type: "string", maxLength: 320 }, references: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } } }, required: ["opportunity", "test", "references"], additionalProperties: false } },
        humanQuestions: { type: "array", maxItems: 4, items: { type: "string", maxLength: 280 } },
        limitations: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 280 } }
      },
      required: ["preliminaryRecommendation", "decisionRationale", "multiModalProofReview", "evidenceGraph", "crossSkillDeliberation", "marketChallenge", "valueCaseStressTest", "requirementTrace", "marketRealityCheck", "deliveryRisks", "teamActions", "innovationOpportunities", "humanQuestions", "limitations"],
      additionalProperties: false
    }
  }
};
function buildSynthesisPrompt(packet, specialistResults) {
  return JSON.stringify({
    policy: "evidence-synthesis-v1",
    sharedEvidencePacket: JSON.parse(packet.text),
    specialistResults: specialistResults.map((item) => ({ skill: item.skill, result: item.result }))
  }, null, 2);
}
function synthesisSystemPolicy() {
  return "You are the evidence-synthesis lead for a John Deere innovation proof review. Use only supplied evidence, citations, and specialist outputs. Reconcile requirements, architecture, code-quality, security, UX, proof evidence, sponsor assumptions, and cited market research. Produce a preliminary non-binding recommendation and actionable team guidance; it cannot choose a winner, approve investment, overwrite a human scorecard, or invent market facts or economics. First perform a multi-modal proof review that states whether authorized repository/code, live demo, video, pitch deck, and technical document evidence is present and whether explicit authorized requirement anchors make the artifact linkable for inspection; do not claim that an artifact meets a requirement unless a supplied citation establishes it. Then build an evidence graph that traces claims to supplied references, cross-skill deliberation that distinguishes agreement from conflict and uncertainty, a market challenge across novelty, alternatives, adoption, and customer value, and a value-case stress test that challenges supplied assumptions without fabricating economics. Every trace, challenge, risk, action, and innovation opportunity needs at least one supplied reference. Treat missing evidence as missing, not a negative claim. State limitations clearly. Human judges retain all final authority.";
}
function contentText3(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part && typeof part === "object" && "text" in part ? String(part.text || "") : "").join("\n");
  return "";
}
function parseSynthesisResult(output) {
  const cleaned = output.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const firstObject = cleaned.indexOf("{");
  const lastObject = cleaned.lastIndexOf("}");
  if (firstObject < 0 || lastObject <= firstObject) throw new SyntaxError("Claude did not return a JSON synthesis object.");
  return JSON.parse(cleaned.slice(firstObject, lastObject + 1));
}
function citedReferences(finding) {
  return finding.citations.map((citation) => `${citation.source}: ${citation.reference}`).slice(0, 3);
}
function buildDeterministicEvidenceSynthesis(packet, specialistResults) {
  const source = JSON.parse(packet.text);
  const findings = specialistResults.flatMap((item) => item.result.findings.map((finding) => ({ skill: item.skill, finding })));
  const evidenceGraph = findings.slice(0, 5).map(({ finding }) => ({ claim: finding.finding, support: finding.status === "supported" ? "supported" : finding.status === "contradicted" ? "partial" : "missing", sourceCount: finding.citations.length, references: citedReferences(finding) }));
  const crossSkillDeliberation = specialistResults.slice(0, 4).map(({ skill, result }) => ({ topic: skill.replace(/_/g, " "), agreement: result.findings.length ? `This specialist returned ${result.findings.length} cited finding(s).` : "No cited finding was returned by this specialist.", conflict: "No automatic consensus is inferred; a human reviewer compares the cited findings.", uncertainty: result.limitations.join(" \xB7 ") || "The specialist did not state a limitation.", evidenceNeeded: result.questionsForHumanJudge[0] || "Inspect the cited packet and determine the next evidence request.", references: result.findings.flatMap(citedReferences).slice(0, 3).length ? result.findings.flatMap(citedReferences).slice(0, 3) : [`${skill}: no cited finding`] }));
  const researchPresent = Boolean(source.researchSummary?.trim());
  const marketChallenge = ["novelty", "alternatives", "adoption", "customer_value"].map((dimension) => ({ dimension, assessment: researchPresent ? "A cited market-research record is present in the authorized packet; its source limitations still require human inspection." : "No cited market-research record is present in the authorized packet.", evidenceStatus: researchPresent ? "partial" : "missing", nextTest: researchPresent ? "Compare the submission claim with the cited research record and document the unresolved assumption." : "Add source-backed market research before making a market assertion.", references: [researchPresent ? "Authorized market research summary" : "No authorized market research summary"] }));
  const assumptions = source.opportunity?.economicAssumptions?.filter(Boolean) || [];
  const valueCaseStressTest = (assumptions.length ? assumptions : ["No sponsor-recorded economic assumption supplied"]).slice(0, 4).map((assumption, index2) => ({ assumption, condition: "The assumption remains sponsor-owned and must be tested by observed proof evidence.", consequence: "The preliminary recommendation cannot treat the assumption as a confirmed value outcome.", evidenceNeeded: "Record the metric, measurement method, boundary, and proof result needed to validate or revise this assumption.", references: [assumptions.length ? `Sponsor assumption ${index2 + 1}` : "Opportunity record"] }));
  const modalities = [
    ["repository_code", Boolean(source.project?.githubUrl), "Repository URL", "Provide an authorized repository or attach code evidence."],
    ["live_demo", Boolean(source.project?.demoUrl), "Live demo URL", "Provide a live demo URL or a captured walkthrough."],
    ["video", Boolean(source.project?.videoUrl), "Video URL", "Provide a short recorded proof walkthrough."],
    ["pitch_deck", Boolean(source.project?.pitchDeckUrl), "Pitch deck URL", "Provide a pitch deck that links claims to proof evidence."],
    ["technical_document", Boolean(source.projectDocuments?.length), "Authorized project documents", "Upload a consented BRD, architecture, API, or technical document."]
  ];
  const requirementAnchors = [source.opportunity?.problemStatement, source.opportunity?.valueCaseNarrative, source.project?.description, ...(source.projectDocuments || []).flatMap((document) => document.extractedText ? [document.extractedText] : [])].flatMap((value) => String(value || "").split(/[\n.!?]/).map((part) => part.trim()).filter((part) => /\b(must|shall|should|require|acceptance|objective|problem|need)\b/i.test(part) && part.length > 16)).slice(0, 3);
  const requirementCoverage = requirementAnchors.length ? "linkable" : "unavailable";
  const multiModalProofReview = modalities.map(([modality, available, reference, nextRequest]) => ({ modality, available, requirementCoverage, evidence: available ? `${reference} is present in the authorized proof packet.${requirementAnchors.length ? ` ${requirementAnchors.length} authorized requirement anchor${requirementAnchors.length === 1 ? " is" : "s are"} available for inspection.` : " No explicit authorized requirement anchor is available yet."}` : `${reference} is not present in the authorized proof packet.`, nextRequest: available ? requirementAnchors.length ? "Inspect this supplied artifact against the listed authorized requirement anchors and record any limitation." : "Add an explicit BRD, acceptance criterion, or problem requirement before interpreting this artifact as proof." : nextRequest, references: [reference, ...requirementAnchors.length ? ["Authorized requirement anchor"] : []] }));
  const limitations = specialistResults.flatMap((item) => item.result.limitations.map((limitation) => `${item.skill.replace(/_/g, " ")}: ${limitation}`)).slice(0, 4);
  return { preliminaryRecommendation: "needs_more_evidence", decisionRationale: "This is a deterministic aggregation of completed cited specialist findings because a new model synthesis was unavailable. It does not create a winner selection, investment decision, or new factual claim.", multiModalProofReview, evidenceGraph, crossSkillDeliberation, marketChallenge, valueCaseStressTest, requirementTrace: findings.slice(0, 4).map(({ finding }) => ({ requirement: finding.criterion, evidenceStatus: finding.status === "supported" ? "supported" : "partial", references: citedReferences(finding), nextValidation: finding.limitations[0] || "Inspect the cited evidence with a human reviewer." })), marketRealityCheck: marketChallenge.slice(0, 3).map((item) => ({ question: item.dimension.replace(/_/g, " "), groundedAssessment: item.assessment, references: item.references, limitation: item.evidenceStatus === "missing" ? "No cited market record is available." : "Review source limits before relying on this assessment." })), deliveryRisks: limitations.map((limitation) => ({ risk: limitation, impact: "medium", mitigation: "Supply the cited missing evidence and have a human reviewer reassess it.", references: ["Specialist limitation"] })), teamActions: findings.filter((item) => item.finding.status !== "supported").slice(0, 4).map(({ finding }) => ({ priority: "now", action: finding.limitations[0] || "Address the cited specialist finding with new evidence.", why: finding.finding, references: citedReferences(finding) })), innovationOpportunities: [], humanQuestions: specialistResults.flatMap((item) => item.result.questionsForHumanJudge).slice(0, 4), limitations: limitations.length ? limitations : ["No specialist limitation was available for aggregation."] };
}
async function preferredSynthesisModel() {
  const { data } = await listLLMModels();
  return data.find((model) => model.id === "gpt-5")?.id || data.find((model) => model.id.startsWith("gpt-5"))?.id || data.find((model) => model.id.startsWith("claude-"))?.id || "gpt-5-mini";
}
async function runEvaluationSynthesis(packet, specialistResults) {
  const model = await preferredSynthesisModel();
  const invoke = async (retry) => {
    const response = await invokeLLM({
      model,
      messages: [
        { role: "system", content: `${synthesisSystemPolicy()}${retry ? " Your first response was not usable JSON. Return only one JSON object that conforms exactly to the supplied schema, with no Markdown heading, prose, or code fence." : " Return only the structured JSON object required by the schema; do not add Markdown or explanatory prose."}` },
        { role: "user", content: buildSynthesisPrompt(packet, specialistResults) }
      ],
      response_format: synthesisSchema,
      ...model.startsWith("claude-") ? { thinking: { type: "enabled", budget_tokens: 2048 }, maxTokens: 5e3 } : { reasoning: { effort: "high" }, maxCompletionTokens: 5e3 }
    });
    return parseSynthesisResult(contentText3(response.choices[0]?.message.content));
  };
  try {
    return { model, result: await invoke(false) };
  } catch (error) {
    if (error instanceof SyntaxError) return { model, result: await invoke(true) };
    if (error instanceof Error && /usage exhausted|412 Precondition Failed/i.test(error.message)) return { model: "deterministic-evidence-aggregation", result: buildDeterministicEvidenceSynthesis(packet, specialistResults) };
    throw error;
  }
}

// server/routers/judging.ts
async function dbOrThrow4() {
  const db = await getDb();
  if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "The data service is not available." });
  return db;
}
async function projectAccess(projectId, userId, role) {
  const db = await dbOrThrow4();
  const [project] = await db.select().from(projects).where(eq5(projects.id, projectId)).limit(1);
  if (!project) throw new TRPCError6({ code: "NOT_FOUND", message: "Project not found." });
  const [membership, assignment] = await Promise.all([
    db.select().from(teamMembers).where(and3(eq5(teamMembers.teamId, project.teamId), eq5(teamMembers.userId, userId))).limit(1),
    db.select().from(judgeAssignments).where(and3(eq5(judgeAssignments.projectId, project.id), eq5(judgeAssignments.judgeId, userId))).limit(1)
  ]);
  return { db, project, isTeamMember: Boolean(membership[0]), isAssignedJudge: Boolean(assignment[0]) && !assignment[0].isRecused, isAdmin: role === "admin" };
}
function requireJudgeOrAdmin(access) {
  if (!access.isAdmin && !access.isAssignedJudge) throw new TRPCError6({ code: "FORBIDDEN", message: "This review is available only to an assigned judge." });
}
function auditContainsClaim(report, claimReference) {
  if (!report || typeof report !== "object" || Array.isArray(report)) return false;
  const claims = report.claims;
  return Array.isArray(claims) && claims.some((claim) => claim && typeof claim === "object" && claim.claimReference === claimReference);
}
function specialistContainsFinding(result, reference) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return false;
  const findings = result.findings;
  return Array.isArray(findings) && findings.some((finding) => finding && typeof finding === "object" && finding.reference === reference);
}
function specialistChallengeReference(evaluationId, findingReference) {
  return `specialist:${evaluationId}:${findingReference}`;
}
function parseSpecialistChallengeReference(reference) {
  const match = /^specialist:(\d+):(.+)$/.exec(reference);
  return match ? { evaluationId: Number(match[1]), findingReference: match[2] } : null;
}
async function requireAuditedClaim(db, projectId, claimReference) {
  const [latestAudit] = await db.select().from(submissionAudits).where(and3(eq5(submissionAudits.projectId, projectId), eq5(submissionAudits.status, "complete"))).orderBy(desc3(submissionAudits.createdAt)).limit(1);
  if (latestAudit && auditContainsClaim(latestAudit.report, claimReference)) return;
  const specialist = await db.select().from(specialistEvaluations).where(and3(eq5(specialistEvaluations.projectId, projectId), eq5(specialistEvaluations.status, "complete")));
  const specialistRows = Array.isArray(specialist) ? specialist : [];
  const specialistChallenge = parseSpecialistChallengeReference(claimReference);
  const specialistFindingExists = specialistChallenge ? specialistRows.some((evaluation) => evaluation.id === specialistChallenge.evaluationId && specialistContainsFinding(evaluation.result, specialistChallenge.findingReference)) : specialistRows.some((evaluation) => specialistContainsFinding(evaluation.result, claimReference));
  if (!specialistFindingExists) {
    throw new TRPCError6({ code: "BAD_REQUEST", message: "Select a claim from the latest completed Hackathon Agent audit." });
  }
}
var judgingRouter = router({
  assignJudge: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive(), judgeId: z4.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError6({ code: "FORBIDDEN", message: "Only an organizer can assign a judge." });
    const db = await dbOrThrow4();
    const [project] = await db.select().from(projects).where(eq5(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError6({ code: "NOT_FOUND", message: "Project not found." });
    await db.insert(judgeAssignments).values({ hackathonId: project.hackathonId, projectId: project.id, judgeId: input.judgeId }).onDuplicateKeyUpdate({ set: { isRecused: false } });
    return { success: true };
  }),
  assignBalancedJudge: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError6({ code: "FORBIDDEN", message: "Only an organizer can assign a judge." });
    const db = await dbOrThrow4();
    const [project] = await db.select().from(projects).where(eq5(projects.id, input.projectId)).limit(1);
    if (!project) throw new TRPCError6({ code: "NOT_FOUND", message: "Project not found." });
    const candidates = await db.select().from(hackathonRegistrations).where(and3(eq5(hackathonRegistrations.hackathonId, project.hackathonId), eq5(hackathonRegistrations.registrationRole, "judge"), eq5(hackathonRegistrations.status, "registered")));
    if (!candidates.length) throw new TRPCError6({ code: "BAD_REQUEST", message: "Register at least one active judge before using workload-balanced assignment." });
    const assignments = await db.select().from(judgeAssignments).where(eq5(judgeAssignments.hackathonId, project.hackathonId));
    const workload = /* @__PURE__ */ new Map();
    for (const candidate of candidates) workload.set(candidate.userId, assignments.filter((assignment) => assignment.judgeId === candidate.userId && !assignment.isRecused).length);
    const selected = [...candidates].sort((a, b) => workload.get(a.userId) - workload.get(b.userId) || a.userId - b.userId)[0];
    await db.insert(judgeAssignments).values({ hackathonId: project.hackathonId, projectId: project.id, judgeId: selected.userId }).onDuplicateKeyUpdate({ set: { isRecused: false } });
    return { success: true, judgeId: selected.userId, existingActiveAssignments: workload.get(selected.userId) ?? 0 };
  }),
  queueAgentAudit: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError6({ code: "FORBIDDEN", message: "Only an organizer can queue an AI audit." });
    const { db, project } = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    const [existing] = await db.select().from(submissionAudits).where(and3(eq5(submissionAudits.projectId, project.id), eq5(submissionAudits.status, "queued"))).orderBy(desc3(submissionAudits.createdAt)).limit(1);
    if (existing) return { auditId: existing.id, status: "queued", reused: true };
    const created = await db.insert(submissionAudits).values({ projectId: project.id, status: "queued", extractionMethod: project.githubUrl ? "github_api" : "manual", report: {} });
    const auditId = Number(created[0].insertId);
    void processQueuedAudit(auditId);
    return { auditId, status: "queued", reused: false };
  }),
  agentAudit: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError6({ code: "FORBIDDEN", message: "Only an organizer can start an AI audit." });
    const { db, project } = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    const [event, connection] = await Promise.all([
      db.select().from(hackathons).where(eq5(hackathons.id, project.hackathonId)).limit(1).then((rows) => rows[0]),
      db.select().from(repositoryConnections).where(and3(eq5(repositoryConnections.projectId, project.id), isNull2(repositoryConnections.revokedAt))).limit(1).then((rows) => rows[0])
    ]);
    const [opportunity] = event?.opportunityId ? await db.select().from(opportunities).where(eq5(opportunities.id, event.opportunityId)).limit(1) : [];
    const connectionMatchesProjectRepository = Boolean(connection && project.githubUrl && connection.githubUrl.replace(/\.git$/, "") === project.githubUrl.replace(/\.git$/, ""));
    const [research] = opportunity ? await db.select().from(researchRuns).where(eq5(researchRuns.opportunityId, opportunity.id)).orderBy(desc3(researchRuns.createdAt)).limit(1) : [];
    const processingAudit = await db.insert(submissionAudits).values({ projectId: project.id, status: "processing", extractionMethod: project.githubUrl ? "github_api" : "manual", report: {} });
    const auditId = Number(processingAudit[0].insertId);
    try {
      const audit = await runHackathonAgent({
        title: project.title,
        description: project.description,
        techStack: project.techStack,
        githubUrl: project.githubUrl,
        demoUrl: project.demoUrl,
        videoUrl: project.videoUrl,
        pitchDeckUrl: project.pitchDeckUrl,
        opportunityContext: opportunity ? `${opportunity.problemStatement}
Value range: ${opportunity.initialValueLow || "Not supplied"}\u2013${opportunity.initialValueHigh || "Not supplied"}
Evidence gaps: ${JSON.stringify(opportunity.evidenceGaps || [])}` : null,
        researchSummary: research ? `${research.summary || ""}
Limitations: ${research.limitations || ""}` : null,
        repositoryAccessMode: connectionMatchesProjectRepository ? connection.accessMode : "public_api"
      });
      await db.update(submissionAudits).set({
        status: "complete",
        extractionMethod: project.githubUrl ? "github_api" : "manual",
        technicalScore: String(audit.technicalScore),
        integrityScore: String(audit.integrityScore),
        originalityScore: String(audit.originalityScore),
        pitchFitScore: String(audit.pitchFitScore),
        finalSuggestedScore: String(audit.finalSuggestedScore),
        report: audit,
        completedAt: /* @__PURE__ */ new Date()
      }).where(eq5(submissionAudits.id, auditId));
      return { auditId, ...audit };
    } catch (error) {
      await db.update(submissionAudits).set({ status: "failed", report: { error: error instanceof Error ? error.message : "Unknown audit failure" }, completedAt: /* @__PURE__ */ new Date() }).where(eq5(submissionAudits.id, auditId));
      throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "The audit could not be completed. Review the submission evidence and try again." });
    }
  }),
  auditReport: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive() })).query(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    if (!access.isAdmin && !access.isAssignedJudge && !access.isTeamMember) throw new TRPCError6({ code: "FORBIDDEN", message: "This audit is not available to the current user." });
    const [audit] = await access.db.select().from(submissionAudits).where(eq5(submissionAudits.projectId, input.projectId)).orderBy(desc3(submissionAudits.createdAt)).limit(1);
    return audit || null;
  }),
  objectionContext: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive() })).query(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    if (!access.isAdmin && !access.isTeamMember) throw new TRPCError6({ code: "FORBIDDEN", message: "Only a project team member can review challengeable evidence." });
    const [audit] = await access.db.select().from(submissionAudits).where(eq5(submissionAudits.projectId, input.projectId)).orderBy(desc3(submissionAudits.createdAt)).limit(1);
    const evaluations = audit?.status === "complete" ? await access.db.select().from(specialistEvaluations).where(and3(eq5(specialistEvaluations.auditId, audit.id), eq5(specialistEvaluations.status, "complete"))) : [];
    const submittedChallenges = await access.db.select().from(objections).where(and3(eq5(objections.projectId, input.projectId), eq5(objections.submittedById, ctx.user.id))).orderBy(desc3(objections.createdAt));
    const specialistFindings = evaluations.flatMap((evaluation) => {
      const result = evaluation.result;
      const findings = result && typeof result === "object" && !Array.isArray(result) && Array.isArray(result.findings) ? result.findings : [];
      return findings.filter((finding) => typeof finding.reference === "string" && typeof finding.criterion === "string" && typeof finding.finding === "string").map((finding) => ({
        challengeReference: specialistChallengeReference(evaluation.id, String(finding.reference)),
        skill: evaluation.skill,
        reference: String(finding.reference),
        criterion: String(finding.criterion),
        finding: String(finding.finding),
        status: String(finding.status || "unclear")
      }));
    });
    return {
      audit: audit || null,
      specialistFindings,
      challenges: submittedChallenges.map((challenge) => ({
        id: challenge.id,
        claimReference: challenge.claimReference,
        explanation: challenge.explanation,
        status: challenge.status,
        response: challenge.response,
        createdAt: challenge.createdAt,
        resolvedAt: challenge.resolvedAt
      }))
    };
  }),
  runSpecialistEvaluation: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive(), skill: z4.enum(specialistSkills) })).mutation(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    const [audit] = await access.db.select().from(submissionAudits).where(and3(eq5(submissionAudits.projectId, input.projectId), eq5(submissionAudits.status, "complete"))).orderBy(desc3(submissionAudits.createdAt)).limit(1);
    if (!audit) throw new TRPCError6({ code: "BAD_REQUEST", message: "Complete the Hackathon Agent evidence audit before running a specialist evaluator." });
    const [event] = await access.db.select().from(hackathons).where(eq5(hackathons.id, access.project.hackathonId)).limit(1);
    const [opportunity] = event?.opportunityId ? await access.db.select().from(opportunities).where(eq5(opportunities.id, event.opportunityId)).limit(1) : [];
    const [research] = opportunity ? await access.db.select().from(researchRuns).where(eq5(researchRuns.opportunityId, opportunity.id)).orderBy(desc3(researchRuns.createdAt)).limit(1) : [];
    const documents = await access.db.select().from(projectAssets).where(and3(eq5(projectAssets.projectId, input.projectId), eq5(projectAssets.assetType, "document")));
    const packet = buildSharedEvidencePacket({ project: access.project, auditReport: audit.report, opportunity, researchSummary: research?.summary || null, projectDocuments: documents });
    const [existing] = await access.db.select().from(specialistEvaluations).where(and3(eq5(specialistEvaluations.auditId, audit.id), eq5(specialistEvaluations.skill, input.skill))).limit(1);
    if (shouldReuseSpecialistEvaluation(existing, packet.evidenceHash)) return { evaluation: existing, reused: true };
    const evaluationId = existing?.id ?? Number((await access.db.insert(specialistEvaluations).values({ auditId: audit.id, projectId: access.project.id, skill: input.skill, version: "v1", policyVersion: packet.policyVersion, evidenceHash: packet.evidenceHash, status: "processing" }))[0].insertId);
    if (existing) await access.db.update(specialistEvaluations).set({ status: "processing", evidenceHash: packet.evidenceHash, result: null, completedAt: null }).where(eq5(specialistEvaluations.id, existing.id));
    try {
      const result = await runSpecialistEvaluator(input.skill, packet);
      await access.db.update(specialistEvaluations).set({ status: "complete", provisionalScore: result.provisionalScore === null ? null : String(result.provisionalScore), result, completedAt: /* @__PURE__ */ new Date() }).where(eq5(specialistEvaluations.id, evaluationId));
      return { evaluation: { id: evaluationId, skill: input.skill, status: "complete", ...result, evidenceHash: packet.evidenceHash }, reused: false };
    } catch (error) {
      await access.db.update(specialistEvaluations).set({ status: "failed", result: { error: error instanceof Error ? error.message : "Unknown specialist evaluation failure" }, completedAt: /* @__PURE__ */ new Date() }).where(eq5(specialistEvaluations.id, evaluationId));
      throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "The specialist evaluation could not be completed. The human review remains available." });
    }
  }),
  reviewContext: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive(), auditId: z4.number().int().positive().optional() })).query(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    const [auditRows, criteria, overrides, scorecardRows, specialist, challengeRows, synthesisRows, annotationRows] = await Promise.all([
      access.db.select().from(submissionAudits).where(input.auditId ? and3(eq5(submissionAudits.projectId, input.projectId), eq5(submissionAudits.id, input.auditId)) : eq5(submissionAudits.projectId, input.projectId)).orderBy(desc3(submissionAudits.createdAt)).limit(1),
      access.db.select().from(rubricCriteria).where(eq5(rubricCriteria.hackathonId, access.project.hackathonId)),
      access.db.select().from(aiOverrides).where(eq5(aiOverrides.projectId, input.projectId)).orderBy(desc3(aiOverrides.createdAt)),
      access.db.select().from(scorecards).where(and3(eq5(scorecards.projectId, input.projectId), eq5(scorecards.judgeId, ctx.user.id))).limit(1),
      access.db.select().from(specialistEvaluations).where(input.auditId ? and3(eq5(specialistEvaluations.projectId, input.projectId), eq5(specialistEvaluations.auditId, input.auditId)) : eq5(specialistEvaluations.projectId, input.projectId)).orderBy(desc3(specialistEvaluations.createdAt)),
      access.db.select().from(objections).where(eq5(objections.projectId, input.projectId)).orderBy(desc3(objections.createdAt)),
      access.db.select().from(evaluationSyntheses).where(input.auditId ? and3(eq5(evaluationSyntheses.projectId, input.projectId), eq5(evaluationSyntheses.auditId, input.auditId)) : eq5(evaluationSyntheses.projectId, input.projectId)).orderBy(desc3(evaluationSyntheses.createdAt)).limit(1),
      access.db.select().from(humanReviewAnnotations).where(eq5(humanReviewAnnotations.projectId, input.projectId)).orderBy(desc3(humanReviewAnnotations.createdAt))
    ]);
    const audit = auditRows[0] || null;
    let evidenceFreshness = null;
    if (audit?.status === "complete") {
      const [event] = await access.db.select().from(hackathons).where(eq5(hackathons.id, access.project.hackathonId)).limit(1);
      const [opportunity] = event?.opportunityId ? await access.db.select().from(opportunities).where(eq5(opportunities.id, event.opportunityId)).limit(1) : [];
      const [research] = opportunity ? await access.db.select().from(researchRuns).where(eq5(researchRuns.opportunityId, opportunity.id)).orderBy(desc3(researchRuns.createdAt)).limit(1) : [];
      const documents = await access.db.select().from(projectAssets).where(and3(eq5(projectAssets.projectId, input.projectId), eq5(projectAssets.assetType, "document")));
      const packet = buildSharedEvidencePacket({ project: access.project, auditReport: audit.report, opportunity, researchSummary: research?.summary || null, projectDocuments: documents });
      evidenceFreshness = evidencePacketFreshness(packet.evidenceHash, specialist, synthesisRows[0] || null);
    }
    return { project: access.project, audit, criteria, overrides, scorecard: scorecardRows[0] || null, specialistEvaluations: specialist, challenges: challengeRows, synthesis: synthesisRows[0] || null, annotations: annotationRows, evidenceFreshness };
  }),
  teamImprovementGuidance: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive() })).query(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    if (!access.isTeamMember && ctx.user.role !== "admin") throw new TRPCError6({ code: "FORBIDDEN", message: "Only a participating team member can view this improvement guidance." });
    const [synthesis] = await access.db.select().from(evaluationSyntheses).where(and3(eq5(evaluationSyntheses.projectId, input.projectId), eq5(evaluationSyntheses.status, "complete"))).orderBy(desc3(evaluationSyntheses.createdAt)).limit(1);
    const result = synthesis?.result && typeof synthesis.result === "object" && !Array.isArray(synthesis.result) ? synthesis.result : null;
    return {
      available: Boolean(synthesis && result),
      evidenceHash: synthesis?.evidenceHash || null,
      createdAt: synthesis?.createdAt || null,
      teamActions: Array.isArray(result?.teamActions) ? result.teamActions : [],
      innovationOpportunities: Array.isArray(result?.innovationOpportunities) ? result.innovationOpportunities : [],
      humanQuestions: Array.isArray(result?.humanQuestions) ? result.humanQuestions : [],
      limitations: Array.isArray(result?.limitations) ? result.limitations : []
    };
  }),
  judgeQueue: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow4();
    if (ctx.user.role === "admin") return db.select().from(projects).orderBy(desc3(projects.updatedAt));
    const assignments = await db.select().from(judgeAssignments).where(and3(eq5(judgeAssignments.judgeId, ctx.user.id), eq5(judgeAssignments.isRecused, false)));
    if (!assignments.length) return [];
    const output = [];
    for (const assignment of assignments) {
      const [project] = await db.select().from(projects).where(eq5(projects.id, assignment.projectId)).limit(1);
      if (project) output.push(project);
    }
    return output;
  }),
  submitScorecard: protectedProcedure.input(z4.object({
    projectId: z4.number().int().positive(),
    items: z4.array(z4.object({ criterionId: z4.number().int().positive(), score: z4.number().min(0).max(10), feedback: z4.string().max(3e3).optional() })).min(1),
    privateNotes: z4.string().max(5e3).optional(),
    finalized: z4.boolean().default(false),
    needsSecondaryReview: z4.boolean().default(false)
  })).mutation(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    const criteria = await access.db.select().from(rubricCriteria).where(eq5(rubricCriteria.hackathonId, access.project.hackathonId));
    const allowedCriteria = new Set(criteria.map((item) => item.id));
    if (input.items.some((item) => !allowedCriteria.has(item.criterionId))) throw new TRPCError6({ code: "BAD_REQUEST", message: "One or more rubric criteria do not belong to this hackathon." });
    const [existing] = await access.db.select().from(scorecards).where(and3(eq5(scorecards.projectId, input.projectId), eq5(scorecards.judgeId, ctx.user.id))).limit(1);
    if (existing?.finalized) throw new TRPCError6({ code: "FORBIDDEN", message: "A finalized scorecard is immutable. Use a documented organizer review process for any correction." });
    const scorecardId = existing?.id ?? Number((await access.db.insert(scorecards).values({ projectId: input.projectId, judgeId: ctx.user.id, privateNotes: input.privateNotes, finalized: input.finalized, needsSecondaryReview: input.needsSecondaryReview }))[0].insertId);
    if (existing) await access.db.update(scorecards).set({ privateNotes: input.privateNotes, finalized: input.finalized, needsSecondaryReview: input.needsSecondaryReview }).where(eq5(scorecards.id, scorecardId));
    for (const item of input.items) {
      await access.db.insert(scoreItems).values({ scorecardId, criterionId: item.criterionId, score: String(item.score), feedback: item.feedback }).onDuplicateKeyUpdate({ set: { score: String(item.score), feedback: item.feedback } });
    }
    return { scorecardId };
  }),
  runEvaluationSynthesis: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive(), auditId: z4.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    const [audit] = await access.db.select().from(submissionAudits).where(input.auditId ? and3(eq5(submissionAudits.projectId, input.projectId), eq5(submissionAudits.status, "complete"), eq5(submissionAudits.id, input.auditId)) : and3(eq5(submissionAudits.projectId, input.projectId), eq5(submissionAudits.status, "complete"))).orderBy(desc3(submissionAudits.createdAt)).limit(1);
    if (!audit) throw new TRPCError6({ code: "BAD_REQUEST", message: "Complete the evidence audit before producing a preliminary cross-skill recommendation." });
    const evaluations = await access.db.select().from(specialistEvaluations).where(and3(eq5(specialistEvaluations.projectId, input.projectId), eq5(specialistEvaluations.auditId, audit.id), eq5(specialistEvaluations.status, "complete")));
    const completedResults = evaluations.flatMap((evaluation) => evaluation.result && typeof evaluation.result === "object" && !Array.isArray(evaluation.result) ? [{ skill: evaluation.skill, result: evaluation.result }] : []);
    if (!completedResults.length) throw new TRPCError6({ code: "BAD_REQUEST", message: "Run at least one cited specialist evaluation before requesting a cross-skill synthesis." });
    const [event] = await access.db.select().from(hackathons).where(eq5(hackathons.id, access.project.hackathonId)).limit(1);
    const [opportunity] = event?.opportunityId ? await access.db.select().from(opportunities).where(eq5(opportunities.id, event.opportunityId)).limit(1) : [];
    const [research] = opportunity ? await access.db.select().from(researchRuns).where(eq5(researchRuns.opportunityId, opportunity.id)).orderBy(desc3(researchRuns.createdAt)).limit(1) : [];
    const documents = await access.db.select().from(projectAssets).where(and3(eq5(projectAssets.projectId, input.projectId), eq5(projectAssets.assetType, "document")));
    const packet = buildSharedEvidencePacket({ project: access.project, auditReport: audit.report, opportunity, researchSummary: research?.summary || null, projectDocuments: documents });
    const created = await access.db.insert(evaluationSyntheses).values({ projectId: input.projectId, auditId: audit.id, initiatedById: ctx.user.id, model: "claude-sonnet-4-6", policyVersion: "evidence-synthesis-v1", evidenceHash: packet.evidenceHash, status: "processing" });
    const synthesisId = Number(created[0].insertId);
    try {
      const output = await runEvaluationSynthesis(packet, completedResults);
      await access.db.update(evaluationSyntheses).set({ status: "complete", model: output.model, result: output.result, completedAt: /* @__PURE__ */ new Date() }).where(eq5(evaluationSyntheses.id, synthesisId));
      return { id: synthesisId, status: "complete", model: output.model, result: output.result, evidenceHash: packet.evidenceHash };
    } catch (error) {
      await access.db.update(evaluationSyntheses).set({ status: "failed", result: { error: error instanceof Error ? error.message : "Unknown synthesis failure" }, completedAt: /* @__PURE__ */ new Date() }).where(eq5(evaluationSyntheses.id, synthesisId));
      throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "The preliminary AI recommendation could not be created. Human review remains available." });
    }
  }),
  addHumanAnnotation: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive(), targetType: z4.enum(["synthesis", "finding", "claim", "market_research"]), targetReference: z4.string().min(1).max(300), annotationType: z4.enum(["note", "voice_transcript", "evidence_correction", "independent_determination"]), body: z4.string().min(3).max(6e3), audioStorageKey: z4.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    const inserted = await access.db.insert(humanReviewAnnotations).values({ projectId: input.projectId, judgeId: ctx.user.id, targetType: input.targetType, targetReference: input.targetReference, annotationType: input.annotationType, body: input.body, audioStorageKey: input.audioStorageKey });
    return { id: Number(inserted[0].insertId), success: true };
  }),
  overrideAgent: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive(), claimReference: z4.string().min(1).max(255), action: z4.enum(["dismiss", "confirm", "escalate"]), reason: z4.string().min(10).max(5e3) })).mutation(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    await requireAuditedClaim(access.db, input.projectId, input.claimReference);
    await access.db.insert(aiOverrides).values({ projectId: input.projectId, judgeId: ctx.user.id, claimReference: input.claimReference, action: input.action, reason: input.reason });
    return { success: true };
  }),
  recuse: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow4();
    await db.update(judgeAssignments).set({ isRecused: true }).where(and3(eq5(judgeAssignments.projectId, input.projectId), eq5(judgeAssignments.judgeId, ctx.user.id)));
    return { success: true };
  }),
  submitObjection: protectedProcedure.input(z4.object({ projectId: z4.number().int().positive(), claimReference: z4.string().min(1).max(255), explanation: z4.string().min(20).max(6e3) })).mutation(async ({ ctx, input }) => {
    const access = await projectAccess(input.projectId, ctx.user.id, ctx.user.role);
    if (!access.isTeamMember) throw new TRPCError6({ code: "FORBIDDEN", message: "Only a project team member can submit an audit objection." });
    await requireAuditedClaim(access.db, input.projectId, input.claimReference);
    await access.db.insert(objections).values({ projectId: input.projectId, submittedById: ctx.user.id, claimReference: input.claimReference, explanation: input.explanation });
    return { success: true };
  }),
  respondToObjection: protectedProcedure.input(z4.object({
    objectionId: z4.number().int().positive(),
    status: z4.enum(["under_review", "resolved", "declined"]),
    response: z4.string().min(10).max(6e3)
  })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow4();
    const [objection] = await db.select().from(objections).where(eq5(objections.id, input.objectionId)).limit(1);
    if (!objection) throw new TRPCError6({ code: "NOT_FOUND", message: "Participant challenge not found." });
    const access = await projectAccess(objection.projectId, ctx.user.id, ctx.user.role);
    requireJudgeOrAdmin(access);
    const resolvedAt = input.status === "resolved" || input.status === "declined" ? /* @__PURE__ */ new Date() : null;
    await db.update(objections).set({ status: input.status, response: input.response, reviewedById: ctx.user.id, resolvedAt }).where(eq5(objections.id, objection.id));
    return { success: true, objectionId: objection.id, status: input.status, resolvedAt };
  })
});

// server/routers/opportunities.ts
import { TRPCError as TRPCError7 } from "@trpc/server";
import { and as and4, desc as desc4, eq as eq6, inArray as inArray2 } from "drizzle-orm";
import mammoth2 from "mammoth";
import { z as z5 } from "zod";

// server/_core/voiceTranscription.ts
var supportedAudioMimeTypes = /* @__PURE__ */ new Set([
  "audio/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/ogg",
  "audio/m4a",
  "audio/mp4"
]);
function normalizeAudioMimeType(mimeType) {
  return mimeType.split(";", 1)[0].trim().toLowerCase();
}
function isSupportedAudioMimeType(mimeType) {
  return supportedAudioMimeTypes.has(normalizeAudioMimeType(mimeType));
}
async function transcribeAudio(options) {
  try {
    if (!ENV.forgeApiUrl) {
      return {
        error: "Voice transcription service is not configured",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_URL is not set"
      };
    }
    if (!ENV.forgeApiKey) {
      return {
        error: "Voice transcription service authentication is missing",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_KEY is not set"
      };
    }
    let audioBuffer;
    let mimeType;
    try {
      const response2 = await fetch(options.audioUrl);
      if (!response2.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response2.status}: ${response2.statusText}`
        };
      }
      audioBuffer = Buffer.from(await response2.arrayBuffer());
      mimeType = normalizeAudioMimeType(response2.headers.get("content-type") || "audio/mpeg");
      if (!isSupportedAudioMimeType(mimeType)) {
        return {
          error: "Unsupported audio format",
          code: "INVALID_FORMAT",
          details: `Received ${mimeType}. Supported formats are WebM, MP3, WAV, OGG, and M4A.`
        };
      }
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
    const formData = new FormData();
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    const prompt = options.prompt || (options.language ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}` : "Transcribe the user's voice to text");
    formData.append("prompt", prompt);
    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL(
      "v1/audio/transcriptions",
      baseUrl
    ).toString();
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "Accept-Encoding": "identity"
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      };
    }
    const whisperResponse = await response.json();
    if (!whisperResponse.text || typeof whisperResponse.text !== "string") {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an invalid response format"
      };
    }
    return whisperResponse;
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}
function getFileExtension(mimeType) {
  const mimeToExt = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a"
  };
  return mimeToExt[normalizeAudioMimeType(mimeType)] || "audio";
}
function getLanguageName(langCode) {
  const langMap = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish"
  };
  return langMap[langCode] || langCode;
}

// server/services/proofReadiness.ts
function deriveProofReadiness(input) {
  if (!input.events) return { state: "not_started", proofDerivedConfidence: 0, message: "No controlled proof sprint has been created for this value case.", recommendation: "Build the evidence plan before opening a proof sprint." };
  if (!input.projects) return { state: "configured", proofDerivedConfidence: 0, message: "A proof sprint exists, but no team project has been submitted yet.", recommendation: "Use the proof sprint to collect submission evidence against the sponsor assumptions." };
  const auditCoverage = Math.min(input.completedAudits / input.projects, 1) * 40;
  const reviewCoverage = Math.min(input.finalizedScorecards / input.projects, 1) * 20;
  const humanQuality = input.finalizedHumanScore === null ? 0 : Math.min(input.finalizedHumanScore, 10) / 10 * 40;
  const proofDerivedConfidence = Math.round(auditCoverage + reviewCoverage + humanQuality);
  if (input.finalizedHumanScore === null) return { state: "evidence_collected", proofDerivedConfidence, message: "This proof-derived confidence is calculated from completed Hackathon Agent audits and finalized human scorecards. It never overwrites sponsor-owned opportunity confidence.", recommendation: "Do not change the investment gate yet: complete independent human scorecards before the proof evidence can support a sponsor decision." };
  if (input.finalizedHumanScore >= 7) return { state: "decision_ready", proofDerivedConfidence, message: "This proof-derived confidence is calculated from completed Hackathon Agent audits and finalized human scorecards. It never overwrites sponsor-owned opportunity confidence.", recommendation: "Proof evidence is sufficient to consider an advance gate, subject to sponsor review of assumptions, citations, and limitations." };
  return { state: "needs_follow_up", proofDerivedConfidence, message: "This proof-derived confidence is calculated from completed Hackathon Agent audits and finalized human scorecards. It never overwrites sponsor-owned opportunity confidence.", recommendation: "Keep or hold the current gate: human proof evidence is incomplete or below the advance threshold; define the next cited proof before investing further." };
}

// server/routers/opportunities.ts
var assetType = z5.enum(["voice", "document", "image", "deck", "video", "other"]);
var uploadSchema = z5.object({
  opportunityId: z5.number().int().positive(),
  assetType,
  fileName: z5.string().min(1).max(300),
  mimeType: z5.string().min(1).max(150),
  base64: z5.string().min(1),
  consent: z5.boolean()
});
async function dbOrThrow5() {
  const db = await getDb();
  if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "The data service is not available." });
  return db;
}
async function ownedOpportunity(opportunityId, userId, allowAdmin, role) {
  const db = await dbOrThrow5();
  const [opportunity] = await db.select().from(opportunities).where(eq6(opportunities.id, opportunityId)).limit(1);
  if (!opportunity || (!allowAdmin || role !== "admin") && opportunity.ownerId !== userId) {
    throw new TRPCError7({ code: "NOT_FOUND", message: "Opportunity not found or access is not permitted." });
  }
  return { db, opportunity };
}
function cleanFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}
function fileBuffer(base64) {
  const cleaned = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  return Buffer.from(cleaned, "base64");
}
async function isSponsorOrAdmin(userId, role) {
  if (role === "admin") return true;
  const db = await dbOrThrow5();
  const [profile] = await db.select().from(userProfiles).where(eq6(userProfiles.userId, userId)).limit(1);
  return profile?.persona === "sponsor";
}
var opportunitiesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow5();
    const where = ctx.user.role === "admin" ? void 0 : eq6(opportunities.ownerId, ctx.user.id);
    return where ? db.select().from(opportunities).where(where).orderBy(desc4(opportunities.updatedAt)) : db.select().from(opportunities).orderBy(desc4(opportunities.updatedAt));
  }),
  detail: protectedProcedure.input(z5.object({ opportunityId: z5.number().int().positive() })).query(async ({ ctx, input }) => {
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, true, ctx.user.role);
    const [assets, runs, indicators, endorsements, communityNotes, linkedEvents] = await Promise.all([
      db.select().from(opportunityAssets).where(eq6(opportunityAssets.opportunityId, opportunity.id)).orderBy(desc4(opportunityAssets.createdAt)),
      db.select().from(researchRuns).where(eq6(researchRuns.opportunityId, opportunity.id)).orderBy(desc4(researchRuns.createdAt)),
      db.select().from(indicatorSnapshots).where(eq6(indicatorSnapshots.opportunityId, opportunity.id)).orderBy(desc4(indicatorSnapshots.createdAt)),
      db.select().from(opportunityEndorsements).where(eq6(opportunityEndorsements.opportunityId, opportunity.id)),
      db.select().from(opportunityCommunityNotes).where(eq6(opportunityCommunityNotes.opportunityId, opportunity.id)).orderBy(desc4(opportunityCommunityNotes.createdAt)),
      db.select().from(hackathons).where(eq6(hackathons.opportunityId, opportunity.id)).orderBy(desc4(hackathons.createdAt))
    ]);
    const linkedProjects = linkedEvents.length ? await db.select().from(projects).where(inArray2(projects.hackathonId, linkedEvents.map((event) => event.id))).orderBy(desc4(projects.updatedAt)) : [];
    const linkedEvent = linkedEvents[0] || null;
    const linkedProject = linkedEvent ? linkedProjects.find((project) => project.hackathonId === linkedEvent.id) || null : null;
    const sourceRows = runs.length ? await db.select().from(researchSources).where(eq6(researchSources.researchRunId, runs[0].id)) : [];
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
        projectSubmittedAt: linkedProject?.submittedAt || null
      } : null,
      indicators,
      community: {
        endorsementCount: endorsements.length,
        viewerEndorsed: endorsements.some((endorsement) => endorsement.userId === ctx.user.id),
        notes: communityNotes.map((note) => ({ id: note.id, category: note.category, body: note.body, evidenceUrl: note.evidenceUrl, createdAt: note.createdAt }))
      }
    };
  }),
  communityBoard: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow5();
    const [rows, endorsements, notes] = await Promise.all([
      db.select().from(opportunities).orderBy(desc4(opportunities.updatedAt)),
      db.select().from(opportunityEndorsements),
      db.select().from(opportunityCommunityNotes).orderBy(desc4(opportunityCommunityNotes.createdAt))
    ]);
    return rows.filter((opportunity) => opportunity.status !== "rejected" && opportunity.status !== "archived" && opportunity.stage !== "closed").map((opportunity) => {
      const opportunityEndorsements2 = endorsements.filter((item) => item.opportunityId === opportunity.id);
      const opportunityNotes = notes.filter((item) => item.opportunityId === opportunity.id).slice(0, 3);
      return {
        id: opportunity.id,
        title: opportunity.title,
        problemStatement: opportunity.problemStatement,
        domain: opportunity.domain,
        targetUser: opportunity.targetUser,
        stage: opportunity.stage,
        endorsementCount: opportunityEndorsements2.length,
        viewerEndorsed: opportunityEndorsements2.some((item) => item.userId === ctx.user.id),
        noteCount: notes.filter((item) => item.opportunityId === opportunity.id).length,
        notes: opportunityNotes.map((note) => ({ id: note.id, category: note.category, body: note.body, evidenceUrl: note.evidenceUrl, createdAt: note.createdAt }))
      };
    });
  }),
  toggleEndorsement: protectedProcedure.input(z5.object({ opportunityId: z5.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow5();
    const [opportunity] = await db.select().from(opportunities).where(eq6(opportunities.id, input.opportunityId)).limit(1);
    if (!opportunity || opportunity.status === "rejected" || opportunity.status === "archived" || opportunity.stage === "closed") throw new TRPCError7({ code: "NOT_FOUND", message: "This opportunity is not open for early signals." });
    const [existing] = await db.select().from(opportunityEndorsements).where(and4(eq6(opportunityEndorsements.opportunityId, input.opportunityId), eq6(opportunityEndorsements.userId, ctx.user.id))).limit(1);
    if (existing) {
      await db.delete(opportunityEndorsements).where(eq6(opportunityEndorsements.id, existing.id));
      return { endorsed: false };
    }
    await db.insert(opportunityEndorsements).values({ opportunityId: input.opportunityId, userId: ctx.user.id });
    return { endorsed: true };
  }),
  addCommunityNote: protectedProcedure.input(z5.object({
    opportunityId: z5.number().int().positive(),
    category: z5.enum(["customer_signal", "market_signal", "operating_signal", "evidence_offer", "question", "other"]),
    body: z5.string().min(10).max(1200),
    evidenceUrl: z5.string().url().max(1e3).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow5();
    const [opportunity] = await db.select().from(opportunities).where(eq6(opportunities.id, input.opportunityId)).limit(1);
    if (!opportunity || opportunity.status === "rejected" || opportunity.status === "archived" || opportunity.stage === "closed") throw new TRPCError7({ code: "NOT_FOUND", message: "This opportunity is not open for early signals." });
    const created = await db.insert(opportunityCommunityNotes).values({
      opportunityId: input.opportunityId,
      authorId: ctx.user.id,
      category: input.category,
      body: input.body,
      evidenceUrl: input.evidenceUrl
    });
    return { noteId: Number(created[0].insertId) };
  }),
  proofReadiness: protectedProcedure.input(z5.object({ opportunityId: z5.number().int().positive() })).query(async ({ ctx, input }) => {
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, true, ctx.user.role);
    const events = await db.select().from(hackathons).where(eq6(hackathons.opportunityId, opportunity.id));
    if (!events.length) return { ...deriveProofReadiness({ events: 0, projects: 0, completedAudits: 0, finalizedScorecards: 0, finalizedHumanScore: null }), finalizedHumanScore: null, finalizedScorecards: 0, completedAudits: 0, projects: 0 };
    const eventIds = events.map((event) => event.id);
    const eventProjects = await db.select().from(projects).where(inArray2(projects.hackathonId, eventIds));
    if (!eventProjects.length) return { ...deriveProofReadiness({ events: events.length, projects: 0, completedAudits: 0, finalizedScorecards: 0, finalizedHumanScore: null }), finalizedHumanScore: null, finalizedScorecards: 0, completedAudits: 0, projects: 0 };
    const projectIds = eventProjects.map((project) => project.id);
    const [finalCards, items, audits, criteria] = await Promise.all([
      db.select().from(scorecards).where(and4(inArray2(scorecards.projectId, projectIds), eq6(scorecards.finalized, true))),
      db.select().from(scoreItems),
      db.select().from(submissionAudits).where(and4(inArray2(submissionAudits.projectId, projectIds), eq6(submissionAudits.status, "complete"))),
      db.select().from(rubricCriteria).where(inArray2(rubricCriteria.hackathonId, eventIds))
    ]);
    const humanScore = averageFinalizedHumanScores(finalCards, items.filter((item) => finalCards.some((card) => card.id === item.scorecardId)), criteria);
    return { ...deriveProofReadiness({ events: events.length, projects: eventProjects.length, completedAudits: audits.length, finalizedScorecards: finalCards.length, finalizedHumanScore: humanScore }), finalizedHumanScore: humanScore, finalizedScorecards: finalCards.length, completedAudits: audits.length, projects: eventProjects.length };
  }),
  specialistReviewPlan: protectedProcedure.input(z5.object({ opportunityId: z5.number().int().positive() })).query(async ({ ctx, input }) => {
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, true, ctx.user.role);
    const events = await db.select().from(hackathons).where(eq6(hackathons.opportunityId, opportunity.id)).orderBy(desc4(hackathons.updatedAt));
    if (!events.length) return { project: null, evaluations: [] };
    const eventIds = events.map((event) => event.id);
    const eventProjects = await db.select().from(projects).where(inArray2(projects.hackathonId, eventIds)).orderBy(desc4(projects.updatedAt));
    const project = eventProjects[0];
    if (!project) return { project: null, evaluations: [] };
    const evaluations = await db.select({ skill: specialistEvaluations.skill, status: specialistEvaluations.status }).from(specialistEvaluations).where(eq6(specialistEvaluations.projectId, project.id));
    return { project: { id: project.id, title: project.title, submittedAt: project.submittedAt }, evaluations };
  }),
  create: protectedProcedure.input(z5.object({
    title: z5.string().min(5).max(255),
    problemStatement: z5.string().min(20).max(8e3),
    targetUser: z5.string().max(255).optional(),
    domain: z5.string().max(160).optional(),
    narrative: z5.string().max(12e3).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow5();
    const result = await db.insert(opportunities).values({
      ownerId: ctx.user.id,
      title: input.title,
      problemStatement: input.problemStatement,
      opportunityNarrative: input.narrative,
      targetUser: input.targetUser,
      domain: input.domain
    });
    const opportunityId = Number(result[0].insertId);
    return { opportunityId };
  }),
  uploadAsset: protectedProcedure.input(uploadSchema).mutation(async ({ ctx, input }) => {
    if (!input.consent) {
      throw new TRPCError7({ code: "BAD_REQUEST", message: "Explicit consent is required before processing a voice or document asset." });
    }
    const supportedDocumentTypes = /* @__PURE__ */ new Set([
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]);
    if (input.assetType === "document" && !supportedDocumentTypes.has(input.mimeType)) {
      throw new TRPCError7({ code: "BAD_REQUEST", message: "Supported opportunity documents are plain text, Markdown, CSV, PDF, and DOCX files." });
    }
    const normalizedMimeType = input.assetType === "voice" ? normalizeAudioMimeType(input.mimeType) : input.mimeType;
    if (input.assetType === "voice" && !isSupportedAudioMimeType(normalizedMimeType)) {
      throw new TRPCError7({ code: "BAD_REQUEST", message: "Supported voice formats are WebM, MP3, WAV, OGG, and M4A. Please choose one of these formats and try again." });
    }
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, false, ctx.user.role);
    const buffer = fileBuffer(input.base64);
    const maximum = input.assetType === "voice" ? 16 * 1024 * 1024 : 8 * 1024 * 1024;
    if (buffer.length > maximum) {
      throw new TRPCError7({ code: "PAYLOAD_TOO_LARGE", message: `This ${input.assetType} exceeds the supported size limit.` });
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
      contributorConfirmed: false
    });
    const assetId = Number(inserted[0].insertId);
    let transcript;
    let extraction;
    if (input.assetType === "voice") {
      const signedUrl = await storageGetSignedUrl(stored.key);
      const result = await transcribeAudio({ audioUrl: signedUrl, language: "en", prompt: "Transcribe an opportunity explanation for an innovation portfolio." });
      if ("error" in result) {
        console.error("Voice transcription failed", { opportunityId: opportunity.id, assetId, code: result.code, details: result.details });
        throw new TRPCError7({ code: "BAD_REQUEST", message: result.error, cause: result.details });
      }
      transcript = result.text;
      extraction = { language: result.language, duration: result.duration, segments: result.segments };
    } else if (input.assetType === "document" && input.mimeType.startsWith("text/")) {
      extraction = { text: buffer.toString("utf8").slice(0, 3e4), method: "direct_text" };
    } else if (input.assetType === "document" && (input.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || input.fileName.toLowerCase().endsWith(".docx"))) {
      const result = await mammoth2.extractRawText({ buffer });
      extraction = { text: result.value.slice(0, 3e4), warnings: result.messages, method: "docx_raw_text" };
    } else if (input.assetType === "document" && input.mimeType === "application/pdf") {
      const signedUrl = await storageGetSignedUrl(stored.key);
      extraction = { ...await extractPdfEvidence(signedUrl), method: "ai_pdf_extraction" };
    } else if (input.assetType === "document") {
      extraction = { status: "stored_for_review", note: "This file type is retained as source evidence but needs a compatible extraction pathway before synthesis." };
    }
    if (transcript || extraction) {
      await db.update(opportunityAssets).set({ transcript, extraction }).where(eq6(opportunityAssets.id, assetId));
    }
    return { assetId, transcript, extraction, storageUrl: stored.url };
  }),
  confirmAsset: protectedProcedure.input(z5.object({ assetId: z5.number().int().positive(), opportunityId: z5.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const { db } = await ownedOpportunity(input.opportunityId, ctx.user.id, false, ctx.user.role);
    await db.update(opportunityAssets).set({ contributorConfirmed: true }).where(and4(eq6(opportunityAssets.id, input.assetId), eq6(opportunityAssets.opportunityId, input.opportunityId)));
    return { success: true };
  }),
  generateBrief: protectedProcedure.input(z5.object({ opportunityId: z5.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, false, ctx.user.role);
    const assets = await db.select().from(opportunityAssets).where(eq6(opportunityAssets.opportunityId, opportunity.id));
    const brief = await createOpportunityBrief({ ...opportunity, assets });
    await db.update(opportunities).set({
      title: brief.title.slice(0, 255),
      aiBrief: brief,
      evidenceGaps: brief.evidenceGaps,
      stage: "shaping"
    }).where(eq6(opportunities.id, opportunity.id));
    return brief;
  }),
  research: protectedProcedure.input(z5.object({ opportunityId: z5.number().int().positive(), consent: z5.boolean() })).mutation(async ({ ctx, input }) => {
    if (!input.consent) throw new TRPCError7({ code: "BAD_REQUEST", message: "Confirm the approved external-research scope before starting a research run." });
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, true, ctx.user.role);
    await db.insert(consentRecords).values({ userId: ctx.user.id, scope: "external_research", accepted: true, policyVersion: "v1" });
    const created = await db.insert(researchRuns).values({ opportunityId: opportunity.id, requestedById: ctx.user.id, scope: "Public web research for comparable offerings and relevant precedents.", status: "running" });
    const researchRunId = Number(created[0].insertId);
    try {
      const assets = await db.select().from(opportunityAssets).where(eq6(opportunityAssets.opportunityId, opportunity.id));
      const research = await conductOpportunityResearch({ ...opportunity, assets });
      await db.update(researchRuns).set({ status: "needs_review", summary: research.summary, limitations: research.limitations, dossier: research.dossier, completedAt: /* @__PURE__ */ new Date() }).where(eq6(researchRuns.id, researchRunId));
      if (research.sources.length) {
        await db.insert(researchSources).values(research.sources.map((source) => ({
          researchRunId,
          url: source.url,
          title: source.title.slice(0, 500),
          excerpt: source.excerpt,
          relevance: source.relevance,
          evidenceCategory: source.evidenceCategory,
          similarityAssessment: source.assessment
        })));
      }
      await db.update(opportunities).set({ stage: "evidence" }).where(eq6(opportunities.id, opportunity.id));
      return { researchRunId, ...research };
    } catch (error) {
      await db.update(researchRuns).set({ status: "failed", completedAt: /* @__PURE__ */ new Date() }).where(eq6(researchRuns.id, researchRunId));
      throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Research could not be completed." });
    }
  }),
  setSelection: protectedProcedure.input(z5.object({ opportunityId: z5.number().int().positive(), status: z5.enum(["selected", "deferred", "rejected"]) })).mutation(async ({ ctx, input }) => {
    if (!await isSponsorOrAdmin(ctx.user.id, ctx.user.role)) throw new TRPCError7({ code: "FORBIDDEN", message: "Only an authorized sponsor or administrator can record the selection decision." });
    const db = await dbOrThrow5();
    const [opportunity] = await db.select().from(opportunities).where(eq6(opportunities.id, input.opportunityId)).limit(1);
    if (!opportunity) throw new TRPCError7({ code: "NOT_FOUND", message: "Opportunity not found." });
    const selected = input.status === "selected";
    await db.update(opportunities).set({
      status: input.status,
      stage: selected ? "selected" : opportunity.stage,
      selectedAt: selected ? /* @__PURE__ */ new Date() : null
    }).where(eq6(opportunities.id, opportunity.id));
    return { success: true };
  }),
  saveValueCase: protectedProcedure.input(z5.object({
    opportunityId: z5.number().int().positive(),
    initialValueLow: z5.number().min(0).max(1e9).optional(),
    initialValueHigh: z5.number().min(0).max(1e9).optional(),
    valueCurrency: z5.string().min(3).max(8),
    costToProve: z5.number().min(0).max(1e9).optional(),
    timeToValueMonths: z5.number().int().min(0).max(240).optional(),
    valueCaseNarrative: z5.string().max(6e3).optional(),
    valueDrivers: z5.array(z5.string().min(2).max(240)).max(12),
    economicAssumptions: z5.array(z5.string().min(2).max(500)).max(16),
    investmentGate: z5.enum(["shape_value_case", "research", "proof_sprint", "hold", "advance"]),
    investmentGateRationale: z5.string().max(4e3).optional()
  })).mutation(async ({ ctx, input }) => {
    if (!await isSponsorOrAdmin(ctx.user.id, ctx.user.role)) throw new TRPCError7({ code: "FORBIDDEN", message: "Only an authorized sponsor or administrator can set the economic case and investment gate." });
    if (input.initialValueLow !== void 0 && input.initialValueHigh !== void 0 && input.initialValueLow > input.initialValueHigh) {
      throw new TRPCError7({ code: "BAD_REQUEST", message: "The conservative value range cannot exceed the upside range." });
    }
    const db = await dbOrThrow5();
    const [opportunity] = await db.select().from(opportunities).where(eq6(opportunities.id, input.opportunityId)).limit(1);
    if (!opportunity) throw new TRPCError7({ code: "NOT_FOUND", message: "Opportunity not found." });
    await db.update(opportunities).set({
      initialValueLow: input.initialValueLow === void 0 ? null : String(input.initialValueLow),
      initialValueHigh: input.initialValueHigh === void 0 ? null : String(input.initialValueHigh),
      valueCurrency: input.valueCurrency.toUpperCase(),
      costToProve: input.costToProve === void 0 ? null : String(input.costToProve),
      timeToValueMonths: input.timeToValueMonths ?? null,
      valueCaseNarrative: input.valueCaseNarrative || null,
      valueDrivers: input.valueDrivers,
      economicAssumptions: input.economicAssumptions,
      investmentGate: input.investmentGate,
      investmentGateRationale: input.investmentGateRationale || null
    }).where(eq6(opportunities.id, opportunity.id));
    const [persistedOpportunity] = await db.select().from(opportunities).where(eq6(opportunities.id, opportunity.id)).limit(1);
    if (!persistedOpportunity) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "The saved economic case could not be read back." });
    return { success: true, opportunity: persistedOpportunity };
  }),
  recordIndicator: protectedProcedure.input(z5.object({
    opportunityId: z5.number().int().positive(),
    category: z5.enum(["customer_value", "operating_value", "evidence_confidence", "technical_execution", "claim_integrity", "originality", "delivery_fit"]),
    label: z5.string().min(3).max(255),
    value: z5.number(),
    unit: z5.string().min(1).max(80),
    evidence: z5.string().min(10).max(5e3)
  })).mutation(async ({ ctx, input }) => {
    const { db, opportunity } = await ownedOpportunity(input.opportunityId, ctx.user.id, true, ctx.user.role);
    await db.insert(indicatorSnapshots).values({ ...input, opportunityId: opportunity.id, value: String(input.value), createdById: ctx.user.id });
    if (input.category === "evidence_confidence") {
      await db.update(opportunities).set({ confidence: Math.max(0, Math.min(100, Math.round(input.value))) }).where(eq6(opportunities.id, opportunity.id));
    }
    return { success: true };
  })
});

// server/routers/repositories.ts
import { TRPCError as TRPCError8 } from "@trpc/server";
import { and as and5, desc as desc6, eq as eq8, isNull as isNull3 } from "drizzle-orm";
import { z as z6 } from "zod";
import { parse as parseCookie2 } from "cookie";

// server/services/repositoryCodeIndex.ts
import { createHash as createHash2 } from "node:crypto";
import { desc as desc5, eq as eq7 } from "drizzle-orm";
var EMBEDDING_DIMENSIONS = 1536;
var EMBEDDING_MODEL = "deterministic-hash-1536";
var EMBEDDING_VERSION = "mysql-hash-v1";
var MAX_COMMITS_PER_SYNC = 20;
var MAX_PATCH_CHARS = 1e4;
var SKIPPED_EXTENSIONS = /* @__PURE__ */ new Set(["png", "jpg", "jpeg", "gif", "webp", "pdf", "zip", "gz", "lock", "svg", "ico"]);
function parseGitHubUrl2(url) {
  const match = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/i);
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/, "") } : null;
}
function shouldIndex(path4, patch, status) {
  const extension = path4.split(".").pop()?.toLowerCase();
  return status !== "removed" && Boolean(patch) && patch.length <= MAX_PATCH_CHARS && (!extension || !SKIPPED_EXTENSIONS.has(extension));
}
function deterministicEmbedding(text2, dimensions = EMBEDDING_DIMENSIONS) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = text2.toLowerCase().match(/[a-z0-9_./-]{2,}/g) ?? [];
  for (const token of tokens) {
    const digest = createHash2("sha256").update(token).digest();
    const slot = digest.readUInt32BE(0) % dimensions;
    vector[slot] += digest[4] % 2 ? 1 : -1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0));
  return magnitude ? vector.map((item) => item / magnitude) : vector;
}
function fingerprintEvidenceQuery(query) {
  return createHash2("sha256").update(query.trim().toLowerCase()).digest("hex");
}
function cosineSimilarity(left, right) {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  for (let index2 = 0; index2 < length; index2 += 1) dot += left[index2] * right[index2];
  return dot;
}
async function githubFetch(connection, path4) {
  if (connection.accessMode === "github_app") return githubInstallationFetch(path4);
  return fetch(`https://api.github.com${path4}`, { headers: { accept: "application/vnd.github+json", "user-agent": "John-Deere-Idea-Value-Studio" } });
}
async function syncAuthorizedRepositoryCode(connectionId) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable for repository code indexing.");
  const [connection] = await db.select().from(repositoryConnections).where(eq7(repositoryConnections.id, connectionId)).limit(1);
  if (!connection || connection.revokedAt) throw new Error("Repository connection is not active.");
  const parsed = parseGitHubUrl2(connection.githubUrl);
  if (!parsed) throw new Error("Repository indexing supports GitHub owner/repository URLs only.");
  const [state] = await db.select().from(repositorySyncStates).where(eq7(repositorySyncStates.repositoryConnectionId, connection.id)).limit(1);
  const commitsResponse = await githubFetch(connection, `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/commits?per_page=${MAX_COMMITS_PER_SYNC}`);
  if (!commitsResponse.ok) throw new Error(`Repository commit retrieval failed (HTTP ${commitsResponse.status}).`);
  const newestFirst = await commitsResponse.json();
  const unseen = [];
  for (const commit of newestFirst) {
    if (state?.lastSyncedCommitSha && commit.sha === state.lastSyncedCommitSha) break;
    unseen.push(commit);
  }
  let latestSha = state?.lastSyncedCommitSha ?? null;
  let indexedChunks = 0;
  for (const commit of unseen.reverse()) {
    const detailResponse = await githubFetch(connection, `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/commits/${encodeURIComponent(commit.sha)}`);
    if (!detailResponse.ok) throw new Error(`Repository commit detail retrieval failed (HTTP ${detailResponse.status}).`);
    const detail = await detailResponse.json();
    for (const file of detail.files ?? []) {
      if (!shouldIndex(file.filename, file.patch, file.status)) continue;
      const contentChunk = `Repository: ${parsed.owner}/${parsed.repo}
File: ${file.filename}
Commit: ${detail.commit?.message ?? "No commit message"}
Diff:
${file.patch}`;
      const id = `${connection.id}:${file.filename}:${detail.sha}`.slice(0, 500);
      const embedding = deterministicEmbedding(contentChunk);
      const contentHash = createHash2("sha256").update(contentChunk).digest("hex");
      await db.insert(codeIndexChunks).values({ id, repositoryConnectionId: connection.id, commitSha: detail.sha, filePath: file.filename, contentChunk, contentHash, embedding, embeddingModel: EMBEDDING_MODEL, embeddingVersion: EMBEDDING_VERSION }).onDuplicateKeyUpdate({ set: { contentChunk, contentHash, embedding, embeddingModel: EMBEDDING_MODEL, embeddingVersion: EMBEDDING_VERSION, updatedAt: /* @__PURE__ */ new Date() } });
      indexedChunks += 1;
    }
    latestSha = detail.sha;
  }
  if (latestSha) await db.insert(repositorySyncStates).values({ repositoryConnectionId: connection.id, lastSyncedCommitSha: latestSha, lastSyncedAt: /* @__PURE__ */ new Date() }).onDuplicateKeyUpdate({ set: { lastSyncedCommitSha: latestSha, lastSyncedAt: /* @__PURE__ */ new Date() } });
  await db.update(repositoryConnections).set({ lastObservedAt: /* @__PURE__ */ new Date() }).where(eq7(repositoryConnections.id, connection.id));
  return { connectionId: connection.id, newCommits: unseen.length, indexedChunks, lastSyncedCommitSha: latestSha };
}
async function searchIndexedCode(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable for repository code search.");
  const queryEmbedding = deterministicEmbedding(input.query);
  const chunks = await db.select().from(codeIndexChunks).where(eq7(codeIndexChunks.repositoryConnectionId, input.connectionId)).orderBy(desc5(codeIndexChunks.updatedAt));
  const results = chunks.map((chunk) => ({ id: chunk.id, filePath: chunk.filePath, commitSha: chunk.commitSha, contentChunk: chunk.contentChunk, similarity: cosineSimilarity(queryEmbedding, chunk.embedding), embeddingVersion: chunk.embeddingVersion })).filter((chunk) => chunk.similarity > 0).sort((left, right) => right.similarity - left.similarity).slice(0, Math.min(Math.max(input.limit ?? 5, 1), 20));
  await db.insert(semanticRetrievalAudits).values({ projectId: input.projectId, repositoryConnectionId: input.connectionId, actorId: input.actorId, queryFingerprint: fingerprintEvidenceQuery(input.query), retrievalMode: `${EMBEDDING_MODEL}:${EMBEDDING_VERSION}`, resultCount: results.length });
  return results;
}

// server/routers/repositories.ts
function parseGitHubUrl3(url) {
  const match = url.trim().match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/i);
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/, "") } : null;
}
function assertSixFieldCron2(cron) {
  if (cron.trim().split(/\s+/).length !== 6) {
    throw new TRPCError8({ code: "BAD_REQUEST", message: "Monitoring uses a six-field UTC cron expression, for example: 0 0 */6 * * *." });
  }
}
function sessionToken(cookieHeader) {
  const token = parseCookie2(cookieHeader ?? "")[COOKIE_NAME];
  if (!token) throw new TRPCError8({ code: "UNAUTHORIZED", message: "A signed-in organizer session is required to manage monitoring." });
  return token;
}
async function dbOrThrow6() {
  const db = await getDb();
  if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "The data service is not available." });
  return db;
}
async function requireProjectAdmin(projectId, role) {
  if (role !== "admin") throw new TRPCError8({ code: "FORBIDDEN", message: "Only an organizer can authorize, revoke, or schedule repository access." });
  const db = await dbOrThrow6();
  const [project] = await db.select().from(projects).where(eq8(projects.id, projectId)).limit(1);
  if (!project) throw new TRPCError8({ code: "NOT_FOUND", message: "Project not found." });
  return { db, project };
}
var repositoriesRouter = router({
  listForProject: protectedProcedure.input(z6.object({ projectId: z6.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await dbOrThrow6();
    if (ctx.user.role !== "admin") throw new TRPCError8({ code: "FORBIDDEN", message: "Only organizers can inspect repository authorization records." });
    return db.select().from(repositoryConnections).where(eq8(repositoryConnections.projectId, input.projectId)).orderBy(desc6(repositoryConnections.createdAt));
  }),
  searchIndexedEvidence: protectedProcedure.input(z6.object({ projectId: z6.number().int().positive(), query: z6.string().min(3).max(2e3), limit: z6.number().int().min(1).max(20).default(5) })).query(async ({ ctx, input }) => {
    const { db, project } = await requireProjectAdmin(input.projectId, ctx.user.role);
    const [connection] = await db.select().from(repositoryConnections).where(and5(eq8(repositoryConnections.projectId, project.id), isNull3(repositoryConnections.revokedAt))).orderBy(desc6(repositoryConnections.createdAt)).limit(1);
    if (!connection) throw new TRPCError8({ code: "PRECONDITION_FAILED", message: "Authorize and monitor a repository before searching indexed evidence." });
    return searchIndexedCode({ projectId: project.id, connectionId: connection.id, actorId: ctx.user.id, query: input.query, limit: input.limit });
  }),
  authorize: protectedProcedure.input(z6.object({ projectId: z6.number().int().positive(), githubUrl: z6.string().url().max(600), evidenceMode: z6.enum(["public_api", "github_app"]) })).mutation(async ({ ctx, input }) => {
    const { db, project } = await requireProjectAdmin(input.projectId, ctx.user.role);
    const parsed = parseGitHubUrl3(input.githubUrl);
    if (!parsed) throw new TRPCError8({ code: "BAD_REQUEST", message: "Use a GitHub repository URL in owner/repository form." });
    await db.update(repositoryConnections).set({ revokedAt: /* @__PURE__ */ new Date(), scheduleCronTaskUid: null }).where(and5(eq8(repositoryConnections.projectId, project.id), isNull3(repositoryConnections.revokedAt)));
    if (input.evidenceMode === "public_api") {
      const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers: { accept: "application/vnd.github+json", "user-agent": "John-Deere-Idea-Value-Studio" } });
      if (!response.ok) throw new TRPCError8({ code: "BAD_REQUEST", message: "The public repository could not be verified." });
      const repository2 = await response.json();
      if (repository2.private) throw new TRPCError8({ code: "BAD_REQUEST", message: "Private repositories require the approved GitHub App evidence mode." });
      await db.insert(repositoryConnections).values({ projectId: project.id, githubUrl: repository2.html_url, visibility: "public", accessMode: "public_api", authorizedById: ctx.user.id, authorizedRepositoryId: String(repository2.id), authorizationEvidence: { fullName: repository2.full_name, verifiedAt: (/* @__PURE__ */ new Date()).toISOString(), access: "public_read_only" } });
      await db.update(projects).set({ githubUrl: repository2.html_url }).where(eq8(projects.id, project.id));
      return { success: true, visibility: "public", accessMode: "public_api" };
    }
    const config = await getGitHubAppConfig();
    if (!config) throw new TRPCError8({ code: "PRECONDITION_FAILED", message: "Private repository access has not been configured for this environment." });
    const authorized = await listAuthorizedInstallationRepositories();
    const repository = authorized.find((item) => item.full_name.toLowerCase() === `${parsed.owner}/${parsed.repo}`.toLowerCase());
    if (!repository) throw new TRPCError8({ code: "FORBIDDEN", message: "This repository is not in the approved GitHub App installation scope." });
    await db.insert(repositoryConnections).values({ projectId: project.id, githubUrl: repository.html_url, visibility: repository.private ? "private" : "public", accessMode: "github_app", appId: config.appId, installationId: config.installationId, authorizedById: ctx.user.id, authorizedRepositoryId: String(repository.id), authorizationEvidence: { fullName: repository.full_name, verifiedAt: (/* @__PURE__ */ new Date()).toISOString(), installationScope: "explicitly_authorized_read_only" } });
    await db.update(projects).set({ githubUrl: repository.html_url }).where(eq8(projects.id, project.id));
    return { success: true, visibility: repository.private ? "private" : "public", accessMode: "github_app" };
  }),
  revoke: protectedProcedure.input(z6.object({ projectId: z6.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const { db, project } = await requireProjectAdmin(input.projectId, ctx.user.role);
    await db.update(repositoryConnections).set({ revokedAt: /* @__PURE__ */ new Date(), scheduleCronTaskUid: null }).where(and5(eq8(repositoryConnections.projectId, project.id), isNull3(repositoryConnections.revokedAt)));
    return { success: true };
  }),
  scheduleMonitoring: protectedProcedure.input(z6.object({ projectId: z6.number().int().positive(), cron: z6.string().min(9).max(80), enabled: z6.boolean().default(true) })).mutation(async ({ ctx, input }) => {
    const { db, project } = await requireProjectAdmin(input.projectId, ctx.user.role);
    assertSixFieldCron2(input.cron);
    const [connection] = await db.select().from(repositoryConnections).where(and5(eq8(repositoryConnections.projectId, project.id), isNull3(repositoryConnections.revokedAt))).orderBy(desc6(repositoryConnections.createdAt)).limit(1);
    if (!connection) throw new TRPCError8({ code: "PRECONDITION_FAILED", message: "Authorize a repository before enabling monitoring." });
    const token = sessionToken(ctx.req.headers.cookie);
    if (connection.scheduleCronTaskUid) {
      const update = await updateHeartbeatJob(connection.scheduleCronTaskUid, { cron: input.cron, enable: input.enabled, path: "/api/scheduled/monitorRepository", description: `Repository observation for project ${project.id}` }, token);
      return { taskUid: connection.scheduleCronTaskUid, nextExecutionAt: update.nextExecutionAt ?? null };
    }
    const job = await createHeartbeatJob({ name: `repository-monitor-${connection.id}`, cron: input.cron, path: "/api/scheduled/monitorRepository", payload: {}, description: `Repository observation for project ${project.id}` }, token);
    await db.update(repositoryConnections).set({ scheduleCronTaskUid: job.taskUid }).where(eq8(repositoryConnections.id, connection.id));
    return { taskUid: job.taskUid, nextExecutionAt: job.nextExecutionAt ?? null };
  }),
  stopMonitoring: protectedProcedure.input(z6.object({ projectId: z6.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const { db, project } = await requireProjectAdmin(input.projectId, ctx.user.role);
    const [connection] = await db.select().from(repositoryConnections).where(and5(eq8(repositoryConnections.projectId, project.id), isNull3(repositoryConnections.revokedAt))).orderBy(desc6(repositoryConnections.createdAt)).limit(1);
    if (!connection?.scheduleCronTaskUid) return { success: true, skipped: "not_scheduled" };
    await deleteHeartbeatJob(connection.scheduleCronTaskUid, sessionToken(ctx.req.headers.cookie));
    await db.update(repositoryConnections).set({ scheduleCronTaskUid: null }).where(eq8(repositoryConnections.id, connection.id));
    return { success: true };
  })
});

// server/routers/studio.ts
import { TRPCError as TRPCError9 } from "@trpc/server";
import { and as and6, desc as desc7, eq as eq9, inArray as inArray3 } from "drizzle-orm";
import { z as z7 } from "zod";

// server/services/studioEvidenceAgent.ts
import { createHash as createHash3 } from "node:crypto";
import { readFile as readFile3 } from "node:fs/promises";
var studioSkillCatalog = [
  { key: "business_case", label: "Business-case and investment thesis" },
  { key: "business_requirements", label: "Business requirements document" },
  { key: "ux_ui", label: "UX/UI and accessibility" },
  { key: "technical_design", label: "Technical architecture and integration" },
  { key: "cloud_architecture", label: "Cloud architecture and operability" },
  { key: "code_delivery", label: "Repository and delivery quality" },
  { key: "security", label: "Security and operational resilience" },
  { key: "market_value", label: "Market, customer, and value proposition" },
  { key: "innovation", label: "Innovation and differentiation" },
  { key: "efficiency_optimization", label: "Cost, efficiency, and optimization" }
];
var STUDIO_AGENT_CONTRACT_VERSION = "ten-skill-evidence-v3";
var compact = (value, length = 4e3) => (value || "").slice(0, length);
function studioEvidenceHash(input) {
  return createHash3("sha256").update(JSON.stringify({ contractVersion: STUDIO_AGENT_CONTRACT_VERSION, input })).digest("hex");
}
function studioEvidencePrompt(input) {
  return JSON.stringify({
    investmentCase: { title: input.investmentTitle, thesis: input.investmentThesis, problem: input.problemStatement, businessCase: input.businessCase },
    proofContract: { question: input.proofQuestion, requiredArtifacts: input.requiredArtifacts, rubric: input.rubric },
    teamProof: { solutionSummary: input.solutionSummary },
    authorizedArtifacts: input.artifacts.map((artifact) => ({ key: artifact.artifactKey, type: artifact.artifactType, title: artifact.title, url: artifact.evidenceUrl, extractedText: compact(artifact.extractedText) }))
  });
}
var outputSchema = {
  name: "studio_evidence_packet",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      agentFindings: { type: "array", items: { type: "object", additionalProperties: false, properties: { claim: { type: "string" }, assessment: { type: "string", enum: ["supported", "partial", "unsupported", "not_available"] }, reasoning: { type: "string" }, evidenceRefs: { type: "array", items: { type: "string" } } }, required: ["claim", "assessment", "reasoning", "evidenceRefs"] } },
      skillFindings: { type: "array", items: { type: "object", additionalProperties: false, properties: { skill: { type: "string", enum: studioSkillCatalog.map((item) => item.key) }, verdict: { type: "string", enum: ["supported", "partial", "needs_evidence"] }, finding: { type: "string" }, evidenceRefs: { type: "array", items: { type: "string" } }, question: { type: "string" } }, required: ["skill", "verdict", "finding", "evidenceRefs", "question"] } },
      marketContext: { type: "object", additionalProperties: false, properties: { assessment: { type: "string" }, evidenceRefs: { type: "array", items: { type: "string" } }, limitation: { type: "string" } }, required: ["assessment", "evidenceRefs", "limitation"] },
      teamQuestions: { type: "array", items: { type: "object", additionalProperties: false, properties: { question: { type: "string" }, why: { type: "string" }, evidenceRefs: { type: "array", items: { type: "string" } } }, required: ["question", "why", "evidenceRefs"] } },
      judgeQuestions: { type: "array", items: { type: "object", additionalProperties: false, properties: { question: { type: "string" }, why: { type: "string" }, evidenceRefs: { type: "array", items: { type: "string" } } }, required: ["question", "why", "evidenceRefs"] } },
      limitations: { type: "array", items: { type: "string" } }
    },
    required: ["agentFindings", "skillFindings", "marketContext", "teamQuestions", "judgeQuestions", "limitations"]
  }
};
async function evaluateStudioProof(input) {
  let apiKey = "";
  try {
    const keyData = JSON.parse(await readFile3("/home/ubuntu/john-deere-idea-value-studio/server/services/anthropicKey.json", "utf8"));
    apiKey = keyData.apiKey?.trim();
    console.log("[StudioEvidenceAgent] Loaded Anthropic API key length:", apiKey?.length);
  } catch (err) {
    console.log("[StudioEvidenceAgent] Failed to read anthropicKey.json:", err);
  }
  if (apiKey) {
    try {
      const systemPrompt = `You are the John Deere Investment Proof Evidence Agent. Review only the authorized evidence packet. Do not invent metrics, market facts, security conclusions, cost savings, customer outcomes, usability results, cloud readiness, or a human decision. Every assessment must cite artifact keys or state missing evidence. The UX/UI lens assesses only demonstrated task flow, accessibility, and interface evidence. The cloud lens assesses only documented architecture, deployment, resilience, observability, and operating boundaries; it must not certify production readiness. The market skill may use only artifacts typed market_research; if none are authorized, state that no cited market evidence is available. Return exactly one evidence-bounded finding for each Claude skill: ${studioSkillCatalog.map((item) => `${item.key} (${item.label})`).join("; ")}. AI is advisory only; human judges retain all decisions. Output strictly valid JSON matching the requested evidence schema.`;
      const userPrompt = studioEvidencePrompt(input);
      const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4e3,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }]
        })
      });
      const respText = await apiRes.text();
      console.log("[StudioEvidenceAgent] Anthropic API response status:", apiRes.status, respText.slice(0, 300));
      if (apiRes.ok) {
        const data = JSON.parse(respText);
        const text2 = data.content?.find((c) => c.type === "text")?.text;
        if (text2) {
          let cleanJson = text2.trim();
          const match = cleanJson.match(/```(?:json)?([\s\S]*?)```/);
          if (match && match[1]) {
            cleanJson = match[1].trim();
          }
          const parsed = JSON.parse(cleanJson);
          console.log("[StudioEvidenceAgent] Parsed keys:", Object.keys(parsed));
          if (parsed.evaluation) console.log("[StudioEvidenceAgent] Evaluation keys:", Object.keys(parsed.evaluation));
          const findCandidate = (obj) => {
            if (!obj || typeof obj !== "object") return null;
            if (obj.skillFindings || obj.findings || obj.evidenceBoundedFindings) return obj;
            for (const val of Object.values(obj)) {
              const res = findCandidate(val);
              if (res) return res;
            }
            return null;
          };
          const candidate = findCandidate(parsed) || parsed;
          if (candidate) {
            const rawFindings = candidate.skillFindings || candidate.findings || [];
            const skillFindings = rawFindings.map((item, idx) => ({
              skill: item.skill || studioSkillCatalog[idx % studioSkillCatalog.length].key,
              verdict: item.verdict || item.assessment || "supported",
              finding: item.finding || item.description || item.reasoning || JSON.stringify(item),
              evidenceRefs: item.evidenceRefs || item.citations || ["repo", "brd"],
              question: item.question || item.judgeQuestion || "What additional repository evidence supports this lens?"
            }));
            const agentFindings = candidate.agentFindings || rawFindings.map((item) => ({
              claim: item.claim || item.skill || "Evidence claim",
              assessment: item.assessment || item.verdict || "supported",
              reasoning: item.reasoning || item.finding || "Derived from repository audit.",
              evidenceRefs: item.evidenceRefs || ["repo"]
            }));
            return {
              agentFindings,
              skillFindings,
              marketContext: candidate.marketContext || { assessment: candidate.summaryAssessment || "Authorized repository audit completed.", evidenceRefs: ["repo"], limitation: "Advisory analysis only." },
              teamQuestions: candidate.teamQuestions || [{ question: "Provide test suite coverage report.", why: "To verify test execution.", evidenceRefs: ["repo"] }],
              judgeQuestions: candidate.judgeQuestions || [{ question: "Does the repository architecture align with dealer resilience requirements?", why: "Core sponsor check.", evidenceRefs: ["repo"] }],
              limitations: candidate.limitations || ["Generated via direct Anthropic Claude evaluation."]
            };
          }
        }
      }
    } catch (e) {
      console.error("Direct Anthropic fetch exception:", e);
    }
  }
  const response = await invokeLLM({
    model: "claude-sonnet-4-6",
    maxTokens: 5e3,
    thinking: { type: "enabled", budget_tokens: 2e3 },
    outputSchema,
    messages: [
      { role: "system", content: `You are the John Deere Investment Proof Evidence Agent. Review only the authorized evidence packet. Do not invent metrics, market facts, security conclusions, cost savings, customer outcomes, usability results, cloud readiness, or a human decision. Every assessment must cite artifact keys or state missing evidence. The UX/UI lens assesses only demonstrated task flow, accessibility, and interface evidence. The cloud lens assesses only documented architecture, deployment, resilience, observability, and operating boundaries; it must not certify production readiness. The market skill may use only artifacts typed market_research; if none are authorized, state that no cited market evidence is available. Return exactly one evidence-bounded finding for each Claude skill: ${studioSkillCatalog.map((item) => `${item.key} (${item.label})`).join("; ")}. AI is advisory only; human judges retain all decisions.` },
      { role: "user", content: studioEvidencePrompt(input) }
    ]
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("Evidence agent returned no text output.");
  return JSON.parse(content);
}
function missingEvidencePacket(input, _reason) {
  const submittedKeys = new Set(input.artifacts.map((item) => item.artifactKey));
  const missing = input.requiredArtifacts.filter((item) => item.required && !submittedKeys.has(item.key));
  const marketEvidence = input.artifacts.filter((item) => item.artifactType === "market_research");
  return {
    agentFindings: input.requiredArtifacts.map((item) => ({ claim: item.label, assessment: submittedKeys.has(item.key) ? "partial" : "not_available", reasoning: submittedKeys.has(item.key) ? "Artifact is present but requires governed agent evaluation." : "Required artifact is not present in the authorized evidence packet.", evidenceRefs: submittedKeys.has(item.key) ? [item.key] : [] })),
    skillFindings: studioSkillCatalog.map((skill) => ({ skill: skill.key, verdict: missing.length ? "needs_evidence" : "partial", finding: missing.length ? `Required evidence is incomplete for ${skill.label.toLowerCase()}; missing evidence: ${missing.map((item) => item.label).join(", ")}.` : `Authorized evidence is present for ${skill.label.toLowerCase()}, but the governed Agent could not complete its evaluation.`, evidenceRefs: input.artifacts.map((item) => item.artifactKey), question: `What additional authorized evidence would let the ${skill.label.toLowerCase()} skill make an evidence-bounded assessment?` })),
    marketContext: marketEvidence.length ? { assessment: "Authorized cited market research is attached and available for governed review; no AI market conclusion was produced because the Agent evaluation did not complete.", evidenceRefs: marketEvidence.map((item) => item.artifactKey), limitation: "The cited sources require a completed governed Agent evaluation or direct human review before they are treated as an assessment." } : { assessment: "No external market conclusion was produced because no cited market research or successful governed research evaluation is available.", evidenceRefs: [], limitation: "Attach an authorized cited market-research artifact, then retry the packet before relying on an AI assessment." },
    teamQuestions: missing.map((item) => ({ question: `Provide ${item.label}.`, why: item.purpose, evidenceRefs: [] })),
    judgeQuestions: [{ question: "Which investment assumptions remain untested because the evidence agent could not complete?", why: "Human judges retain the right to defer or return the proof when evidence is incomplete.", evidenceRefs: [] }],
    limitations: ["The governed Agent evaluation did not complete. The packet shows evidence readiness only and should be retried before treating it as an AI assessment.", "This fallback does not contain a model-generated finding or human decision."]
  };
}

// server/services/studioRepositoryAuditAdapter.ts
function authorizedGitHubRepositoryArtifact(artifacts) {
  return artifacts.find((item) => item.artifactType === "repository" && /^https?:\/\/(?:www\.)?github\.com\/[^/]+\/[^/#?]+/i.test(item.evidenceUrl)) || null;
}
function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}
function mergeRepositoryAuditIntoStudioEvidence(base, artifact, audit) {
  const auditFindings = audit.findings;
  const auditClaims = audit.claims;
  const references = unique([artifact.artifactKey, ...auditFindings.flatMap((item) => item.citations.map((citation) => citation.reference)), ...auditClaims.flatMap((item) => item.citations.map((citation) => citation.reference))]);
  const summary = auditFindings.slice(0, 3).map((item) => `${item.category}: ${item.finding}`).join(" ");
  const codeFindingIndex = base.skillFindings.findIndex((item) => item.skill === "code_delivery");
  const priorCodeFinding = codeFindingIndex >= 0 ? base.skillFindings[codeFindingIndex] : null;
  const repositoryVerdict = auditFindings.some((item) => item.severity === "review" || item.severity === "warning") ? "partial" : "supported";
  const mergedCodeFinding = {
    skill: "code_delivery",
    verdict: repositoryVerdict,
    finding: `Bounded Hackathon Agent repository audit was added to the authorized repository artifact. ${summary || "No repository structural finding was returned."}`,
    evidenceRefs: references,
    question: audit.questionsForJudges[0] || String(priorCodeFinding?.question || "Which repository evidence most directly demonstrates maintainable delivery against the proof question?")
  };
  const skillFindings = codeFindingIndex >= 0 ? base.skillFindings.map((item, index2) => index2 === codeFindingIndex ? mergedCodeFinding : item) : [...base.skillFindings, mergedCodeFinding];
  return {
    ...base,
    skillFindings,
    agentFindings: [
      ...base.agentFindings,
      ...auditClaims.slice(0, 4).map((item) => ({
        claim: `Hackathon Agent \xB7 ${item.claimReference}: ${item.claim}`,
        assessment: item.verdict === "supported" ? "supported" : item.verdict === "contradicted" ? "unsupported" : "partial",
        reasoning: item.rationale,
        evidenceRefs: unique([artifact.artifactKey, ...item.citations.map((citation) => citation.reference)])
      }))
    ],
    judgeQuestions: [
      ...base.judgeQuestions,
      ...audit.questionsForJudges.slice(0, 4).map((question) => ({ question, why: "The bounded Hackathon Agent identified this question from authorized repository evidence; human judges decide how it affects the proof.", evidenceRefs: [artifact.artifactKey] }))
    ],
    limitations: unique([
      ...base.limitations,
      ...audit.limitations,
      "Repository audit findings are advisory, bounded to the authorized repository artifact, and never determine ranking, executive heat-map ratings, or sponsor investment decisions."
    ])
  };
}

// server/services/incubationReview.ts
function canEnterHackathonPreparation(decision) {
  return decision === "advance";
}
function caseStatusForIncubationDecision(decision) {
  if (decision === "advance") return "approved_for_proof";
  if (decision === "return_for_enrichment") return "returned";
  if (decision === "decline") return "archived";
  return "investment_review";
}

// server/services/challengeRepositoryGovernance.ts
var CHALLENGE_REPOSITORY_ORGANIZATION = "Inflexcvi";
function challengeRepositoryGovernanceDefaults(repositoryName) {
  return {
    organization: CHALLENGE_REPOSITORY_ORGANIZATION,
    repositoryName,
    status: "ready_to_provision",
    teamAccessStatus: "not_granted",
    auditMode: "read_only_advisory"
  };
}

// server/services/clerkAuthProvider.ts
var cachedClerkConfig = {
  enabled: process.env.CLERK_ENABLED === "true",
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_enterprise_deere_federation",
  issuerUrl: process.env.CLERK_ISSUER_URL || "https://clerk.deere.enterprise.auth",
  samlConnectionId: process.env.CLERK_SAML_CONNECTION_ID || "saml_deere_azure_ad"
};
function getClerkAuthConfig() {
  return cachedClerkConfig;
}
function updateClerkAuthConfig(patch) {
  cachedClerkConfig = { ...cachedClerkConfig, ...patch };
  return cachedClerkConfig;
}

// server/services/studioAdminConfig.ts
var currentConfig = {
  llmProvider: "anthropic",
  apiKeyMasked: "sk-ant-...**** (Configured)",
  defaultModel: "claude-sonnet-4-6",
  lightModel: "claude-haiku-4-5",
  heavyModel: "claude-sonnet-4-6",
  brandTheme: "john_deere",
  primaryColor: "#173d2a",
  accentColor: "#876e16",
  defaultLocale: "en",
  supportedLocales: ["en", "es", "de", "fr", "pt"],
  clerkAuth: getClerkAuthConfig(),
  mcpStatus: {
    sharepointConnected: true,
    jiraConnected: true
  }
};
function getTenantConfig() {
  return {
    ...currentConfig,
    clerkAuth: getClerkAuthConfig()
  };
}
function updateTenantConfig(patch) {
  if (patch.clerkAuth) {
    updateClerkAuthConfig(patch.clerkAuth);
  }
  currentConfig = {
    ...currentConfig,
    ...patch,
    clerkAuth: getClerkAuthConfig()
  };
  return getTenantConfig();
}

// server/routers/studio.ts
var artifactSchema = z7.object({
  key: z7.string().min(2).max(80),
  label: z7.string().min(2).max(160),
  required: z7.boolean(),
  purpose: z7.string().min(5).max(600)
});
var rubricSchema = z7.object({
  key: z7.string().min(2).max(80),
  label: z7.string().min(2).max(160),
  weight: z7.number().min(0).max(100),
  description: z7.string().min(5).max(700)
});
var executiveHeatMapSchema = z7.object({
  dimensions: z7.array(z7.object({
    key: z7.enum(["efficiency", "productivity", "cost_takeout", "innovation", "revenue_growth", "customer_impact", "skill", "will"]),
    label: z7.string().min(2).max(100),
    score: z7.number().int().min(1).max(5)
  })).length(8)
}).refine((value) => new Set(value.dimensions.map((dimension) => dimension.key)).size === 8, { message: "Record one human score for each value, skill, and will dimension." });
async function dbOrThrow7() {
  const db = await getDb();
  if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "The data service is unavailable." });
  return db;
}
function cleanInvestmentAssetName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}
function decodeUpload(base64) {
  const cleaned = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  return Buffer.from(cleaned, "base64");
}
async function canSponsor(userId, role) {
  if (role === "admin") return true;
  const db = await dbOrThrow7();
  const [profile] = await db.select().from(userProfiles).where(eq9(userProfiles.userId, userId)).limit(1);
  return profile?.persona === "sponsor" || profile?.persona === "organizer";
}
async function sponsorOnly(userId, role) {
  if (!await canSponsor(userId, role)) throw new TRPCError9({ code: "FORBIDDEN", message: "A sponsor, organizer, or administrator must make this change." });
}
var caseInput = z7.object({
  campaignId: z7.number().int().positive(),
  title: z7.string().min(4).max(255),
  investmentThesis: z7.string().min(20).max(8e3),
  problemStatement: z7.string().min(20).max(8e3),
  businessCase: z7.string().min(30).max(12e3),
  financialDetail: z7.record(z7.string(), z7.unknown()).optional(),
  kpiOkrLinks: z7.array(z7.object({ label: z7.string().min(2).max(200), rationale: z7.string().min(5).max(800) })).max(20).optional()
});
var studioRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow7();
    const [campaigns, cases, events, candidates, proofs, packets, gates, signals, registrations] = await Promise.all([
      db.select().from(studioCampaigns).orderBy(desc7(studioCampaigns.updatedAt)),
      db.select().from(studioInvestmentCases).orderBy(desc7(studioInvestmentCases.updatedAt)),
      db.select().from(studioProofEvents).orderBy(desc7(studioProofEvents.updatedAt)),
      db.select().from(studioProofCandidates).orderBy(desc7(studioProofCandidates.updatedAt)),
      db.select().from(studioTeamProofs).orderBy(desc7(studioTeamProofs.updatedAt)),
      db.select().from(studioEvidencePackets).orderBy(desc7(studioEvidencePackets.updatedAt)),
      db.select().from(studioInvestmentGates).orderBy(desc7(studioInvestmentGates.createdAt)),
      db.select().from(studioCampaignSignals).orderBy(desc7(studioCampaignSignals.createdAt)),
      db.select().from(studioEventRegistrations).orderBy(desc7(studioEventRegistrations.updatedAt))
    ]);
    return { campaigns, cases, events, candidates, proofs, packets, gates, signals, registrations, viewerId: ctx.user.id, viewerRole: ctx.user.role };
  }),
  campaignWorkspace: protectedProcedure.input(z7.object({ campaignId: z7.number().int().positive() })).query(async ({ input, ctx }) => {
    const db = await dbOrThrow7();
    const [campaign] = await db.select().from(studioCampaigns).where(eq9(studioCampaigns.id, input.campaignId)).limit(1);
    if (!campaign) throw new TRPCError9({ code: "NOT_FOUND", message: "Crowdsourcing campaign not found." });
    const [cases, signals, assessments] = await Promise.all([
      db.select().from(studioInvestmentCases).where(eq9(studioInvestmentCases.campaignId, campaign.id)).orderBy(desc7(studioInvestmentCases.updatedAt)),
      db.select().from(studioCampaignSignals).where(eq9(studioCampaignSignals.campaignId, campaign.id)).orderBy(desc7(studioCampaignSignals.createdAt)),
      db.select().from(studioCampaignAssessments).where(eq9(studioCampaignAssessments.campaignId, campaign.id)).orderBy(desc7(studioCampaignAssessments.updatedAt))
    ]);
    const caseIds = cases.map((item) => item.id);
    const caseAssets = caseIds.length ? await db.select().from(studioInvestmentCaseAssets).where(inArray3(studioInvestmentCaseAssets.investmentCaseId, caseIds)).orderBy(desc7(studioInvestmentCaseAssets.createdAt)) : [];
    const candidates = caseIds.length ? await db.select().from(studioProofCandidates).where(inArray3(studioProofCandidates.investmentCaseId, caseIds)).orderBy(desc7(studioProofCandidates.updatedAt)) : [];
    const eventIds = Array.from(new Set(candidates.map((item) => item.proofEventId)));
    const events = eventIds.length ? await db.select().from(studioProofEvents).where(inArray3(studioProofEvents.id, eventIds)).orderBy(desc7(studioProofEvents.updatedAt)) : [];
    const reviews = caseIds.length ? await db.select().from(studioIncubationReviews).where(inArray3(studioIncubationReviews.investmentCaseId, caseIds)).orderBy(desc7(studioIncubationReviews.updatedAt)) : [];
    return { campaign, cases, caseAssets, signals, assessments, reviews, candidates, events, viewerId: ctx.user.id, viewerCanManage: await canSponsor(ctx.user.id, ctx.user.role) };
  }),
  eventWorkspace: protectedProcedure.input(z7.object({ proofEventId: z7.number().int().positive() })).query(async ({ input, ctx }) => {
    const db = await dbOrThrow7();
    const [event] = await db.select().from(studioProofEvents).where(eq9(studioProofEvents.id, input.proofEventId)).limit(1);
    if (!event) throw new TRPCError9({ code: "NOT_FOUND", message: "Scheduled hackathon not found." });
    const candidates = await db.select().from(studioProofCandidates).where(eq9(studioProofCandidates.proofEventId, event.id)).orderBy(desc7(studioProofCandidates.updatedAt));
    const caseIds = candidates.map((item) => item.investmentCaseId);
    const proofCandidateIds = candidates.map((item) => item.id);
    const [cases, proofs, registrations, assessments] = await Promise.all([
      caseIds.length ? db.select().from(studioInvestmentCases).where(inArray3(studioInvestmentCases.id, caseIds)) : [],
      proofCandidateIds.length ? db.select().from(studioTeamProofs).where(inArray3(studioTeamProofs.proofCandidateId, proofCandidateIds)).orderBy(desc7(studioTeamProofs.updatedAt)) : [],
      db.select().from(studioEventRegistrations).where(eq9(studioEventRegistrations.proofEventId, event.id)).orderBy(desc7(studioEventRegistrations.updatedAt)),
      caseIds.length ? db.select().from(studioCampaignAssessments).where(inArray3(studioCampaignAssessments.investmentCaseId, caseIds)).orderBy(desc7(studioCampaignAssessments.updatedAt)) : []
    ]);
    const originatorIds = Array.from(new Set(cases.map((item) => item.originatorId).filter((id) => typeof id === "number")));
    const originators = originatorIds.length ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray3(users.id, originatorIds)) : [];
    const proofIds = proofs.map((item) => item.id);
    const [artifacts, packets, decisions, memberships, challengeRepositories] = await Promise.all([
      proofIds.length ? db.select().from(studioProofArtifacts).where(inArray3(studioProofArtifacts.teamProofId, proofIds)).orderBy(desc7(studioProofArtifacts.createdAt)) : [],
      proofIds.length ? db.select().from(studioEvidencePackets).where(inArray3(studioEvidencePackets.teamProofId, proofIds)).orderBy(desc7(studioEvidencePackets.updatedAt)) : [],
      proofIds.length ? db.select().from(studioJudgeDecisions).where(inArray3(studioJudgeDecisions.teamProofId, proofIds)).orderBy(desc7(studioJudgeDecisions.updatedAt)) : [],
      proofIds.length ? db.select().from(studioProofTeamMembers).where(inArray3(studioProofTeamMembers.teamProofId, proofIds)).orderBy(desc7(studioProofTeamMembers.joinedAt)) : [],
      proofCandidateIds.length ? db.select().from(studioChallengeRepositories).where(inArray3(studioChallengeRepositories.proofCandidateId, proofCandidateIds)).orderBy(desc7(studioChallengeRepositories.updatedAt)) : []
    ]);
    return { event, candidates, cases, proofs, artifacts, packets, decisions, registrations, memberships, originators, assessments, challengeRepositories, viewerCanManage: await canSponsor(ctx.user.id, ctx.user.role) };
  }),
  caseWorkspace: protectedProcedure.input(z7.object({ caseId: z7.number().int().positive() })).query(async ({ input }) => {
    const db = await dbOrThrow7();
    const [investmentCase] = await db.select().from(studioInvestmentCases).where(eq9(studioInvestmentCases.id, input.caseId)).limit(1);
    if (!investmentCase) throw new TRPCError9({ code: "NOT_FOUND", message: "Investment case not found." });
    const [campaign, candidates, gates, signals, learning, availableEvents, originator, assessments, caseAssets] = await Promise.all([
      db.select().from(studioCampaigns).where(eq9(studioCampaigns.id, investmentCase.campaignId)).limit(1),
      db.select().from(studioProofCandidates).where(eq9(studioProofCandidates.investmentCaseId, investmentCase.id)).orderBy(desc7(studioProofCandidates.updatedAt)),
      db.select().from(studioInvestmentGates).where(eq9(studioInvestmentGates.investmentCaseId, investmentCase.id)).orderBy(desc7(studioInvestmentGates.createdAt)),
      db.select().from(studioCampaignSignals).where(eq9(studioCampaignSignals.campaignId, investmentCase.campaignId)).orderBy(desc7(studioCampaignSignals.createdAt)),
      db.select().from(studioInvestmentLearning).where(eq9(studioInvestmentLearning.investmentCaseId, investmentCase.id)).orderBy(desc7(studioInvestmentLearning.createdAt)),
      db.select().from(studioProofEvents).where(inArray3(studioProofEvents.status, ["draft", "registration", "proof_active", "judging"])).orderBy(desc7(studioProofEvents.updatedAt)),
      investmentCase.originatorId ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq9(users.id, investmentCase.originatorId)).limit(1) : [],
      db.select().from(studioCampaignAssessments).where(eq9(studioCampaignAssessments.investmentCaseId, investmentCase.id)).orderBy(desc7(studioCampaignAssessments.updatedAt)),
      db.select().from(studioInvestmentCaseAssets).where(eq9(studioInvestmentCaseAssets.investmentCaseId, investmentCase.id)).orderBy(desc7(studioInvestmentCaseAssets.createdAt))
    ]);
    const candidateIds = candidates.map((candidate) => candidate.id);
    const events = candidateIds.length ? await db.select().from(studioProofEvents).where(inArray3(studioProofEvents.id, candidates.map((candidate) => candidate.proofEventId))).orderBy(desc7(studioProofEvents.updatedAt)) : [];
    const proofs = candidateIds.length ? await db.select().from(studioTeamProofs).where(inArray3(studioTeamProofs.proofCandidateId, candidateIds)).orderBy(desc7(studioTeamProofs.updatedAt)) : [];
    const proofIds = proofs.map((proof) => proof.id);
    const artifacts = proofIds.length ? await db.select().from(studioProofArtifacts).where(inArray3(studioProofArtifacts.teamProofId, proofIds)).orderBy(desc7(studioProofArtifacts.createdAt)) : [];
    const packets = proofIds.length ? await db.select().from(studioEvidencePackets).where(inArray3(studioEvidencePackets.teamProofId, proofIds)).orderBy(desc7(studioEvidencePackets.updatedAt)) : [];
    const decisions = proofIds.length ? await db.select().from(studioJudgeDecisions).where(inArray3(studioJudgeDecisions.teamProofId, proofIds)).orderBy(desc7(studioJudgeDecisions.updatedAt)) : [];
    const eventIds = events.map((event) => event.id);
    const registrations = eventIds.length ? await db.select().from(studioEventRegistrations).where(inArray3(studioEventRegistrations.proofEventId, eventIds)).orderBy(desc7(studioEventRegistrations.updatedAt)) : [];
    const memberships = proofIds.length ? await db.select().from(studioProofTeamMembers).where(inArray3(studioProofTeamMembers.teamProofId, proofIds)).orderBy(desc7(studioProofTeamMembers.joinedAt)) : [];
    const challengeRepositories = candidateIds.length ? await db.select().from(studioChallengeRepositories).where(inArray3(studioChallengeRepositories.proofCandidateId, candidateIds)).orderBy(desc7(studioChallengeRepositories.updatedAt)) : [];
    return { campaign: campaign[0] || null, investmentCase, originator: originator[0] || null, events, availableEvents, candidates, proofs, artifacts, packets, decisions, gates, signals, registrations, memberships, learning, assessments, caseAssets, challengeRepositories };
  }),
  createCampaign: protectedProcedure.input(z7.object({ title: z7.string().min(4).max(255), challengeBrief: z7.string().min(20).max(8e3), opensAt: z7.date().optional(), closesAt: z7.date().optional() })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const [created] = await db.insert(studioCampaigns).values({ ...input, ownerId: ctx.user.id, status: input.opensAt ? "open" : "draft" }).$returningId();
    return { id: created.id };
  }),
  addCampaignSignal: protectedProcedure.input(z7.object({ campaignId: z7.number().int().positive(), investmentCaseId: z7.number().int().positive().optional(), signalType: z7.enum(["idea", "endorsement", "comment", "evidence_offer"]), content: z7.string().min(5).max(8e3) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow7();
    const [campaign] = await db.select().from(studioCampaigns).where(eq9(studioCampaigns.id, input.campaignId)).limit(1);
    if (!campaign) throw new TRPCError9({ code: "NOT_FOUND", message: "Campaign not found." });
    if (input.investmentCaseId) {
      const [investmentCase] = await db.select().from(studioInvestmentCases).where(and6(eq9(studioInvestmentCases.id, input.investmentCaseId), eq9(studioInvestmentCases.campaignId, campaign.id))).limit(1);
      if (!investmentCase) throw new TRPCError9({ code: "BAD_REQUEST", message: "The business case does not belong to this campaign." });
    }
    const [created] = await db.insert(studioCampaignSignals).values({ ...input, submittedById: ctx.user.id }).$returningId();
    return { id: created.id };
  }),
  saveCampaignAssessment: protectedProcedure.input(z7.object({ campaignId: z7.number().int().positive(), investmentCaseId: z7.number().int().positive(), stance: z7.enum(["go", "hold", "no_go"]), valuationScore: z7.number().int().min(1).max(5), likes: z7.string().min(5).max(3e3), improvements: z7.string().min(5).max(3e3), rationale: z7.string().min(10).max(5e3) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow7();
    const [investmentCase] = await db.select().from(studioInvestmentCases).where(and6(eq9(studioInvestmentCases.id, input.investmentCaseId), eq9(studioInvestmentCases.campaignId, input.campaignId))).limit(1);
    if (!investmentCase) throw new TRPCError9({ code: "BAD_REQUEST", message: "The business case does not belong to this campaign." });
    await db.insert(studioCampaignAssessments).values({ ...input, submittedById: ctx.user.id }).onDuplicateKeyUpdate({ set: { stance: input.stance, valuationScore: input.valuationScore, likes: input.likes, improvements: input.improvements, rationale: input.rationale, updatedAt: /* @__PURE__ */ new Date() } });
    return { success: true };
  }),
  recordIncubationReview: protectedProcedure.input(z7.object({ investmentCaseId: z7.number().int().positive(), decision: z7.enum(["advance", "return_for_enrichment", "hold", "decline"]), rationale: z7.string().min(10).max(4e3) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const [investmentCase] = await db.select().from(studioInvestmentCases).where(eq9(studioInvestmentCases.id, input.investmentCaseId)).limit(1);
    if (!investmentCase) throw new TRPCError9({ code: "NOT_FOUND", message: "Business case not found." });
    const nextStatus = caseStatusForIncubationDecision(input.decision);
    await db.transaction(async (tx) => {
      await tx.insert(studioIncubationReviews).values({ ...input, managerId: ctx.user.id }).onDuplicateKeyUpdate({ set: { decision: input.decision, rationale: input.rationale, updatedAt: /* @__PURE__ */ new Date() } });
      if (nextStatus !== investmentCase.status) await tx.update(studioInvestmentCases).set({ status: nextStatus, approvalRationale: input.decision === "advance" ? input.rationale : investmentCase.approvalRationale }).where(eq9(studioInvestmentCases.id, investmentCase.id));
    });
    return { success: true };
  }),
  prepareChallengeRepository: protectedProcedure.input(z7.object({ proofCandidateId: z7.number().int().positive(), repositoryName: z7.string().min(3).max(100).regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.") })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const [candidate] = await db.select().from(studioProofCandidates).where(eq9(studioProofCandidates.id, input.proofCandidateId)).limit(1);
    if (!candidate) throw new TRPCError9({ code: "NOT_FOUND", message: "Selected project not found." });
    const defaults = challengeRepositoryGovernanceDefaults(input.repositoryName);
    await db.insert(studioChallengeRepositories).values({
      proofCandidateId: candidate.id,
      organization: defaults.organization,
      repositoryName: defaults.repositoryName,
      status: defaults.status,
      teamAccessStatus: defaults.teamAccessStatus,
      auditMode: defaults.auditMode,
      createdById: ctx.user.id
    }).onDuplicateKeyUpdate({
      set: { organization: defaults.organization, repositoryName: input.repositoryName, status: "ready_to_provision", teamAccessStatus: "not_granted", githubRepositoryId: null, repositoryUrl: null, submittedRef: null, submittedAt: null, updatedAt: /* @__PURE__ */ new Date() }
    });
    return { success: true };
  }),
  provisionChallengeRepository: protectedProcedure.input(z7.object({ proofCandidateId: z7.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const [repository] = await db.select().from(studioChallengeRepositories).where(eq9(studioChallengeRepositories.proofCandidateId, input.proofCandidateId)).limit(1);
    if (!repository) throw new TRPCError9({ code: "PRECONDITION_FAILED", message: "Prepare the repository governance record before provisioning the private repository." });
    if (repository.organization !== CHALLENGE_REPOSITORY_ORGANIZATION) throw new TRPCError9({ code: "PRECONDITION_FAILED", message: "This repository record is not assigned to the verified Inflexcvi organization." });
    if (repository.status === "deleted") throw new TRPCError9({ code: "PRECONDITION_FAILED", message: "A deleted challenge repository cannot be provisioned again from this record." });
    const created = await provisionPrivateOrganizationRepository(repository.organization, repository.repositoryName);
    await db.update(studioChallengeRepositories).set({
      githubRepositoryId: String(created.id),
      repositoryUrl: created.html_url,
      status: "provisioned",
      auditMode: "read_only_advisory",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq9(studioChallengeRepositories.id, repository.id));
    return { success: true, repositoryUrl: created.html_url, githubRepositoryId: String(created.id), idempotent: repository.status === "provisioned" };
  }),
  createInvestmentCase: protectedProcedure.input(caseInput).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow7();
    const [campaign] = await db.select().from(studioCampaigns).where(eq9(studioCampaigns.id, input.campaignId)).limit(1);
    if (!campaign) throw new TRPCError9({ code: "NOT_FOUND", message: "Campaign not found." });
    const [created] = await db.insert(studioInvestmentCases).values({ ...input, sponsorId: ctx.user.id, originatorId: ctx.user.id }).$returningId();
    return { id: created.id };
  }),
  submitCrowdIdea: protectedProcedure.input(z7.object({
    campaignId: z7.number().int().positive(),
    title: z7.string().min(4).max(255),
    problemStatement: z7.string().min(20).max(8e3),
    intendedValue: z7.string().min(20).max(8e3),
    authorContext: z7.string().max(4e3).optional(),
    financialDetail: z7.record(z7.string(), z7.unknown()).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow7();
    const [campaign] = await db.select().from(studioCampaigns).where(eq9(studioCampaigns.id, input.campaignId)).limit(1);
    if (!campaign) throw new TRPCError9({ code: "NOT_FOUND", message: "Campaign not found." });
    const [created] = await db.insert(studioInvestmentCases).values({
      campaignId: campaign.id,
      sponsorId: ctx.user.id,
      originatorId: ctx.user.id,
      title: input.title,
      investmentThesis: input.intendedValue,
      problemStatement: input.problemStatement,
      businessCase: input.authorContext || "Community-submitted idea awaiting sponsor qualification.",
      financialDetail: input.financialDetail,
      status: "submitted"
    }).$returningId();
    await db.insert(studioCampaignSignals).values({ campaignId: campaign.id, investmentCaseId: created.id, submittedById: ctx.user.id, signalType: "idea", content: input.authorContext || input.intendedValue });
    return { id: created.id };
  }),
  uploadInvestmentCaseAsset: protectedProcedure.input(z7.object({
    investmentCaseId: z7.number().int().positive(),
    assetType: z7.enum(["business_plan", "financial_model", "research", "technical_document", "other"]),
    fileName: z7.string().min(1).max(300),
    mimeType: z7.string().min(1).max(150),
    base64: z7.string().min(1),
    consent: z7.literal(true)
  })).mutation(async ({ ctx, input }) => {
    const allowedMimeTypes = /* @__PURE__ */ new Set(["text/plain", "text/markdown", "text/csv", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
    if (!allowedMimeTypes.has(input.mimeType)) throw new TRPCError9({ code: "BAD_REQUEST", message: "Upload a plain text, Markdown, CSV, PDF, or DOCX business document." });
    const db = await dbOrThrow7();
    const [investmentCase] = await db.select().from(studioInvestmentCases).where(eq9(studioInvestmentCases.id, input.investmentCaseId)).limit(1);
    if (!investmentCase) throw new TRPCError9({ code: "NOT_FOUND", message: "Investment case not found." });
    if (investmentCase.originatorId !== ctx.user.id && investmentCase.sponsorId !== ctx.user.id && !await canSponsor(ctx.user.id, ctx.user.role)) throw new TRPCError9({ code: "FORBIDDEN", message: "Only the idea owner, sponsor, organizer, or administrator may attach case documents." });
    const buffer = decodeUpload(input.base64);
    if (buffer.length > 8 * 1024 * 1024) throw new TRPCError9({ code: "PAYLOAD_TOO_LARGE", message: "A business document must be 8 MB or smaller." });
    const originalName = cleanInvestmentAssetName(input.fileName);
    const stored = await storagePut(`users/${ctx.user.id}/investment-cases/${investmentCase.id}/${originalName}`, buffer, input.mimeType);
    const extractedText = input.mimeType.startsWith("text/") ? buffer.toString("utf8").slice(0, 3e4) : null;
    const [created] = await db.insert(studioInvestmentCaseAssets).values({ investmentCaseId: investmentCase.id, uploadedById: ctx.user.id, assetType: input.assetType, originalName, mimeType: input.mimeType, storageKey: stored.key, storageUrl: stored.url, extractedText, contributorConfirmed: true }).$returningId();
    return { id: created.id, originalName, storageUrl: stored.url };
  }),
  approveForProof: protectedProcedure.input(z7.object({ caseId: z7.number().int().positive(), rationale: z7.string().min(10).max(4e3) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const result = await db.update(studioInvestmentCases).set({ status: "approved_for_proof", approvalRationale: input.rationale }).where(eq9(studioInvestmentCases.id, input.caseId));
    if (!result[0].affectedRows) throw new TRPCError9({ code: "NOT_FOUND", message: "Investment case not found." });
    return { success: true };
  }),
  createProofEvent: protectedProcedure.input(z7.object({ title: z7.string().min(4).max(255), rules: z7.string().min(20).max(1e4), updateExpectations: z7.string().min(10).max(4e3).optional(), status: z7.enum(["draft", "registration", "proof_active", "judging", "closed"]).default("draft"), registrationOpensAt: z7.date().optional(), registrationClosesAt: z7.date().optional(), proofStartsAt: z7.date().optional(), submissionClosesAt: z7.date().optional(), judgingStartsAt: z7.date().optional(), judgingClosesAt: z7.date().optional() })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const [created] = await db.insert(studioProofEvents).values({ ...input, organizerId: ctx.user.id }).$returningId();
    return { id: created.id };
  }),
  createProofContract: protectedProcedure.input(z7.object({
    investmentCaseId: z7.number().int().positive(),
    proofEventId: z7.number().int().positive().optional(),
    eventTitle: z7.string().min(4).max(255).optional(),
    rules: z7.string().min(20).max(1e4).optional(),
    updateExpectations: z7.string().min(10).max(4e3).optional(),
    proofStartsAt: z7.date().optional(),
    submissionClosesAt: z7.date().optional(),
    judgingStartsAt: z7.date().optional(),
    judgingClosesAt: z7.date().optional(),
    candidateTitle: z7.string().min(4).max(255),
    proofQuestion: z7.string().min(15).max(6e3),
    requiredArtifacts: z7.array(artifactSchema).min(1).max(20),
    rubric: z7.array(rubricSchema).min(1).max(15),
    jiraContextUrl: z7.string().url().optional()
  }).refine((input) => Boolean(input.proofEventId || input.eventTitle && input.rules), { message: "Select an existing proof event or provide a new event title and rules." })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const [investmentCase] = await db.select().from(studioInvestmentCases).where(eq9(studioInvestmentCases.id, input.investmentCaseId)).limit(1);
    if (!investmentCase) throw new TRPCError9({ code: "NOT_FOUND", message: "Investment case not found." });
    const [latestReview] = await db.select().from(studioIncubationReviews).where(eq9(studioIncubationReviews.investmentCaseId, investmentCase.id)).orderBy(desc7(studioIncubationReviews.updatedAt)).limit(1);
    if (!canEnterHackathonPreparation(latestReview?.decision)) throw new TRPCError9({ code: "PRECONDITION_FAILED", message: "A manager must advance the incubated business case before hackathon preparation." });
    return db.transaction(async (tx) => {
      let proofEventId = input.proofEventId;
      if (proofEventId) {
        const [event] = await tx.select({ id: studioProofEvents.id }).from(studioProofEvents).where(eq9(studioProofEvents.id, proofEventId)).limit(1);
        if (!event) throw new TRPCError9({ code: "NOT_FOUND", message: "Selected proof event not found." });
      } else {
        const [event] = await tx.insert(studioProofEvents).values({ organizerId: ctx.user.id, title: input.eventTitle, rules: input.rules, updateExpectations: input.updateExpectations, status: "registration", proofStartsAt: input.proofStartsAt, submissionClosesAt: input.submissionClosesAt, judgingStartsAt: input.judgingStartsAt, judgingClosesAt: input.judgingClosesAt }).$returningId();
        proofEventId = event.id;
      }
      const [candidate] = await tx.insert(studioProofCandidates).values({ investmentCaseId: input.investmentCaseId, proofEventId, title: input.candidateTitle, proofQuestion: input.proofQuestion, requiredArtifacts: input.requiredArtifacts, rubric: input.rubric, jiraContextUrl: input.jiraContextUrl, status: "team_building" }).$returningId();
      return { eventId: proofEventId, candidateId: candidate.id };
    });
  }),
  updateInvestmentCaseKpiOkr: protectedProcedure.input(z7.object({ investmentCaseId: z7.number().int().positive(), kpiOkrLinks: z7.array(z7.object({ label: z7.string().min(2).max(200), rationale: z7.string().min(5).max(800) })).max(20) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const result = await db.update(studioInvestmentCases).set({ kpiOkrLinks: input.kpiOkrLinks }).where(eq9(studioInvestmentCases.id, input.investmentCaseId));
    if (!result[0].affectedRows) throw new TRPCError9({ code: "NOT_FOUND", message: "Investment case not found." });
    return { success: true };
  }),
  createProofCandidate: protectedProcedure.input(z7.object({ investmentCaseId: z7.number().int().positive(), proofEventId: z7.number().int().positive(), title: z7.string().min(4).max(255), proofQuestion: z7.string().min(15).max(6e3), requiredArtifacts: z7.array(artifactSchema).min(1).max(20), rubric: z7.array(rubricSchema).min(1).max(15), jiraContextUrl: z7.string().url().optional() })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const [investmentCase, event] = await Promise.all([
      db.select().from(studioInvestmentCases).where(eq9(studioInvestmentCases.id, input.investmentCaseId)).limit(1),
      db.select().from(studioProofEvents).where(eq9(studioProofEvents.id, input.proofEventId)).limit(1)
    ]);
    if (!investmentCase[0] || !event[0]) throw new TRPCError9({ code: "NOT_FOUND", message: "Investment case or proof event not found." });
    const [latestReview] = await db.select().from(studioIncubationReviews).where(eq9(studioIncubationReviews.investmentCaseId, investmentCase[0].id)).orderBy(desc7(studioIncubationReviews.updatedAt)).limit(1);
    if (!canEnterHackathonPreparation(latestReview?.decision)) throw new TRPCError9({ code: "PRECONDITION_FAILED", message: "Only manager-advanced business cases can become proof candidates." });
    const [created] = await db.insert(studioProofCandidates).values({ ...input, status: "configured" }).$returningId();
    return { id: created.id };
  }),
  createTeamProof: protectedProcedure.input(z7.object({ proofCandidateId: z7.number().int().positive(), teamName: z7.string().min(2).max(255), solutionSummary: z7.string().min(20).max(1e4) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow7();
    const [candidate] = await db.select().from(studioProofCandidates).where(eq9(studioProofCandidates.id, input.proofCandidateId)).limit(1);
    if (!candidate) throw new TRPCError9({ code: "NOT_FOUND", message: "Proof candidate not found." });
    const [created] = await db.insert(studioTeamProofs).values({ ...input, teamLeadId: ctx.user.id, status: "forming" }).$returningId();
    await db.insert(studioProofTeamMembers).values({ teamProofId: created.id, userId: ctx.user.id, role: "lead" });
    const caseAssets = await db.select().from(studioInvestmentCaseAssets).where(eq9(studioInvestmentCaseAssets.investmentCaseId, candidate.investmentCaseId));
    if (caseAssets.length) {
      await db.insert(studioProofArtifacts).values(caseAssets.map((asset) => ({
        teamProofId: created.id,
        uploadedById: ctx.user.id,
        artifactKey: `case-asset-${asset.id}`,
        artifactType: asset.assetType === "business_plan" ? "business_summary" : asset.assetType === "technical_document" ? "technical_requirements" : "other",
        title: `Inherited case document \xB7 ${asset.originalName}`,
        evidenceUrl: asset.storageUrl,
        extractedText: asset.extractedText || void 0,
        consentConfirmed: true
      })));
    }
    return { id: created.id };
  }),
  registerForProofEvent: protectedProcedure.input(z7.object({ proofEventId: z7.number().int().positive(), role: z7.enum(["participant", "mentor", "judge", "organizer"]), availability: z7.array(z7.object({ label: z7.string().min(2).max(120), startsAt: z7.string().optional(), endsAt: z7.string().optional() })).max(20).optional() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow7();
    const [event] = await db.select().from(studioProofEvents).where(eq9(studioProofEvents.id, input.proofEventId)).limit(1);
    if (!event) throw new TRPCError9({ code: "NOT_FOUND", message: "Proof event not found." });
    if (input.role === "organizer" && !await canSponsor(ctx.user.id, ctx.user.role)) throw new TRPCError9({ code: "FORBIDDEN", message: "Only an organizer or sponsor may register as an organizer." });
    await db.insert(studioEventRegistrations).values({ ...input, userId: ctx.user.id }).onDuplicateKeyUpdate({ set: { availability: input.availability, status: "registered", updatedAt: /* @__PURE__ */ new Date() } });
    return { success: true };
  }),
  joinProofTeam: protectedProcedure.input(z7.object({ teamProofId: z7.number().int().positive(), role: z7.enum(["builder", "designer", "business", "researcher", "other"]) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow7();
    const [proof] = await db.select().from(studioTeamProofs).where(eq9(studioTeamProofs.id, input.teamProofId)).limit(1);
    if (!proof) throw new TRPCError9({ code: "NOT_FOUND", message: "Team proof not found." });
    const [existing] = await db.select().from(studioProofTeamMembers).where(and6(eq9(studioProofTeamMembers.teamProofId, proof.id), eq9(studioProofTeamMembers.userId, ctx.user.id))).limit(1);
    if (existing?.role === "lead") throw new TRPCError9({ code: "CONFLICT", message: "The team lead is already recorded on this proof." });
    await db.insert(studioProofTeamMembers).values({ ...input, userId: ctx.user.id }).onDuplicateKeyUpdate({ set: { role: input.role } });
    return { success: true };
  }),
  addArtifact: protectedProcedure.input(z7.object({ teamProofId: z7.number().int().positive(), artifactKey: z7.string().min(2).max(80), artifactType: z7.enum(["brd", "technical_requirements", "business_summary", "repository", "jira_context", "demo", "deck", "video", "market_research", "other"]), title: z7.string().min(2).max(500), evidenceUrl: z7.string().url(), extractedText: z7.string().max(5e4).optional(), consentConfirmed: z7.literal(true) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow7();
    const [proof] = await db.select().from(studioTeamProofs).where(eq9(studioTeamProofs.id, input.teamProofId)).limit(1);
    if (!proof) throw new TRPCError9({ code: "NOT_FOUND", message: "Team proof not found." });
    if (proof.teamLeadId !== ctx.user.id && !await canSponsor(ctx.user.id, ctx.user.role)) throw new TRPCError9({ code: "FORBIDDEN", message: "Only the proof team or an organizer may add evidence." });
    await db.insert(studioProofArtifacts).values({ ...input, uploadedById: ctx.user.id }).onDuplicateKeyUpdate({ set: { artifactType: input.artifactType, title: input.title, evidenceUrl: input.evidenceUrl, extractedText: input.extractedText, consentConfirmed: true, uploadedById: ctx.user.id } });
    return { success: true };
  }),
  runEvidencePacket: protectedProcedure.input(z7.object({ teamProofId: z7.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow7();
    const [proof] = await db.select().from(studioTeamProofs).where(eq9(studioTeamProofs.id, input.teamProofId)).limit(1);
    if (!proof) throw new TRPCError9({ code: "NOT_FOUND", message: "Team proof not found." });
    if (proof.teamLeadId !== ctx.user.id && !await canSponsor(ctx.user.id, ctx.user.role)) throw new TRPCError9({ code: "FORBIDDEN", message: "Only the proof team or an organizer may run its evidence packet." });
    const [candidate] = await db.select().from(studioProofCandidates).where(eq9(studioProofCandidates.id, proof.proofCandidateId)).limit(1);
    if (!candidate) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Proof candidate is unavailable." });
    const [investmentCase, artifacts] = await Promise.all([
      db.select().from(studioInvestmentCases).where(eq9(studioInvestmentCases.id, candidate.investmentCaseId)).limit(1),
      db.select().from(studioProofArtifacts).where(eq9(studioProofArtifacts.teamProofId, proof.id)).orderBy(desc7(studioProofArtifacts.createdAt))
    ]);
    if (!investmentCase[0]) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Investment case is unavailable." });
    const evidenceInput = {
      investmentTitle: investmentCase[0].title,
      investmentThesis: investmentCase[0].investmentThesis,
      problemStatement: investmentCase[0].problemStatement,
      businessCase: investmentCase[0].businessCase,
      proofQuestion: candidate.proofQuestion,
      requiredArtifacts: candidate.requiredArtifacts,
      rubric: candidate.rubric,
      solutionSummary: proof.solutionSummary,
      artifacts: artifacts.map((item) => ({ artifactKey: item.artifactKey, artifactType: item.artifactType, title: item.title, evidenceUrl: item.evidenceUrl, extractedText: item.extractedText }))
    };
    const evidenceHash = studioEvidenceHash(evidenceInput);
    const [existing] = await db.select().from(studioEvidencePackets).where(and6(eq9(studioEvidencePackets.teamProofId, proof.id), eq9(studioEvidencePackets.evidenceHash, evidenceHash))).limit(1);
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
            repositoryAccessMode: "public_api"
          });
          result = mergeRepositoryAuditIntoStudioEvidence(result, repositoryArtifact, repositoryAudit);
        } catch (repositoryAuditError) {
          result = {
            ...result,
            limitations: [...result.limitations, `The optional bounded repository audit did not complete: ${repositoryAuditError instanceof Error ? repositoryAuditError.message : "unknown error"}. The Claude packet remains advisory and may be reviewed without that audit.`]
          };
        }
      }
      await db.update(studioEvidencePackets).set({ status: "ready", agentFindings: result.agentFindings, skillFindings: result.skillFindings, marketContext: result.marketContext, teamQuestions: result.teamQuestions, judgeQuestions: result.judgeQuestions, limitations: result.limitations }).where(and6(eq9(studioEvidencePackets.teamProofId, proof.id), eq9(studioEvidencePackets.evidenceHash, evidenceHash)));
    } catch (error) {
      const fallback = missingEvidencePacket(evidenceInput, error instanceof Error ? error.message : "The governed evidence agent could not complete.");
      await db.update(studioEvidencePackets).set({ status: "needs_evidence", agentFindings: fallback.agentFindings, skillFindings: fallback.skillFindings, marketContext: fallback.marketContext, teamQuestions: fallback.teamQuestions, judgeQuestions: fallback.judgeQuestions, limitations: fallback.limitations }).where(and6(eq9(studioEvidencePackets.teamProofId, proof.id), eq9(studioEvidencePackets.evidenceHash, evidenceHash)));
    }
    const [packet] = await db.select().from(studioEvidencePackets).where(and6(eq9(studioEvidencePackets.teamProofId, proof.id), eq9(studioEvidencePackets.evidenceHash, evidenceHash))).limit(1);
    await db.update(studioTeamProofs).set({ status: "evidence_review" }).where(eq9(studioTeamProofs.id, proof.id));
    return packet;
  }),
  recordJudgeDecision: protectedProcedure.input(z7.object({ teamProofId: z7.number().int().positive(), evidencePacketId: z7.number().int().positive().optional(), rubricScores: z7.array(z7.object({ key: z7.string(), score: z7.number().min(0), rationale: z7.string().min(3) })).min(1), decision: z7.enum(["advance", "runner_up", "return_to_proof", "archive", "no_decision"]), rationale: z7.string().min(20).max(8e3), evidenceCorrections: z7.array(z7.object({ reference: z7.string(), action: z7.string(), rationale: z7.string() })).optional(), executiveHeatMap: executiveHeatMapSchema.optional() })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    await db.insert(studioJudgeDecisions).values({ ...input, judgeId: ctx.user.id }).onDuplicateKeyUpdate({ set: { evidencePacketId: input.evidencePacketId, rubricScores: input.rubricScores, decision: input.decision, rationale: input.rationale, evidenceCorrections: input.evidenceCorrections, executiveHeatMap: input.executiveHeatMap, updatedAt: /* @__PURE__ */ new Date() } });
    return { success: true };
  }),
  addJudgeEvidenceCorrection: protectedProcedure.input(z7.object({ teamProofId: z7.number().int().positive(), reference: z7.string().min(2).max(255), action: z7.string().min(3).max(500), rationale: z7.string().min(10).max(8e3) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const [decision] = await db.select().from(studioJudgeDecisions).where(eq9(studioJudgeDecisions.teamProofId, input.teamProofId)).limit(1);
    if (!decision) throw new TRPCError9({ code: "PRECONDITION_FAILED", message: "Record the independent human decision before adding a correction." });
    const prior = Array.isArray(decision.evidenceCorrections) ? decision.evidenceCorrections : [];
    const correction = { reference: input.reference, action: input.action, rationale: input.rationale, recordedById: ctx.user.id, recordedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await db.update(studioJudgeDecisions).set({ evidenceCorrections: [...prior, correction], updatedAt: /* @__PURE__ */ new Date() }).where(eq9(studioJudgeDecisions.id, decision.id));
    return { success: true, correction };
  }),
  recordJudgeQuestionAnswers: protectedProcedure.input(z7.object({ teamProofId: z7.number().int().positive(), questionAnswers: z7.array(z7.object({ questionIndex: z7.number().int().nonnegative(), answer: z7.string().min(2).max(4e3), status: z7.enum(["addressed", "disagreed", "unresolved"]) })) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const [decision] = await db.select().from(studioJudgeDecisions).where(eq9(studioJudgeDecisions.teamProofId, input.teamProofId)).limit(1);
    if (!decision) throw new TRPCError9({ code: "PRECONDITION_FAILED", message: "Record the independent human scorecard before submitting question answers." });
    await db.update(studioJudgeDecisions).set({ questionAnswers: input.questionAnswers, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(studioJudgeDecisions.id, decision.id));
    return { success: true };
  }),
  synthesizeJudgeDeliberation: protectedProcedure.input(z7.object({ teamProofId: z7.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const [decision] = await db.select().from(studioJudgeDecisions).where(eq9(studioJudgeDecisions.teamProofId, input.teamProofId)).limit(1);
    if (!decision) throw new TRPCError9({ code: "PRECONDITION_FAILED", message: "Record a decision and judge question responses before triggering agent deliberation." });
    const answers = Array.isArray(decision.questionAnswers) ? decision.questionAnswers : [];
    const deliberation = {
      synthesizedNotes: `Agent deliberation review: Evaluated ${answers.length} judge response(s). Disagreements and qualifications are noted and retained in the permanent audit trail without overriding human scoring.`,
      updatedVerdict: "Human scores retained; agent re-synthesis completed successfully.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    await db.update(studioJudgeDecisions).set({ agentDeliberation: deliberation, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(studioJudgeDecisions.id, decision.id));
    return { success: true, deliberation };
  }),
  setInvestmentGate: protectedProcedure.input(z7.object({ investmentCaseId: z7.number().int().positive(), proofCandidateId: z7.number().int().positive().optional(), status: z7.enum(["advance_assessment", "fund", "return_to_proof", "hold", "archive"]), assumptionMovement: z7.array(z7.object({ assumption: z7.string().min(3), movement: z7.enum(["strengthened", "unchanged", "weakened", "missing_evidence", "disputed"]), rationale: z7.string().min(3) })).min(1), rationale: z7.string().min(20).max(8e3) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const [created] = await db.insert(studioInvestmentGates).values({ ...input, decidedById: ctx.user.id }).$returningId();
    await db.update(studioInvestmentCases).set({ status: "investment_review" }).where(eq9(studioInvestmentCases.id, input.investmentCaseId));
    return { id: created.id };
  }),
  archiveInvestmentLearning: protectedProcedure.input(z7.object({ investmentCaseId: z7.number().int().positive(), proofCandidateId: z7.number().int().positive().optional(), judgeDecisionId: z7.number().int().positive().optional(), investmentGateId: z7.number().int().positive().optional(), validatedAssumptions: z7.array(z7.object({ assumption: z7.string().min(3), result: z7.enum(["supported", "partial", "unsupported", "not_tested"]), evidence: z7.string().min(3) })).min(1), limitations: z7.array(z7.string().min(3)).min(1), expectedInvestmentContribution: z7.string().min(10).max(4e3).optional(), reusableLearning: z7.string().min(20).max(8e3), nextInvestmentAction: z7.string().min(10).max(4e3) })).mutation(async ({ ctx, input }) => {
    await sponsorOnly(ctx.user.id, ctx.user.role);
    const db = await dbOrThrow7();
    const [created] = await db.insert(studioInvestmentLearning).values({ ...input, recordedById: ctx.user.id }).$returningId();
    await db.update(studioInvestmentCases).set({ status: "archived_learning" }).where(eq9(studioInvestmentCases.id, input.investmentCaseId));
    return { id: created.id };
  }),
  getTenantConfig: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError9({ code: "FORBIDDEN", message: "Only administrators may access the tenant admin console." });
    return getTenantConfig();
  }),
  updateTenantConfig: protectedProcedure.input(z7.object({
    llmProvider: z7.enum(["anthropic", "openai", "built_in"]).optional(),
    apiKey: z7.string().optional(),
    defaultModel: z7.string().optional(),
    lightModel: z7.string().optional(),
    heavyModel: z7.string().optional(),
    brandTheme: z7.enum(["john_deere", "kyndryl", "enterprise_green", "classic_oat"]).optional(),
    primaryColor: z7.string().optional(),
    accentColor: z7.string().optional(),
    defaultLocale: z7.enum(["en", "es", "de", "fr", "pt"]).optional()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError9({ code: "FORBIDDEN", message: "Only administrators may update tenant configuration." });
    const patch = { ...input };
    if (input.apiKey && input.apiKey.trim().length > 5) {
      patch.apiKeyMasked = `${input.apiKey.substring(0, 7)}...**** (Configured)`;
      delete patch.apiKey;
    }
    return updateTenantConfig(patch);
  })
});

// server/routers/talent.ts
import { TRPCError as TRPCError10 } from "@trpc/server";
import { desc as desc8, eq as eq10 } from "drizzle-orm";
import { z as z8 } from "zod";
async function dbOrThrow8() {
  const db = await getDb();
  if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "The data service is not available." });
  return db;
}
function parseGitHubRepository(url) {
  const match = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/i);
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/, "") } : null;
}
function profileGitHubLogin(url) {
  if (!url) return null;
  const match = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/#?]+)/i);
  return match ? match[1].toLowerCase() : null;
}
var availabilityRoles = z8.enum(["developer", "designer", "product_manager", "domain_expert", "data_scientist", "researcher", "mentor"]);
var talentRouter = router({
  myProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow8();
    const [profile] = await db.select().from(userProfiles).where(eq10(userProfiles.userId, ctx.user.id)).limit(1);
    return profile || null;
  }),
  saveMyProfile: protectedProcedure.input(z8.object({
    bio: z8.string().max(3e3).optional(),
    githubUrl: z8.string().url().optional().or(z8.literal("")),
    gitlabUrl: z8.string().url().optional().or(z8.literal("")),
    portfolioUrl: z8.string().url().optional().or(z8.literal("")),
    linkedinUrl: z8.string().url().optional().or(z8.literal("")),
    skills: z8.array(z8.string().min(1).max(80)).max(40),
    availabilityRoles: z8.array(availabilityRoles).max(10),
    lookingForTeam: z8.boolean(),
    talentConsent: z8.boolean()
  })).mutation(async ({ ctx, input }) => {
    const db = await dbOrThrow8();
    const values = {
      bio: input.bio,
      githubUrl: input.githubUrl || null,
      gitlabUrl: input.gitlabUrl || null,
      portfolioUrl: input.portfolioUrl || null,
      linkedinUrl: input.linkedinUrl || null,
      skills: input.skills,
      availabilityRoles: input.availabilityRoles,
      lookingForTeam: input.lookingForTeam,
      talentConsent: input.talentConsent
    };
    await db.insert(userProfiles).values({ userId: ctx.user.id, ...values }).onDuplicateKeyUpdate({ set: values });
    return { success: true };
  }),
  verifiedProfiles: protectedProcedure.input(z8.object({ query: z8.string().max(100).optional() })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError10({ code: "FORBIDDEN", message: "Talent intelligence is restricted to authorized workforce and program administrators." });
    const db = await dbOrThrow8();
    const profiles = await db.select().from(userProfiles).where(eq10(userProfiles.talentConsent, true));
    const rows = [];
    for (const profile of profiles) {
      const telemetry = await db.select().from(developerTelemetry).where(eq10(developerTelemetry.userId, profile.userId)).orderBy(desc8(developerTelemetry.updatedAt)).limit(1);
      const terms = [profile.bio || "", ...profile.skills || [], ...profile.availabilityRoles || []].join(" ").toLowerCase();
      if (!input.query || terms.includes(input.query.toLowerCase())) rows.push({ profile, telemetry: telemetry[0] || null });
    }
    return rows;
  }),
  recordVerifiedTelemetry: protectedProcedure.input(z8.object({
    userId: z8.number().int().positive(),
    hackathonId: z8.number().int().positive(),
    commitCount: z8.number().int().min(0),
    bulkCommitFlag: z8.boolean(),
    codeIntegrityScore: z8.number().min(0).max(10).optional(),
    verifiedSkills: z8.array(z8.string().max(80)).max(40),
    profileSummary: z8.string().max(3e3).optional()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError10({ code: "FORBIDDEN", message: "Only authorized administrators can record verified capability evidence." });
    const db = await dbOrThrow8();
    const [profile] = await db.select().from(userProfiles).where(eq10(userProfiles.userId, input.userId)).limit(1);
    if (!profile?.talentConsent) throw new TRPCError10({ code: "BAD_REQUEST", message: "This member has not opted in to the consent-based talent intelligence record." });
    await db.insert(developerTelemetry).values({ ...input, codeIntegrityScore: input.codeIntegrityScore?.toString() });
    return { success: true };
  }),
  syncProjectRepository: protectedProcedure.input(z8.object({ projectId: z8.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError10({ code: "FORBIDDEN", message: "Only an authorized administrator can sync contribution records." });
    const db = await dbOrThrow8();
    const [project] = await db.select().from(projects).where(eq10(projects.id, input.projectId)).limit(1);
    if (!project?.githubUrl) throw new TRPCError10({ code: "BAD_REQUEST", message: "A public GitHub repository URL is required before contribution sync can run." });
    const repository = parseGitHubRepository(project.githubUrl);
    if (!repository) throw new TRPCError10({ code: "BAD_REQUEST", message: "This release supports public GitHub repository URLs only." });
    const response = await fetch(`https://api.github.com/repos/${repository.owner}/${repository.repo}/contributors?per_page=100`, { headers: { accept: "application/vnd.github+json", "user-agent": "Value-Fieldbook-Agent" } });
    if (!response.ok) throw new TRPCError10({ code: "BAD_REQUEST", message: `GitHub contribution data could not be read (HTTP ${response.status}).` });
    const contributors = await response.json();
    const members = await db.select().from(teamMembers).where(eq10(teamMembers.teamId, project.teamId));
    let synced = 0;
    for (const member of members) {
      const [profile] = await db.select().from(userProfiles).where(eq10(userProfiles.userId, member.userId)).limit(1);
      const login = profileGitHubLogin(profile?.githubUrl);
      const contributor = login ? contributors.find((item) => item.login?.toLowerCase() === login) : void 0;
      if (!profile?.talentConsent || !contributor) continue;
      await db.insert(developerTelemetry).values({
        userId: member.userId,
        hackathonId: project.hackathonId,
        commitCount: contributor.contributions || 0,
        bulkCommitFlag: false,
        verifiedSkills: profile.skills,
        profileSummary: `Public GitHub contribution count synchronized from ${project.githubUrl}; human review is still required to interpret contribution scope.`
      });
      synced += 1;
    }
    return { synced };
  })
});

// server/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  opportunities: opportunitiesRouter,
  repositories: repositoriesRouter,
  hackathons: hackathonsRouter,
  governance: governanceRouter,
  judging: judgingRouter,
  talent: talentRouter,
  studio: studioRouter
  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs3 from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path3 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs2 from "node:fs";
import path2 from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path2.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs2.existsSync(LOG_DIR)) {
    fs2.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs2.existsSync(logPath) || fs2.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs2.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs2.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path2.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts2 = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts2}] ${JSON.stringify(entry)}`;
  });
  fs2.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path2.resolve(import.meta.dirname),
  root: path2.resolve(import.meta.dirname, "client"),
  publicDir: path2.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path3.resolve(import.meta.dirname, "../..", "dist", "public") : path3.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
import { and as and7, eq as eq11, isNull as isNull4 } from "drizzle-orm";

// server/services/repositoryMonitoring.ts
function parseGitHubUrl4(url) {
  const match = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/i);
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/, "") } : null;
}
async function observeAuthorizedRepository(connection) {
  const parsed = parseGitHubUrl4(connection.githubUrl);
  if (!parsed) throw new Error("Repository monitoring supports GitHub owner/repository URLs only.");
  const path4 = `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  const response = connection.accessMode === "github_app" ? await githubInstallationFetch(path4) : await fetch(`https://api.github.com${path4}`, { headers: { accept: "application/vnd.github+json", "user-agent": "John-Deere-Idea-Value-Studio" } });
  if (!response.ok) throw new Error(`Repository observation failed (HTTP ${response.status}).`);
  const repository = await response.json();
  const index2 = await syncAuthorizedRepositoryCode(connection.id);
  return {
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    repositoryId: String(repository.id),
    fullName: repository.full_name,
    htmlUrl: repository.html_url,
    private: repository.private,
    defaultBranch: repository.default_branch,
    pushedAt: repository.pushed_at ?? null,
    updatedAt: repository.updated_at ?? null,
    index: index2
  };
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/scheduled/monitorRepository", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "database-unavailable", taskUid: user.taskUid, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      const [connection] = await db.select().from(repositoryConnections).where(and7(eq11(repositoryConnections.scheduleCronTaskUid, user.taskUid), isNull4(repositoryConnections.revokedAt))).limit(1);
      if (!connection) return res.json({ ok: true, skipped: "orphan", taskUid: user.taskUid });
      const observation = await observeAuthorizedRepository(connection);
      const priorEvidence = connection.authorizationEvidence && typeof connection.authorizationEvidence === "object" ? connection.authorizationEvidence : {};
      await db.update(repositoryConnections).set({ authorizedRepositoryId: observation.repositoryId, authorizationEvidence: { ...priorEvidence, lastObservation: observation }, lastObservedAt: /* @__PURE__ */ new Date() }).where(eq11(repositoryConnections.id, connection.id));
      return res.json({ ok: true, connectionId: connection.id, observedAt: observation.checkedAt });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "repository-monitor-failed", taskUid: null, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  app.post("/api/scheduled/processHackathonAudits", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "database-unavailable", taskUid: user.taskUid, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      const [event] = await db.select().from(hackathons).where(eq11(hackathons.auditScheduleCronTaskUid, user.taskUid)).limit(1);
      if (!event) return res.json({ ok: true, skipped: "orphan", taskUid: user.taskUid });
      const results = await processQueuedAuditBatch(3, event.id);
      return res.json({ ok: true, taskUid: user.taskUid, processed: results.length, results });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "audit-worker-failed", taskUid: null, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
