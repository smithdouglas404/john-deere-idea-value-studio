ALTER TABLE `opportunities` ADD `valueCaseNarrative` text;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `valueDrivers` json;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `economicAssumptions` json;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `costToProve` decimal(15,2);--> statement-breakpoint
ALTER TABLE `opportunities` ADD `timeToValueMonths` int;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `investmentGate` enum('shape_value_case','research','proof_sprint','hold','advance') DEFAULT 'shape_value_case' NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `investmentGateRationale` text;