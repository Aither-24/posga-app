import {
  cariPesertaTerkelola,
  pindahPesertaTerkelola,
  tambahPesertaTerkelola,
} from "../lib/peserta-terkelola.service.js";

import {
  pesertaTerkelolaQuerySchema,
  pindahPesertaTerkelolaSchema,
  tambahPesertaTerkelolaSchema,
  type PesertaTerkelolaQuery,
} from "../validation/peserta-terkelola.schemas.js";
import {requireAdmin } from "../middleware/auth.js";

import { Router } from "express";

import { notFound } from "../lib/api-error.js";

import { catatAudit } from "../lib/audit.service.js";

import { ambilAuditContext } from "../lib/audit-context.js";

import {
  ambilLokasiById,
  ambilSemuaLokasi,
  nonaktifkanLokasi,
  tambahLokasi,
  updateLokasi,
} from "../lib/lokasi.service.js";

import {
  hapusPosyanduPermanen,
  ambilPosyanduById,
  ambilPosyanduByLokasi,
  nonaktifkanPosyandu,
  tambahPosyandu,
  updatePosyandu,
} from "../lib/posyandu.service.js";

import {
  hapusPesertaPermanen,
  ambilPesertaByNik,
  cariPeserta,
  nonaktifkanPeserta,
  tambahPeserta,
  updatePeserta,
} from "../lib/peserta.service.js";

import {
  ambilPesertaAktifByPosyandu,
  ambilRiwayatPosyanduPeserta,
  tempatkanPesertaKePosyandu,
} from "../lib/peserta-posyandu.service.js";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";

import {
  idParamsSchema,
  lokasiIdParamsSchema,
  nikParamsSchema,
  tambahLokasiSchema,
  tambahPesertaPosyanduSchema,
  tambahPesertaSchema,
  tambahPosyanduSchema,
  updateLokasiSchema,
  updatePesertaSchema,
  updatePosyanduSchema,
} from "../validation/master.schemas.js";

import {
  pesertaQuerySchema,
  type PesertaQuery,
} from "../validation/peserta-query.schemas.js";

// ============================================================
// ROUTER
// ============================================================

export const masterRouter = Router();

// ============================================================
// LOKASI
// ============================================================

