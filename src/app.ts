import express from "express";

import { authRouter } from "./routes/auth.routes.js";

import { klinisRouter } from "./routes/klinis.routes.js";

import { masterRouter } from "./routes/master.routes.js";

import { biodataRouter } from "./routes/biodata.routes.js";

import { reproduksiRouter } from "./routes/reproduksi.routes.js";

import { sesiRouter } from "./routes/sesi.routes.js";

import { riwayatRouter } from "./routes/riwayat.routes.js";

import { rekapRouter } from "./routes/rekap.routes.js";

import { requireApiAuth } from "./middleware/api-auth.js";

import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

// ============================================================
// APP
// ============================================================

export const app = express();

// ============================================================
// GLOBAL MIDDLEWARE
// ============================================================

app.use(express.json());

// ============================================================
// PUBLIC: HEALTH
// ============================================================

app.get(
  "/api/health",

  (_req, res) => {
    res.json({
      success: true,

      data: {
        status: "ok",

        service: "POSGA API",
      },
    });
  },
);

// ============================================================
// AUTH ROUTER
//
// Router auth dipasang sebelum global API protection.
//
// Endpoint di dalam authRouter memiliki perlindungan sendiri:
//
// PUBLIC:
// POST /api/auth/login
//
// PRIVATE:
// GET  /api/auth/me
// POST /api/auth/logout
// GET  /api/users
// POST /api/users
// PUT  /api/users/:id
// ============================================================

app.use("/api", authRouter);

// ============================================================
// GLOBAL PRIVATE API
//
// Semua router di bawah titik ini membutuhkan autentikasi.
// ============================================================

app.use("/api", requireApiAuth);

// ============================================================
// MASTER
// ============================================================

app.use("/api", masterRouter);

// ============================================================
// BIODATA
// ============================================================

app.use("/api", biodataRouter);

// ============================================================
// REPRODUKSI
// ============================================================

app.use("/api", reproduksiRouter);

// ============================================================
// SESI
// ============================================================

app.use("/api", sesiRouter);

// ============================================================
// KLINIS
// ============================================================

app.use("/api", klinisRouter);

// ============================================================
// RIWAYAT
// ============================================================

app.use("/api", riwayatRouter);

// ============================================================
// REKAP
// ============================================================

app.use("/api", rekapRouter);

// ============================================================
// STATIC FRONTEND
//
// Folder public menjadi root frontend:
//
// /                 -> public/index.html
// /css/output.css   -> public/css/output.css
// /js/...           -> public/js/...
//
// Diletakkan setelah seluruh router API agar frontend tidak
// mengubah perilaku endpoint /api yang sudah stabil.
// ============================================================

app.use(
  express.static(
    "public",
  ),
);

// ============================================================
// ERROR
// ============================================================

app.use(notFoundHandler);

app.use(errorHandler);
