import { Router } from "express";

import {
  ambilBiodataAnak,
  ambilBiodataDewasa,
  ambilBiodataPeserta,
  hapusBiodataAnak,
  hapusBiodataDewasa,
  simpanBiodataAnak,
  simpanBiodataDewasa,
} from "../lib/biodata.service.js";

import {
  catatAudit,
} from "../lib/audit.service.js";

import {
  ambilAuditContext,
} from "../lib/audit-context.js";

import {
  validateBody,
  validateParams,
} from "../middleware/validate.js";

import {
  biodataAnakBodySchema,
  biodataDewasaBodySchema,
  pesertaNikParamsSchema,
} from "../validation/biodata.schemas.js";

export const biodataRouter = Router();

// ============================================================
// GET BIODATA PESERTA
// ============================================================

biodataRouter.get(
  "/peserta/:nik/biodata",

  validateParams(
    pesertaNikParamsSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const data =
        await ambilBiodataPeserta(
          String(
            req.params.nik,
          ),
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
// UPSERT BIODATA ANAK
// ============================================================

biodataRouter.put(
  "/peserta/:nik/biodata-anak",

  validateParams(
    pesertaNikParamsSchema,
  ),

  validateBody(
    biodataAnakBodySchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const nik =
        String(
          req.params.nik,
        );

      const dataSebelum =
        await ambilBiodataAnak(
          nik,
        );

      const data =
        await simpanBiodataAnak(
          nik,
          req.body,
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          dataSebelum
            ? "UPDATE"
            : "CREATE",

        entitas:
          "biodata_anak",

        entitasId:
          nik,

        dataSebelum:
          dataSebelum ??
          undefined,

        dataSesudah:
          data,
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

// ============================================================
// DELETE BIODATA ANAK
// ============================================================

biodataRouter.delete(
  "/peserta/:nik/biodata-anak",

  validateParams(
    pesertaNikParamsSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const nik =
        String(
          req.params.nik,
        );

      const dataSebelum =
        await ambilBiodataAnak(
          nik,
        );

      const data =
        await hapusBiodataAnak(
          nik,
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          "DELETE",

        entitas:
          "biodata_anak",

        entitasId:
          nik,

        dataSebelum:
          dataSebelum ??
          undefined,

        dataSesudah:
          data,
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

// ============================================================
// UPSERT BIODATA DEWASA
// ============================================================

biodataRouter.put(
  "/peserta/:nik/biodata-dewasa",

  validateParams(
    pesertaNikParamsSchema,
  ),

  validateBody(
    biodataDewasaBodySchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const nik =
        String(
          req.params.nik,
        );

      const dataSebelum =
        await ambilBiodataDewasa(
          nik,
        );

      const data =
        await simpanBiodataDewasa(
          nik,
          req.body,
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          dataSebelum
            ? "UPDATE"
            : "CREATE",

        entitas:
          "biodata_dewasa",

        entitasId:
          nik,

        dataSebelum:
          dataSebelum ??
          undefined,

        dataSesudah:
          data,
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

// ============================================================
// DELETE BIODATA DEWASA
// ============================================================

biodataRouter.delete(
  "/peserta/:nik/biodata-dewasa",

  validateParams(
    pesertaNikParamsSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const nik =
        String(
          req.params.nik,
        );

      const dataSebelum =
        await ambilBiodataDewasa(
          nik,
        );

      const data =
        await hapusBiodataDewasa(
          nik,
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          "DELETE",

        entitas:
          "biodata_dewasa",

        entitasId:
          nik,

        dataSebelum:
          dataSebelum ??
          undefined,

        dataSesudah:
          data,
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
