import request from "supertest";

import {
  and,
  eq,
} from "drizzle-orm";

import {
  app,
} from "../app.js";

import {
  db,
} from "../db/index.js";

import {
  auditLog,
  hasilKonseling,
  hasilPemeriksaan,
  hasilSkrining,
  indikator,
  lokasi,
  opsiIndikator,
  peserta,
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
} from "../db/schema.js";

// ============================================================
// CONFIG
// ============================================================

const ADMIN_USERNAME =
  "admin";

const ADMIN_PASSWORD =
  process.env
    .POSGA_TEST_ADMIN_PASSWORD;

const TEST_NIK =
  "9999999999999021";

const NAMA_LOKASI =
  "LOKASI AUDIT KLINIS TEST";

const NAMA_POSYANDU =
  "POSYANDU AUDIT KLINIS TEST";

const TANGGAL_SESI =
  "2099-12-10";

// ============================================================
// HELPER
// ============================================================

function assert(
  condition: unknown,
  message: string,
) {
  if (!condition) {
    throw new Error(
      message,
    );
  }
}

function ok(
  nomor: number,
  message: string,
) {
  console.log(
    `[OK] ${nomor}. ${message}`,
  );
}

async function loginAdmin() {
  const res =
    await request(app)
      .post(
        "/api/auth/login",
      )
      .send({
        username:
          ADMIN_USERNAME,

        password:
          ADMIN_PASSWORD,
      });

  assert(
    res.status === 200,
    `Login admin gagal: ${res.status} ${JSON.stringify(res.body)}`,
  );

  const token =
    res.body.data?.token;

  assert(
    typeof token ===
      "string",
    "Token admin tidak ditemukan.",
  );

  return token as string;
}

