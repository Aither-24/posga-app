import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { db } from "../db/index.js";

import {
  episodeKehamilan,
  episodeNifas,
  hasilKonseling,
  hasilPemeriksaan,
  hasilSkrining,
  peserta,
  pesertaPosyandu,
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
} from "../db/schema.js";

import { tentukanKategoriUsia, type KategoriUsia } from "./kategori.js";

// ============================================================
// TYPE
// ============================================================

export type KategoriPemeriksaan = KategoriUsia | "ibu_hamil" | "ibu_nifas";

export type SumberKategori = "usia" | "kehamilan" | "nifas";

export interface HasilKategoriPemeriksaan {
  kategori: KategoriPemeriksaan;

  sumberKategori: SumberKategori;

  umur: {
    tahun: number;
    bulan: number;
    hari: number;
  };
}

export interface BuatSesiPosgaInput {
  posyanduId: number;

  tanggalPosga: string;

  catatan?: string;
}

export interface UpdateSesiPosgaInput {
  tanggalPosga?: string;

  catatan?: string | null;
}

// ============================================================
// HELPER VALIDASI
// ============================================================

/**
 * Memastikan tanggal benar-benar valid dan menggunakan format:
 *
 * YYYY-MM-DD
 *
 * Contoh valid:
 * 2026-09-03
 *
 * Contoh tidak valid:
 * 03-09-2026
 * 2026-02-30
 * 2026-13-01
 */
function validasiTanggalISO(tanggal: string) {
  const pola = /^(\d{4})-(\d{2})-(\d{2})$/;

  const cocok = pola.exec(tanggal);

  if (!cocok) {
    throw new Error("Tanggal harus menggunakan format YYYY-MM-DD.");
  }

  const tahun = Number(cocok[1]);

  const bulan = Number(cocok[2]);

  const hari = Number(cocok[3]);

  const date = new Date(Date.UTC(tahun, bulan - 1, hari));

  const valid =
    date.getUTCFullYear() === tahun &&
    date.getUTCMonth() === bulan - 1 &&
    date.getUTCDate() === hari;

  if (!valid) {
    throw new Error("Tanggal tidak valid.");
  }
}

// ============================================================
// READ POSYANDU
// ============================================================

async function ambilPosyanduById(id: number) {
  const hasil = await db
    .select()
    .from(posyandu)
    .where(eq(posyandu.id, id))
    .limit(1);

  return hasil[0] ?? null;
}

// ============================================================
// AMBIL PESERTA POSYANDU BERDASARKAN TANGGAL
// ============================================================

/**
 * Mengambil peserta yang keanggotaannya berlaku
 * pada tanggal sesi.
 *
 * Tidak sekadar membaca pesertaPosyandu.aktif,
 * karena tanggal historis tetap perlu dihormati.
 *
 * Contoh:
 *
 * Posyandu A:
 * 2026-01-01 s.d. 2026-06-30
 *
 * Posyandu B:
 * mulai 2026-07-01
 *
 * Sesi 2026-05-01 harus tetap mengambil
 * peserta tersebut dari Posyandu A.
 */
export async function ambilPesertaPosyanduPadaTanggal(
  posyanduId: number,
  tanggalPosga: string,
) {
  validasiTanggalISO(tanggalPosga);

  return db
    .select({
      pesertaNik: peserta.nik,

      nama: peserta.nama,

      tanggalLahir: peserta.tanggalLahir,

      jenisKelamin: peserta.jenisKelamin,

      keanggotaanId: pesertaPosyandu.id,

      tanggalMulai: pesertaPosyandu.tanggalMulai,

      tanggalSelesai: pesertaPosyandu.tanggalSelesai,
    })
    .from(pesertaPosyandu)
    .innerJoin(peserta, eq(peserta.nik, pesertaPosyandu.pesertaNik))
    .where(
      and(
        eq(pesertaPosyandu.posyanduId, posyanduId),

        eq(peserta.aktif, true),

        lte(pesertaPosyandu.tanggalMulai, tanggalPosga),

        or(
          isNull(pesertaPosyandu.tanggalSelesai),

          gte(pesertaPosyandu.tanggalSelesai, tanggalPosga),
        ),
      ),
    )
    .orderBy(asc(peserta.nama));
}

