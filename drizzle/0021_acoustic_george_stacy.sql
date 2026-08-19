CREATE TABLE `reviewerCalibrationCases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`createdById` int NOT NULL,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	CONSTRAINT `reviewerCalibrationCases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewerCalibrationResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`calibrationCaseId` int NOT NULL,
	`judgeId` int NOT NULL,
	`rationale` text NOT NULL,
	`criterionScores` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviewerCalibrationResponses_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviewerCalibrationResponses_case_judge_unique` UNIQUE(`calibrationCaseId`,`judgeId`)
);
--> statement-breakpoint
ALTER TABLE `reviewerCalibrationCases` ADD CONSTRAINT `reviewerCalibrationCases_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviewerCalibrationCases` ADD CONSTRAINT `reviewerCalibrationCases_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviewerCalibrationCases` ADD CONSTRAINT `reviewerCalibrationCases_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviewerCalibrationResponses` ADD CONSTRAINT `reviewerCalibrationResponses_calibrationCaseId_reviewerCalibrationCases_id_fk` FOREIGN KEY (`calibrationCaseId`) REFERENCES `reviewerCalibrationCases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviewerCalibrationResponses` ADD CONSTRAINT `reviewerCalibrationResponses_judgeId_users_id_fk` FOREIGN KEY (`judgeId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reviewerCalibrationCases_event_status_idx` ON `reviewerCalibrationCases` (`hackathonId`,`status`);--> statement-breakpoint
CREATE INDEX `reviewerCalibrationResponses_judge_idx` ON `reviewerCalibrationResponses` (`judgeId`);