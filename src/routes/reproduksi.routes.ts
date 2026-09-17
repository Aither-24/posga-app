import { Router } from "express";

import {
  notFound,
} from "../lib/api-error.js";

import {
  catatAudit,
} from "../lib/audit.service.js";

import {
  ambilAuditContext,
} from "../lib/audit-context.js";

import {
  ambilDetailEpisodeNifas,
  ambilEpisodeKehamilanById,
  ambilEpisodeNifasById,
  ambilKomplikasiPersalinanById,
  ambilReproduksiPeserta,
  ambilTindakanPersalinanById,
  batalkanEpisodeKehamilan,
  batalkanEpisodeNifas,
  hapusKomplikasiPersalinan,
  hapusTindakanPersalinan,
  selesaikanEpisodeKehamilan,
  selesaikanEpisodeNifas,
  tambahEpisodeKehamilan,
  tambahEpisodeNifas,
  tambahKomplikasiPersalinan,
  tambahTindakanPersalinan,
  updateEpisodeKehamilan,
  updateEpisodeNifas,
  updateKomplikasiPersalinan,
  updateTindakanPersalinan,
} from "../lib/reproduksi.service.js";

import {
  validateBody,
  validateParams,
} from "../middleware/validate.js";

import {
  batalEpisodeSchema,
  idParamsSchema,
  nikParamsSchema,
  selesaiEpisodeSchema,
  tambahItemPersalinanSchema,
  tambahKehamilanSchema,
  tambahNifasSchema,
  updateItemPersalinanSchema,
  updateKehamilanSchema,
  updateNifasSchema,
} from "../validation/reproduksi.schemas.js";

export const reproduksiRouter =
  Router();

// ============================================================
// GET RINGKASAN REPRODUKSI
// ============================================================

