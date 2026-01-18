CREATE TABLE `generated_cover_letters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`job_id` int,
	`application_id` int,
	`content` text NOT NULL,
	`achievement_ids` text,
	`user_rating` int,
	`got_response` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generated_cover_letters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skills_with_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`category` varchar(50),
	`proficiency_level` enum('beginner','intermediate','advanced','expert') NOT NULL,
	`years_used` int,
	`last_used` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skills_with_levels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `star_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`situation` text NOT NULL,
	`task` text NOT NULL,
	`action` text NOT NULL,
	`result` text NOT NULL,
	`metric_value` varchar(100),
	`metric_type` varchar(50),
	`category` varchar(100),
	`skills` text,
	`work_experience_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `star_achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `writing_samples` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('linkedin_post','blog_article','cover_letter','email','other') NOT NULL,
	`title` varchar(255),
	`content` text NOT NULL,
	`source_url` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `writing_samples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `generated_cover_letters` ADD CONSTRAINT `generated_cover_letters_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_cover_letters` ADD CONSTRAINT `generated_cover_letters_job_id_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_cover_letters` ADD CONSTRAINT `generated_cover_letters_application_id_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skills_with_levels` ADD CONSTRAINT `skills_with_levels_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `star_achievements` ADD CONSTRAINT `star_achievements_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `star_achievements` ADD CONSTRAINT `star_achievements_work_experience_id_work_experiences_id_fk` FOREIGN KEY (`work_experience_id`) REFERENCES `work_experiences`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `writing_samples` ADD CONSTRAINT `writing_samples_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;