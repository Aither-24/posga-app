import {
  and,
  count,
  eq,
  inArray,
} from "drizzle-orm";

import {
  db,
} from "../db/index.js";

import {
  hasilKonseling,
  hasilPemeriksaan,
  hasilSkrining,
  peserta,
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
} from "../db/schema.js";

import {
  notFound,
} from "./api-error.js";

// ============================================================
// REKAP SATU SESI POSGA
// ============================================================

export async function ambilRekapSesiPosga(
  sesiId: number,
) {
  // ==========================================================
  // SESI + POSYANDU
  // ==========================================================

  const sesiRows =
    await db
      .select({
        id:
          sesiPosga.id,

        posyanduId:
          sesiPosga.posyanduId,

        namaPosyandu:
          posyandu.nama,

        tanggalPosga:
          sesiPosga.tanggalPosga,

        status:
          sesiPosga.status,

        catatan:
          sesiPosga.catatan,

        createdAt:
          sesiPosga.createdAt,

        updatedAt:
          sesiPosga.updatedAt,
      })
      .from(
        sesiPosga,
      )
      .innerJoin(
        posyandu,
        eq(
          sesiPosga.posyanduId,
          posyandu.id,
        ),
      )
      .where(
        eq(
          sesiPosga.id,
          sesiId,
        ),
      )
      .limit(1);

  const sesi =
    sesiRows[0];

  if (!sesi) {
    throw notFound(
      "Sesi POSGA tidak ditemukan.",
    );
  }

  // ==========================================================
  // ROSTER
  // ==========================================================

  const rosterRows =
    await db
      .select({
        pesertaSesiId:
          pesertaSesiPosga.id,

        pesertaNik:
          pesertaSesiPosga.pesertaNik,

        nama:
          peserta.nama,

        tanggalLahir:
          peserta.tanggalLahir,

        jenisKelamin:
          peserta.jenisKelamin,

        kategori:
          pesertaSesiPosga.kategoriSaatItu,

        sumberKategori:
          pesertaSesiPosga.sumberKategori,

        statusPemeriksaan:
          pesertaSesiPosga.statusPemeriksaan,

        createdAt:
          pesertaSesiPosga.createdAt,

        updatedAt:
          pesertaSesiPosga.updatedAt,
      })
      .from(
        pesertaSesiPosga,
      )
      .innerJoin(
        peserta,
        eq(
          pesertaSesiPosga.pesertaNik,
          peserta.nik,
        ),
      )
      .where(
        eq(
          pesertaSesiPosga.sesiPosgaId,
          sesiId,
        ),
      );

  // ==========================================================
  // DETAIL KLINIS SETIAP PESERTA - BATCH AGGREGATE
  //
  // Sebelumnya:
  // 3 query COUNT untuk setiap peserta.
  //
  // Sekarang:
  // maksimal 3 query aggregate untuk seluruh roster.
  // ==========================================================

  const pesertaSesiIds =
    rosterRows.map(
      (row) =>
        row.pesertaSesiId,
    );

  const pesertaNiks =
    rosterRows.map(
      (row) =>
        row.pesertaNik,
    );

  // ==========================================================
  // PEMERIKSAAN
  // ==========================================================

  const pemeriksaanCounts =
    pesertaSesiIds.length >
    0
      ? await db
          .select({
            pesertaSesiId:
              hasilPemeriksaan.pesertaSesiPosgaId,

            total:
              count(),
          })
          .from(
            hasilPemeriksaan,
          )
          .where(
            inArray(
              hasilPemeriksaan.pesertaSesiPosgaId,
              pesertaSesiIds,
            ),
          )
          .groupBy(
            hasilPemeriksaan.pesertaSesiPosgaId,
          )
      : [];

  const pemeriksaanMap =
    new Map<
      number,
      number
    >(
      pemeriksaanCounts.map(
        (item) => [
          item.pesertaSesiId,
          Number(
            item.total,
          ),
        ],
      ),
    );

  // ==========================================================
  // KONSELING
  // ==========================================================

  const konselingCounts =
    pesertaSesiIds.length >
    0
      ? await db
          .select({
            pesertaSesiId:
              hasilKonseling.pesertaSesiPosgaId,

            total:
              count(),
          })
          .from(
            hasilKonseling,
          )
          .where(
            inArray(
              hasilKonseling.pesertaSesiPosgaId,
              pesertaSesiIds,
            ),
          )
          .groupBy(
            hasilKonseling.pesertaSesiPosgaId,
          )
      : [];

  const konselingMap =
    new Map<
      number,
      number
    >(
      konselingCounts.map(
        (item) => [
          item.pesertaSesiId,
          Number(
            item.total,
          ),
        ],
      ),
    );

  // ==========================================================
  // SKRINING
  //
  // Skrining terhubung ke sesiPosgaId + pesertaNik.
  // Karena rekap ini hanya untuk satu sesi, cukup groupBy NIK.
  // ==========================================================

  const skriningCounts =
    pesertaNiks.length >
    0
      ? await db
          .select({
            pesertaNik:
              hasilSkrining.pesertaNik,

            total:
              count(),
          })
          .from(
            hasilSkrining,
          )
          .where(
            and(
              eq(
                hasilSkrining.sesiPosgaId,
                sesiId,
              ),

              inArray(
                hasilSkrining.pesertaNik,
                pesertaNiks,
              ),
            ),
          )
          .groupBy(
            hasilSkrining.pesertaNik,
          )
      : [];

  const skriningMap =
    new Map<
      string,
      number
    >(
      skriningCounts.map(
        (item) => [
          item.pesertaNik,
          Number(
            item.total,
          ),
        ],
      ),
    );

  // ==========================================================
  // BENTUK DAFTAR PESERTA
  // ==========================================================

  let totalPemeriksaan =
    0;

  let totalSkrining =
    0;

  let totalKonseling =
    0;

  const daftarPeserta =
    rosterRows.map(
      (row) => {
        const jumlahPemeriksaan =
          pemeriksaanMap.get(
            row.pesertaSesiId,
          ) ??
          0;

        const jumlahSkrining =
          skriningMap.get(
            row.pesertaNik,
          ) ??
          0;

        const jumlahKonseling =
          konselingMap.get(
            row.pesertaSesiId,
          ) ??
          0;

        totalPemeriksaan +=
          jumlahPemeriksaan;

        totalSkrining +=
          jumlahSkrining;

        totalKonseling +=
          jumlahKonseling;

        return {
          ...row,

          klinis: {
            jumlahPemeriksaan,

            jumlahSkrining,

            jumlahKonseling,

            total:
              jumlahPemeriksaan +
              jumlahSkrining +
              jumlahKonseling,
          },
        };
      },
    );
  // ==========================================================
  // STATUS ROSTER
  // ==========================================================

  const statusRoster = {
    belumDiperiksa: 0,

    sedangDiperiksa: 0,

    selesai: 0,

    tidakHadir: 0,

    batal: 0,
  };

  for (
    const row of rosterRows
  ) {
    switch (
      row.statusPemeriksaan
    ) {
      case "belum_diperiksa":
        statusRoster.belumDiperiksa++;
        break;

      case "sedang_diperiksa":
        statusRoster.sedangDiperiksa++;
        break;

      case "selesai":
        statusRoster.selesai++;
        break;

      case "tidak_hadir":
        statusRoster.tidakHadir++;
        break;

      case "batal":
        statusRoster.batal++;
        break;
    }
  }

  // ==========================================================
  // KATEGORI
  // ==========================================================

  const kategori = {
    bayi: 0,

    balita: 0,

    prasekolah: 0,

    sekolah: 0,

    dewasa: 0,

    lansia: 0,

    ibuHamil: 0,

    ibuNifas: 0,
  };

  for (
    const row of rosterRows
  ) {
    switch (
      row.kategori
    ) {
      case "bayi":
        kategori.bayi++;
        break;

      case "balita":
        kategori.balita++;
        break;

      case "prasekolah":
        kategori.prasekolah++;
        break;

      case "sekolah":
        kategori.sekolah++;
        break;

      case "dewasa":
        kategori.dewasa++;
        break;

      case "lansia":
        kategori.lansia++;
        break;

      case "ibu_hamil":
        kategori.ibuHamil++;
        break;

      case "ibu_nifas":
        kategori.ibuNifas++;
        break;
    }
  }

  // ==========================================================
  // PROGRES
  // ==========================================================

  const totalRoster =
    rosterRows.length;

  const totalSelesai =
    statusRoster.selesai;

  const persenSelesai =
    totalRoster === 0
      ? 100
      : Math.round(
          (totalSelesai /
            totalRoster) *
            100,
        );

  // ==========================================================
  // RESPONSE
  // ==========================================================

  return {
    sesi,

    ringkasan: {
      totalRoster,

      statusPemeriksaan:
        statusRoster,

      kategori,

      klinis: {
        jumlahPemeriksaan:
          totalPemeriksaan,

        jumlahSkrining:
          totalSkrining,

        jumlahKonseling:
          totalKonseling,

        total:
          totalPemeriksaan +
          totalSkrining +
          totalKonseling,
      },

      progres: {
        selesai:
          totalSelesai,

        belumSelesai:
          totalRoster -
          totalSelesai,

        persenSelesai,
      },
    },

    peserta:
      daftarPeserta,
  };
}


