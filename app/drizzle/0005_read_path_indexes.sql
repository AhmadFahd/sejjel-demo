CREATE INDEX `connections_merchant_status_idx` ON `connections` (`merchant_id`,`status`);--> statement-breakpoint
CREATE INDEX `notifications_unread_idx` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `transactions_invoice_idx` ON `transactions` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `users_name_idx` ON `users` (`name`);