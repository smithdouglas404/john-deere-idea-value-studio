CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`audience` enum('all','participants','judges','mentors') NOT NULL DEFAULT 'all',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hackathonRegistrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`userId` int NOT NULL,
	`registrationRole` enum('participant','mentor','judge') NOT NULL DEFAULT 'participant',
	`status` enum('registered','withdrawn','approved') NOT NULL DEFAULT 'registered',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hackathonRegistrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `hackathonRegistrations_event_user_unique` UNIQUE(`hackathonId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `projectAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`uploadedById` int NOT NULL,
	`assetType` enum('deck','demo','video','document','other') NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(700) NOT NULL,
	`originalName` varchar(500) NOT NULL,
	`mimeType` varchar(150) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teamJoinRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`message` text,
	`status` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`decidedAt` timestamp,
	CONSTRAINT `teamJoinRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `teamJoinRequests_team_user_unique` UNIQUE(`teamId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hackathonRegistrations` ADD CONSTRAINT `hackathonRegistrations_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hackathonRegistrations` ADD CONSTRAINT `hackathonRegistrations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectAssets` ADD CONSTRAINT `projectAssets_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectAssets` ADD CONSTRAINT `projectAssets_uploadedById_users_id_fk` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamJoinRequests` ADD CONSTRAINT `teamJoinRequests_teamId_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamJoinRequests` ADD CONSTRAINT `teamJoinRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `announcements_event_created_idx` ON `announcements` (`hackathonId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `hackathonRegistrations_event_idx` ON `hackathonRegistrations` (`hackathonId`);--> statement-breakpoint
CREATE INDEX `projectAssets_project_idx` ON `projectAssets` (`projectId`);--> statement-breakpoint
CREATE INDEX `teamJoinRequests_team_idx` ON `teamJoinRequests` (`teamId`);