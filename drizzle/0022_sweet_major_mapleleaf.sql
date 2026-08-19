CREATE TABLE `announcementAcknowledgements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`announcementId` int NOT NULL,
	`userId` int NOT NULL,
	`acknowledgedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcementAcknowledgements_id` PRIMARY KEY(`id`),
	CONSTRAINT `announcementAcknowledgements_announcement_user_unique` UNIQUE(`announcementId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `teamAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`teamId` int NOT NULL,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teamAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `announcementAcknowledgements` ADD CONSTRAINT `announcementAcknowledgements_announcementId_announcements_id_fk` FOREIGN KEY (`announcementId`) REFERENCES `announcements`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcementAcknowledgements` ADD CONSTRAINT `announcementAcknowledgements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamAlerts` ADD CONSTRAINT `teamAlerts_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamAlerts` ADD CONSTRAINT `teamAlerts_teamId_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamAlerts` ADD CONSTRAINT `teamAlerts_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `announcementAcknowledgements_user_idx` ON `announcementAcknowledgements` (`userId`);--> statement-breakpoint
CREATE INDEX `teamAlerts_event_created_idx` ON `teamAlerts` (`hackathonId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `teamAlerts_team_created_idx` ON `teamAlerts` (`teamId`,`createdAt`);