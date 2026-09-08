import request from "supertest";

import { eq } from "drizzle-orm";

import { app } from "../app.js";

import { db } from "../db/index.js";

import {
  episodeKehamilan,
  episodeNifas,
  hasilKonseling,
  hasilPemeriksaan,
  hasilSkrining,
  komplikasiPersalinan,
  lokasi,
  peserta,
  pesertaPosyandu,
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
  tindakanPersalinan,
} from "../db/schema.js";

// ============================================================
// CONFIG
// ============================================================

const NIK_PEREMPUAN = "3578000000099701";

const NIK_LAKI_LAKI = "3578000000099702";

const NAMA_LOKASI = "LOKASI TEST API REPRODUKSI";

const NAMA_POSYANDU = "POSYANDU TEST API REPRODUKSI";

const TANGGAL_SESI_HAMIL = "2026-05-10";

const TANGGAL_SESI_NIFAS = "2026-09-03";

const TANGGAL_SESI_SETELAH_NIFAS = "2026-11-15";

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
// CLEANUP
// ============================================================

async function cleanup() {
  const nikList = [NIK_PEREMPUAN, NIK_LAKI_LAKI];

  for (const nik of nikList) {
    const pesertaSesiRows = await db
      .select({
        id: pesertaSesiPosga.id,
      })
      .from(pesertaSesiPosga)
      .where(eq(pesertaSesiPosga.pesertaNik, nik));

    for (const row of pesertaSesiRows) {
      await db
        .delete(hasilKonseling)
        .where(eq(hasilKonseling.pesertaSesiPosgaId, row.id));

      await db
        .delete(hasilPemeriksaan)
        .where(eq(hasilPemeriksaan.pesertaSesiPosgaId, row.id));
    }

    await db.delete(hasilSkrining).where(eq(hasilSkrining.pesertaNik, nik));

    await db
      .delete(pesertaSesiPosga)
      .where(eq(pesertaSesiPosga.pesertaNik, nik));

    await db.delete(pesertaPosyandu).where(eq(pesertaPosyandu.pesertaNik, nik));
  }

  // ==========================================================
  // REPRODUKSI
  // ==========================================================

  const nifasRows = await db
    .select({
      id: episodeNifas.id,
    })
    .from(episodeNifas)
    .where(eq(episodeNifas.pesertaNik, NIK_PEREMPUAN));

  for (const item of nifasRows) {
    await db
      .delete(tindakanPersalinan)
      .where(eq(tindakanPersalinan.episodeNifasId, item.id));

    await db
      .delete(komplikasiPersalinan)
      .where(eq(komplikasiPersalinan.episodeNifasId, item.id));
  }

  await db
    .delete(episodeNifas)
    .where(eq(episodeNifas.pesertaNik, NIK_PEREMPUAN));

  await db
    .delete(episodeKehamilan)
    .where(eq(episodeKehamilan.pesertaNik, NIK_PEREMPUAN));

  // ==========================================================
  // SESI
  // ==========================================================

  const posyanduRows = await db
    .select({
      id: posyandu.id,
    })
    .from(posyandu)
    .where(eq(posyandu.nama, NAMA_POSYANDU));

  for (const item of posyanduRows) {
    await db.delete(sesiPosga).where(eq(sesiPosga.posyanduId, item.id));
  }

  // ==========================================================
  // PESERTA
  // ==========================================================

  for (const nik of nikList) {
    await db.delete(peserta).where(eq(peserta.nik, nik));
  }

  await db.delete(posyandu).where(eq(posyandu.nama, NAMA_POSYANDU));

  await db.delete(lokasi).where(eq(lokasi.nama, NAMA_LOKASI));
}

// ============================================================
// FIXTURE MASTER
// ============================================================

