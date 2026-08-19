ALTER TABLE `projectAssets` ADD `byteSize` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projectAssets` ADD `extraction` json;--> statement-breakpoint
ALTER TABLE `projectAssets` ADD `contributorConfirmed` boolean DEFAULT false NOT NULL;