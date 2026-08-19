CREATE TABLE `evaluationSyntheses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`auditId` int,
	`initiatedById` int NOT NULL,
	`model` varchar(100) NOT NULL,
	`policyVersion` varchar(80) NOT NULL,
	`evidenceHash` varchar(128) NOT NULL,
	`status` enum('processing','complete','failed') NOT NULL DEFAULT 'processing',
	`result` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `evaluationSyntheses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `humanReviewAnnotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`judgeId` int NOT NULL,
	`targetType` enum('synthesis','finding','claim','market_research') NOT NULL,
	`targetReference` varchar(300) NOT NULL,
	`annotationType` enum('note','voice_transcript','evidence_correction','independent_determination') NOT NULL,
	`body` text NOT NULL,
	`audioStorageKey` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `humanReviewAnnotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `evaluationSyntheses` ADD CONSTRAINT `evaluationSyntheses_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evaluationSyntheses` ADD CONSTRAINT `evaluationSyntheses_auditId_submissionAudits_id_fk` FOREIGN KEY (`auditId`) REFERENCES `submissionAudits`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evaluationSyntheses` ADD CONSTRAINT `evaluationSyntheses_initiatedById_users_id_fk` FOREIGN KEY (`initiatedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `humanReviewAnnotations` ADD CONSTRAINT `humanReviewAnnotations_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `humanReviewAnnotations` ADD CONSTRAINT `humanReviewAnnotations_judgeId_users_id_fk` FOREIGN KEY (`judgeId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `evaluationSyntheses_project_created_idx` ON `evaluationSyntheses` (`projectId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `evaluationSyntheses_audit_idx` ON `evaluationSyntheses` (`auditId`);--> statement-breakpoint
CREATE INDEX `humanReviewAnnotations_project_created_idx` ON `humanReviewAnnotations` (`projectId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `humanReviewAnnotations_target_idx` ON `humanReviewAnnotations` (`projectId`,`targetReference`);