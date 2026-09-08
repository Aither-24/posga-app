PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_hasil_konseling` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`peserta_sesi_id` integer NOT NULL,
	`indikator_id` integer NOT NULL,
	`opsi_id` integer,
	`catatan` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`peserta_sesi_id`) REFERENCES `peserta_sesi_posga`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`indikator_id`) REFERENCES `indikator`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`opsi_id`) REFERENCES `opsi_indikator`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_hasil_konseling`("id", "peserta_sesi_id", "indikator_id", "opsi_id", "catatan", "created_at", "updated_at") SELECT "id", "peserta_sesi_id", "indikator_id", "opsi_id", "catatan", "created_at", "updated_at" FROM `hasil_konseling`;--> statement-breakpoint
DROP TABLE `hasil_konseling`;--> statement-breakpoint
ALTER TABLE `__new_hasil_konseling` RENAME TO `hasil_konseling`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `hasil_konseling_peserta_sesi_idx` ON `hasil_konseling` (`peserta_sesi_id`);--> statement-breakpoint
CREATE INDEX `hasil_konseling_indikator_idx` ON `hasil_konseling` (`indikator_id`);--> statement-breakpoint
CREATE TABLE `__new_hasil_pemeriksaan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`peserta_sesi_id` integer NOT NULL,
	`indikator_id` integer NOT NULL,
	`opsi_id` integer,
	`nilai_number` real,
	`nilai_text` text,
	`nilai_boolean` integer,
	`nilai_date` text,
	`catatan` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`peserta_sesi_id`) REFERENCES `peserta_sesi_posga`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`indikator_id`) REFERENCES `indikator`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`opsi_id`) REFERENCES `opsi_indikator`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_hasil_pemeriksaan`("id", "peserta_sesi_id", "indikator_id", "opsi_id", "nilai_number", "nilai_text", "nilai_boolean", "nilai_date", "catatan", "created_at", "updated_at") SELECT "id", "peserta_sesi_id", "indikator_id", "opsi_id", "nilai_number", "nilai_text", "nilai_boolean", "nilai_date", "catatan", "created_at", "updated_at" FROM `hasil_pemeriksaan`;--> statement-breakpoint
