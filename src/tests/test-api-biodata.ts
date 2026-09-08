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
  biodataAnak,
  biodataDewasa,
  peserta,
} from "../db/schema.js";

// ============================================================
// CONFIG
// ============================================================

const NIK_ANAK =
  "3578000000099601";

const NIK_DEWASA =
  "3578000000099602";

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
// OUTPUT
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
  await db
    .delete(
      biodataAnak,
    )
    .where(
      eq(
        biodataAnak.pesertaNik,
        NIK_ANAK,
      ),
    );

  await db
    .delete(
      biodataDewasa,
    )
    .where(
      eq(
        biodataDewasa.pesertaNik,
        NIK_DEWASA,
      ),
    );

  await db
    .delete(
      peserta,
    )
    .where(
      eq(
        peserta.nik,
        NIK_ANAK,
      ),
    );

  await db
    .delete(
      peserta,
    )
    .where(
      eq(
        peserta.nik,
        NIK_DEWASA,
      ),
    );
}

// ============================================================
// BUAT FIXTURE
// ============================================================

async function buatFixture() {
  await cleanup();

  await db
    .insert(
      peserta,
    )
    .values({
      nik:
        NIK_ANAK,

      nama:
        "Anak Test Biodata",

      tanggalLahir:
        "2022-03-10",

      jenisKelamin:
        "P",

      aktif:
        true,
    });

  await db
    .insert(
      peserta,
    )
    .values({
      nik:
        NIK_DEWASA,

      nama:
        "Dewasa Test Biodata",

      tanggalLahir:
        "1990-01-10",

      jenisKelamin:
        "P",

      aktif:
        true,
    });
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  judul(
    "TEST API BIODATA POSGA",
  );

  try {
    await buatFixture();

    // ========================================================
    // 1. GET BIODATA AWAL ANAK
    // ========================================================

    console.log(
      "\n1. GET biodata anak sebelum diisi",
    );

    const awalAnak =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK_ANAK}/biodata`,
        )
        .expect(200);

    assert(
      awalAnak.body.success ===
        true,
      "GET biodata anak gagal.",
    );

    assert(
      awalAnak.body.data
        .biodataAnak ===
        null,
      "Biodata anak seharusnya masih null.",
    );

    console.log(
      "BERHASIL:",
      awalAnak.body.data,
    );

    // ========================================================
    // 2. INSERT BIODATA ANAK
    // ========================================================

    console.log(
      "\n2. PUT biodata anak pertama kali",
    );

    const simpanAnak =
      await request(
        app,
      )
        .put(
          `/api/peserta/${NIK_ANAK}/biodata-anak`,
        )
        .send({
          namaIbuKandung:
            "Siti Aminah",

          nikIbuKandung:
            "3578000000000001",

          anakKe:
            2,

          imd:
            true,

          bblGram:
            3200,

          pblCm:
            49,
        })
        .expect(200);

    assert(
      simpanAnak.body.success ===
        true,
      "Simpan biodata anak gagal.",
    );

    assert(
      simpanAnak.body.data
        .pesertaNik ===
        NIK_ANAK,
      "NIK biodata anak tidak sesuai.",
    );

    assert(
      simpanAnak.body.data
        .anakKe ===
        2,
      "Anak ke tidak sesuai.",
    );

    assert(
      simpanAnak.body.data
        .imd ===
        true,
      "Nilai IMD tidak sesuai.",
    );

    assert(
      simpanAnak.body.data
        .bblGram ===
        3200,
      "BBL tidak sesuai.",
    );

    console.log(
      "BERHASIL:",
      simpanAnak.body.data,
    );

    // ========================================================
    // 3. READ BIODATA ANAK
    // ========================================================

    console.log(
      "\n3. GET biodata anak setelah diisi",
    );

    const bacaAnak =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK_ANAK}/biodata`,
        )
        .expect(200);

    assert(
      bacaAnak.body.data
        .biodataAnak
        .namaIbuKandung ===
        "Siti Aminah",
      "Nama ibu kandung tidak terbaca.",
    );

    assert(
      bacaAnak.body.data
        .biodataDewasa ===
        null,
      "Biodata dewasa peserta anak seharusnya null.",
    );

    console.log(
      "BERHASIL:",
      bacaAnak.body.data,
    );

    // ========================================================
    // 4. UPDATE BIODATA ANAK
    // ========================================================

    console.log(
      "\n4. PUT update biodata anak",
    );

    const updateAnak =
      await request(
        app,
      )
        .put(
          `/api/peserta/${NIK_ANAK}/biodata-anak`,
        )
        .send({
          anakKe:
            3,

          bblGram:
            3250,

          pblCm:
            50,
        })
        .expect(200);

    assert(
      updateAnak.body.data
        .anakKe ===
        3,
      "Update anak ke gagal.",
    );

    assert(
      updateAnak.body.data
        .bblGram ===
        3250,
      "Update BBL gagal.",
    );

    assert(
      updateAnak.body.data
        .namaIbuKandung ===
        "Siti Aminah",
      "Partial update menghapus nama ibu.",
    );

    console.log(
      "BERHASIL:",
      updateAnak.body.data,
    );

    // ========================================================
    // 5. VALIDASI NIK IBU INVALID
    // ========================================================

    console.log(
      "\n5. Validasi NIK ibu invalid",
    );

    const nikIbuInvalid =
      await request(
        app,
      )
        .put(
          `/api/peserta/${NIK_ANAK}/biodata-anak`,
        )
        .send({
          nikIbuKandung:
            "12345",
        })
        .expect(400);

    assert(
      nikIbuInvalid.body
        .success ===
        false,
      "NIK ibu invalid harus ditolak.",
    );

    console.log(
      "BERHASIL:",
      nikIbuInvalid.body,
    );

    // ========================================================
    // 6. VALIDASI NILAI ANAK INVALID
    // ========================================================

    console.log(
      "\n6. Validasi anak ke invalid",
    );

    const anakKeInvalid =
      await request(
        app,
      )
        .put(
          `/api/peserta/${NIK_ANAK}/biodata-anak`,
        )
        .send({
          anakKe:
            0,
        })
        .expect(400);

    assert(
      anakKeInvalid.body
        .success ===
        false,
      "Anak ke 0 harus ditolak.",
    );

    console.log(
      "BERHASIL:",
      anakKeInvalid.body,
    );

    // ========================================================
    // 7. BIODATA DEWASA AWAL
    // ========================================================

    console.log(
      "\n7. GET biodata dewasa sebelum diisi",
    );

    const awalDewasa =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK_DEWASA}/biodata`,
        )
        .expect(200);

    assert(
      awalDewasa.body.data
        .biodataDewasa ===
        null,
      "Biodata dewasa seharusnya null.",
    );

    console.log(
      "BERHASIL:",
      awalDewasa.body.data,
    );

    // ========================================================
    // 8. INSERT BIODATA DEWASA
    // ========================================================

    console.log(
      "\n8. PUT biodata dewasa pertama kali",
    );

    const simpanDewasa =
      await request(
        app,
      )
        .put(
          `/api/peserta/${NIK_DEWASA}/biodata-dewasa`,
        )
        .send({
          namaPasangan:
            "Budi Santoso",

          nikPasangan:
            "3578000000000002",

          jumlahAnak:
            2,

          kbYangDiikuti:
            "Suntik 3 Bulan",

          alasanTidakBerKb:
            null,

          rpdHt:
            false,

          rpdDm:
            false,
        })
        .expect(200);

    assert(
      simpanDewasa.body.success ===
        true,
      "Simpan biodata dewasa gagal.",
    );

    assert(
      simpanDewasa.body.data
        .namaPasangan ===
        "Budi Santoso",
      "Nama pasangan tidak sesuai.",
    );

    assert(
      simpanDewasa.body.data
        .jumlahAnak ===
        2,
      "Jumlah anak tidak sesuai.",
    );

    assert(
      simpanDewasa.body.data
        .kbYangDiikuti ===
        "Suntik 3 Bulan",
      "KB tidak sesuai.",
    );

    console.log(
      "BERHASIL:",
      simpanDewasa.body.data,
    );

    // ========================================================
    // 9. READ BIODATA DEWASA
    // ========================================================

    console.log(
      "\n9. GET biodata dewasa setelah diisi",
    );

    const bacaDewasa =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK_DEWASA}/biodata`,
        )
        .expect(200);

    assert(
      bacaDewasa.body.data
        .biodataDewasa
        .namaPasangan ===
        "Budi Santoso",
      "Biodata dewasa tidak terbaca.",
    );

    assert(
      bacaDewasa.body.data
        .biodataAnak ===
        null,
      "Biodata anak peserta dewasa seharusnya null.",
    );

    console.log(
      "BERHASIL:",
      bacaDewasa.body.data,
    );

    // ========================================================
    // 10. UPDATE BIODATA DEWASA
    // ========================================================

    console.log(
      "\n10. PUT update biodata dewasa",
    );

    const updateDewasa =
      await request(
        app,
      )
        .put(
          `/api/peserta/${NIK_DEWASA}/biodata-dewasa`,
        )
        .send({
          jumlahAnak:
            3,

          kbYangDiikuti:
            null,

          alasanTidakBerKb:
            "Belum memilih metode KB",

          rpdHt:
            true,
        })
        .expect(200);

    assert(
      updateDewasa.body.data
        .jumlahAnak ===
        3,
      "Update jumlah anak gagal.",
    );

    assert(
      updateDewasa.body.data
        .kbYangDiikuti ===
        null,
      "KB seharusnya null.",
    );

    assert(
      updateDewasa.body.data
        .alasanTidakBerKb ===
        "Belum memilih metode KB",
      "Alasan tidak ber-KB gagal disimpan.",
    );

    assert(
      updateDewasa.body.data
        .rpdHt ===
        true,
      "Update RPD HT gagal.",
    );

    assert(
      updateDewasa.body.data
        .namaPasangan ===
        "Budi Santoso",
      "Partial update menghapus nama pasangan.",
    );

    console.log(
      "BERHASIL:",
      updateDewasa.body.data,
    );

    // ========================================================
    // 11. VALIDASI NIK PASANGAN INVALID
    // ========================================================

    console.log(
      "\n11. Validasi NIK pasangan invalid",
    );

    const nikPasanganInvalid =
      await request(
        app,
      )
        .put(
          `/api/peserta/${NIK_DEWASA}/biodata-dewasa`,
        )
        .send({
          nikPasangan:
            "888",
        })
        .expect(400);

    assert(
      nikPasanganInvalid.body
        .success ===
        false,
      "NIK pasangan invalid harus ditolak.",
    );

    console.log(
      "BERHASIL:",
      nikPasanganInvalid.body,
    );

    // ========================================================
    // 12. VALIDASI JUMLAH ANAK INVALID
    // ========================================================

    console.log(
      "\n12. Validasi jumlah anak invalid",
    );

    const jumlahAnakInvalid =
      await request(
        app,
      )
        .put(
          `/api/peserta/${NIK_DEWASA}/biodata-dewasa`,
        )
        .send({
          jumlahAnak:
            -1,
        })
        .expect(400);

    assert(
      jumlahAnakInvalid.body
        .success ===
        false,
      "Jumlah anak negatif harus ditolak.",
    );

    console.log(
      "BERHASIL:",
      jumlahAnakInvalid.body,
    );

    // ========================================================
    // 13. NIK PESERTA INVALID
    // ========================================================

    console.log(
      "\n13. Validasi NIK peserta invalid",
    );

    const nikInvalid =
      await request(
        app,
      )
        .get(
          "/api/peserta/123/biodata",
        )
        .expect(400);

    assert(
      nikInvalid.body
        .success ===
        false,
      "NIK peserta invalid harus menghasilkan 400.",
    );

    console.log(
      "BERHASIL:",
      nikInvalid.body,
    );

    // ========================================================
    // 14. PESERTA TIDAK DITEMUKAN
    // ========================================================

    console.log(
      "\n14. Peserta tidak ditemukan",
    );

    const tidakAda =
      await request(
        app,
      )
        .get(
          "/api/peserta/9999999999999999/biodata",
        )
        .expect(404);

    assert(
      tidakAda.body
        .success ===
        false,
      "Peserta tidak ditemukan harus menghasilkan 404.",
    );

    console.log(
      "BERHASIL:",
      tidakAda.body,
    );

    // ========================================================
    // 15. DELETE BIODATA ANAK
    // ========================================================

    console.log(
      "\n15. DELETE biodata anak",
    );

    const deleteAnak =
      await request(
        app,
      )
        .delete(
          `/api/peserta/${NIK_ANAK}/biodata-anak`,
        )
        .expect(200);

    assert(
      deleteAnak.body
        .data
        .berhasil ===
        true,
      "Delete biodata anak gagal.",
    );

    const setelahDeleteAnak =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK_ANAK}/biodata`,
        )
        .expect(200);

    assert(
      setelahDeleteAnak.body
        .data
        .biodataAnak ===
        null,
      "Biodata anak masih ada setelah delete.",
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 16. DELETE BIODATA DEWASA
    // ========================================================

    console.log(
      "\n16. DELETE biodata dewasa",
    );

    const deleteDewasa =
      await request(
        app,
      )
        .delete(
          `/api/peserta/${NIK_DEWASA}/biodata-dewasa`,
        )
        .expect(200);

    assert(
      deleteDewasa.body
        .data
        .berhasil ===
        true,
      "Delete biodata dewasa gagal.",
    );

    const setelahDeleteDewasa =
      await request(
        app,
      )
        .get(
          `/api/peserta/${NIK_DEWASA}/biodata`,
        )
        .expect(200);

    assert(
      setelahDeleteDewasa.body
        .data
        .biodataDewasa ===
        null,
      "Biodata dewasa masih ada setelah delete.",
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // SELESAI
    // ========================================================

    judul(
      "SEMUA TEST API BIODATA BERHASIL",
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
    } catch (error) {
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
      "TEST API BIODATA GAGAL",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);