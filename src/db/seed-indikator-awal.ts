import {
  ambilIndikatorByKode,
  tambahAturanIndikator,
  tambahIndikator,
  tambahOpsiIndikator,
} from "../lib/indikator.service.js";

// ============================================================
// HELPER SEED
// ============================================================

async function pastikanIndikator(input: Parameters<typeof tambahIndikator>[0]) {
  const existing = await ambilIndikatorByKode(input.kode);

  if (existing) {
    console.log(`SKIP indikator ${input.kode} sudah ada`);

    return existing;
  }

  const hasil = await tambahIndikator(input);

  if (!hasil) {
    throw new Error(`Gagal membuat indikator ${input.kode}`);
  }

  console.log(`CREATE indikator ${hasil.kode}`);

  return hasil;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("\n=== SEED INDIKATOR AWAL ===");

  // ----------------------------------------------------------
  // 1. BB BALITA
  // ----------------------------------------------------------

  const bb = await pastikanIndikator({
    kode: "BB",

    nama: "Berat Badan",

    kelompok: "pemeriksaan",

    tipeInput: "number",

    satuan: "kg",

    urutanDefault: 10,
  });

  const aturanBb = await tambahAturanIndikator({
    indikatorId: bb.id,

    kategori: "balita",

    frekuensi: "setiap_sesi",

    wajib: true,
  });

  console.log("Aturan BB:", aturanBb);

  // ----------------------------------------------------------
  // 2. LILA BALITA
  // ----------------------------------------------------------

  const lila = await pastikanIndikator({
    kode: "LILA",

    nama: "Lingkar Lengan Atas",

    kelompok: "pemeriksaan",

    tipeInput: "number",

    satuan: "cm",

    urutanDefault: 20,
  });

  await tambahAturanIndikator({
    indikatorId: lila.id,

    kategori: "balita",

    frekuensi: "setiap_sesi",

    wajib: true,
  });

  // ----------------------------------------------------------
  // 3. SDIDTK
  // ----------------------------------------------------------

  const sdidtk = await pastikanIndikator({
    kode: "SDIDTK",

    nama: "SDIDTK",

    kelompok: "pemeriksaan",

    tipeInput: "select",

    urutanDefault: 30,
  });

  await tambahOpsiIndikator({
    indikatorId: sdidtk.id,

    kode: "NORMAL",

    label: "Normal",

    urutan: 1,
  });

  await tambahOpsiIndikator({
    indikatorId: sdidtk.id,

    kode: "MERAGUKAN",

    label: "Meragukan",

    urutan: 2,
  });

  await tambahOpsiIndikator({
    indikatorId: sdidtk.id,

    kode: "MUNGKIN_MENYIMPANG",

    label: "Mungkin Menyimpang",

    urutan: 3,
  });

  await tambahAturanIndikator({
    indikatorId: sdidtk.id,

    kategori: "balita",

    frekuensi: "usia_tertentu",

    wajib: false,

    aturanJson: JSON.stringify({
      usiaBulan: [12, 18, 24, 30, 36, 42, 48, 54, 60],
    }),
  });

  // ----------------------------------------------------------
  // 4. SKRINING TBC
  // ----------------------------------------------------------

  const tbc = await pastikanIndikator({
    kode: "SKRINING_TBC",

    nama: "Skrining TBC",

    kelompok: "skrining",

    tipeInput: "select",

    urutanDefault: 100,
  });

  await tambahOpsiIndikator({
    indikatorId: tbc.id,

    kode: "TERDUGA_TB",

    label: "Terduga TB",

    urutan: 1,
  });

  await tambahOpsiIndikator({
    indikatorId: tbc.id,

    kode: "TIDAK_TERDUGA_TB",

    label: "Tidak Terduga TB",

    urutan: 2,
  });

  await tambahAturanIndikator({
    indikatorId: tbc.id,

    kategori: "balita",

    frekuensi: "manual",

    wajib: false,
  });

  // ----------------------------------------------------------
  // 5. SKRINING GILUT
  // ----------------------------------------------------------

  const gilut = await pastikanIndikator({
    kode: "SKRINING_GILUT",

    nama: "Skrining Gigi dan Mulut",

    kelompok: "skrining",

    tipeInput: "select",

    urutanDefault: 110,
  });

  await tambahOpsiIndikator({
    indikatorId: gilut.id,

    kode: "ADA_MASALAH",

    label: "Ada Masalah",

    urutan: 1,
  });

  await tambahOpsiIndikator({
    indikatorId: gilut.id,

    kode: "TIDAK_ADA_MASALAH",

    label: "Tidak Ada Masalah",

    urutan: 2,
  });

  await tambahAturanIndikator({
    indikatorId: gilut.id,

    kategori: "balita",

    frekuensi: "tahunan",

    wajib: false,
  });

  // ----------------------------------------------------------
  // 6. KONSELING EDUKASI GILUT
  // ----------------------------------------------------------

  const konseling = await pastikanIndikator({
    kode: "KONSELING_BALITA",

    nama: "Jenis Konseling Balita",

    kelompok: "konseling",

    tipeInput: "multiselect",

    urutanDefault: 200,
  });

  await tambahOpsiIndikator({
    indikatorId: konseling.id,

    kode: "EDUKASI_GILUT",

    label: "Edukasi Gilut",

    urutan: 1,
  });

  await tambahOpsiIndikator({
    indikatorId: konseling.id,

    kode: "GIZI",

    label: "Gizi",

    urutan: 2,
  });

  await tambahAturanIndikator({
    indikatorId: konseling.id,

    kategori: "balita",

    frekuensi: "setiap_sesi",

    wajib: false,
  });

  console.log("\n=== SEED SELESAI ===");
}

main().catch((error) => {
  console.error("\nSEED GAGAL:");

  console.error(error);

  process.exitCode = 1;
});
