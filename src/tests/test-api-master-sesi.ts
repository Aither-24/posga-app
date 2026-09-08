import request from "supertest";

import { eq } from "drizzle-orm";

import { app } from "../app.js";

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

// ============================================================
// KONFIGURASI FIXTURE
// ============================================================

const NAMA_LOKASI = "LOKASI TEST API MASTER SESI";

const NAMA_POSYANDU = "POSYANDU TEST API MASTER SESI";

const NIK_PESERTA_A = "3578000000099501";

const NIK_PESERTA_B = "3578000000099502";

const NIK_PESERTA_C = "3578000000099503";

const TANGGAL_SESI = "2026-09-03";

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
  const nikTest = [NIK_PESERTA_A, NIK_PESERTA_B, NIK_PESERTA_C];

  // ==========================================================
  // HAPUS HASIL PEMERIKSAAN DAN KONSELING
  // ==========================================================

  for (const nik of nikTest) {
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

    // ========================================================
    // HAPUS SKRINING
    // ========================================================

    await db.delete(hasilSkrining).where(eq(hasilSkrining.pesertaNik, nik));
  }

  // ==========================================================
  // HAPUS PESERTA SESI
  // ==========================================================

  for (const nik of nikTest) {
    await db
      .delete(pesertaSesiPosga)
      .where(eq(pesertaSesiPosga.pesertaNik, nik));
  }

  // ==========================================================
  // HAPUS MEMBERSHIP
  // ==========================================================

  for (const nik of nikTest) {
    await db.delete(pesertaPosyandu).where(eq(pesertaPosyandu.pesertaNik, nik));
  }

  // ==========================================================
  // HAPUS PESERTA
  // ==========================================================

  for (const nik of nikTest) {
    await db.delete(peserta).where(eq(peserta.nik, nik));
  }

  // ==========================================================
  // CARI POSYANDU FIXTURE
  // ==========================================================

  const posyanduRows = await db
    .select({
      id: posyandu.id,
    })
    .from(posyandu)
    .where(eq(posyandu.nama, NAMA_POSYANDU));

  // ==========================================================
  // HAPUS SESI
  // ==========================================================

  for (const row of posyanduRows) {
    await db.delete(sesiPosga).where(eq(sesiPosga.posyanduId, row.id));
  }

  // ==========================================================
  // HAPUS POSYANDU
  // ==========================================================

  await db.delete(posyandu).where(eq(posyandu.nama, NAMA_POSYANDU));

  // ==========================================================
  // HAPUS LOKASI
  // ==========================================================

  await db.delete(lokasi).where(eq(lokasi.nama, NAMA_LOKASI));
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  judul("TEST API MASTER & SESI POSGA");

  try {
    await cleanup();

    // ========================================================
    // 1. CREATE LOKASI
    // ========================================================

    console.log("\n1. POST lokasi");

    const createLokasi = await request(app)
      .post("/api/lokasi")
      .send({
        nama: NAMA_LOKASI,

        alamat: "Alamat test API master sesi",

        aktif: true,
      })
      .expect(201);

    assert(createLokasi.body.success === true, "Create lokasi gagal.");

    const lokasiId = createLokasi.body.data.id;

    assert(Number.isInteger(lokasiId), "ID lokasi tidak ditemukan.");

    console.log("BERHASIL:", createLokasi.body.data);

    // ========================================================
    // 2. GET LOKASI
    // ========================================================

    console.log("\n2. GET lokasi by ID");

    const getLokasi = await request(app)
      .get(`/api/lokasi/${lokasiId}`)
      .expect(200);

    assert(
      getLokasi.body.data.nama === NAMA_LOKASI,
      "Nama lokasi tidak sesuai.",
    );

    console.log("BERHASIL:", getLokasi.body.data);

    // ========================================================
    // 3. UPDATE LOKASI
    // ========================================================

    console.log("\n3. PUT lokasi");

    const updateLokasi = await request(app)
      .put(`/api/lokasi/${lokasiId}`)
      .send({
        alamat: "Alamat lokasi setelah koreksi",
      })
      .expect(200);

    assert(updateLokasi.body.success === true, "Update lokasi gagal.");

    console.log("BERHASIL:", updateLokasi.body.data);

    // ========================================================
    // 4. CREATE POSYANDU
    // ========================================================

    console.log("\n4. POST Posyandu");

    const createPosyandu = await request(app)
      .post("/api/posyandu")
      .send({
        lokasiId,

        nama: NAMA_POSYANDU,

        alamat: "Alamat Posyandu fixture",

        aktif: true,
      })
      .expect(201);

    assert(createPosyandu.body.success === true, "Create Posyandu gagal.");

    const posyanduId = createPosyandu.body.data.id;

    assert(Number.isInteger(posyanduId), "ID Posyandu tidak ditemukan.");

    console.log("BERHASIL:", createPosyandu.body.data);

    // ========================================================
    // 5. GET POSYANDU BY LOKASI
    // ========================================================

    console.log("\n5. GET Posyandu berdasarkan lokasi");

    const daftarPosyandu = await request(app)
      .get(`/api/lokasi/${lokasiId}/posyandu`)
      .expect(200);

    assert(
      daftarPosyandu.body.data.some(
        (item: { id: number }) => item.id === posyanduId,
      ),
      "Posyandu tidak ditemukan dalam lokasi.",
    );

    console.log("BERHASIL. Jumlah:", daftarPosyandu.body.data.length);

    // ========================================================
    // 6. UPDATE POSYANDU
    // ========================================================

    console.log("\n6. PUT Posyandu");

    const updatePosyandu = await request(app)
      .put(`/api/posyandu/${posyanduId}`)
      .send({
        alamat: "Alamat Posyandu setelah koreksi",
      })
      .expect(200);

    assert(updatePosyandu.body.success === true, "Update Posyandu gagal.");

    console.log("BERHASIL:", updatePosyandu.body.data);

    // ========================================================
    // 7. CREATE PESERTA A
    // ========================================================

    console.log("\n7. POST peserta A");

    const pesertaA = await request(app)
      .post("/api/peserta")
      .send({
        nik: NIK_PESERTA_A,

        nama: "Balita Test API Master",

        tanggalLahir: "2022-03-10",

        jenisKelamin: "P",

        aktif: true,
      })
      .expect(201);

    assert(pesertaA.body.success === true, "Peserta A gagal dibuat.");

    console.log("BERHASIL:", pesertaA.body.data);

    // ========================================================
    // 8. CREATE PESERTA B
    // ========================================================

    console.log("\n8. POST peserta B");

    const pesertaB = await request(app)
      .post("/api/peserta")
      .send({
        nik: NIK_PESERTA_B,

        nama: "Dewasa Test API Master",

        tanggalLahir: "1996-01-10",

        jenisKelamin: "L",

        aktif: true,
      })
      .expect(201);

    assert(pesertaB.body.success === true, "Peserta B gagal dibuat.");

    console.log("BERHASIL:", pesertaB.body.data);

    // ========================================================
    // 9. CREATE PESERTA C
    // ========================================================

    console.log("\n9. POST peserta C");

    await request(app)
      .post("/api/peserta")
      .send({
        nik: NIK_PESERTA_C,

        nama: "Peserta Test Nonaktif",

        tanggalLahir: "1990-05-10",

        jenisKelamin: "P",

        aktif: true,
      })
      .expect(201);

    console.log("BERHASIL.");

    // ========================================================
    // 10. UPDATE PESERTA A
    // ========================================================

    console.log("\n10. PUT peserta A");

    const updatePeserta = await request(app)
      .put(`/api/peserta/${NIK_PESERTA_A}`)
      .send({
        noTelp: "081234567890",
      })
      .expect(200);

    assert(updatePeserta.body.success === true, "Update peserta gagal.");

    console.log("BERHASIL:", updatePeserta.body.data);

    // ========================================================
    // 11. NONAKTIFKAN PESERTA C
    // ========================================================

    console.log("\n11. DELETE/nonaktifkan peserta C");

    await request(app).delete(`/api/peserta/${NIK_PESERTA_C}`).expect(200);

    const pesertaCAfter = await request(app)
      .get(`/api/peserta/${NIK_PESERTA_C}`)
      .expect(200);

    assert(
      pesertaCAfter.body.data.aktif === false,
      "Peserta C seharusnya nonaktif.",
    );

    console.log("BERHASIL: peserta C nonaktif.");

    // ========================================================
    // 12. TEMPATKAN PESERTA A KE POSYANDU
    // ========================================================

    console.log("\n12. POST peserta-posyandu");

    const membership = await request(app)
      .post("/api/peserta-posyandu")
      .send({
        pesertaNik: NIK_PESERTA_A,

        posyanduId,

        tanggalMulai: "2026-01-01",
      })
      .expect(201);

    assert(membership.body.success === true, "Membership peserta gagal.");

    console.log("BERHASIL:", membership.body.data);

    // ========================================================
    // 13. RIWAYAT MEMBERSHIP
    // ========================================================

    console.log("\n13. GET riwayat Posyandu peserta");

    const riwayat = await request(app)
      .get(`/api/peserta/${NIK_PESERTA_A}/riwayat-posyandu`)
      .expect(200);

    assert(riwayat.body.data.length >= 1, "Riwayat Posyandu tidak ditemukan.");

    console.log("BERHASIL. Jumlah:", riwayat.body.data.length);

    // ========================================================
    // 14. GET PESERTA AKTIF POSYANDU
    // ========================================================

    console.log("\n14. GET peserta aktif Posyandu");

    const anggota = await request(app)
      .get(`/api/posyandu/${posyanduId}/peserta`)
      .expect(200);

    assert(
      anggota.body.data.some(
        (item: { pesertaNik?: string; nik?: string }) =>
          item.pesertaNik === NIK_PESERTA_A || item.nik === NIK_PESERTA_A,
      ),
      "Peserta A tidak ditemukan sebagai anggota aktif.",
    );

    console.log("BERHASIL. Jumlah:", anggota.body.data.length);

    // ========================================================
    // 15. CREATE SESI
    //
    // Penting:
    // buatSesiPosga mengembalikan wrapper:
    //
    // {
    //   sesi: {...},
    //   jumlahPeserta: ...,
    //   peserta: [...]
    // }
    //
    // Jadi ID ada pada data.sesi.id
    // ========================================================

    console.log("\n15. POST sesi");

    const createSesi = await request(app)
      .post("/api/sesi")
      .send({
        posyanduId,

        tanggalPosga: TANGGAL_SESI,

        catatan: "Fixture API master sesi",
      })
      .expect(201);

    assert(createSesi.body.success === true, "Create sesi gagal.");

    assert(createSesi.body.data, "Response data sesi tidak ditemukan.");

    assert(createSesi.body.data.sesi, "Object data.sesi tidak ditemukan.");

    const sesiId = createSesi.body.data.sesi.id;

    assert(Number.isInteger(sesiId), "ID sesi tidak ditemukan.");

    assert(
      createSesi.body.data.sesi.tanggalPosga === TANGGAL_SESI,
      "Tanggal sesi hasil create tidak sesuai.",
    );

    console.log("BERHASIL:", createSesi.body.data);

    // ========================================================
    // 16. GET SESI
    // ========================================================

    console.log("\n16. GET sesi");

    const getSesi = await request(app).get(`/api/sesi/${sesiId}`).expect(200);

    assert(
      getSesi.body.data.tanggalPosga === TANGGAL_SESI,
      "Tanggal sesi tidak sesuai.",
    );

    console.log("BERHASIL:", getSesi.body.data);

    // ========================================================
    // 17. ROSTER OTOMATIS
    // ========================================================

    console.log("\n17. GET roster sesi");

    let rosterResponse = await request(app)
      .get(`/api/sesi/${sesiId}/peserta`)
      .expect(200);

    const rosterAwal = rosterResponse.body.data;

    console.log("Roster awal:", rosterAwal);

    const pesertaAOtomatis = rosterAwal.find(
      (item: { pesertaNik?: string; nik?: string }) =>
        item.pesertaNik === NIK_PESERTA_A || item.nik === NIK_PESERTA_A,
    );

    assert(
      pesertaAOtomatis,
      "Peserta A seharusnya otomatis masuk roster sesi.",
    );

    console.log("BERHASIL: peserta aktif otomatis masuk roster.");

    // ========================================================
    // 18. TAMBAH PESERTA B MANUAL
    // ========================================================

    console.log("\n18. POST peserta B ke sesi secara manual");

    const tambahManual = await request(app)
      .post(`/api/sesi/${sesiId}/peserta`)
      .send({
        pesertaNik: NIK_PESERTA_B,
      })
      .expect(201);

    assert(
      tambahManual.body.data.pesertaNik === NIK_PESERTA_B,
      "Peserta B manual gagal masuk.",
    );

    const pesertaSesiBId = tambahManual.body.data.id;

    assert(
      Number.isInteger(pesertaSesiBId),
      "ID peserta sesi B tidak ditemukan.",
    );

    console.log("BERHASIL:", tambahManual.body.data);

    // ========================================================
    // 19. DUPLIKAT PESERTA SESI -> 409
    // ========================================================

    console.log("\n19. Validasi duplikat peserta sesi");

    const duplikat = await request(app)
      .post(`/api/sesi/${sesiId}/peserta`)
      .send({
        pesertaNik: NIK_PESERTA_B,
      })
      .expect(409);

    assert(duplikat.body.success === false, "Duplikat seharusnya gagal.");

    console.log("BERHASIL:", duplikat.body);

    // ========================================================
    // 20. HAPUS PESERTA B TANPA HASIL KLINIS
    // ========================================================

    console.log("\n20. DELETE peserta B dari roster tanpa hasil");

    const hapusB = await request(app)
      .delete(`/api/sesi/${sesiId}/peserta/${NIK_PESERTA_B}`)
      .expect(200);

    assert(hapusB.body.data.berhasil === true, "Peserta B gagal dihapus.");

    console.log("BERHASIL:", hapusB.body.data);

    // ========================================================
    // 21. TAMBAHKAN B KEMBALI
    // ========================================================

    console.log("\n21. Tambah peserta B kembali");

    const tambahBKembali = await request(app)
      .post(`/api/sesi/${sesiId}/peserta`)
      .send({
        pesertaNik: NIK_PESERTA_B,
      })
      .expect(201);

    const pesertaSesiBBaruId = tambahBKembali.body.data.id;

    assert(
      Number.isInteger(pesertaSesiBBaruId),
      "Peserta sesi B baru tidak ditemukan.",
    );

    console.log("BERHASIL:", tambahBKembali.body.data);

    // ========================================================
    // 22. GET FORM KLINIS B
    // ========================================================

    console.log("\n22. GET form klinis peserta B");

    const formB = await request(app)
      .get(`/api/peserta-sesi/${pesertaSesiBBaruId}/form`)
      .expect(200);

    assert(formB.body.success === true, "Form peserta B gagal.");

    console.log("BERHASIL:", {
      nama: formB.body.data.nama,

      kategori: formB.body.data.kategori,

      umur: formB.body.data.umur,
    });

    // ========================================================
    // 23. TAMBAH HASIL PEMERIKSAAN B
    // ========================================================

    console.log("\n23. Tambah hasil klinis peserta B");

    const indikatorNumber = formB.body.data.pemeriksaan.find(
      (item: {
        tipeInput: string;

        derived: boolean;

        statusKelayakan: string;
      }) =>
        item.tipeInput === "number" &&
        item.derived === false &&
        item.statusKelayakan === "tampil",
    );

    assert(indikatorNumber, "Indikator number peserta B tidak ditemukan.");

    const hasilKlinis = await request(app)
      .post("/api/pemeriksaan")
      .send({
        pesertaSesiPosgaId: pesertaSesiBBaruId,

        indikatorId: indikatorNumber.indikatorId,

        nilaiNumber: 60.5,

        catatan: "Fixture proteksi roster.",
      })
      .expect(201);

    const hasilPemeriksaanId = hasilKlinis.body.data.id;

    assert(
      Number.isInteger(hasilPemeriksaanId),
      "Hasil pemeriksaan tidak tersimpan.",
    );

    console.log("BERHASIL:", hasilKlinis.body.data);

    // ========================================================
    // 24. TOLAK HAPUS B KARENA PUNYA HASIL
    // ========================================================

    console.log("\n24. Tolak hapus roster yang memiliki hasil klinis");

    const hapusBerisi = await request(app)
      .delete(`/api/sesi/${sesiId}/peserta/${NIK_PESERTA_B}`)
      .expect(409);

    assert(
      hapusBerisi.body.success === false,
      "Roster dengan hasil klinis seharusnya tidak boleh dihapus.",
    );

    console.log("BERHASIL:", hapusBerisi.body);

    // ========================================================
    // 25. HAPUS HASIL PEMERIKSAAN
    // ========================================================

    console.log("\n25. Hapus hasil klinis peserta B");

    await request(app)
      .delete(`/api/pemeriksaan/${hasilPemeriksaanId}`)
      .expect(200);

    console.log("BERHASIL.");

    // ========================================================
    // 26. HAPUS PESERTA B
    // ========================================================

    console.log("\n26. DELETE peserta B setelah hasil dibersihkan");

    await request(app)
      .delete(`/api/sesi/${sesiId}/peserta/${NIK_PESERTA_B}`)
      .expect(200);

    console.log("BERHASIL.");

    // ========================================================
    // 27. UPDATE SESI
    //
    // updateSesiPosga mengembalikan wrapper:
    //
    // {
    //   sesi: {...},
    //   jumlahPeserta: ...,
    //   peserta: [...]
    // }
    // ========================================================

    console.log("\n27. PUT sesi");

    const updateSesi = await request(app)
      .put(`/api/sesi/${sesiId}`)
      .send({
        catatan: "Catatan sesi dikoreksi melalui API.",
      })
      .expect(200);

    assert(updateSesi.body.success === true, "Update sesi gagal.");

    assert(updateSesi.body.data, "Data hasil update sesi tidak ditemukan.");

    assert(
      updateSesi.body.data.sesi,
      "Object data.sesi hasil update tidak ditemukan.",
    );

    assert(
      updateSesi.body.data.sesi.id === sesiId,
      "ID sesi setelah update berubah/tidak sesuai.",
    );

    assert(
      updateSesi.body.data.sesi.catatan ===
        "Catatan sesi dikoreksi melalui API.",
      "Catatan sesi setelah update tidak sesuai.",
    );

    console.log("BERHASIL:", updateSesi.body.data);

    // ========================================================
    // 28. SELESAIKAN SESI
    // ========================================================

    console.log("\n28. POST selesaikan sesi");

    const selesai = await request(app)
      .post(`/api/sesi/${sesiId}/selesai`)
      .expect(200);

    assert(selesai.body.success === true, "Sesi gagal diselesaikan.");

    console.log("BERHASIL:", selesai.body.data);

    // ========================================================
    // 29. TOLAK TAMBAH PESERTA KE SESI SELESAI
    // ========================================================

    console.log("\n29. Tolak tambah peserta pada sesi selesai");

    const tambahSetelahSelesai = await request(app)
      .post(`/api/sesi/${sesiId}/peserta`)
      .send({
        pesertaNik: NIK_PESERTA_B,
      })
      .expect(409);

    assert(
      tambahSetelahSelesai.body.success === false,
      "Sesi selesai seharusnya menolak peserta baru.",
    );

    console.log("BERHASIL:", tambahSetelahSelesai.body);

    // ========================================================
    // 30. GET DAFTAR SESI POSYANDU
    // ========================================================

    console.log("\n30. GET daftar sesi Posyandu");

    const daftarSesi = await request(app)
      .get(`/api/posyandu/${posyanduId}/sesi`)
      .expect(200);

    assert(
      daftarSesi.body.data.some((item: { id: number }) => item.id === sesiId),
      "Sesi tidak ditemukan dalam daftar Posyandu.",
    );

    console.log("BERHASIL. Jumlah:", daftarSesi.body.data.length);

    // ========================================================
    // 31. VALIDASI HTTP 400
    // ========================================================

    console.log("\n31. Validasi HTTP 400");

    const invalidId = await request(app).get("/api/sesi/abc").expect(400);

    assert(
      invalidId.body.success === false,
      "ID invalid harus menghasilkan 400.",
    );

    console.log("BERHASIL:", invalidId.body);

    // ========================================================
    // 32. VALIDASI HTTP 404
    // ========================================================

    console.log("\n32. Validasi HTTP 404");

    const tidakAda = await request(app)
      .get("/api/lokasi/999999999")
      .expect(404);

    assert(
      tidakAda.body.success === false,
      "Resource tidak ditemukan harus menghasilkan 404.",
    );

    console.log("BERHASIL:", tidakAda.body);

    // ========================================================
    // 33. VALIDASI ROSTER AKHIR
    // ========================================================

    console.log("\n33. Validasi roster akhir");

    rosterResponse = await request(app)
      .get(`/api/sesi/${sesiId}/peserta`)
      .expect(200);

    const rosterAkhir = rosterResponse.body.data;

    assert(
      rosterAkhir.some(
        (item: { pesertaNik?: string; nik?: string }) =>
          item.pesertaNik === NIK_PESERTA_A || item.nik === NIK_PESERTA_A,
      ),
      "Peserta A harus tetap berada dalam snapshot sesi.",
    );

    assert(
      !rosterAkhir.some(
        (item: { pesertaNik?: string; nik?: string }) =>
          item.pesertaNik === NIK_PESERTA_B || item.nik === NIK_PESERTA_B,
      ),
      "Peserta B seharusnya sudah dihapus dari roster.",
    );

    console.log("BERHASIL:", rosterAkhir);

    // ========================================================
    // SELESAI
    // ========================================================

    judul("SEMUA TEST API MASTER & SESI BERHASIL");
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
  judul("TEST API MASTER & SESI GAGAL");

  console.error(error);

  process.exitCode = 1;
});
