import type {
  RequestHandler,
} from "express";

import {
  requireAuth,
} from "./auth.js";

// ============================================================
// GLOBAL API AUTH
//
// Secara default seluruh API private wajib login.
//
// Bypass hanya tersedia untuk regression test lama dan harus
// diaktifkan secara eksplisit:
//
// POSGA_TEST_BYPASS_AUTH=1
//
// Jangan gunakan flag ini pada production.
// ============================================================

export const requireApiAuth:
  RequestHandler =
  (
    req,
    res,
    next,
  ) => {
    if (
      process.env
        .POSGA_TEST_BYPASS_AUTH ===
      "1"
    ) {
      next();

      return;
    }

    requireAuth(
      req,
      res,
      next,
    );
  };