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
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * STYLE REMINDER — The schema is the audit spine of the Value Fieldbook.
 * Keep source, consent, evidence, decision, and human-override provenance explicit.
 */

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userProfiles = mysqlTable(
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
    skills: json("skills").$type<string[]>(),
    availabilityRoles: json("availabilityRoles").$type<string[]>(),
    lookingForTeam: boolean("lookingForTeam").default(false).notNull(),
    talentConsent: boolean("talentConsent").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("userProfiles_user_unique").on(table.userId), index("userProfiles_persona_idx").on(table.persona)],
);

export const consentRecords = mysqlTable(
  "consentRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    scope: mysqlEnum("scope", ["voice_transcription", "document_processing", "external_research", "talent_profile", "repo_audit"]).notNull(),
    accepted: boolean("accepted").notNull(),
    policyVersion: varchar("policyVersion", { length: 80 }).notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  table => [index("consentRecords_user_scope_idx").on(table.userId, table.scope)],
);

export const opportunities = mysqlTable(
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
    valueDrivers: json("valueDrivers").$type<string[]>(),
    economicAssumptions: json("economicAssumptions").$type<string[]>(),
    costToProve: decimal("costToProve", { precision: 15, scale: 2 }),
    timeToValueMonths: int("timeToValueMonths"),
    investmentGate: mysqlEnum("investmentGate", ["shape_value_case", "research", "proof_sprint", "hold", "advance"]).default("shape_value_case").notNull(),
    investmentGateRationale: text("investmentGateRationale"),
    confidence: int("confidence").default(0).notNull(),
    aiBrief: json("aiBrief").$type<Record<string, unknown>>(),
    evidenceGaps: json("evidenceGaps").$type<string[]>(),
    selectedAt: timestamp("selectedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("opportunities_owner_idx").on(table.ownerId), index("opportunities_stage_idx").on(table.stage)],
);

export const opportunityAssets = mysqlTable(
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
    extraction: json("extraction").$type<Record<string, unknown>>(),
    contributorConfirmed: boolean("contributorConfirmed").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("opportunityAssets_opportunity_idx").on(table.opportunityId)],
);

export const opportunityEndorsements = mysqlTable(
  "opportunityEndorsements",
  {
    id: int("id").autoincrement().primaryKey(),
    opportunityId: int("opportunityId").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("opportunityEndorsements_opportunity_user_unique").on(table.opportunityId, table.userId), index("opportunityEndorsements_opportunity_idx").on(table.opportunityId)],
);

export const opportunityCommunityNotes = mysqlTable(
  "opportunityCommunityNotes",
  {
    id: int("id").autoincrement().primaryKey(),
    opportunityId: int("opportunityId").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    authorId: int("authorId").notNull().references(() => users.id, { onDelete: "cascade" }),
    category: mysqlEnum("category", ["customer_signal", "market_signal", "operating_signal", "evidence_offer", "question", "other"]).default("other").notNull(),
    body: text("body").notNull(),
    evidenceUrl: varchar("evidenceUrl", { length: 1000 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("opportunityCommunityNotes_opportunity_created_idx").on(table.opportunityId, table.createdAt)],
);

export const researchRuns = mysqlTable(
  "researchRuns",
  {
    id: int("id").autoincrement().primaryKey(),
    opportunityId: int("opportunityId").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    requestedById: int("requestedById").notNull().references(() => users.id, { onDelete: "restrict" }),
    scope: varchar("scope", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["queued", "running", "complete", "needs_review", "failed"]).default("queued").notNull(),
    summary: text("summary"),
    limitations: text("limitations"),
    dossier: json("dossier").$type<Record<string, unknown>>(),
    reviewedById: int("reviewedById").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
  },
  table => [index("researchRuns_opportunity_idx").on(table.opportunityId)],
);

export const researchSources = mysqlTable(
  "researchSources",
  {
    id: int("id").autoincrement().primaryKey(),
    researchRunId: int("researchRunId").notNull().references(() => researchRuns.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 1000 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    sourceType: mysqlEnum("sourceType", ["company", "product", "open_source", "publication", "patent", "internal", "other"]).default("other").notNull(),
    evidenceCategory: mysqlEnum("evidenceCategory", ["market", "customer", "operating", "value", "other"]).default("other").notNull(),
    excerpt: text("excerpt"),
    relevance: text("relevance"),
    similarityAssessment: mysqlEnum("similarityAssessment", ["potentially_similar", "relevant_precedent", "possible_differentiator", "requires_expert_review"]).notNull(),
    accessedAt: timestamp("accessedAt").defaultNow().notNull(),
  },
  table => [index("researchSources_run_idx").on(table.researchRunId)],
);

export const indicatorSnapshots = mysqlTable(
  "indicatorSnapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    opportunityId: int("opportunityId").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    category: mysqlEnum("category", ["customer_value", "operating_value", "evidence_confidence", "technical_execution", "claim_integrity", "originality", "delivery_fit"]).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    value: decimal("value", { precision: 15, scale: 4 }).notNull(),
    unit: varchar("unit", { length: 80 }).notNull(),
    evidence: text("evidence").notNull(),
    provenance: json("provenance").$type<Record<string, unknown>>(),
    createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("indicatorSnapshots_opportunity_idx").on(table.opportunityId, table.category)],
);

export const hackathons = mysqlTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("hackathons_slug_unique").on(table.slug), index("hackathons_opportunity_idx").on(table.opportunityId)],
);

