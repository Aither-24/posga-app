import { and, eq } from "drizzle-orm";

import { db } from "../db/index.js";

import {
  hasilSkrining,
  lokasi,
  peserta,
  pesertaPosyandu,
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
} from "../db/schema.js";

import {
  ambilIndikatorByKode,
  ambilOpsiIndikator,
} from "../lib/indikator.service.js";

import {
  generateFormPesertaSesi,
  hitungSelisihBulanKalender,
} from "../lib/rule-engine.service.js";

import {
  hapusHasilSkrining,
  tambahHasilSkrining,
} from "../lib/skrining.service.js";

// ============================================================
// KONFIGURASI FIXTURE TEST
// ============================================================

const TANGGAL_SESI = "2026-09-03";

const NIK_BALITA = "3578000000099001";

const NIK_DEWASA = "3578000000099002";

const NAMA_LOKASI = "LOKASI TEST RULE ENGINE V2";

const NAMA_POSYANDU = "POSYANDU TEST RULE ENGINE V2";

// ============================================================
// ASSERT
// ============================================================

function assert(kondisi: unknown, pesan: string): asserts kondisi {
  if (!kondisi) {
    throw new Error(`ASSERT GAGAL: ${pesan}`);
  }
}

// ============================================================
// OUTPUT
// ============================================================

function judul(teks: string) {
  console.log("\n========================================");

  console.log(teks);

  console.log("========================================");
}

// ============================================================
// TYPE FIXTURE
// ============================================================

interface FixtureTest {
  lokasiId: number;

  posyanduId: number;

  sesiPosgaId: number;

  pesertaSesiBalitaId: number;

  pesertaSesiDewasaId: number;
}

// ============================================================
// CLEANUP FIXTURE LAMA
//
// Fungsi ini juga dijalankan sebelum setup.
// Jadi jika test sebelumnya berhenti di tengah jalan,
// test berikutnya tetap dapat dimulai dari kondisi bersih.
// ============================================================

async function cleanupFixture() {
  // ----------------------------------------------------------
  // HASIL SKRINING
  // ----------------------------------------------------------

  await db
    .delete(hasilSkrining)
    .where(eq(hasilSkrining.pesertaNik, NIK_BALITA));

  await db
    .delete(hasilSkrining)
    .where(eq(hasilSkrining.pesertaNik, NIK_DEWASA));

  // ----------------------------------------------------------
  // PESERTA SESI
  // ----------------------------------------------------------

  await db
    .delete(pesertaSesiPosga)
    .where(eq(pesertaSesiPosga.pesertaNik, NIK_BALITA));

  await db
    .delete(pesertaSesiPosga)
    .where(eq(pesertaSesiPosga.pesertaNik, NIK_DEWASA));

  // ----------------------------------------------------------
  // KEANGGOTAAN
  // ----------------------------------------------------------

  await db
    .delete(pesertaPosyandu)
    .where(eq(pesertaPosyandu.pesertaNik, NIK_BALITA));

  await db
    .delete(pesertaPosyandu)
    .where(eq(pesertaPosyandu.pesertaNik, NIK_DEWASA));

  // ----------------------------------------------------------
  // PESERTA
  // ----------------------------------------------------------

  await db.delete(peserta).where(eq(peserta.nik, NIK_BALITA));

  await db.delete(peserta).where(eq(peserta.nik, NIK_DEWASA));

  // ----------------------------------------------------------
  // SESI TEST
  //
  // Cari Posyandu test dulu.
  // ----------------------------------------------------------

  const posyanduTest = await db
    .select({
      id: posyandu.id,
    })
    .from(posyandu)
    .where(eq(posyandu.nama, NAMA_POSYANDU));

  for (const item of posyanduTest) {
    await db.delete(sesiPosga).where(eq(sesiPosga.posyanduId, item.id));
  }

  // ----------------------------------------------------------
  // POSYANDU
  // ----------------------------------------------------------

  await db.delete(posyandu).where(eq(posyandu.nama, NAMA_POSYANDU));

  // ----------------------------------------------------------
  // LOKASI
  // ----------------------------------------------------------

  await db.delete(lokasi).where(eq(lokasi.nama, NAMA_LOKASI));
}

// ============================================================
// BUAT FIXTURE
// ============================================================

