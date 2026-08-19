CREATE TABLE `hackathonScheduleItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`kind` enum('opening','workshop','office_hours','submission_deadline','demo','judging','awards','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hackathonScheduleItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `hackathons` ADD `bannerUrl` varchar(700);--> statement-breakpoint
ALTER TABLE `hackathonScheduleItems` ADD CONSTRAINT `hackathonScheduleItems_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hackathonScheduleItems` ADD CONSTRAINT `hackathonScheduleItems_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `hackathonScheduleItems_event_time_idx` ON `hackathonScheduleItems` (`hackathonId`,`startsAt`);