import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../db/index.js";

import {
  episodeKehamilan,
  episodeNifas,
  hasilPemeriksaan,
  hasilPemeriksaanOpsi,
  indikator,
  lokasi,
  opsiIndikator,
  peserta,
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
} from "../db/schema.js";

import {
  tambahHasilPemeriksaan,
  updateHasilPemeriksaan,
} from "../lib/pemeriksaan.service.js";

import {
  tambahEpisodeKehamilan,
  tambahEpisodeNifas,
} from "../lib/reproduksi.service.js";

import {
  batalkanSesiPosga,
  tentukanKategoriPemeriksaan,
  updateSesiPosga,
} from "../lib/sesi-posga.service.js";

const NAMA_LOKASI = "LOKASI TEST INTEGRITY INVARIANTS";
const NAMA_POSYANDU = "POSYANDU TEST INTEGRITY INVARIANTS";
const NIK_PEREMPUAN_A = "3578000000099801";
const NIK_PEREMPUAN_B = "3578000000099802";
const NIK_LAKI = "3578000000099803";
const KODE_INDIKATOR_NUMBER = "TEST_INTEGRITY_NUMBER";
const KODE_INDIKATOR_MULTI = "TEST_INTEGRITY_MULTI";
const TRIGGER_FAIL_PEMERIKSAAN_OPSI = "test_integrity_fail_pemeriksaan_opsi";
const TRIGGER_FAIL_CLOSE_KEHAMILAN = "test_integrity_fail_close_kehamilan";

function assert(kondisi: unknown, pesan: string): asserts kondisi {
  if (!kondisi) throw new Error(`ASSERT GAGAL: ${pesan}`);
}

let jumlahBerhasil = 0;

function judul(teks: string) {
  console.log("\n========================================");
  console.log(teks);
  console.log("========================================");
}

function berhasil(nomor: number, pesan: string) {
  jumlahBerhasil++;
  console.log(`${nomor}. BERHASIL: ${pesan}`);
}

async function harusGagal(aksi: () => Promise<unknown>, pesan: string) {
  let gagal = false;
  try {
    await aksi();
  } catch {
    gagal = true;
  }
  assert(gagal, pesan);
}

function hapusTriggerTest() {
  db.run(sql.raw(`DROP TRIGGER IF EXISTS ${TRIGGER_FAIL_PEMERIKSAAN_OPSI}`));
  db.run(sql.raw(`DROP TRIGGER IF EXISTS ${TRIGGER_FAIL_CLOSE_KEHAMILAN}`));
}

function pasangTriggerGagalInsertOpsi() {
  db.run(
    sql.raw(`
    CREATE TRIGGER ${TRIGGER_FAIL_PEMERIKSAAN_OPSI}
    BEFORE INSERT ON hasil_pemeriksaan_opsi
    BEGIN
      SELECT RAISE(ABORT, 'forced integrity test: hasil_pemeriksaan_opsi');
    END;
  `),
  );
}

function pasangTriggerGagalTutupKehamilan() {
  db.run(
    sql.raw(`
    CREATE TRIGGER ${TRIGGER_FAIL_CLOSE_KEHAMILAN}
    BEFORE UPDATE ON episode_kehamilan
    BEGIN
      SELECT RAISE(ABORT, 'forced integrity test: episode_kehamilan update');
    END;
  `),
  );
}