async function ambilAudit(
  entitas: string,
  entitasId: number,
  aksi: string,
) {
  return db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(
          auditLog.entitas,
          entitas,
        ),

        eq(
          auditLog.entitasId,
          String(
            entitasId,
          ),
        ),

        eq(
          auditLog.aksi,
          aksi,
        ),
      ),
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
          TEST_NIK,
        ),
      );

  for (
    const item of
    pesertaSesiRows
  ) {
    const pemeriksaanRows =
      await db
        .select({
          id:
            hasilPemeriksaan.id,
        })
        .from(
          hasilPemeriksaan,
        )
        .where(
          eq(
            hasilPemeriksaan.pesertaSesiPosgaId,
            item.id,
          ),
        );

    for (
      const hasil of
      pemeriksaanRows
    ) {
      await db
        .delete(auditLog)
        .where(
          and(
            eq(
              auditLog.entitas,
              "hasil_pemeriksaan",
            ),

            eq(
              auditLog.entitasId,
              String(
                hasil.id,
              ),
            ),
          ),
        );
    }

    const konselingRows =
      await db
        .select({
          id:
            hasilKonseling.id,
        })
        .from(
          hasilKonseling,
        )
        .where(
          eq(
            hasilKonseling.pesertaSesiPosgaId,
            item.id,
          ),
        );

    for (
      const hasil of
      konselingRows
    ) {
      await db
        .delete(auditLog)
        .where(
          and(
            eq(
              auditLog.entitas,
              "hasil_konseling",
            ),

            eq(
              auditLog.entitasId,
              String(
                hasil.id,
              ),
            ),
          ),
        );
    }
  }

  const skriningRows =
    await db
      .select({
        id:
          hasilSkrining.id,
      })
      .from(
        hasilSkrining,
      )
      .where(
        eq(
          hasilSkrining.pesertaNik,
          TEST_NIK,
        ),
      );

  for (
    const hasil of
    skriningRows
  ) {
    await db
      .delete(auditLog)
      .where(
        and(
          eq(
            auditLog.entitas,
            "hasil_skrining",
          ),

          eq(
            auditLog.entitasId,
            String(
              hasil.id,
            ),
          ),
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
        TEST_NIK,
      ),
    );

  for (
    const item of
    pesertaSesiRows
  ) {
    await db
      .delete(
        hasilKonseling,
      )
      .where(
        eq(
          hasilKonseling.pesertaSesiPosgaId,
          item.id,
        ),
      );

    await db
      .delete(
        hasilPemeriksaan,
      )
      .where(
        eq(
          hasilPemeriksaan.pesertaSesiPosgaId,
          item.id,
        ),
      );
  }

  await db
    .delete(
      pesertaSesiPosga,
    )
    .where(
      eq(
        pesertaSesiPosga.pesertaNik,
        TEST_NIK,
      ),
    );

  await db
    .delete(
      peserta,
    )
    .where(
      eq(
        peserta.nik,
        TEST_NIK,
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
    const item of
    posyanduRows
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
          "Fixture audit klinis",

        aktif:
          true,
      })
      .returning();

  const lokasiData =
    lokasiRows[0];

  assert(
    lokasiData,
    "Gagal membuat lokasi fixture.",
  );

  const posyanduRows =
    await db
      .insert(
        posyandu,
      )
      .values({
        lokasiId:
          lokasiData!.id,

        nama:
          NAMA_POSYANDU,

        alamat:
          "Fixture audit klinis",

        aktif:
          true,
      })
      .returning();

  const posyanduData =
    posyanduRows[0];

  assert(
    posyanduData,
    "Gagal membuat Posyandu fixture.",
  );

  await db
    .insert(
      peserta,
    )
    .values({
      nik:
        TEST_NIK,

      nama:
        "Balita Audit Klinis",

      tanggalLahir:
        "2096-01-10",

      jenisKelamin:
        "P",

      aktif:
        true,
    });

  const sesiRows =
    await db
      .insert(
        sesiPosga,
      )
      .values({
        posyanduId:
          posyanduData!.id,

        tanggalPosga:
          TANGGAL_SESI,

        status:
          "aktif",

        catatan:
          "Fixture audit klinis",
      })
      .returning();

  const sesi =
    sesiRows[0];

  assert(
    sesi,
    "Gagal membuat sesi fixture.",
  );

  const pesertaSesiRows =
    await db
      .insert(
        pesertaSesiPosga,
      )
      .values({
        sesiPosgaId:
          sesi!.id,

        pesertaNik:
          TEST_NIK,

        kategoriSaatItu:
          "balita",

        sumberKategori:
          "usia",

        statusPemeriksaan:
          "belum_diperiksa",
      })
      .returning();

  const pesertaSesi =
    pesertaSesiRows[0];

  assert(
    pesertaSesi,
    "Gagal membuat roster fixture.",
  );

  return {
    sesiId:
      sesi!.id,

    pesertaSesiId:
      pesertaSesi!.id,
  };
}

// ============================================================
// MASTER INDIKATOR
// ============================================================

async function ambilIndikator(
  kode: string,
) {
  const rows =
    await db
      .select()
      .from(
        indikator,
      )
      .where(
        eq(
          indikator.kode,
          kode,
        ),
      )
      .limit(1);

  const data =
    rows[0];

  assert(
    data,
    `Indikator ${kode} tidak ditemukan.`,
  );

  return data!;
}

