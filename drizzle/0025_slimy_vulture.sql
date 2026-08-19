CREATE TABLE `studioCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`challengeBrief` text NOT NULL,
	`status` enum('draft','open','screening','closed') NOT NULL DEFAULT 'draft',
	`opensAt` timestamp,
	`closesAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studioCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studioEvidencePackets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamProofId` int NOT NULL,
	`evidenceHash` varchar(128) NOT NULL,
	`status` enum('queued','evaluating','ready','needs_evidence','failed') NOT NULL DEFAULT 'queued',
	`agentFindings` json,
	`skillFindings` json,
	`marketContext` json,
	`teamQuestions` json,
	`judgeQuestions` json,
	`limitations` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studioEvidencePackets_id` PRIMARY KEY(`id`),
	CONSTRAINT `studioEvidencePackets_proof_hash_unique` UNIQUE(`teamProofId`,`evidenceHash`)
);
--> statement-breakpoint
CREATE TABLE `studioInvestmentCases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`sponsorId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`investmentThesis` text NOT NULL,
	`problemStatement` text NOT NULL,
	`businessCase` text NOT NULL,
	`financialDetail` json,
	`kpiOkrLinks` json,
	`status` enum('submitted','returned','approved_for_proof','archived','investment_review') NOT NULL DEFAULT 'submitted',
	`approvalRationale` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studioInvestmentCases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studioInvestmentGates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investmentCaseId` int NOT NULL,
	`proofCandidateId` int,
	`decidedById` int NOT NULL,
	`status` enum('advance_assessment','fund','return_to_proof','hold','archive') NOT NULL,
	`assumptionMovement` json NOT NULL,
	`rationale` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studioInvestmentGates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studioJudgeDecisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamProofId` int NOT NULL,
	`judgeId` int NOT NULL,
	`evidencePacketId` int,
	`rubricScores` json NOT NULL,
	`decision` enum('advance','runner_up','return_to_proof','archive','no_decision') NOT NULL,
	`rationale` text NOT NULL,
	`evidenceCorrections` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studioJudgeDecisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `studioJudgeDecisions_proof_judge_unique` UNIQUE(`teamProofId`,`judgeId`)
);
--> statement-breakpoint
CREATE TABLE `studioProofArtifacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamProofId` int NOT NULL,
	`uploadedById` int NOT NULL,
	`artifactKey` varchar(80) NOT NULL,
	`artifactType` enum('brd','technical_requirements','business_summary','repository','jira_context','demo','deck','video','other') NOT NULL,
	`title` varchar(500) NOT NULL,
	`evidenceUrl` varchar(1000) NOT NULL,
	`extractedText` text,
	`consentConfirmed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studioProofArtifacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `studioProofArtifacts_proof_key_unique` UNIQUE(`teamProofId`,`artifactKey`)
);
--> statement-breakpoint
CREATE TABLE `studioProofCandidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investmentCaseId` int NOT NULL,
	`proofEventId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`proofQuestion` text NOT NULL,
	`requiredArtifacts` json NOT NULL,
	`rubric` json NOT NULL,
	`jiraContextUrl` varchar(700),
	`status` enum('configured','team_building','proof_active','submitted','judging','decided') NOT NULL DEFAULT 'configured',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studioProofCandidates_id` PRIMARY KEY(`id`),
	CONSTRAINT `studioProofCandidates_case_event_unique` UNIQUE(`investmentCaseId`,`proofEventId`)
);
--> statement-breakpoint
CREATE TABLE `studioProofEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`rules` text NOT NULL,
	`status` enum('draft','registration','proof_active','judging','closed') NOT NULL DEFAULT 'draft',
	`registrationOpensAt` timestamp,
	`registrationClosesAt` timestamp,
	`proofStartsAt` timestamp,
	`submissionClosesAt` timestamp,
	`judgingStartsAt` timestamp,
	`judgingClosesAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studioProofEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studioTeamProofs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proofCandidateId` int NOT NULL,
	`teamLeadId` int NOT NULL,
	`teamName` varchar(255) NOT NULL,
	`solutionSummary` text NOT NULL,
	`status` enum('forming','building','submitted','evidence_review','human_review','closed') NOT NULL DEFAULT 'forming',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studioTeamProofs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `studioCampaigns` ADD CONSTRAINT `sc_owner_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioEvidencePackets` ADD CONSTRAINT `sep_proof_fk` FOREIGN KEY (`teamProofId`) REFERENCES `studioTeamProofs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioInvestmentCases` ADD CONSTRAINT `sic_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `studioCampaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioInvestmentCases` ADD CONSTRAINT `sic_sponsor_fk` FOREIGN KEY (`sponsorId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioInvestmentGates` ADD CONSTRAINT `sig_case_fk` FOREIGN KEY (`investmentCaseId`) REFERENCES `studioInvestmentCases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioInvestmentGates` ADD CONSTRAINT `sig_candidate_fk` FOREIGN KEY (`proofCandidateId`) REFERENCES `studioProofCandidates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioInvestmentGates` ADD CONSTRAINT `sig_decider_fk` FOREIGN KEY (`decidedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioJudgeDecisions` ADD CONSTRAINT `sjd_proof_fk` FOREIGN KEY (`teamProofId`) REFERENCES `studioTeamProofs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioJudgeDecisions` ADD CONSTRAINT `sjd_judge_fk` FOREIGN KEY (`judgeId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioJudgeDecisions` ADD CONSTRAINT `sjd_packet_fk` FOREIGN KEY (`evidencePacketId`) REFERENCES `studioEvidencePackets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioProofArtifacts` ADD CONSTRAINT `spa_proof_fk` FOREIGN KEY (`teamProofId`) REFERENCES `studioTeamProofs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioProofArtifacts` ADD CONSTRAINT `spa_uploader_fk` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioProofCandidates` ADD CONSTRAINT `spc_case_fk` FOREIGN KEY (`investmentCaseId`) REFERENCES `studioInvestmentCases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioProofCandidates` ADD CONSTRAINT `spc_event_fk` FOREIGN KEY (`proofEventId`) REFERENCES `studioProofEvents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioProofEvents` ADD CONSTRAINT `spe_organizer_fk` FOREIGN KEY (`organizerId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioTeamProofs` ADD CONSTRAINT `stp_candidate_fk` FOREIGN KEY (`proofCandidateId`) REFERENCES `studioProofCandidates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioTeamProofs` ADD CONSTRAINT `stp_lead_fk` FOREIGN KEY (`teamLeadId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studioCampaigns_status_idx` ON `studioCampaigns` (`status`);--> statement-breakpoint
CREATE INDEX `studioCampaigns_owner_idx` ON `studioCampaigns` (`ownerId`);--> statement-breakpoint
CREATE INDEX `studioEvidencePackets_proof_created_idx` ON `studioEvidencePackets` (`teamProofId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `studioInvestmentCases_campaign_status_idx` ON `studioInvestmentCases` (`campaignId`,`status`);--> statement-breakpoint
CREATE INDEX `studioInvestmentCases_sponsor_idx` ON `studioInvestmentCases` (`sponsorId`);--> statement-breakpoint
CREATE INDEX `studioInvestmentGates_case_created_idx` ON `studioInvestmentGates` (`investmentCaseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `studioJudgeDecisions_proof_idx` ON `studioJudgeDecisions` (`teamProofId`);--> statement-breakpoint
CREATE INDEX `studioProofArtifacts_proof_idx` ON `studioProofArtifacts` (`teamProofId`);--> statement-breakpoint
CREATE INDEX `studioProofCandidates_event_status_idx` ON `studioProofCandidates` (`proofEventId`,`status`);--> statement-breakpoint
CREATE INDEX `studioProofEvents_status_idx` ON `studioProofEvents` (`status`);--> statement-breakpoint
CREATE INDEX `studioProofEvents_organizer_idx` ON `studioProofEvents` (`organizerId`);--> statement-breakpoint
CREATE INDEX `studioTeamProofs_candidate_status_idx` ON `studioTeamProofs` (`proofCandidateId`,`status`);--> statement-breakpoint
CREATE INDEX `studioTeamProofs_lead_idx` ON `studioTeamProofs` (`teamLeadId`);