masterRouter.get(
  "/lokasi",

  async (_req, res, next) => {
    try {
      const data = await ambilSemuaLokasi();

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
// GET LOKASI BY ID
// ============================================================

masterRouter.get(
  "/lokasi/:id",

  validateParams(idParamsSchema),

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const data = await ambilLokasiById(id);

      if (!data) {
        throw notFound("Lokasi tidak ditemukan.");
      }

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
// CREATE LOKASI
// ============================================================

masterRouter.post(
  "/lokasi",

  requireAdmin,

  validateBody(tambahLokasiSchema),

  async (req, res, next) => {
    try {
      const data = await tambahLokasi(req.body);

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================
// UPDATE LOKASI
// ============================================================

masterRouter.put(
  "/lokasi/:id",

  requireAdmin,

  validateParams(idParamsSchema),

  validateBody(updateLokasiSchema),

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const data = await updateLokasi(id, req.body);

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
// NONAKTIFKAN LOKASI
// ============================================================

masterRouter.delete(
  "/lokasi/:id",

  requireAdmin,

  validateParams(idParamsSchema),

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const data = await nonaktifkanLokasi(id);

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
// POSYANDU
// ============================================================

// ============================================================
// GET POSYANDU BERDASARKAN LOKASI
// ============================================================

masterRouter.get(
  "/lokasi/:lokasiId/posyandu",

  validateParams(lokasiIdParamsSchema),

  async (req, res, next) => {
    try {
      const lokasiId = Number(req.params.lokasiId);

      const data = await ambilPosyanduByLokasi(lokasiId);

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
// GET POSYANDU BY ID
// ============================================================

masterRouter.get(
  "/posyandu/:id",

  validateParams(idParamsSchema),

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const data = await ambilPosyanduById(id);

      if (!data) {
        throw notFound("Posyandu tidak ditemukan.");
      }

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
// CREATE POSYANDU
// ============================================================

masterRouter.post(
  "/posyandu",

  requireAdmin,

  validateBody(tambahPosyanduSchema),

  async (req, res, next) => {
    try {
      const data = await tambahPosyandu(req.body);

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================
// UPDATE POSYANDU
// ============================================================

masterRouter.put(
  "/posyandu/:id",

  requireAdmin,

  validateParams(idParamsSchema),

  validateBody(updatePosyanduSchema),

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const data = await updatePosyandu(id, req.body);

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
// NONAKTIFKAN POSYANDU
//
// Soft delete. Dipakai bila Posyandu sudah memiliki riwayat.
// ============================================================

masterRouter.post(
  "/posyandu/:id/nonaktif",

  requireAdmin,

  validateParams(idParamsSchema),

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const data = await nonaktifkanPosyandu(id);

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
// HAPUS POSYANDU PERMANEN
//
// Hard delete hanya berhasil bila tidak ada foreign key yang
// masih mereferensikan Posyandu.
// ============================================================

masterRouter.delete(
  "/posyandu/:id",

  requireAdmin,

  validateParams(idParamsSchema),

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const data = await hapusPosyanduPermanen(id);

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
// PESERTA
// ============================================================

// ============================================================
// SEARCH + FILTER + PAGINATION PESERTA
//
// CONTOH:
//
// GET /api/peserta
// GET /api/peserta?q=siti
// GET /api/peserta?aktif=true
// GET /api/peserta?jenisKelamin=P
// GET /api/peserta?page=2&limit=20
//
// Bisa dikombinasikan:
// GET /api/peserta?q=siti&aktif=true&jenisKelamin=P&page=1&limit=20
// ============================================================

masterRouter.get(
  "/peserta",

  validateQuery(
    pesertaTerkelolaQuerySchema,
  ),

  async (_req, res, next) => {
    try {
      const query =
        res.locals.validatedQuery as PesertaTerkelolaQuery;

      const data =
        await cariPesertaTerkelola({
          page: query.page,
          limit: query.limit,

          ...(query.q !== undefined
            ? { q: query.q }
            : {}),

          ...(query.aktif !== undefined
            ? { aktif: query.aktif }
            : {}),

          ...(query.jenisKelamin !== undefined
            ? {
                jenisKelamin:
                  query.jenisKelamin,
              }
            : {}),

          ...(query.lokasiId !== undefined
            ? {
                lokasiId:
                  query.lokasiId,
              }
            : {}),

          ...(query.posyanduId !== undefined
            ? {
                posyanduId:
                  query.posyanduId,
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

// ============================================================
// GET PESERTA BY NIK
// ============================================================

masterRouter.get(
  "/peserta/:nik",

  validateParams(nikParamsSchema),

  async (req, res, next) => {
    try {
      const nik = String(req.params.nik);

      const data = await ambilPesertaByNik(nik);

      if (!data) {
        throw notFound("Peserta tidak ditemukan.");
      }

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
// CREATE PESERTA
// ============================================================

masterRouter.post(
  "/peserta",

  validateBody(
    tambahPesertaTerkelolaSchema,
  ),

  async (req, res, next) => {
    try {
      const data =
        await tambahPesertaTerkelola(
          req.body,
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,
        aksi: "CREATE",
        entitas: "peserta",
        entitasId:
          data.peserta.nik,
        dataSesudah: data,
      });

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================
// UPDATE PESERTA
// ============================================================

masterRouter.put(
  "/peserta/:nik",

  validateParams(nikParamsSchema),

  validateBody(updatePesertaSchema),

  async (req, res, next) => {
    try {
      const nik =
        String(
          req.params.nik,
        );

      const dataSebelum =
        await ambilPesertaByNik(
          nik,
        );

      if (!dataSebelum) {
        throw notFound(
          "Peserta tidak ditemukan.",
        );
      }

      const data =
        await updatePeserta(
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
          "UPDATE",

        entitas:
          "peserta",

        entitasId:
          nik,

        dataSebelum,

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
// NONAKTIFKAN PESERTA
//
// Soft delete. Ini adalah operasi normal untuk peserta yang
// sudah mempunyai riwayat.
// ============================================================

masterRouter.post(
  "/peserta/:nik/nonaktif",

  requireAdmin,

  validateParams(nikParamsSchema),

  async (req, res, next) => {
    try {
      const nik = String(req.params.nik);

      const dataSebelum = await ambilPesertaByNik(nik);

      if (!dataSebelum) {
        throw notFound("Peserta tidak ditemukan.");
      }

      const data = await nonaktifkanPeserta(nik);

      const auditContext = ambilAuditContext(req, res);

      await catatAudit({
        ...auditContext,

        aksi: "UPDATE",

        entitas: "peserta",

        entitasId: nik,

        dataSebelum,

        dataSesudah: data,
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
// HAPUS PESERTA PERMANEN
//
// Hanya untuk koreksi data yang belum mempunyai relasi penting.
// ============================================================

masterRouter.delete(
  "/peserta/:nik",

  requireAdmin,

  validateParams(nikParamsSchema),

  async (req, res, next) => {
    try {
      const nik = String(req.params.nik);

      const dataSebelum = await ambilPesertaByNik(nik);

      if (!dataSebelum) {
        throw notFound("Peserta tidak ditemukan.");
      }

      const data = await hapusPesertaPermanen(nik);

      const auditContext = ambilAuditContext(req, res);

      await catatAudit({
        ...auditContext,

        aksi: "DELETE",

        entitas: "peserta",

        entitasId: nik,

        dataSebelum,
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
// KEANGGOTAAN POSYANDU
// ============================================================

// ============================================================
// RIWAYAT POSYANDU PESERTA
// ============================================================

masterRouter.get(
  "/peserta/:nik/riwayat-posyandu",

  validateParams(nikParamsSchema),

  async (req, res, next) => {
    try {
      const nik = String(req.params.nik);

      const data = await ambilRiwayatPosyanduPeserta(nik);

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
// PESERTA AKTIF BERDASARKAN POSYANDU
// ============================================================

masterRouter.get(
  "/posyandu/:id/peserta",

  validateParams(idParamsSchema),

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const data = await ambilPesertaAktifByPosyandu(id);

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
// TEMPATKAN PESERTA KE POSYANDU
// ============================================================

masterRouter.post(
  "/peserta-posyandu",

  
  requireAdmin,
validateBody(tambahPesertaPosyanduSchema),

  async (req, res, next) => {
    try {
      const data = await tempatkanPesertaKePosyandu(req.body);

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);













// ============================================================
// PINDAH POSYANDU PESERTA
//
// Hanya admin agar perpindahan keanggotaan terkendali.
// ============================================================

masterRouter.post(
  "/peserta/:nik/pindah-posyandu",

  requireAdmin,

  validateParams(
    nikParamsSchema,
  ),

  validateBody(
    pindahPesertaTerkelolaSchema,
  ),

  async (req, res, next) => {
    try {
      const nik =
        String(
          req.params.nik,
        );

      const data =
        await pindahPesertaTerkelola(
          nik,
          req.body.posyanduBaruId,
          req.body.tanggalPindah,
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,
        aksi: "UPDATE",
        entitas:
          "peserta_posyandu",
        entitasId: nik,
        dataSebelum:
          data.sebelum,
        dataSesudah:
          data.sesudah,
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