async function buatFixture(): Promise<FixtureTest> {
  await cleanupFixture();

  // ==========================================================
  // 1. LOKASI
  // ==========================================================

  const lokasiRows = await db
    .insert(lokasi)
    .values({
      nama: NAMA_LOKASI,

      alamat: "Alamat khusus fixture test",

      aktif: true,
    })
    .returning({
      id: lokasi.id,
    });

  const lokasiId = lokasiRows[0]?.id;

  assert(lokasiId, "Gagal membuat lokasi test.");

  // ==========================================================
  // 2. POSYANDU
  // ==========================================================

  const posyanduRows = await db
    .insert(posyandu)
    .values({
      lokasiId,

      nama: NAMA_POSYANDU,

      alamat: "Alamat Posyandu test",

      aktif: true,
    })
    .returning({
      id: posyandu.id,
    });

  const posyanduId = posyanduRows[0]?.id;

  assert(posyanduId, "Gagal membuat Posyandu test.");

  // ==========================================================
  // 3. PESERTA BALITA
  //
  // 10 Maret 2022
  // pada 3 September 2026
  // = 4 tahun lebih
  // ==========================================================

  await db.insert(peserta).values({
    nik: NIK_BALITA,

    nama: "Balita Test Rule Engine",

    tanggalLahir: "2022-03-10",

    jenisKelamin: "P",

    aktif: true,
  });

  // ==========================================================
  // 4. PESERTA DEWASA
  //
  // 10 Januari 1996
  // pada September 2026
  // = 30 tahun
  // ==========================================================

  await db.insert(peserta).values({
    nik: NIK_DEWASA,

    nama: "Dewasa Test Rule Engine",

    tanggalLahir: "1996-01-10",

    jenisKelamin: "L",

    aktif: true,
  });

  // ==========================================================
  // 5. KEANGGOTAAN POSYANDU
  // ==========================================================

  await db.insert(pesertaPosyandu).values([
    {
      pesertaNik: NIK_BALITA,

      posyanduId,

      tanggalMulai: "2025-01-01",

      aktif: true,
    },

    {
      pesertaNik: NIK_DEWASA,

      posyanduId,

      tanggalMulai: "2025-01-01",

      aktif: true,
    },
  ]);

  // ==========================================================
  // 6. SESI POSGA
  // ==========================================================

  const sesiRows = await db
    .insert(sesiPosga)
    .values({
      posyanduId,

      tanggalPosga: TANGGAL_SESI,

      status: "aktif",

      catatan: "Fixture Rule Engine v2",
    })
    .returning({
      id: sesiPosga.id,
    });

  const sesiPosgaId = sesiRows[0]?.id;

  assert(sesiPosgaId, "Gagal membuat sesi test.");

  // ==========================================================
  // 7. SNAPSHOT PESERTA SESI BALITA
  // ==========================================================

  const pesertaSesiBalitaRows = await db
    .insert(pesertaSesiPosga)
    .values({
      sesiPosgaId,

      pesertaNik: NIK_BALITA,

      kategoriSaatItu: "balita",

      sumberKategori: "usia",

      statusPemeriksaan: "belum_diperiksa",
    })
    .returning({
      id: pesertaSesiPosga.id,
    });

  const pesertaSesiBalitaId = pesertaSesiBalitaRows[0]?.id;

  assert(pesertaSesiBalitaId, "Gagal membuat peserta sesi Balita.");

  // ==========================================================
  // 8. SNAPSHOT PESERTA SESI DEWASA
  // ==========================================================

  const pesertaSesiDewasaRows = await db
    .insert(pesertaSesiPosga)
    .values({
      sesiPosgaId,

      pesertaNik: NIK_DEWASA,

      kategoriSaatItu: "dewasa",

      sumberKategori: "usia",

      statusPemeriksaan: "belum_diperiksa",
    })
    .returning({
      id: pesertaSesiPosga.id,
    });

  const pesertaSesiDewasaId = pesertaSesiDewasaRows[0]?.id;

  assert(pesertaSesiDewasaId, "Gagal membuat peserta sesi Dewasa.");

  return {
    lokasiId,
    posyanduId,
    sesiPosgaId,
    pesertaSesiBalitaId,
    pesertaSesiDewasaId,
  };
}

// ============================================================
// TEST HELPER BULAN
// ============================================================

function testSelisihBulan() {
  console.log("\n1. Selisih bulan kalender");

  assert(
    hitungSelisihBulanKalender("2025-12-20", "2026-09-03") === 9,
    "Desember 2025 ke September 2026 harus 9 bulan.",
  );

  assert(
    hitungSelisihBulanKalender("2026-03-10", "2026-07-01") === 4,
    "Maret ke Juli harus 4 bulan.",
  );

  assert(
    hitungSelisihBulanKalender("2025-09-03", "2026-09-03") === 12,
    "Harus menghasilkan 12 bulan.",
  );

  assert(
    hitungSelisihBulanKalender("2026-02-10", "2026-08-10") === 6,
    "Februari ke Agustus harus 6 bulan.",
  );

  console.log("BERHASIL.");
}

