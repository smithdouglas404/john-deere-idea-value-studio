CREATE TABLE `studioInvestmentLearning` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investmentCaseId` int NOT NULL,
	`proofCandidateId` int,
	`judgeDecisionId` int,
	`investmentGateId` int,
	`recordedById` int NOT NULL,
	`validatedAssumptions` json NOT NULL,
	`limitations` json NOT NULL,
	`reusableLearning` text NOT NULL,
	`nextInvestmentAction` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studioInvestmentLearning_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `studioInvestmentLearning` ADD CONSTRAINT `sil_case_fk` FOREIGN KEY (`investmentCaseId`) REFERENCES `studioInvestmentCases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioInvestmentLearning` ADD CONSTRAINT `sil_candidate_fk` FOREIGN KEY (`proofCandidateId`) REFERENCES `studioProofCandidates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioInvestmentLearning` ADD CONSTRAINT `sil_decision_fk` FOREIGN KEY (`judgeDecisionId`) REFERENCES `studioJudgeDecisions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioInvestmentLearning` ADD CONSTRAINT `sil_gate_fk` FOREIGN KEY (`investmentGateId`) REFERENCES `studioInvestmentGates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioInvestmentLearning` ADD CONSTRAINT `sil_user_fk` FOREIGN KEY (`recordedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studioInvestmentLearning_case_created_idx` ON `studioInvestmentLearning` (`investmentCaseId`,`createdAt`);
