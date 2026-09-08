CREATE TABLE `aturan_indikator` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`indikator_id` integer NOT NULL,
	`kategori` text,
	`frekuensi` text DEFAULT 'manual' NOT NULL,
	`usia_min_bulan` integer,
	`usia_max_bulan` integer,
	`jenis_kelamin` text,
	`wajib` integer DEFAULT false NOT NULL,
	`berdasarkan_indikasi` integer DEFAULT false NOT NULL,
	`aturan_json` text,
	`aktif` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`indikator_id`) REFERENCES `indikator`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `aturan_indikator_indikator_idx` ON `aturan_indikator` (`indikator_id`);--> statement-breakpoint
CREATE INDEX `aturan_indikator_kategori_idx` ON `aturan_indikator` (`kategori`);--> statement-breakpoint
CREATE TABLE `biodata_anak` (
	`peserta_nik` text PRIMARY KEY NOT NULL,
	`nama_ibu_kandung` text,
	`nik_ibu_kandung` text,
	`anak_ke` integer,
	`imd` integer,
	`bbl_gram` integer,
	`pbl_cm` real,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`peserta_nik`) REFERENCES `peserta`(`nik`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `biodata_dewasa` (
	`peserta_nik` text PRIMARY KEY NOT NULL,
	`nama_pasangan` text,
	`nik_pasangan` text,
	`jumlah_anak` integer,
	`kb_yang_diikuti` text,
	`alasan_tidak_ber_kb` text,
	`rpd_ht` integer,
	`rpd_dm` integer,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`peserta_nik`) REFERENCES `peserta`(`nik`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `episode_kehamilan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`peserta_nik` text NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text,
	`status` text DEFAULT 'aktif' NOT NULL,
	`bb_sebelum_hamil_kg` real,
	`tb_cm` real,
	`hpht` text,
	`hpl` text,
	`lila_awal_cm` real,
	`catatan` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`peserta_nik`) REFERENCES `peserta`(`nik`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `episode_kehamilan_peserta_idx` ON `episode_kehamilan` (`peserta_nik`);--> statement-breakpoint
CREATE TABLE `episode_nifas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`peserta_nik` text NOT NULL,
	`episode_kehamilan_id` integer,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text,
	`tanggal_melahirkan` text NOT NULL,
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
CREATE INDEX `episode_nifas_peserta_idx` ON `episode_nifas` (`peserta_nik`);--> statement-breakpoint
CREATE TABLE `hasil_konseling` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`peserta_sesi_posga_id` integer NOT NULL,
	`indikator_id` integer NOT NULL,
	`opsi_id` integer,
	`catatan` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`peserta_sesi_posga_id`) REFERENCES `peserta_sesi_posga`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`indikator_id`) REFERENCES `indikator`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`opsi_id`) REFERENCES `opsi_indikator`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `hasil_konseling_peserta_sesi_idx` ON `hasil_konseling` (`peserta_sesi_posga_id`);--> statement-breakpoint
CREATE TABLE `hasil_pemeriksaan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`peserta_sesi_posga_id` integer NOT NULL,
	`indikator_id` integer NOT NULL,
	`opsi_id` integer,
	`nilai_number` real,
	`nilai_text` text,
	`nilai_boolean` integer,
	`nilai_date` text,
	`catatan` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`peserta_sesi_posga_id`) REFERENCES `peserta_sesi_posga`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`indikator_id`) REFERENCES `indikator`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`opsi_id`) REFERENCES `opsi_indikator`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hasil_pemeriksaan_indikator_uq` ON `hasil_pemeriksaan` (`peserta_sesi_posga_id`,`indikator_id`);--> statement-breakpoint
CREATE INDEX `hasil_pemeriksaan_sesi_idx` ON `hasil_pemeriksaan` (`peserta_sesi_posga_id`);--> statement-breakpoint
CREATE TABLE `hasil_pemeriksaan_opsi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hasil_pemeriksaan_id` integer NOT NULL,
	`opsi_id` integer NOT NULL,
	FOREIGN KEY (`hasil_pemeriksaan_id`) REFERENCES `hasil_pemeriksaan`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`opsi_id`) REFERENCES `opsi_indikator`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hasil_pemeriksaan_opsi_uq` ON `hasil_pemeriksaan_opsi` (`hasil_pemeriksaan_id`,`opsi_id`);--> statement-breakpoint
CREATE TABLE `hasil_skrining` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`peserta_nik` text NOT NULL,
	`indikator_id` integer NOT NULL,
	`sesi_posga_id` integer,
	`tanggal_skrining` text NOT NULL,
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
	FOREIGN KEY (`opsi_id`) REFERENCES `opsi_indikator`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `hasil_skrining_peserta_idx` ON `hasil_skrining` (`peserta_nik`);--> statement-breakpoint
CREATE INDEX `hasil_skrining_indikator_idx` ON `hasil_skrining` (`indikator_id`);--> statement-breakpoint
CREATE INDEX `hasil_skrining_tanggal_idx` ON `hasil_skrining` (`tanggal_skrining`);--> statement-breakpoint
CREATE TABLE `hasil_skrining_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hasil_skrining_id` integer NOT NULL,
	`kode_komponen` text NOT NULL,
	`nama_komponen` text NOT NULL,
	`nilai_number` real,
	`nilai_text` text,
	`nilai_boolean` integer,
	`nilai_date` text,
	`catatan` text,
	FOREIGN KEY (`hasil_skrining_id`) REFERENCES `hasil_skrining`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hasil_skrining_detail_uq` ON `hasil_skrining_detail` (`hasil_skrining_id`,`kode_komponen`);--> statement-breakpoint
