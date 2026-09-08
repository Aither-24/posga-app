import assert from "node:assert/strict";

import {
  and,
  eq,
} from "drizzle-orm";

import {
  db,
} from "../db/index.js";

import {
  hasilPemeriksaan,
  indikator,
  lokasi,
  peserta,
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
} from "../db/schema.js";

import {
  ambilHasilPemeriksaanById,
  ambilHasilPemeriksaanPesertaSesi,
  hapusHasilPemeriksaan,
  tambahHasilPemeriksaan,
  updateHasilPemeriksaan,
} from "../lib/pemeriksaan.service.js";

// ============================================================
// FIXTURE
// ============================================================

const NIK =
  "3578000000099911";

const NAMA_LOKASI =
  "LOKASI TEST DERIVED IMT";

const NAMA_POSYANDU =
  "POSYANDU TEST DERIVED IMT";

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

async function ambilIndikator(
  kode: string,
) {
  const rows =
    await db
      .select({
        id:
          indikator.id,

        kode:
          indikator.kode,

        nama:
          indikator.nama,

        derived:
          indikator.derived,

        tipeInput:
          indikator.tipeInput,

        satuan:
          indikator.satuan,

        aktif:
          indikator.aktif,
      })
      .from(
        indikator,
      )
      .where(
        eq(
          indikator.kode,
          kode,
        ),
      )
      .limit(1);

  const data =
    rows[0];

  assert(
    data,
    `Indikator ${kode} tidak ditemukan.`,
  );

  return data;
}

async function ambilHasilByKode(
  pesertaSesiId: number,
  kode: string,
) {
  const rows =
    await db
      .select({
        id:
          hasilPemeriksaan.id,

        pesertaSesiPosgaId:
          hasilPemeriksaan.pesertaSesiPosgaId,

        indikatorId:
          hasilPemeriksaan.indikatorId,

        kode:
          indikator.kode,

        derived:
          indikator.derived,

        nilaiNumber:
          hasilPemeriksaan.nilaiNumber,

        catatan:
          hasilPemeriksaan.catatan,
      })
      .from(
        hasilPemeriksaan,
      )
      .innerJoin(
        indikator,
        eq(
          indikator.id,
          hasilPemeriksaan.indikatorId,
        ),
      )
      .where(
        and(
          eq(
            hasilPemeriksaan.pesertaSesiPosgaId,
            pesertaSesiId,
          ),

          eq(
            indikator.kode,
            kode,
          ),
        ),
      )
      .limit(1);

  return (
    rows[0] ??
    null
  );
}

