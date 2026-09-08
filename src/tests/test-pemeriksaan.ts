import {
  eq,
} from "drizzle-orm";

import { db } from "../db/index.js";

import {
  hasilPemeriksaan,
  lokasi,
  peserta,
  pesertaPosyandu,
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
} from "../db/schema.js";

import {
  generateFormPesertaSesi,
} from "../lib/rule-engine.service.js";

import {
  ambilHasilPemeriksaanById,
  ambilHasilPemeriksaanPesertaSesi,
  hapusHasilPemeriksaan,
  tambahHasilPemeriksaan,
  updateHasilPemeriksaan,
} from "../lib/pemeriksaan.service.js";

// ============================================================
// KONFIGURASI FIXTURE
// ============================================================

const NIK =
  "3578000000099101";

const NAMA_LOKASI =
  "LOKASI TEST PEMERIKSAAN";

const NAMA_POSYANDU =
  "POSYANDU TEST PEMERIKSAAN";

const TANGGAL_SESI =
  "2026-09-03";

// ============================================================
// ASSERT
// ============================================================

function assert(
  kondisi: unknown,
  pesan: string
): asserts kondisi {
  if (!kondisi) {
    throw new Error(
      `ASSERT GAGAL: ${pesan}`
    );
  }
}

// ============================================================
// JUDUL
// ============================================================

function judul(
  teks: string
) {
  console.log(
    "\n========================================"
  );

  console.log(teks);

  console.log(
    "========================================"
  );
}

// ============================================================
// CLEANUP
// ============================================================

async function cleanup() {
  // ----------------------------------------------------------
  // Cari peserta sesi fixture
  // ----------------------------------------------------------

  const pesertaSesiRows =
    await db
      .select({
        id:
          pesertaSesiPosga.id,
      })
      .from(
        pesertaSesiPosga
      )
      .where(
        eq(
          pesertaSesiPosga.pesertaNik,
          NIK
        )
      );

  for (
    const row
    of pesertaSesiRows
  ) {
    await db
      .delete(
        hasilPemeriksaan
      )
      .where(
        eq(
          hasilPemeriksaan.pesertaSesiPosgaId,
          row.id
        )
      );
  }

  await db
    .delete(
      pesertaSesiPosga
    )
    .where(
      eq(
        pesertaSesiPosga.pesertaNik,
        NIK
      )
    );

  await db
    .delete(
      pesertaPosyandu
    )
    .where(
      eq(
        pesertaPosyandu.pesertaNik,
        NIK
      )
    );

  await db
    .delete(
      peserta
    )
    .where(
      eq(
        peserta.nik,
        NIK
      )
    );

  const posyanduRows =
    await db
      .select({
        id:
          posyandu.id,
      })
      .from(
        posyandu
      )
      .where(
        eq(
          posyandu.nama,
          NAMA_POSYANDU
        )
      );

  for (
    const item
    of posyanduRows
  ) {
    await db
      .delete(
        sesiPosga
      )
      .where(
        eq(
          sesiPosga.posyanduId,
          item.id
        )
      );
  }

  await db
    .delete(
      posyandu
    )
    .where(
      eq(
        posyandu.nama,
        NAMA_POSYANDU
      )
    );

  await db
    .delete(
      lokasi
    )
    .where(
      eq(
        lokasi.nama,
        NAMA_LOKASI
      )
    );
}

// ============================================================
// FIXTURE
// ============================================================