async function buatFixtureMaster() {
  await cleanup();

  const lokasiRows = await db
    .insert(lokasi)
    .values({
      nama: NAMA_LOKASI,

      alamat: "Fixture reproduksi",

      aktif: true,
    })
    .returning({
      id: lokasi.id,
    });

  const lokasiId = lokasiRows[0]?.id;

  assert(lokasiId, "Lokasi gagal dibuat.");

  const posyanduRows = await db
    .insert(posyandu)
    .values({
      lokasiId,

      nama: NAMA_POSYANDU,

      alamat: "Fixture reproduksi",

      aktif: true,
    })
    .returning({
      id: posyandu.id,
    });

  const posyanduId = posyanduRows[0]?.id;

  assert(posyanduId, "Posyandu gagal dibuat.");

  await db.insert(peserta).values({
    nik: NIK_PEREMPUAN,

    nama: "Peserta Perempuan Test Reproduksi",

    tanggalLahir: "1995-01-10",

    jenisKelamin: "P",

    aktif: true,
  });

  await db.insert(peserta).values({
    nik: NIK_LAKI_LAKI,

    nama: "Peserta Laki Laki Test Reproduksi",

    tanggalLahir: "1995-01-10",

    jenisKelamin: "L",

    aktif: true,
  });

  await db.insert(pesertaPosyandu).values({
    pesertaNik: NIK_PEREMPUAN,

    posyanduId,

    tanggalMulai: "2026-01-01",

    aktif: true,
  });

  return {
    posyanduId,
  };
}

// ============================================================
// BUAT SESI DAN AMBIL PESERTA SESI
// ============================================================