// ============================================================
// KLASIFIKASI PEMERIKSAAN
// ============================================================

/**
 * Prioritas kategori:
 *
 * 1. Ibu Nifas
 * 2. Ibu Hamil
 * 3. Kategori berdasarkan usia
 *
 * Kehamilan dan nifas merupakan kondisi/episode,
 * bukan kelompok umur permanen.
 */
export async function tentukanKategoriPemeriksaan(
  pesertaNik: string,
  tanggalLahir: string,
  jenisKelamin: "L" | "P",
  tanggalPosga: string,
): Promise<HasilKategoriPemeriksaan> {
  validasiTanggalISO(tanggalPosga);

  const klasifikasiUsia = tentukanKategoriUsia(tanggalLahir, tanggalPosga);

  // ----------------------------------------------------------
  // PESERTA LAKI-LAKI
  // ----------------------------------------------------------

  if (jenisKelamin === "L") {
    return {
      kategori: klasifikasiUsia.kategori,

      sumberKategori: "usia",

      umur: klasifikasiUsia.umur,
    };
  }

  // ----------------------------------------------------------
  // CEK NIFAS
  // ----------------------------------------------------------

  const nifas = await db
    .select({
      id: episodeNifas.id,
    })
    .from(episodeNifas)
    .where(
      and(
        eq(episodeNifas.pesertaNik, pesertaNik),

        ne(episodeNifas.status, "dibatalkan"),

        lte(episodeNifas.tanggalMulai, tanggalPosga),

        gte(
          sql<string>`date(coalesce(${episodeNifas.tanggalMelahirkan}, ${episodeNifas.tanggalMulai}), '+45 day')`,
          tanggalPosga,
        ),

        or(
          isNull(episodeNifas.tanggalSelesai),

          gte(episodeNifas.tanggalSelesai, tanggalPosga),
        ),
      ),
    )
    .limit(1);

  if (nifas[0]) {
    return {
      kategori: "ibu_nifas",

      sumberKategori: "nifas",

      umur: klasifikasiUsia.umur,
    };
  }

  // ----------------------------------------------------------
  // CEK KEHAMILAN
  // ----------------------------------------------------------

  const hamil = await db
    .select({
      id: episodeKehamilan.id,
    })
    .from(episodeKehamilan)
    .where(
      and(
        eq(episodeKehamilan.pesertaNik, pesertaNik),

        ne(episodeKehamilan.status, "dibatalkan"),

        lte(episodeKehamilan.tanggalMulai, tanggalPosga),

        or(
          isNull(episodeKehamilan.tanggalSelesai),

          gte(episodeKehamilan.tanggalSelesai, tanggalPosga),
        ),
      ),
    )
    .limit(1);

  if (hamil[0]) {
    return {
      kategori: "ibu_hamil",

      sumberKategori: "kehamilan",

      umur: klasifikasiUsia.umur,
    };
  }

  // ----------------------------------------------------------
  // KATEGORI BERDASARKAN USIA
  // ----------------------------------------------------------

  return {
    kategori: klasifikasiUsia.kategori,

    sumberKategori: "usia",

    umur: klasifikasiUsia.umur,
  };
}

// ============================================================
// READ SESI BY ID
// ============================================================

export async function ambilSesiPosgaById(id: number) {
  const hasil = await db
    .select()
    .from(sesiPosga)
    .where(eq(sesiPosga.id, id))
    .limit(1);

  return hasil[0] ?? null;
}

// ============================================================
// READ SESI BERDASARKAN POSYANDU + TANGGAL
// ============================================================

export async function ambilSesiByTanggal(
  posyanduId: number,
  tanggalPosga: string,
) {
  validasiTanggalISO(tanggalPosga);

  const hasil = await db
    .select()
    .from(sesiPosga)
    .where(
      and(
        eq(sesiPosga.posyanduId, posyanduId),

        eq(sesiPosga.tanggalPosga, tanggalPosga),
      ),
    )
    .limit(1);

  return hasil[0] ?? null;
}

// ============================================================
// READ SEMUA SESI POSYANDU
// ============================================================

export async function ambilSesiByPosyandu(posyanduId: number) {
  return db
    .select()
    .from(sesiPosga)
    .where(eq(sesiPosga.posyanduId, posyanduId))
    .orderBy(asc(sesiPosga.tanggalPosga));
}

