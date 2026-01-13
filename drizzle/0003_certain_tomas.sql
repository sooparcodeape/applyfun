CREATE TABLE `token_burns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`tx_signature` varchar(255) NOT NULL,
	`token_amount` varchar(50) NOT NULL,
	`token_price_usd` varchar(50) NOT NULL,
	`usd_value` int NOT NULL,
	`credits_granted` int NOT NULL,
	`tax_rate` int NOT NULL,
	`status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`verified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `token_burns_id` PRIMARY KEY(`id`),
	CONSTRAINT `token_burns_tx_signature_unique` UNIQUE(`tx_signature`)
);
