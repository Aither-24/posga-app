import {
  pastikanPesertaSesuaiPosyanduSesi,
} from "../lib/keanggotaan-sesi.service.js";
import { requireAdmin } from "../middleware/auth.js";

import { and, eq } from "drizzle-orm";

import { Router } from "express";

import { db } from "../db/index.js";

import {
  hasilKonseling,
  hasilPemeriksaan,
  hasilSkrining,
  peserta,
  pesertaSesiPosga,
  sesiPosga,
} from "../db/schema.js";

import { conflict, notFound } from "../lib/api-error.js";

import { catatAudit } from "../lib/audit.service.js";

import { ambilAuditContext } from "../lib/audit-context.js";

import {
  hapusSesiPosga,
  ambilPesertaSesi,
  ambilSesiByPosyandu,
  ambilSesiPosgaById,
  batalkanSesiPosga,
  buatSesiPosga,
  selesaikanSesiPosga,
  tentukanKategoriPemeriksaan,
  updateSesiPosga,
} from "../lib/sesi-posga.service.js";

import { cariSesiPosga } from "../lib/sesi-query.service.js";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";

import {
  sesiQuerySchema,
  type SesiQuery,
} from "../validation/sesi-query.schemas.js";

import {
  buatSesiSchema,
  posyanduIdParamsSchema,
  sesiIdParamsSchema,
  sesiPesertaParamsSchema,
  tambahPesertaSesiSchema,
  updateSesiSchema,
} from "../validation/sesi.schemas.js";

// ============================================================
// ROUTER
// ============================================================

export const sesiRouter = Router();

// ============================================================
// GET SESI BERDASARKAN POSYANDU
//
// Endpoint lama tetap dipertahankan.
// Response tetap array.
// ============================================================

