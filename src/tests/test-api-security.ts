import request from "supertest";

import {
  app,
} from "../app.js";

// ============================================================
// CONFIG
// ============================================================

const ADMIN_USERNAME =
  "admin";

const ADMIN_PASSWORD =
  process.env
    .POSGA_TEST_ADMIN_PASSWORD;

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
  number: number,
  message: string,
) {
  console.log(
    `âœ… ${number}. ${message}`,
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

  // Pastikan bypass tidak aktif.
  delete process.env
    .POSGA_TEST_BYPASS_AUTH;

  let token =
    "";

  let nomor =
    1;

  // ==========================================================
  // 1. HEALTH TETAP PUBLIC
  // ==========================================================

  {
    const res =
      await request(app)
        .get(
          "/api/health",
        );

    assert(
      res.status === 200,
      `Health seharusnya 200, mendapat ${res.status}`,
    );

    assert(
      res.body.success ===
        true,
      "Health harus success=true.",
    );

    ok(
      nomor++,
      "Health endpoint tetap public.",
    );
  }

  // ==========================================================
  // 2. LOGIN TETAP PUBLIC
  // ==========================================================

  {
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
      `Login harus 200, mendapat ${res.status}: ${JSON.stringify(res.body)}`,
    );

    assert(
      typeof res.body.data
        ?.token ===
        "string",
      "Login tidak menghasilkan token.",
    );

    token =
      res.body.data.token;

    ok(
      nomor++,
      "Login tetap public dan menghasilkan token.",
    );
  }

  // ==========================================================
  // 3. ENDPOINT MASTER TANPA TOKEN DITOLAK
  //
  // Tidak penting apakah resource sebenarnya ada.
  // Middleware auth harus menghentikan request lebih dahulu.
  // ==========================================================

  {
    const res =
      await request(app)
        .get(
          "/api/peserta",
        );

    assert(
      res.status === 401,
      `/api/peserta tanpa token harus 401, mendapat ${res.status}`,
    );

    assert(
      res.body.success ===
        false,
      "Response unauthorized harus success=false.",
    );

    ok(
      nomor++,
      "Endpoint peserta tanpa token ditolak.",
    );
  }

  // ==========================================================
  // 4. TOKEN PALSU DITOLAK
  // ==========================================================

  {
    const res =
      await request(app)
        .get(
          "/api/peserta",
        )
        .set(
          "Authorization",
          "Bearer token-palsu-posga",
        );

    assert(
      res.status === 401,
      `Token palsu harus 401, mendapat ${res.status}`,
    );

    ok(
      nomor++,
      "Token palsu ditolak.",
    );
  }

  // ==========================================================
  // 5. TOKEN VALID BISA MENGAKSES MASTER
  // ==========================================================

  {
    const res =
      await request(app)
        .get(
          "/api/peserta",
        )
        .set(
          "Authorization",
          `Bearer ${token}`,
        );

    assert(
      res.status === 200,
      `/api/peserta dengan token harus 200, mendapat ${res.status}: ${JSON.stringify(res.body)}`,
    );

    assert(
      res.body.success ===
        true,
      "Endpoint peserta harus success=true.",
    );

    ok(
      nomor++,
      "Token valid dapat mengakses peserta.",
    );
  }

  // ==========================================================
  // 6. ENDPOINT SESI TANPA TOKEN
  // ==========================================================

  {
    const res =
      await request(app)
        .get(
          "/api/posyandu/1/sesi",
        );

    assert(
      res.status === 401,
      `Endpoint sesi tanpa token harus 401, mendapat ${res.status}`,
    );

    ok(
      nomor++,
      "Endpoint sesi terlindungi.",
    );
  }

  // ==========================================================
  // 7. ENDPOINT RIWAYAT TANPA TOKEN
  // ==========================================================

  {
    const res =
      await request(app)
        .get(
          "/api/peserta/1234567890123456/riwayat-sesi",
        );

    assert(
      res.status === 401,
      `Endpoint riwayat tanpa token harus 401, mendapat ${res.status}`,
    );

    ok(
      nomor++,
      "Endpoint riwayat terlindungi.",
    );
  }

  // ==========================================================
  // 8. ENDPOINT REKAP TANPA TOKEN
  // ==========================================================

  {
    const res =
      await request(app)
        .get(
          "/api/sesi/1/rekap",
        );

    assert(
      res.status === 401,
      `Endpoint rekap tanpa token harus 401, mendapat ${res.status}`,
    );

    ok(
      nomor++,
      "Endpoint rekap terlindungi.",
    );
  }

  // ==========================================================
  // SELESAI
  // ==========================================================

  console.log("");

  console.log(
    "========================================",
  );

  console.log(
    `SECURITY TEST SELESAI: ${nomor - 1}/8 BERHASIL`,
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
      "âŒ SECURITY TEST GAGAL",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);