async function cleanup() {
  hapusTriggerTest();

  const nikTest = [NIK_PEREMPUAN_A, NIK_PEREMPUAN_B, NIK_LAKI];

  const pesertaSesiRows = await db
    .select({ id: pesertaSesiPosga.id })
    .from(pesertaSesiPosga)
    .where(inArray(pesertaSesiPosga.pesertaNik, nikTest));

  const pesertaSesiIds = pesertaSesiRows.map((row) => row.id);

  if (pesertaSesiIds.length > 0) {
    const pemeriksaanRows = await db
      .select({ id: hasilPemeriksaan.id })
      .from(hasilPemeriksaan)
      .where(inArray(hasilPemeriksaan.pesertaSesiPosgaId, pesertaSesiIds));

    const pemeriksaanIds = pemeriksaanRows.map((row) => row.id);

    if (pemeriksaanIds.length > 0) {
      await db
        .delete(hasilPemeriksaanOpsi)
        .where(
          inArray(hasilPemeriksaanOpsi.hasilPemeriksaanId, pemeriksaanIds),
        );
    }

    await db
      .delete(hasilPemeriksaan)
      .where(inArray(hasilPemeriksaan.pesertaSesiPosgaId, pesertaSesiIds));
  }

  await db
    .delete(pesertaSesiPosga)
    .where(inArray(pesertaSesiPosga.pesertaNik, nikTest));

  await db
    .delete(episodeNifas)
    .where(inArray(episodeNifas.pesertaNik, nikTest));

  await db
    .delete(episodeKehamilan)
    .where(inArray(episodeKehamilan.pesertaNik, nikTest));

  const posyanduRows = await db
    .select({ id: posyandu.id })
    .from(posyandu)
    .where(eq(posyandu.nama, NAMA_POSYANDU));

  const posyanduIds = posyanduRows.map((row) => row.id);

  if (posyanduIds.length > 0) {
    await db
      .delete(sesiPosga)
      .where(inArray(sesiPosga.posyanduId, posyanduIds));

    await db.delete(posyandu).where(inArray(posyandu.id, posyanduIds));
  }

  await db.delete(peserta).where(inArray(peserta.nik, nikTest));

  await db
    .delete(indikator)
    .where(
      inArray(indikator.kode, [KODE_INDIKATOR_NUMBER, KODE_INDIKATOR_MULTI]),
    );

  await db.delete(lokasi).where(eq(lokasi.nama, NAMA_LOKASI));
}

