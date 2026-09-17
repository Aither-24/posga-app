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
  episodeKehamilan,
  episodeNifas,
  komplikasiPersalinan,
  peserta,
  tindakanPersalinan,
} from "../db/schema.js";

process.env
  .POSGA_TEST_BYPASS_AUTH =
  "1";

const {
  app,
} = await import(
  "../app.js"
);

const NIK =
  "3578000000099751";

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

async function hapusAudit(
  entitas: string,
  entitasId: number,
) {
  await db
    .delete(
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
      ),
    );
}

// ============================================================
// CLEANUP
// ============================================================

async function cleanup() {
  const nifasRows =
    await db
      .select()
      .from(
        episodeNifas,
      )
      .where(
        eq(
          episodeNifas.pesertaNik,
          NIK,
        ),
      );

  for (
    const nifas of nifasRows
  ) {
    const tindakanRows =
      await db
        .select()
        .from(
          tindakanPersalinan,
        )
        .where(
          eq(
            tindakanPersalinan
              .episodeNifasId,
            nifas.id,
          ),
        );

    for (
      const item of tindakanRows
    ) {
      await hapusAudit(
        "tindakan_persalinan",
        item.id,
      );
    }

    const komplikasiRows =
      await db
        .select()
        .from(
          komplikasiPersalinan,
        )
        .where(
          eq(
            komplikasiPersalinan
              .episodeNifasId,
            nifas.id,
          ),
        );

    for (
      const item of komplikasiRows
    ) {
      await hapusAudit(
        "komplikasi_persalinan",
        item.id,
      );
    }

    await hapusAudit(
      "episode_nifas",
      nifas.id,
    );

    await db
      .delete(
        tindakanPersalinan,
      )
      .where(
        eq(
          tindakanPersalinan
            .episodeNifasId,
          nifas.id,
        ),
      );

    await db
      .delete(
        komplikasiPersalinan,
      )
      .where(
        eq(
          komplikasiPersalinan
            .episodeNifasId,
          nifas.id,
        ),
      );
  }

  await db
    .delete(
      episodeNifas,
    )
    .where(
      eq(
        episodeNifas.pesertaNik,
        NIK,
      ),
    );

  const kehamilanRows =
    await db
      .select()
      .from(
        episodeKehamilan,
      )
      .where(
        eq(
          episodeKehamilan.pesertaNik,
          NIK,
        ),
      );

  for (
    const kehamilan of kehamilanRows
  ) {
    await hapusAudit(
      "episode_kehamilan",
      kehamilan.id,
    );
  }

  await db
    .delete(
      episodeKehamilan,
    )
    .where(
      eq(
        episodeKehamilan.pesertaNik,
        NIK,
      ),
    );

  await db
    .delete(
      peserta,
    )
    .where(
      eq(
        peserta.nik,
        NIK,
      ),
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
    .values({
      nik:
        NIK,

      nama:
        "Audit Reproduksi Test",

      tanggalLahir:
        "1995-01-10",

      jenisKelamin:
        "P",

      aktif:
        true,
    });

  // ==========================================================
  // CREATE KEHAMILAN
  // ==========================================================

  const buatKehamilan =
    await request(app)
      .post(
        `/api/peserta/${NIK}/kehamilan`,
      )
      .send({
        tanggalMulai:
          "2026-02-01",

        hpht:
          "2026-01-20",

        hpl:
          "2026-10-27",

        catatan:
          "Audit kehamilan.",
      })
      .expect(201);

  const kehamilanId =
    buatKehamilan.body
      .data.id as number;

  assert.ok(
    Number.isInteger(
      kehamilanId,
    ),
  );

  assert.ok(
    await ambilAudit(
      "episode_kehamilan",
      kehamilanId,
      "CREATE",
    ),
    "Audit CREATE kehamilan tidak ditemukan.",
  );

  // ==========================================================
  // UPDATE KEHAMILAN
  // ==========================================================

  await request(app)
    .put(
      `/api/kehamilan/${kehamilanId}`,
    )
    .send({
      catatan:
        "Audit kehamilan update.",
    })
    .expect(200);

  const auditUpdateKehamilan =
    await ambilAudit(
      "episode_kehamilan",
      kehamilanId,
      "UPDATE",
    );

  assert.ok(
    auditUpdateKehamilan,
  );

  assert.ok(
    auditUpdateKehamilan
      .dataSebelum,
  );

  assert.ok(
    auditUpdateKehamilan
      .dataSesudah,
  );

  // ==========================================================
  // CREATE NIFAS
  // ==========================================================

  const buatNifas =
    await request(app)
      .post(
        `/api/peserta/${NIK}/nifas`,
      )
      .send({
        episodeKehamilanId:
          kehamilanId,

        tanggalMulai:
          "2026-08-20",

        tanggalMelahirkan:
          "2026-08-20",

        jamBersalin:
          "09:30",

        caraPersalinan:
          "pervaginam",

        vitaminA:
          true,

        asiEksklusif:
          true,

        catatan:
          "Audit nifas.",
      })
      .expect(201);

  const nifasId =
    buatNifas.body
      .data.id as number;

  assert.ok(
    Number.isInteger(
      nifasId,
    ),
  );

  assert.ok(
    await ambilAudit(
      "episode_nifas",
      nifasId,
      "CREATE",
    ),
    "Audit CREATE nifas tidak ditemukan.",
  );

  assert.ok(
    await ambilAudit(
      "episode_kehamilan",
      kehamilanId,
      "SELESAI_OTOMATIS",
    ),
    "Penutupan otomatis kehamilan belum tercatat.",
  );

  // ==========================================================
  // UPDATE NIFAS
  // ==========================================================

  await request(app)
    .put(
      `/api/nifas/${nifasId}`,
    )
    .send({
      asiEksklusif:
        false,

      catatan:
        "Audit nifas update.",
    })
    .expect(200);

  const auditUpdateNifas =
    await ambilAudit(
      "episode_nifas",
      nifasId,
      "UPDATE",
    );

  assert.ok(
    auditUpdateNifas,
  );

  assert.ok(
    auditUpdateNifas
      .dataSebelum,
  );

  // ==========================================================
  // CREATE TINDAKAN
  // ==========================================================

  const buatTindakan =
    await request(app)
      .post(
        `/api/nifas/${nifasId}/tindakan`,
      )
      .send({
        kode:
          "JAHIT",

        label:
          "Penjahitan Perineum",

        catatan:
          "Audit tindakan.",
      })
      .expect(201);

  const tindakanId =
    buatTindakan.body
      .data.id as number;

  assert.ok(
    await ambilAudit(
      "tindakan_persalinan",
      tindakanId,
      "CREATE",
    ),
  );

  // ==========================================================
  // UPDATE TINDAKAN
  // ==========================================================

  await request(app)
    .put(
      `/api/tindakan-persalinan/${tindakanId}`,
    )
    .send({
      label:
        "Penjahitan Luka Perineum",
    })
    .expect(200);

  const auditUpdateTindakan =
    await ambilAudit(
      "tindakan_persalinan",
      tindakanId,
      "UPDATE",
    );

  assert.ok(
    auditUpdateTindakan,
  );

  assert.ok(
    auditUpdateTindakan
      .dataSebelum,
  );

  // ==========================================================
  // CREATE KOMPLIKASI
  // ==========================================================

  const buatKomplikasi =
    await request(app)
      .post(
        `/api/nifas/${nifasId}/komplikasi`,
      )
      .send({
        kode:
          "PERDARAHAN",

        label:
          "Perdarahan Pascapersalinan",

        catatan:
          "Audit komplikasi.",
      })
      .expect(201);

  const komplikasiId =
    buatKomplikasi.body
      .data.id as number;

  assert.ok(
    await ambilAudit(
      "komplikasi_persalinan",
      komplikasiId,
      "CREATE",
    ),
  );

  // ==========================================================
  // UPDATE KOMPLIKASI
  // ==========================================================

  await request(app)
    .put(
      `/api/komplikasi-persalinan/${komplikasiId}`,
    )
    .send({
      catatan:
        "Komplikasi telah ditangani.",
    })
    .expect(200);

  const auditUpdateKomplikasi =
    await ambilAudit(
      "komplikasi_persalinan",
      komplikasiId,
      "UPDATE",
    );

  assert.ok(
    auditUpdateKomplikasi,
  );

  assert.ok(
    auditUpdateKomplikasi
      .dataSebelum,
  );

  // ==========================================================
  // DELETE TINDAKAN
  // ==========================================================

  await request(app)
    .delete(
      `/api/tindakan-persalinan/${tindakanId}`,
    )
    .expect(200);

  const auditDeleteTindakan =
    await ambilAudit(
      "tindakan_persalinan",
      tindakanId,
      "DELETE",
    );

  assert.ok(
    auditDeleteTindakan,
  );

  assert.ok(
    auditDeleteTindakan
      .dataSebelum,
  );

  // ==========================================================
  // DELETE KOMPLIKASI
  // ==========================================================

  await request(app)
    .delete(
      `/api/komplikasi-persalinan/${komplikasiId}`,
    )
    .expect(200);

  const auditDeleteKomplikasi =
    await ambilAudit(
      "komplikasi_persalinan",
      komplikasiId,
      "DELETE",
    );

  assert.ok(
    auditDeleteKomplikasi,
  );

  assert.ok(
    auditDeleteKomplikasi
      .dataSebelum,
  );

  // ==========================================================
  // SELESAIKAN NIFAS
  // ==========================================================

  await request(app)
    .post(
      `/api/nifas/${nifasId}/selesai`,
    )
    .send({
      tanggalSelesai:
        "2026-10-01",
    })
    .expect(200);

  const auditSelesaiNifas =
    await ambilAudit(
      "episode_nifas",
      nifasId,
      "SELESAI",
    );

  assert.ok(
    auditSelesaiNifas,
  );

  assert.ok(
    auditSelesaiNifas
      .dataSebelum,
  );

  assert.ok(
    auditSelesaiNifas
      .dataSesudah,
  );

  console.log(
    "✅ test-api-audit-reproduksi: seluruh pengujian lulus",
  );
} finally {
  await cleanup();

  delete process.env
    .POSGA_TEST_BYPASS_AUTH;
}
