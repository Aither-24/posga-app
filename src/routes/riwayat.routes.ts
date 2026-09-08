import {
  Router,
} from "express";

import {
  ambilRiwayatSesiPeserta,
} from "../lib/riwayat.service.js";

import {
  validateParams,
  validateQuery,
} from "../middleware/validate.js";

import {
  nikParamsSchema,
} from "../validation/master.schemas.js";

import {
  riwayatSesiPesertaQuerySchema,
  type RiwayatSesiPesertaQuery,
} from "../validation/riwayat.schemas.js";

// ============================================================
// ROUTER
// ============================================================

export const riwayatRouter =
  Router();

// ============================================================
// RIWAYAT SESI PESERTA
//
// GET:
// /api/peserta/:nik/riwayat-sesi
//
// QUERY:
// ?status=selesai
// ?statusPemeriksaan=selesai
// ?tanggalMulai=2026-01-01
// ?tanggalSelesai=2026-12-31
// ?page=1
// ?limit=20
// ============================================================

riwayatRouter.get(
  "/peserta/:nik/riwayat-sesi",

  validateParams(
    nikParamsSchema,
  ),

  validateQuery(
    riwayatSesiPesertaQuerySchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const pesertaNik =
        String(
          req.params.nik,
        );

      const query =
        res.locals
          .validatedQuery as RiwayatSesiPesertaQuery;

      const data =
        await ambilRiwayatSesiPeserta({
          pesertaNik,

          page:
            query.page,

          limit:
            query.limit,

          ...(query.status !==
          undefined
            ? {
                status:
                  query.status,
              }
            : {}),

          ...(query.statusPemeriksaan !==
          undefined
            ? {
                statusPemeriksaan:
                  query.statusPemeriksaan,
              }
            : {}),

          ...(query.tanggalMulai !==
          undefined
            ? {
                tanggalMulai:
                  query.tanggalMulai,
              }
            : {}),

          ...(query.tanggalSelesai !==
          undefined
            ? {
                tanggalSelesai:
                  query.tanggalSelesai,
              }
            : {}),
        });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);