DROP INDEX `connections_customer_idx`;--> statement-breakpoint
CREATE INDEX `connections_customer_status_idx` ON `connections` (`customer_user_id`,`status`);--> statement-breakpoint
DROP INDEX `transactions_status_idx`;--> statement-breakpoint
CREATE INDEX `transactions_connection_status_idx` ON `transactions` (`connection_id`,`status`);--> statement-breakpoint
CREATE INDEX `merchants_name_idx` ON `merchants` (`name`);