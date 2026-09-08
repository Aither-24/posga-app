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
  "3578000000099401";

const NAMA_LOKASI =
  "LOKASI TEST API";

const NAMA_POSYANDU =
  "POSYANDU TEST API";

const TANGGAL_SESI =
  "2026-09-03";

// ============================================================
// ASSERT
// ============================================================

function assert(
  kondisi: unknown,
  pesan: string,
): asserts kondisi {
  if (!kondisi) {
    throw new Error(
      `ASSERT GAGAL: ${pesan}`,
    );
  }
}

// ============================================================
// JUDUL
// ============================================================

function judul(
  teks: string,
) {
  console.log(
    "\n========================================",
  );

  console.log(teks);

  console.log(
    "========================================",
  );
}

// ============================================================
// CLEANUP
// ============================================================

async function cleanup() {
  const pesertaSesiRows =
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
    const row
    of pesertaSesiRows
  ) {
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
    const item
    of posyanduRows
  ) {
    await db
      .delete(
        sesiPosga,
      )
      .where(
        eq(
          sesiPosga.posyanduId,
          item.id,
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
}

// ============================================================
// BUAT FIXTURE
// ============================================================

async function buatFixture() {
  await cleanup();

  const lokasiRows =
    await db
      .insert(
        lokasi,
      )
      .values({
        nama:
          NAMA_LOKASI,

        alamat:
          "Fixture API",

        aktif:
          true,
      })
      .returning({
        id:
          lokasi.id,
      });

  const lokasiId =
    lokasiRows[0]?.id;

  assert(
    lokasiId,
    "Lokasi gagal dibuat.",
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

        alamat:
          "Fixture API",

        aktif:
          true,
      })
      .returning({
        id:
          posyandu.id,
      });

  const posyanduId =
    posyanduRows[0]?.id;

  assert(
    posyanduId,
    "Posyandu gagal dibuat.",
  );

  await db
    .insert(
      peserta,
    )
    .values({
      nik:
        NIK,

      nama:
        "Balita Test API",

      tanggalLahir:
        "2022-03-10",

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
        "2025-01-01",

      aktif:
        true,
    });

  const sesiRows =
    await db
      .insert(
        sesiPosga,
      )
      .values({
        posyanduId,

        tanggalPosga:
          TANGGAL_SESI,

        status:
          "aktif",

        catatan:
          "Fixture API",
      })
      .returning({
        id:
          sesiPosga.id,
      });

  const sesiId =
    sesiRows[0]?.id;

  assert(
    sesiId,
    "Sesi gagal dibuat.",
  );

  const pesertaSesiRows =
    await db
      .insert(
        pesertaSesiPosga,
      )
      .values({
        sesiPosgaId:
          sesiId,

        pesertaNik:
          NIK,

        kategoriSaatItu:
          "balita",

        sumberKategori:
          "usia",

        statusPemeriksaan:
          "belum_diperiksa",
      })
      .returning({
        id:
          pesertaSesiPosga.id,
      });

  const pesertaSesiId =
    pesertaSesiRows[0]?.id;

  assert(
    pesertaSesiId,
    "Peserta sesi gagal dibuat.",
  );

  return {
    sesiId,
    pesertaSesiId,
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  judul(
    "TEST API KLINIS POSGA",
  );

  try {
    const fixture =
      await buatFixture();

    console.log(
      "\nFixture:",
      fixture,
    );

    // ========================================================
    // 1. HEALTH
    // ========================================================

    console.log(
      "\n1. Health check",
    );

    const health =
      await request(
        app,
      )
        .get(
          "/api/health",
        )
        .expect(200);

    assert(
      health.body.success ===
        true,
      "Health check gagal.",
    );

    console.log(
      "BERHASIL:",
      health.body,
    );

    // ========================================================
    // 2. GET FORM
    // ========================================================

    console.log(
      "\n2. GET form peserta",
    );

    let responseForm =
      await request(
        app,
      )
        .get(
          `/api/peserta-sesi/${fixture.pesertaSesiId}/form`,
        )
        .expect(200);

    assert(
      responseForm.body.success ===
        true,
      "GET form gagal.",
    );

    const formAwal =
      responseForm.body.data;

    assert(
      formAwal.pesertaNik ===
        NIK,
      "NIK form tidak sesuai.",
    );

    console.log(
      "BERHASIL:",
      {
        nama:
          formAwal.nama,

        kategori:
          formAwal.kategori,

        progres:
          formAwal.progres,
      },
    );

    // ========================================================
    // 3. POST PEMERIKSAAN
    // ========================================================

    console.log(
      "\n3. POST pemeriksaan",
    );

    const bb =
      formAwal.pemeriksaan.find(
        (
          item: {
            kode:
              string;
          },
        ) =>
          item.kode ===
          "BB",
      );

    assert(
      bb,
      "BB tidak ditemukan.",
    );

    const createPemeriksaan =
      await request(
        app,
      )
        .post(
          "/api/pemeriksaan",
        )
        .send({
          pesertaSesiPosgaId:
            fixture.pesertaSesiId,

          indikatorId:
            bb.indikatorId,

          nilaiNumber:
            15.5,

          catatan:
            "Dari test API.",
        })
        .expect(201);

    assert(
      createPemeriksaan.body
        .data
        .nilaiNumber ===
        15.5,
      "POST pemeriksaan gagal.",
    );

    const pemeriksaanId =
      createPemeriksaan.body
        .data
        .id;

    console.log(
      "BERHASIL:",
      createPemeriksaan.body
        .data,
    );

    // ========================================================
    // 4. PUT PEMERIKSAAN
    // ========================================================

    console.log(
      "\n4. PUT pemeriksaan",
    );

    const updatePemeriksaan =
      await request(
        app,
      )
        .put(
          `/api/pemeriksaan/${pemeriksaanId}`,
        )
        .send({
          nilaiNumber:
            16.25,

          catatan:
            "Dikoreksi via API.",
        })
        .expect(200);

    assert(
      updatePemeriksaan.body
        .data
        .nilaiNumber ===
        16.25,
      "PUT pemeriksaan gagal.",
    );

    console.log(
      "BERHASIL:",
      updatePemeriksaan.body
        .data,
    );

    // ========================================================
    // 5. POST SKRINING
    // ========================================================

    console.log(
      "\n5. POST skrining",
    );

    responseForm =
      await request(
        app,
      )
        .get(
          `/api/peserta-sesi/${fixture.pesertaSesiId}/form`,
        )
        .expect(200);

    const formSekarang =
      responseForm.body.data;

    const gilut =
      formSekarang.skrining.find(
        (
          item: {
            kode:
              string;
          },
        ) =>
          item.kode ===
          "SKRINING_GILUT",
      );

    assert(
      gilut,
      "Gilut tidak ditemukan.",
    );

    const opsiGilut =
      gilut.opsi[0];

    assert(
      opsiGilut,
      "Opsi Gilut tidak ditemukan.",
    );

    const createSkrining =
      await request(
        app,
      )
        .post(
          "/api/skrining",
        )
        .send({
          pesertaNik:
            NIK,

          indikatorId:
            gilut.indikatorId,

          sesiPosgaId:
            fixture.sesiId,

          tanggalSkrining:
            TANGGAL_SESI,

          sumber:
            "posga",

          opsiId:
            opsiGilut.id,

          catatan:
            "Gilut via API.",
        })
        .expect(201);

    assert(
      createSkrining.body
        .data
        .sumber ===
        "posga",
      "POST skrining gagal.",
    );

    const skriningId =
      createSkrining.body
        .data
        .id;

    console.log(
      "BERHASIL:",
      createSkrining.body
        .data,
    );

    // ========================================================
    // 6. PUT SKRINING
    // ========================================================

    console.log(
      "\n6. PUT skrining",
    );

    const updateSkrining =
      await request(
        app,
      )
        .put(
          `/api/skrining/${skriningId}`,
        )
        .send({
          catatan:
            "Catatan Gilut dikoreksi via API.",
        })
        .expect(200);

    assert(
      updateSkrining.body
        .data
        .catatan ===
        "Catatan Gilut dikoreksi via API.",
      "PUT skrining gagal.",
    );

    console.log(
      "BERHASIL:",
      updateSkrining.body
        .data,
    );

    // ========================================================
    // 7. POST KONSELING
    // ========================================================

    console.log(
      "\n7. POST konseling",
    );

    responseForm =
      await request(
        app,
      )
        .get(
          `/api/peserta-sesi/${fixture.pesertaSesiId}/form`,
        )
        .expect(200);

    const formKonseling =
      responseForm.body.data;

    const konseling =
      formKonseling.konseling.find(
        (
          item: {
            kode:
              string;
          },
        ) =>
          item.kode ===
          "KONSELING_BALITA",
      );

    assert(
      konseling,
      "Konseling Balita tidak ditemukan.",
    );

    assert(
      konseling.opsi.length >=
        2,
      "Konseling test membutuhkan dua opsi.",
    );

    const opsi1 =
      konseling.opsi[0];

    const opsi2 =
      konseling.opsi[1];

    const createKonseling =
      await request(
        app,
      )
        .post(
          "/api/konseling",
        )
        .send({
          pesertaSesiPosgaId:
            fixture.pesertaSesiId,

          indikatorId:
            konseling.indikatorId,

          opsiIds: [
            opsi1.id,
            opsi2.id,
          ],

          catatan:
            "Konseling via API.",
        })
        .expect(201);

    assert(
      createKonseling.body
        .data
        .opsiTerpilih
        .length ===
        2,
      "POST konseling multiselect gagal.",
    );

    const konselingId =
      createKonseling.body
        .data
        .id;

    console.log(
      "BERHASIL:",
      createKonseling.body
        .data,
    );

    // ========================================================
    // 8. PUT KONSELING
    // ========================================================

    console.log(
      "\n8. PUT konseling",
    );

    const updateKonseling =
      await request(
        app,
      )
        .put(
          `/api/konseling/${konselingId}`,
        )
        .send({
          opsiIds: [
            opsi2.id,
          ],

          catatan:
            "Konseling dikoreksi via API.",
        })
        .expect(200);

    assert(
      updateKonseling.body
        .data
        .opsiTerpilih
        .length ===
        1,
      "PUT konseling gagal.",
    );

    console.log(
      "BERHASIL:",
      updateKonseling.body
        .data,
    );

    // ========================================================
    // 9. FORM SUDAH MEMBAWA HASIL
    // ========================================================

    console.log(
      "\n9. GET form setelah pengisian",
    );

    const formTerisi =
      await request(
        app,
      )
        .get(
          `/api/peserta-sesi/${fixture.pesertaSesiId}/form`,
        )
        .expect(200);

    const dataTerisi =
      formTerisi.body.data;

    assert(
      dataTerisi.pemeriksaan.some(
        (
          item: {
            terisi:
              boolean;
          },
        ) =>
          item.terisi,
      ),
      "Hasil pemeriksaan tidak masuk form API.",
    );

    assert(
      dataTerisi.skrining.some(
        (
          item: {
            terisi:
              boolean;
          },
        ) =>
          item.terisi,
      ),
      "Hasil skrining tidak masuk form API.",
    );

    assert(
      dataTerisi.konseling.some(
        (
          item: {
            terisi:
              boolean;
          },
        ) =>
          item.terisi,
      ),
      "Hasil konseling tidak masuk form API.",
    );

    console.log(
      "BERHASIL:",
      {
        progres:
          dataTerisi.progres,

        rekomendasiStatus:
          dataTerisi.rekomendasiStatus,
      },
    );

    // ========================================================
    // 10. SINKRON STATUS
    // ========================================================

    console.log(
      "\n10. POST sinkron status",
    );

    const sinkron =
      await request(
        app,
      )
        .post(
          `/api/peserta-sesi/${fixture.pesertaSesiId}/sinkron-status`,
        )
        .expect(200);

    assert(
      sinkron.body.success ===
        true,
      "Sinkron status gagal.",
    );

    console.log(
      "BERHASIL:",
      sinkron.body.data,
    );

    // ========================================================
    // 11. DELETE KONSELING
    // ========================================================

    console.log(
      "\n11. DELETE konseling",
    );

    await request(
      app,
    )
      .delete(
        `/api/konseling/${konselingId}`,
      )
      .expect(200);

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 12. DELETE SKRINING
    // ========================================================

    console.log(
      "\n12. DELETE skrining",
    );

    await request(
      app,
    )
      .delete(
        `/api/skrining/${skriningId}`,
      )
      .expect(200);

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 13. DELETE PEMERIKSAAN
    // ========================================================

    console.log(
      "\n13. DELETE pemeriksaan",
    );

    await request(
      app,
    )
      .delete(
        `/api/pemeriksaan/${pemeriksaanId}`,
      )
      .expect(200);

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 14. INVALID ID
    // ========================================================

    console.log(
      "\n14. Validasi ID invalid",
    );

    const invalid =
      await request(
        app,
      )
        .get(
          "/api/peserta-sesi/abc/form",
        )
        .expect(400);

    assert(
      invalid.body.success ===
        false,
      "ID invalid harus menghasilkan error.",
    );

    console.log(
      "BERHASIL:",
      invalid.body,
    );

    // ========================================================
    // 15. 404
    // ========================================================

    console.log(
      "\n15. Endpoint tidak ditemukan",
    );

    const notFound =
      await request(
        app,
      )
        .get(
          "/api/tidak-ada",
        )
        .expect(404);

    assert(
      notFound.body.success ===
        false,
      "404 response salah.",
    );

    console.log(
      "BERHASIL:",
      notFound.body,
    );

    judul(
      "SEMUA TEST API KLINIS BERHASIL",
    );
  } finally {
    console.log(
      "\nMembersihkan fixture...",
    );

    try {
      await cleanup();

      console.log(
        "Fixture berhasil dibersihkan.",
      );
    } catch (
      error
    ) {
      console.error(
        "Cleanup fixture gagal:",
        error,
      );
    }
  }
}

// ============================================================
// RUN
// ============================================================

main().catch(
  (error) => {
    judul(
      "TEST API KLINIS GAGAL",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);