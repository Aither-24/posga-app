import assert from "node:assert/strict";

import request from "supertest";

import {
  and,
  eq,
} from "drizzle-orm";

import {
  db,
} from "../db/index.js";

import {
  auditLog,
  lokasi,
  posyandu,
} from "../db/schema.js";

// ============================================================
// BYPASS AUTH KHUSUS TEST
// ============================================================

process.env
  .POSGA_TEST_BYPASS_AUTH =
  "1";

const {
  app,
} = await import(
  "../app.js"
);

// ============================================================
// FIXTURE
// ============================================================

const NAMA_LOKASI =
  "AUDIT MASTER LOKASI TEST";

const NAMA_POSYANDU =
  "AUDIT MASTER POSYANDU TEST";

// ============================================================
// AUDIT HELPER
// ============================================================

async function ambilAudit(
  entitas: string,
  entitasId: number,
  aksi: string,
) {
  const rows =
    await db
      .select()
      .from(
        auditLog,
      )
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

  return (
    rows[
      rows.length - 1
    ] ??
    null
  );
}

// ============================================================
// CLEANUP
// ============================================================

async function cleanup() {
  const posyanduRows =
    await db
      .select()
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
    const row of posyanduRows
  ) {
    await db
      .delete(
        auditLog,
      )
      .where(
        and(
          eq(
            auditLog.entitas,
            "posyandu",
          ),

          eq(
            auditLog.entitasId,
            String(
              row.id,
            ),
          ),
        ),
      );

    await db
      .delete(
        posyandu,
      )
      .where(
        eq(
          posyandu.id,
          row.id,
        ),
      );
  }

  const lokasiRows =
    await db
      .select()
      .from(
        lokasi,
      )
      .where(
        eq(
          lokasi.nama,
          NAMA_LOKASI,
        ),
      );

  for (
    const row of lokasiRows
  ) {
    await db
      .delete(
        auditLog,
      )
      .where(
        and(
          eq(
            auditLog.entitas,
            "lokasi",
          ),

          eq(
            auditLog.entitasId,
            String(
              row.id,
            ),
          ),
        ),
      );

    await db
      .delete(
        lokasi,
      )
      .where(
        eq(
          lokasi.id,
          row.id,
        ),
      );
  }
}

// ============================================================
// MAIN
// ============================================================

