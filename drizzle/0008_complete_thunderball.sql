ALTER TABLE `applications` ADD `retry_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `last_retry_at` timestamp;--> statement-breakpoint
ALTER TABLE `applications` ADD `next_retry_at` timestamp;