CREATE TABLE `aiOverrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`judgeId` int NOT NULL,
	`claimReference` varchar(255) NOT NULL,
	`action` enum('dismiss','confirm','escalate') NOT NULL,
	`reason` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiOverrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consentRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scope` enum('voice_transcription','document_processing','external_research','talent_profile','repo_audit') NOT NULL,
	`accepted` boolean NOT NULL,
	`policyVersion` varchar(80) NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consentRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developerTelemetry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`hackathonId` int NOT NULL,
	`commitCount` int NOT NULL DEFAULT 0,
	`bulkCommitFlag` boolean NOT NULL DEFAULT false,
	`codeIntegrityScore` decimal(5,2),
	`verifiedSkills` json,
	`profileSummary` text,
	`embeddingVersion` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developerTelemetry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hackathons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opportunityId` int,
	`organizerId` int NOT NULL,
	`sponsorId` int,
	`title` varchar(255) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`tagline` text,
	`description` text,
	`rules` text,
	`status` enum('draft','registration_open','hacking_active','judging_active','completed') NOT NULL DEFAULT 'draft',
	`maxTeamSize` int NOT NULL DEFAULT 4,
	`registrationStart` timestamp,
	`registrationEnd` timestamp,
	`hackingStart` timestamp,
	`hackingEnd` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hackathons_id` PRIMARY KEY(`id`),
	CONSTRAINT `hackathons_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `indicatorSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opportunityId` int NOT NULL,
	`category` enum('customer_value','operating_value','evidence_confidence','technical_execution','claim_integrity','originality','delivery_fit') NOT NULL,
	`label` varchar(255) NOT NULL,
	`value` decimal(15,4) NOT NULL,
	`unit` varchar(80) NOT NULL,
	`evidence` text NOT NULL,
	`provenance` json,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `indicatorSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `judgeAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`projectId` int NOT NULL,
	`judgeId` int NOT NULL,
	`isRecused` boolean NOT NULL DEFAULT false,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `judgeAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `judgeAssignments_project_judge_unique` UNIQUE(`projectId`,`judgeId`)
);
--> statement-breakpoint
CREATE TABLE `objections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`submittedById` int NOT NULL,
	`claimReference` varchar(255) NOT NULL,
	`explanation` text NOT NULL,
	`status` enum('open','under_review','resolved','declined') NOT NULL DEFAULT 'open',
	`reviewedById` int,
	`response` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `objections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`problemStatement` text NOT NULL,
	`opportunityNarrative` text,
	`targetUser` varchar(255),
	`domain` varchar(160),
	`stage` enum('signal','shaping','evidence','selected','hackathon','gate_review','realization','closed') NOT NULL DEFAULT 'signal',
	`status` enum('active','deferred','rejected','selected','archived') NOT NULL DEFAULT 'active',
	`initialValueLow` decimal(15,2),
	`initialValueHigh` decimal(15,2),
	`valueCurrency` varchar(8) NOT NULL DEFAULT 'USD',
	`confidence` int NOT NULL DEFAULT 0,
	`aiBrief` json,
	`evidenceGaps` json,
	`selectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunityAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opportunityId` int NOT NULL,
	`uploadedById` int NOT NULL,
	`assetType` enum('voice','document','image','deck','video','other') NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(700) NOT NULL,
	`originalName` varchar(500) NOT NULL,
	`mimeType` varchar(150) NOT NULL,
	`byteSize` int NOT NULL,
	`transcript` text,
	`extraction` json,
	`contributorConfirmed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `opportunityAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectClaims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`source` enum('pitch_deck','video_transcript','readme','submission') NOT NULL,
	`sourceReference` varchar(300) NOT NULL,
	`claimedFeature` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectClaims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`teamId` int NOT NULL,
	`trackId` int,
	`title` varchar(255) NOT NULL,
	`tagline` varchar(500),
	`description` text NOT NULL,
	`techStack` json,
	`githubUrl` varchar(600),
	`demoUrl` varchar(600),
	`videoUrl` varchar(600),
	`pitchDeckUrl` varchar(600),
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_hackathon_team_unique` UNIQUE(`hackathonId`,`teamId`)
);
--> statement-breakpoint
CREATE TABLE `researchRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opportunityId` int NOT NULL,
	`requestedById` int NOT NULL,
	`scope` varchar(255) NOT NULL,
	`status` enum('queued','running','complete','needs_review','failed') NOT NULL DEFAULT 'queued',
	`summary` text,
	`limitations` text,
	`reviewedById` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `researchRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `researchSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`researchRunId` int NOT NULL,
	`url` varchar(1000) NOT NULL,
	`title` varchar(500) NOT NULL,
	`sourceType` enum('company','product','open_source','publication','patent','internal','other') NOT NULL DEFAULT 'other',
	`excerpt` text,
	`relevance` text,
	`similarityAssessment` enum('potentially_similar','relevant_precedent','possible_differentiator','requires_expert_review') NOT NULL,
	`accessedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `researchSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rubricCriteria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` text,
	`maxScore` int NOT NULL DEFAULT 10,
	`weight` decimal(5,2) NOT NULL,
	`evaluationMethod` varchar(200),
	CONSTRAINT `rubricCriteria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scoreItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scorecardId` int NOT NULL,
	`criterionId` int NOT NULL,
	`score` decimal(5,2) NOT NULL,
	`feedback` text,
	CONSTRAINT `scoreItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `scoreItems_card_criterion_unique` UNIQUE(`scorecardId`,`criterionId`)
);
--> statement-breakpoint
CREATE TABLE `scorecards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`judgeId` int NOT NULL,
	`privateNotes` text,
	`finalized` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scorecards_id` PRIMARY KEY(`id`),
	CONSTRAINT `scorecards_project_judge_unique` UNIQUE(`projectId`,`judgeId`)
);
--> statement-breakpoint
CREATE TABLE `submissionAudits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`status` enum('queued','processing','complete','failed','needs_review') NOT NULL DEFAULT 'queued',
	`extractionMethod` enum('github_api','shallow_clone','manual') NOT NULL DEFAULT 'manual',
	`technicalScore` decimal(5,2),
	`integrityScore` decimal(5,2),
	`originalityScore` decimal(5,2),
	`pitchFitScore` decimal(5,2),
	`finalSuggestedScore` decimal(5,2),
	`report` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `submissionAudits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teamMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('leader','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teamMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `teamMembers_team_user_unique` UNIQUE(`teamId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`inviteCode` varchar(40) NOT NULL,
	`lookingForMembers` boolean NOT NULL DEFAULT false,
	`lookingForSkills` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_hackathon_name_unique` UNIQUE(`hackathonId`,`name`),
	CONSTRAINT `teams_invite_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`prizeAmount` decimal(12,2),
	`sponsorName` varchar(160),
	CONSTRAINT `tracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`persona` enum('participant','organizer','sponsor','judge','mentor','admin') NOT NULL DEFAULT 'participant',
	`bio` text,
	`githubUrl` varchar(500),
	`linkedinUrl` varchar(500),
	`skills` json,
	`lookingForTeam` boolean NOT NULL DEFAULT false,
	`talentConsent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `userProfiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `aiOverrides` ADD CONSTRAINT `aiOverrides_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `aiOverrides` ADD CONSTRAINT `aiOverrides_judgeId_users_id_fk` FOREIGN KEY (`judgeId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consentRecords` ADD CONSTRAINT `consentRecords_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developerTelemetry` ADD CONSTRAINT `developerTelemetry_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developerTelemetry` ADD CONSTRAINT `developerTelemetry_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hackathons` ADD CONSTRAINT `hackathons_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hackathons` ADD CONSTRAINT `hackathons_organizerId_users_id_fk` FOREIGN KEY (`organizerId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hackathons` ADD CONSTRAINT `hackathons_sponsorId_users_id_fk` FOREIGN KEY (`sponsorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicatorSnapshots` ADD CONSTRAINT `indicatorSnapshots_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicatorSnapshots` ADD CONSTRAINT `indicatorSnapshots_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `judgeAssignments` ADD CONSTRAINT `judgeAssignments_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `judgeAssignments` ADD CONSTRAINT `judgeAssignments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `judgeAssignments` ADD CONSTRAINT `judgeAssignments_judgeId_users_id_fk` FOREIGN KEY (`judgeId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `objections` ADD CONSTRAINT `objections_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `objections` ADD CONSTRAINT `objections_submittedById_users_id_fk` FOREIGN KEY (`submittedById`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `objections` ADD CONSTRAINT `objections_reviewedById_users_id_fk` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunityAssets` ADD CONSTRAINT `opportunityAssets_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunityAssets` ADD CONSTRAINT `opportunityAssets_uploadedById_users_id_fk` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectClaims` ADD CONSTRAINT `projectClaims_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_teamId_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_trackId_tracks_id_fk` FOREIGN KEY (`trackId`) REFERENCES `tracks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `researchRuns` ADD CONSTRAINT `researchRuns_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `researchRuns` ADD CONSTRAINT `researchRuns_requestedById_users_id_fk` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `researchRuns` ADD CONSTRAINT `researchRuns_reviewedById_users_id_fk` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `researchSources` ADD CONSTRAINT `researchSources_researchRunId_researchRuns_id_fk` FOREIGN KEY (`researchRunId`) REFERENCES `researchRuns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rubricCriteria` ADD CONSTRAINT `rubricCriteria_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scoreItems` ADD CONSTRAINT `scoreItems_scorecardId_scorecards_id_fk` FOREIGN KEY (`scorecardId`) REFERENCES `scorecards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scoreItems` ADD CONSTRAINT `scoreItems_criterionId_rubricCriteria_id_fk` FOREIGN KEY (`criterionId`) REFERENCES `rubricCriteria`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scorecards` ADD CONSTRAINT `scorecards_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scorecards` ADD CONSTRAINT `scorecards_judgeId_users_id_fk` FOREIGN KEY (`judgeId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissionAudits` ADD CONSTRAINT `submissionAudits_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamMembers` ADD CONSTRAINT `teamMembers_teamId_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamMembers` ADD CONSTRAINT `teamMembers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tracks` ADD CONSTRAINT `tracks_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD CONSTRAINT `userProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `consentRecords_user_scope_idx` ON `consentRecords` (`userId`,`scope`);--> statement-breakpoint
CREATE INDEX `developerTelemetry_user_idx` ON `developerTelemetry` (`userId`);--> statement-breakpoint
CREATE INDEX `developerTelemetry_hackathon_idx` ON `developerTelemetry` (`hackathonId`);--> statement-breakpoint
CREATE INDEX `hackathons_opportunity_idx` ON `hackathons` (`opportunityId`);--> statement-breakpoint
CREATE INDEX `indicatorSnapshots_opportunity_idx` ON `indicatorSnapshots` (`opportunityId`,`category`);--> statement-breakpoint
CREATE INDEX `judgeAssignments_judge_idx` ON `judgeAssignments` (`judgeId`);--> statement-breakpoint
CREATE INDEX `opportunities_owner_idx` ON `opportunities` (`ownerId`);--> statement-breakpoint
CREATE INDEX `opportunities_stage_idx` ON `opportunities` (`stage`);--> statement-breakpoint
CREATE INDEX `opportunityAssets_opportunity_idx` ON `opportunityAssets` (`opportunityId`);--> statement-breakpoint
CREATE INDEX `projectClaims_project_idx` ON `projectClaims` (`projectId`);--> statement-breakpoint
CREATE INDEX `researchRuns_opportunity_idx` ON `researchRuns` (`opportunityId`);--> statement-breakpoint
CREATE INDEX `researchSources_run_idx` ON `researchSources` (`researchRunId`);--> statement-breakpoint
CREATE INDEX `submissionAudits_project_idx` ON `submissionAudits` (`projectId`);--> statement-breakpoint
CREATE INDEX `userProfiles_persona_idx` ON `userProfiles` (`persona`);