ALTER TABLE `credit_transactions` MODIFY COLUMN `type` enum('signup_bonus','promo_code','payment','application_fee','refund','referral_bonus') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `referral_code` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `referred_by_code` varchar(20);