// ============================================================
// READ PESERTA DALAM SESI
// ============================================================

export async function ambilPesertaSesi(sesiPosgaId: number) {
  return db
    .select({
      pesertaSesiId: pesertaSesiPosga.id,

      pesertaNik: pesertaSesiPosga.pesertaNik,

      nama: peserta.nama,

      tanggalLahir: peserta.tanggalLahir,

      jenisKelamin: peserta.jenisKelamin,

      kategori: pesertaSesiPosga.kategoriSaatItu,

      sumberKategori: pesertaSesiPosga.sumberKategori,

      statusPemeriksaan: pesertaSesiPosga.statusPemeriksaan,
    })
    .from(pesertaSesiPosga)
    .innerJoin(peserta, eq(peserta.nik, pesertaSesiPosga.pesertaNik))
    .where(eq(pesertaSesiPosga.sesiPosgaId, sesiPosgaId))
    .orderBy(asc(peserta.nama));
}

// ============================================================
// CEK DATA / AKTIVITAS SESI
// ============================================================

/**
 * Digunakan untuk menentukan apakah operasi sensitif
 * seperti:
 *
 * - ubah tanggal
 * - batalkan sesi
 * - hapus sesi
 *
 * masih diperbolehkan.
 */
async function sesiMemilikiDataKlinis(sesiPosgaId: number) {
  const pesertaDalamSesi = await db
    .select({
      id: pesertaSesiPosga.id,

      status: pesertaSesiPosga.statusPemeriksaan,
    })
    .from(pesertaSesiPosga)
    .where(eq(pesertaSesiPosga.sesiPosgaId, sesiPosgaId));

  // ----------------------------------------------------------
  // STATUS PESERTA SUDAH BERUBAH
  // ----------------------------------------------------------

  const sudahAdaAktivitas = pesertaDalamSesi.some(
    (item) => item.status !== "belum_diperiksa",
  );

  if (sudahAdaAktivitas) {
    return true;
  }

  const pesertaSesiIds = pesertaDalamSesi.map((item) => item.id);

  // ----------------------------------------------------------
  // HASIL PEMERIKSAAN
  // ----------------------------------------------------------

  if (pesertaSesiIds.length > 0) {
    const pemeriksaanAda = await db
      .select({
        id: hasilPemeriksaan.id,
      })
      .from(hasilPemeriksaan)
      .where(inArray(hasilPemeriksaan.pesertaSesiPosgaId, pesertaSesiIds))
      .limit(1);

    if (pemeriksaanAda[0]) {
      return true;
    }

    // --------------------------------------------------------
    // KONSELING
    // --------------------------------------------------------

    const konselingAda = await db
      .select({
        id: hasilKonseling.id,
      })
      .from(hasilKonseling)
      .where(inArray(hasilKonseling.pesertaSesiPosgaId, pesertaSesiIds))
      .limit(1);

    if (konselingAda[0]) {
      return true;
    }
  }

  // ----------------------------------------------------------
  // SKRINING
  // ----------------------------------------------------------

  const skriningAda = await db
    .select({
      id: hasilSkrining.id,
    })
    .from(hasilSkrining)
    .where(eq(hasilSkrining.sesiPosgaId, sesiPosgaId))
    .limit(1);

  if (skriningAda[0]) {
    return true;
  }

  return false;
}

// ============================================================
// GENERATE DATA KLASIFIKASI PESERTA
// ============================================================

