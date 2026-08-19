CREATE TABLE `repositoryConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`githubUrl` varchar(600) NOT NULL,
	`visibility` enum('public','private') NOT NULL,
	`accessMode` enum('public_api','github_app') NOT NULL,
	`appId` varchar(40),
	`installationId` varchar(40),
	`authorizedById` int NOT NULL,
	`authorizedRepositoryId` varchar(40),
	`authorizationEvidence` json,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `repositoryConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `repositoryConnections_project_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
ALTER TABLE `repositoryConnections` ADD CONSTRAINT `repositoryConnections_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repositoryConnections` ADD CONSTRAINT `repositoryConnections_authorizedById_users_id_fk` FOREIGN KEY (`authorizedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `repositoryConnections_mode_idx` ON `repositoryConnections` (`accessMode`);