// ============================================================
// CLEANUP
// ============================================================

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
          NIK,
        ),
      );

  for (
    const row of rosterRows
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
  }

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
    const item of posyanduRows
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
        "Peserta Test Derived IMT",

      tanggalLahir:
        "1990-01-01",

      jenisKelamin:
        "P",

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
          "2026-09-04",

        status:
          "aktif",

        catatan:
          "Fixture derived IMT.",
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
      .values({
        sesiPosgaId:
          sesi.id,

        pesertaNik:
          NIK,

        kategoriSaatItu:
          "dewasa",

        sumberKategori:
          "usia",

        statusPemeriksaan:
          "belum_diperiksa",
      })
      .returning();

  const roster =
    rosterRows[0];

  assert(
    roster,
    "Fixture roster gagal.",
  );

  return {
    sesiId:
      sesi.id,

    pesertaSesiId:
      roster.id,
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  judul(
    "TEST DERIVED INDICATOR IMT",
  );

  try {
    await cleanup();

    const fixtureData =
      await fixture();

    const pesertaSesiId =
      fixtureData.pesertaSesiId;

    const bb =
      await ambilIndikator(
        "BB",
      );

    const tb =
      await ambilIndikator(
        "TB",
      );

    const imt =
      await ambilIndikator(
        "IMT",
      );

    // ========================================================
    // 1. MASTER
    // ========================================================

    console.log(
      "\n1. Validasi master BB, TB, IMT",
    );

    assert.equal(
      bb.derived,
      false,
    );

    assert.equal(
      tb.derived,
      false,
    );

    assert.equal(
      imt.derived,
      true,
    );

    assert.equal(
      bb.satuan,
      "kg",
    );

    assert.equal(
      tb.satuan,
      "cm",
    );

    assert.equal(
      imt.tipeInput,
      "number",
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 2. TAMBAH BB
    // ========================================================

    console.log(
      "\n2. Tambah BB tanpa TB",
    );

    const hasilBb =
      await tambahHasilPemeriksaan({
        pesertaSesiPosgaId:
          pesertaSesiId,

        indikatorId:
          bb.id,

        nilaiNumber:
          60,

        catatan:
          "BB fixture.",
      });

    assert.equal(
      hasilBb.nilaiNumber,
      60,
    );

    const imtBelumAda =
      await ambilHasilByKode(
        pesertaSesiId,
        "IMT",
      );

    assert.equal(
      imtBelumAda,
      null,
    );

    console.log(
      "BERHASIL: IMT belum dibuat.",
    );

    // ========================================================
    // 3. TAMBAH TB -> IMT OTOMATIS
    // ========================================================

    console.log(
      "\n3. Tambah TB dan hitung IMT otomatis",
    );

    const hasilTb =
      await tambahHasilPemeriksaan({
        pesertaSesiPosgaId:
          pesertaSesiId,

        indikatorId:
          tb.id,

        nilaiNumber:
          165,

        catatan:
          "TB fixture.",
      });

    assert.equal(
      hasilTb.nilaiNumber,
      165,
    );

    const imtOtomatis =
      await ambilHasilByKode(
        pesertaSesiId,
        "IMT",
      );

    assert(
      imtOtomatis,
      "IMT otomatis tidak dibuat.",
    );

    assert.equal(
      imtOtomatis.nilaiNumber,
      22.04,
    );

    assert.equal(
      imtOtomatis.derived,
      true,
    );

    assert.equal(
      imtOtomatis.catatan,
      "Dihitung otomatis dari BB dan TB.",
    );

    console.log(
      "BERHASIL:",
      {
        bb: 60,
        tb: 165,
        imt:
          imtOtomatis.nilaiNumber,
      },
    );

    // ========================================================
    // 4. PASTIKAN HANYA SATU IMT
    // ========================================================

    console.log(
      "\n4. Pastikan hanya satu hasil IMT",
    );

    const semuaHasil =
      await ambilHasilPemeriksaanPesertaSesi(
        pesertaSesiId,
      );

    const daftarImt =
      semuaHasil.filter(
        (
          item,
        ) =>
          item.indikatorKode ===
          "IMT",
      );

    assert.equal(
      daftarImt.length,
      1,
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 5. UPDATE BB -> IMT BERUBAH
    // ========================================================

    console.log(
      "\n5. Koreksi BB dan hitung ulang IMT",
    );

    await updateHasilPemeriksaan(
      hasilBb.id,
      {
        nilaiNumber:
          66,
      },
    );

    const imtSetelahBb =
      await ambilHasilByKode(
        pesertaSesiId,
        "IMT",
      );

    assert(
      imtSetelahBb,
      "IMT hilang setelah koreksi BB.",
    );

    assert.equal(
      imtSetelahBb.nilaiNumber,
      24.24,
    );

    console.log(
      "BERHASIL:",
      {
        bb: 66,
        tb: 165,
        imt:
          imtSetelahBb.nilaiNumber,
      },
    );

    // ========================================================
    // 6. UPDATE TB -> IMT BERUBAH
    // ========================================================

    console.log(
      "\n6. Koreksi TB dan hitung ulang IMT",
    );

    await updateHasilPemeriksaan(
      hasilTb.id,
      {
        nilaiNumber:
          170,
      },
    );

    const imtSetelahTb =
      await ambilHasilByKode(
        pesertaSesiId,
        "IMT",
      );

    assert(
      imtSetelahTb,
      "IMT hilang setelah koreksi TB.",
    );

    // 66 / 1.70^2 = 22.84
    assert.equal(
      imtSetelahTb.nilaiNumber,
      22.84,
    );

    console.log(
      "BERHASIL:",
      {
        bb: 66,
        tb: 170,
        imt:
          imtSetelahTb.nilaiNumber,
      },
    );

    // ========================================================
    // 7. TOLAK INPUT IMT MANUAL
    // ========================================================

    console.log(
      "\n7. Tolak input IMT manual",
    );

    let tambahManualDitolak =
      false;

    try {
      await tambahHasilPemeriksaan({
        pesertaSesiPosgaId:
          pesertaSesiId,

        indikatorId:
          imt.id,

        nilaiNumber:
          99,
      });
    } catch (error) {
      tambahManualDitolak =
        true;

      assert(
        error instanceof Error,
      );

      assert.match(
        error.message,
        /derived/i,
      );

      console.log(
        "BERHASIL:",
        error.message,
      );
    }

    assert.equal(
      tambahManualDitolak,
      true,
    );

    // ========================================================
    // 8. TOLAK UPDATE IMT MANUAL
    // ========================================================

    console.log(
      "\n8. Tolak update IMT manual",
    );

    const imtUntukUpdate =
      await ambilHasilByKode(
        pesertaSesiId,
        "IMT",
      );

    assert(
      imtUntukUpdate,
    );

    let updateManualDitolak =
      false;

    try {
      await updateHasilPemeriksaan(
        imtUntukUpdate.id,
        {
          nilaiNumber:
            50,
        },
      );
    } catch (error) {
      updateManualDitolak =
        true;

      assert(
        error instanceof Error,
      );

      assert.match(
        error.message,
        /derived/i,
      );

      console.log(
        "BERHASIL:",
        error.message,
      );
    }

    assert.equal(
      updateManualDitolak,
      true,
    );

    const imtTidakBerubah =
      await ambilHasilByKode(
        pesertaSesiId,
        "IMT",
      );

    assert.equal(
      imtTidakBerubah
        ?.nilaiNumber,
      22.84,
    );

    // ========================================================
    // 9. TOLAK DELETE IMT MANUAL
    // ========================================================

    console.log(
      "\n9. Tolak hapus IMT manual",
    );

    assert(
      imtTidakBerubah,
    );

    let hapusManualDitolak =
      false;

    try {
      await hapusHasilPemeriksaan(
        imtTidakBerubah.id,
      );
    } catch (error) {
      hapusManualDitolak =
        true;

      assert(
        error instanceof Error,
      );

      assert.match(
        error.message,
        /derived/i,
      );

      console.log(
        "BERHASIL:",
        error.message,
      );
    }

    assert.equal(
      hapusManualDitolak,
      true,
    );

    // ========================================================
    // 10. HAPUS TB -> IMT OTOMATIS HILANG
    // ========================================================

    console.log(
      "\n10. Hapus TB, IMT harus otomatis hilang",
    );

    await hapusHasilPemeriksaan(
      hasilTb.id,
    );

    const tbSetelahHapus =
      await ambilHasilPemeriksaanById(
        hasilTb.id,
      );

    assert.equal(
      tbSetelahHapus,
      null,
    );

    const imtSetelahHapusTb =
      await ambilHasilByKode(
        pesertaSesiId,
        "IMT",
      );

    assert.equal(
      imtSetelahHapusTb,
      null,
    );

    console.log(
      "BERHASIL: IMT otomatis dihapus.",
    );

    // ========================================================
    // 11. TAMBAH TB KEMBALI -> IMT DIBUAT KEMBALI
    // ========================================================

    console.log(
      "\n11. Tambah TB kembali",
    );

    const tbBaru =
      await tambahHasilPemeriksaan({
        pesertaSesiPosgaId:
          pesertaSesiId,

        indikatorId:
          tb.id,

        nilaiNumber:
          180,
      });

    assert.equal(
      tbBaru.nilaiNumber,
      180,
    );

    const imtBaru =
      await ambilHasilByKode(
        pesertaSesiId,
        "IMT",
      );

    assert(
      imtBaru,
      "IMT tidak dibuat kembali.",
    );

    // 66 / 1.80^2 = 20.37
    assert.equal(
      imtBaru.nilaiNumber,
      20.37,
    );

    console.log(
      "BERHASIL:",
      {
        bb: 66,
        tb: 180,
        imt:
          imtBaru.nilaiNumber,
      },
    );

    // ========================================================
    // 12. HAPUS BB -> IMT OTOMATIS HILANG
    // ========================================================

    console.log(
      "\n12. Hapus BB, IMT harus otomatis hilang",
    );

    await hapusHasilPemeriksaan(
      hasilBb.id,
    );

    const imtSetelahHapusBb =
      await ambilHasilByKode(
        pesertaSesiId,
        "IMT",
      );

    assert.equal(
      imtSetelahHapusBb,
      null,
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 13. KONDISI AKHIR
    // ========================================================

    console.log(
      "\n13. Validasi kondisi akhir",
    );

    const akhir =
      await ambilHasilPemeriksaanPesertaSesi(
        pesertaSesiId,
      );

    const kodeAkhir =
      akhir.map(
        (
          item,
        ) =>
          item.indikatorKode,
      );

    assert.equal(
      kodeAkhir.includes(
        "BB",
      ),
      false,
    );

    assert.equal(
      kodeAkhir.includes(
        "IMT",
      ),
      false,
    );

    assert.equal(
      kodeAkhir.includes(
        "TB",
      ),
      true,
    );

    console.log(
      "BERHASIL:",
      kodeAkhir,
    );

    judul(
      "SEMUA TEST DERIVED IMT BERHASIL",
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
  (
    error,
  ) => {
    judul(
      "TEST DERIVED IMT GAGAL",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);