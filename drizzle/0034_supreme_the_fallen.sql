CREATE TABLE `studioCampaignAssessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`investmentCaseId` int NOT NULL,
	`submittedById` int NOT NULL,
	`stance` enum('go','hold','no_go') NOT NULL,
	`valuationScore` int NOT NULL,
	`likes` text NOT NULL,
	`improvements` text NOT NULL,
	`rationale` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studioCampaignAssessments_id` PRIMARY KEY(`id`),
	CONSTRAINT `studioCampaignAssessments_case_user_unique` UNIQUE(`investmentCaseId`,`submittedById`)
);
--> statement-breakpoint
CREATE TABLE `studioIncubationReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investmentCaseId` int NOT NULL,
	`managerId` int NOT NULL,
	`decision` enum('advance','return_for_enrichment','hold','decline') NOT NULL,
	`rationale` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studioIncubationReviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `studioIncubationReviews_case_manager_unique` UNIQUE(`investmentCaseId`,`managerId`)
);
--> statement-breakpoint
ALTER TABLE `studioCampaignAssessments` ADD CONSTRAINT `sca_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `studioCampaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioCampaignAssessments` ADD CONSTRAINT `sca_case_fk` FOREIGN KEY (`investmentCaseId`) REFERENCES `studioInvestmentCases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioCampaignAssessments` ADD CONSTRAINT `sca_submitter_fk` FOREIGN KEY (`submittedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioIncubationReviews` ADD CONSTRAINT `sir_case_fk` FOREIGN KEY (`investmentCaseId`) REFERENCES `studioInvestmentCases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioIncubationReviews` ADD CONSTRAINT `sir_manager_fk` FOREIGN KEY (`managerId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studioCampaignAssessments_campaign_case_idx` ON `studioCampaignAssessments` (`campaignId`,`investmentCaseId`);--> statement-breakpoint
CREATE INDEX `studioIncubationReviews_case_updated_idx` ON `studioIncubationReviews` (`investmentCaseId`,`updatedAt`);