sesiRouter.get(
  "/posyandu/:posyanduId/sesi",

  validateParams(posyanduIdParamsSchema),

  async (req, res, next) => {
    try {
      const posyanduId = Number(req.params.posyanduId);

      const data = await ambilSesiByPosyandu(posyanduId);

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
// SEARCH + FILTER + PAGINATION SESI
//
// CONTOH:
//
// GET /api/posyandu/1/sesi/search
//
// GET /api/posyandu/1/sesi/search?status=aktif
//
// GET /api/posyandu/1/sesi/search
//   ?tanggalMulai=2026-01-01
//   &tanggalSelesai=2026-12-31
//
// GET /api/posyandu/1/sesi/search
//   ?status=selesai
//   &tanggalMulai=2026-01-01
//   &tanggalSelesai=2026-12-31
//   &page=1
//   &limit=20
// ============================================================

sesiRouter.get(
  "/posyandu/:posyanduId/sesi/search",

  validateParams(posyanduIdParamsSchema),

  validateQuery(sesiQuerySchema),

  async (req, res, next) => {
    try {
      const posyanduId = Number(req.params.posyanduId);

      const query = res.locals.validatedQuery as SesiQuery;

      const data = await cariSesiPosga({
        posyanduId,

        page: query.page,

        limit: query.limit,

        ...(query.status !== undefined
          ? {
              status: query.status,
            }
          : {}),

        ...(query.tanggalMulai !== undefined
          ? {
              tanggalMulai: query.tanggalMulai,
            }
          : {}),

        ...(query.tanggalSelesai !== undefined
          ? {
              tanggalSelesai: query.tanggalSelesai,
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
// GET SESI BY ID
// ============================================================

sesiRouter.get(
  "/sesi/:id",

  validateParams(sesiIdParamsSchema),

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const data = await ambilSesiPosgaById(id);

      if (!data) {
        throw notFound("Sesi POSGA tidak ditemukan.");
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
// CREATE SESI
// ============================================================

sesiRouter.post(
  "/sesi",

  validateBody(buatSesiSchema),

  async (req, res, next) => {
    try {
      const data =
        await buatSesiPosga(
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
          "CREATE",

        entitas:
          "sesi_posga",

        entitasId:
          data.sesi.id,

        dataSesudah:
          data,
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
// UPDATE SESI
// ============================================================

sesiRouter.put(
  "/sesi/:id",

  validateParams(sesiIdParamsSchema),

  validateBody(updateSesiSchema),

  async (req, res, next) => {
    try {
      const id =
        Number(
          req.params.id,
        );

      const dataSebelum =
        await ambilSesiPosgaById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Sesi POSGA tidak ditemukan.",
        );
      }

      const data =
        await updateSesiPosga(
          id,
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
          "sesi_posga",

        entitasId:
          id,

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
// SELESAIKAN SESI
// ============================================================

sesiRouter.post(
  "/sesi/:id/selesai",

  validateParams(sesiIdParamsSchema),

  async (req, res, next) => {
    try {
      const id =
        Number(
          req.params.id,
        );

      const dataSebelum =
        await ambilSesiPosgaById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Sesi POSGA tidak ditemukan.",
        );
      }

      const data =
        await selesaikanSesiPosga(
          id,
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          "SELESAI",

        entitas:
          "sesi_posga",

        entitasId:
          id,

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
// BATALKAN SESI
// ============================================================

sesiRouter.post(
  "/sesi/:id/batal",

  requireAdmin,

  validateParams(sesiIdParamsSchema),

  async (req, res, next) => {
    try {
      const id =
        Number(
          req.params.id,
        );

      const dataSebelum =
        await ambilSesiPosgaById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Sesi POSGA tidak ditemukan.",
        );
      }

      const data =
        await batalkanSesiPosga(
          id,
        );

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          "BATAL",

        entitas:
          "sesi_posga",

        entitasId:
          id,

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
// HAPUS SESI PERMANEN
//
// Hanya admin.
// Sesi aktif tidak boleh dihapus.
// Sesi selesai/dibatalkan boleh dihapus.
// ============================================================

sesiRouter.delete(
  "/sesi/:id",

  requireAdmin,

  validateParams(sesiIdParamsSchema),

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const data = await hapusSesiPosga(id);

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
// GET ROSTER PESERTA SESI
// ============================================================

sesiRouter.get(
  "/sesi/:id/peserta",

  validateParams(sesiIdParamsSchema),

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const data = await ambilPesertaSesi(id);

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
// TAMBAH PESERTA MANUAL KE SESI
//
// URL:
// POST /api/sesi/:id/peserta
//
// BODY:
// {
//   "pesertaNik": "................"
// }
//
// NIK berasal dari body.
// ============================================================

sesiRouter.post(
  "/sesi/:id/peserta",

  validateParams(sesiIdParamsSchema),

  validateBody(tambahPesertaSesiSchema),

  async (req, res, next) => {
    try {
      const sesiId = Number(req.params.id);

      const pesertaNik = String(req.body.pesertaNik);

      // ------------------------------------------------------
      // SESI
      // ------------------------------------------------------

      const sesiRows = await db
        .select({
          id: sesiPosga.id,

          tanggalPosga: sesiPosga.tanggalPosga,

          status: sesiPosga.status,
        })
        .from(sesiPosga)
        .where(eq(sesiPosga.id, sesiId))
        .limit(1);

      const sesi = sesiRows[0];

      if (!sesi) {
        throw notFound("Sesi POSGA tidak ditemukan.");
      }

      if (sesi.status === "selesai" || sesi.status === "dibatalkan") {
        throw conflict(
          "Peserta tidak dapat ditambahkan ke sesi yang sudah selesai atau dibatalkan.",
        );
      }

      // ------------------------------------------------------
      // PESERTA
      // ------------------------------------------------------

      const pesertaRows = await db
        .select({
          nik: peserta.nik,

          tanggalLahir: peserta.tanggalLahir,

          jenisKelamin: peserta.jenisKelamin,

          aktif: peserta.aktif,
        })
        .from(peserta)
        .where(eq(peserta.nik, pesertaNik))
        .limit(1);

      const dataPeserta = pesertaRows[0];

      if (!dataPeserta) {
        throw notFound("Peserta tidak ditemukan.");
      }

      if (!dataPeserta.aktif) {
        throw conflict("Peserta sudah tidak aktif.");
      }

      await pastikanPesertaSesuaiPosyanduSesi(
        sesiId,
        pesertaNik,
      );

      // ------------------------------------------------------
      // CEK DUPLIKAT
      // ------------------------------------------------------

      const duplikat = await db
        .select({
          id: pesertaSesiPosga.id,
        })
        .from(pesertaSesiPosga)
        .where(
          and(
            eq(pesertaSesiPosga.sesiPosgaId, sesiId),

            eq(pesertaSesiPosga.pesertaNik, pesertaNik),
          ),
        )
        .limit(1);

      if (duplikat.length > 0) {
        throw conflict("Peserta sudah terdaftar pada sesi ini.");
      }

      // ------------------------------------------------------
      // TENTUKAN KATEGORI
      // ------------------------------------------------------

      const klasifikasi = await tentukanKategoriPemeriksaan(
        dataPeserta.nik,
        dataPeserta.tanggalLahir,
        dataPeserta.jenisKelamin,
        sesi.tanggalPosga,
      );

      // ------------------------------------------------------
      // INSERT KE ROSTER
      // ------------------------------------------------------

      const inserted = await db
        .insert(pesertaSesiPosga)
        .values({
          sesiPosgaId: sesiId,

          pesertaNik,

          kategoriSaatItu: klasifikasi.kategori,

          sumberKategori: klasifikasi.sumberKategori,

          statusPemeriksaan: "belum_diperiksa",
        })
        .returning();

      const data = inserted[0];

      if (!data) {
        throw new Error("Gagal menambahkan peserta ke sesi.");
      }

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          "TAMBAH_PESERTA",

        entitas:
          "peserta_sesi_posga",

        entitasId:
          data.id,

        dataSesudah: {
          ...data,

          umur:
            klasifikasi.umur,
        },
      });

      res.status(201).json({
        success: true,

        data: {
          ...data,

          umur: klasifikasi.umur,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================
// HAPUS PESERTA DARI ROSTER
//
// URL:
// DELETE /api/sesi/:id/peserta/:nik
//
// NIK berasal dari parameter URL.
//
// Peserta tidak boleh dihapus apabila sudah memiliki:
// - hasil pemeriksaan
// - hasil konseling
// - hasil skrining
// ============================================================

sesiRouter.delete(
  "/sesi/:id/peserta/:nik",

  requireAdmin,

  validateParams(sesiPesertaParamsSchema),

  async (req, res, next) => {
    try {
      const sesiId = Number(req.params.id);

      const pesertaNik = String(req.params.nik);

      // ------------------------------------------------------
      // CARI ROSTER
      // ------------------------------------------------------

      const rows = await db
        .select({
          id:
            pesertaSesiPosga.id,

          sesiPosgaId:
            pesertaSesiPosga.sesiPosgaId,

          pesertaNik:
            pesertaSesiPosga.pesertaNik,

          kategoriSaatItu:
            pesertaSesiPosga.kategoriSaatItu,

          sumberKategori:
            pesertaSesiPosga.sumberKategori,

          statusPemeriksaan:
            pesertaSesiPosga.statusPemeriksaan,
        })
        .from(pesertaSesiPosga)
        .where(
          and(
            eq(
              pesertaSesiPosga.sesiPosgaId,
              sesiId,
            ),

            eq(
              pesertaSesiPosga.pesertaNik,
              pesertaNik,
            ),
          ),
        )
        .limit(1);

      const roster = rows[0];

      if (!roster) {
        throw notFound("Peserta tidak ditemukan dalam sesi.");
      }

      // ------------------------------------------------------
      // CEK HASIL PEMERIKSAAN
      // ------------------------------------------------------

      const pemeriksaan = await db
        .select({
          id: hasilPemeriksaan.id,
        })
        .from(hasilPemeriksaan)
        .where(eq(hasilPemeriksaan.pesertaSesiPosgaId, roster.id))
        .limit(1);

      // ------------------------------------------------------
      // CEK HASIL KONSELING
      // ------------------------------------------------------

      const konseling = await db
        .select({
          id: hasilKonseling.id,
        })
        .from(hasilKonseling)
        .where(eq(hasilKonseling.pesertaSesiPosgaId, roster.id))
        .limit(1);

      // ------------------------------------------------------
      // CEK HASIL SKRINING
      // ------------------------------------------------------

      const skrining = await db
        .select({
          id: hasilSkrining.id,
        })
        .from(hasilSkrining)
        .where(
          and(
            eq(hasilSkrining.sesiPosgaId, sesiId),

            eq(hasilSkrining.pesertaNik, pesertaNik),
          ),
        )
        .limit(1);

      // ------------------------------------------------------
      // PROTEKSI DATA KLINIS
      // ------------------------------------------------------

      if (
        pemeriksaan.length > 0 ||
        konseling.length > 0 ||
        skrining.length > 0
      ) {
        throw conflict(
          "Peserta sudah memiliki hasil klinis pada sesi ini dan tidak boleh dihapus dari daftar peserta sesi.",
        );
      }

      // ------------------------------------------------------
      // DELETE ROSTER
      // ------------------------------------------------------

      await db
        .delete(pesertaSesiPosga)
        .where(eq(pesertaSesiPosga.id, roster.id));

      const auditContext =
        ambilAuditContext(
          req,
          res,
        );

      await catatAudit({
        ...auditContext,

        aksi:
          "HAPUS_PESERTA",

        entitas:
          "peserta_sesi_posga",

        entitasId:
          roster.id,

        dataSebelum:
          roster,

        dataSesudah: {
          berhasil:
            true,

          pesertaSesiId:
            roster.id,

          pesertaNik,

          sesiPosgaId:
            sesiId,
        },
      });

      res.json({
        success: true,

        data: {
          pesertaSesiId: roster.id,

          pesertaNik,

          sesiPosgaId: sesiId,

          berhasil: true,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);







