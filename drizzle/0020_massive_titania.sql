CREATE TABLE `organizerCopilotDrafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`opportunityId` int NOT NULL,
	`requestedById` int NOT NULL,
	`payload` json NOT NULL,
	`status` enum('draft','adopted') NOT NULL DEFAULT 'draft',
	`adoptedById` int,
	`adoptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizerCopilotDrafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `organizerCopilotDrafts` ADD CONSTRAINT `organizerCopilotDrafts_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizerCopilotDrafts` ADD CONSTRAINT `organizerCopilotDrafts_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizerCopilotDrafts` ADD CONSTRAINT `organizerCopilotDrafts_requestedById_users_id_fk` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizerCopilotDrafts` ADD CONSTRAINT `organizerCopilotDrafts_adoptedById_users_id_fk` FOREIGN KEY (`adoptedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `organizerCopilotDrafts_event_created_idx` ON `organizerCopilotDrafts` (`hackathonId`,`createdAt`);