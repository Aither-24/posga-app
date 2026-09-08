import assert from "node:assert/strict";

import {
  eq,
} from "drizzle-orm";

import request from "supertest";

import {
  app,
} from "../app.js";

import {
  db,
} from "../db/index.js";

import {
  lokasi,
  posyandu,
  sesiPosga,
} from "../db/schema.js";

// ============================================================
// FIXTURE
// ============================================================

const NAMA_LOKASI =
  "LOKASI TEST SEARCH SESI";

const NAMA_POSYANDU =
  "POSYANDU TEST SEARCH SESI";

// ============================================================
// HELPER
// ============================================================

function judul(
  text: string,
) {
  console.log(
    "\n========================================",
  );

  console.log(
    text,
  );

  console.log(
    "========================================",
  );
}

async function cleanup() {
  const daftarPosyandu =
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
    daftarPosyandu
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

async function fixture() {
  const lokasiRows =
    await db
      .insert(
        lokasi,
      )
      .values({
        nama:
          NAMA_LOKASI,

        aktif:
          true,
      })
      .returning();

  const lokasiId =
    lokasiRows[0]?.id;

  assert(
    lokasiId,
    "Fixture lokasi gagal.",
  );

  const posyanduRows =
    await db
      .insert(
        posyandu,
      )
      .values({
        lokasiId,

        nama:
          NAMA_POSYANDU,

        aktif:
          true,
      })
      .returning();

  const posyanduId =
    posyanduRows[0]?.id;

  assert(
    posyanduId,
    "Fixture Posyandu gagal.",
  );

  await db
    .insert(
      sesiPosga,
    )
    .values([
      {
        posyanduId,

        tanggalPosga:
          "2026-06-01",

        status:
          "selesai",

        catatan:
          "Fixture Juni.",
      },

      {
        posyanduId,

        tanggalPosga:
          "2026-07-01",

        status:
          "selesai",

        catatan:
          "Fixture Juli.",
      },

      {
        posyanduId,

        tanggalPosga:
          "2026-08-01",

        status:
          "dibatalkan",

        catatan:
          "Fixture Agustus.",
      },

      {
        posyanduId,

        tanggalPosga:
          "2026-09-01",

        status:
          "aktif",

        catatan:
          "Fixture September.",
      },

      {
        posyanduId,

        tanggalPosga:
          "2026-10-01",

        status:
          "aktif",

        catatan:
          "Fixture Oktober.",
      },
    ]);

  return {
    lokasiId,

    posyanduId,
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  judul(
    "TEST SEARCH, FILTER & PAGINATION SESI",
  );

  try {
    await cleanup();

    const {
      posyanduId,
    } =
      await fixture();

    // ========================================================
    // 1. DEFAULT
    // ========================================================

    console.log(
      "\n1. GET search sesi default",
    );

    const defaultResponse =
      await request(
        app,
      )
        .get(
          `/api/posyandu/${posyanduId}/sesi/search`,
        )
        .expect(200);

    assert.equal(
      defaultResponse.body
        .success,
      true,
    );

    assert.equal(
      defaultResponse.body
        .data.pagination.total,
      5,
    );

    assert.equal(
      defaultResponse.body
        .data.items.length,
      5,
    );

    console.log(
      "BERHASIL:",
      defaultResponse.body
        .data.pagination,
    );

    // ========================================================
    // 2. FILTER STATUS AKTIF
    // ========================================================

    console.log(
      "\n2. Filter status aktif",
    );

    const aktif =
      await request(
        app,
      )
        .get(
          `/api/posyandu/${posyanduId}/sesi/search?status=aktif`,
        )
        .expect(200);

    assert.equal(
      aktif.body
        .data.items.length,
      2,
    );

    assert(
      aktif.body
        .data.items.every(
          (
            item: {
              status: string;
            },
          ) =>
            item.status ===
            "aktif",
        ),
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 3. FILTER SELESAI
    // ========================================================

    console.log(
      "\n3. Filter status selesai",
    );

    const selesai =
      await request(
        app,
      )
        .get(
          `/api/posyandu/${posyanduId}/sesi/search?status=selesai`,
        )
        .expect(200);

    assert.equal(
      selesai.body
        .data.items.length,
      2,
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 4. RENTANG TANGGAL
    // ========================================================

    console.log(
      "\n4. Filter rentang tanggal",
    );

    const rentang =
      await request(
        app,
      )
        .get(
          `/api/posyandu/${posyanduId}/sesi/search?tanggalMulai=2026-07-01&tanggalSelesai=2026-09-30`,
        )
        .expect(200);

    assert.equal(
      rentang.body
        .data.items.length,
      3,
    );

    console.log(
      "BERHASIL. Jumlah:",
      rentang.body
        .data.items.length,
    );

    // ========================================================
    // 5. KOMBINASI
    // ========================================================

    console.log(
      "\n5. Kombinasi status + tanggal",
    );

    const kombinasi =
      await request(
        app,
      )
        .get(
          `/api/posyandu/${posyanduId}/sesi/search?status=aktif&tanggalMulai=2026-09-01&tanggalSelesai=2026-12-31`,
        )
        .expect(200);

    assert.equal(
      kombinasi.body
        .data.items.length,
      2,
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 6. PAGINATION
    // ========================================================

    console.log(
      "\n6. Pagination limit 2",
    );

    const page1 =
      await request(
        app,
      )
        .get(
          `/api/posyandu/${posyanduId}/sesi/search?page=1&limit=2`,
        )
        .expect(200);

    const page2 =
      await request(
        app,
      )
        .get(
          `/api/posyandu/${posyanduId}/sesi/search?page=2&limit=2`,
        )
        .expect(200);

    assert.equal(
      page1.body
        .data.items.length,
      2,
    );

    assert.equal(
      page2.body
        .data.items.length,
      2,
    );

    assert.equal(
      page1.body
        .data.pagination.total,
      5,
    );

    assert.equal(
      page1.body
        .data.pagination.totalPages,
      3,
    );

    assert.equal(
      page1.body
        .data.pagination.hasNext,
      true,
    );

    assert.equal(
      page2.body
        .data.pagination.hasPrevious,
      true,
    );

    console.log(
      "BERHASIL:",
      page1.body
        .data.pagination,
    );

    // ========================================================
    // 7. STATUS INVALID
    // ========================================================

    console.log(
      "\n7. Validasi status invalid",
    );

    await request(
      app,
    )
      .get(
        `/api/posyandu/${posyanduId}/sesi/search?status=rusak`,
      )
      .expect(400);

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 8. TANGGAL INVALID
    // ========================================================

    console.log(
      "\n8. Validasi tanggal invalid",
    );

    await request(
      app,
    )
      .get(
        `/api/posyandu/${posyanduId}/sesi/search?tanggalMulai=2026-02-30`,
      )
      .expect(400);

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 9. RENTANG TERBALIK
    // ========================================================

    console.log(
      "\n9. Validasi rentang tanggal terbalik",
    );

    await request(
      app,
    )
      .get(
        `/api/posyandu/${posyanduId}/sesi/search?tanggalMulai=2026-10-01&tanggalSelesai=2026-01-01`,
      )
      .expect(400);

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 10. POSYANDU TIDAK DITEMUKAN
    // ========================================================

    console.log(
      "\n10. Validasi Posyandu tidak ditemukan",
    );

    await request(
      app,
    )
      .get(
        "/api/posyandu/999999999/sesi/search",
      )
      .expect(404);

    console.log(
      "BERHASIL.",
    );

    judul(
      "SEMUA TEST SEARCH SESI BERHASIL",
    );
  } finally {
    console.log(
      "\nMembersihkan fixture...",
    );

    await cleanup();

    console.log(
      "Fixture berhasil dibersihkan.",
    );
  }
}

main().catch(
  (error) => {
    judul(
      "TEST SEARCH SESI GAGAL",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);