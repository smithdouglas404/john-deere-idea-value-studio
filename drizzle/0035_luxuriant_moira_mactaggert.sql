CREATE TABLE `studioChallengeRepositories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proofCandidateId` int NOT NULL,
	`organization` varchar(255) NOT NULL,
	`repositoryName` varchar(255) NOT NULL,
	`repositoryUrl` varchar(700),
	`status` enum('permissions_pending','ready_to_provision','provisioned','archive_pending','archived','migration_window','deletion_pending','deleted','failed') NOT NULL DEFAULT 'permissions_pending',
	`teamAccessStatus` enum('not_granted','pending','granted','revoked') NOT NULL DEFAULT 'not_granted',
	`submittedRef` varchar(255),
	`submittedAt` timestamp,
	`auditMode` enum('read_only_advisory') NOT NULL DEFAULT 'read_only_advisory',
	`auditSchedule` varchar(80),
	`migrationClosesAt` timestamp,
	`archivedAt` timestamp,
	`deletedAt` timestamp,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studioChallengeRepositories_id` PRIMARY KEY(`id`),
	CONSTRAINT `studioChallengeRepositories_candidate_unique` UNIQUE(`proofCandidateId`)
);
--> statement-breakpoint
ALTER TABLE `studioChallengeRepositories` ADD CONSTRAINT `scr_candidate_fk` FOREIGN KEY (`proofCandidateId`) REFERENCES `studioProofCandidates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioChallengeRepositories` ADD CONSTRAINT `scr_creator_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studioChallengeRepositories_status_idx` ON `studioChallengeRepositories` (`status`);--> statement-breakpoint
CREATE INDEX `studioChallengeRepositories_org_idx` ON `studioChallengeRepositories` (`organization`);