// ============================================================
// TEST TAHUNAN BALITA
// ============================================================

async function testTahunanBalita(pesertaSesiId: number) {
  judul("TEST FREKUENSI TAHUNAN");

  const gilut = await ambilIndikatorByKode("SKRINING_GILUT");

  assert(gilut, "SKRINING_GILUT tidak ditemukan.");

  const opsi = await ambilOpsiIndikator(gilut.id, true);

  const opsiNormal = opsi.find((item) => item.kode === "TIDAK_ADA_MASALAH");

  assert(opsiNormal, "Opsi Gilut tidak ditemukan.");

  // ==========================================================
  // TANPA RIWAYAT
  // ==========================================================

  console.log("\n2. Tahunan - belum pernah");

  let form = await generateFormPesertaSesi(pesertaSesiId);

  let item = form.skrining.find(
    (skrining) => skrining.kode === "SKRINING_GILUT",
  );

  assert(item, "Gilut tidak ditemukan pada form.");

  assert(
    item.statusKelayakan === "tampil",
    `Tanpa riwayat harus tampil. Aktual: ${item.statusKelayakan}`,
  );

  assert(item.riwayatTerakhir === null, "Riwayat terakhir harus null.");

  console.log("BERHASIL:", item.statusKelayakan, item.alasan);

  // ==========================================================
  // RIWAYAT 4 BULAN
  // ==========================================================

  console.log("\n3. Tahunan - 4 bulan lalu");

  const empatBulan = await tambahHasilSkrining({
    pesertaNik: NIK_BALITA,

    indikatorId: gilut.id,

    tanggalSkrining: "2026-05-15",

    sumber: "eksternal",

    namaFasilitas: "Puskesmas Eksternal Test",

    opsiId: opsiNormal.id,

    catatan: "Fixture tahunan 4 bulan.",
  });

  assert(empatBulan, "Gagal membuat riwayat 4 bulan.");

  form = await generateFormPesertaSesi(pesertaSesiId);

  item = form.skrining.find((skrining) => skrining.kode === "SKRINING_GILUT");

  assert(item, "Gilut tidak ditemukan.");

  assert(
    item.statusKelayakan === "belum_jatuh_tempo",
    [
      "Empat bulan seharusnya belum jatuh tempo.",
      `Aktual: ${item.statusKelayakan}`,
      item.alasan,
    ].join(" "),
  );

  assert(
    item.riwayatTerakhir?.sumber === "eksternal",
    "Riwayat eksternal harus terbaca.",
  );

  console.log("BERHASIL:", item.statusKelayakan, item.alasan);

  await hapusHasilSkrining(empatBulan.id);

  // ==========================================================
  // WINDOW 9 BULAN LINTAS TAHUN
  // ==========================================================

  console.log("\n4. Tahunan - window 9 bulan lintas tahun");

  const sembilanBulan = await tambahHasilSkrining({
    pesertaNik: NIK_BALITA,

    indikatorId: gilut.id,

    tanggalSkrining: "2025-12-15",

    sumber: "eksternal",

    namaFasilitas: "RS Eksternal Test",

    opsiId: opsiNormal.id,

    catatan: "Fixture window tahunan.",
  });

  assert(sembilanBulan, "Gagal membuat riwayat 9 bulan.");

  form = await generateFormPesertaSesi(pesertaSesiId);

  item = form.skrining.find((skrining) => skrining.kode === "SKRINING_GILUT");

  assert(item, "Gilut tidak ditemukan.");

  assert(
    item.statusKelayakan === "tampil",
    [
      "Sembilan bulan lintas tahun harus tampil.",
      `Aktual: ${item.statusKelayakan}`,
      item.alasan,
    ].join(" "),
  );

  console.log("BERHASIL:", item.statusKelayakan, item.alasan);

  await hapusHasilSkrining(sembilanBulan.id);

  // ==========================================================
  // 12 BULAN
  // ==========================================================

  console.log("\n5. Tahunan - interval penuh 12 bulan");

  const duaBelasBulan = await tambahHasilSkrining({
    pesertaNik: NIK_BALITA,

    indikatorId: gilut.id,

    tanggalSkrining: "2025-09-03",

    sumber: "eksternal",

    namaFasilitas: "RS Eksternal Test",

    opsiId: opsiNormal.id,

    catatan: "Fixture interval 12 bulan.",
  });

  assert(duaBelasBulan, "Gagal membuat riwayat 12 bulan.");

  form = await generateFormPesertaSesi(pesertaSesiId);

  item = form.skrining.find((skrining) => skrining.kode === "SKRINING_GILUT");

  assert(item, "Gilut tidak ditemukan.");

  assert(
    item.statusKelayakan === "tampil",
    "Setelah 12 bulan Gilut harus tampil.",
  );

  console.log("BERHASIL:", item.statusKelayakan, item.alasan);

  await hapusHasilSkrining(duaBelasBulan.id);
}

