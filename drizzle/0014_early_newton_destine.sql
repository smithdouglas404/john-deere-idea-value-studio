CREATE TABLE `semanticRetrievalAudits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`repositoryConnectionId` int NOT NULL,
	`actorId` int NOT NULL,
	`queryFingerprint` varchar(64) NOT NULL,
	`retrievalMode` varchar(120) NOT NULL,
	`resultCount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `semanticRetrievalAudits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `codeIndexChunks` ADD `contentHash` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `codeIndexChunks` ADD `embeddingVersion` varchar(80) DEFAULT 'mysql-hash-v1' NOT NULL;--> statement-breakpoint
ALTER TABLE `semanticRetrievalAudits` ADD CONSTRAINT `semanticRetrievalAudits_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `semanticRetrievalAudits_project_actor_idx` ON `semanticRetrievalAudits` (`projectId`,`actorId`);--> statement-breakpoint
CREATE INDEX `semanticRetrievalAudits_connection_idx` ON `semanticRetrievalAudits` (`repositoryConnectionId`);