DROP TABLE `hasil_pemeriksaan`;--> statement-breakpoint
ALTER TABLE `__new_hasil_pemeriksaan` RENAME TO `hasil_pemeriksaan`;--> statement-breakpoint
CREATE UNIQUE INDEX `hasil_pemeriksaan_peserta_indikator_unique` ON `hasil_pemeriksaan` (`peserta_sesi_id`,`indikator_id`);--> statement-breakpoint
CREATE INDEX `hasil_pemeriksaan_peserta_sesi_idx` ON `hasil_pemeriksaan` (`peserta_sesi_id`);--> statement-breakpoint
CREATE INDEX `hasil_pemeriksaan_indikator_idx` ON `hasil_pemeriksaan` (`indikator_id`);--> statement-breakpoint
CREATE TABLE `__new_biodata_anak` (
	`peserta_nik` text PRIMARY KEY NOT NULL,
	`nama_ibu_kandung` text,
	`nik_ibu_kandung` text,
	`anak_ke` integer,
	`imd` integer,
	`bbl_gram` integer,
	`pbl_cm` real,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`peserta_nik`) REFERENCES `peserta`(`nik`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_biodata_anak`("peserta_nik", "nama_ibu_kandung", "nik_ibu_kandung", "anak_ke", "imd", "bbl_gram", "pbl_cm", "updated_at") SELECT "peserta_nik", "nama_ibu_kandung", "nik_ibu_kandung", "anak_ke", "imd", "bbl_gram", "pbl_cm", "updated_at" FROM `biodata_anak`;--> statement-breakpoint
DROP TABLE `biodata_anak`;--> statement-breakpoint
ALTER TABLE `__new_biodata_anak` RENAME TO `biodata_anak`;--> statement-breakpoint
CREATE TABLE `__new_biodata_dewasa` (
	`peserta_nik` text PRIMARY KEY NOT NULL,
	`nama_pasangan` text,
	`nik_pasangan` text,
	`jumlah_anak` integer,
	`kb_yang_diikuti` text,
	`alasan_tidak_ber_kb` text,
	`rpd_ht` integer,
	`rpd_dm` integer,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`peserta_nik`) REFERENCES `peserta`(`nik`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_biodata_dewasa`("peserta_nik", "nama_pasangan", "nik_pasangan", "jumlah_anak", "kb_yang_diikuti", "alasan_tidak_ber_kb", "rpd_ht", "rpd_dm", "updated_at") SELECT "peserta_nik", "nama_pasangan", "nik_pasangan", "jumlah_anak", "kb_yang_diikuti", "alasan_tidak_ber_kb", "rpd_ht", "rpd_dm", "updated_at" FROM `biodata_dewasa`;--> statement-breakpoint
DROP TABLE `biodata_dewasa`;--> statement-breakpoint
ALTER TABLE `__new_biodata_dewasa` RENAME TO `biodata_dewasa`;--> statement-breakpoint
CREATE TABLE `__new_hasil_skrining` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`peserta_nik` text NOT NULL,
	`indikator_id` integer NOT NULL,
	`sesi_posga_id` integer,
	`tanggal_skrining` text NOT NULL,
	`sumber` text DEFAULT 'posga' NOT NULL,
	`nama_fasilitas` text,
	`opsi_id` integer,
	`nilai_number` real,
	`nilai_text` text,
	`nilai_boolean` integer,
	`catatan` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`peserta_nik`) REFERENCES `peserta`(`nik`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`indikator_id`) REFERENCES `indikator`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`sesi_posga_id`) REFERENCES `sesi_posga`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`opsi_id`) REFERENCES `opsi_indikator`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_hasil_skrining`("id", "peserta_nik", "indikator_id", "sesi_posga_id", "tanggal_skrining", "sumber", "nama_fasilitas", "opsi_id", "nilai_number", "nilai_text", "nilai_boolean", "catatan", "created_at", "updated_at") SELECT "id", "peserta_nik", "indikator_id", "sesi_posga_id", "tanggal_skrining", "sumber", "nama_fasilitas", "opsi_id", "nilai_number", "nilai_text", "nilai_boolean", "catatan", "created_at", "updated_at" FROM `hasil_skrining`;--> statement-breakpoint
DROP TABLE `hasil_skrining`;--> statement-breakpoint
ALTER TABLE `__new_hasil_skrining` RENAME TO `hasil_skrining`;--> statement-breakpoint
CREATE INDEX `hasil_skrining_peserta_idx` ON `hasil_skrining` (`peserta_nik`);--> statement-breakpoint
CREATE INDEX `hasil_skrining_indikator_idx` ON `hasil_skrining` (`indikator_id`);--> statement-breakpoint
CREATE INDEX `hasil_skrining_tanggal_idx` ON `hasil_skrining` (`tanggal_skrining`);--> statement-breakpoint
CREATE INDEX `hasil_skrining_riwayat_idx` ON `hasil_skrining` (`peserta_nik`,`indikator_id`,`tanggal_skrining`);--> statement-breakpoint
DROP INDEX `hasil_pemeriksaan_opsi_uq`;--> statement-breakpoint
CREATE UNIQUE INDEX `hasil_pemeriksaan_opsi_unique` ON `hasil_pemeriksaan_opsi` (`hasil_pemeriksaan_id`,`opsi_id`);--> statement-breakpoint
CREATE INDEX `hasil_pemeriksaan_opsi_hasil_idx` ON `hasil_pemeriksaan_opsi` (`hasil_pemeriksaan_id`);--> statement-breakpoint
DROP INDEX `hasil_skrining_detail_uq`;--> statement-breakpoint
ALTER TABLE `hasil_skrining_detail` ADD `kode` text NOT NULL;--> statement-breakpoint
ALTER TABLE `hasil_skrining_detail` ADD `label` text;--> statement-breakpoint
ALTER TABLE `hasil_skrining_detail` ADD `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
CREATE INDEX `hasil_skrining_detail_hasil_idx` ON `hasil_skrining_detail` (`hasil_skrining_id`);--> statement-breakpoint
ALTER TABLE `hasil_skrining_detail` DROP COLUMN `kode_komponen`;--> statement-breakpoint
ALTER TABLE `hasil_skrining_detail` DROP COLUMN `nama_komponen`;--> statement-breakpoint
ALTER TABLE `hasil_skrining_detail` DROP COLUMN `nilai_date`;--> statement-breakpoint
DROP INDEX `indikator_kode_uq`;--> statement-breakpoint
DROP INDEX `indikator_kelompok_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `indikator_kode_unique` ON `indikator` (`kode`);--> statement-breakpoint
DROP INDEX `komplikasi_persalinan_uq`;--> statement-breakpoint
ALTER TABLE `komplikasi_persalinan` ADD `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
CREATE INDEX `komplikasi_persalinan_episode_idx` ON `komplikasi_persalinan` (`episode_nifas_id`);--> statement-breakpoint
DROP INDEX `opsi_indikator_uq`;--> statement-breakpoint
ALTER TABLE `opsi_indikator` ADD `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `opsi_indikator` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `opsi_indikator_kode_unique` ON `opsi_indikator` (`indikator_id`,`kode`);--> statement-breakpoint
DROP INDEX `peserta_sesi_uq`;--> statement-breakpoint
DROP INDEX `peserta_sesi_kategori_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `peserta_sesi_unique` ON `peserta_sesi_posga` (`sesi_posga_id`,`peserta_nik`);--> statement-breakpoint
CREATE INDEX `peserta_sesi_sesi_idx` ON `peserta_sesi_posga` (`sesi_posga_id`);--> statement-breakpoint
DROP INDEX `posyandu_lokasi_nama_uq`;--> statement-breakpoint
CREATE UNIQUE INDEX `posyandu_lokasi_nama_unique` ON `posyandu` (`lokasi_id`,`nama`);--> statement-breakpoint
CREATE TABLE `__new_sesi_posga` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`posyandu_id` integer NOT NULL,
	`tanggal_posga` text NOT NULL,
	`status` text DEFAULT 'aktif' NOT NULL,
	`catatan` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`posyandu_id`) REFERENCES `posyandu`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_sesi_posga`("id", "posyandu_id", "tanggal_posga", "status", "catatan", "created_at", "updated_at") SELECT "id", "posyandu_id", "tanggal_posga", "status", "catatan", "created_at", "updated_at" FROM `sesi_posga`;--> statement-breakpoint
DROP TABLE `sesi_posga`;--> statement-breakpoint
ALTER TABLE `__new_sesi_posga` RENAME TO `sesi_posga`;--> statement-breakpoint
CREATE UNIQUE INDEX `sesi_posga_posyandu_tanggal_unique` ON `sesi_posga` (`posyandu_id`,`tanggal_posga`);--> statement-breakpoint
CREATE INDEX `sesi_posga_tanggal_idx` ON `sesi_posga` (`tanggal_posga`);--> statement-breakpoint
DROP INDEX `tindakan_persalinan_uq`;--> statement-breakpoint
ALTER TABLE `tindakan_persalinan` ADD `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
CREATE INDEX `tindakan_persalinan_episode_idx` ON `tindakan_persalinan` (`episode_nifas_id`);--> statement-breakpoint
CREATE TABLE `__new_episode_nifas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`peserta_nik` text NOT NULL,
	`episode_kehamilan_id` integer,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text,
	`tanggal_melahirkan` text,
	`jam_bersalin` text,
	`cara_persalinan` text,
	`vitamin_a` integer,
	`asi_eksklusif` integer,
	`status` text DEFAULT 'aktif' NOT NULL,
	`catatan` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`peserta_nik`) REFERENCES `peserta`(`nik`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`episode_kehamilan_id`) REFERENCES `episode_kehamilan`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_episode_nifas`("id", "peserta_nik", "episode_kehamilan_id", "tanggal_mulai", "tanggal_selesai", "tanggal_melahirkan", "jam_bersalin", "cara_persalinan", "vitamin_a", "asi_eksklusif", "status", "catatan", "created_at", "updated_at") SELECT "id", "peserta_nik", "episode_kehamilan_id", "tanggal_mulai", "tanggal_selesai", "tanggal_melahirkan", "jam_bersalin", "cara_persalinan", "vitamin_a", "asi_eksklusif", "status", "catatan", "created_at", "updated_at" FROM `episode_nifas`;--> statement-breakpoint
DROP TABLE `episode_nifas`;--> statement-breakpoint
ALTER TABLE `__new_episode_nifas` RENAME TO `episode_nifas`;--> statement-breakpoint
CREATE INDEX `episode_nifas_peserta_idx` ON `episode_nifas` (`peserta_nik`);--> statement-breakpoint
CREATE INDEX `episode_nifas_kehamilan_idx` ON `episode_nifas` (`episode_kehamilan_id`);--> statement-breakpoint
CREATE INDEX `episode_nifas_periode_idx` ON `episode_nifas` (`tanggal_mulai`,`tanggal_selesai`);--> statement-breakpoint
ALTER TABLE `aturan_indikator` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
CREATE INDEX `episode_kehamilan_periode_idx` ON `episode_kehamilan` (`tanggal_mulai`,`tanggal_selesai`);--> statement-breakpoint
CREATE UNIQUE INDEX `lokasi_nama_unique` ON `lokasi` (`nama`);--> statement-breakpoint
CREATE INDEX `peserta_nama_idx` ON `peserta` (`nama`);--> statement-breakpoint
CREATE INDEX `peserta_posyandu_periode_idx` ON `peserta_posyandu` (`tanggal_mulai`,`tanggal_selesai`);