// ============================================================
// TEST SEKALI SEUMUR HIDUP
// ============================================================

async function testSekaliSeumurHidup(pesertaSesiId: number) {
  judul("TEST SEKALI SEUMUR HIDUP");

  const talasemia = await ambilIndikatorByKode("SKRINING_TALASEMIA");

  assert(talasemia, "SKRINING_TALASEMIA tidak ditemukan.");

  const opsi = await ambilOpsiIndikator(talasemia.id, true);

  const opsiTidakBerisiko = opsi.find((item) => item.kode === "TIDAK_BERISIKO");

  assert(opsiTidakBerisiko, "Opsi Talasemia tidak ditemukan.");

  // ==========================================================
  // BELUM PERNAH
  // ==========================================================

  console.log("\n6. Sekali seumur hidup - belum pernah");

  let form = await generateFormPesertaSesi(pesertaSesiId);

  let item = form.skrining.find(
    (skrining) => skrining.kode === "SKRINING_TALASEMIA",
  );

  assert(item, "Talasemia tidak ditemukan pada form.");

  assert(
    item.statusKelayakan === "tampil",
    "Talasemia yang belum pernah dilakukan harus tampil.",
  );

  console.log("BERHASIL:", item.statusKelayakan, item.alasan);

  // ==========================================================
  // SUDAH PERNAH EKSTERNAL
  // ==========================================================

  console.log("\n7. Sekali seumur hidup - sudah pernah eksternal");

  const riwayat = await tambahHasilSkrining({
    pesertaNik: NIK_BALITA,

    indikatorId: talasemia.id,

    tanggalSkrining: "2024-03-20",

    sumber: "eksternal",

    namaFasilitas: "Rumah Sakit Eksternal",

    opsiId: opsiTidakBerisiko.id,

    catatan: "Riwayat Talasemia fixture.",
  });

  assert(riwayat, "Gagal membuat riwayat Talasemia.");

  form = await generateFormPesertaSesi(pesertaSesiId);

  item = form.skrining.find(
    (skrining) => skrining.kode === "SKRINING_TALASEMIA",
  );

  assert(item, "Talasemia tidak ditemukan.");

  assert(
    item.statusKelayakan === "sudah_selesai",
    [
      "Talasemia yang sudah pernah dilakukan harus selesai.",
      `Aktual: ${item.statusKelayakan}`,
    ].join(" "),
  );

  assert(
    item.riwayatTerakhir?.sumber === "eksternal",
    "Riwayat eksternal Talasemia tidak terbaca.",
  );

  console.log("BERHASIL:", item.statusKelayakan, item.alasan);

  await hapusHasilSkrining(riwayat.id);
}

// ============================================================
// TEST MANUAL + INDIKASI
// ============================================================

async function testManualDanIndikasi(pesertaSesiId: number) {
  judul("TEST MANUAL & SESUAI INDIKASI");

  const form = await generateFormPesertaSesi(pesertaSesiId);

  // ==========================================================
  // MANUAL
  // ==========================================================

  console.log("\n8. Skrining manual");

  const tbc = form.skrining.find((item) => item.kode === "SKRINING_TBC");

  assert(tbc, "SKRINING_TBC tidak ditemukan.");

  assert(tbc.frekuensi === "manual", "TBC harus berfrekuensi manual.");

  assert(tbc.statusKelayakan === "tampil", "Skrining manual harus tersedia.");

  console.log("BERHASIL:", tbc.statusKelayakan, tbc.alasan);

  // ==========================================================
  // SESUAI INDIKASI
  // ==========================================================

  console.log("\n9. Skrining sesuai indikasi");

  const kekerasan = form.skrining.find(
    (item) => item.kode === "SKRINING_KEKERASAN",
  );

  assert(kekerasan, "SKRINING_KEKERASAN tidak ditemukan.");

  assert(
    kekerasan.frekuensi === "sesuai_indikasi",
    "Frekuensi kekerasan harus sesuai_indikasi.",
  );

  assert(
    kekerasan.statusKelayakan === "sesuai_indikasi",
    "Status harus sesuai_indikasi.",
  );

  console.log("BERHASIL:", kekerasan.statusKelayakan, kekerasan.alasan);
}

