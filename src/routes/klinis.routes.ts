import {
  Router,
} from "express";

import {
  catatAudit,
} from "../lib/audit.service.js";

import {
  ambilAuditContext,
} from "../lib/audit-context.js";

import {
  ambilFormPesertaTerpadu,
  sinkronkanStatusPemeriksaanPeserta,
} from "../lib/form-peserta.service.js";

import {
  ambilHasilPemeriksaanById,
  hapusHasilPemeriksaan,
  tambahHasilPemeriksaan,
  updateHasilPemeriksaan,
} from "../lib/pemeriksaan.service.js";

import {
  ambilHasilSkriningById,
  ambilRiwayatSkriningPeserta,
  hapusHasilSkrining,
  tambahHasilSkrining,
  updateHasilSkrining,
} from "../lib/skrining.service.js";

import {
  ambilHasilKonselingById,
  hapusHasilKonseling,
  tambahHasilKonseling,
  updateHasilKonseling,
} from "../lib/konseling.service.js";

import {
  validateBody,
  validateParams,
} from "../middleware/validate.js";

import {
  klinisIdParamsSchema,
  tambahKonselingSchema,
  tambahPemeriksaanSchema,
  tambahSkriningSchema,
  updateKonselingSchema,
  updatePemeriksaanSchema,
  updateSkriningSchema,
} from "../validation/klinis.schemas.js";

import {
  nikParamsSchema,
} from "../validation/master.schemas.js";

// ============================================================
// ROUTER
// ============================================================

export const klinisRouter =
  Router();

function opsiKoreksiRiwayat(req: { query: Record<string, unknown> }) {
  return {
    izinkanKoreksiSesiSelesai:
      req.query.koreksi === "1",
  };
}

// ============================================================
// FORM PESERTA
// ============================================================

