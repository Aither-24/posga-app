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
  peserta,
} from "../db/schema.js";

const ADMIN_USERNAME =
  "admin";

const ADMIN_PASSWORD =
  process.env
    .POSGA_TEST_ADMIN_PASSWORD;

const TEST_NIK =
  "9999999999999001";

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
    `✅ ${nomor}. ${message}`,
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

  return res.body
    .data.token as string;
}

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error(
      "POSGA_TEST_ADMIN_PASSWORD belum diisi.",
    );
  }

  delete process.env
    .POSGA_TEST_BYPASS_AUTH;

  await db
    .delete(auditLog)
    .where(
      and(
        eq(
          auditLog.entitas,
          "peserta",
        ),
        eq(
          auditLog.entitasId,
          TEST_NIK,
        ),
      ),
    );

  await db
    .delete(peserta)
    .where(
      eq(
        peserta.nik,
        TEST_NIK,
      ),
    );

  const token =
    await loginAdmin();

  let nomor = 1;

  {
    const res =
      await request(app)
        .post(
          "/api/peserta",
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        )
        .send({
          nik:
            TEST_NIK,

          nama:
            "Peserta Audit Test",

          jenisKelamin:
            "L",

          tanggalLahir:
            "1995-01-01",
        });

    assert(
      res.status === 201,
      `Create peserta gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "Peserta test berhasil dibuat.",
    );
  }

  {
    const rows =
      await db
        .select()
        .from(auditLog)
        .where(
          and(
            eq(
              auditLog.entitas,
              "peserta",
            ),
            eq(
              auditLog.entitasId,
              TEST_NIK,
            ),
            eq(
              auditLog.aksi,
              "CREATE",
            ),
          ),
        );

    assert(
      rows.length === 1,
      `Audit CREATE seharusnya 1, mendapat ${rows.length}`,
    );

    assert(
      rows[0]?.userId !=
        null,
      "Audit CREATE harus memiliki userId.",
    );

    assert(
      rows[0]?.dataSesudah !=
        null,
      "Audit CREATE harus memiliki dataSesudah.",
    );

    ok(
      nomor++,
      "Audit CREATE peserta tercatat.",
    );
  }

  {
    const res =
      await request(app)
        .put(
          `/api/peserta/${TEST_NIK}`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        )
        .send({
          nama:
            "Peserta Audit Updated",
        });

    assert(
      res.status === 200,
      `Update peserta gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "Peserta berhasil diperbarui.",
    );
  }

  {
    const rows =
      await db
        .select()
        .from(auditLog)
        .where(
          and(
            eq(
              auditLog.entitas,
              "peserta",
            ),
            eq(
              auditLog.entitasId,
              TEST_NIK,
            ),
            eq(
              auditLog.aksi,
              "UPDATE",
            ),
          ),
        );

    assert(
      rows.length === 1,
      `Audit UPDATE seharusnya 1, mendapat ${rows.length}`,
    );

    const row =
      rows[0];

    assert(
      row?.dataSebelum !=
        null,
      "Audit UPDATE harus memiliki dataSebelum.",
    );

    assert(
      row?.dataSesudah !=
        null,
      "Audit UPDATE harus memiliki dataSesudah.",
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
      sebelum.nama ===
        "Peserta Audit Test",
      "Nama dataSebelum tidak sesuai.",
    );

    assert(
      sesudah.nama ===
        "Peserta Audit Updated",
      "Nama dataSesudah tidak sesuai.",
    );

    ok(
      nomor++,
      "Audit UPDATE menyimpan before/after dengan benar.",
    );
  }

  {
    const res =
      await request(app)
        .delete(
          `/api/peserta/${TEST_NIK}`,
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        );

    assert(
      res.status === 200,
      `Nonaktifkan peserta gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "Peserta berhasil dinonaktifkan.",
    );
  }

  {
    const rows =
      await db
        .select()
        .from(auditLog)
        .where(
          and(
            eq(
              auditLog.entitas,
              "peserta",
            ),
            eq(
              auditLog.entitasId,
              TEST_NIK,
            ),
            eq(
              auditLog.aksi,
              "NONAKTIFKAN",
            ),
          ),
        );

    assert(
      rows.length === 1,
      `Audit NONAKTIFKAN seharusnya 1, mendapat ${rows.length}`,
    );

    const row =
      rows[0];

    assert(
      row?.userId !=
        null,
      "Audit NONAKTIFKAN harus memiliki userId.",
    );

    assert(
      row?.dataSebelum !=
        null &&
        row?.dataSesudah !=
          null,
      "Audit NONAKTIFKAN harus memiliki before/after.",
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
      sebelum.aktif ===
        true,
      "Sebelum dinonaktifkan, aktif harus true.",
    );

    assert(
      sesudah.aktif ===
        false,
      "Sesudah dinonaktifkan, aktif harus false.",
    );

    ok(
      nomor++,
      "Audit NONAKTIFKAN menyimpan perubahan status.",
    );
  }

  {
    const rows =
      await db
        .select()
        .from(auditLog)
        .where(
          and(
            eq(
              auditLog.entitas,
              "peserta",
            ),
            eq(
              auditLog.entitasId,
              TEST_NIK,
            ),
          ),
        );

    assert(
      rows.length === 3,
      `Total audit peserta seharusnya 3, mendapat ${rows.length}`,
    );

    ok(
      nomor++,
      "CREATE, UPDATE, dan NONAKTIFKAN tercatat lengkap.",
    );
  }

  console.log("");

  console.log(
    "========================================",
  );

  console.log(
    `AUDIT PESERTA TEST SELESAI: ${nomor - 1}/7 BERHASIL`,
  );

  console.log(
    "========================================",
  );
}

main().catch(
  (error) => {
    console.error("");

    console.error(
      "❌ TEST AUDIT PESERTA GAGAL",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);
