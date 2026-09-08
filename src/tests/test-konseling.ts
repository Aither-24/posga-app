import { eq } from "drizzle-orm";

import { db } from "../db/index.js";

import {
  hasilKonseling,
  lokasi,
  peserta,
  pesertaPosyandu,
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
} from "../db/schema.js";

import { generateFormPesertaSesi } from "../lib/rule-engine.service.js";

import {
  ambilHasilKonselingById,
  ambilHasilKonselingPesertaSesi,
  hapusHasilKonseling,
  tambahHasilKonseling,
  updateHasilKonseling,
} from "../lib/konseling.service.js";

// ============================================================
// CONFIG
// ============================================================

const NIK = "3578000000099201";

const NAMA_LOKASI = "LOKASI TEST KONSELING";

const NAMA_POSYANDU = "POSYANDU TEST KONSELING";

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
  const pesertaSesiRows = await db
    .select({
      id: pesertaSesiPosga.id,
    })
    .from(pesertaSesiPosga)
    .where(eq(pesertaSesiPosga.pesertaNik, NIK));

  for (const row of pesertaSesiRows) {
    await db
      .delete(hasilKonseling)
      .where(eq(hasilKonseling.pesertaSesiPosgaId, row.id));
  }

  await db.delete(pesertaSesiPosga).where(eq(pesertaSesiPosga.pesertaNik, NIK));

  await db.delete(pesertaPosyandu).where(eq(pesertaPosyandu.pesertaNik, NIK));

  await db.delete(peserta).where(eq(peserta.nik, NIK));

  const posyanduRows = await db
    .select({
      id: posyandu.id,
    })
    .from(posyandu)
    .where(eq(posyandu.nama, NAMA_POSYANDU));

  for (const row of posyanduRows) {
    await db.delete(sesiPosga).where(eq(sesiPosga.posyanduId, row.id));
  }

  await db.delete(posyandu).where(eq(posyandu.nama, NAMA_POSYANDU));

  await db.delete(lokasi).where(eq(lokasi.nama, NAMA_LOKASI));
}

// ============================================================
// FIXTURE
// ============================================================

