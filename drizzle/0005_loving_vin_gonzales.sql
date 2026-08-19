CREATE TABLE `hackathonFaqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hackathonId` int NOT NULL,
	`question` varchar(500) NOT NULL,
	`answer` text NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hackathonFaqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `hackathonFaqs` ADD CONSTRAINT `hackathonFaqs_hackathonId_hackathons_id_fk` FOREIGN KEY (`hackathonId`) REFERENCES `hackathons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hackathonFaqs` ADD CONSTRAINT `hackathonFaqs_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `hackathonFaqs_event_order_idx` ON `hackathonFaqs` (`hackathonId`,`displayOrder`);