import {
  ambilIndikatorByKode,
  ambilOpsiIndikator,
} from "../lib/indikator.service.js";

import {
  ambilHasilSkriningById,
  ambilRiwayatSkriningPerIndikator,
  ambilRiwayatSkriningPeserta,
  ambilSkriningTerakhir,
  hapusHasilSkrining,
  tambahHasilSkrining,
  updateHasilSkrining,
} from "../lib/skrining.service.js";


import {
  ambilSemuaPeserta,
} from "../lib/peserta.service.js";

function assert(kondisi: unknown, pesan: string): asserts kondisi {
  if (!kondisi) {
    throw new Error(`ASSERT GAGAL: ${pesan}`);
  }
}

async function main() {
  console.log("\n=== TEST CRUD SKRINING ===");

  // Ambil peserta yang benar-benar ada pada database aktif.
  // Test lama memakai NIK hardcoded dari seed generasi sebelumnya,
  // sehingga gagal setelah database di-reset dengan seed demo baru.
  const semuaPeserta =
    await ambilSemuaPeserta();

  const pesertaTest =
    semuaPeserta.find(
      (item) => item.aktif,
    ) ??
    semuaPeserta[0];

  assert(
    pesertaTest,
    "Database belum memiliki peserta untuk pengujian skrining.",
  );

  const pesertaNik =
    pesertaTest.nik;

  console.log(
    `Peserta test: ${pesertaTest.nama} (${pesertaNik})`,
  );

  // Pakai Gilut karena tipe select dan sudah ada opsinya.
  const master = await ambilIndikatorByKode("SKRINING_GILUT");

  assert(master, "Master SKRINING_GILUT tidak ditemukan.");

  const daftarOpsi = await ambilOpsiIndikator(master.id, true);

  const opsi = daftarOpsi.find((item) => item.kode === "TIDAK_ADA_MASALAH");
  // Jika ambilIndikatorByKode tidak mengembalikan opsi,
  // kita akan ketahuan di sini dan sesuaikan test berikutnya.
  assert(opsi, "Opsi TIDAK_ADA_MASALAH tidak ditemukan.");

  // Bersihkan sisa hasil test sebelumnya jika eksekusi terdahulu
  // berhenti sebelum tahap hapus.
  const riwayatLama =
    await ambilRiwayatSkriningPerIndikator(
      pesertaNik,
      master.id,
    );

  for (const item of riwayatLama) {
    if (
      item.catatan ===
        "TEST CRUD SKRINING - riwayat eksternal" ||
      item.catatan ===
        "TEST CRUD SKRINING - dikoreksi"
    ) {
      await hapusHasilSkrining(
        item.id,
      );
    }
  }

  // ==========================================================
  // 1. TAMBAH RIWAYAT EKSTERNAL
  // ==========================================================

  console.log("\n1. Tambah riwayat eksternal");

  const dibuat = await tambahHasilSkrining({
    pesertaNik,

    indikatorId: master.id,

    tanggalSkrining: "2099-04-10",

    sumber: "eksternal",

    namaFasilitas: "Puskesmas Lain",

    opsiId: opsi.id,

    catatan: "TEST CRUD SKRINING - riwayat eksternal",
  });

  assert(dibuat, "Hasil skrining gagal dibuat.");

  assert(dibuat.sumber === "eksternal", "Sumber harus eksternal.");

  assert(
    dibuat.sesiPosgaId === null,
    "Skrining eksternal tidak boleh punya sesi.",
  );

  console.log("BERHASIL:", dibuat);

  const id = dibuat.id;

  // ==========================================================
  // 2. READ BY ID
  // ==========================================================

  console.log("\n2. Read by ID");

  const byId = await ambilHasilSkriningById(id);

  assert(byId, "Data tidak ditemukan.");

  console.log("BERHASIL:", byId);

  // ==========================================================
  // 3. RIWAYAT PESERTA
  // ==========================================================

  console.log("\n3. Riwayat peserta");

  const riwayatPeserta = await ambilRiwayatSkriningPeserta(pesertaNik);

  assert(
    riwayatPeserta.some((item) => item.id === id),
    "Data tidak ditemukan pada riwayat peserta.",
  );

  console.log("Jumlah riwayat:", riwayatPeserta.length);

  // ==========================================================
  // 4. RIWAYAT PER INDIKATOR
  // ==========================================================

  console.log("\n4. Riwayat per indikator");

  const perIndikator = await ambilRiwayatSkriningPerIndikator(
    pesertaNik,
    master.id,
  );

  assert(
    perIndikator.some((item) => item.id === id),
    "Data tidak ditemukan pada riwayat indikator.",
  );

  console.log("Jumlah:", perIndikator.length);

  // ==========================================================
  // 5. SKRINING TERAKHIR
  // ==========================================================

  console.log("\n5. Ambil skrining terakhir");

  const terakhir = await ambilSkriningTerakhir(
    pesertaNik,
    master.id,
    "2099-09-03",
  );

  assert(terakhir, "Skrining terakhir tidak ditemukan.");

  assert(terakhir.id === id, "Skrining terakhir tidak sesuai.");

  console.log("BERHASIL:", terakhir.tanggalSkrining);

  // ==========================================================
  // 6. UPDATE
  // ==========================================================

  console.log("\n6. Update riwayat");

  const updated = await updateHasilSkrining(id, {
    tanggalSkrining: "2099-05-15",

    namaFasilitas: "RS Eksternal",

    catatan: "TEST CRUD SKRINING - dikoreksi",
  });

  assert(updated, "Update gagal.");

  assert(
    updated.tanggalSkrining === "2099-05-15",
    "Tanggal update tidak sesuai.",
  );

  assert(
    updated.namaFasilitas === "RS Eksternal",
    "Nama fasilitas tidak berubah.",
  );

  console.log("BERHASIL:", updated);

  // ==========================================================
  // 7. VALIDASI EKSTERNAL + SESI
  // ==========================================================

  console.log("\n7. Validasi eksternal tidak boleh punya sesi");

  let errorEksternal = false;

  try {
    await tambahHasilSkrining({
      pesertaNik,

      indikatorId: master.id,

      tanggalSkrining: "2099-06-01",

      sumber: "eksternal",

      sesiPosgaId: 1,

      opsiId: opsi.id,
    });
  } catch {
    errorEksternal = true;
  }

  assert(errorEksternal, "Sumber eksternal dengan sesi seharusnya ditolak.");

  console.log("BERHASIL: invalid eksternal ditolak.");

  // ==========================================================
  // 8. HAPUS
  // ==========================================================

  console.log("\n8. Hapus hasil skrining");

  const dihapus = await hapusHasilSkrining(id);

  assert(dihapus, "Penghapusan gagal.");

  const setelahHapus = await ambilHasilSkriningById(id);

  assert(setelahHapus === null, "Data masih ada setelah dihapus.");

  console.log("BERHASIL: data terhapus.");

  console.log("\n========================================");

  console.log("SEMUA TEST CRUD SKRINING BERHASIL");

  console.log("========================================");
}

main().catch((error) => {
  console.error("\n========================================");

  console.error("TEST CRUD SKRINING GAGAL");

  console.error("========================================");

  console.error(error);

  process.exitCode = 1;
});
