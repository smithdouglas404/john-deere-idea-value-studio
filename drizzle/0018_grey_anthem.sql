CREATE TABLE `opportunityCommunityNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opportunityId` int NOT NULL,
	`authorId` int NOT NULL,
	`category` enum('customer_signal','market_signal','operating_signal','evidence_offer','question','other') NOT NULL DEFAULT 'other',
	`body` text NOT NULL,
	`evidenceUrl` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `opportunityCommunityNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunityEndorsements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opportunityId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `opportunityEndorsements_id` PRIMARY KEY(`id`),
	CONSTRAINT `opportunityEndorsements_opportunity_user_unique` UNIQUE(`opportunityId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `researchRuns` ADD `dossier` json;--> statement-breakpoint
ALTER TABLE `researchSources` ADD `evidenceCategory` enum('market','customer','operating','value','other') DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunityCommunityNotes` ADD CONSTRAINT `opportunityCommunityNotes_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunityCommunityNotes` ADD CONSTRAINT `opportunityCommunityNotes_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunityEndorsements` ADD CONSTRAINT `opportunityEndorsements_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunityEndorsements` ADD CONSTRAINT `opportunityEndorsements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `opportunityCommunityNotes_opportunity_created_idx` ON `opportunityCommunityNotes` (`opportunityId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `opportunityEndorsements_opportunity_idx` ON `opportunityEndorsements` (`opportunityId`);