async function main() {
  judul("TEST INTEGRITY / INVARIANT POSGA");
  await cleanup();

  const lokasiRows = await db
    .insert(lokasi)
    .values({
      nama: NAMA_LOKASI,
      alamat: "Fixture integrity test",
      aktif: true,
    })
    .returning({ id: lokasi.id });

  const lokasiId = lokasiRows[0]?.id;
  assert(lokasiId, "Lokasi fixture gagal dibuat.");

  const posyanduRows = await db
    .insert(posyandu)
    .values({
      lokasiId,
      nama: NAMA_POSYANDU,
      alamat: "Fixture integrity test",
      aktif: true,
    })
    .returning({ id: posyandu.id });

  const posyanduId = posyanduRows[0]?.id;
  assert(posyanduId, "Posyandu fixture gagal dibuat.");

  await db.insert(peserta).values([
    {
      nik: NIK_PEREMPUAN_A,
      nama: "Perempuan A Integrity",
      tanggalLahir: "1995-04-20",
      jenisKelamin: "P",
      aktif: true,
    },
    {
      nik: NIK_PEREMPUAN_B,
      nama: "Perempuan B Integrity",
      tanggalLahir: "1994-06-10",
      jenisKelamin: "P",
      aktif: true,
    },
    {
      nik: NIK_LAKI,
      nama: "Laki Integrity",
      tanggalLahir: "1993-02-15",
      jenisKelamin: "L",
      aktif: true,
    },
  ]);

  const indikatorNumberRows = await db
    .insert(indikator)
    .values({
      kode: KODE_INDIKATOR_NUMBER,
      nama: "Indikator Number Integrity",
      kelompok: "pemeriksaan",
      tipeInput: "number",
      satuan: "unit",
      derived: false,
      aktif: true,
    })
    .returning({ id: indikator.id });

  const indikatorNumberId = indikatorNumberRows[0]?.id;
  assert(indikatorNumberId, "Indikator number fixture gagal dibuat.");

  const indikatorMultiRows = await db
    .insert(indikator)
    .values({
      kode: KODE_INDIKATOR_MULTI,
      nama: "Indikator Multiselect Integrity",
      kelompok: "pemeriksaan",
      tipeInput: "multiselect",
      derived: false,
      aktif: true,
    })
    .returning({ id: indikator.id });

  const indikatorMultiId = indikatorMultiRows[0]?.id;
  assert(indikatorMultiId, "Indikator multiselect fixture gagal dibuat.");

  const opsiRows = await db
    .insert(opsiIndikator)
    .values([
      {
        indikatorId: indikatorMultiId,
        kode: "OPS_A",
        label: "Opsi A",
        urutan: 1,
        aktif: true,
      },
      {
        indikatorId: indikatorMultiId,
        kode: "OPS_B",
        label: "Opsi B",
        urutan: 2,
        aktif: true,
      },
    ])
    .returning({ id: opsiIndikator.id, kode: opsiIndikator.kode });

  const opsiA = opsiRows.find((item) => item.kode === "OPS_A");
  const opsiB = opsiRows.find((item) => item.kode === "OPS_B");
  assert(opsiA && opsiB, "Opsi fixture gagal dibuat.");

  const sesiAktifRows = await db
    .insert(sesiPosga)
    .values({
      posyanduId,
      tanggalPosga: "2026-09-10",
      status: "aktif",
      catatan: "Sesi aktif integrity",
    })
    .returning({ id: sesiPosga.id });

  const sesiAktifId = sesiAktifRows[0]?.id;
  assert(sesiAktifId, "Sesi aktif fixture gagal dibuat.");

  const sesiRollbackRows = await db
    .insert(sesiPosga)
    .values({
      posyanduId,
      tanggalPosga: "2026-09-11",
      status: "aktif",
      catatan: "Sesi rollback integrity",
    })
    .returning({ id: sesiPosga.id });

  const sesiRollbackId = sesiRollbackRows[0]?.id;
  assert(sesiRollbackId, "Sesi rollback fixture gagal dibuat.");

  const sesiSelesaiRows = await db
    .insert(sesiPosga)
    .values({
      posyanduId,
      tanggalPosga: "2026-09-12",
      status: "selesai",
      catatan: "Sesi selesai integrity",
    })
    .returning({ id: sesiPosga.id });

  const sesiSelesaiId = sesiSelesaiRows[0]?.id;
  assert(sesiSelesaiId, "Sesi selesai fixture gagal dibuat.");

  const sesiBatalRows = await db
    .insert(sesiPosga)
    .values({
      posyanduId,
      tanggalPosga: "2026-09-13",
      status: "dibatalkan",
      catatan: "Sesi batal integrity",
    })
    .returning({ id: sesiPosga.id });

  const sesiBatalId = sesiBatalRows[0]?.id;
  assert(sesiBatalId, "Sesi batal fixture gagal dibuat.");

  const pragmaRows = db.all(sql.raw("PRAGMA foreign_keys")) as Array<{
    foreign_keys: number;
  }>;
  assert(
    Number(pragmaRows[0]?.foreign_keys ?? 0) === 1,
    "PRAGMA foreign_keys harus ON.",
  );
  berhasil(1, "SQLite foreign_keys aktif.");

  await harusGagal(async () => {
    await db.insert(pesertaSesiPosga).values({
      sesiPosgaId: 2147483001,
      pesertaNik: NIK_PEREMPUAN_A,
      kategoriSaatItu: "dewasa",
      sumberKategori: "usia",
      statusPemeriksaan: "belum_diperiksa",
    });
  }, "FK peserta_sesi -> sesi tidak bekerja.");
  berhasil(2, "FK peserta_sesi -> sesi menolak sesi tidak valid.");

  await harusGagal(async () => {
    await db.insert(pesertaSesiPosga).values({
      sesiPosgaId: sesiAktifId,
      pesertaNik: "9999999999999999",
      kategoriSaatItu: "dewasa",
      sumberKategori: "usia",
      statusPemeriksaan: "belum_diperiksa",
    });
  }, "FK peserta_sesi -> peserta tidak bekerja.");
  berhasil(3, "FK peserta_sesi -> peserta menolak peserta tidak valid.");

  const rosterAktifRows = await db
    .insert(pesertaSesiPosga)
    .values({
      sesiPosgaId: sesiAktifId,
      pesertaNik: NIK_PEREMPUAN_A,
      kategoriSaatItu: "dewasa",
      sumberKategori: "usia",
      statusPemeriksaan: "belum_diperiksa",
    })
    .returning({ id: pesertaSesiPosga.id });

  const rosterAktifId = rosterAktifRows[0]?.id;
  assert(rosterAktifId, "Roster aktif fixture gagal dibuat.");

  const rosterRollbackRows = await db
    .insert(pesertaSesiPosga)
    .values({
      sesiPosgaId: sesiRollbackId,
      pesertaNik: NIK_PEREMPUAN_B,
      kategoriSaatItu: "dewasa",
      sumberKategori: "usia",
      statusPemeriksaan: "belum_diperiksa",
    })
    .returning({ id: pesertaSesiPosga.id });

  const rosterRollbackId = rosterRollbackRows[0]?.id;
  assert(rosterRollbackId, "Roster rollback fixture gagal dibuat.");

  await harusGagal(async () => {
    await db.insert(pesertaSesiPosga).values({
      sesiPosgaId: sesiAktifId,
      pesertaNik: NIK_PEREMPUAN_A,
      kategoriSaatItu: "dewasa",
      sumberKategori: "usia",
      statusPemeriksaan: "belum_diperiksa",
    });
  }, "UNIQUE peserta + sesi tidak bekerja.");
  berhasil(4, "Peserta ganda dalam sesi ditolak DB.");

  await harusGagal(async () => {
    await db.insert(hasilPemeriksaan).values({
      pesertaSesiPosgaId: 2147483002,
      indikatorId: indikatorNumberId,
      nilaiNumber: 1,
    });
  }, "FK hasil_pemeriksaan -> peserta_sesi tidak bekerja.");
  berhasil(5, "FK pemeriksaan -> peserta sesi menolak ID tidak valid.");

  await harusGagal(async () => {
    await db.insert(hasilPemeriksaan).values({
      pesertaSesiPosgaId: rosterAktifId,
      indikatorId: 2147483003,
      nilaiNumber: 1,
    });
  }, "FK hasil_pemeriksaan -> indikator tidak bekerja.");
  berhasil(6, "FK pemeriksaan -> indikator menolak ID tidak valid.");

  await db.insert(hasilPemeriksaan).values({
    pesertaSesiPosgaId: rosterAktifId,
    indikatorId: indikatorNumberId,
    nilaiNumber: 10,
    catatan: "Fixture clinical activity",
  });

  await harusGagal(async () => {
    await db.insert(hasilPemeriksaan).values({
      pesertaSesiPosgaId: rosterAktifId,
      indikatorId: indikatorNumberId,
      nilaiNumber: 20,
    });
  }, "UNIQUE pemeriksaan peserta + indikator tidak bekerja.");
  berhasil(7, "Pemeriksaan indikator ganda ditolak DB.");

  const kategoriAwal = await tentukanKategoriPemeriksaan(
    NIK_PEREMPUAN_A,
    "1995-04-20",
    "P",
    "2026-01-10",
  );
  assert(
    kategoriAwal.kategori === "dewasa",
    "Tanpa episode reproduksi, peserta dewasa harus memakai kategori usia.",
  );
  berhasil(8, "Kategori usia digunakan saat tidak ada episode reproduksi.");

  const kehamilanA = await tambahEpisodeKehamilan(NIK_PEREMPUAN_A, {
    tanggalMulai: "2026-02-01",
    bbSebelumHamilKg: 55,
    tbCm: 158,
    hpht: "2026-01-20",
    hpl: "2026-10-27",
    lilaAwalCm: 25.5,
    catatan: "Kehamilan integrity A",
  });
  assert(kehamilanA.status === "aktif", "Kehamilan pertama harus aktif.");
  berhasil(9, "Kehamilan aktif pertama diterima.");

  await harusGagal(async () => {
    await tambahEpisodeKehamilan(NIK_PEREMPUAN_A, {
      tanggalMulai: "2026-03-01",
    });
  }, "Kehamilan aktif kedua seharusnya ditolak.");
  berhasil(10, "Kehamilan aktif kedua ditolak service.");

  const kategoriHamil = await tentukanKategoriPemeriksaan(
    NIK_PEREMPUAN_A,
    "1995-04-20",
    "P",
    "2026-06-01",
  );
  assert(
    kategoriHamil.kategori === "ibu_hamil",
    "Episode kehamilan harus mengoverride kategori usia.",
  );
  berhasil(11, "Kehamilan mengoverride kategori usia.");

  await harusGagal(async () => {
    await tambahEpisodeKehamilan(NIK_LAKI, { tanggalMulai: "2026-02-01" });
  }, "Peserta laki-laki tidak boleh memiliki episode kehamilan.");
  berhasil(12, "Reproduksi peserta laki-laki ditolak.");

  const nifasA = await tambahEpisodeNifas(NIK_PEREMPUAN_A, {
    episodeKehamilanId: kehamilanA.id,
    tanggalMulai: "2026-08-20",
    tanggalMelahirkan: "2026-08-20",
    jamBersalin: "09:30",
    caraPersalinan: "pervaginam",
    vitaminA: true,
    asiEksklusif: true,
    catatan: "Nifas integrity A",
  });
  assert(nifasA.status === "aktif", "Nifas pertama harus aktif.");
  berhasil(13, "Nifas aktif pertama diterima.");

  const kehamilanASetelahNifas = await db
    .select({
      status: episodeKehamilan.status,
      tanggalSelesai: episodeKehamilan.tanggalSelesai,
    })
    .from(episodeKehamilan)
    .where(eq(episodeKehamilan.id, kehamilanA.id))
    .limit(1);

  assert(
    kehamilanASetelahNifas[0]?.status === "selesai",
    "Kehamilan harus selesai setelah nifas dibuat.",
  );
  assert(
    kehamilanASetelahNifas[0]?.tanggalSelesai === "2026-08-20",
    "Tanggal selesai kehamilan harus mengikuti tanggal mulai nifas.",
  );
  berhasil(14, "Pembuatan nifas menutup kehamilan terkait.");

  await harusGagal(async () => {
    await tambahEpisodeNifas(NIK_PEREMPUAN_A, {
      episodeKehamilanId: kehamilanA.id,
      tanggalMulai: "2026-08-21",
      tanggalMelahirkan: "2026-08-21",
    });
  }, "Nifas aktif kedua seharusnya ditolak.");
  berhasil(15, "Nifas aktif kedua ditolak service.");

  const kategoriNifas = await tentukanKategoriPemeriksaan(
    NIK_PEREMPUAN_A,
    "1995-04-20",
    "P",
    "2026-08-20",
  );
  assert(
    kategoriNifas.kategori === "ibu_nifas",
    "Nifas harus memiliki prioritas tertinggi.",
  );
  berhasil(16, "Prioritas kategori nifas > hamil > usia terjaga.");

  const derivedRows = await db
    .select({ id: indikator.id, kode: indikator.kode })
    .from(indikator)
    .where(
      and(
        eq(indikator.kelompok, "pemeriksaan"),
        eq(indikator.tipeInput, "number"),
        eq(indikator.derived, true),
      ),
    )
    .limit(1);

  const derived = derivedRows[0];
  assert(
    derived,
    "Tidak ditemukan indikator pemeriksaan derived bertipe number. Seed indikator perlu diperiksa.",
  );

  await harusGagal(async () => {
    await tambahHasilPemeriksaan({
      pesertaSesiPosgaId: rosterAktifId,
      indikatorId: derived.id,
      nilaiNumber: 99,
    });
  }, "Indikator derived seharusnya tidak bisa diinput manual.");
  berhasil(17, `Derived ${derived.kode} tidak dapat diinput manual.`);

  await harusGagal(async () => {
    await updateSesiPosga(sesiSelesaiId, { catatan: "Tidak boleh tersimpan" });
  }, "Sesi selesai seharusnya tidak dapat diedit.");
  berhasil(18, "Sesi selesai tidak dapat diedit.");

  await harusGagal(async () => {
    await updateSesiPosga(sesiBatalId, { catatan: "Tidak boleh tersimpan" });
  }, "Sesi dibatalkan seharusnya tidak dapat diedit.");
  berhasil(19, "Sesi dibatalkan tidak dapat diedit.");

  await harusGagal(async () => {
    await batalkanSesiPosga(sesiAktifId);
  }, "Sesi dengan data klinis seharusnya tidak dapat dibatalkan.");
  berhasil(20, "Aktivitas klinis memblokir pembatalan sesi.");

  await harusGagal(async () => {
    await updateSesiPosga(sesiAktifId, { tanggalPosga: "2026-09-15" });
  }, "Sesi dengan data klinis seharusnya tidak dapat mengubah tanggal.");
  berhasil(21, "Aktivitas klinis memblokir perubahan tanggal sesi.");

  pasangTriggerGagalInsertOpsi();
  try {
    await harusGagal(async () => {
      await tambahHasilPemeriksaan({
        pesertaSesiPosgaId: rosterRollbackId,
        indikatorId: indikatorMultiId,
        opsiIds: [opsiA.id],
        catatan: "CREATE HARUS ROLLBACK",
      });
    }, "CREATE pemeriksaan multiselect seharusnya gagal karena trigger.");
  } finally {
    db.run(sql.raw(`DROP TRIGGER IF EXISTS ${TRIGGER_FAIL_PEMERIKSAAN_OPSI}`));
  }

  const parentSetelahCreateGagal = await db
    .select({ id: hasilPemeriksaan.id })
    .from(hasilPemeriksaan)
    .where(
      and(
        eq(hasilPemeriksaan.pesertaSesiPosgaId, rosterRollbackId),
        eq(hasilPemeriksaan.indikatorId, indikatorMultiId),
      ),
    );

  assert(
    parentSetelahCreateGagal.length === 0,
    "Parent pemeriksaan masih tersimpan setelah child INSERT gagal.",
  );
  berhasil(22, "CREATE parent + child benar-benar rollback.");

  const pemeriksaanAwal = await tambahHasilPemeriksaan({
    pesertaSesiPosgaId: rosterRollbackId,
    indikatorId: indikatorMultiId,
    opsiIds: [opsiA.id],
    catatan: "CATATAN AWAL",
  });

  pasangTriggerGagalInsertOpsi();
  try {
    await harusGagal(async () => {
      await updateHasilPemeriksaan(pemeriksaanAwal.id, {
        opsiIds: [opsiB.id],
        catatan: "CATATAN BARU HARUS ROLLBACK",
      });
    }, "UPDATE pemeriksaan seharusnya gagal karena trigger.");
  } finally {
    db.run(sql.raw(`DROP TRIGGER IF EXISTS ${TRIGGER_FAIL_PEMERIKSAAN_OPSI}`));
  }

  const parentSetelahUpdateGagal = await db
    .select({ catatan: hasilPemeriksaan.catatan })
    .from(hasilPemeriksaan)
    .where(eq(hasilPemeriksaan.id, pemeriksaanAwal.id))
    .limit(1);

  assert(
    parentSetelahUpdateGagal[0]?.catatan === "CATATAN AWAL",
    "Perubahan parent tidak rollback setelah update child gagal.",
  );
  berhasil(23, "UPDATE rollback mengembalikan data parent.");

  const childSetelahUpdateGagal = await db
    .select({ opsiId: hasilPemeriksaanOpsi.opsiId })
    .from(hasilPemeriksaanOpsi)
    .where(eq(hasilPemeriksaanOpsi.hasilPemeriksaanId, pemeriksaanAwal.id))
    .orderBy(hasilPemeriksaanOpsi.id);

  assert(
    childSetelahUpdateGagal.length === 1 &&
      childSetelahUpdateGagal[0]?.opsiId === opsiA.id,
    "Opsi lama tidak kembali setelah update transaction gagal.",
  );
  berhasil(24, "UPDATE rollback mengembalikan child/options lama.");

  const kehamilanB = await tambahEpisodeKehamilan(NIK_PEREMPUAN_B, {
    tanggalMulai: "2026-02-05",
    catatan: "Kehamilan rollback B",
  });

  pasangTriggerGagalTutupKehamilan();
  try {
    await harusGagal(async () => {
      await tambahEpisodeNifas(NIK_PEREMPUAN_B, {
        episodeKehamilanId: kehamilanB.id,
        tanggalMulai: "2026-08-25",
        tanggalMelahirkan: "2026-08-25",
        catatan: "Nifas harus rollback",
      });
    }, "Nifas seharusnya gagal ketika penutupan kehamilan dipaksa gagal.");
  } finally {
    db.run(sql.raw(`DROP TRIGGER IF EXISTS ${TRIGGER_FAIL_CLOSE_KEHAMILAN}`));
  }

  const nifasBSetelahGagal = await db
    .select({ id: episodeNifas.id })
    .from(episodeNifas)
    .where(eq(episodeNifas.pesertaNik, NIK_PEREMPUAN_B));

  assert(
    nifasBSetelahGagal.length === 0,
    "Episode nifas masih tersimpan setelah update kehamilan gagal.",
  );
  berhasil(25, "Transaction nifas rollback INSERT episode_nifas.");

  const kehamilanBSetelahGagal = await db
    .select({
      status: episodeKehamilan.status,
      tanggalSelesai: episodeKehamilan.tanggalSelesai,
    })
    .from(episodeKehamilan)
    .where(eq(episodeKehamilan.id, kehamilanB.id))
    .limit(1);

  assert(
    kehamilanBSetelahGagal[0]?.status === "aktif",
    "Status kehamilan berubah meskipun transaction nifas gagal.",
  );
  berhasil(26, "Transaction nifas mempertahankan status kehamilan aktif.");

  assert(
    kehamilanBSetelahGagal[0]?.tanggalSelesai === null,
    "Tanggal selesai kehamilan berubah meskipun transaction nifas gagal.",
  );
  berhasil(27, "Transaction nifas mempertahankan tanggal selesai kehamilan.");

  judul(`SEMUA TEST INTEGRITY / INVARIANT BERHASIL (${jumlahBerhasil}/27)`);
}

main()
  .catch((error) => {
    console.error("\nTEST INTEGRITY / INVARIANT GAGAL");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    console.log("\nMembersihkan fixture integrity...");
    try {
      await cleanup();
      console.log("Fixture integrity berhasil dibersihkan.");
    } catch (error) {
      console.error("Cleanup fixture integrity gagal:", error);
      process.exitCode = 1;
    }
  });