export const hackathonScheduleItems = mysqlTable("hackathonScheduleItems", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  kind: mysqlEnum("kind", ["opening", "workshop", "office_hours", "submission_deadline", "demo", "judging", "awards", "other"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt"),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("hackathonScheduleItems_event_time_idx").on(table.hackathonId, table.startsAt)]);

export const mentorRequests = mysqlTable("mentorRequests", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("mentorRequests_event_status_idx").on(table.hackathonId, table.status), index("mentorRequests_mentor_status_idx").on(table.mentorId, table.status), index("mentorRequests_requester_idx").on(table.requesterId)]);

export const organizerCopilotDrafts = mysqlTable("organizerCopilotDrafts", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  opportunityId: int("opportunityId").notNull().references(() => opportunities.id, { onDelete: "restrict" }),
  requestedById: int("requestedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  payload: json("payload").$type<Record<string, unknown>>().notNull(),
  status: mysqlEnum("status", ["draft", "adopted"]).default("draft").notNull(),
  adoptedById: int("adoptedById").references(() => users.id, { onDelete: "set null" }),
  adoptedAt: timestamp("adoptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("organizerCopilotDrafts_event_created_idx").on(table.hackathonId, table.createdAt)]);

export const tracks = mysqlTable("tracks", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  prizeAmount: decimal("prizeAmount", { precision: 12, scale: 2 }),
  sponsorName: varchar("sponsorName", { length: 160 }),
});

export const hackathonRegistrations = mysqlTable("hackathonRegistrations", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  registrationRole: mysqlEnum("registrationRole", ["participant", "mentor", "judge"]).default("participant").notNull(),
  status: mysqlEnum("status", ["registered", "withdrawn", "approved"]).default("registered").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("hackathonRegistrations_event_user_unique").on(table.hackathonId, table.userId), index("hackathonRegistrations_event_idx").on(table.hackathonId)]);

export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  audience: mysqlEnum("audience", ["all", "participants", "judges", "mentors"]).default("all").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("announcements_event_created_idx").on(table.hackathonId, table.createdAt)]);

export const announcementAcknowledgements = mysqlTable("announcementAcknowledgements", {
  id: int("id").autoincrement().primaryKey(),
  announcementId: int("announcementId").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  acknowledgedAt: timestamp("acknowledgedAt").defaultNow().notNull(),
}, table => [uniqueIndex("announcementAcknowledgements_announcement_user_unique").on(table.announcementId, table.userId), index("announcementAcknowledgements_user_idx").on(table.userId)]);

export const teamAlerts = mysqlTable("teamAlerts", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  teamId: int("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("teamAlerts_event_created_idx").on(table.hackathonId, table.createdAt), index("teamAlerts_team_created_idx").on(table.teamId, table.createdAt)]);

export const hackathonFaqs = mysqlTable("hackathonFaqs", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  question: varchar("question", { length: 500 }).notNull(),
  answer: text("answer").notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("hackathonFaqs_event_order_idx").on(table.hackathonId, table.displayOrder)]);

export const rubricCriteria = mysqlTable("rubricCriteria", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description"),
  maxScore: int("maxScore").default(10).notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
  evaluationMethod: varchar("evaluationMethod", { length: 200 }),
});

export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  inviteCode: varchar("inviteCode", { length: 40 }).notNull(),
  lookingForMembers: boolean("lookingForMembers").default(false).notNull(),
  lookingForSkills: json("lookingForSkills").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("teams_hackathon_name_unique").on(table.hackathonId, table.name), uniqueIndex("teams_invite_unique").on(table.inviteCode)]);

