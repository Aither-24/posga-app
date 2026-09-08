import assert from "node:assert/strict";

import request from "supertest";

import {
  inArray,
} from "drizzle-orm";

import {
  app,
} from "../app.js";

import {
  db,
} from "../db/index.js";

import {
  peserta,
} from "../db/schema.js";

// ============================================================
// FIXTURE
// ============================================================

const NIKS = [
  "3578000000099301",
  "3578000000099302",
  "3578000000099303",
  "3578000000099304",
] as const;

// ============================================================
// HELPER
// ============================================================

function judul(
  nilai: string,
) {
  console.log(
    "\n========================================",
  );

  console.log(
    nilai,
  );

  console.log(
    "========================================",
  );
}

async function cleanup() {
  await db
    .delete(
      peserta,
    )
    .where(
      inArray(
        peserta.nik,
        [...NIKS],
      ),
    );
}

async function fixture() {
  await db
    .insert(
      peserta,
    )
    .values([
      {
        nik:
          NIKS[0],

        nama:
          "Siti Aminah Search",

        noRm:
          "RM-SEARCH-001",

        noTelp:
          "081111111111",

        tanggalLahir:
          "1990-01-01",

        jenisKelamin:
          "P",

        aktif:
          true,
      },

      {
        nik:
          NIKS[1],

        nama:
          "Budi Santoso Search",

        noRm:
          "RM-SEARCH-002",

        noTelp:
          "082222222222",

        tanggalLahir:
          "1988-01-01",

        jenisKelamin:
          "L",

        aktif:
          true,
      },

      {
        nik:
          NIKS[2],

        nama:
          "Siti Nurhaliza Search",

        noRm:
          "RM-SEARCH-003",

        noTelp:
          "083333333333",

        tanggalLahir:
          "1995-01-01",

        jenisKelamin:
          "P",

        aktif:
          false,
      },

      {
        nik:
          NIKS[3],

        nama:
          "Andi Saputra Search",

        noRm:
          "RM-SEARCH-004",

        noTelp:
          "084444444444",

        tanggalLahir:
          "2000-01-01",

        jenisKelamin:
          "L",

        aktif:
          true,
      },
    ]);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  judul(
    "TEST SEARCH, FILTER & PAGINATION PESERTA",
  );

  try {
    await cleanup();

    await fixture();

    // ========================================================
    // 1. PAGINATION DEFAULT
    // ========================================================

    console.log(
      "\n1. GET peserta pagination default",
    );

    const defaultResponse =
      await request(
        app,
      )
        .get(
          "/api/peserta",
        )
        .expect(200);

    assert.equal(
      defaultResponse.body
        .success,
      true,
    );

    assert(
      Array.isArray(
        defaultResponse.body
          .data.items,
      ),
    );

    assert.equal(
      defaultResponse.body
        .data.pagination.page,
      1,
    );

    assert.equal(
      defaultResponse.body
        .data.pagination.limit,
      20,
    );

    console.log(
      "BERHASIL:",
      defaultResponse.body
        .data.pagination,
    );

    // ========================================================
    // 2. SEARCH NAMA
    // ========================================================

    console.log(
      "\n2. Search nama Siti",
    );

    const searchNama =
      await request(
        app,
      )
        .get(
          "/api/peserta?q=Siti",
        )
        .expect(200);

    const namaItems =
      searchNama.body
        .data.items;

    assert(
      namaItems.some(
        (
          item: {
            nik: string;
          },
        ) =>
          item.nik ===
          NIKS[0],
      ),
    );

    assert(
      namaItems.some(
        (
          item: {
            nik: string;
          },
        ) =>
          item.nik ===
          NIKS[2],
      ),
    );

    console.log(
      "BERHASIL. Jumlah:",
      namaItems.length,
    );

    // ========================================================
    // 3. SEARCH NIK
    // ========================================================

    console.log(
      "\n3. Search NIK",
    );

    const searchNik =
      await request(
        app,
      )
        .get(
          `/api/peserta?q=${NIKS[1]}`,
        )
        .expect(200);

    assert(
      searchNik.body
        .data.items.some(
          (
            item: {
              nik: string;
            },
          ) =>
            item.nik ===
            NIKS[1],
        ),
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 4. SEARCH NO RM
    // ========================================================

    console.log(
      "\n4. Search nomor RM",
    );

    const searchRm =
      await request(
        app,
      )
        .get(
          "/api/peserta?q=RM-SEARCH-003",
        )
        .expect(200);

    assert(
      searchRm.body
        .data.items.some(
          (
            item: {
              nik: string;
            },
          ) =>
            item.nik ===
            NIKS[2],
        ),
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 5. SEARCH NO TELP
    // ========================================================

    console.log(
      "\n5. Search nomor telepon",
    );

    const searchTelp =
      await request(
        app,
      )
        .get(
          "/api/peserta?q=084444444444",
        )
        .expect(200);

    assert(
      searchTelp.body
        .data.items.some(
          (
            item: {
              nik: string;
            },
          ) =>
            item.nik ===
            NIKS[3],
        ),
    );

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 6. FILTER AKTIF
    // ========================================================

    console.log(
      "\n6. Filter peserta nonaktif",
    );

    const nonaktif =
      await request(
        app,
      )
        .get(
          "/api/peserta?q=Search&aktif=false",
        )
        .expect(200);

    assert.equal(
      nonaktif.body
        .data.items.length,
      1,
    );

    assert.equal(
      nonaktif.body
        .data.items[0].nik,
      NIKS[2],
    );

    console.log(
      "BERHASIL:",
      nonaktif.body
        .data.items[0].nama,
    );

    // ========================================================
    // 7. FILTER JENIS KELAMIN
    // ========================================================

    console.log(
      "\n7. Filter perempuan",
    );

    const perempuan =
      await request(
        app,
      )
        .get(
          "/api/peserta?q=Search&jenisKelamin=P",
        )
        .expect(200);

    assert(
      perempuan.body
        .data.items.every(
          (
            item: {
              jenisKelamin: string;
            },
          ) =>
            item.jenisKelamin ===
            "P",
        ),
    );

    assert.equal(
      perempuan.body
        .data.items.length,
      2,
    );

    console.log(
      "BERHASIL. Jumlah:",
      perempuan.body
        .data.items.length,
    );

    // ========================================================
    // 8. KOMBINASI FILTER
    // ========================================================

    console.log(
      "\n8. Kombinasi search + aktif + jenis kelamin",
    );

    const kombinasi =
      await request(
        app,
      )
        .get(
          "/api/peserta?q=Siti&aktif=true&jenisKelamin=P",
        )
        .expect(200);

    assert.equal(
      kombinasi.body
        .data.items.length,
      1,
    );

    assert.equal(
      kombinasi.body
        .data.items[0].nik,
      NIKS[0],
    );

    console.log(
      "BERHASIL:",
      kombinasi.body
        .data.items[0].nama,
    );

    // ========================================================
    // 9. PAGINATION
    // ========================================================

    console.log(
      "\n9. Pagination limit 2",
    );

    const page1 =
      await request(
        app,
      )
        .get(
          "/api/peserta?q=Search&page=1&limit=2",
        )
        .expect(200);

    const page2 =
      await request(
        app,
      )
        .get(
          "/api/peserta?q=Search&page=2&limit=2",
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
      4,
    );

    assert.equal(
      page1.body
        .data.pagination.totalPages,
      2,
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
    // 10. PAGE INVALID
    // ========================================================

    console.log(
      "\n10. Validasi page invalid",
    );

    const invalidPage =
      await request(
        app,
      )
        .get(
          "/api/peserta?page=0",
        )
        .expect(400);

    assert.equal(
      invalidPage.body
        .success,
      false,
    );

    console.log(
      "BERHASIL:",
      invalidPage.body,
    );

    // ========================================================
    // 11. LIMIT TERLALU BESAR
    // ========================================================

    console.log(
      "\n11. Validasi limit > 100",
    );

    await request(
      app,
    )
      .get(
        "/api/peserta?limit=101",
      )
      .expect(400);

    console.log(
      "BERHASIL.",
    );

    // ========================================================
    // 12. FILTER BOOLEAN INVALID
    // ========================================================

    console.log(
      "\n12. Validasi aktif invalid",
    );

    await request(
      app,
    )
      .get(
        "/api/peserta?aktif=ya",
      )
      .expect(400);

    console.log(
      "BERHASIL.",
    );

    judul(
      "SEMUA TEST SEARCH PESERTA BERHASIL",
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
      "TEST SEARCH PESERTA GAGAL",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);