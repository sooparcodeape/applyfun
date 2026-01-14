CREATE TABLE `educations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`institution` varchar(255) NOT NULL,
	`degree` varchar(255),
	`field_of_study` varchar(255),
	`start_date` timestamp,
	`end_date` timestamp,
	`is_current` int NOT NULL DEFAULT 0,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `educations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `educations` ADD CONSTRAINT `educations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;