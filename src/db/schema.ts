import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================
// MASTER ORGANISASI
// ============================================================

export const lokasi = sqliteTable(
  "lokasi",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nama: text("nama").notNull(),
    alamat: text("alamat"),
    aktif: integer("aktif", { mode: "boolean" }).notNull().default(true),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("lokasi_nama_unique").on(table.nama)],
);

export const posyandu = sqliteTable(
  "posyandu",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    lokasiId: integer("lokasi_id")
      .notNull()
      .references(() => lokasi.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    nama: text("nama").notNull(),
    alamat: text("alamat"),
    aktif: integer("aktif", { mode: "boolean" }).notNull().default(true),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("posyandu_lokasi_nama_unique").on(table.lokasiId, table.nama),
    index("posyandu_lokasi_idx").on(table.lokasiId),
  ],
);

// ============================================================
// MASTER PESERTA
// NIK menjadi identitas utama peserta.
// Umur/kategori TIDAK disimpan permanen.
// ============================================================

export const peserta = sqliteTable(
  "peserta",
  {
    nik: text("nik").primaryKey(),

    nama: text("nama").notNull(),
    noRm: text("no_rm"),
    noTelp: text("no_telp"),

    tanggalLahir: text("tanggal_lahir").notNull(),

    jenisKelamin: text("jenis_kelamin", {
      enum: ["L", "P"],
    }).notNull(),

    alamatKtp: text("alamat_ktp"),
    rtKtp: text("rt_ktp"),
    rwKtp: text("rw_ktp"),

    alamatDomisili: text("alamat_domisili"),
    rtDomisili: text("rt_domisili"),
    rwDomisili: text("rw_domisili"),

    aktif: integer("aktif", { mode: "boolean" }).notNull().default(true),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("peserta_nama_idx").on(table.nama)],
);

// ============================================================
// RIWAYAT KEANGGOTAAN PESERTA DI POSYANDU
// Mendukung perpindahan peserta antar Posyandu.
// ============================================================