async function buatSesi(posyanduId: number, tanggalPosga: string) {
  const response = await request(app)
    .post("/api/sesi")
    .send({
      posyanduId,

      tanggalPosga,

      catatan: `Fixture reproduksi ${tanggalPosga}`,
    })
    .expect(201);

  const sesiId = response.body.data.sesi.id;

  assert(Number.isInteger(sesiId), "ID sesi gagal dibuat.");

  const roster = response.body.data.peserta;

  const pesertaSesi = roster.find(
    (item: { pesertaNik: string }) => item.pesertaNik === NIK_PEREMPUAN,
  );

  assert(pesertaSesi, "Peserta perempuan tidak masuk roster.");

  return {
    sesiId,

    pesertaSesiId: pesertaSesi.pesertaSesiId,
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  judul("TEST API REPRODUKSI POSGA");

  try {
    const fixture = await buatFixtureMaster();

    // ========================================================
    // 1. GET REPRODUKSI AWAL
    // ========================================================

    console.log("\n1. GET reproduksi peserta awal");

    const awal = await request(app)
      .get(`/api/peserta/${NIK_PEREMPUAN}/reproduksi`)
      .expect(200);

    assert(
      awal.body.data.kehamilan.length === 0,
      "Riwayat kehamilan awal harus kosong.",
    );

    assert(
      awal.body.data.nifas.length === 0,
      "Riwayat nifas awal harus kosong.",
    );

    console.log("BERHASIL:", awal.body.data);

    // ========================================================
    // 2. CREATE KEHAMILAN
    // ========================================================

    console.log("\n2. POST episode kehamilan");

    const buatKehamilan = await request(app)
      .post(`/api/peserta/${NIK_PEREMPUAN}/kehamilan`)
      .send({
        tanggalMulai: "2026-02-01",

        hpht: "2026-01-20",

        hpl: "2026-10-27",

        bbSebelumHamilKg: 55,

        tbCm: 158,

        lilaAwalCm: 25.5,

        catatan: "Kehamilan fixture.",
      })
      .expect(201);

    const kehamilanId = buatKehamilan.body.data.id;

    assert(Number.isInteger(kehamilanId), "ID kehamilan tidak ditemukan.");

    assert(
      buatKehamilan.body.data.status === "aktif",
      "Kehamilan harus aktif.",
    );

    console.log("BERHASIL:", buatKehamilan.body.data);

    // ========================================================
    // 3. TOLAK KEHAMILAN AKTIF KEDUA
    // ========================================================

    console.log("\n3. Tolak kehamilan aktif kedua");

    const duplikatKehamilan = await request(app)
      .post(`/api/peserta/${NIK_PEREMPUAN}/kehamilan`)
      .send({
        tanggalMulai: "2026-03-01",
      })
      .expect(409);

    assert(
      duplikatKehamilan.body.success === false,
      "Kehamilan aktif kedua harus ditolak.",
    );

    console.log("BERHASIL:", duplikatKehamilan.body);

    // ========================================================
    // 4. GET KEHAMILAN
    // ========================================================

    console.log("\n4. GET episode kehamilan");

    const bacaKehamilan = await request(app)
      .get(`/api/kehamilan/${kehamilanId}`)
      .expect(200);

    assert(
      bacaKehamilan.body.data.pesertaNik === NIK_PEREMPUAN,
      "Episode kehamilan salah peserta.",
    );

    console.log("BERHASIL:", bacaKehamilan.body.data);

    // ========================================================
    // 5. UPDATE KEHAMILAN
    // ========================================================

    console.log("\n5. PUT episode kehamilan");

    const updateKehamilan = await request(app)
      .put(`/api/kehamilan/${kehamilanId}`)
      .send({
        lilaAwalCm: 26,

        catatan: "Kehamilan fixture dikoreksi.",
      })
      .expect(200);

    assert(
      updateKehamilan.body.data.lilaAwalCm === 26,
      "LiLA kehamilan gagal diperbarui.",
    );

    console.log("BERHASIL:", updateKehamilan.body.data);

    // ========================================================
    // 6. RULE ENGINE HARUS HAMIL
    // ========================================================

    console.log("\n6. Rule Engine kategori hamil");

    const sesiHamil = await buatSesi(fixture.posyanduId, TANGGAL_SESI_HAMIL);

    const formHamil = await request(app)
      .get(`/api/peserta-sesi/${sesiHamil.pesertaSesiId}/form`)
      .expect(200);

    assert(
      formHamil.body.data.kategori === "ibu_hamil",
      `Kategori seharusnya ibu_hamil, aktual ${formHamil.body.data.kategori}.`,
    );

    console.log("BERHASIL:", {
      kategori: formHamil.body.data.kategori,

      umur: formHamil.body.data.umur,
    });

    // ========================================================
    // 7. CREATE NIFAS DARI KEHAMILAN
    // ========================================================

    console.log("\n7. POST episode nifas");

    const buatNifas = await request(app)
      .post(`/api/peserta/${NIK_PEREMPUAN}/nifas`)
      .send({
        episodeKehamilanId: kehamilanId,

        tanggalMulai: "2026-08-20",

        tanggalMelahirkan: "2026-08-20",

        jamBersalin: "09:30",

        caraPersalinan: "pervaginam",

        vitaminA: true,

        asiEksklusif: true,

        catatan: "Nifas fixture.",
      })
      .expect(201);

    const nifasId = buatNifas.body.data.id;

    assert(Number.isInteger(nifasId), "ID nifas tidak ditemukan.");

    assert(
      buatNifas.body.data.status === "aktif",
      "Episode nifas harus aktif.",
    );

    console.log("BERHASIL:", buatNifas.body.data);

    // ========================================================
    // 8. KEHAMILAN OTOMATIS SELESAI
    // ========================================================

    console.log("\n8. Kehamilan otomatis selesai");

    const setelahNifas = await request(app)
      .get(`/api/kehamilan/${kehamilanId}`)
      .expect(200);

    assert(
      setelahNifas.body.data.status === "selesai",
      "Kehamilan harus otomatis selesai setelah nifas dibuat.",
    );

    assert(
      setelahNifas.body.data.tanggalSelesai === "2026-08-20",
      "Tanggal selesai kehamilan harus tanggal melahirkan.",
    );

    console.log("BERHASIL:", setelahNifas.body.data);

    // ========================================================
    // 9. TOLAK NIFAS AKTIF KEDUA
    // ========================================================

    console.log("\n9. Tolak nifas aktif kedua");

    const duplikatNifas = await request(app)
      .post(`/api/peserta/${NIK_PEREMPUAN}/nifas`)
      .send({
        tanggalMulai: "2026-08-25",
      })
      .expect(409);

    assert(
      duplikatNifas.body.success === false,
      "Nifas aktif kedua harus ditolak.",
    );

    console.log("BERHASIL:", duplikatNifas.body);

    // ========================================================
    // 10. RULE ENGINE HARUS NIFAS
    // ========================================================

    console.log("\n10. Rule Engine kategori nifas");

    const sesiNifas = await buatSesi(fixture.posyanduId, TANGGAL_SESI_NIFAS);

    const formNifas = await request(app)
      .get(`/api/peserta-sesi/${sesiNifas.pesertaSesiId}/form`)
      .expect(200);

    assert(
      formNifas.body.data.kategori === "ibu_nifas",
      `Kategori seharusnya ibu_nifas, aktual ${formNifas.body.data.kategori}.`,
    );

    console.log("BERHASIL:", {
      kategori: formNifas.body.data.kategori,

      progres: formNifas.body.data.progres,
    });

    // ========================================================
    // 11. TAMBAH TINDAKAN PERSALINAN
    // ========================================================

    console.log("\n11. POST tindakan persalinan");

    const tindakan = await request(app)
      .post(`/api/nifas/${nifasId}/tindakan`)
      .send({
        kode: "JAHIT",

        label: "Penjahitan Perineum",

        catatan: "Fixture tindakan.",
      })
      .expect(201);

    const tindakanId = tindakan.body.data.id;

    assert(Number.isInteger(tindakanId), "ID tindakan tidak ditemukan.");

    console.log("BERHASIL:", tindakan.body.data);

    // ========================================================
    // 12. UPDATE TINDAKAN
    // ========================================================

    console.log("\n12. PUT tindakan persalinan");

    const updateTindakan = await request(app)
      .put(`/api/tindakan-persalinan/${tindakanId}`)
      .send({
        label: "Penjahitan Luka Perineum",

        catatan: "Tindakan dikoreksi.",
      })
      .expect(200);

    assert(
      updateTindakan.body.data.label === "Penjahitan Luka Perineum",
      "Update tindakan gagal.",
    );

    console.log("BERHASIL:", updateTindakan.body.data);

    // ========================================================
    // 13. TAMBAH KOMPLIKASI
    // ========================================================

    console.log("\n13. POST komplikasi persalinan");

    const komplikasi = await request(app)
      .post(`/api/nifas/${nifasId}/komplikasi`)
      .send({
        kode: "PERDARAHAN",

        label: "Perdarahan Pascapersalinan",

        catatan: "Fixture komplikasi.",
      })
      .expect(201);

    const komplikasiId = komplikasi.body.data.id;

    assert(Number.isInteger(komplikasiId), "ID komplikasi tidak ditemukan.");

    console.log("BERHASIL:", komplikasi.body.data);

    // ========================================================
    // 14. UPDATE KOMPLIKASI
    // ========================================================

    console.log("\n14. PUT komplikasi persalinan");

    const updateKomplikasi = await request(app)
      .put(`/api/komplikasi-persalinan/${komplikasiId}`)
      .send({
        catatan: "Komplikasi sudah ditangani.",
      })
      .expect(200);

    assert(
      updateKomplikasi.body.data.catatan === "Komplikasi sudah ditangani.",
      "Update komplikasi gagal.",
    );

    console.log("BERHASIL:", updateKomplikasi.body.data);

    // ========================================================
    // 15. GET DETAIL NIFAS
    // ========================================================

    console.log("\n15. GET detail nifas");

    const detailNifas = await request(app)
      .get(`/api/nifas/${nifasId}`)
      .expect(200);

    assert(
      detailNifas.body.data.tindakanPersalinan.length === 1,
      "Detail nifas harus mempunyai satu tindakan.",
    );

    assert(
      detailNifas.body.data.komplikasiPersalinan.length === 1,
      "Detail nifas harus mempunyai satu komplikasi.",
    );

    console.log("BERHASIL:", detailNifas.body.data);

    // ========================================================
    // 16. UPDATE NIFAS
    // ========================================================

    console.log("\n16. PUT episode nifas");

    const updateNifas = await request(app)
      .put(`/api/nifas/${nifasId}`)
      .send({
        vitaminA: true,

        asiEksklusif: false,

        catatan: "Nifas dikoreksi.",
      })
      .expect(200);

    assert(
      updateNifas.body.data.asiEksklusif === false,
      "Update ASI eksklusif gagal.",
    );

    console.log("BERHASIL:", updateNifas.body.data);

    // ========================================================
    // 17. GET RINGKASAN REPRODUKSI
    // ========================================================

    console.log("\n17. GET ringkasan reproduksi");

    const ringkasan = await request(app)
      .get(`/api/peserta/${NIK_PEREMPUAN}/reproduksi`)
      .expect(200);

    assert(
      ringkasan.body.data.kehamilan.length === 1,
      "Riwayat kehamilan harus satu.",
    );

    assert(ringkasan.body.data.nifas.length === 1, "Riwayat nifas harus satu.");

    assert(
      ringkasan.body.data.kehamilanAktif === null,
      "Tidak boleh ada kehamilan aktif.",
    );

    assert(
      ringkasan.body.data.nifasAktif.id === nifasId,
      "Nifas aktif tidak sesuai.",
    );

    console.log("BERHASIL:", ringkasan.body.data);

    // ========================================================
    // 18. PESERTA LAKI-LAKI DITOLAK
    // ========================================================

    console.log("\n18. Tolak reproduksi peserta laki-laki");

    const lakiLaki = await request(app)
      .post(`/api/peserta/${NIK_LAKI_LAKI}/kehamilan`)
      .send({
        tanggalMulai: "2026-01-01",
      })
      .expect(400);

    assert(lakiLaki.body.success === false, "Peserta laki-laki harus ditolak.");

    console.log("BERHASIL:", lakiLaki.body);

    // ========================================================
    // 19. VALIDASI TANGGAL INVALID
    // ========================================================

    console.log("\n19. Validasi tanggal invalid");

    const tanggalInvalid = await request(app)
      .put(`/api/nifas/${nifasId}`)
      .send({
        tanggalSelesai: "2026-02-30",
      })
      .expect(400);

    assert(
      tanggalInvalid.body.success === false,
      "Tanggal invalid harus ditolak.",
    );

    console.log("BERHASIL:", tanggalInvalid.body);

    // ========================================================
    // 20. DELETE TINDAKAN
    // ========================================================

    console.log("\n20. DELETE tindakan persalinan");

    await request(app)
      .delete(`/api/tindakan-persalinan/${tindakanId}`)
      .expect(200);

    console.log("BERHASIL.");

    // ========================================================
    // 21. DELETE KOMPLIKASI
    // ========================================================

    console.log("\n21. DELETE komplikasi persalinan");

    await request(app)
      .delete(`/api/komplikasi-persalinan/${komplikasiId}`)
      .expect(200);

    console.log("BERHASIL.");

    // ========================================================
    // 22. SELESAIKAN NIFAS
    // ========================================================

    console.log("\n22. POST selesaikan nifas");

    const selesaiNifas = await request(app)
      .post(`/api/nifas/${nifasId}/selesai`)
      .send({
        tanggalSelesai: "2026-10-01",
      })
      .expect(200);

    assert(
      selesaiNifas.body.data.status === "selesai",
      "Nifas gagal diselesaikan.",
    );

    console.log("BERHASIL:", selesaiNifas.body.data);

    // ========================================================
    // 23. SETELAH NIFAS, KATEGORI KEMBALI BERDASARKAN USIA
    // ========================================================

    console.log("\n23. Rule Engine kembali kategori usia");

    const sesiSetelahNifas = await buatSesi(
      fixture.posyanduId,
      TANGGAL_SESI_SETELAH_NIFAS,
    );

    const formSetelahNifas = await request(app)
      .get(`/api/peserta-sesi/${sesiSetelahNifas.pesertaSesiId}/form`)
      .expect(200);

    assert(
      formSetelahNifas.body.data.kategori === "dewasa",
      `Kategori seharusnya dewasa setelah nifas selesai, aktual ${formSetelahNifas.body.data.kategori}.`,
    );

    console.log("BERHASIL:", {
      kategori: formSetelahNifas.body.data.kategori,

      umur: formSetelahNifas.body.data.umur,
    });

    // ========================================================
    // 24. VALIDASI 404
    // ========================================================

    console.log("\n24. Validasi episode tidak ditemukan");

    const tidakAda = await request(app)
      .get("/api/kehamilan/999999999")
      .expect(404);

    assert(
      tidakAda.body.success === false,
      "Episode tidak ditemukan harus menghasilkan 404.",
    );

    console.log("BERHASIL:", tidakAda.body);

    // ========================================================
    // SELESAI
    // ========================================================

    judul("SEMUA TEST API REPRODUKSI BERHASIL");
  } finally {
    console.log("\nMembersihkan fixture...");

    try {
      await cleanup();

      console.log("Fixture berhasil dibersihkan.");
    } catch (error) {
      console.error("Cleanup fixture gagal:", error);
    }
  }
}

// ============================================================
// RUN
// ============================================================

main().catch((error) => {
  judul("TEST API REPRODUKSI GAGAL");

  console.error(error);

  process.exitCode = 1;
});
