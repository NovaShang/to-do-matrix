CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
