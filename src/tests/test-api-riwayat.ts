import assert from "node:assert/strict";

import request from "supertest";

import {
  eq,
} from "drizzle-orm";

import {
  app,
} from "../app.js";

import {
  db,
} from "../db/index.js";

import {
  hasilKonseling,
  hasilPemeriksaan,
  hasilSkrining,
  indikator,
  lokasi,
  peserta,
  pesertaPosyandu,
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
} from "../db/schema.js";

// ============================================================
// FIXTURE
// ============================================================

const NIK =
  "3578000000099801";

const NAMA_LOKASI =
  "LOKASI TEST RIWAYAT";

const NAMA_POSYANDU =
  "POSYANDU TEST RIWAYAT";

// ============================================================
// HELPER
// ============================================================

function judul(
  nilai: string,
) {
  console.log(
    "\n========================================",
  );

  console.log(
    nilai,
  );

  console.log(
    "========================================",
  );
}

async function cleanup() {
  const pesertaRows =
    await db
      .select({
        id:
          pesertaSesiPosga.id,
      })
      .from(
        pesertaSesiPosga,
      )
      .where(
        eq(
          pesertaSesiPosga.pesertaNik,
          NIK,
        ),
      );

  for (
    const row of pesertaRows
  ) {
    await db
      .delete(
        hasilPemeriksaan,
      )
      .where(
        eq(
          hasilPemeriksaan.pesertaSesiPosgaId,
          row.id,
        ),
      );

    await db
      .delete(
        hasilKonseling,
      )
      .where(
        eq(
          hasilKonseling.pesertaSesiPosgaId,
          row.id,
        ),
      );
  }

  await db
    .delete(
      hasilSkrining,
    )
    .where(
      eq(
        hasilSkrining.pesertaNik,
        NIK,
      ),
    );

  await db
    .delete(
      pesertaSesiPosga,
    )
    .where(
      eq(
        pesertaSesiPosga.pesertaNik,
        NIK,
      ),
    );

  await db
    .delete(
      pesertaPosyandu,
    )
    .where(
      eq(
        pesertaPosyandu.pesertaNik,
        NIK,
      ),
    );

  const posyanduRows =
    await db
      .select({
        id:
          posyandu.id,
      })
      .from(
        posyandu,
      )
      .where(
        eq(
          posyandu.nama,
          NAMA_POSYANDU,
        ),
      );

  for (
    const row of posyanduRows
  ) {
    await db
      .delete(
        sesiPosga,
      )
      .where(
        eq(
          sesiPosga.posyanduId,
          row.id,
        ),
      );
  }

  await db
    .delete(
      posyandu,
    )
    .where(
      eq(
        posyandu.nama,
        NAMA_POSYANDU,
      ),
    );

  await db
    .delete(
      lokasi,
    )
    .where(
      eq(
        lokasi.nama,
        NAMA_LOKASI,
      ),
    );

  await db
    .delete(
      peserta,
    )
    .where(
      eq(
        peserta.nik,
        NIK,
      ),
    );
}

// ============================================================
// FIXTURE DATA
// ============================================================