async function ambilOpsiAktif(
  indikatorId: number,
) {
  return db
    .select()
    .from(
      opsiIndikator,
    )
    .where(
      and(
        eq(
          opsiIndikator.indikatorId,
          indikatorId,
        ),

        eq(
          opsiIndikator.aktif,
          true,
        ),
      ),
    );
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error(
      "POSGA_TEST_ADMIN_PASSWORD belum diisi.",
    );
  }

  delete process.env
    .POSGA_TEST_BYPASS_AUTH;

  const fixture =
    await buatFixture();

  const bb =
    await ambilIndikator(
      "BB",
    );

  const gilut =
    await ambilIndikator(
      "SKRINING_GILUT",
    );

  const konseling =
    await ambilIndikator(
      "KONSELING_BALITA",
    );

  const opsiGilut =
    await ambilOpsiAktif(
      gilut.id,
    );

  assert(
    opsiGilut.length >= 1,
    "SKRINING_GILUT tidak memiliki opsi aktif.",
  );

  const opsiKonseling =
    await ambilOpsiAktif(
      konseling.id,
    );

  assert(
    opsiKonseling.length >= 2,
    "KONSELING_BALITA membutuhkan minimal 2 opsi aktif untuk test.",
  );

  const token =
    await loginAdmin();

  let nomor =
    1;

  let pemeriksaanId =
    0;

  let skriningId =
    0;

  let konselingId =
    0;

  // ==========================================================
  // PEMERIKSAAN
  // ==========================================================

  // 1 CREATE
  {
    const res =
      await request(app)
        .post(
          "/api/pemeriksaan",
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        )
        .send({
          pesertaSesiPosgaId:
            fixture.pesertaSesiId,

          indikatorId:
            bb.id,

          nilaiNumber:
            15.5,

          catatan:
            "Audit pemeriksaan awal.",
        });

    assert(
      res.status === 201,
      `CREATE pemeriksaan gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    pemeriksaanId =
      res.body.data?.id;

    assert(
      pemeriksaanId > 0,
      "ID pemeriksaan tidak valid.",
    );

    ok(
      nomor++,
      "CREATE pemeriksaan berhasil.",
    );
  }

  // 2 AUDIT CREATE
  {
    const rows =
      await ambilAudit(
        "hasil_pemeriksaan",
        pemeriksaanId,
        "CREATE",
      );

    assert(
      rows.length === 1,
      "Audit CREATE pemeriksaan tidak ditemukan.",
    );

    assert(
      rows[0]?.userId !=
        null,
      "Audit pemeriksaan harus memiliki userId.",
    );

    assert(
      rows[0]?.dataSesudah !=
        null,
      "Audit CREATE pemeriksaan harus memiliki dataSesudah.",
    );

    ok(
      nomor++,
      "Audit CREATE pemeriksaan tercatat.",
    );
  }

  // 3 UPDATE
  {
    const res =
      await request(app)
        .put(
          `/api/pemeriksaan/${pemeriksaanId}`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        )
        .send({
          nilaiNumber:
            16.25,

          catatan:
            "Audit pemeriksaan updated.",
        });

    assert(
      res.status === 200,
      `UPDATE pemeriksaan gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "UPDATE pemeriksaan berhasil.",
    );
  }

  // 4 AUDIT UPDATE
  {
    const rows =
      await ambilAudit(
        "hasil_pemeriksaan",
        pemeriksaanId,
        "UPDATE",
      );

    assert(
      rows.length === 1,
      "Audit UPDATE pemeriksaan tidak ditemukan.",
    );

    const sebelum =
      JSON.parse(
        rows[0]!.dataSebelum!,
      );

    const sesudah =
      JSON.parse(
        rows[0]!.dataSesudah!,
      );

    assert(
      sebelum.nilaiNumber ===
        15.5,
      "Nilai pemeriksaan sebelum update salah.",
    );

    assert(
      sesudah.nilaiNumber ===
        16.25,
      "Nilai pemeriksaan sesudah update salah.",
    );

    ok(
      nomor++,
      "Audit UPDATE pemeriksaan menyimpan before/after.",
    );
  }

  // ==========================================================
  // SKRINING
  // ==========================================================

  // 5 CREATE
  {
    const res =
      await request(app)
        .post(
          "/api/skrining",
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        )
        .send({
          pesertaNik:
            TEST_NIK,

          indikatorId:
            gilut.id,

          sesiPosgaId:
            fixture.sesiId,

          tanggalSkrining:
            TANGGAL_SESI,

          sumber:
            "posga",

          opsiId:
            opsiGilut[0]!.id,

          catatan:
            "Audit skrining awal.",
        });

    assert(
      res.status === 201,
      `CREATE skrining gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    skriningId =
      res.body.data?.id;

    assert(
      skriningId > 0,
      "ID skrining tidak valid.",
    );

    ok(
      nomor++,
      "CREATE skrining berhasil.",
    );
  }

  // 6 AUDIT CREATE
  {
    const rows =
      await ambilAudit(
        "hasil_skrining",
        skriningId,
        "CREATE",
      );

    assert(
      rows.length === 1,
      "Audit CREATE skrining tidak ditemukan.",
    );

    assert(
      rows[0]?.dataSesudah !=
        null,
      "Audit CREATE skrining harus memiliki dataSesudah.",
    );

    ok(
      nomor++,
      "Audit CREATE skrining tercatat.",
    );
  }

  // 7 UPDATE
  {
    const res =
      await request(app)
        .put(
          `/api/skrining/${skriningId}`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        )
        .send({
          catatan:
            "Audit skrining updated.",
        });

    assert(
      res.status === 200,
      `UPDATE skrining gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "UPDATE skrining berhasil.",
    );
  }

  // 8 AUDIT UPDATE
  {
    const rows =
      await ambilAudit(
        "hasil_skrining",
        skriningId,
        "UPDATE",
      );

    assert(
      rows.length === 1,
      "Audit UPDATE skrining tidak ditemukan.",
    );

    const sebelum =
      JSON.parse(
        rows[0]!.dataSebelum!,
      );

    const sesudah =
      JSON.parse(
        rows[0]!.dataSesudah!,
      );

    assert(
      sebelum.catatan ===
        "Audit skrining awal.",
      "Catatan skrining sebelum update salah.",
    );

    assert(
      sesudah.catatan ===
        "Audit skrining updated.",
      "Catatan skrining sesudah update salah.",
    );

    ok(
      nomor++,
      "Audit UPDATE skrining menyimpan before/after.",
    );
  }

  // ==========================================================
  // KONSELING
  // ==========================================================

  // 9 CREATE
  {
    const res =
      await request(app)
        .post(
          "/api/konseling",
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        )
        .send({
          pesertaSesiPosgaId:
            fixture.pesertaSesiId,

          indikatorId:
            konseling.id,

          opsiIds: [
            opsiKonseling[0]!.id,
            opsiKonseling[1]!.id,
          ],

          catatan:
            "Audit konseling awal.",
        });

    assert(
      res.status === 201,
      `CREATE konseling gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    konselingId =
      res.body.data?.id;

    assert(
      konselingId > 0,
      "ID konseling tidak valid.",
    );

    ok(
      nomor++,
      "CREATE konseling berhasil.",
    );
  }

  // 10 AUDIT CREATE
  {
    const rows =
      await ambilAudit(
        "hasil_konseling",
        konselingId,
        "CREATE",
      );

    assert(
      rows.length === 1,
      "Audit CREATE konseling tidak ditemukan.",
    );

    const sesudah =
      JSON.parse(
        rows[0]!.dataSesudah!,
      );

    assert(
      sesudah.opsiTerpilih
        ?.length ===
        2,
      "Audit CREATE konseling tidak menyimpan dua opsi.",
    );

    ok(
      nomor++,
      "Audit CREATE konseling termasuk opsi multiselect.",
    );
  }

  // 11 UPDATE
  {
    const res =
      await request(app)
        .put(
          `/api/konseling/${konselingId}`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        )
        .send({
          opsiIds: [
            opsiKonseling[1]!.id,
          ],

          catatan:
            "Audit konseling updated.",
        });

    assert(
      res.status === 200,
      `UPDATE konseling gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "UPDATE konseling berhasil.",
    );
  }

  // 12 AUDIT UPDATE
  {
    const rows =
      await ambilAudit(
        "hasil_konseling",
        konselingId,
        "UPDATE",
      );

    assert(
      rows.length === 1,
      "Audit UPDATE konseling tidak ditemukan.",
    );

    const sebelum =
      JSON.parse(
        rows[0]!.dataSebelum!,
      );

    const sesudah =
      JSON.parse(
        rows[0]!.dataSesudah!,
      );

    assert(
      sebelum.opsiTerpilih
        ?.length ===
        2,
      "Before konseling harus memiliki 2 opsi.",
    );

    assert(
      sesudah.opsiTerpilih
        ?.length ===
        1,
      "After konseling harus memiliki 1 opsi.",
    );

    ok(
      nomor++,
      "Audit UPDATE konseling menyimpan perubahan opsi.",
    );
  }

  // ==========================================================
  // DELETE KONSELING
  // ==========================================================

  // 13 DELETE
  {
    const res =
      await request(app)
        .delete(
          `/api/konseling/${konselingId}`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        );

    assert(
      res.status === 200,
      `DELETE konseling gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "DELETE konseling berhasil.",
    );
  }

  // 14 AUDIT DELETE
  {
    const rows =
      await ambilAudit(
        "hasil_konseling",
        konselingId,
        "DELETE",
      );

    assert(
      rows.length === 1,
      "Audit DELETE konseling tidak ditemukan.",
    );

    assert(
      rows[0]?.dataSebelum !=
        null,
      "Audit DELETE konseling harus memiliki dataSebelum.",
    );

    ok(
      nomor++,
      "Audit DELETE konseling tercatat.",
    );
  }

  // ==========================================================
  // DELETE SKRINING
  // ==========================================================

  // 15 DELETE
  {
    const res =
      await request(app)
        .delete(
          `/api/skrining/${skriningId}`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        );

    assert(
      res.status === 200,
      `DELETE skrining gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "DELETE skrining berhasil.",
    );
  }

  // 16 AUDIT DELETE
  {
    const rows =
      await ambilAudit(
        "hasil_skrining",
        skriningId,
        "DELETE",
      );

    assert(
      rows.length === 1,
      "Audit DELETE skrining tidak ditemukan.",
    );

    assert(
      rows[0]?.dataSebelum !=
        null,
      "Audit DELETE skrining harus memiliki dataSebelum.",
    );

    ok(
      nomor++,
      "Audit DELETE skrining tercatat.",
    );
  }

  // ==========================================================
  // DELETE PEMERIKSAAN
  // ==========================================================

  // 17 DELETE
  {
    const res =
      await request(app)
        .delete(
          `/api/pemeriksaan/${pemeriksaanId}`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        );

    assert(
      res.status === 200,
      `DELETE pemeriksaan gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "DELETE pemeriksaan berhasil.",
    );
  }

  // 18 AUDIT DELETE
  {
    const rows =
      await ambilAudit(
        "hasil_pemeriksaan",
        pemeriksaanId,
        "DELETE",
      );

    assert(
      rows.length === 1,
      "Audit DELETE pemeriksaan tidak ditemukan.",
    );

    assert(
      rows[0]?.dataSebelum !=
        null,
      "Audit DELETE pemeriksaan harus memiliki dataSebelum.",
    );

    ok(
      nomor++,
      "Audit DELETE pemeriksaan tercatat.",
    );
  }

  console.log("");

  console.log(
    "========================================",
  );

  console.log(
    `AUDIT KLINIS TEST SELESAI: ${nomor - 1}/18 BERHASIL`,
  );

  console.log(
    "========================================",
  );

  await cleanup();
}

main().catch(
  async (
    error,
  ) => {
    console.error("");

    console.error(
      "TEST AUDIT KLINIS GAGAL",
    );

    console.error(
      error,
    );

    try {
      await cleanup();
    } catch (
      cleanupError
    ) {
      console.error(
        "Cleanup juga gagal:",
        cleanupError,
      );
    }

    process.exitCode =
      1;
  },
);