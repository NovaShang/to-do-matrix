CREATE TABLE `api_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`label` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_used` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`importance` real DEFAULT 0 NOT NULL,
	`effort` real DEFAULT 1 NOT NULL,
	`due_date` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`parent_id` integer,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
