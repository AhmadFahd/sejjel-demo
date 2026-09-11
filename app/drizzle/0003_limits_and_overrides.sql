CREATE TABLE `term_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`connection_id` text,
	`changed_by_user_id` text NOT NULL,
	`limit_before_halalas` integer,
	`limit_after_halalas` integer,
	`term_before_days` integer,
	`term_after_days` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`connection_id`) REFERENCES `connections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `term_changes_merchant_idx` ON `term_changes` (`merchant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `term_changes_connection_idx` ON `term_changes` (`connection_id`,`created_at`);