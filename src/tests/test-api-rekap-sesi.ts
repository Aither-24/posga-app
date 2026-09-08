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
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
} from "../db/schema.js";

// ============================================================
// FIXTURE
// ============================================================

const NIK_A =
  "3578000000099901";

const NIK_B =
  "3578000000099902";

const NAMA_LOKASI =
  "LOKASI TEST REKAP SESI";

const NAMA_POSYANDU =
  "POSYANDU TEST REKAP SESI";

// ============================================================
// HELPER
// ============================================================

function judul(
  text: string,
) {
  console.log(
    "\n========================================",
  );

  console.log(
    text,
  );

  console.log(
    "========================================",
  );
}

async function cleanup() {
  const rosterRows =
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
          NIK_A,
        ),
      );

  const rosterRowsB =
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
          NIK_B,
        ),
      );

  for (
    const row of [
      ...rosterRows,
      ...rosterRowsB,
    ]
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
        NIK_A,
      ),
    );

  await db
    .delete(
      hasilSkrining,
    )
    .where(
      eq(
        hasilSkrining.pesertaNik,
        NIK_B,
      ),
    );

  await db
    .delete(
      pesertaSesiPosga,
    )
    .where(
      eq(
        pesertaSesiPosga.pesertaNik,
        NIK_A,
      ),
    );

  await db
    .delete(
      pesertaSesiPosga,
    )
    .where(
      eq(
        pesertaSesiPosga.pesertaNik,
        NIK_B,
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
        NIK_A,
      ),
    );

  await db
    .delete(
      peserta,
    )
    .where(
      eq(
        peserta.nik,
        NIK_B,
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
    .values([
      {
        nik:
          NIK_A,

        nama:
          "Peserta A Rekap",

        tanggalLahir:
          "1990-01-01",

        jenisKelamin:
          "P",

        aktif:
          true,
      },

      {
        nik:
          NIK_B,

        nama:
          "Peserta B Rekap",

        tanggalLahir:
          "2022-01-01",

        jenisKelamin:
          "L",

        aktif:
          true,
      },
    ]);

  const sesiRows =
    await db
      .insert(
        sesiPosga,
      )
      .values({
        posyanduId,

        tanggalPosga:
          "2026-09-04",

        status:
          "aktif",

        catatan:
          "Fixture rekap sesi.",
      })
      .returning();

  const sesi =
    sesiRows[0];

  assert(
    sesi,
    "Fixture sesi gagal.",
  );

  const rosterRows =
    await db
      .insert(
        pesertaSesiPosga,
      )
      .values([
        {
          sesiPosgaId:
            sesi.id,

          pesertaNik:
            NIK_A,

          kategoriSaatItu:
            "dewasa",

          sumberKategori:
            "usia",

          statusPemeriksaan:
            "selesai",
        },

        {
          sesiPosgaId:
            sesi.id,

          pesertaNik:
            NIK_B,

          kategoriSaatItu:
            "balita",

          sumberKategori:
            "usia",

          statusPemeriksaan:
            "sedang_diperiksa",
        },
      ])
      .returning();

  assert.equal(
    rosterRows.length,
    2,
  );

  const indikatorRows =
    await db
      .select({
        id:
          indikator.id,

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

  // Peserta A:
  // 1 pemeriksaan
  // 1 skrining
  // 1 konseling

  await db
    .insert(
      hasilPemeriksaan,
    )
    .values({
      pesertaSesiPosgaId:
        rosterRows[0]!.id,

      indikatorId:
        indikatorPemeriksaan.id,

      nilaiNumber:
        60,
    });

  await db
    .insert(
      hasilSkrining,
    )
    .values({
      pesertaNik:
        NIK_A,

      indikatorId:
        indikatorSkrining.id,

      sesiPosgaId:
        sesi.id,

      tanggalSkrining:
        "2026-09-04",

      sumber:
        "posga",
    });

  await db
    .insert(
      hasilKonseling,
    )
    .values({
      pesertaSesiPosgaId:
        rosterRows[0]!.id,

      indikatorId:
        indikatorKonseling.id,

      catatan:
        "Fixture konseling A.",
    });

  // Peserta B:
  // 1 pemeriksaan

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
        15,
    });

  return {
    sesiId:
      sesi.id,

    posyanduId,

    rosterRows,
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  judul(
    "TEST API REKAP SESI",
  );

  try {
    await cleanup();

    const {
      sesiId,
    } =
      await fixture();

    // ========================================================
    // 1. GET REKAP
    // ========================================================

    console.log(
      "\n1. GET rekap sesi",
    );

    const response =
      await request(
        app,
      )
        .get(
          `/api/sesi/${sesiId}/rekap`,
        )
        .expect(200);

    assert.equal(
      response.body.success,
      true,
    );

    assert.equal(
      response.body.data.sesi.id,
      sesiId,
    );

    console.log(
      "BERHASIL:",
      response.body.data.sesi,
    );

    // ========================================================
    // 2. TOTAL ROSTER
    // ========================================================

    console.log(
      "\n2. Total roster",
    );

    assert.equal(
      response.body.data.ringkasan.totalRoster,
      2,
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 3. STATUS PEMERIKSAAN
    // ========================================================

    console.log(
      "\n3. Ringkasan status pemeriksaan",
    );

    const status =
      response.body.data.ringkasan.statusPemeriksaan;

    assert.equal(
      status.belumDiperiksa,
      0,
    );

    assert.equal(
      status.sedangDiperiksa,
      1,
    );

    assert.equal(
      status.selesai,
      1,
    );

    assert.equal(
      status.tidakHadir,
      0,
    );

    assert.equal(
      status.batal,
      0,
    );

    console.log(
      "BERHASIL:",
      status,
    );

    // ========================================================
    // 4. KATEGORI
    // ========================================================

    console.log(
      "\n4. Ringkasan kategori",
    );

    const kategori =
      response.body.data.ringkasan.kategori;

    assert.equal(
      kategori.dewasa,
      1,
    );

    assert.equal(
      kategori.balita,
      1,
    );

    assert.equal(
      kategori.bayi,
      0,
    );

    console.log(
      "BERHASIL:",
      kategori,
    );

    // ========================================================
    // 5. TOTAL KLINIS
    // ========================================================

    console.log(
      "\n5. Total data klinis",
    );

    const klinis =
      response.body.data.ringkasan.klinis;

    assert.equal(
      klinis.jumlahPemeriksaan,
      2,
    );

    assert.equal(
      klinis.jumlahSkrining,
      1,
    );

    assert.equal(
      klinis.jumlahKonseling,
      1,
    );

    assert.equal(
      klinis.total,
      4,
    );

    console.log(
      "BERHASIL:",
      klinis,
    );

    // ========================================================
    // 6. PROGRES
    // ========================================================

    console.log(
      "\n6. Progres sesi",
    );

    const progres =
      response.body.data.ringkasan.progres;

    assert.equal(
      progres.selesai,
      1,
    );

    assert.equal(
      progres.belumSelesai,
      1,
    );

    assert.equal(
      progres.persenSelesai,
      50,
    );

    console.log(
      "BERHASIL:",
      progres,
    );

    // ========================================================
    // 7. DETAIL PESERTA A
    // ========================================================

    console.log(
      "\n7. Detail klinis peserta A",
    );

    const pesertaA =
      response.body.data.peserta.find(
        (
          item: {
            pesertaNik: string;
          },
        ) =>
          item.pesertaNik ===
          NIK_A,
      );

    assert(
      pesertaA,
      "Peserta A tidak ditemukan.",
    );

    assert.equal(
      pesertaA.klinis.jumlahPemeriksaan,
      1,
    );

    assert.equal(
      pesertaA.klinis.jumlahSkrining,
      1,
    );

    assert.equal(
      pesertaA.klinis.jumlahKonseling,
      1,
    );

    assert.equal(
      pesertaA.klinis.total,
      3,
    );

    console.log(
      "BERHASIL:",
      pesertaA.klinis,
    );

    // ========================================================
    // 8. DETAIL PESERTA B
    // ========================================================

    console.log(
      "\n8. Detail klinis peserta B",
    );

    const pesertaB =
      response.body.data.peserta.find(
        (
          item: {
            pesertaNik: string;
          },
        ) =>
          item.pesertaNik ===
          NIK_B,
      );

    assert(
      pesertaB,
      "Peserta B tidak ditemukan.",
    );

    assert.equal(
      pesertaB.klinis.jumlahPemeriksaan,
      1,
    );

    assert.equal(
      pesertaB.klinis.jumlahSkrining,
      0,
    );

    assert.equal(
      pesertaB.klinis.jumlahKonseling,
      0,
    );

    assert.equal(
      pesertaB.klinis.total,
      1,
    );

    console.log(
      "BERHASIL:",
      pesertaB.klinis,
    );

    // ========================================================
    // 9. ID INVALID
    // ========================================================

    console.log(
      "\n9. Validasi ID invalid",
    );

    await request(
      app,
    )
      .get(
        "/api/sesi/abc/rekap",
      )
      .expect(400);

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 10. SESI TIDAK DITEMUKAN
    // ========================================================

    console.log(
      "\n10. Sesi tidak ditemukan",
    );

    await request(
      app,
    )
      .get(
        "/api/sesi/999999999/rekap",
      )
      .expect(404);

    console.log(
      "BERHASIL.",
    );

    judul(
      "SEMUA TEST API REKAP SESI BERHASIL",
    );
  } finally {
    console.log(
      "\nMembersihkan fixture...",
    );

    await cleanup();

    console.log(
      "Fixture berhasil dibersihkan.",
    );
  }
}

main().catch(
  (error) => {
    judul(
      "TEST API REKAP SESI GAGAL",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);