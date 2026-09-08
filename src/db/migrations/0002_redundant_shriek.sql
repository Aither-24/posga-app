CREATE TABLE `hasil_konseling_opsi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hasil_konseling_id` integer NOT NULL,
	`opsi_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hasil_konseling_id`) REFERENCES `hasil_konseling`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`opsi_id`) REFERENCES `opsi_indikator`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hasil_konseling_opsi_unique` ON `hasil_konseling_opsi` (`hasil_konseling_id`,`opsi_id`);--> statement-breakpoint
CREATE INDEX `hasil_konseling_opsi_hasil_idx` ON `hasil_konseling_opsi` (`hasil_konseling_id`);