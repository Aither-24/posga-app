import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  type SQL,
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

// ============================================================
// TYPE
// ============================================================

export interface AmbilRiwayatSesiPesertaInput {
  pesertaNik: string;

  status?:
    | "aktif"
    | "selesai"
    | "dibatalkan";

  statusPemeriksaan?:
    | "belum_diperiksa"
    | "sedang_diperiksa"
    | "selesai"
    | "tidak_hadir"
    | "batal";

  tanggalMulai?: string;

  tanggalSelesai?: string;

  page: number;

  limit: number;
}

// ============================================================
// HELPER PESERTA
// ============================================================

async function pastikanPesertaAda(
  nik: string,
) {
  const rows =
    await db
      .select({
        nik:
          peserta.nik,

        nama:
          peserta.nama,

        tanggalLahir:
          peserta.tanggalLahir,

        jenisKelamin:
          peserta.jenisKelamin,

        aktif:
          peserta.aktif,
      })
      .from(
        peserta,
      )
      .where(
        eq(
          peserta.nik,
          nik,
        ),
      )
      .limit(1);

  const data =
    rows[0];

  if (!data) {
    throw new Error(
      "Peserta tidak ditemukan.",
    );
  }

  return data;
}

// ============================================================
// RIWAYAT SESI PESERTA
// ============================================================

export async function ambilRiwayatSesiPeserta(
  input: AmbilRiwayatSesiPesertaInput,
) {
  const dataPeserta =
    await pastikanPesertaAda(
      input.pesertaNik,
    );

  const kondisi: SQL[] = [
    eq(
      pesertaSesiPosga.pesertaNik,
      input.pesertaNik,
    ),
  ];

  // ==========================================================
  // FILTER STATUS SESI
  // ==========================================================

  if (
    input.status !== undefined
  ) {
    kondisi.push(
      eq(
        sesiPosga.status,
        input.status,
      ),
    );
  }

  // ==========================================================
  // FILTER STATUS PEMERIKSAAN PESERTA
  // ==========================================================

  if (
    input.statusPemeriksaan !== undefined
  ) {
    kondisi.push(
      eq(
        pesertaSesiPosga.statusPemeriksaan,
        input.statusPemeriksaan,
      ),
    );
  }

  // ==========================================================
  // FILTER TANGGAL
  // ==========================================================

  if (
    input.tanggalMulai !== undefined
  ) {
    kondisi.push(
      gte(
        sesiPosga.tanggalPosga,
        input.tanggalMulai,
      ),
    );
  }

  if (
    input.tanggalSelesai !== undefined
  ) {
    kondisi.push(
      lte(
        sesiPosga.tanggalPosga,
        input.tanggalSelesai,
      ),
    );
  }

  const whereClause =
    and(
      ...kondisi,
    );

  // ==========================================================
  // TOTAL
  // ==========================================================

  const totalRows =
    await db
      .select({
        total:
          count(),
      })
      .from(
        pesertaSesiPosga,
      )
      .innerJoin(
        sesiPosga,
        eq(
          pesertaSesiPosga.sesiPosgaId,
          sesiPosga.id,
        ),
      )
      .where(
        whereClause,
      );

  const total =
    Number(
      totalRows[0]
        ?.total ??
        0,
    );

  const totalPages =
    total === 0
      ? 0
      : Math.ceil(
          total /
            input.limit,
        );

  const offset =
    (input.page - 1) *
    input.limit;

  // ==========================================================
  // AMBIL DAFTAR SESI
  // ==========================================================

  const rows =
    await db
      .select({
        pesertaSesiId:
          pesertaSesiPosga.id,

        sesiId:
          sesiPosga.id,

        posyanduId:
          posyandu.id,

        namaPosyandu:
          posyandu.nama,

        tanggalPosga:
          sesiPosga.tanggalPosga,

        statusSesi:
          sesiPosga.status,

        catatanSesi:
          sesiPosga.catatan,

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
        sesiPosga,
        eq(
          pesertaSesiPosga.sesiPosgaId,
          sesiPosga.id,
        ),
      )
      .innerJoin(
        posyandu,
        eq(
          sesiPosga.posyanduId,
          posyandu.id,
        ),
      )
      .where(
        whereClause,
      )
      .orderBy(
        desc(
          sesiPosga.tanggalPosga,
        ),
        desc(
          sesiPosga.id,
        ),
      )
      .limit(
        input.limit,
      )
      .offset(
        offset,
      );

  // ==========================================================
  // HITUNG HASIL KLINIS PER SESI SECARA BATCH
  //
  // Sebelumnya:
  // 3 query COUNT untuk setiap item sesi.
  //
  // Sekarang:
  // maksimal 3 aggregate query untuk seluruh halaman.
  // ==========================================================

  const pesertaSesiIds =
    rows.map(
      (row) =>
        row.pesertaSesiId,
    );

  const sesiIds =
    rows.map(
      (row) =>
        row.sesiId,
    );

  // ==========================================================
  // AGGREGATE PEMERIKSAAN
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
  // AGGREGATE KONSELING
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
  // AGGREGATE SKRINING
  //
  // Skrining memakai pesertaNik + sesiPosgaId,
  // bukan pesertaSesiPosgaId.
  // ==========================================================

  const skriningCounts =
    sesiIds.length >
    0
      ? await db
          .select({
            sesiId:
              hasilSkrining.sesiPosgaId,

            total:
              count(),
          })
          .from(
            hasilSkrining,
          )
          .where(
            and(
              eq(
                hasilSkrining.pesertaNik,
                input.pesertaNik,
              ),

              inArray(
                hasilSkrining.sesiPosgaId,
                sesiIds,
              ),
            ),
          )
          .groupBy(
            hasilSkrining.sesiPosgaId,
          )
      : [];

  const skriningMap =
    new Map<
      number,
      number
    >();

  for (
    const item of
    skriningCounts
  ) {
    if (
      item.sesiId !==
      null
    ) {
      skriningMap.set(
        item.sesiId,
        Number(
          item.total,
        ),
      );
    }
  }

  // ==========================================================
  // BENTUK RESPONSE
  // ==========================================================

  const items =
    rows.map(
      (row) => {
        const jumlahPemeriksaan =
          pemeriksaanMap.get(
            row.pesertaSesiId,
          ) ??
          0;

        const jumlahSkrining =
          skriningMap.get(
            row.sesiId,
          ) ??
          0;

        const jumlahKonseling =
          konselingMap.get(
            row.pesertaSesiId,
          ) ??
          0;

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
  // RESPONSE
  // ==========================================================

  return {
    peserta: dataPeserta,

    items,

    pagination: {
      page:
        input.page,

      limit:
        input.limit,

      total,

      totalPages,

      hasNext:
        input.page <
        totalPages,

      hasPrevious:
        input.page >
          1 &&
        totalPages >
          0,
    },

    filter: {
      status:
        input.status ??
        null,

      statusPemeriksaan:
        input.statusPemeriksaan ??
        null,

      tanggalMulai:
        input.tanggalMulai ??
        null,

      tanggalSelesai:
        input.tanggalSelesai ??
        null,
    },
  };
}

