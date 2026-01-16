CREATE TABLE `application_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`application_id` int NOT NULL,
	`user_id` int NOT NULL,
	`job_id` int NOT NULL,
	`ats_type` varchar(50) NOT NULL,
	`apply_url` varchar(1024) NOT NULL,
	`available_fields` text,
	`filled_fields` text,
	`missed_fields` text,
	`resume_uploaded` int NOT NULL DEFAULT 0,
	`resume_selector` varchar(255),
	`resume_file_size` int,
	`fields_filled_count` int NOT NULL DEFAULT 0,
	`submit_clicked` int NOT NULL DEFAULT 0,
	`submit_selector` varchar(255),
	`proxy_used` int NOT NULL DEFAULT 0,
	`proxy_ip` varchar(50),
	`proxy_country` varchar(10),
	`success` int NOT NULL DEFAULT 0,
	`error_message` text,
	`execution_time_ms` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `application_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `application_logs` ADD CONSTRAINT `application_logs_application_id_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `application_logs` ADD CONSTRAINT `application_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `application_logs` ADD CONSTRAINT `application_logs_job_id_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE cascade ON UPDATE no action;