import type {
  ErrorRequestHandler,
  RequestHandler,
} from "express";

import {
  ApiError,
} from "../lib/api-error.js";

// ============================================================
// RESPONSE TYPE
// ============================================================

export interface ApiErrorResponse {
  success: false;

  error: {
    message: string;
  };
}

// ============================================================
// 404 ROUTE
// ============================================================

export const notFoundHandler:
  RequestHandler =
    (
      _req,
      res,
    ) => {
      res.status(404).json({
        success: false,

        error: {
          message:
            "Endpoint tidak ditemukan.",
        },
      });
    };

// ============================================================
// DETEKSI ERROR SERVICE LAMA
// ============================================================

function deteksiStatusError(
  message: string,
) {
  const lower =
    message.toLowerCase();

  // ==========================================================
  // 404 - RESOURCE TIDAK DITEMUKAN
  // ==========================================================

  if (
    lower.includes(
      "tidak ditemukan",
    )
  ) {
    return 404;
  }

  // ==========================================================
  // 409 - CONFLICT
  //
  // Digunakan untuk:
  // - data duplikat
  // - episode aktif yang bentrok
  // - resource yang statusnya tidak memungkinkan aksi
  // - relasi yang masih dipakai
  // ==========================================================

  if (
    lower.includes(
      "sudah tercatat",
    ) ||
    lower.includes(
      "sudah terdaftar",
    ) ||
    lower.includes(
      "sudah ada",
    ) ||
    lower.includes(
      "duplikat",
    ) ||
    lower.includes(
      "masih aktif",
    ) ||
    lower.includes(
      "masih memiliki",
    ) ||
    lower.includes(
      "sudah memiliki",
    ) ||
    lower.includes(
      "tidak boleh dihapus",
    ) ||
    lower.includes(
      "tidak dapat ditambahkan",
    ) ||
    lower.includes(
      "hanya episode",
    )
  ) {
    return 409;
  }

  // ==========================================================
  // 400 - VALIDASI INPUT
  // ==========================================================

  return 400;
}

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

export const errorHandler:
  ErrorRequestHandler =
    (
      error,
      _req,
      res,
      _next,
    ) => {
      // ========================================================
      // API ERROR EKSPLISIT
      // ========================================================

      if (
        error instanceof
        ApiError
      ) {
        res
          .status(
            error.statusCode,
          )
          .json({
            success:
              false,

            error: {
              message:
                error.message,
            },
          });

        return;
      }

      // ========================================================
      // ERROR DARI SERVICE
      // ========================================================

      if (
        error instanceof
        Error
      ) {
        const status =
          deteksiStatusError(
            error.message,
          );

        console.error(
          "API ERROR:",
          error.message,
        );

        res
          .status(status)
          .json({
            success:
              false,

            error: {
              message:
                error.message,
            },
          });

        return;
      }

      // ========================================================
      // UNKNOWN ERROR
      // ========================================================

      console.error(
        "API ERROR UNKNOWN:",
        error,
      );

      res
        .status(500)
        .json({
          success: false,

          error: {
            message:
              "Terjadi kesalahan internal.",
          },
        });
    };