CREATE TABLE `indikator` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode` text NOT NULL,
	`nama` text NOT NULL,
	`kelompok` text NOT NULL,
	`tipe_input` text NOT NULL,
	`satuan` text,
	`derived` integer DEFAULT false NOT NULL,
	`deskripsi` text,
	`urutan_default` integer DEFAULT 0 NOT NULL,
	`aktif` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `indikator_kode_uq` ON `indikator` (`kode`);--> statement-breakpoint
CREATE INDEX `indikator_kelompok_idx` ON `indikator` (`kelompok`);--> statement-breakpoint
CREATE TABLE `komplikasi_persalinan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`episode_nifas_id` integer NOT NULL,
	`kode` text NOT NULL,
	`label` text NOT NULL,
	`catatan` text,
	FOREIGN KEY (`episode_nifas_id`) REFERENCES `episode_nifas`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `komplikasi_persalinan_uq` ON `komplikasi_persalinan` (`episode_nifas_id`,`kode`);--> statement-breakpoint
CREATE TABLE `lokasi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`alamat` text,
	`aktif` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opsi_indikator` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`indikator_id` integer NOT NULL,
	`kode` text NOT NULL,
	`label` text NOT NULL,
	`nilai_numerik` real,
	`urutan` integer DEFAULT 0 NOT NULL,
	`aktif` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`indikator_id`) REFERENCES `indikator`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `opsi_indikator_uq` ON `opsi_indikator` (`indikator_id`,`kode`);--> statement-breakpoint
CREATE INDEX `opsi_indikator_indikator_idx` ON `opsi_indikator` (`indikator_id`);--> statement-breakpoint
CREATE TABLE `peserta` (
	`nik` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`no_rm` text,
	`no_telp` text,
	`tanggal_lahir` text NOT NULL,
	`jenis_kelamin` text NOT NULL,
	`alamat_ktp` text,
	`rt_ktp` text,
	`rw_ktp` text,
	`alamat_domisili` text,
	`rt_domisili` text,
	`rw_domisili` text,
	`aktif` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `peserta_posyandu` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`peserta_nik` text NOT NULL,
	`posyandu_id` integer NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text,
	`aktif` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`peserta_nik`) REFERENCES `peserta`(`nik`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`posyandu_id`) REFERENCES `posyandu`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `peserta_posyandu_peserta_idx` ON `peserta_posyandu` (`peserta_nik`);--> statement-breakpoint
CREATE INDEX `peserta_posyandu_posyandu_idx` ON `peserta_posyandu` (`posyandu_id`);--> statement-breakpoint
CREATE TABLE `peserta_sesi_posga` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sesi_posga_id` integer NOT NULL,
	`peserta_nik` text NOT NULL,
	`kategori_saat_itu` text NOT NULL,
	`sumber_kategori` text NOT NULL,
	`status_pemeriksaan` text DEFAULT 'belum_diperiksa' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sesi_posga_id`) REFERENCES `sesi_posga`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`peserta_nik`) REFERENCES `peserta`(`nik`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `peserta_sesi_uq` ON `peserta_sesi_posga` (`sesi_posga_id`,`peserta_nik`);--> statement-breakpoint
CREATE INDEX `peserta_sesi_peserta_idx` ON `peserta_sesi_posga` (`peserta_nik`);--> statement-breakpoint
CREATE INDEX `peserta_sesi_kategori_idx` ON `peserta_sesi_posga` (`kategori_saat_itu`);--> statement-breakpoint
CREATE TABLE `posyandu` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lokasi_id` integer NOT NULL,
	`nama` text NOT NULL,
	`alamat` text,
	`aktif` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`lokasi_id`) REFERENCES `lokasi`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `posyandu_lokasi_idx` ON `posyandu` (`lokasi_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `posyandu_lokasi_nama_uq` ON `posyandu` (`lokasi_id`,`nama`);--> statement-breakpoint
CREATE TABLE `sesi_posga` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`posyandu_id` integer NOT NULL,
	`tanggal_posga` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`catatan` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`posyandu_id`) REFERENCES `posyandu`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sesi_posga_posyandu_tanggal_uq` ON `sesi_posga` (`posyandu_id`,`tanggal_posga`);--> statement-breakpoint
CREATE INDEX `sesi_posga_tanggal_idx` ON `sesi_posga` (`tanggal_posga`);--> statement-breakpoint
CREATE TABLE `tindakan_persalinan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`episode_nifas_id` integer NOT NULL,
	`kode` text NOT NULL,
	`label` text NOT NULL,
	`catatan` text,
	FOREIGN KEY (`episode_nifas_id`) REFERENCES `episode_nifas`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tindakan_persalinan_uq` ON `tindakan_persalinan` (`episode_nifas_id`,`kode`);