async function buatFixture() {
  await cleanup();

  const lokasiRows =
    await db
      .insert(
        lokasi
      )
      .values({
        nama:
          NAMA_LOKASI,

        alamat:
          "Fixture CRUD pemeriksaan",

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
    "Lokasi gagal dibuat."
  );

  const posyanduRows =
    await db
      .insert(
        posyandu
      )
      .values({
        lokasiId,

        nama:
          NAMA_POSYANDU,

        alamat:
          "Fixture CRUD pemeriksaan",

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
    "Posyandu gagal dibuat."
  );

  await db
    .insert(
      peserta
    )
    .values({
      nik:
        NIK,

      nama:
        "Balita Test Pemeriksaan",

      tanggalLahir:
        "2022-03-10",

      jenisKelamin:
        "P",

      aktif:
        true,
    });

  await db
    .insert(
      pesertaPosyandu
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
        sesiPosga
      )
      .values({
        posyanduId,

        tanggalPosga:
          TANGGAL_SESI,

        status:
          "aktif",

        catatan:
          "Fixture CRUD pemeriksaan",
      })
      .returning({
        id:
          sesiPosga.id,
      });

  const sesiId =
    sesiRows[0]?.id;

  assert(
    sesiId,
    "Sesi gagal dibuat."
  );

  const pesertaSesiRows =
    await db
      .insert(
        pesertaSesiPosga
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
    "Peserta sesi gagal dibuat."
  );

  return {
    pesertaSesiId,
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  judul(
    "TEST CRUD HASIL PEMERIKSAAN"
  );

  try {
    // ========================================================
    // FIXTURE
    // ========================================================

    const fixture =
      await buatFixture();

    console.log(
      "\nFixture dibuat:",
      fixture
    );

    // ========================================================
    // AMBIL FORM DARI RULE ENGINE
    //
    // Kita tidak hard-code ID indikator.
    // Cari indikator pemeriksaan number yang benar-benar
    // berlaku untuk Balita.
    // ========================================================

    const form =
      await generateFormPesertaSesi(
        fixture.pesertaSesiId
      );

    const indikatorNumber =
      form.pemeriksaan.find(
        (item) =>
          item.tipeInput ===
            "number" &&
          !item.derived &&
          item.statusKelayakan ===
            "tampil"
      );

    assert(
      indikatorNumber,
      "Tidak ditemukan indikator pemeriksaan number yang dapat diuji."
    );

    console.log(
      "\nIndikator test:",
      {
        id:
          indikatorNumber.indikatorId,

        kode:
          indikatorNumber.kode,

        nama:
          indikatorNumber.nama,

        tipe:
          indikatorNumber.tipeInput,

        satuan:
          indikatorNumber.satuan,
      }
    );

    // ========================================================
    // 1. CREATE
    // ========================================================

    console.log(
      "\n1. Tambah hasil pemeriksaan"
    );

    const dibuat =
      await tambahHasilPemeriksaan({
        pesertaSesiPosgaId:
          fixture.pesertaSesiId,

        indikatorId:
          indikatorNumber.indikatorId,

        nilaiNumber:
          15.5,

        catatan:
          "Data fixture pemeriksaan.",
      });

    assert(
      dibuat.nilaiNumber ===
        15.5,
      "Nilai hasil create tidak sesuai."
    );

    console.log(
      "BERHASIL:",
      dibuat
    );

    // ========================================================
    // 2. READ BY ID
    // ========================================================

    console.log(
      "\n2. Read by ID"
    );

    const dibaca =
      await ambilHasilPemeriksaanById(
        dibuat.id
      );

    assert(
      dibaca,
      "Data hasil pemeriksaan tidak ditemukan."
    );

    assert(
      dibaca.id ===
        dibuat.id,
      "ID read tidak sesuai."
    );

    console.log(
      "BERHASIL:",
      dibaca
    );

    // ========================================================
    // 3. LIST PESERTA SESI
    // ========================================================

    console.log(
      "\n3. List hasil pemeriksaan peserta sesi"
    );

    const daftar =
      await ambilHasilPemeriksaanPesertaSesi(
        fixture.pesertaSesiId
      );

    assert(
      daftar.length ===
        1,
      `Jumlah hasil seharusnya 1, aktual ${daftar.length}.`
    );

    console.log(
      "BERHASIL. Jumlah:",
      daftar.length
    );

    // ========================================================
    // 4. DUPLIKAT
    // ========================================================

    console.log(
      "\n4. Validasi duplikat indikator"
    );

    let duplikatDitolak =
      false;

    try {
      await tambahHasilPemeriksaan({
        pesertaSesiPosgaId:
          fixture.pesertaSesiId,

        indikatorId:
          indikatorNumber.indikatorId,

        nilaiNumber:
          16,
      });
    } catch {
      duplikatDitolak =
        true;
    }

    assert(
      duplikatDitolak,
      "Duplikat indikator harus ditolak."
    );

    console.log(
      "BERHASIL: duplikat ditolak."
    );

    // ========================================================
    // 5. VALIDASI TYPE
    // ========================================================

    console.log(
      "\n5. Validasi tipe input"
    );

    // Hapus dulu karena unique indikator akan menghalangi
    // test validasi nilai.
    await hapusHasilPemeriksaan(
      dibuat.id
    );

    let nilaiSalahDitolak =
      false;

    try {
      await tambahHasilPemeriksaan({
        pesertaSesiPosgaId:
          fixture.pesertaSesiId,

        indikatorId:
          indikatorNumber.indikatorId,

        nilaiText:
          "bukan number",
      });
    } catch {
      nilaiSalahDitolak =
        true;
    }

    assert(
      nilaiSalahDitolak,
      "Indikator number tanpa nilaiNumber harus ditolak."
    );

    console.log(
      "BERHASIL: tipe tidak sesuai ditolak."
    );

    // ========================================================
    // 6. CREATE LAGI UNTUK UPDATE
    // ========================================================

    const untukUpdate =
      await tambahHasilPemeriksaan({
        pesertaSesiPosgaId:
          fixture.pesertaSesiId,

        indikatorId:
          indikatorNumber.indikatorId,

        nilaiNumber:
          15.5,

        catatan:
          "Sebelum koreksi.",
      });

    // ========================================================
    // 7. UPDATE
    // ========================================================

    console.log(
      "\n6. Update hasil pemeriksaan"
    );

    const diupdate =
      await updateHasilPemeriksaan(
        untukUpdate.id,
        {
          nilaiNumber:
            16.25,

          catatan:
            "Nilai dikoreksi.",
        }
      );

    assert(
      diupdate.nilaiNumber ===
        16.25,
      "Nilai setelah update tidak sesuai."
    );

    assert(
      diupdate.catatan ===
        "Nilai dikoreksi.",
      "Catatan update tidak sesuai."
    );

    console.log(
      "BERHASIL:",
      diupdate
    );

    // ========================================================
    // 8. DELETE
    // ========================================================

    console.log(
      "\n7. Hapus hasil pemeriksaan"
    );

    await hapusHasilPemeriksaan(
      untukUpdate.id
    );

    const sesudahHapus =
      await ambilHasilPemeriksaanById(
        untukUpdate.id
      );

    assert(
      sesudahHapus ===
        null,
      "Data masih ada setelah dihapus."
    );

    console.log(
      "BERHASIL: data terhapus."
    );

    // ========================================================
    // SELESAI
    // ========================================================

    judul(
      "SEMUA TEST CRUD PEMERIKSAAN BERHASIL"
    );
  } finally {
    console.log(
      "\nMembersihkan fixture..."
    );

    await cleanup();

    console.log(
      "Fixture berhasil dibersihkan."
    );
  }
}

// ============================================================
// RUN
// ============================================================

main().catch(
  (error) => {
    judul(
      "TEST CRUD PEMERIKSAAN GAGAL"
    );

    console.error(
      error
    );

    process.exitCode =
      1;
  }
);