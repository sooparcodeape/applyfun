ALTER TABLE `user_profiles` ADD `university` varchar(255);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `sponsorship_required` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `fintech_experience` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `fintech_experience_description` text;