CREATE TABLE `specialistEvaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`projectId` int NOT NULL,
	`skill` enum('ux_ui','cloud_architecture','security','development_quality','value_feasibility') NOT NULL,
	`version` varchar(80) NOT NULL,
	`policyVersion` varchar(80) NOT NULL,
	`evidenceHash` varchar(64) NOT NULL,
	`status` enum('queued','processing','complete','failed') NOT NULL DEFAULT 'queued',
	`provisionalScore` decimal(5,2),
	`result` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `specialistEvaluations_id` PRIMARY KEY(`id`),
	CONSTRAINT `specialistEvaluations_audit_skill_unique` UNIQUE(`auditId`,`skill`)
);
--> statement-breakpoint
ALTER TABLE `specialistEvaluations` ADD CONSTRAINT `specialistEvaluations_auditId_submissionAudits_id_fk` FOREIGN KEY (`auditId`) REFERENCES `submissionAudits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `specialistEvaluations` ADD CONSTRAINT `specialistEvaluations_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `specialistEvaluations_project_skill_idx` ON `specialistEvaluations` (`projectId`,`skill`);