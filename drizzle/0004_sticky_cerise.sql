ALTER TABLE `repositoryConnections` ADD `scheduleCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `repositoryConnections` ADD `lastObservedAt` timestamp;--> statement-breakpoint
CREATE INDEX `repositoryConnections_schedule_idx` ON `repositoryConnections` (`scheduleCronTaskUid`);