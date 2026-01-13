CREATE TABLE `application_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`job_id` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`match_score` int,
	`added_at` timestamp NOT NULL DEFAULT (now()),
	`reviewed_at` timestamp,
	CONSTRAINT `application_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`job_id` int NOT NULL,
	`status` enum('pending','applied','viewed','rejected','interview','offer','accepted') NOT NULL DEFAULT 'pending',
	`applied_at` timestamp NOT NULL DEFAULT (now()),
	`status_updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`application_method` varchar(50),
	`notes` text,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`external_id` varchar(255) NOT NULL,
	`source` varchar(50) NOT NULL,
	`title` varchar(500) NOT NULL,
	`company` varchar(255) NOT NULL,
	`location` varchar(255),
	`job_type` varchar(50),
	`salary_min` int,
	`salary_max` int,
	`salary_currency` varchar(10),
	`description` text,
	`requirements` text,
	`tags` text,
	`apply_url` varchar(1024) NOT NULL,
	`posted_date` timestamp,
	`scraped_at` timestamp NOT NULL DEFAULT (now()),
	`is_active` int NOT NULL DEFAULT 1,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobs_external_id_unique` UNIQUE(`external_id`)
);
--> statement-breakpoint
CREATE TABLE `saved_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`job_id` int NOT NULL,
	`saved_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`category` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`phone` varchar(20),
	`location` varchar(255),
	`linkedin_url` varchar(512),
	`github_url` varchar(512),
	`telegram_handle` varchar(100),
	`twitter_handle` varchar(100),
	`portfolio_url` varchar(512),
	`resume_url` varchar(1024),
	`resume_file_key` varchar(512),
	`bio` text,
	`years_of_experience` int,
	`current_salary` int,
	`expected_salary` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_experiences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`company` varchar(255) NOT NULL,
	`position` varchar(255) NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`is_current` int NOT NULL DEFAULT 0,
	`description` text,
	`location` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `work_experiences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `application_queue` ADD CONSTRAINT `application_queue_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `application_queue` ADD CONSTRAINT `application_queue_job_id_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_job_id_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_jobs` ADD CONSTRAINT `saved_jobs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_jobs` ADD CONSTRAINT `saved_jobs_job_id_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skills` ADD CONSTRAINT `skills_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_experiences` ADD CONSTRAINT `work_experiences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;