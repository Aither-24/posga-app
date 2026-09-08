import request from "supertest";

import {
  and,
  eq,
  ne,
} from "drizzle-orm";

import {
  app,
} from "../app.js";

import {
  db,
} from "../db/index.js";

import {
  auditLog,
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

const TANGGAL_SESI_A =
  "2099-11-20";

const TANGGAL_SESI_B =
  "2099-11-21";

const CATATAN_AWAL =
  "AUDIT SESI TEST A";

const CATATAN_UPDATE =
  "AUDIT SESI TEST A UPDATED";

const CATATAN_B =
  "AUDIT SESI TEST B";

const TEST_NIK_MANUAL =
  "9999999999999011";

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
    `âœ… ${nomor}. ${message}`,
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

  // ==========================================================
  // CARI POSYANDU
  // ==========================================================

  const posyanduRows =
    await db
      .select({
        id:
          posyandu.id,
      })
      .from(posyandu)
      .where(
        eq(
          posyandu.aktif,
          true,
        ),
      )
      .limit(1);

  const dataPosyandu =
    posyanduRows[0];

  assert(
    dataPosyandu,
    "Tidak ada Posyandu aktif untuk test.",
  );

  const posyanduId =
    dataPosyandu!.id;

  // ==========================================================
  // BERSIHKAN SESI TEST LAMA BERDASARKAN TANGGAL
  // ==========================================================

  const sesiTestLama =
    await db
      .select({
        id:
          sesiPosga.id,
      })
      .from(sesiPosga)
      .where(
        and(
          eq(
            sesiPosga.posyanduId,
            posyanduId,
          ),

          eq(
            sesiPosga.tanggalPosga,
            TANGGAL_SESI_A,
          ),
        ),
      );

  const sesiTestLamaB =
    await db
      .select({
        id:
          sesiPosga.id,
      })
      .from(sesiPosga)
      .where(
        and(
          eq(
            sesiPosga.posyanduId,
            posyanduId,
          ),

          eq(
            sesiPosga.tanggalPosga,
            TANGGAL_SESI_B,
          ),
        ),
      );

  for (
    const item of [
      ...sesiTestLama,
      ...sesiTestLamaB,
    ]
  ) {
    await db
      .delete(auditLog)
      .where(
        and(
          eq(
            auditLog.entitas,
            "sesi_posga",
          ),

          eq(
            auditLog.entitasId,
            String(
              item.id,
            ),
          ),
        ),
      );

    const rosterRows =
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
            pesertaSesiPosga.sesiPosgaId,
            item.id,
          ),
        );

    for (
      const roster of
      rosterRows
    ) {
      await db
        .delete(auditLog)
        .where(
          and(
            eq(
              auditLog.entitas,
              "peserta_sesi_posga",
            ),

            eq(
              auditLog.entitasId,
              String(
                roster.id,
              ),
            ),
          ),
        );
    }

    await db
      .delete(sesiPosga)
      .where(
        eq(
          sesiPosga.id,
          item.id,
        ),
      );
  }

  const token =
    await loginAdmin();

  let nomor =
    1;

  let sesiAId =
    0;

  let sesiBId =
    0;

  let rosterManualId =
    0;

  let pesertaNikManual =
    "";

  // ==========================================================
  // 1. CREATE SESI A
  // ==========================================================

  {
    const res =
      await request(app)
        .post(
          "/api/sesi",
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        )
        .send({
          posyanduId,

          tanggalPosga:
            TANGGAL_SESI_A,

          catatan:
            CATATAN_AWAL,
        });

    assert(
      res.status === 201,
      `Create sesi A gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    sesiAId =
      res.body.data
        ?.sesi?.id;

    assert(
      sesiAId > 0,
      "ID sesi A tidak valid.",
    );

    ok(
      nomor++,
      "Sesi A berhasil dibuat.",
    );
  }

  // ==========================================================
  // 2. AUDIT CREATE SESI
  // ==========================================================

  {
    const rows =
      await ambilAudit(
        "sesi_posga",
        sesiAId,
        "CREATE",
      );

    assert(
      rows.length === 1,
      `Audit CREATE sesi seharusnya 1, mendapat ${rows.length}`,
    );

    assert(
      rows[0]?.userId !=
        null,
      "Audit CREATE sesi harus memiliki userId.",
    );

    assert(
      rows[0]?.dataSesudah !=
        null,
      "Audit CREATE sesi harus memiliki dataSesudah.",
    );

    ok(
      nomor++,
      "Audit CREATE sesi tercatat.",
    );
  }

  // ==========================================================
  // 3. UPDATE SESI A
  // ==========================================================

  {
    const res =
      await request(app)
        .put(
          `/api/sesi/${sesiAId}`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        )
        .send({
          catatan:
            CATATAN_UPDATE,
        });

    assert(
      res.status === 200,
      `Update sesi gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "Sesi A berhasil diperbarui.",
    );
  }

  // ==========================================================
  // 4. AUDIT UPDATE BEFORE / AFTER
  // ==========================================================

  {
    const rows =
      await ambilAudit(
        "sesi_posga",
        sesiAId,
        "UPDATE",
      );

    assert(
      rows.length === 1,
      `Audit UPDATE sesi seharusnya 1, mendapat ${rows.length}`,
    );

    const row =
      rows[0];

    assert(
      row?.dataSebelum !=
        null,
      "Audit UPDATE sesi harus memiliki dataSebelum.",
    );

    assert(
      row?.dataSesudah !=
        null,
      "Audit UPDATE sesi harus memiliki dataSesudah.",
    );

    const sebelum =
      JSON.parse(
        row!.dataSebelum!,
      );

    const sesudah =
      JSON.parse(
        row!.dataSesudah!,
      );

    assert(
      sebelum.catatan ===
        CATATAN_AWAL,
      "Catatan sebelum update tidak sesuai.",
    );

    assert(
      sesudah.sesi?.catatan ===
        CATATAN_UPDATE,
      "Catatan sesudah update tidak sesuai.",
    );

    ok(
      nomor++,
      "Audit UPDATE menyimpan before/after.",
    );
  }

  // ==========================================================
  // SIAPKAN PESERTA KHUSUS UNTUK TEST ROSTER MANUAL
  // ==========================================================

  await db
    .delete(peserta)
    .where(
      eq(
        peserta.nik,
        TEST_NIK_MANUAL,
      ),
    );

  await db
    .insert(peserta)
    .values({
      nik:
        TEST_NIK_MANUAL,

      nama:
        "Peserta Manual Audit Sesi",

      jenisKelamin:
        "L",

      tanggalLahir:
        "1990-01-01",

      aktif:
        true,
    });

  pesertaNikManual =
    TEST_NIK_MANUAL;

  // ==========================================================
  // 5. TAMBAH PESERTA MANUAL
  // ==========================================================

  {
    const res =
      await request(app)
        .post(
          `/api/sesi/${sesiAId}/peserta`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        )
        .send({
          pesertaNik:
            pesertaNikManual,
        });

    assert(
      res.status === 201,
      `Tambah peserta ke sesi gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    rosterManualId =
      res.body.data?.id;

    assert(
      rosterManualId > 0,
      "ID roster manual tidak valid.",
    );

    ok(
      nomor++,
      "Peserta berhasil ditambahkan manual ke sesi.",
    );
  }

  // ==========================================================
  // 6. AUDIT TAMBAH PESERTA
  // ==========================================================

  {
    const rows =
      await ambilAudit(
        "peserta_sesi_posga",
        rosterManualId,
        "TAMBAH_PESERTA",
      );

    assert(
      rows.length === 1,
      `Audit TAMBAH_PESERTA seharusnya 1, mendapat ${rows.length}`,
    );

    assert(
      rows[0]?.dataSesudah !=
        null,
      "Audit TAMBAH_PESERTA harus memiliki dataSesudah.",
    );

    const sesudah =
      JSON.parse(
        rows[0]!.dataSesudah!,
      );

    assert(
      sesudah.pesertaNik ===
        pesertaNikManual,
      "NIK pada audit tambah roster tidak sesuai.",
    );

    ok(
      nomor++,
      "Audit TAMBAH_PESERTA tercatat.",
    );
  }

  // ==========================================================
  // 7. HAPUS PESERTA MANUAL
  // ==========================================================

  {
    const res =
      await request(app)
        .delete(
          `/api/sesi/${sesiAId}/peserta/${pesertaNikManual}`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        );

    assert(
      res.status === 200,
      `Hapus peserta dari sesi gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    assert(
      res.body.data
        ?.berhasil ===
        true,
      "Response hapus roster harus berhasil=true.",
    );

    ok(
      nomor++,
      "Peserta berhasil dihapus dari roster.",
    );
  }

  // ==========================================================
  // 8. AUDIT HAPUS PESERTA
  // ==========================================================

  {
    const rows =
      await ambilAudit(
        "peserta_sesi_posga",
        rosterManualId,
        "HAPUS_PESERTA",
      );

    assert(
      rows.length === 1,
      `Audit HAPUS_PESERTA seharusnya 1, mendapat ${rows.length}`,
    );

    assert(
      rows[0]?.dataSebelum !=
        null,
      "Audit HAPUS_PESERTA harus memiliki dataSebelum.",
    );

    const sebelum =
      JSON.parse(
        rows[0]!.dataSebelum!,
      );

    assert(
      sebelum.pesertaNik ===
        pesertaNikManual,
      "NIK dataSebelum roster tidak sesuai.",
    );

    ok(
      nomor++,
      "Audit HAPUS_PESERTA menyimpan roster sebelum dihapus.",
    );
  }

  // ==========================================================
  // 9. SELESAIKAN SESI A
  // ==========================================================

  {
    const res =
      await request(app)
        .post(
          `/api/sesi/${sesiAId}/selesai`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        );

    assert(
      res.status === 200,
      `Selesaikan sesi gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "Sesi A berhasil diselesaikan.",
    );
  }

  // ==========================================================
  // 10. AUDIT SELESAI
  // ==========================================================

  {
    const rows =
      await ambilAudit(
        "sesi_posga",
        sesiAId,
        "SELESAI",
      );

    assert(
      rows.length === 1,
      `Audit SELESAI seharusnya 1, mendapat ${rows.length}`,
    );

    const row =
      rows[0];

    assert(
      row?.dataSebelum !=
        null &&
        row?.dataSesudah !=
          null,
      "Audit SELESAI harus memiliki before/after.",
    );

    const sebelum =
      JSON.parse(
        row!.dataSebelum!,
      );

    const sesudah =
      JSON.parse(
        row!.dataSesudah!,
      );

    assert(
      sebelum.status !==
        "selesai",
      "Status sebelum selesai tidak boleh sudah selesai.",
    );

    assert(
      sesudah.status ===
        "selesai",
      "Status sesudah selesai harus selesai.",
    );

    ok(
      nomor++,
      "Audit SELESAI menyimpan perubahan status.",
    );
  }

  // ==========================================================
  // 11. CREATE SESI B UNTUK UJI BATAL
  // ==========================================================

  {
    const res =
      await request(app)
        .post(
          "/api/sesi",
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        )
        .send({
          posyanduId,

          tanggalPosga:
            TANGGAL_SESI_B,

          catatan:
            CATATAN_B,
        });

    assert(
      res.status === 201,
      `Create sesi B gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    sesiBId =
      res.body.data
        ?.sesi?.id;

    assert(
      sesiBId > 0,
      "ID sesi B tidak valid.",
    );

    ok(
      nomor++,
      "Sesi B berhasil dibuat untuk uji pembatalan.",
    );
  }

  // ==========================================================
  // 12. BATALKAN SESI B
  // ==========================================================

  {
    const res =
      await request(app)
        .post(
          `/api/sesi/${sesiBId}/batal`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        );

    assert(
      res.status === 200,
      `Batalkan sesi gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "Sesi B berhasil dibatalkan.",
    );
  }

  // ==========================================================
  // 13. AUDIT BATAL
  // ==========================================================

  {
    const rows =
      await ambilAudit(
        "sesi_posga",
        sesiBId,
        "BATAL",
      );

    assert(
      rows.length === 1,
      `Audit BATAL seharusnya 1, mendapat ${rows.length}`,
    );

    const row =
      rows[0];

    assert(
      row?.dataSebelum !=
        null &&
        row?.dataSesudah !=
          null,
      "Audit BATAL harus memiliki before/after.",
    );

    const sebelum =
      JSON.parse(
        row!.dataSebelum!,
      );

    const sesudah =
      JSON.parse(
        row!.dataSesudah!,
      );

    assert(
      sebelum.status !==
        "dibatalkan",
      "Status sebelum batal tidak boleh sudah dibatalkan.",
    );

    assert(
      sesudah.status ===
        "dibatalkan",
      "Status setelah batal harus dibatalkan.",
    );

    ok(
      nomor++,
      "Audit BATAL menyimpan perubahan status.",
    );
  }

  // ==========================================================
  // 14. TOTAL AUDIT SESI A
  // ==========================================================

  {
    const rows =
      await db
        .select()
        .from(auditLog)
        .where(
          and(
            eq(
              auditLog.entitas,
              "sesi_posga",
            ),

            eq(
              auditLog.entitasId,
              String(
                sesiAId,
              ),
            ),
          ),
        );

    const aksi =
      rows.map(
        (
          item,
        ) =>
          item.aksi,
      );

    assert(
      aksi.includes(
        "CREATE",
      ),
      "Audit CREATE sesi A tidak ditemukan.",
    );

    assert(
      aksi.includes(
        "UPDATE",
      ),
      "Audit UPDATE sesi A tidak ditemukan.",
    );

    assert(
      aksi.includes(
        "SELESAI",
      ),
      "Audit SELESAI sesi A tidak ditemukan.",
    );

    ok(
      nomor++,
      "Audit siklus sesi A lengkap.",
    );
  }

  console.log("");

  console.log(
    "========================================",
  );

  console.log(
    `AUDIT SESI TEST SELESAI: ${nomor - 1}/14 BERHASIL`,
  );

  console.log(
    "========================================",
  );
}

main().catch(
  (
    error,
  ) => {
    console.error("");

    console.error(
      "âŒ TEST AUDIT SESI GAGAL",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);


