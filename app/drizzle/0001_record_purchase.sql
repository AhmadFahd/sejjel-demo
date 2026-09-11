ALTER TABLE `transactions` ADD `request_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_request_id_idx` ON `transactions` (`request_id`);