async function siapkanPesertaUntukSesi(
  posyanduId: number,
  tanggalPosga: string,
) {
  const daftarPeserta =
    await ambilPesertaPosyanduPadaTanggal(
      posyanduId,
      tanggalPosga,
    );

  if (
    daftarPeserta.length ===
    0
  ) {
    return [];
  }

  // ==========================================================
  // AMBIL SELURUH NIK PEREMPUAN
  //
  // Peserta laki-laki tidak membutuhkan query reproduksi.
  // ==========================================================

  const nikPerempuan = [
    ...new Set(
      daftarPeserta
        .filter(
          (item) =>
            item.jenisKelamin ===
            "P",
        )
        .map(
          (item) =>
            item.pesertaNik,
        ),
    ),
  ];

  // ==========================================================
  // PRELOAD EPISODE NIFAS YANG BERLAKU PADA TANGGAL SESI
  // ==========================================================

  const nifasRows =
    nikPerempuan.length >
    0
      ? await db
          .select({
            pesertaNik:
              episodeNifas.pesertaNik,
          })
          .from(
            episodeNifas,
          )
          .where(
            and(
              inArray(
                episodeNifas.pesertaNik,
                nikPerempuan,
              ),

              ne(
                episodeNifas.status,
                "dibatalkan",
              ),

              lte(
                episodeNifas.tanggalMulai,
                tanggalPosga,
              ),

              gte(
                sql<string>`date(coalesce(${episodeNifas.tanggalMelahirkan}, ${episodeNifas.tanggalMulai}), '+45 day')`,
                tanggalPosga,
              ),

              or(
                isNull(
                  episodeNifas.tanggalSelesai,
                ),

                gte(
                  episodeNifas.tanggalSelesai,
                  tanggalPosga,
                ),
              ),
            ),
          )
      : [];

  const nikNifas =
    new Set(
      nifasRows.map(
        (item) =>
          item.pesertaNik,
      ),
    );

  // ==========================================================
  // PRELOAD EPISODE KEHAMILAN YANG BERLAKU PADA TANGGAL SESI
  // ==========================================================

  const hamilRows =
    nikPerempuan.length >
    0
      ? await db
          .select({
            pesertaNik:
              episodeKehamilan.pesertaNik,
          })
          .from(
            episodeKehamilan,
          )
          .where(
            and(
              inArray(
                episodeKehamilan.pesertaNik,
                nikPerempuan,
              ),

              ne(
                episodeKehamilan.status,
                "dibatalkan",
              ),

              lte(
                episodeKehamilan.tanggalMulai,
                tanggalPosga,
              ),

              or(
                isNull(
                  episodeKehamilan.tanggalSelesai,
                ),

                gte(
                  episodeKehamilan.tanggalSelesai,
                  tanggalPosga,
                ),
              ),
            ),
          )
      : [];

  const nikHamil =
    new Set(
      hamilRows.map(
        (item) =>
          item.pesertaNik,
      ),
    );

  // ==========================================================
  // KLASIFIKASI DI MEMORY
  //
  // Prioritas tetap sama:
  // 1. ibu_nifas
  // 2. ibu_hamil
  // 3. kategori usia
  // ==========================================================

  return daftarPeserta.map(
    (dataPeserta) => {
      const klasifikasiUsia =
        tentukanKategoriUsia(
          dataPeserta.tanggalLahir,
          tanggalPosga,
        );

      if (
        dataPeserta.jenisKelamin ===
          "P" &&
        nikNifas.has(
          dataPeserta.pesertaNik,
        )
      ) {
        return {
          pesertaNik:
            dataPeserta.pesertaNik,

          nama:
            dataPeserta.nama,

          umur:
            klasifikasiUsia.umur,

          kategori:
            "ibu_nifas" as const,

          sumberKategori:
            "nifas" as const,
        };
      }

      if (
        dataPeserta.jenisKelamin ===
          "P" &&
        nikHamil.has(
          dataPeserta.pesertaNik,
        )
      ) {
        return {
          pesertaNik:
            dataPeserta.pesertaNik,

          nama:
            dataPeserta.nama,

          umur:
            klasifikasiUsia.umur,

          kategori:
            "ibu_hamil" as const,

          sumberKategori:
            "kehamilan" as const,
        };
      }

      return {
        pesertaNik:
          dataPeserta.pesertaNik,

        nama:
          dataPeserta.nama,

        umur:
          klasifikasiUsia.umur,

        kategori:
          klasifikasiUsia.kategori,

        sumberKategori:
          "usia" as const,
      };
    },
  );
}

// ============================================================
// GENERATE PESERTA_Sesi_POSGA
// ============================================================