klinisRouter.get(
  "/peserta-sesi/:id/form",

  validateParams(
    klinisIdParamsSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const id =
        Number(
          req.params.id,
        );

      const hasil =
        await ambilFormPesertaTerpadu(
          id,
        );

      res.json({
        success: true,
        data: hasil,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================
// SINKRON STATUS
// ============================================================

klinisRouter.post(
  "/peserta-sesi/:id/sinkron-status",

  validateParams(
    klinisIdParamsSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const id =
        Number(
          req.params.id,
        );

      const hasil =
        await sinkronkanStatusPemeriksaanPeserta(
          id,
        );

      res.json({
        success: true,
        data: hasil,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================
// PEMERIKSAAN
// ============================================================

klinisRouter.post(
  "/pemeriksaan",

  validateBody(
    tambahPemeriksaanSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const hasil =
        await tambahHasilPemeriksaan(
          req.body,
          opsiKoreksiRiwayat(req),
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          "CREATE",

        entitas:
          "hasil_pemeriksaan",

        entitasId:
          hasil.id,

        dataSesudah:
          hasil,
      });

      res
        .status(201)
        .json({
          success: true,
          data: hasil,
        });
    } catch (error) {
      next(error);
    }
  },
);

klinisRouter.put(
  "/pemeriksaan/:id",

  validateParams(
    klinisIdParamsSchema,
  ),

  validateBody(
    updatePemeriksaanSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const id =
        Number(
          req.params.id,
        );

      const dataSebelum =
        await ambilHasilPemeriksaanById(
          id,
        );

      const hasil =
        await updateHasilPemeriksaan(
          id,
          req.body,
          opsiKoreksiRiwayat(req),
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          "UPDATE",

        entitas:
          "hasil_pemeriksaan",

        entitasId:
          id,

        dataSebelum,

        dataSesudah:
          hasil,
      });

      res.json({
        success: true,
        data: hasil,
      });
    } catch (error) {
      next(error);
    }
  },
);

klinisRouter.delete(
  "/pemeriksaan/:id",

  validateParams(
    klinisIdParamsSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const id =
        Number(
          req.params.id,
        );

      const dataSebelum =
        await ambilHasilPemeriksaanById(
          id,
        );

      const hasil =
        await hapusHasilPemeriksaan(
          id,
          opsiKoreksiRiwayat(req),
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
          "hasil_pemeriksaan",

        entitasId:
          id,

        dataSebelum,

        dataSesudah:
          hasil,
      });

      res.json({
        success: true,
        data: hasil,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================
// RIWAYAT SKRINING PESERTA
//
// GET /api/peserta/:nik/skrining-riwayat
// Digunakan sebagai quick history pada workspace pemeriksaan.
// ============================================================

klinisRouter.get(
  "/peserta/:nik/skrining-riwayat",

  validateParams(
    nikParamsSchema,
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

      const data =
        await ambilRiwayatSkriningPeserta(
          pesertaNik,
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
// SKRINING
// ============================================================

klinisRouter.post(
  "/skrining",

  validateBody(
    tambahSkriningSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const hasil =
        await tambahHasilSkrining(
          req.body,
          opsiKoreksiRiwayat(req),
        );

      if (!hasil) {
        throw new Error(
          "Gagal menyimpan hasil skrining.",
        );
      }

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          "CREATE",

        entitas:
          "hasil_skrining",

        entitasId:
          hasil.id,

        dataSesudah:
          hasil,
      });

      res
        .status(201)
        .json({
          success: true,
          data: hasil,
        });
    } catch (error) {
      next(error);
    }
  },
);

klinisRouter.put(
  "/skrining/:id",

  validateParams(
    klinisIdParamsSchema,
  ),

  validateBody(
    updateSkriningSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const id =
        Number(
          req.params.id,
        );

      const dataSebelum =
        await ambilHasilSkriningById(
          id,
        );

      const hasil =
        await updateHasilSkrining(
          id,
          req.body,
          opsiKoreksiRiwayat(req),
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          "UPDATE",

        entitas:
          "hasil_skrining",

        entitasId:
          id,

        dataSebelum,

        dataSesudah:
          hasil,
      });

      res.json({
        success: true,
        data: hasil,
      });
    } catch (error) {
      next(error);
    }
  },
);

klinisRouter.delete(
  "/skrining/:id",

  validateParams(
    klinisIdParamsSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const id =
        Number(
          req.params.id,
        );

      const dataSebelum =
        await ambilHasilSkriningById(
          id,
        );

      const hasil =
        await hapusHasilSkrining(
          id,
          opsiKoreksiRiwayat(req),
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
          "hasil_skrining",

        entitasId:
          id,

        dataSebelum,

        dataSesudah:
          hasil,
      });

      res.json({
        success: true,
        data: hasil,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================
// KONSELING
// ============================================================

klinisRouter.post(
  "/konseling",

  validateBody(
    tambahKonselingSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const hasil =
        await tambahHasilKonseling(
          req.body,
          opsiKoreksiRiwayat(req),
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          "CREATE",

        entitas:
          "hasil_konseling",

        entitasId:
          hasil.id,

        dataSesudah:
          hasil,
      });

      res
        .status(201)
        .json({
          success: true,
          data: hasil,
        });
    } catch (error) {
      next(error);
    }
  },
);

klinisRouter.put(
  "/konseling/:id",

  validateParams(
    klinisIdParamsSchema,
  ),

  validateBody(
    updateKonselingSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const id =
        Number(
          req.params.id,
        );

      const dataSebelum =
        await ambilHasilKonselingById(
          id,
        );

      const hasil =
        await updateHasilKonseling(
          id,
          req.body,
          opsiKoreksiRiwayat(req),
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          "UPDATE",

        entitas:
          "hasil_konseling",

        entitasId:
          id,

        dataSebelum,

        dataSesudah:
          hasil,
      });

      res.json({
        success: true,
        data: hasil,
      });
    } catch (error) {
      next(error);
    }
  },
);

klinisRouter.delete(
  "/konseling/:id",

  validateParams(
    klinisIdParamsSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const id =
        Number(
          req.params.id,
        );

      const dataSebelum =
        await ambilHasilKonselingById(
          id,
        );

      const hasil =
        await hapusHasilKonseling(
          id,
          opsiKoreksiRiwayat(req),
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
          "hasil_konseling",

        entitasId:
          id,

        dataSebelum,

        dataSesudah:
          hasil,
      });

      res.json({
        success: true,
        data: hasil,
      });
    } catch (error) {
      next(error);
    }
  },
);





