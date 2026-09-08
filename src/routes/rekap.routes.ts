import {
  Router,
} from "express";

import {
  ambilRekapSesiPosga,
} from "../lib/rekap-sesi.service.js";

import {
  validateParams,
  validateQuery,
} from "../middleware/validate.js";

import {
  buatExportExcelPosga,
} from "../lib/export-excel.service.js";

import {
  exportPosgaQuerySchema,
  type ExportPosgaQuery,
} from "../validation/export.schemas.js";

import {
  sesiIdParamsSchema,
} from "../validation/sesi.schemas.js";

// ============================================================
// ROUTER
// ============================================================

export const rekapRouter =
  Router();

// ============================================================
// REKAP SATU SESI POSGA
//
// GET:
// /api/sesi/:id/rekap
// ============================================================

rekapRouter.get(
  "/sesi/:id/rekap",

  validateParams(
    sesiIdParamsSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const sesiId =
        Number(
          req.params.id,
        );

      const data =
        await ambilRekapSesiPosga(
          sesiId,
        );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================
// EXPORT EXCEL POSGA
//
// GET:
// /api/export/posga.xlsx?posyanduId=1&sesiId=123
//
// File disusun per kategori agar tetap dekat dengan format kerja POSGA.
// ============================================================

rekapRouter.get(
  "/export/posga.xlsx",

  validateQuery(
    exportPosgaQuerySchema,
  ),

  async (
    _req,
    res,
    next,
  ) => {
    try {
      const query =
        res.locals
          .validatedQuery as ExportPosgaQuery;

      const hasil =
        await buatExportExcelPosga(
          query,
        );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${hasil.filename}"`,
      );

      res.setHeader(
        "X-POSGA-Export-Rows",
        String(
          hasil.jumlahBaris,
        ),
      );

      res.send(
        hasil.buffer,
      );
    } catch (error) {
      next(error);
    }
  },
);