reproduksiRouter.get(
  "/peserta/:nik/reproduksi",

  validateParams(
    nikParamsSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const data =
        await ambilReproduksiPeserta(
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
// CREATE KEHAMILAN
// ============================================================

reproduksiRouter.post(
  "/peserta/:nik/kehamilan",

  validateParams(
    nikParamsSchema,
  ),

  validateBody(
    tambahKehamilanSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const data =
        await tambahEpisodeKehamilan(
          String(
            req.params.nik,
          ),
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
          "episode_kehamilan",

        entitasId:
          data.id,

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
// GET KEHAMILAN
// ============================================================

reproduksiRouter.get(
  "/kehamilan/:id",

  validateParams(
    idParamsSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const data =
        await ambilEpisodeKehamilanById(
          Number(
            req.params.id,
          ),
        );

      if (!data) {
        throw notFound(
          "Episode kehamilan tidak ditemukan.",
        );
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
// UPDATE KEHAMILAN
// ============================================================

reproduksiRouter.put(
  "/kehamilan/:id",

  validateParams(
    idParamsSchema,
  ),

  validateBody(
    updateKehamilanSchema,
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
        await ambilEpisodeKehamilanById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Episode kehamilan tidak ditemukan.",
        );
      }

      const data =
        await updateEpisodeKehamilan(
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
          "episode_kehamilan",

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
// SELESAIKAN KEHAMILAN
// ============================================================

reproduksiRouter.post(
  "/kehamilan/:id/selesai",

  validateParams(
    idParamsSchema,
  ),

  validateBody(
    selesaiEpisodeSchema,
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
        await ambilEpisodeKehamilanById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Episode kehamilan tidak ditemukan.",
        );
      }

      const data =
        await selesaikanEpisodeKehamilan(
          id,
          req.body.tanggalSelesai,
        );

      if (!data) {
        throw new Error(
          "Episode kehamilan gagal dibaca setelah diselesaikan.",
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
          "SELESAI",

        entitas:
          "episode_kehamilan",

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
// BATALKAN KEHAMILAN
// ============================================================

reproduksiRouter.post(
  "/kehamilan/:id/batal",

  validateParams(
    idParamsSchema,
  ),

  validateBody(
    batalEpisodeSchema,
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
        await ambilEpisodeKehamilanById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Episode kehamilan tidak ditemukan.",
        );
      }

      const data =
        await batalkanEpisodeKehamilan(
          id,
          req.body.tanggalSelesai ??
            null,
        );

      if (!data) {
        throw new Error(
          "Episode kehamilan gagal dibaca setelah dibatalkan.",
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
          "BATAL",

        entitas:
          "episode_kehamilan",

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
// CREATE NIFAS
// ============================================================

reproduksiRouter.post(
  "/peserta/:nik/nifas",

  validateParams(
    nikParamsSchema,
  ),

  validateBody(
    tambahNifasSchema,
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

      const kehamilanId =
        req.body
          .episodeKehamilanId as
          | number
          | undefined;

      const kehamilanSebelum =
        kehamilanId !==
        undefined
          ? await ambilEpisodeKehamilanById(
              kehamilanId,
            )
          : null;

      const data =
        await tambahEpisodeNifas(
          pesertaNik,
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
          "episode_nifas",

        entitasId:
          data.id,

        dataSesudah:
          data,
      });

      // Pembuatan nifas dapat menutup episode
      // kehamilan secara otomatis.
      if (
        kehamilanSebelum &&
        data.episodeKehamilanId
      ) {
        const kehamilanSesudah =
          await ambilEpisodeKehamilanById(
            data.episodeKehamilanId,
          );

        if (
          kehamilanSesudah &&
          (
            kehamilanSebelum.status !==
              kehamilanSesudah.status ||
            kehamilanSebelum
              .tanggalSelesai !==
              kehamilanSesudah
                .tanggalSelesai
          )
        ) {
          await catatAudit({
            ...auditContext,

            aksi:
              "SELESAI_OTOMATIS",

            entitas:
              "episode_kehamilan",

            entitasId:
              kehamilanSesudah.id,

            dataSebelum:
              kehamilanSebelum,

            dataSesudah:
              kehamilanSesudah,
          });
        }
      }

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
// GET NIFAS
// ============================================================

reproduksiRouter.get(
  "/nifas/:id",

  validateParams(
    idParamsSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const data =
        await ambilDetailEpisodeNifas(
          Number(
            req.params.id,
          ),
        );

      if (!data) {
        throw notFound(
          "Episode nifas tidak ditemukan.",
        );
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
// UPDATE NIFAS
// ============================================================

reproduksiRouter.put(
  "/nifas/:id",

  validateParams(
    idParamsSchema,
  ),

  validateBody(
    updateNifasSchema,
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
        await ambilEpisodeNifasById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Episode nifas tidak ditemukan.",
        );
      }

      const data =
        await updateEpisodeNifas(
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
          "episode_nifas",

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
// SELESAIKAN NIFAS
// ============================================================

reproduksiRouter.post(
  "/nifas/:id/selesai",

  validateParams(
    idParamsSchema,
  ),

  validateBody(
    selesaiEpisodeSchema,
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
        await ambilEpisodeNifasById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Episode nifas tidak ditemukan.",
        );
      }

      const data =
        await selesaikanEpisodeNifas(
          id,
          req.body.tanggalSelesai,
        );

      if (!data) {
        throw new Error(
          "Episode nifas gagal dibaca setelah diselesaikan.",
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
          "SELESAI",

        entitas:
          "episode_nifas",

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
// BATALKAN NIFAS
// ============================================================

reproduksiRouter.post(
  "/nifas/:id/batal",

  validateParams(
    idParamsSchema,
  ),

  validateBody(
    batalEpisodeSchema,
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
        await ambilEpisodeNifasById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Episode nifas tidak ditemukan.",
        );
      }

      const data =
        await batalkanEpisodeNifas(
          id,
          req.body.tanggalSelesai ??
            null,
        );

      if (!data) {
        throw new Error(
          "Episode nifas gagal dibaca setelah dibatalkan.",
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
          "BATAL",

        entitas:
          "episode_nifas",

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
// CREATE TINDAKAN PERSALINAN
// ============================================================

reproduksiRouter.post(
  "/nifas/:id/tindakan",

  validateParams(
    idParamsSchema,
  ),

  validateBody(
    tambahItemPersalinanSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const data =
        await tambahTindakanPersalinan(
          Number(
            req.params.id,
          ),
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
          "tindakan_persalinan",

        entitasId:
          data.id,

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
// UPDATE TINDAKAN PERSALINAN
// ============================================================

reproduksiRouter.put(
  "/tindakan-persalinan/:id",

  validateParams(
    idParamsSchema,
  ),

  validateBody(
    updateItemPersalinanSchema,
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
        await ambilTindakanPersalinanById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Tindakan persalinan tidak ditemukan.",
        );
      }

      const data =
        await updateTindakanPersalinan(
          id,
          req.body,
        );

      if (!data) {
        throw new Error(
          "Tindakan persalinan gagal dibaca setelah update.",
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
          "UPDATE",

        entitas:
          "tindakan_persalinan",

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
// DELETE TINDAKAN PERSALINAN
// ============================================================

reproduksiRouter.delete(
  "/tindakan-persalinan/:id",

  validateParams(
    idParamsSchema,
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
        await ambilTindakanPersalinanById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Tindakan persalinan tidak ditemukan.",
        );
      }

      const data =
        await hapusTindakanPersalinan(
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
          "DELETE",

        entitas:
          "tindakan_persalinan",

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
// CREATE KOMPLIKASI PERSALINAN
// ============================================================

reproduksiRouter.post(
  "/nifas/:id/komplikasi",

  validateParams(
    idParamsSchema,
  ),

  validateBody(
    tambahItemPersalinanSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const data =
        await tambahKomplikasiPersalinan(
          Number(
            req.params.id,
          ),
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
          "komplikasi_persalinan",

        entitasId:
          data.id,

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
// UPDATE KOMPLIKASI PERSALINAN
// ============================================================

reproduksiRouter.put(
  "/komplikasi-persalinan/:id",

  validateParams(
    idParamsSchema,
  ),

  validateBody(
    updateItemPersalinanSchema,
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
        await ambilKomplikasiPersalinanById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Komplikasi persalinan tidak ditemukan.",
        );
      }

      const data =
        await updateKomplikasiPersalinan(
          id,
          req.body,
        );

      if (!data) {
        throw new Error(
          "Komplikasi persalinan gagal dibaca setelah update.",
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
          "UPDATE",

        entitas:
          "komplikasi_persalinan",

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
// DELETE KOMPLIKASI PERSALINAN
// ============================================================

reproduksiRouter.delete(
  "/komplikasi-persalinan/:id",

  validateParams(
    idParamsSchema,
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
        await ambilKomplikasiPersalinanById(
          id,
        );

      if (!dataSebelum) {
        throw notFound(
          "Komplikasi persalinan tidak ditemukan.",
        );
      }

      const data =
        await hapusKomplikasiPersalinan(
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
          "DELETE",

        entitas:
          "komplikasi_persalinan",

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
