CREATE TABLE `request_windows` (
	`key` text PRIMARY KEY NOT NULL,
	`period` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `search_cache` (
	`query` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`expires_at` integer NOT NULL
);
