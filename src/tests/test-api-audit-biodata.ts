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
  biodataAnak,
  biodataDewasa,
  peserta,
} from "../db/schema.js";

// Aktifkan bypass hanya untuk regression test.
process.env.POSGA_TEST_BYPASS_AUTH =
  "1";

const {
  app,
} = await import(
  "../app.js"
);

const NIK_ANAK =
  "3578000000099701";

const NIK_DEWASA =
  "3578000000099702";

// ============================================================
// CLEANUP
// ============================================================

async function cleanup() {
  for (
    const nik of [
      NIK_ANAK,
      NIK_DEWASA,
    ]
  ) {
    await db
      .delete(
        auditLog,
      )
      .where(
        eq(
          auditLog.entitasId,
          nik,
        ),
      );
  }

  await db
    .delete(
      biodataAnak,
    )
    .where(
      eq(
        biodataAnak.pesertaNik,
        NIK_ANAK,
      ),
    );

  await db
    .delete(
      biodataDewasa,
    )
    .where(
      eq(
        biodataDewasa.pesertaNik,
        NIK_DEWASA,
      ),
    );

  await db
    .delete(
      peserta,
    )
    .where(
      eq(
        peserta.nik,
        NIK_ANAK,
      ),
    );

  await db
    .delete(
      peserta,
    )
    .where(
      eq(
        peserta.nik,
        NIK_DEWASA,
      ),
    );
}

// ============================================================
// AMBIL SATU AUDIT
// ============================================================

async function ambilAudit(
  entitas: string,
  entitasId: string,
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
            entitasId,
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
// MAIN
// ============================================================

try {
  await cleanup();

  await db
    .insert(
      peserta,
    )
    .values([
      {
        nik:
          NIK_ANAK,

        nama:
          "Audit Biodata Anak",

        tanggalLahir:
          "2022-03-10",

        jenisKelamin:
          "P",

        aktif:
          true,
      },

      {
        nik:
          NIK_DEWASA,

        nama:
          "Audit Biodata Dewasa",

        tanggalLahir:
          "1990-01-10",

        jenisKelamin:
          "P",

        aktif:
          true,
      },
    ]);

  // ==========================================================
  // ANAK - CREATE
  // ==========================================================

  await request(app)
    .put(
      `/api/peserta/${NIK_ANAK}/biodata-anak`,
    )
    .send({
      namaIbuKandung:
        "Siti Test",

      anakKe:
        1,

      imd:
        true,

      bblGram:
        3100,

      pblCm:
        49,
    })
    .expect(200);

  const createAnak =
    await ambilAudit(
      "biodata_anak",
      NIK_ANAK,
      "CREATE",
    );

  assert.ok(
    createAnak,
    "Audit CREATE biodata anak tidak ditemukan.",
  );

  assert.equal(
    createAnak.dataSebelum,
    null,
  );

  assert.ok(
    createAnak.dataSesudah,
    "Audit CREATE harus memiliki dataSesudah.",
  );

  // ==========================================================
  // ANAK - UPDATE
  // ==========================================================

  await request(app)
    .put(
      `/api/peserta/${NIK_ANAK}/biodata-anak`,
    )
    .send({
      anakKe:
        2,

      bblGram:
        3200,
    })
    .expect(200);

  const updateAnak =
    await ambilAudit(
      "biodata_anak",
      NIK_ANAK,
      "UPDATE",
    );

  assert.ok(
    updateAnak,
    "Audit UPDATE biodata anak tidak ditemukan.",
  );

  assert.ok(
    updateAnak.dataSebelum,
    "Audit UPDATE harus memiliki dataSebelum.",
  );

  assert.ok(
    updateAnak.dataSesudah,
    "Audit UPDATE harus memiliki dataSesudah.",
  );

  // ==========================================================
  // ANAK - DELETE
  // ==========================================================

  await request(app)
    .delete(
      `/api/peserta/${NIK_ANAK}/biodata-anak`,
    )
    .expect(200);

  const deleteAnak =
    await ambilAudit(
      "biodata_anak",
      NIK_ANAK,
      "DELETE",
    );

  assert.ok(
    deleteAnak,
    "Audit DELETE biodata anak tidak ditemukan.",
  );

  assert.ok(
    deleteAnak.dataSebelum,
    "Audit DELETE harus memiliki dataSebelum.",
  );

  // ==========================================================
  // DEWASA - CREATE
  // ==========================================================

  await request(app)
    .put(
      `/api/peserta/${NIK_DEWASA}/biodata-dewasa`,
    )
    .send({
      namaPasangan:
        "Pasangan Test",

      jumlahAnak:
        1,

      kbYangDiikuti:
        "Pil",

      rpdHt:
        false,

      rpdDm:
        false,
    })
    .expect(200);

  const createDewasa =
    await ambilAudit(
      "biodata_dewasa",
      NIK_DEWASA,
      "CREATE",
    );

  assert.ok(
    createDewasa,
    "Audit CREATE biodata dewasa tidak ditemukan.",
  );

  assert.equal(
    createDewasa.dataSebelum,
    null,
  );

  assert.ok(
    createDewasa.dataSesudah,
  );

  // ==========================================================
  // DEWASA - UPDATE
  // ==========================================================

  await request(app)
    .put(
      `/api/peserta/${NIK_DEWASA}/biodata-dewasa`,
    )
    .send({
      jumlahAnak:
        2,

      rpdHt:
        true,
    })
    .expect(200);

  const updateDewasa =
    await ambilAudit(
      "biodata_dewasa",
      NIK_DEWASA,
      "UPDATE",
    );

  assert.ok(
    updateDewasa,
    "Audit UPDATE biodata dewasa tidak ditemukan.",
  );

  assert.ok(
    updateDewasa.dataSebelum,
  );

  assert.ok(
    updateDewasa.dataSesudah,
  );

  // ==========================================================
  // DEWASA - DELETE
  // ==========================================================

  await request(app)
    .delete(
      `/api/peserta/${NIK_DEWASA}/biodata-dewasa`,
    )
    .expect(200);

  const deleteDewasa =
    await ambilAudit(
      "biodata_dewasa",
      NIK_DEWASA,
      "DELETE",
    );

  assert.ok(
    deleteDewasa,
    "Audit DELETE biodata dewasa tidak ditemukan.",
  );

  assert.ok(
    deleteDewasa.dataSebelum,
  );

  console.log(
    "✅ test-api-audit-biodata: seluruh pengujian lulus",
  );
} finally {
  await cleanup();

  delete process.env
    .POSGA_TEST_BYPASS_AUTH;
}