async function generatePesertaUntukSesi(
  sesiId: number,
  posyanduId: number,
  tanggalPosga: string,
) {
  const pesertaSiap =
    await siapkanPesertaUntukSesi(
      posyanduId,
      tanggalPosga,
    );

  if (
    pesertaSiap.length ===
    0
  ) {
    return [];
  }

  // ==========================================================
  // INSERT SELURUH ROSTER SEKALIGUS
  // ==========================================================

  const inserted =
    await db
      .insert(
        pesertaSesiPosga,
      )
      .values(
        pesertaSiap.map(
          (item) => ({
            sesiPosgaId:
              sesiId,

            pesertaNik:
              item.pesertaNik,

            kategoriSaatItu:
              item.kategori,

            sumberKategori:
              item.sumberKategori,

            statusPemeriksaan:
              "belum_diperiksa" as const,
          }),
        ),
      )
      .returning({
        id:
          pesertaSesiPosga.id,

        pesertaNik:
          pesertaSesiPosga.pesertaNik,

        statusPemeriksaan:
          pesertaSesiPosga.statusPemeriksaan,
      });

  if (
    inserted.length !==
    pesertaSiap.length
  ) {
    throw new Error(
      "Jumlah peserta sesi yang tersimpan tidak sesuai dengan jumlah peserta yang disiapkan.",
    );
  }

  const insertedMap =
    new Map(
      inserted.map(
        (row) => [
          row.pesertaNik,
          row,
        ],
      ),
    );

  return pesertaSiap.map(
    (item) => {
      const row =
        insertedMap.get(
          item.pesertaNik,
        );

      if (!row) {
        throw new Error(
          `Peserta ${item.pesertaNik} pada sesi gagal dibaca setelah disimpan.`,
        );
      }

      return {
        pesertaSesiId:
          row.id,

        pesertaNik:
          item.pesertaNik,

        nama:
          item.nama,

        umur:
          item.umur,

        kategori:
          item.kategori,

        sumberKategori:
          item.sumberKategori,

        statusPemeriksaan:
          row.statusPemeriksaan,
      };
    },
  );
}

// ============================================================
// CREATE SESI
// ============================================================

export async function buatSesiPosga(input: BuatSesiPosgaInput) {
  validasiTanggalISO(input.tanggalPosga);

  // ----------------------------------------------------------
  // VALIDASI POSYANDU
  // ----------------------------------------------------------

  const dataPosyandu = await ambilPosyanduById(input.posyanduId);

  if (!dataPosyandu) {
    throw new Error("Posyandu tidak ditemukan.");
  }

  if (!dataPosyandu.aktif) {
    throw new Error("Posyandu tidak aktif.");
  }

  // ----------------------------------------------------------
  // CEK DUPLIKAT
  // ----------------------------------------------------------

  const existing = await ambilSesiByTanggal(
    input.posyanduId,
    input.tanggalPosga,
  );

  if (existing) {
    throw new Error("Sesi Posga pada tanggal tersebut sudah tersedia.");
  }

  // ----------------------------------------------------------
  // BUAT SESI
  // ----------------------------------------------------------

  const hasilSesi = await db
    .insert(sesiPosga)
    .values({
      posyanduId: input.posyanduId,

      tanggalPosga: input.tanggalPosga,

      status: "aktif",

      catatan: input.catatan,
    })
    .returning();

  const sesiBaru = hasilSesi[0];

  if (!sesiBaru) {
    throw new Error("Gagal membuat sesi Posga.");
  }

  // ----------------------------------------------------------
  // GENERATE PESERTA
  // ----------------------------------------------------------

  try {
    const pesertaTerbentuk = await generatePesertaUntukSesi(
      sesiBaru.id,
      input.posyanduId,
      input.tanggalPosga,
    );

    return {
      sesi: sesiBaru,

      jumlahPeserta: pesertaTerbentuk.length,

      peserta: pesertaTerbentuk,
    };
  } catch (error) {
    // Bila generate peserta gagal,
    // sesi yang baru dibuat dibersihkan kembali.

    await db.delete(sesiPosga).where(eq(sesiPosga.id, sesiBaru.id));

    throw error;
  }
}

// ============================================================
// UPDATE SESI
// ============================================================

