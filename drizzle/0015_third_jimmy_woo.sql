ALTER TABLE `user_profiles` ADD `gender` varchar(50);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `race` varchar(100);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `veteran_status` varchar(50);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `able_to_work_in_office` int DEFAULT 0;