async function buatFixture() {
  await cleanup();

  const lokasiRows = await db
    .insert(lokasi)
    .values({
      nama: NAMA_LOKASI,

      alamat: "Fixture multiselect konseling",

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

      alamat: "Fixture multiselect konseling",

      aktif: true,
    })
    .returning({
      id: posyandu.id,
    });

  const posyanduId = posyanduRows[0]?.id;

  assert(posyanduId, "Posyandu gagal dibuat.");

  await db.insert(peserta).values({
    nik: NIK,

    nama: "Balita Test Konseling",

    tanggalLahir: "2022-03-10",

    jenisKelamin: "P",

    aktif: true,
  });

  await db.insert(pesertaPosyandu).values({
    pesertaNik: NIK,

    posyanduId,

    tanggalMulai: "2025-01-01",

    aktif: true,
  });

  const sesiRows = await db
    .insert(sesiPosga)
    .values({
      posyanduId,

      tanggalPosga: TANGGAL_SESI,

      status: "aktif",

      catatan: "Fixture test konseling",
    })
    .returning({
      id: sesiPosga.id,
    });

  const sesiId = sesiRows[0]?.id;

  assert(sesiId, "Sesi gagal dibuat.");

  const pesertaSesiRows = await db
    .insert(pesertaSesiPosga)
    .values({
      sesiPosgaId: sesiId,

      pesertaNik: NIK,

      kategoriSaatItu: "balita",

      sumberKategori: "usia",

      statusPemeriksaan: "belum_diperiksa",
    })
    .returning({
      id: pesertaSesiPosga.id,
    });

  const pesertaSesiId = pesertaSesiRows[0]?.id;

  assert(pesertaSesiId, "Peserta sesi gagal dibuat.");

  return {
    pesertaSesiId,
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  judul("TEST CRUD KONSELING MULTISELECT");

  try {
    const fixture = await buatFixture();

    console.log("\nFixture:", fixture);

    const form = await generateFormPesertaSesi(fixture.pesertaSesiId);

    const konseling = form.konseling.find(
      (item) => item.kode === "KONSELING_BALITA",
    );

    assert(konseling, "KONSELING_BALITA tidak ditemukan.");

    assert(
      konseling.tipeInput === "multiselect",
      "KONSELING_BALITA harus bertipe multiselect.",
    );

    assert(
      konseling.opsi.length >= 2,
      "Test membutuhkan minimal dua opsi konseling.",
    );

    const opsi1 = konseling.opsi[0];

    const opsi2 = konseling.opsi[1];

    assert(opsi1, "Opsi pertama tidak ditemukan.");

    assert(opsi2, "Opsi kedua tidak ditemukan.");

    console.log("\nIndikator:", {
      kode: konseling.kode,

      nama: konseling.nama,

      tipeInput: konseling.tipeInput,

      jumlahOpsi: konseling.opsi.length,
    });

    console.log("Opsi test:", [
      {
        id: opsi1.id,

        kode: opsi1.kode,

        label: opsi1.label,
      },
      {
        id: opsi2.id,

        kode: opsi2.kode,

        label: opsi2.label,
      },
    ]);

    // ========================================================
    // 1. CREATE MULTISELECT
    // ========================================================

    console.log("\n1. Tambah konseling multiselect");

    const dibuat = await tambahHasilKonseling({
      pesertaSesiPosgaId: fixture.pesertaSesiId,

      indikatorId: konseling.indikatorId,

      opsiIds: [opsi1.id, opsi2.id],

      catatan: "Dua jenis konseling diberikan.",
    });

    assert(
      dibuat.opsiId === null,
      "Multiselect tidak boleh memakai opsiId utama.",
    );

    assert(
      dibuat.opsiTerpilih.length === 2,
      `Harus tersimpan 2 opsi, aktual ${dibuat.opsiTerpilih.length}.`,
    );

    assert(
      dibuat.opsiTerpilih.some((item) => item.id === opsi1.id),
      "Opsi pertama tidak tersimpan.",
    );

    assert(
      dibuat.opsiTerpilih.some((item) => item.id === opsi2.id),
      "Opsi kedua tidak tersimpan.",
    );

    console.log("BERHASIL:", dibuat);

    // ========================================================
    // 2. READ
    // ========================================================

    console.log("\n2. Read by ID");

    const dibaca = await ambilHasilKonselingById(dibuat.id);

    assert(dibaca, "Hasil konseling tidak ditemukan.");

    assert(
      dibaca.opsiTerpilih.length === 2,
      "Read harus mengembalikan dua opsi.",
    );

    console.log("BERHASIL:", dibaca);

    // ========================================================
    // 3. LIST
    // ========================================================

    console.log("\n3. List peserta sesi");

    const daftar = await ambilHasilKonselingPesertaSesi(fixture.pesertaSesiId);

    assert(
      daftar.length === 1,
      `Seharusnya ada 1 konseling, aktual ${daftar.length}.`,
    );

    assert(
      daftar[0]?.opsiTerpilih.length === 2,
      "List harus membawa opsiTerpilih.",
    );

    console.log("BERHASIL. Jumlah:", daftar.length);

    // ========================================================
    // 4. DUPLIKAT
    // ========================================================

    console.log("\n4. Validasi duplikat");

    let duplikatDitolak = false;

    try {
      await tambahHasilKonseling({
        pesertaSesiPosgaId: fixture.pesertaSesiId,

        indikatorId: konseling.indikatorId,

        opsiIds: [opsi1.id],
      });
    } catch {
      duplikatDitolak = true;
    }

    assert(duplikatDitolak, "Duplikat harus ditolak.");

    console.log("BERHASIL: duplikat ditolak.");

    // ========================================================
    // 5. MULTISELECT TANPA OPSI
    // ========================================================

    console.log("\n5. Validasi multiselect tanpa opsi");

    await hapusHasilKonseling(dibuat.id);

    let tanpaOpsiDitolak = false;

    try {
      await tambahHasilKonseling({
        pesertaSesiPosgaId: fixture.pesertaSesiId,

        indikatorId: konseling.indikatorId,

        opsiIds: [],
      });
    } catch {
      tanpaOpsiDitolak = true;
    }

    assert(tanpaOpsiDitolak, "Multiselect tanpa opsi harus ditolak.");

    console.log("BERHASIL: multiselect kosong ditolak.");

    // ========================================================
    // 6. CREATE UNTUK UPDATE
    // ========================================================

    const untukUpdate = await tambahHasilKonseling({
      pesertaSesiPosgaId: fixture.pesertaSesiId,

      indikatorId: konseling.indikatorId,

      opsiIds: [opsi1.id, opsi2.id],

      catatan: "Sebelum koreksi.",
    });

    // ========================================================
    // 7. UPDATE MULTISELECT
    //
    // Dari 2 opsi menjadi 1 opsi.
    // ========================================================

    console.log("\n6. Update multiselect");

    const diupdate = await updateHasilKonseling(untukUpdate.id, {
      opsiIds: [opsi2.id],

      catatan: "Hanya satu jenis konseling setelah koreksi.",
    });

    assert(
      diupdate.opsiTerpilih.length === 1,
      "Setelah update harus tersisa satu opsi.",
    );

    assert(
      diupdate.opsiTerpilih[0]?.id === opsi2.id,
      "Opsi setelah update tidak sesuai.",
    );

    assert(
      diupdate.catatan === "Hanya satu jenis konseling setelah koreksi.",
      "Catatan update tidak sesuai.",
    );

    console.log("BERHASIL:", diupdate);

    // ========================================================
    // 8. DELETE
    // ========================================================

    console.log("\n7. Hapus konseling");

    await hapusHasilKonseling(untukUpdate.id);

    const sesudahHapus = await ambilHasilKonselingById(untukUpdate.id);

    assert(
      sesudahHapus === null,
      "Hasil konseling masih ditemukan setelah delete.",
    );

    console.log("BERHASIL: data terhapus.");

    judul("SEMUA TEST KONSELING MULTISELECT BERHASIL");
  } finally {
    console.log("\nMembersihkan fixture...");

    try {
      await cleanup();

      console.log("Fixture berhasil dibersihkan.");
    } catch (error) {
      console.error("Cleanup gagal:", error);
    }
  }
}

// ============================================================
// RUN
// ============================================================

main().catch((error) => {
  judul("TEST KONSELING MULTISELECT GAGAL");

  console.error(error);

  process.exitCode = 1;
});
