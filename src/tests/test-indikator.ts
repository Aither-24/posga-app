import {
  aktifkanIndikator,
  ambilAturanIndikator,
  ambilIndikatorByKode,
  ambilOpsiIndikator,
  ambilPaketIndikatorDasar,
  ambilPaketIndikatorKategori,
  ambilSemuaIndikator,
  hapusAturanIndikatorPermanen,
  hapusIndikatorPermanen,
  hapusOpsiIndikatorPermanen,
  nonaktifkanIndikator,
  tambahAturanIndikator,
  tambahIndikator,
  tambahOpsiIndikator,
  updateAturanIndikator,
  updateIndikator,
  updateOpsiIndikator,
} from "../lib/indikator.service.js";

// ============================================================
// HELPER
// ============================================================

function judul(
  nomor: number,
  teks: string
) {
  console.log(
    "\n========================================"
  );

  console.log(
    `${nomor}. ${teks}`
  );

  console.log(
    "========================================"
  );
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const kodeTest =
    "TEST_STATUS_GIZI";

  // ==========================================================
  // 1. CREATE INDIKATOR
  // ==========================================================

  judul(
    1,
    "CREATE INDIKATOR"
  );

  const indikatorBaru =
    await tambahIndikator({
      kode:
        kodeTest,

      nama:
        "Test Status Gizi",

      kelompok:
        "pemeriksaan",

      tipeInput:
        "select",

      urutanDefault:
        9999,
    });

  if (!indikatorBaru) {
    throw new Error(
      "Indikator gagal dibuat."
    );
  }

  console.log(
    indikatorBaru
  );

  // ==========================================================
  // 2. READ BY KODE
  // ==========================================================

  judul(
    2,
    "READ INDIKATOR BY KODE"
  );

  const ditemukan =
    await ambilIndikatorByKode(
      kodeTest
    );

  console.log(
    ditemukan
  );

  if (!ditemukan) {
    throw new Error(
      "Indikator tidak ditemukan."
    );
  }

  // ==========================================================
  // 3. TEST DUPLIKAT
  // ==========================================================

  judul(
    3,
    "VALIDASI KODE DUPLIKAT"
  );

  try {
    await tambahIndikator({
      kode:
        kodeTest,

      nama:
        "Duplikat",

      kelompok:
        "pemeriksaan",

      tipeInput:
        "select",
    });

    throw new Error(
      "TEST GAGAL: duplikat seharusnya ditolak."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "TEST GAGAL: duplikat seharusnya ditolak."
    ) {
      throw error;
    }

    console.log(
      "Berhasil ditolak:",
      error instanceof Error
        ? error.message
        : error
    );
  }

  // ==========================================================
  // 4. UPDATE INDIKATOR
  // ==========================================================

  judul(
    4,
    "UPDATE INDIKATOR"
  );

  const updated =
    await updateIndikator(
      indikatorBaru.id,
      {
        nama:
          "Test Status Gizi Updated",

        deskripsi:
          "Indikator sementara untuk pengujian CRUD.",
      }
    );

  console.log(
    updated
  );

  // ==========================================================
  // 5. CREATE OPSI
  // ==========================================================

  judul(
    5,
    "CREATE OPSI"
  );

  const opsiNormal =
    await tambahOpsiIndikator({
      indikatorId:
        indikatorBaru.id,

      kode:
        "NORMAL",

      label:
        "Normal",

      urutan:
        1,
    });

  const opsiKurang =
    await tambahOpsiIndikator({
      indikatorId:
        indikatorBaru.id,

      kode:
        "KURANG",

      label:
        "Kurang",

      urutan:
        2,
    });

  if (
    !opsiNormal ||
    !opsiKurang
  ) {
    throw new Error(
      "Gagal membuat opsi."
    );
  }

  console.log(
    opsiNormal
  );

  console.log(
    opsiKurang
  );

  // ==========================================================
  // 6. READ OPSI
  // ==========================================================

  judul(
    6,
    "READ OPSI"
  );

  const opsi =
    await ambilOpsiIndikator(
      indikatorBaru.id
    );

  console.log(
    opsi
  );

  if (
    opsi.length !== 2
  ) {
    throw new Error(
      "Jumlah opsi tidak sesuai."
    );
  }

  // ==========================================================
  // 7. UPDATE OPSI
  // ==========================================================

  judul(
    7,
    "UPDATE OPSI"
  );

  const opsiUpdated =
    await updateOpsiIndikator(
      opsiKurang.id,
      {
        label:
          "Gizi Kurang",
      }
    );

  console.log(
    opsiUpdated
  );

  // ==========================================================
  // 8. CREATE ATURAN
  // ==========================================================

  judul(
    8,
    "CREATE ATURAN BALITA"
  );

  const aturan =
    await tambahAturanIndikator({
      indikatorId:
        indikatorBaru.id,

      kategori:
        "balita",

      frekuensi:
        "setiap_sesi",

      usiaMinBulan:
        12,

      usiaMaxBulan:
        59,

      wajib:
        true,
    });

  if (!aturan) {
    throw new Error(
      "Aturan gagal dibuat."
    );
  }

  console.log(
    aturan
  );

  // ==========================================================
  // 9. READ ATURAN
  // ==========================================================

  judul(
    9,
    "READ ATURAN"
  );

  const daftarAturan =
    await ambilAturanIndikator(
      indikatorBaru.id
    );

  console.log(
    daftarAturan
  );

  if (
    daftarAturan.length !==
    1
  ) {
    throw new Error(
      "Jumlah aturan tidak sesuai."
    );
  }

  // ==========================================================
  // 10. UPDATE ATURAN
  // ==========================================================

  judul(
    10,
    "UPDATE ATURAN"
  );

  const aturanUpdate =
    await updateAturanIndikator(
      aturan.id,
      {
        wajib:
          false,

        berdasarkanIndikasi:
          false,
      }
    );

  console.log(
    aturanUpdate
  );

  // ==========================================================
  // 11. PAKET KATEGORI BALITA
  // ==========================================================

  judul(
    11,
    "READ PAKET KATEGORI BALITA"
  );

  const paket =
    await ambilPaketIndikatorKategori(
      "balita"
    );

  console.log(
    paket
  );

  const testAda =
    paket.some(
      (item) =>
        item.kode ===
        kodeTest
    );

  if (!testAda) {
    throw new Error(
      "Indikator test tidak masuk paket Balita."
    );
  }

  // ==========================================================
  // 12. FILTER UMUR + JENIS KELAMIN
  // ==========================================================

  judul(
    12,
    "PAKET DASAR BALITA USIA 48 BULAN"
  );

  const paket48 =
    await ambilPaketIndikatorDasar(
      "balita",
      48,
      "P"
    );

  console.log(
    paket48
  );

  const masuk48 =
    paket48.some(
      (item) =>
        item.kode ===
        kodeTest
    );

  if (!masuk48) {
    throw new Error(
      "Indikator seharusnya berlaku pada usia 48 bulan."
    );
  }

  // ==========================================================
  // 13. FILTER UMUR DI LUAR BATAS
  // ==========================================================

  judul(
    13,
    "PAKET BALITA USIA 60 BULAN"
  );

  const paket60 =
    await ambilPaketIndikatorDasar(
      "balita",
      60,
      "P"
    );

  console.log(
    paket60
  );

  const masuk60 =
    paket60.some(
      (item) =>
        item.kode ===
        kodeTest
    );

  if (masuk60) {
    throw new Error(
      "Indikator test tidak seharusnya berlaku pada usia 60 bulan."
    );
  }

  console.log(
    "Filter usia bekerja."
  );

  // ==========================================================
  // 14. NONAKTIFKAN
  // ==========================================================

  judul(
    14,
    "NONAKTIFKAN INDIKATOR"
  );

  const nonaktif =
    await nonaktifkanIndikator(
      indikatorBaru.id
    );

  console.log(
    nonaktif
  );

  const paketSetelahNonaktif =
    await ambilPaketIndikatorKategori(
      "balita"
    );

  if (
    paketSetelahNonaktif.some(
      (item) =>
        item.kode ===
        kodeTest
    )
  ) {
    throw new Error(
      "Indikator nonaktif masih muncul dalam paket."
    );
  }

  console.log(
    "Indikator nonaktif tidak muncul pada paket."
  );

  // ==========================================================
  // 15. AKTIFKAN KEMBALI
  // ==========================================================

  judul(
    15,
    "AKTIFKAN KEMBALI"
  );

  const aktif =
    await aktifkanIndikator(
      indikatorBaru.id
    );

  console.log(
    aktif
  );

  // ==========================================================
  // 16. READ SEMUA MASTER
  // ==========================================================

  judul(
    16,
    "READ SEMUA INDIKATOR"
  );

  const semua =
    await ambilSemuaIndikator();

  console.log(
    semua
  );

  // ==========================================================
  // 17. CLEANUP ATURAN
  // ==========================================================

  judul(
    17,
    "DELETE ATURAN TEST"
  );

  const hapusAturan =
    await hapusAturanIndikatorPermanen(
      aturan.id
    );

  console.log(
    hapusAturan
  );

  // ==========================================================
  // 18. CLEANUP OPSI
  // ==========================================================

  judul(
    18,
    "DELETE OPSI TEST"
  );

  console.log(
    await hapusOpsiIndikatorPermanen(
      opsiNormal.id
    )
  );

  console.log(
    await hapusOpsiIndikatorPermanen(
      opsiKurang.id
    )
  );

  // ==========================================================
  // 19. CLEANUP INDIKATOR
  // ==========================================================

  judul(
    19,
    "DELETE INDIKATOR TEST"
  );

  const hapusIndikator =
    await hapusIndikatorPermanen(
      indikatorBaru.id
    );

  console.log(
    hapusIndikator
  );

  const sesudahHapus =
    await ambilIndikatorByKode(
      kodeTest
    );

  console.log(
    "Sesudah delete:",
    sesudahHapus
  );

  if (
    sesudahHapus !== null
  ) {
    throw new Error(
      "Indikator test belum terhapus."
    );
  }

  console.log(
    "\n========================================"
  );

  console.log(
    "SEMUA TEST MASTER INDIKATOR BERHASIL"
  );

  console.log(
    "========================================"
  );
}

main().catch(
  (error) => {
    console.error(
      "\n========================================"
    );

    console.error(
      "TEST MASTER INDIKATOR GAGAL"
    );

    console.error(
      "========================================"
    );

    console.error(
      error
    );

    process.exitCode =
      1;
  }
);