export const teamMembers = mysqlTable("teamMembers", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["leader", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, table => [uniqueIndex("teamMembers_team_user_unique").on(table.teamId, table.userId)]);

export const teamJoinRequests = mysqlTable("teamJoinRequests", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "accepted", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  decidedAt: timestamp("decidedAt"),
}, table => [uniqueIndex("teamJoinRequests_team_user_unique").on(table.teamId, table.userId), index("teamJoinRequests_team_idx").on(table.teamId)]);

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  teamId: int("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
  trackId: int("trackId").references(() => tracks.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  tagline: varchar("tagline", { length: 500 }),
  description: text("description").notNull(),
  techStack: json("techStack").$type<string[]>(),
  githubUrl: varchar("githubUrl", { length: 600 }),
  demoUrl: varchar("demoUrl", { length: 600 }),
  videoUrl: varchar("videoUrl", { length: 600 }),
  pitchDeckUrl: varchar("pitchDeckUrl", { length: 600 }),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("projects_hackathon_team_unique").on(table.hackathonId, table.teamId)]);

export const projectTracks = mysqlTable("projectTracks", {
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  trackId: int("trackId").notNull().references(() => tracks.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("projectTracks_project_track_unique").on(table.projectId, table.trackId), index("projectTracks_track_idx").on(table.trackId)]);

export const teamMessages = mysqlTable("teamMessages", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
  senderId: int("senderId").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("teamMessages_team_created_idx").on(table.teamId, table.createdAt)]);