// ============================================================
// TEST DUA KALI SETAHUN
//
// Menggunakan peserta Dewasa dan indikator KEBUGARAN.
//
// Sesi: 3 September 2026
//
// Skenario:
// - Mei 2026 -> Sep 2026 = 4 bulan,
//   masih sama-sama semester 2? Mei semester 1, Sep semester 2
//   => window boleh tampil.
//
// Untuk menguji "4 bulan semester sama" terhadap sesi September
// kita gunakan Mei tidak cocok karena beda semester.
// Karena tanggal sesi fixture tetap Sep,
// kita menguji:
// - Juni -> Sep = 3 bulan => belum jatuh tempo
// - Mei -> Sep = 4 bulan + lintas semester => tampil
// - Maret -> Sep = 6 bulan => tampil
// ============================================================

async function testDuaKaliTahun(pesertaSesiId: number) {
  judul("TEST DUA KALI SETAHUN");

  const kebugaran = await ambilIndikatorByKode("KEBUGARAN");

  assert(kebugaran, "KEBUGARAN tidak ditemukan.");

  const opsi = await ambilOpsiIndikator(kebugaran.id, true);

  const opsiBaik = opsi.find((item) => item.kode === "BAIK");

  assert(opsiBaik, "Opsi BAIK pada KEBUGARAN tidak ditemukan.");

  // ==========================================================
  // BELUM PERNAH
  // ==========================================================

  console.log("\n10. 2x/tahun - belum pernah");

  let form = await generateFormPesertaSesi(pesertaSesiId);

  let item = form.skrining.find((skrining) => skrining.kode === "KEBUGARAN");

  assert(item, "KEBUGARAN tidak ditemukan pada form Dewasa.");

  assert(
    item.frekuensi === "dua_kali_tahun",
    "KEBUGARAN harus berfrekuensi dua_kali_tahun.",
  );

  assert(
    item.statusKelayakan === "tampil",
    "Belum pernah Kebugaran harus tampil.",
  );

  console.log("BERHASIL:", item.statusKelayakan, item.alasan);

  // ==========================================================
  // 3 BULAN
  // ==========================================================

  console.log("\n11. 2x/tahun - baru 3 bulan");

  const tigaBulan = await tambahHasilSkrining({
    pesertaNik: NIK_DEWASA,

    indikatorId: kebugaran.id,

    tanggalSkrining: "2026-06-03",

    sumber: "eksternal",

    namaFasilitas: "Fasilitas Kebugaran Test",

    opsiId: opsiBaik.id,

    catatan: "Fixture 3 bulan.",
  });

  assert(tigaBulan, "Gagal membuat riwayat Kebugaran 3 bulan.");

  form = await generateFormPesertaSesi(pesertaSesiId);

  item = form.skrining.find((skrining) => skrining.kode === "KEBUGARAN");

  assert(item, "KEBUGARAN tidak ditemukan.");

  assert(
    item.statusKelayakan === "belum_jatuh_tempo",
    [
      "Tiga bulan seharusnya belum jatuh tempo.",
      `Aktual: ${item.statusKelayakan}`,
      item.alasan,
    ].join(" "),
  );

  console.log("BERHASIL:", item.statusKelayakan, item.alasan);

  await hapusHasilSkrining(tigaBulan.id);

  // ==========================================================
  // 4 BULAN + LINTAS SEMESTER
  // ==========================================================

  console.log("\n12. 2x/tahun - 4 bulan lintas semester");

  const empatBulan = await tambahHasilSkrining({
    pesertaNik: NIK_DEWASA,

    indikatorId: kebugaran.id,

    tanggalSkrining: "2026-05-03",

    sumber: "eksternal",

    namaFasilitas: "Fasilitas Kebugaran Test",

    opsiId: opsiBaik.id,

    catatan: "Fixture 4 bulan lintas semester.",
  });

  assert(empatBulan, "Gagal membuat riwayat Kebugaran 4 bulan.");

  form = await generateFormPesertaSesi(pesertaSesiId);

  item = form.skrining.find((skrining) => skrining.kode === "KEBUGARAN");

  assert(item, "KEBUGARAN tidak ditemukan.");

  assert(
    item.statusKelayakan === "tampil",
    [
      "Empat bulan lintas semester harus masuk window.",
      `Aktual: ${item.statusKelayakan}`,
      item.alasan,
    ].join(" "),
  );

  console.log("BERHASIL:", item.statusKelayakan, item.alasan);

  await hapusHasilSkrining(empatBulan.id);

  // ==========================================================
  // 6 BULAN PENUH
  // ==========================================================

  console.log("\n13. 2x/tahun - interval 6 bulan");

  const enamBulan = await tambahHasilSkrining({
    pesertaNik: NIK_DEWASA,

    indikatorId: kebugaran.id,

    tanggalSkrining: "2026-03-03",

    sumber: "eksternal",

    namaFasilitas: "Fasilitas Kebugaran Test",

    opsiId: opsiBaik.id,

    catatan: "Fixture interval 6 bulan.",
  });

  assert(enamBulan, "Gagal membuat riwayat Kebugaran 6 bulan.");

  form = await generateFormPesertaSesi(pesertaSesiId);

  item = form.skrining.find((skrining) => skrining.kode === "KEBUGARAN");

  assert(item, "KEBUGARAN tidak ditemukan.");

  assert(
    item.statusKelayakan === "tampil",
    "Setelah 6 bulan Kebugaran harus tampil.",
  );

  console.log("BERHASIL:", item.statusKelayakan, item.alasan);

  await hapusHasilSkrining(enamBulan.id);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  judul("TEST RULE ENGINE V2 SELF-CONTAINED");

  let fixture: FixtureTest | null = null;

  try {
    // ========================================================
    // 1. HELPER
    // ========================================================

    testSelisihBulan();

    // ========================================================
    // 2. SETUP
    // ========================================================

    console.log("\nMembuat fixture test...");

    fixture = await buatFixture();

    console.log("Fixture berhasil dibuat:", fixture);

    // ========================================================
    // 3. VALIDASI FORM BALITA
    // ========================================================

    const formBalita = await generateFormPesertaSesi(
      fixture.pesertaSesiBalitaId,
    );

    assert(formBalita.kategori === "balita", "Fixture pertama harus Balita.");

    assert(
      formBalita.tanggalPosga === TANGGAL_SESI,
      "Tanggal form Balita tidak sesuai.",
    );

    console.log("\nFixture Balita:", {
      pesertaSesiId: formBalita.pesertaSesiId,

      nama: formBalita.nama,

      kategori: formBalita.kategori,

      umur: formBalita.umur,
    });

    // ========================================================
    // 4. VALIDASI FORM DEWASA
    // ========================================================

    const formDewasa = await generateFormPesertaSesi(
      fixture.pesertaSesiDewasaId,
    );

    assert(formDewasa.kategori === "dewasa", "Fixture kedua harus Dewasa.");

    console.log("\nFixture Dewasa:", {
      pesertaSesiId: formDewasa.pesertaSesiId,

      nama: formDewasa.nama,

      kategori: formDewasa.kategori,

      umur: formDewasa.umur,
    });

    // ========================================================
    // 5. TEST TAHUNAN
    // ========================================================

    await testTahunanBalita(fixture.pesertaSesiBalitaId);

    // ========================================================
    // 6. TEST SEKALI SEUMUR HIDUP
    // ========================================================

    await testSekaliSeumurHidup(fixture.pesertaSesiBalitaId);

    // ========================================================
    // 7. MANUAL & INDIKASI
    // ========================================================

    await testManualDanIndikasi(fixture.pesertaSesiBalitaId);

    // ========================================================
    // 8. DUA KALI SETAHUN
    // ========================================================

    await testDuaKaliTahun(fixture.pesertaSesiDewasaId);

    // ========================================================
    // SELESAI
    // ========================================================

    judul("SEMUA TEST RULE ENGINE V2 BERHASIL");
  } finally {
    // ========================================================
    // CLEANUP SELALU DIJALANKAN
    // ========================================================

    console.log("\nMembersihkan fixture test...");

    try {
      await cleanupFixture();

      console.log("Fixture berhasil dibersihkan.");
    } catch (error) {
      console.error("PERINGATAN: cleanup fixture gagal:", error);
    }
  }
}

// ============================================================
// RUN
// ============================================================

main().catch((error) => {
  judul("TEST RULE ENGINE V2 GAGAL");

  console.error(error);

  process.exitCode = 1;
});