export const pesertaPosyandu = sqliteTable(
  "peserta_posyandu",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    pesertaNik: text("peserta_nik")
      .notNull()
      .references(() => peserta.nik, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    posyanduId: integer("posyandu_id")
      .notNull()
      .references(() => posyandu.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    tanggalMulai: text("tanggal_mulai").notNull(),
    tanggalSelesai: text("tanggal_selesai"),

    aktif: integer("aktif", { mode: "boolean" }).notNull().default(true),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("peserta_posyandu_peserta_idx").on(table.pesertaNik),
    index("peserta_posyandu_posyandu_idx").on(table.posyanduId),
    index("peserta_posyandu_periode_idx").on(
      table.tanggalMulai,
      table.tanggalSelesai,
    ),
  ],
);

// ============================================================
// BIODATA KHUSUS ANAK
// ============================================================

export const biodataAnak = sqliteTable("biodata_anak", {
  pesertaNik: text("peserta_nik")
    .primaryKey()
    .references(() => peserta.nik, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),

  namaIbuKandung: text("nama_ibu_kandung"),
  nikIbuKandung: text("nik_ibu_kandung"),
  anakKe: integer("anak_ke"),

  imd: integer("imd", { mode: "boolean" }),
  bblGram: integer("bbl_gram"),
  pblCm: real("pbl_cm"),

  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// BIODATA KHUSUS DEWASA / LANSIA / REPRODUKSI
// ============================================================

export const biodataDewasa = sqliteTable("biodata_dewasa", {
  pesertaNik: text("peserta_nik")
    .primaryKey()
    .references(() => peserta.nik, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),

  namaPasangan: text("nama_pasangan"),
  nikPasangan: text("nik_pasangan"),
  jumlahAnak: integer("jumlah_anak"),

  kbYangDiikuti: text("kb_yang_diikuti"),
  alasanTidakBerKb: text("alasan_tidak_ber_kb"),

  rpdHt: integer("rpd_ht", { mode: "boolean" }),
  rpdDm: integer("rpd_dm", { mode: "boolean" }),

  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// EPISODE KEHAMILAN
// ============================================================

export const episodeKehamilan = sqliteTable(
  "episode_kehamilan",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    pesertaNik: text("peserta_nik")
      .notNull()
      .references(() => peserta.nik, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    tanggalMulai: text("tanggal_mulai").notNull(),
    tanggalSelesai: text("tanggal_selesai"),

    status: text("status", {
      enum: ["aktif", "selesai", "dibatalkan"],
    })
      .notNull()
      .default("aktif"),

    bbSebelumHamilKg: real("bb_sebelum_hamil_kg"),
    tbCm: real("tb_cm"),

    hpht: text("hpht"),
    hpl: text("hpl"),
    lilaAwalCm: real("lila_awal_cm"),

    catatan: text("catatan"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("episode_kehamilan_peserta_idx").on(table.pesertaNik),
    index("episode_kehamilan_periode_idx").on(
      table.tanggalMulai,
      table.tanggalSelesai,
    ),
  ],
);

// ============================================================
// EPISODE NIFAS
// ============================================================

export const episodeNifas = sqliteTable(
  "episode_nifas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    pesertaNik: text("peserta_nik")
      .notNull()
      .references(() => peserta.nik, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    episodeKehamilanId: integer("episode_kehamilan_id").references(
      () => episodeKehamilan.id,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      },
    ),

    tanggalMulai: text("tanggal_mulai").notNull(),
    tanggalSelesai: text("tanggal_selesai"),

    tanggalMelahirkan: text("tanggal_melahirkan"),
    jamBersalin: text("jam_bersalin"),

    caraPersalinan: text("cara_persalinan", {
      enum: ["pervaginam", "sesar"],
    }),

    vitaminA: integer("vitamin_a", { mode: "boolean" }),
    asiEksklusif: integer("asi_eksklusif", { mode: "boolean" }),

    status: text("status", {
      enum: ["aktif", "selesai", "dibatalkan"],
    })
      .notNull()
      .default("aktif"),

    catatan: text("catatan"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("episode_nifas_peserta_idx").on(table.pesertaNik),
    index("episode_nifas_kehamilan_idx").on(table.episodeKehamilanId),
    index("episode_nifas_periode_idx").on(
      table.tanggalMulai,
      table.tanggalSelesai,
    ),
  ],
);

export const tindakanPersalinan = sqliteTable(
  "tindakan_persalinan",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    episodeNifasId: integer("episode_nifas_id")
      .notNull()
      .references(() => episodeNifas.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    kode: text("kode").notNull(),
    label: text("label").notNull(),
    catatan: text("catatan"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("tindakan_persalinan_episode_idx").on(table.episodeNifasId),
  ],
);

export const komplikasiPersalinan = sqliteTable(
  "komplikasi_persalinan",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    episodeNifasId: integer("episode_nifas_id")
      .notNull()
      .references(() => episodeNifas.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    kode: text("kode").notNull(),
    label: text("label").notNull(),
    catatan: text("catatan"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("komplikasi_persalinan_episode_idx").on(table.episodeNifasId),
  ],
);

// ============================================================
// SESI POSGA
// ============================================================

export const sesiPosga = sqliteTable(
  "sesi_posga",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    posyanduId: integer("posyandu_id")
      .notNull()
      .references(() => posyandu.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    tanggalPosga: text("tanggal_posga").notNull(),

    status: text("status", {
      enum: ["aktif", "selesai", "dibatalkan"],
    })
      .notNull()
      .default("aktif"),

    catatan: text("catatan"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("sesi_posga_posyandu_tanggal_unique").on(
      table.posyanduId,
      table.tanggalPosga,
    ),
    index("sesi_posga_tanggal_idx").on(table.tanggalPosga),
  ],
);

// ============================================================
// PESERTA DALAM SESI
// Kategori adalah SNAPSHOT saat sesi.
// ============================================================

export const pesertaSesiPosga = sqliteTable(
  "peserta_sesi_posga",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    sesiPosgaId: integer("sesi_posga_id")
      .notNull()
      .references(() => sesiPosga.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    pesertaNik: text("peserta_nik")
      .notNull()
      .references(() => peserta.nik, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    kategoriSaatItu: text("kategori_saat_itu", {
      enum: [
        "bayi",
        "balita",
        "prasekolah",
        "sekolah",
        "dewasa",
        "lansia",
        "ibu_hamil",
        "ibu_nifas",
      ],
    }).notNull(),

    sumberKategori: text("sumber_kategori", {
      enum: ["usia", "kehamilan", "nifas"],
    }).notNull(),

    statusPemeriksaan: text("status_pemeriksaan", {
      enum: [
        "belum_diperiksa",
        "sedang_diperiksa",
        "selesai",
        "tidak_hadir",
        "batal",
      ],
    })
      .notNull()
      .default("belum_diperiksa"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("peserta_sesi_unique").on(table.sesiPosgaId, table.pesertaNik),
    index("peserta_sesi_peserta_idx").on(table.pesertaNik),
    index("peserta_sesi_sesi_idx").on(table.sesiPosgaId),
  ],
);

// ============================================================
// MASTER INDIKATOR
// ============================================================

export const indikator = sqliteTable(
  "indikator",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    kode: text("kode").notNull(),
    nama: text("nama").notNull(),

    kelompok: text("kelompok", {
      enum: ["pemeriksaan", "skrining", "konseling"],
    }).notNull(),

    tipeInput: text("tipe_input", {
      enum: ["number", "text", "boolean", "date", "select", "multiselect"],
    }).notNull(),

    satuan: text("satuan"),

    derived: integer("derived", { mode: "boolean" }).notNull().default(false),

    deskripsi: text("deskripsi"),

    urutanDefault: integer("urutan_default").notNull().default(0),

    aktif: integer("aktif", { mode: "boolean" }).notNull().default(true),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("indikator_kode_unique").on(table.kode)],
);

export const opsiIndikator = sqliteTable(
  "opsi_indikator",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    indikatorId: integer("indikator_id")
      .notNull()
      .references(() => indikator.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    kode: text("kode").notNull(),
    label: text("label").notNull(),
    nilaiNumerik: real("nilai_numerik"),

    urutan: integer("urutan").notNull().default(0),

    aktif: integer("aktif", { mode: "boolean" }).notNull().default(true),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("opsi_indikator_kode_unique").on(table.indikatorId, table.kode),
    index("opsi_indikator_indikator_idx").on(table.indikatorId),
  ],
);

export const aturanIndikator = sqliteTable(
  "aturan_indikator",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    indikatorId: integer("indikator_id")
      .notNull()
      .references(() => indikator.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    kategori: text("kategori", {
      enum: [
        "bayi",
        "balita",
        "prasekolah",
        "sekolah",
        "dewasa",
        "lansia",
        "ibu_hamil",
        "ibu_nifas",
      ],
    }),

    frekuensi: text("frekuensi", {
      enum: [
        "setiap_sesi",
        "tahunan",
        "dua_kali_tahun",
        "sekali_seumur_hidup",
        "usia_tertentu",
        "sesuai_indikasi",
        "manual",
      ],
    })
      .notNull()
      .default("manual"),

    usiaMinBulan: integer("usia_min_bulan"),
    usiaMaxBulan: integer("usia_max_bulan"),

    jenisKelamin: text("jenis_kelamin", {
      enum: ["L", "P"],
    }),

    wajib: integer("wajib", { mode: "boolean" }).notNull().default(false),

    berdasarkanIndikasi: integer("berdasarkan_indikasi", {
      mode: "boolean",
    })
      .notNull()
      .default(false),

    aturanJson: text("aturan_json"),

    aktif: integer("aktif", { mode: "boolean" }).notNull().default(true),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("aturan_indikator_indikator_idx").on(table.indikatorId),
    index("aturan_indikator_kategori_idx").on(table.kategori),
  ],
);

// ============================================================
// HASIL PEMERIKSAAN PER SESI
// Satu baris = satu indikator untuk satu peserta-sesi.
// ============================================================

export const hasilPemeriksaan = sqliteTable(
  "hasil_pemeriksaan",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    pesertaSesiPosgaId: integer("peserta_sesi_id")
      .notNull()
      .references(() => pesertaSesiPosga.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    indikatorId: integer("indikator_id")
      .notNull()
      .references(() => indikator.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    opsiId: integer("opsi_id").references(() => opsiIndikator.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),

    nilaiNumber: real("nilai_number"),
    nilaiText: text("nilai_text"),

    nilaiBoolean: integer("nilai_boolean", {
      mode: "boolean",
    }),

    nilaiDate: text("nilai_date"),
    catatan: text("catatan"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("hasil_pemeriksaan_peserta_indikator_unique").on(
      table.pesertaSesiPosgaId,
      table.indikatorId,
    ),
    index("hasil_pemeriksaan_peserta_sesi_idx").on(table.pesertaSesiPosgaId),
    index("hasil_pemeriksaan_indikator_idx").on(table.indikatorId),
  ],
);

// Untuk indikator tipe multiselect.
export const hasilPemeriksaanOpsi = sqliteTable(
  "hasil_pemeriksaan_opsi",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    hasilPemeriksaanId: integer("hasil_pemeriksaan_id")
      .notNull()
      .references(() => hasilPemeriksaan.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    opsiId: integer("opsi_id")
      .notNull()
      .references(() => opsiIndikator.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    uniqueIndex("hasil_pemeriksaan_opsi_unique").on(
      table.hasilPemeriksaanId,
      table.opsiId,
    ),
    index("hasil_pemeriksaan_opsi_hasil_idx").on(table.hasilPemeriksaanId),
  ],
);

// ============================================================
// HASIL SKRINING
//
// Dapat berasal dari:
// - POSGA sendiri (sesiPosgaId terisi, sumber = posga)
// - tempat lain/riwayat eksternal (sesiPosgaId null, sumber = eksternal)
//
// Riwayat eksternal tetap dihitung oleh Rule Engine.
// ============================================================

export const hasilSkrining = sqliteTable(
  "hasil_skrining",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    pesertaNik: text("peserta_nik")
      .notNull()
      .references(() => peserta.nik, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    indikatorId: integer("indikator_id")
      .notNull()
      .references(() => indikator.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    sesiPosgaId: integer("sesi_posga_id").references(() => sesiPosga.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),

    tanggalSkrining: text("tanggal_skrining").notNull(),

    sumber: text("sumber", {
      enum: ["posga", "eksternal"],
    })
      .notNull()
      .default("posga"),

    // Untuk sumber eksternal.
    // Sengaja nullable karena peserta mungkin tidak mengingat fasilitasnya.
    namaFasilitas: text("nama_fasilitas"),

    opsiId: integer("opsi_id").references(() => opsiIndikator.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),

    nilaiNumber: real("nilai_number"),
    nilaiText: text("nilai_text"),

    nilaiBoolean: integer("nilai_boolean", {
      mode: "boolean",
    }),

    catatan: text("catatan"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("hasil_skrining_peserta_idx").on(table.pesertaNik),
    index("hasil_skrining_indikator_idx").on(table.indikatorId),
    index("hasil_skrining_tanggal_idx").on(table.tanggalSkrining),
    index("hasil_skrining_riwayat_idx").on(
      table.pesertaNik,
      table.indikatorId,
      table.tanggalSkrining,
    ),
  ],
);

// Untuk skrining kompleks yang memiliki komponen/detail.
export const hasilSkriningDetail = sqliteTable(
  "hasil_skrining_detail",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    hasilSkriningId: integer("hasil_skrining_id")
      .notNull()
      .references(() => hasilSkrining.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    kode: text("kode").notNull(),
    label: text("label"),

    nilaiNumber: real("nilai_number"),
    nilaiText: text("nilai_text"),

    nilaiBoolean: integer("nilai_boolean", {
      mode: "boolean",
    }),

    catatan: text("catatan"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("hasil_skrining_detail_hasil_idx").on(table.hasilSkriningId),
  ],
);

// ============================================================
// HASIL KONSELING
// Satu baris dapat mewakili satu opsi konseling.
// ============================================================

export const hasilKonseling = sqliteTable(
  "hasil_konseling",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    pesertaSesiPosgaId: integer("peserta_sesi_id")
      .notNull()
      .references(() => pesertaSesiPosga.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    indikatorId: integer("indikator_id")
      .notNull()
      .references(() => indikator.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    opsiId: integer("opsi_id").references(() => opsiIndikator.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),

    catatan: text("catatan"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("hasil_konseling_peserta_sesi_idx").on(table.pesertaSesiPosgaId),
    index("hasil_konseling_indikator_idx").on(table.indikatorId),
  ],
);

export const hasilKonselingOpsi = sqliteTable(
  "hasil_konseling_opsi",
  {
    id: integer("id").primaryKey({
      autoIncrement: true,
    }),

    hasilKonselingId: integer("hasil_konseling_id")
      .notNull()
      .references(() => hasilKonseling.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    opsiId: integer("opsi_id")
      .notNull()
      .references(() => opsiIndikator.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("hasil_konseling_opsi_unique").on(
      table.hasilKonselingId,
      table.opsiId,
    ),

    index("hasil_konseling_opsi_hasil_idx").on(table.hasilKonselingId),
  ],
);

// ============================================================
// USER / AUTH
// ============================================================

export const user = sqliteTable(
  "user",
  {
    id: integer("id").primaryKey({
      autoIncrement: true,
    }),

    username: text("username")
      .notNull(),

    passwordHash: text("password_hash")
      .notNull(),

    nama: text("nama")
      .notNull(),

    role: text("role", {
      enum: ["admin", "petugas"],
    })
      .notNull()
      .default("petugas"),

    aktif: integer("aktif", {
      mode: "boolean",
    })
      .notNull()
      .default(true),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("user_username_unique").on(
      table.username,
    ),

    index("user_role_idx").on(
      table.role,
    ),

    index("user_aktif_idx").on(
      table.aktif,
    ),
  ],
);

// ============================================================
// AUTH SESSION
//
// Token mentah tidak disimpan.
// Yang disimpan hanya SHA-256 hash dari token.
// ============================================================

export const authSession = sqliteTable(
  "auth_session",
  {
    id: integer("id").primaryKey({
      autoIncrement: true,
    }),

    userId: integer("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    tokenHash: text("token_hash")
      .notNull(),

    expiresAt: text("expires_at")
      .notNull(),

    revokedAt: text("revoked_at"),

    ipAddress: text("ip_address"),

    userAgent: text("user_agent"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("auth_session_token_hash_unique").on(
      table.tokenHash,
    ),

    index("auth_session_user_idx").on(
      table.userId,
    ),

    index("auth_session_expires_idx").on(
      table.expiresAt,
    ),
  ],
);

// ============================================================
// AUDIT LOG
//
// Menyimpan jejak perubahan penting pada sistem.
// userId nullable agar riwayat tetap dapat dipertahankan
// apabila akun user dihapus.
// ============================================================

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({
      autoIncrement: true,
    }),

    userId: integer("user_id")
      .references(() => user.id, {
        onDelete: "set null",
        onUpdate: "cascade",
      }),

    aksi: text("aksi")
      .notNull(),

    entitas: text("entitas")
      .notNull(),

    entitasId: text("entitas_id"),

    dataSebelum: text("data_sebelum"),

    dataSesudah: text("data_sesudah"),

    ipAddress: text("ip_address"),

    method: text("method"),

    path: text("path"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("audit_log_user_idx").on(
      table.userId,
    ),

    index("audit_log_entitas_idx").on(
      table.entitas,
    ),

    index("audit_log_aksi_idx").on(
      table.aksi,
    ),

    index("audit_log_created_at_idx").on(
      table.createdAt,
    ),
  ],
);

