import assert from "node:assert/strict";

import express from "express";

import request from "supertest";

import {
  ApiError,
} from "../lib/api-error.js";

import {
  errorHandler,
  notFoundHandler,
} from "../middleware/error-handler.js";

// ============================================================
// TEST APP
//
// Tidak menggunakan database POSGA.
// ============================================================

const app = express();

app.get(
  "/api-error",

  () => {
    throw new ApiError(
      422,
      "Data tidak dapat diproses.",
    );
  },
);

app.get(
  "/legacy-not-found",

  () => {
    throw new Error(
      "Peserta tidak ditemukan.",
    );
  },
);

app.get(
  "/legacy-conflict",

  () => {
    throw new Error(
      "Peserta dengan NIK tersebut sudah terdaftar.",
    );
  },
);

app.get(
  "/legacy-validation",

  () => {
    throw new Error(
      "Tanggal tidak valid.",
    );
  },
);

app.get(
  "/legacy-internal",

  () => {
    throw new Error(
      "Gagal menyimpan peserta.",
    );
  },
);

app.get(
  "/unknown-internal",

  () => {
    throw new Error(
      "SQLITE_BUSY: database is locked",
    );
  },
);

app.get(
  "/unknown-value",

  () => {
    throw "error-non-object";
  },
);

app.use(
  notFoundHandler,
);

app.use(
  errorHandler,
);

// ============================================================
// API ERROR EKSPLISIT
// ============================================================

{
  const response =
    await request(app)
      .get("/api-error");

  assert.equal(
    response.status,
    422,
  );

  assert.equal(
    response.body.error.message,
    "Data tidak dapat diproses.",
  );
}

// ============================================================
// LEGACY 404
// ============================================================

{
  const response =
    await request(app)
      .get("/legacy-not-found");

  assert.equal(
    response.status,
    404,
  );

  assert.equal(
    response.body.error.message,
    "Peserta tidak ditemukan.",
  );
}

// ============================================================
// LEGACY 409
// ============================================================

{
  const response =
    await request(app)
      .get("/legacy-conflict");

  assert.equal(
    response.status,
    409,
  );

  assert.equal(
    response.body.error.message,
    "Peserta dengan NIK tersebut sudah terdaftar.",
  );
}

// ============================================================
// LEGACY 400
// ============================================================

{
  const response =
    await request(app)
      .get("/legacy-validation");

  assert.equal(
    response.status,
    400,
  );

  assert.equal(
    response.body.error.message,
    "Tanggal tidak valid.",
  );
}

// ============================================================
// INTERNAL ERROR TIDAK BOLEH BOCOR
// ============================================================

{
  const response =
    await request(app)
      .get("/legacy-internal");

  assert.equal(
    response.status,
    500,
  );

  assert.equal(
    response.body.error.message,
    "Terjadi kesalahan internal.",
  );

  assert.notEqual(
    response.body.error.message,
    "Gagal menyimpan peserta.",
  );
}

// ============================================================
// UNKNOWN ERROR TIDAK BOLEH BOCOR
// ============================================================

{
  const response =
    await request(app)
      .get("/unknown-internal");

  assert.equal(
    response.status,
    500,
  );

  assert.equal(
    response.body.error.message,
    "Terjadi kesalahan internal.",
  );
}

// ============================================================
// NON-ERROR VALUE
// ============================================================

{
  const response =
    await request(app)
      .get("/unknown-value");

  assert.equal(
    response.status,
    500,
  );

  assert.equal(
    response.body.error.message,
    "Terjadi kesalahan internal.",
  );
}

// ============================================================
// ROUTE TIDAK DITEMUKAN
// ============================================================

{
  const response =
    await request(app)
      .get("/tidak-ada");

  assert.equal(
    response.status,
    404,
  );

  assert.equal(
    response.body.error.message,
    "Endpoint tidak ditemukan.",
  );
}

console.log(
  "✅ test-error-handler: seluruh pengujian lulus",
);