export const repositoryConnections = mysqlTable("repositoryConnections", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  githubUrl: varchar("githubUrl", { length: 600 }).notNull(),
  visibility: mysqlEnum("visibility", ["public", "private"]).notNull(),
  accessMode: mysqlEnum("accessMode", ["public_api", "github_app"]).notNull(),
  appId: varchar("appId", { length: 40 }),
  installationId: varchar("installationId", { length: 40 }),
  authorizedById: int("authorizedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  authorizedRepositoryId: varchar("authorizedRepositoryId", { length: 40 }),
  authorizationEvidence: json("authorizationEvidence").$type<Record<string, unknown>>(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  lastObservedAt: timestamp("lastObservedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("repositoryConnections_project_idx").on(table.projectId), index("repositoryConnections_mode_idx").on(table.accessMode), index("repositoryConnections_schedule_idx").on(table.scheduleCronTaskUid)]);

export const projectClaims = mysqlTable("projectClaims", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  source: mysqlEnum("source", ["pitch_deck", "video_transcript", "readme", "submission"]).notNull(),
  sourceReference: varchar("sourceReference", { length: 300 }).notNull(),
  claimedFeature: text("claimedFeature").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("projectClaims_project_idx").on(table.projectId)]);

export const projectAssets = mysqlTable("projectAssets", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  uploadedById: int("uploadedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  assetType: mysqlEnum("assetType", ["deck", "demo", "video", "document", "other"]).notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 700 }).notNull(),
  originalName: varchar("originalName", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 150 }).notNull(),
  byteSize: int("byteSize").notNull().default(0),
  extraction: json("extraction").$type<Record<string, unknown>>(),
  contributorConfirmed: boolean("contributorConfirmed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("projectAssets_project_idx").on(table.projectId)]);

export const evaluationSyntheses = mysqlTable("evaluationSyntheses", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  auditId: int("auditId").references(() => submissionAudits.id, { onDelete: "set null" }),
  initiatedById: int("initiatedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  model: varchar("model", { length: 100 }).notNull(),
  policyVersion: varchar("policyVersion", { length: 80 }).notNull(),
  evidenceHash: varchar("evidenceHash", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["processing", "complete", "failed"]).default("processing").notNull(),
  result: json("result").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [index("evaluationSyntheses_project_created_idx").on(table.projectId, table.createdAt), index("evaluationSyntheses_audit_idx").on(table.auditId)]);

export const humanReviewAnnotations = mysqlTable("humanReviewAnnotations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  judgeId: int("judgeId").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: mysqlEnum("targetType", ["synthesis", "finding", "claim", "market_research"]).notNull(),
  targetReference: varchar("targetReference", { length: 300 }).notNull(),
  annotationType: mysqlEnum("annotationType", ["note", "voice_transcript", "evidence_correction", "independent_determination"]).notNull(),
  body: text("body").notNull(),
  audioStorageKey: varchar("audioStorageKey", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("humanReviewAnnotations_project_created_idx").on(table.projectId, table.createdAt), index("humanReviewAnnotations_target_idx").on(table.projectId, table.targetReference)]);

export const judgeAssignments = mysqlTable("judgeAssignments", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  judgeId: int("judgeId").notNull().references(() => users.id, { onDelete: "cascade" }),
  isRecused: boolean("isRecused").default(false).notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
}, table => [uniqueIndex("judgeAssignments_project_judge_unique").on(table.projectId, table.judgeId), index("judgeAssignments_judge_idx").on(table.judgeId)]);

export const reviewerCalibrationCases = mysqlTable("reviewerCalibrationCases", {
  id: int("id").autoincrement().primaryKey(),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
}, table => [index("reviewerCalibrationCases_event_status_idx").on(table.hackathonId, table.status)]);

export const reviewerCalibrationResponses = mysqlTable("reviewerCalibrationResponses", {
  id: int("id").autoincrement().primaryKey(),
  calibrationCaseId: int("calibrationCaseId").notNull().references(() => reviewerCalibrationCases.id, { onDelete: "cascade" }),
  judgeId: int("judgeId").notNull().references(() => users.id, { onDelete: "cascade" }),
  rationale: text("rationale").notNull(),
  criterionScores: json("criterionScores").$type<Array<{ criterionId: number; score: number }>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("reviewerCalibrationResponses_case_judge_unique").on(table.calibrationCaseId, table.judgeId), index("reviewerCalibrationResponses_judge_idx").on(table.judgeId)]);

export const submissionAudits = mysqlTable("submissionAudits", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["queued", "processing", "complete", "failed", "needs_review"]).default("queued").notNull(),
  extractionMethod: mysqlEnum("extractionMethod", ["github_api", "shallow_clone", "manual"]).default("manual").notNull(),
  technicalScore: decimal("technicalScore", { precision: 5, scale: 2 }),
  integrityScore: decimal("integrityScore", { precision: 5, scale: 2 }),
  originalityScore: decimal("originalityScore", { precision: 5, scale: 2 }),
  pitchFitScore: decimal("pitchFitScore", { precision: 5, scale: 2 }),
  finalSuggestedScore: decimal("finalSuggestedScore", { precision: 5, scale: 2 }),
  report: json("report").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processingStartedAt: timestamp("processingStartedAt"),
  completedAt: timestamp("completedAt"),
}, table => [index("submissionAudits_project_idx").on(table.projectId)]);

export const specialistEvaluations = mysqlTable("specialistEvaluations", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull().references(() => submissionAudits.id, { onDelete: "cascade" }),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  skill: mysqlEnum("skill", ["ux_ui", "cloud_architecture", "security", "development_quality", "value_feasibility"]).notNull(),
  version: varchar("version", { length: 80 }).notNull(),
  policyVersion: varchar("policyVersion", { length: 80 }).notNull(),
  evidenceHash: varchar("evidenceHash", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["queued", "processing", "complete", "failed"]).default("queued").notNull(),
  provisionalScore: decimal("provisionalScore", { precision: 5, scale: 2 }),
  result: json("result").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [uniqueIndex("specialistEvaluations_audit_skill_unique").on(table.auditId, table.skill), index("specialistEvaluations_project_skill_idx").on(table.projectId, table.skill)]);

export const scorecards = mysqlTable("scorecards", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  judgeId: int("judgeId").notNull().references(() => users.id, { onDelete: "cascade" }),
  privateNotes: text("privateNotes"),
  finalized: boolean("finalized").default(false).notNull(),
  needsSecondaryReview: boolean("needsSecondaryReview").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("scorecards_project_judge_unique").on(table.projectId, table.judgeId)]);

export const scoreItems = mysqlTable("scoreItems", {
  id: int("id").autoincrement().primaryKey(),
  scorecardId: int("scorecardId").notNull().references(() => scorecards.id, { onDelete: "cascade" }),
  criterionId: int("criterionId").notNull().references(() => rubricCriteria.id, { onDelete: "cascade" }),
  score: decimal("score", { precision: 5, scale: 2 }).notNull(),
  feedback: text("feedback"),
}, table => [uniqueIndex("scoreItems_card_criterion_unique").on(table.scorecardId, table.criterionId)]);

export const aiOverrides = mysqlTable("aiOverrides", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  judgeId: int("judgeId").notNull().references(() => users.id, { onDelete: "cascade" }),
  claimReference: varchar("claimReference", { length: 255 }).notNull(),
  action: mysqlEnum("action", ["dismiss", "confirm", "escalate"]).notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const objections = mysqlTable("objections", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  submittedById: int("submittedById").notNull().references(() => users.id, { onDelete: "cascade" }),
  claimReference: varchar("claimReference", { length: 255 }).notNull(),
  explanation: text("explanation").notNull(),
  status: mysqlEnum("status", ["open", "under_review", "resolved", "declined"]).default("open").notNull(),
  reviewedById: int("reviewedById").references(() => users.id, { onDelete: "set null" }),
  response: text("response"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export const developerTelemetry = mysqlTable("developerTelemetry", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  hackathonId: int("hackathonId").notNull().references(() => hackathons.id, { onDelete: "cascade" }),
  commitCount: int("commitCount").default(0).notNull(),
  bulkCommitFlag: boolean("bulkCommitFlag").default(false).notNull(),
  codeIntegrityScore: decimal("codeIntegrityScore", { precision: 5, scale: 2 }),
  verifiedSkills: json("verifiedSkills").$type<string[]>(),
  profileSummary: text("profileSummary"),
  embeddingVersion: varchar("embeddingVersion", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("developerTelemetry_user_idx").on(table.userId), index("developerTelemetry_hackathon_idx").on(table.hackathonId)]);

export const repositorySyncStates = mysqlTable("repositorySyncStates", {
  id: int("id").autoincrement().primaryKey(),
  repositoryConnectionId: int("repositoryConnectionId").notNull(),
  lastSyncedCommitSha: varchar("lastSyncedCommitSha", { length: 64 }),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("repositorySyncStates_connection_unique").on(table.repositoryConnectionId)]);

export const codeIndexChunks = mysqlTable("codeIndexChunks", {
  id: varchar("id", { length: 500 }).primaryKey(),
  repositoryConnectionId: int("repositoryConnectionId").notNull(),
  commitSha: varchar("commitSha", { length: 64 }).notNull(),
  filePath: varchar("filePath", { length: 1000 }).notNull(),
  contentChunk: text("contentChunk").notNull(),
  contentHash: varchar("contentHash", { length: 64 }).notNull(),
  embedding: json("embedding").$type<number[]>().notNull(),
  embeddingModel: varchar("embeddingModel", { length: 120 }).notNull(),
  embeddingVersion: varchar("embeddingVersion", { length: 80 }).default("mysql-hash-v1").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("codeIndexChunks_connection_idx").on(table.repositoryConnectionId), index("codeIndexChunks_commit_idx").on(table.commitSha)]);

export const semanticRetrievalAudits = mysqlTable("semanticRetrievalAudits", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  repositoryConnectionId: int("repositoryConnectionId").notNull(),
  actorId: int("actorId").notNull().references(() => users.id, { onDelete: "restrict" }),
  queryFingerprint: varchar("queryFingerprint", { length: 64 }).notNull(),
  retrievalMode: varchar("retrievalMode", { length: 120 }).notNull(),
  resultCount: int("resultCount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("semanticRetrievalAudits_project_actor_idx").on(table.projectId, table.actorId), index("semanticRetrievalAudits_connection_idx").on(table.repositoryConnectionId)]);

/**
 * Clean rebuild namespace. These tables deliberately do not reference the
 * legacy opportunity/hackathon/project hierarchy. They model the user's
 * required investment-case → proof-candidate → human-decision lifecycle.
 */
export const studioCampaigns = mysqlTable("studioCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  challengeBrief: text("challengeBrief").notNull(),
  status: mysqlEnum("status", ["draft", "open", "screening", "closed"]).default("draft").notNull(),
  opensAt: timestamp("opensAt"),
  closesAt: timestamp("closesAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("studioCampaigns_status_idx").on(table.status), index("studioCampaigns_owner_idx").on(table.ownerId)]);

export const studioInvestmentCases = mysqlTable("studioInvestmentCases", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull().references(() => studioCampaigns.id, { onDelete: "cascade" }),
  sponsorId: int("sponsorId").notNull().references(() => users.id, { onDelete: "restrict" }),
  originatorId: int("originatorId").references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  investmentThesis: text("investmentThesis").notNull(),
  problemStatement: text("problemStatement").notNull(),
  businessCase: text("businessCase").notNull(),
  financialDetail: json("financialDetail").$type<Record<string, unknown>>(),
  kpiOkrLinks: json("kpiOkrLinks").$type<Array<{ label: string; rationale: string }>>(),
  status: mysqlEnum("status", ["submitted", "returned", "approved_for_proof", "archived", "investment_review", "archived_learning"]).default("submitted").notNull(),
  approvalRationale: text("approvalRationale"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("studioInvestmentCases_campaign_status_idx").on(table.campaignId, table.status), index("studioInvestmentCases_sponsor_idx").on(table.sponsorId)]);

export const studioInvestmentCaseAssets = mysqlTable("studioInvestmentCaseAssets", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("studioInvestmentCaseAssets_case_idx").on(table.investmentCaseId), index("studioInvestmentCaseAssets_created_idx").on(table.createdAt)]);

export const studioProofEvents = mysqlTable("studioProofEvents", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("studioProofEvents_status_idx").on(table.status), index("studioProofEvents_organizer_idx").on(table.organizerId)]);

export const studioProofCandidates = mysqlTable("studioProofCandidates", {
  id: int("id").autoincrement().primaryKey(),
  investmentCaseId: int("investmentCaseId").notNull().references(() => studioInvestmentCases.id, { onDelete: "cascade" }),
  proofEventId: int("proofEventId").notNull().references(() => studioProofEvents.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  proofQuestion: text("proofQuestion").notNull(),
  requiredArtifacts: json("requiredArtifacts").$type<Array<{ key: string; label: string; required: boolean; purpose: string }>>().notNull(),
  rubric: json("rubric").$type<Array<{ key: string; label: string; weight: number; description: string }>>().notNull(),
  jiraContextUrl: varchar("jiraContextUrl", { length: 700 }),
  status: mysqlEnum("status", ["configured", "team_building", "proof_active", "submitted", "judging", "decided"]).default("configured").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("studioProofCandidates_case_event_unique").on(table.investmentCaseId, table.proofEventId), index("studioProofCandidates_event_status_idx").on(table.proofEventId, table.status)]);

export const studioTeamProofs = mysqlTable("studioTeamProofs", {
  id: int("id").autoincrement().primaryKey(),
  proofCandidateId: int("proofCandidateId").notNull().references(() => studioProofCandidates.id, { onDelete: "cascade" }),
  teamLeadId: int("teamLeadId").notNull().references(() => users.id, { onDelete: "restrict" }),
  teamName: varchar("teamName", { length: 255 }).notNull(),
  solutionSummary: text("solutionSummary").notNull(),
  status: mysqlEnum("status", ["forming", "building", "submitted", "evidence_review", "human_review", "closed"]).default("forming").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("studioTeamProofs_candidate_status_idx").on(table.proofCandidateId, table.status), index("studioTeamProofs_lead_idx").on(table.teamLeadId)]);

export const studioProofArtifacts = mysqlTable("studioProofArtifacts", {
  id: int("id").autoincrement().primaryKey(),
  teamProofId: int("teamProofId").notNull().references(() => studioTeamProofs.id, { onDelete: "cascade" }),
  uploadedById: int("uploadedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  artifactKey: varchar("artifactKey", { length: 80 }).notNull(),
  artifactType: mysqlEnum("artifactType", ["brd", "technical_requirements", "business_summary", "repository", "jira_context", "demo", "deck", "video", "market_research", "other"]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  evidenceUrl: varchar("evidenceUrl", { length: 1000 }).notNull(),
  extractedText: text("extractedText"),
  consentConfirmed: boolean("consentConfirmed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("studioProofArtifacts_proof_idx").on(table.teamProofId), uniqueIndex("studioProofArtifacts_proof_key_unique").on(table.teamProofId, table.artifactKey)]);

export const studioEvidencePackets = mysqlTable("studioEvidencePackets", {
  id: int("id").autoincrement().primaryKey(),
  teamProofId: int("teamProofId").notNull().references(() => studioTeamProofs.id, { onDelete: "cascade" }),
  evidenceHash: varchar("evidenceHash", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["queued", "evaluating", "ready", "needs_evidence", "failed"]).default("queued").notNull(),
  agentFindings: json("agentFindings").$type<Array<Record<string, unknown>>>(),
  skillFindings: json("skillFindings").$type<Array<Record<string, unknown>>>(),
  marketContext: json("marketContext").$type<Record<string, unknown>>(),
  teamQuestions: json("teamQuestions").$type<Array<Record<string, unknown>>>(),
  judgeQuestions: json("judgeQuestions").$type<Array<Record<string, unknown>>>(),
  limitations: json("limitations").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("studioEvidencePackets_proof_hash_unique").on(table.teamProofId, table.evidenceHash), index("studioEvidencePackets_proof_created_idx").on(table.teamProofId, table.createdAt)]);

export const studioJudgeDecisions = mysqlTable("studioJudgeDecisions", {
  id: int("id").autoincrement().primaryKey(),
  teamProofId: int("teamProofId").notNull().references(() => studioTeamProofs.id, { onDelete: "cascade" }),
  judgeId: int("judgeId").notNull().references(() => users.id, { onDelete: "restrict" }),
  evidencePacketId: int("evidencePacketId").references(() => studioEvidencePackets.id, { onDelete: "set null" }),
  rubricScores: json("rubricScores").$type<Array<{ key: string; score: number; rationale: string }>>().notNull(),
  decision: mysqlEnum("decision", ["advance", "runner_up", "return_to_proof", "archive", "no_decision"]).notNull(),
  rationale: text("rationale").notNull(),
  evidenceCorrections: json("evidenceCorrections").$type<Array<{ reference: string; action: string; rationale: string }>>(),
  executiveHeatMap: json("executiveHeatMap").$type<{ dimensions: Array<{ key: string; label: string; score: number }> }>(),
  questionAnswers: json("questionAnswers").$type<Array<{ questionIndex: number; answer: string; status: "addressed" | "disagreed" | "unresolved" }>>(),
  agentDeliberation: json("agentDeliberation").$type<{ synthesizedNotes: string; updatedVerdict: string; timestamp: string }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("studioJudgeDecisions_proof_judge_unique").on(table.teamProofId, table.judgeId), index("studioJudgeDecisions_proof_idx").on(table.teamProofId)]);

export const studioInvestmentGates = mysqlTable("studioInvestmentGates", {
  id: int("id").autoincrement().primaryKey(),
  investmentCaseId: int("investmentCaseId").notNull().references(() => studioInvestmentCases.id, { onDelete: "cascade" }),
  proofCandidateId: int("proofCandidateId").references(() => studioProofCandidates.id, { onDelete: "set null" }),
  decidedById: int("decidedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  status: mysqlEnum("status", ["advance_assessment", "fund", "return_to_proof", "hold", "archive"]).notNull(),
  assumptionMovement: json("assumptionMovement").$type<Array<{ assumption: string; movement: "strengthened" | "unchanged" | "weakened" | "missing_evidence" | "disputed"; rationale: string }>>().notNull(),
  rationale: text("rationale").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("studioInvestmentGates_case_created_idx").on(table.investmentCaseId, table.createdAt)]);

export const studioInvestmentLearning = mysqlTable("studioInvestmentLearning", {
  id: int("id").autoincrement().primaryKey(),
  investmentCaseId: int("investmentCaseId").notNull().references(() => studioInvestmentCases.id, { onDelete: "cascade" }),
  proofCandidateId: int("proofCandidateId").references(() => studioProofCandidates.id, { onDelete: "set null" }),
  judgeDecisionId: int("judgeDecisionId").references(() => studioJudgeDecisions.id, { onDelete: "set null" }),
  investmentGateId: int("investmentGateId").references(() => studioInvestmentGates.id, { onDelete: "set null" }),
  recordedById: int("recordedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  validatedAssumptions: json("validatedAssumptions").$type<Array<{ assumption: string; result: "supported" | "partial" | "unsupported" | "not_tested"; evidence: string }>>().notNull(),
  limitations: json("limitations").$type<string[]>().notNull(),
  expectedInvestmentContribution: text("expectedInvestmentContribution"),
  reusableLearning: text("reusableLearning").notNull(),
  nextInvestmentAction: text("nextInvestmentAction").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("studioInvestmentLearning_case_created_idx").on(table.investmentCaseId, table.createdAt)]);

export const studioCampaignSignals = mysqlTable("studioCampaignSignals", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull().references(() => studioCampaigns.id, { onDelete: "cascade" }),
  investmentCaseId: int("investmentCaseId").references(() => studioInvestmentCases.id, { onDelete: "set null" }),
  submittedById: int("submittedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  signalType: mysqlEnum("signalType", ["idea", "endorsement", "comment", "evidence_offer"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("studioCampaignSignals_campaign_created_idx").on(table.campaignId, table.createdAt), index("studioCampaignSignals_case_created_idx").on(table.investmentCaseId, table.createdAt)]);

export const studioCampaignAssessments = mysqlTable("studioCampaignAssessments", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("studioCampaignAssessments_case_user_unique").on(table.investmentCaseId, table.submittedById), index("studioCampaignAssessments_campaign_case_idx").on(table.campaignId, table.investmentCaseId)]);

export const studioIncubationReviews = mysqlTable("studioIncubationReviews", {
  id: int("id").autoincrement().primaryKey(),
  investmentCaseId: int("investmentCaseId").notNull().references(() => studioInvestmentCases.id, { onDelete: "cascade" }),
  managerId: int("managerId").notNull().references(() => users.id, { onDelete: "restrict" }),
  decision: mysqlEnum("decision", ["advance", "return_for_enrichment", "hold", "decline"]).notNull(),
  rationale: text("rationale").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("studioIncubationReviews_case_manager_unique").on(table.investmentCaseId, table.managerId), index("studioIncubationReviews_case_updated_idx").on(table.investmentCaseId, table.updatedAt)]);

export const studioEventRegistrations = mysqlTable("studioEventRegistrations", {
  id: int("id").autoincrement().primaryKey(),
  proofEventId: int("proofEventId").notNull().references(() => studioProofEvents.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["participant", "mentor", "judge", "organizer"]).notNull(),
  status: mysqlEnum("status", ["registered", "approved", "declined", "withdrawn"]).notNull().default("registered"),
  availability: json("availability").$type<Array<{ label: string; startsAt?: string; endsAt?: string }>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("studioEventRegistrations_event_user_role_unique").on(table.proofEventId, table.userId, table.role), index("studioEventRegistrations_event_role_idx").on(table.proofEventId, table.role)]);

export const studioProofTeamMembers = mysqlTable("studioProofTeamMembers", {
  id: int("id").autoincrement().primaryKey(),
  teamProofId: int("teamProofId").notNull().references(() => studioTeamProofs.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["lead", "builder", "designer", "business", "researcher", "other"]).notNull().default("builder"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, table => [uniqueIndex("studioProofTeamMembers_proof_user_unique").on(table.teamProofId, table.userId), index("studioProofTeamMembers_proof_idx").on(table.teamProofId)]);

/**
 * Governance record for the challenge-owned repository assigned to one selected
 * project. This tracks readiness and lifecycle intent before any external GitHub
 * operation is permitted. Repository creation and team access remain blocked
 * until the GitHub App installation receives the required organization scope.
 */
export const studioChallengeRepositories = mysqlTable("studioChallengeRepositories", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("studioChallengeRepositories_candidate_unique").on(table.proofCandidateId), index("studioChallengeRepositories_status_idx").on(table.status), index("studioChallengeRepositories_org_idx").on(table.organization)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;
export type Hackathon = typeof hackathons.$inferSelect;
export type Project = typeof projects.$inferSelect;
