CREATE TABLE `projectTracks` (
	`projectId` int NOT NULL,
	`trackId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectTracks_project_track_unique` UNIQUE(`projectId`,`trackId`)
);
--> statement-breakpoint
CREATE TABLE `teamMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`senderId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teamMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projectTracks` ADD CONSTRAINT `projectTracks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectTracks` ADD CONSTRAINT `projectTracks_trackId_tracks_id_fk` FOREIGN KEY (`trackId`) REFERENCES `tracks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamMessages` ADD CONSTRAINT `teamMessages_teamId_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamMessages` ADD CONSTRAINT `teamMessages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `projectTracks_track_idx` ON `projectTracks` (`trackId`);--> statement-breakpoint
CREATE INDEX `teamMessages_team_created_idx` ON `teamMessages` (`teamId`,`createdAt`);