import {
  ambilPesertaSesi,
  ambilSesiByPosyandu,
  ambilSesiByTanggal,
  ambilSesiPosgaById,
  batalkanSesiPosga,
  buatSesiPosga,
  hapusSesiPosga,
  selesaikanSesiPosga,
  updateSesiPosga,
} from "../lib/sesi-posga.service.js";

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

function tampilErrorYangDiharapkan(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    console.log(
      "Berhasil ditolak:"
    );

    console.log(
      error.message
    );

    return;
  }

  throw error;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  // Gunakan tanggal yang berbeda dari test lama
  // agar tidak berbenturan dengan data sebelumnya.

  const tanggalAwal =
    "2026-10-20";

  const tanggalUpdate =
    "2026-10-21";

  const tanggalBatal =
    "2026-10-22";

  const tanggalDelete =
    "2026-10-23";

  // ==========================================================
  // 1. CREATE
  // ==========================================================

  judul(
    1,
    "CREATE SESI"
  );

  const created =
    await buatSesiPosga({
      posyanduId: 1,

      tanggalPosga:
        tanggalAwal,

      catatan:
        "Sesi CRUD lengkap",
    });

  const sesiId =
    created.sesi.id;

  console.log(
    "Sesi dibuat:"
  );

  console.log(
    created.sesi
  );

  console.log(
    "Jumlah peserta:",
    created.jumlahPeserta
  );

  console.log(
    "Peserta:"
  );

  console.log(
    created.peserta
  );

  // ==========================================================
  // 2. READ BY ID
  // ==========================================================

  judul(
    2,
    "READ SESI BY ID"
  );

  const detail =
    await ambilSesiPosgaById(
      sesiId
    );

  console.log(
    detail
  );

  if (
    !detail
  ) {
    throw new Error(
      "TEST GAGAL: sesi yang baru dibuat tidak ditemukan."
    );
  }

  // ==========================================================
  // 3. READ BY TANGGAL
  // ==========================================================

  judul(
    3,
    "READ SESI BY TANGGAL"
  );

  const byTanggal =
    await ambilSesiByTanggal(
      1,
      tanggalAwal
    );

  console.log(
    byTanggal
  );

  if (
    !byTanggal
  ) {
    throw new Error(
      "TEST GAGAL: sesi tidak ditemukan berdasarkan tanggal."
    );
  }

  // ==========================================================
  // 4. READ PESERTA SESI
  // ==========================================================

  judul(
    4,
    "READ PESERTA SESI"
  );

  const pesertaAwal =
    await ambilPesertaSesi(
      sesiId
    );

  console.log(
    pesertaAwal
  );

  if (
    pesertaAwal.length ===
    0
  ) {
    throw new Error(
      "TEST GAGAL: peserta sesi tidak terbentuk."
    );
  }

  // ==========================================================
  // 5. UPDATE CATATAN
  // ==========================================================

  judul(
    5,
    "UPDATE CATATAN"
  );

  const updateCatatan =
    await updateSesiPosga(
      sesiId,
      {
        catatan:
          "Catatan sudah diperbarui",
      }
    );

  console.log(
    updateCatatan.sesi
  );

  if (
    updateCatatan.sesi
      ?.catatan !==
    "Catatan sudah diperbarui"
  ) {
    throw new Error(
      "TEST GAGAL: catatan tidak berhasil diperbarui."
    );
  }

  // ==========================================================
  // 6. UPDATE TANGGAL
  // ==========================================================

  judul(
    6,
    "UPDATE TANGGAL + REGENERATE PESERTA"
  );

  const updateTanggal =
    await updateSesiPosga(
      sesiId,
      {
        tanggalPosga:
          tanggalUpdate,

        catatan:
          "Tanggal sesi dipindahkan",
      }
    );

  console.log(
    "Sesi:"
  );

  console.log(
    updateTanggal.sesi
  );

  console.log(
    "Jumlah peserta:",
    updateTanggal.jumlahPeserta
  );

  console.log(
    "Peserta hasil generate ulang:"
  );

  console.log(
    updateTanggal.peserta
  );

  if (
    updateTanggal.sesi
      ?.tanggalPosga !==
    tanggalUpdate
  ) {
    throw new Error(
      "TEST GAGAL: tanggal sesi tidak berubah."
    );
  }

  if (
    updateTanggal.peserta
      .length ===
    0
  ) {
    throw new Error(
      "TEST GAGAL: peserta tidak tergenerate ulang."
    );
  }

  // ==========================================================
  // 7. PASTIKAN TANGGAL LAMA HILANG
  // ==========================================================

  judul(
    7,
    "VALIDASI TANGGAL LAMA"
  );

  const tanggalLama =
    await ambilSesiByTanggal(
      1,
      tanggalAwal
    );

  console.log(
    "Sesi pada tanggal lama:",
    tanggalLama
  );

  if (
    tanggalLama !==
    null
  ) {
    throw new Error(
      "TEST GAGAL: sesi masih ditemukan pada tanggal lama."
    );
  }

  // ==========================================================
  // 8. TEST DUPLIKAT SESI
  // ==========================================================

  judul(
    8,
    "VALIDASI DUPLIKAT SESI"
  );

  try {
    await buatSesiPosga({
      posyanduId: 1,

      tanggalPosga:
        tanggalUpdate,

      catatan:
        "Harus gagal",
    });

    throw new Error(
      "TEST GAGAL: sesi duplikat seharusnya ditolak."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "TEST GAGAL: sesi duplikat seharusnya ditolak."
    ) {
      throw error;
    }

    tampilErrorYangDiharapkan(
      error
    );
  }

  // ==========================================================
  // 9. VALIDASI TANGGAL INVALID
  // ==========================================================

  judul(
    9,
    "VALIDASI TANGGAL INVALID"
  );

  try {
    await buatSesiPosga({
      posyanduId: 1,

      tanggalPosga:
        "2026-02-30",
    });

    throw new Error(
      "TEST GAGAL: tanggal invalid seharusnya ditolak."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "TEST GAGAL: tanggal invalid seharusnya ditolak."
    ) {
      throw error;
    }

    tampilErrorYangDiharapkan(
      error
    );
  }

  // ==========================================================
  // 10. READ SEMUA SESI POSYANDU
  // ==========================================================

  judul(
    10,
    "READ SEMUA SESI POSYANDU"
  );

  const daftarSesi =
    await ambilSesiByPosyandu(
      1
    );

  console.log(
    daftarSesi
  );

  // ==========================================================
  // 11. SELESAIKAN SESI
  // ==========================================================

  judul(
    11,
    "SELESAIKAN SESI"
  );

  const selesai =
    await selesaikanSesiPosga(
      sesiId
    );

  console.log(
    selesai
  );

  if (
    selesai?.status !==
    "selesai"
  ) {
    throw new Error(
      "TEST GAGAL: status sesi bukan selesai."
    );
  }

  // ==========================================================
  // 12. TEST UPDATE SESI SELESAI
  // ==========================================================

  judul(
    12,
    "UPDATE SESI SELESAI HARUS DITOLAK"
  );

  try {
    await updateSesiPosga(
      sesiId,
      {
        catatan:
          "Seharusnya gagal",
      }
    );

    throw new Error(
      "TEST GAGAL: sesi selesai seharusnya tidak bisa diedit."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "TEST GAGAL: sesi selesai seharusnya tidak bisa diedit."
    ) {
      throw error;
    }

    tampilErrorYangDiharapkan(
      error
    );
  }

  // ==========================================================
  // 13. TEST BATALKAN SESI SELESAI
  // ==========================================================

  judul(
    13,
    "BATALKAN SESI SELESAI HARUS DITOLAK"
  );

  try {
    await batalkanSesiPosga(
      sesiId
    );

    throw new Error(
      "TEST GAGAL: sesi selesai seharusnya tidak bisa dibatalkan."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "TEST GAGAL: sesi selesai seharusnya tidak bisa dibatalkan."
    ) {
      throw error;
    }

    tampilErrorYangDiharapkan(
      error
    );
  }

  // ==========================================================
  // 14. TEST DELETE SESI SELESAI
  // ==========================================================

  judul(
    14,
    "DELETE SESI SELESAI HARUS DITOLAK"
  );

  try {
    await hapusSesiPosga(
      sesiId
    );

    throw new Error(
      "TEST GAGAL: sesi selesai seharusnya tidak boleh dihapus."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "TEST GAGAL: sesi selesai seharusnya tidak boleh dihapus."
    ) {
      throw error;
    }

    tampilErrorYangDiharapkan(
      error
    );
  }

  // ==========================================================
  // 15. BUAT SESI KHUSUS BATAL
  // ==========================================================

  judul(
    15,
    "CREATE SESI KHUSUS TEST BATAL"
  );

  const sesiBatal =
    await buatSesiPosga({
      posyanduId: 1,

      tanggalPosga:
        tanggalBatal,

      catatan:
        "Sesi khusus test batal",
    });

  console.log(
    sesiBatal.sesi
  );

  // ==========================================================
  // 16. BATALKAN SESI
  // ==========================================================

  judul(
    16,
    "BATALKAN SESI"
  );

  const batal =
    await batalkanSesiPosga(
      sesiBatal.sesi.id
    );

  console.log(
    batal
  );

  if (
    batal?.status !==
    "dibatalkan"
  ) {
    throw new Error(
      "TEST GAGAL: sesi tidak berubah menjadi dibatalkan."
    );
  }

  // ==========================================================
  // 17. UPDATE SESI BATAL HARUS DITOLAK
  // ==========================================================

  judul(
    17,
    "UPDATE SESI BATAL HARUS DITOLAK"
  );

  try {
    await updateSesiPosga(
      sesiBatal.sesi.id,
      {
        catatan:
          "Harus gagal",
      }
    );

    throw new Error(
      "TEST GAGAL: sesi batal seharusnya tidak dapat diedit."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "TEST GAGAL: sesi batal seharusnya tidak dapat diedit."
    ) {
      throw error;
    }

    tampilErrorYangDiharapkan(
      error
    );
  }

  // ==========================================================
  // 18. DELETE SESI BATAL
  // ==========================================================

  judul(
    18,
    "DELETE SESI BATAL"
  );

  const hapusBatal =
    await hapusSesiPosga(
      sesiBatal.sesi.id
    );

  console.log(
    "Sesi batal yang dihapus:"
  );

  console.log(
    hapusBatal
  );

  const setelahHapusBatal =
    await ambilSesiPosgaById(
      sesiBatal.sesi.id
    );

  console.log(
    "Setelah delete:",
    setelahHapusBatal
  );

  if (
    setelahHapusBatal !==
    null
  ) {
    throw new Error(
      "TEST GAGAL: sesi batal belum benar-benar terhapus."
    );
  }

  // ==========================================================
  // 19. CREATE SESI AKTIF UNTUK DELETE
  // ==========================================================

  judul(
    19,
    "CREATE SESI AKTIF KHUSUS DELETE"
  );

  const sesiDelete =
    await buatSesiPosga({
      posyanduId: 1,

      tanggalPosga:
        tanggalDelete,

      catatan:
        "Sesi aktif khusus test delete",
    });

  console.log(
    sesiDelete.sesi
  );

  // ==========================================================
  // 20. DELETE SESI AKTIF TANPA DATA KLINIS
  // ==========================================================

  judul(
    20,
    "DELETE SESI AKTIF TANPA DATA KLINIS"
  );

  const deleted =
    await hapusSesiPosga(
      sesiDelete.sesi.id
    );

  console.log(
    "Sesi yang dihapus:"
  );

  console.log(
    deleted
  );

  const setelahDelete =
    await ambilSesiPosgaById(
      sesiDelete.sesi.id
    );

  console.log(
    "Hasil pencarian setelah delete:",
    setelahDelete
  );

  if (
    setelahDelete !==
    null
  ) {
    throw new Error(
      "TEST GAGAL: sesi aktif belum terhapus."
    );
  }

  // ==========================================================
  // HASIL AKHIR
  // ==========================================================

  console.log(
    "\n========================================"
  );

  console.log(
    "SEMUA TEST CRUD SESI POSGA BERHASIL"
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
      "TEST CRUD SESI POSGA GAGAL"
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