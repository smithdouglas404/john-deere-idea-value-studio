CREATE TABLE `studioCampaignSignals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`investmentCaseId` int,
	`submittedById` int NOT NULL,
	`signalType` enum('idea','endorsement','comment','evidence_offer') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studioCampaignSignals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studioEventRegistrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proofEventId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('participant','mentor','judge','organizer') NOT NULL,
	`status` enum('registered','approved','declined','withdrawn') NOT NULL DEFAULT 'registered',
	`availability` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studioEventRegistrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `studioEventRegistrations_event_user_role_unique` UNIQUE(`proofEventId`,`userId`,`role`)
);
--> statement-breakpoint
CREATE TABLE `studioProofTeamMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamProofId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('lead','builder','designer','business','researcher','other') NOT NULL DEFAULT 'builder',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studioProofTeamMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `studioProofTeamMembers_proof_user_unique` UNIQUE(`teamProofId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `studioCampaignSignals` ADD CONSTRAINT `scs_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `studioCampaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioCampaignSignals` ADD CONSTRAINT `scs_case_fk` FOREIGN KEY (`investmentCaseId`) REFERENCES `studioInvestmentCases`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioCampaignSignals` ADD CONSTRAINT `scs_user_fk` FOREIGN KEY (`submittedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioEventRegistrations` ADD CONSTRAINT `ser_event_fk` FOREIGN KEY (`proofEventId`) REFERENCES `studioProofEvents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioEventRegistrations` ADD CONSTRAINT `ser_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioProofTeamMembers` ADD CONSTRAINT `sptm_proof_fk` FOREIGN KEY (`teamProofId`) REFERENCES `studioTeamProofs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioProofTeamMembers` ADD CONSTRAINT `sptm_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studioCampaignSignals_campaign_created_idx` ON `studioCampaignSignals` (`campaignId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `studioCampaignSignals_case_created_idx` ON `studioCampaignSignals` (`investmentCaseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `studioEventRegistrations_event_role_idx` ON `studioEventRegistrations` (`proofEventId`,`role`);--> statement-breakpoint
CREATE INDEX `studioProofTeamMembers_proof_idx` ON `studioProofTeamMembers` (`teamProofId`);