async function fixture() {
  const lokasiRows =
    await db
      .insert(
        lokasi,
      )
      .values({
        nama:
          NAMA_LOKASI,

        aktif:
          true,
      })
      .returning();

  const lokasiId =
    lokasiRows[0]?.id;

  assert(
    lokasiId,
    "Fixture lokasi gagal.",
  );

  const posyanduRows =
    await db
      .insert(
        posyandu,
      )
      .values({
        lokasiId,

        nama:
          NAMA_POSYANDU,

        aktif:
          true,
      })
      .returning();

  const posyanduId =
    posyanduRows[0]?.id;

  assert(
    posyanduId,
    "Fixture Posyandu gagal.",
  );

  await db
    .insert(
      peserta,
    )
    .values({
      nik:
        NIK,

      nama:
        "Peserta Test Riwayat",

      tanggalLahir:
        "1990-01-01",

      jenisKelamin:
        "P",

      aktif:
        true,
    });

  await db
    .insert(
      pesertaPosyandu,
    )
    .values({
      pesertaNik:
        NIK,

      posyanduId,

      tanggalMulai:
        "2026-01-01",

      aktif:
        true,
    });

  const sesiRows =
    await db
      .insert(
        sesiPosga,
      )
      .values([
        {
          posyanduId,

          tanggalPosga:
            "2026-06-01",

          status:
            "selesai",

          catatan:
            "Riwayat Juni",
        },

        {
          posyanduId,

          tanggalPosga:
            "2026-07-01",

          status:
            "selesai",

          catatan:
            "Riwayat Juli",
        },

        {
          posyanduId,

          tanggalPosga:
            "2026-08-01",

          status:
            "dibatalkan",

          catatan:
            "Riwayat Agustus",
        },

        {
          posyanduId,

          tanggalPosga:
            "2026-09-01",

          status:
            "aktif",

          catatan:
            "Riwayat September",
        },
      ])
      .returning();

  assert.equal(
    sesiRows.length,
    4,
  );

  const rosterRows =
    await db
      .insert(
        pesertaSesiPosga,
      )
      .values([
        {
          sesiPosgaId:
            sesiRows[0]!.id,

          pesertaNik:
            NIK,

          kategoriSaatItu:
            "dewasa",

          sumberKategori:
            "usia",

          statusPemeriksaan:
            "selesai",
        },

        {
          sesiPosgaId:
            sesiRows[1]!.id,

          pesertaNik:
            NIK,

          kategoriSaatItu:
            "dewasa",

          sumberKategori:
            "usia",

          statusPemeriksaan:
            "selesai",
        },

        {
          sesiPosgaId:
            sesiRows[2]!.id,

          pesertaNik:
            NIK,

          kategoriSaatItu:
            "dewasa",

          sumberKategori:
            "usia",

          statusPemeriksaan:
            "batal",
        },

        {
          sesiPosgaId:
            sesiRows[3]!.id,

          pesertaNik:
            NIK,

          kategoriSaatItu:
            "dewasa",

          sumberKategori:
            "usia",

          statusPemeriksaan:
            "sedang_diperiksa",
        },
      ])
      .returning();

  assert.equal(
    rosterRows.length,
    4,
  );

  const indikatorRows =
    await db
      .select({
        id:
          indikator.id,

        kode:
          indikator.kode,

        kelompok:
          indikator.kelompok,
      })
      .from(
        indikator,
      );

  const indikatorPemeriksaan =
    indikatorRows.find(
      (
        item,
      ) =>
        item.kelompok ===
        "pemeriksaan",
    );

  const indikatorSkrining =
    indikatorRows.find(
      (
        item,
      ) =>
        item.kelompok ===
        "skrining",
    );

  const indikatorKonseling =
    indikatorRows.find(
      (
        item,
      ) =>
        item.kelompok ===
        "konseling",
    );

  assert(
    indikatorPemeriksaan,
    "Indikator pemeriksaan tidak ditemukan.",
  );

  assert(
    indikatorSkrining,
    "Indikator skrining tidak ditemukan.",
  );

  assert(
    indikatorKonseling,
    "Indikator konseling tidak ditemukan.",
  );

  // ==========================================================
  // HASIL KLINIS PADA SESI JULI
  // ==========================================================

  await db
    .insert(
      hasilPemeriksaan,
    )
    .values({
      pesertaSesiPosgaId:
        rosterRows[1]!.id,

      indikatorId:
        indikatorPemeriksaan.id,

      nilaiNumber:
        60,
    });

  await db
    .insert(
      hasilKonseling,
    )
    .values({
      pesertaSesiPosgaId:
        rosterRows[1]!.id,

      indikatorId:
        indikatorKonseling.id,

      catatan:
        "Fixture konseling.",
    });

  await db
    .insert(
      hasilSkrining,
    )
    .values({
      pesertaNik:
        NIK,

      indikatorId:
        indikatorSkrining.id,

      sesiPosgaId:
        sesiRows[1]!.id,

      tanggalSkrining:
        "2026-07-01",

      sumber:
        "posga",

      catatan:
        "Fixture skrining.",
    });

  return {
    posyanduId,

    sesiRows,

    rosterRows,
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  judul(
    "TEST API RIWAYAT PESERTA",
  );

  const bypassAuthSebelumnya =
    process.env
      .POSGA_TEST_BYPASS_AUTH;

  process.env
    .POSGA_TEST_BYPASS_AUTH =
    "1";

  try {
    await cleanup();

    await fixture();

    // ========================================================
    // 1. DEFAULT
    // ========================================================

    console.log(
      "\n1. GET riwayat default",
    );

    const response =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK}/riwayat-sesi`,
        )
        .expect(200);

    assert.equal(
      response.body.success,
      true,
    );

    assert.equal(
      response.body.data.pagination.total,
      4,
    );

    assert.equal(
      response.body.data.items.length,
      4,
    );

    console.log(
      "BERHASIL:",
      response.body.data.pagination,
    );

    // ========================================================
    // 2. URUTAN TERBARU
    // ========================================================

    console.log(
      "\n2. Urutan sesi terbaru",
    );

    assert.equal(
      response.body.data.items[0].tanggalPosga,
      "2026-09-01",
    );

    assert.equal(
      response.body.data.items[3].tanggalPosga,
      "2026-06-01",
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 3. FILTER STATUS SESI
    // ========================================================

    console.log(
      "\n3. Filter status sesi selesai",
    );

    const selesai =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK}/riwayat-sesi?status=selesai`,
        )
        .expect(200);

    assert.equal(
      selesai.body.data.items.length,
      2,
    );

    assert(
      selesai.body.data.items.every(
        (
          item: {
            statusSesi: string;
          },
        ) =>
          item.statusSesi ===
          "selesai",
      ),
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 4. FILTER STATUS PEMERIKSAAN
    // ========================================================

    console.log(
      "\n4. Filter status pemeriksaan selesai",
    );

    const pemeriksaanSelesai =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK}/riwayat-sesi?statusPemeriksaan=selesai`,
        )
        .expect(200);

    assert.equal(
      pemeriksaanSelesai.body.data.items.length,
      2,
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 5. FILTER RENTANG TANGGAL
    // ========================================================

    console.log(
      "\n5. Filter rentang tanggal",
    );

    const rentang =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK}/riwayat-sesi?tanggalMulai=2026-07-01&tanggalSelesai=2026-08-31`,
        )
        .expect(200);

    assert.equal(
      rentang.body.data.items.length,
      2,
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 6. HITUNG DATA KLINIS
    // ========================================================

    console.log(
      "\n6. Hitung data klinis sesi Juli",
    );

    const juli =
      response.body.data.items.find(
        (
          item: {
            tanggalPosga: string;
          },
        ) =>
          item.tanggalPosga ===
          "2026-07-01",
      );

    assert(
      juli,
      "Riwayat Juli tidak ditemukan.",
    );

    assert.equal(
      juli.klinis.jumlahPemeriksaan,
      1,
    );

    assert.equal(
      juli.klinis.jumlahSkrining,
      1,
    );

    assert.equal(
      juli.klinis.jumlahKonseling,
      1,
    );

    assert.equal(
      juli.klinis.total,
      3,
    );

    console.log(
      "BERHASIL:",
      juli.klinis,
    );

    // ========================================================
    // 7. PAGINATION
    // ========================================================

    console.log(
      "\n7. Pagination",
    );

    const page1 =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK}/riwayat-sesi?page=1&limit=2`,
        )
        .expect(200);

    const page2 =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK}/riwayat-sesi?page=2&limit=2`,
        )
        .expect(200);

    assert.equal(
      page1.body.data.items.length,
      2,
    );

    assert.equal(
      page2.body.data.items.length,
      2,
    );

    assert.equal(
      page1.body.data.pagination.totalPages,
      2,
    );

    assert.equal(
      page1.body.data.pagination.hasNext,
      true,
    );

    assert.equal(
      page2.body.data.pagination.hasPrevious,
      true,
    );

    console.log(
      "BERHASIL:",
      page1.body.data.pagination,
    );

    // ========================================================
    // 8. KOMBINASI FILTER
    // ========================================================

    console.log(
      "\n8. Kombinasi filter",
    );

    const kombinasi =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK}/riwayat-sesi?status=selesai&statusPemeriksaan=selesai&tanggalMulai=2026-06-01&tanggalSelesai=2026-07-31`,
        )
        .expect(200);

    assert.equal(
      kombinasi.body.data.items.length,
      2,
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 9. RENTANG INVALID
    // ========================================================

    console.log(
      "\n9. Validasi rentang tanggal terbalik",
    );

    await request(
      app,
    )
      .get(
        `/api/peserta/${NIK}/riwayat-sesi?tanggalMulai=2026-12-01&tanggalSelesai=2026-01-01`,
      )
      .expect(400);

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 10. STATUS INVALID
    // ========================================================

    console.log(
      "\n10. Validasi status invalid",
    );

    await request(
      app,
    )
      .get(
        `/api/peserta/${NIK}/riwayat-sesi?status=rusak`,
      )
      .expect(400);

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 11. NIK INVALID
    // ========================================================

    console.log(
      "\n11. Validasi NIK invalid",
    );

    await request(
      app,
    )
      .get(
        "/api/peserta/123/riwayat-sesi",
      )
      .expect(400);

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 12. PESERTA TIDAK DITEMUKAN
    // ========================================================

    console.log(
      "\n12. Peserta tidak ditemukan",
    );

    await request(
      app,
    )
      .get(
        "/api/peserta/3578000000099899/riwayat-sesi",
      )
      .expect(404);

    console.log(
      "BERHASIL.",
    );

    judul(
      "SEMUA TEST API RIWAYAT BERHASIL",
    );
  } finally {
    console.log(
      "\nMembersihkan fixture...",
    );

    await cleanup();

    if (
      bypassAuthSebelumnya ===
      undefined
    ) {
      delete process.env
        .POSGA_TEST_BYPASS_AUTH;
    } else {
      process.env
        .POSGA_TEST_BYPASS_AUTH =
        bypassAuthSebelumnya;
    }

    console.log(
      "Fixture berhasil dibersihkan.",
    );
  }
}

main().catch(
  (error) => {
    judul(
      "TEST API RIWAYAT GAGAL",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);