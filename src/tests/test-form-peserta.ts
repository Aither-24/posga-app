import {
  eq,
} from "drizzle-orm";

import { db } from "../db/index.js";

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

import {
  ambilFormPesertaTerpadu,
  sinkronkanStatusPemeriksaanPeserta,
} from "../lib/form-peserta.service.js";

import {
  tambahHasilPemeriksaan,
} from "../lib/pemeriksaan.service.js";

import {
  tambahHasilSkrining,
} from "../lib/skrining.service.js";

import {
  tambahHasilKonseling,
} from "../lib/konseling.service.js";

// ============================================================
// FIXTURE CONFIG
// ============================================================

const NIK =
  "3578000000099301";

const NAMA_LOKASI =
  "LOKASI TEST FORM TERPADU";

const NAMA_POSYANDU =
  "POSYANDU TEST FORM TERPADU";

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
// FIXTURE
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
          "Fixture form terpadu",

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
          "Fixture form terpadu",

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
        "Balita Test Form Terpadu",

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
          "Fixture form terpadu",
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
    "TEST FORM PESERTA TERPADU",
  );

  try {
    const fixture =
      await buatFixture();

    console.log(
      "\nFixture:",
      fixture,
    );

    // ========================================================
    // 1. FORM AWAL
    // ========================================================

    console.log(
      "\n1. Ambil form awal",
    );

    let form =
      await ambilFormPesertaTerpadu(
        fixture.pesertaSesiId,
      );

    assert(
      form.pesertaNik ===
        NIK,
      "NIK form tidak sesuai.",
    );

    assert(
      form.kategori ===
        "balita",
      "Kategori harus Balita.",
    );

    console.log(
      "BERHASIL:",
      {
        pesertaSesiId:
          form.pesertaSesiId,

        nama:
          form.nama,

        kategori:
          form.kategori,

        umur:
          form.umur,

        progres:
          form.progres,

        rekomendasiStatus:
          form.rekomendasiStatus,
      },
    );

    // ========================================================
    // 2. BB
    // ========================================================

    console.log(
      "\n2. Isi pemeriksaan BB",
    );

    const bb =
      form.pemeriksaan.find(
        (item) =>
          item.kode ===
          "BB",
      );

    assert(
      bb,
      "Indikator BB tidak ditemukan.",
    );

    await tambahHasilPemeriksaan({
      pesertaSesiPosgaId:
        fixture.pesertaSesiId,

      indikatorId:
        bb.indikatorId,

      nilaiNumber:
        15.5,

      catatan:
        "Berat badan fixture.",
    });

    form =
      await ambilFormPesertaTerpadu(
        fixture.pesertaSesiId,
      );

    const bbSesudah =
      form.pemeriksaan.find(
        (item) =>
          item.kode ===
          "BB",
      );

    assert(
      bbSesudah,
      "BB tidak ditemukan setelah pengisian.",
    );

    assert(
      bbSesudah.terisi ===
        true,
      "BB harus berstatus terisi.",
    );

    assert(
      bbSesudah.hasilSaatIni?.nilaiNumber ===
        15.5,
      "Nilai BB pada form terpadu tidak sesuai.",
    );

    console.log(
      "BERHASIL:",
      bbSesudah.hasilSaatIni,
    );

    // ========================================================
    // 3. SKRINING GILUT
    // ========================================================

    console.log(
      "\n3. Isi skrining Gilut",
    );

    const gilut =
      form.skrining.find(
        (item) =>
          item.kode ===
          "SKRINING_GILUT",
      );

    assert(
      gilut,
      "SKRINING_GILUT tidak ditemukan.",
    );

    const opsiGilut =
      gilut.opsi[0];

    assert(
      opsiGilut,
      "Opsi Gilut tidak ditemukan.",
    );

    await tambahHasilSkrining({
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
        "Skrining Gilut fixture.",
    });

    form =
      await ambilFormPesertaTerpadu(
        fixture.pesertaSesiId,
      );

    const gilutSesudah =
      form.skrining.find(
        (item) =>
          item.kode ===
          "SKRINING_GILUT",
      );

    assert(
      gilutSesudah,
      "Gilut tidak ditemukan setelah penyimpanan.",
    );

    assert(
      gilutSesudah.terisi ===
        true,
      "Gilut harus berstatus terisi.",
    );

    assert(
      gilutSesudah.hasilSaatIni?.sumber ===
        "posga",
      "Hasil Gilut sesi harus berasal dari POSGA.",
    );

    console.log(
      "BERHASIL:",
      gilutSesudah.hasilSaatIni,
    );

    // ========================================================
    // 4. KONSELING MULTISELECT
    // ========================================================

    console.log(
      "\n4. Isi konseling Balita",
    );

    const konseling =
      form.konseling.find(
        (item) =>
          item.kode ===
          "KONSELING_BALITA",
      );

    assert(
      konseling,
      "KONSELING_BALITA tidak ditemukan.",
    );

    assert(
      konseling.opsi.length >=
        2,
      "Konseling Balita membutuhkan minimal dua opsi untuk test.",
    );

    const opsi1 =
      konseling.opsi[0];

    const opsi2 =
      konseling.opsi[1];

    assert(
      opsi1,
      "Opsi pertama tidak ditemukan.",
    );

    assert(
      opsi2,
      "Opsi kedua tidak ditemukan.",
    );

    await tambahHasilKonseling({
      pesertaSesiPosgaId:
        fixture.pesertaSesiId,

      indikatorId:
        konseling.indikatorId,

      opsiIds: [
        opsi1.id,
        opsi2.id,
      ],

      catatan:
        "Konseling fixture.",
    });

    form =
      await ambilFormPesertaTerpadu(
        fixture.pesertaSesiId,
      );

    const konselingSesudah =
      form.konseling.find(
        (item) =>
          item.kode ===
          "KONSELING_BALITA",
      );

    assert(
      konselingSesudah,
      "Konseling tidak ditemukan setelah penyimpanan.",
    );

    assert(
      konselingSesudah.terisi ===
        true,
      "Konseling harus terisi.",
    );

    assert(
      konselingSesudah.hasilSaatIni
        ?.opsiTerpilih.length ===
        2,
      "Dua opsi konseling harus terbaca kembali.",
    );

    console.log(
      "BERHASIL:",
      konselingSesudah.hasilSaatIni,
    );

    // ========================================================
    // 5. PROGRES
    // ========================================================

    console.log(
      "\n5. Periksa progres",
    );

    console.log(
      "Progres:",
      form.progres,
    );

    assert(
      form.progres.totalTerisi >=
        1,
      "Setelah mengisi data, progres harus mempunyai data terisi.",
    );

    assert(
      form.progres.persen >=
        0 &&
        form.progres.persen <=
          100,
      "Persentase progres harus 0-100.",
    );

    console.log(
      "BERHASIL:",
      {
        totalWajib:
          form.progres.totalWajib,

        totalTerisi:
          form.progres.totalTerisi,

        belum:
          form.progres.totalBelumTerisi,

        persen:
          form.progres.persen,

        lengkap:
          form.progres.lengkap,
      },
    );

    // ========================================================
    // 6. STATUS REKOMENDASI
    // ========================================================

    console.log(
      "\n6. Sinkronkan status pemeriksaan",
    );

    const sinkron =
      await sinkronkanStatusPemeriksaanPeserta(
        fixture.pesertaSesiId,
      );

    console.log(
      "Hasil sinkron:",
      sinkron,
    );

    const formSesudahSinkron =
      await ambilFormPesertaTerpadu(
        fixture.pesertaSesiId,
      );

    assert(
      formSesudahSinkron.statusPemeriksaan ===
        formSesudahSinkron.rekomendasiStatus,
      "Status peserta harus sama dengan rekomendasi setelah sinkron.",
    );

    console.log(
      "BERHASIL:",
      {
        status:
          formSesudahSinkron.statusPemeriksaan,

        rekomendasi:
          formSesudahSinkron.rekomendasiStatus,
      },
    );

    // ========================================================
    // 7. VALIDASI DATA TERPADU
    // ========================================================

    console.log(
      "\n7. Validasi tiga domain klinis",
    );

    assert(
      formSesudahSinkron.pemeriksaan.some(
        (item) =>
          item.terisi,
      ),
      "Minimal satu pemeriksaan harus terisi.",
    );

    assert(
      formSesudahSinkron.skrining.some(
        (item) =>
          item.terisi,
      ),
      "Minimal satu skrining harus terisi.",
    );

    assert(
      formSesudahSinkron.konseling.some(
        (item) =>
          item.terisi,
      ),
      "Minimal satu konseling harus terisi.",
    );

    console.log(
      "BERHASIL:",
      {
        pemeriksaanTerisi:
          formSesudahSinkron.pemeriksaan.filter(
            (item) =>
              item.terisi,
          ).length,

        skriningTerisi:
          formSesudahSinkron.skrining.filter(
            (item) =>
              item.terisi,
          ).length,

        konselingTerisi:
          formSesudahSinkron.konseling.filter(
            (item) =>
              item.terisi,
          ).length,
      },
    );

    judul(
      "SEMUA TEST FORM PESERTA TERPADU BERHASIL",
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
      "TEST FORM PESERTA TERPADU GAGAL",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);