export async function updateSesiPosga(id: number, input: UpdateSesiPosgaInput) {
  const existing = await ambilSesiPosgaById(id);

  if (!existing) {
    throw new Error("Sesi Posga tidak ditemukan.");
  }

  if (existing.status === "selesai") {
    throw new Error("Sesi yang sudah selesai tidak dapat diedit.");
  }

  if (existing.status === "dibatalkan") {
    throw new Error("Sesi yang sudah dibatalkan tidak dapat diedit.");
  }

  const tanggalBaru = input.tanggalPosga ?? existing.tanggalPosga;

  validasiTanggalISO(tanggalBaru);

  const tanggalBerubah = tanggalBaru !== existing.tanggalPosga;

  // ==========================================================
  // UPDATE TANPA PERUBAHAN TANGGAL
  // ==========================================================

  if (!tanggalBerubah) {
    const updateData: {
      catatan?: string | null;
      updatedAt: ReturnType<typeof sql>;
    } = {
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    if (input.catatan !== undefined) {
      updateData.catatan = input.catatan;
    }

    const hasil = await db
      .update(sesiPosga)
      .set(updateData)
      .where(eq(sesiPosga.id, id))
      .returning();

    return {
      sesi: hasil[0] ?? null,

      jumlahPeserta: (await ambilPesertaSesi(id)).length,

      peserta: await ambilPesertaSesi(id),
    };
  }

  // ==========================================================
  // UPDATE DENGAN PERUBAHAN TANGGAL
  // ==========================================================

  const adaDataKlinis = await sesiMemilikiDataKlinis(id);

  if (adaDataKlinis) {
    throw new Error(
      "Tanggal sesi tidak dapat diubah karena pemeriksaan sudah dimulai atau sesi sudah mempunyai hasil.",
    );
  }

  // ----------------------------------------------------------
  // CEK TANGGAL DUPLIKAT
  // ----------------------------------------------------------

  const duplikat = await db
    .select({
      id: sesiPosga.id,
    })
    .from(sesiPosga)
    .where(
      and(
        eq(sesiPosga.posyanduId, existing.posyanduId),

        eq(sesiPosga.tanggalPosga, tanggalBaru),

        ne(sesiPosga.id, id),
      ),
    )
    .limit(1);

  if (duplikat[0]) {
    throw new Error("Sesi Posga pada tanggal tersebut sudah tersedia.");
  }

  // ----------------------------------------------------------
  // SIAPKAN DATA PESERTA SEBELUM MENGHAPUS ROSTER LAMA
  //
  // Dengan demikian bila proses klasifikasi gagal,
  // data lama belum disentuh.
  // ----------------------------------------------------------

  const pesertaBaruSiap = await siapkanPesertaUntukSesi(
    existing.posyanduId,
    tanggalBaru,
  );

  // ----------------------------------------------------------
  // ATOMIC REBUILD PESERTA SESI
  // Semua klasifikasi sudah dihitung di atas sebelum transaksi.
  // Hapus peserta lama, ubah tanggal, dan insert peserta baru
  // harus berhasil sebagai satu kesatuan.
  // ----------------------------------------------------------

  return db.transaction((tx) => {
    tx
      .delete(pesertaSesiPosga)
      .where(eq(pesertaSesiPosga.sesiPosgaId, id))
      .run();

    const updateData: {
      tanggalPosga: string;
      catatan?: string | null;
      updatedAt: ReturnType<typeof sql>;
    } = {
      tanggalPosga: tanggalBaru,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    if (input.catatan !== undefined) {
      updateData.catatan = input.catatan;
    }

    const hasilUpdate = tx
      .update(sesiPosga)
      .set(updateData)
      .where(eq(sesiPosga.id, id))
      .returning()
      .all();

    const pesertaTerbentuk: Array<{
      pesertaSesiId: number;
      pesertaNik: string;
      nama: string;
      umur: {
        tahun: number;
        bulan: number;
        hari: number;
      };
      kategori: KategoriPemeriksaan;
      sumberKategori: SumberKategori;
      statusPemeriksaan: string;
    }> = [];

    for (const item of pesertaBaruSiap) {
      const rows = tx
        .insert(pesertaSesiPosga)
        .values({
          sesiPosgaId: id,
          pesertaNik: item.pesertaNik,
          kategoriSaatItu: item.kategori,
          sumberKategori: item.sumberKategori,
          statusPemeriksaan: "belum_diperiksa",
        })
        .returning()
        .all();

      const row = rows[0];

      if (!row) {
        throw new Error("Gagal membentuk peserta sesi setelah tanggal diubah.");
      }

      pesertaTerbentuk.push({
        pesertaSesiId: row.id,
        pesertaNik: item.pesertaNik,
        nama: item.nama,
        umur: item.umur,
        kategori: item.kategori,
        sumberKategori: item.sumberKategori,
        statusPemeriksaan: row.statusPemeriksaan,
      });
    }

    return {
      sesi: hasilUpdate[0] ?? null,
      jumlahPeserta: pesertaTerbentuk.length,
      peserta: pesertaTerbentuk,
    };
  });
}

// ============================================================
// SELESAIKAN SESI
// ============================================================

/**
 * Menutup sesi.
 *
 * Tidak mewajibkan seluruh peserta berstatus selesai,
 * karena dalam pelayanan nyata dapat ada peserta:
 *
 * - tidak hadir
 * - batal
 * - belum diperiksa karena alasan operasional
 *
 * Validasi lebih ketat dapat ditambahkan ketika
 * workflow pemeriksaan final sudah terbentuk.
 */
export async function selesaikanSesiPosga(id: number) {
  const existing = await ambilSesiPosgaById(id);

  if (!existing) {
    throw new Error("Sesi Posga tidak ditemukan.");
  }

  if (existing.status === "dibatalkan") {
    throw new Error("Sesi yang sudah dibatalkan tidak dapat diselesaikan.");
  }

  if (existing.status === "selesai") {
    return existing;
  }

  const hasil = await db
    .update(sesiPosga)
    .set({
      status: "selesai",

      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(sesiPosga.id, id))
    .returning();

  return hasil[0] ?? null;
}

// ============================================================
// BATALKAN SESI
// ============================================================

/**
 * Pembatalan mempertahankan record sesi.
 *
 * Artinya:
 *
 * sesi tetap ada
 * status = dibatalkan
 *
 * Tetapi sesi yang sudah mempunyai aktivitas klinis
 * tidak boleh dibatalkan secara sembarangan.
 */
export async function batalkanSesiPosga(id: number) {
  const existing = await ambilSesiPosgaById(id);

  if (!existing) {
    throw new Error("Sesi Posga tidak ditemukan.");
  }

  if (existing.status === "selesai") {
    throw new Error("Sesi yang sudah selesai tidak dapat dibatalkan.");
  }

  if (existing.status === "dibatalkan") {
    return existing;
  }

  const adaDataKlinis = await sesiMemilikiDataKlinis(id);

  if (adaDataKlinis) {
    throw new Error(
      "Sesi tidak dapat dibatalkan karena sudah mempunyai aktivitas atau hasil pemeriksaan.",
    );
  }

  const hasil = await db
    .update(sesiPosga)
    .set({
      status: "dibatalkan",

      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(sesiPosga.id, id))
    .returning();

  return hasil[0] ?? null;
}

// ============================================================
// DELETE SESI PERMANEN
// ============================================================

/**
 * Delete permanen hanya diperbolehkan untuk kesalahan
 * administratif yang belum menjadi riwayat klinis.
 *
 * ATURAN:
 *
 * aktif
 *     -> TIDAK boleh dihapus
 *
 * dibatalkan/selesai + tanpa aktivitas klinis
 *     -> boleh dihapus
 *
 * mempunyai pemeriksaan/skrining/konseling
 *     -> TIDAK boleh dihapus
 */
export async function hapusSesiPosga(id: number) {
  const existing =
    await ambilSesiPosgaById(id);

  if (!existing) {
    throw new Error(
      "Sesi Posga tidak ditemukan.",
    );
  }

  if (
    existing.status ===
    "aktif"
  ) {
    throw new Error(
      "Sesi yang masih aktif tidak dapat dihapus. Selesaikan atau batalkan sesi terlebih dahulu.",
    );
  }

  const adaDataKlinis =
    await sesiMemilikiDataKlinis(
      id,
    );

  if (adaDataKlinis) {
    throw new Error(
      "Sesi tidak dapat dihapus karena sudah memiliki aktivitas atau hasil klinis. Riwayat pelayanan harus dipertahankan.",
    );
  }

  const hasil =
    await db
      .delete(sesiPosga)
      .where(
        eq(
          sesiPosga.id,
          id,
        ),
      )
      .returning();

  return hasil[0] ?? null;
}



