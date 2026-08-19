CREATE TABLE `studioInvestmentCaseAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investmentCaseId` int NOT NULL,
	`uploadedById` int NOT NULL,
	`assetType` enum('business_plan','financial_model','research','technical_document','other') NOT NULL DEFAULT 'other',
	`originalName` varchar(500) NOT NULL,
	`mimeType` varchar(150) NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(700) NOT NULL,
	`extractedText` text,
	`contributorConfirmed` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studioInvestmentCaseAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `studioInvestmentCaseAssets` ADD CONSTRAINT `studioCaseAssets_case_fk` FOREIGN KEY (`investmentCaseId`) REFERENCES `studioInvestmentCases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studioInvestmentCaseAssets` ADD CONSTRAINT `studioCaseAssets_user_fk` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studioCaseAssets_case_idx` ON `studioInvestmentCaseAssets` (`investmentCaseId`);--> statement-breakpoint
CREATE INDEX `studioCaseAssets_created_idx` ON `studioInvestmentCaseAssets` (`createdAt`);