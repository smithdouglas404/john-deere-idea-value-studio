CREATE TABLE `mentorRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`requesterId` int NOT NULL,
	`mentorId` int NOT NULL,
	`projectId` int,
	`scheduleItemId` int,
	`requestNote` text NOT NULL,
	`status` enum('pending','accepted','declined','redirected','cancelled') NOT NULL DEFAULT 'pending',
	`responseNote` text,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mentorRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mentorRequests` ADD CONSTRAINT `mentorRequests_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mentorRequests` ADD CONSTRAINT `mentorRequests_requesterId_users_id_fk` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mentorRequests` ADD CONSTRAINT `mentorRequests_mentorId_users_id_fk` FOREIGN KEY (`mentorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mentorRequests` ADD CONSTRAINT `mentorRequests_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mentorRequests` ADD CONSTRAINT `mentorRequests_scheduleItemId_hackathonScheduleItems_id_fk` FOREIGN KEY (`scheduleItemId`) REFERENCES `hackathonScheduleItems`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mentorRequests_event_status_idx` ON `mentorRequests` (`hackathonId`,`status`);--> statement-breakpoint
CREATE INDEX `mentorRequests_mentor_status_idx` ON `mentorRequests` (`mentorId`,`status`);--> statement-breakpoint
CREATE INDEX `mentorRequests_requester_idx` ON `mentorRequests` (`requesterId`);