try {
  await cleanup();

  // ==========================================================
  // 1. CREATE LOKASI
  // ==========================================================

  const createLokasi =
    await request(app)
      .post(
        "/api/lokasi",
      )
      .send({
        nama:
          NAMA_LOKASI,

        alamat:
          "Alamat awal lokasi audit",

        aktif:
          true,
      })
      .expect(201);

  const lokasiId =
    createLokasi.body
      .data.id as number;

  assert.ok(
    Number.isInteger(
      lokasiId,
    ),
  );

  const auditCreateLokasi =
    await ambilAudit(
      "lokasi",
      lokasiId,
      "CREATE",
    );

  assert.ok(
    auditCreateLokasi,
    "Audit CREATE lokasi tidak ditemukan.",
  );

  assert.equal(
    auditCreateLokasi.dataSebelum,
    null,
  );

  assert.ok(
    auditCreateLokasi.dataSesudah,
    "CREATE lokasi harus memiliki dataSesudah.",
  );

  // ==========================================================
  // 2. UPDATE LOKASI
  // ==========================================================

  await request(app)
    .put(
      `/api/lokasi/${lokasiId}`,
    )
    .send({
      alamat:
        "Alamat lokasi setelah update",
    })
    .expect(200);

  const auditUpdateLokasi =
    await ambilAudit(
      "lokasi",
      lokasiId,
      "UPDATE",
    );

  assert.ok(
    auditUpdateLokasi,
    "Audit UPDATE lokasi tidak ditemukan.",
  );

  assert.ok(
    auditUpdateLokasi.dataSebelum,
  );

  assert.ok(
    auditUpdateLokasi.dataSesudah,
  );

  // ==========================================================
  // 3. CREATE POSYANDU
  // ==========================================================

  const createPosyandu =
    await request(app)
      .post(
        "/api/posyandu",
      )
      .send({
        lokasiId,

        nama:
          NAMA_POSYANDU,

        alamat:
          "Alamat Posyandu audit",

        aktif:
          true,
      })
      .expect(201);

  const posyanduId =
    createPosyandu.body
      .data.id as number;

  assert.ok(
    Number.isInteger(
      posyanduId,
    ),
  );

  const auditCreatePosyandu =
    await ambilAudit(
      "posyandu",
      posyanduId,
      "CREATE",
    );

  assert.ok(
    auditCreatePosyandu,
    "Audit CREATE Posyandu tidak ditemukan.",
  );

  assert.equal(
    auditCreatePosyandu.dataSebelum,
    null,
  );

  assert.ok(
    auditCreatePosyandu.dataSesudah,
  );

  // ==========================================================
  // 4. UPDATE POSYANDU
  // ==========================================================

  await request(app)
    .put(
      `/api/posyandu/${posyanduId}`,
    )
    .send({
      alamat:
        "Alamat Posyandu setelah update",
    })
    .expect(200);

  const auditUpdatePosyandu =
    await ambilAudit(
      "posyandu",
      posyanduId,
      "UPDATE",
    );

  assert.ok(
    auditUpdatePosyandu,
    "Audit UPDATE Posyandu tidak ditemukan.",
  );

  assert.ok(
    auditUpdatePosyandu.dataSebelum,
  );

  assert.ok(
    auditUpdatePosyandu.dataSesudah,
  );

  // ==========================================================
  // 5. NONAKTIFKAN POSYANDU
  //
  // Soft delete dicatat sebagai UPDATE.
  // ==========================================================

  await request(app)
    .post(
      `/api/posyandu/${posyanduId}/nonaktif`,
    )
    .expect(200);

  const rowsUpdatePosyandu =
    await db
      .select()
      .from(
        auditLog,
      )
      .where(
        and(
          eq(
            auditLog.entitas,
            "posyandu",
          ),

          eq(
            auditLog.entitasId,
            String(
              posyanduId,
            ),
          ),

          eq(
            auditLog.aksi,
            "UPDATE",
          ),
        ),
      );

  assert.equal(
    rowsUpdatePosyandu.length,
    2,
    "Posyandu harus memiliki dua audit UPDATE: edit dan nonaktif.",
  );

  const terakhirUpdate =
    rowsUpdatePosyandu[
      rowsUpdatePosyandu.length - 1
    ];

  assert.ok(
    terakhirUpdate?.dataSebelum,
  );

  assert.ok(
    terakhirUpdate?.dataSesudah,
  );

  // ==========================================================
  // 6. DELETE POSYANDU PERMANEN
  // ==========================================================

  await request(app)
    .delete(
      `/api/posyandu/${posyanduId}`,
    )
    .expect(200);

  const auditDeletePosyandu =
    await ambilAudit(
      "posyandu",
      posyanduId,
      "DELETE",
    );

  assert.ok(
    auditDeletePosyandu,
    "Audit DELETE Posyandu tidak ditemukan.",
  );

  assert.ok(
    auditDeletePosyandu.dataSebelum,
    "DELETE Posyandu harus memiliki dataSebelum.",
  );

  assert.equal(
    auditDeletePosyandu.dataSesudah,
    null,
  );

  // ==========================================================
  // 7. NONAKTIFKAN LOKASI
  //
  // Endpoint DELETE lokasi merupakan soft delete.
  // Audit dicatat sebagai UPDATE.
  // ==========================================================

  await request(app)
    .delete(
      `/api/lokasi/${lokasiId}`,
    )
    .expect(200);

  const rowsUpdateLokasi =
    await db
      .select()
      .from(
        auditLog,
      )
      .where(
        and(
          eq(
            auditLog.entitas,
            "lokasi",
          ),

          eq(
            auditLog.entitasId,
            String(
              lokasiId,
            ),
          ),

          eq(
            auditLog.aksi,
            "UPDATE",
          ),
        ),
      );

  assert.equal(
    rowsUpdateLokasi.length,
    2,
    "Lokasi harus memiliki dua audit UPDATE: edit dan nonaktif.",
  );

  const lokasiSesudahNonaktif =
    await db
      .select()
      .from(
        lokasi,
      )
      .where(
        eq(
          lokasi.id,
          lokasiId,
        ),
      )
      .limit(1);

  assert.equal(
    lokasiSesudahNonaktif[0]
      ?.aktif,
    false,
    "Lokasi seharusnya berstatus nonaktif.",
  );

  console.log(
    "✅ test-api-audit-master: seluruh pengujian lulus",
  );
} finally {
  await cleanup();

  delete process.env
    .POSGA_TEST_BYPASS_AUTH;
}
