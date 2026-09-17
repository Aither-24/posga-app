import assert from "node:assert/strict";

import type {
  Request,
  Response,
} from "express";

import {
  ApiError,
} from "../lib/api-error.js";

import {
  opsiKoreksiRiwayat,
} from "../routes/klinis.routes.js";

function buatRequest(
  koreksi?: string,
) {
  return {
    query:
      koreksi
        ? {
            koreksi,
          }
        : {},
  } as unknown as Request;
}

function buatResponse(
  role: "admin" | "petugas",
) {
  return {
    locals: {
      authUser: {
        sessionId: 1,
        userId: 1,
        username:
          role === "admin"
            ? "admin_test"
            : "petugas_test",
        nama:
          "User Test",
        role,
        expiresAt:
          "2099-01-01 00:00:00",
      },
    },
  } as unknown as Response;
}

// ============================================================
// TANPA MODE KOREKSI
// ============================================================

{
  const hasil =
    opsiKoreksiRiwayat(
      buatRequest(),
      buatResponse(
        "petugas",
      ),
    );

  assert.equal(
    hasil
      .izinkanKoreksiSesiSelesai,
    false,
  );
}

// ============================================================
// PETUGAS TIDAK BOLEH MEMAKSA ?koreksi=1
// ============================================================

{
  assert.throws(
    () =>
      opsiKoreksiRiwayat(
        buatRequest(
          "1",
        ),
        buatResponse(
          "petugas",
        ),
      ),

    (
      error:
        unknown,
    ) => {
      return (
        error instanceof
          ApiError &&
        error.statusCode ===
          403
      );
    },

    "Petugas harus ditolak dengan HTTP 403.",
  );
}

// ============================================================
// ADMIN BOLEH KOREKSI SESI SELESAI
// ============================================================

{
  const hasil =
    opsiKoreksiRiwayat(
      buatRequest(
        "1",
      ),
      buatResponse(
        "admin",
      ),
    );

  assert.equal(
    hasil
      .izinkanKoreksiSesiSelesai,
    true,
  );
}

// ============================================================
// QUERY LAIN TIDAK DIANGGAP MODE KOREKSI
// ============================================================

{
  const hasil =
    opsiKoreksiRiwayat(
      buatRequest(
        "true",
      ),
      buatResponse(
        "admin",
      ),
    );

  assert.equal(
    hasil
      .izinkanKoreksiSesiSelesai,
    false,
  );
}

// ============================================================
// BYPASS HANYA UNTUK REGRESSION TEST LAMA
// ============================================================

process.env
  .POSGA_TEST_BYPASS_AUTH =
  "1";

try {
  const hasil =
    opsiKoreksiRiwayat(
      buatRequest(
        "1",
      ),
      {
        locals: {},
      } as unknown as Response,
    );

  assert.equal(
    hasil
      .izinkanKoreksiSesiSelesai,
    true,
  );
} finally {
  delete process.env
    .POSGA_TEST_BYPASS_AUTH;
}

console.log(
  "✅ test-koreksi-sesi-role: seluruh pengujian lulus",
);
