import { Router } from "express";

import { notFound } from "../lib/api-error.js";

import {
  ambilDetailEpisodeNifas,
  ambilEpisodeKehamilanById,
  ambilReproduksiPeserta,
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

export const reproduksiRouter = Router();

reproduksiRouter.get(
  "/peserta/:nik/reproduksi",
  validateParams(nikParamsSchema),
  async (req, res, next) => {
    try {
      const data = await ambilReproduksiPeserta(String(req.params.nik));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.post(
  "/peserta/:nik/kehamilan",
  validateParams(nikParamsSchema),
  validateBody(tambahKehamilanSchema),
  async (req, res, next) => {
    try {
      const data = await tambahEpisodeKehamilan(String(req.params.nik), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.get(
  "/kehamilan/:id",
  validateParams(idParamsSchema),
  async (req, res, next) => {
    try {
      const data = await ambilEpisodeKehamilanById(Number(req.params.id));
      if (!data) throw notFound("Episode kehamilan tidak ditemukan.");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.put(
  "/kehamilan/:id",
  validateParams(idParamsSchema),
  validateBody(updateKehamilanSchema),
  async (req, res, next) => {
    try {
      const data = await updateEpisodeKehamilan(Number(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.post(
  "/kehamilan/:id/selesai",
  validateParams(idParamsSchema),
  validateBody(selesaiEpisodeSchema),
  async (req, res, next) => {
    try {
      const data = await selesaikanEpisodeKehamilan(
        Number(req.params.id),
        req.body.tanggalSelesai,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.post(
  "/kehamilan/:id/batal",
  validateParams(idParamsSchema),
  validateBody(batalEpisodeSchema),
  async (req, res, next) => {
    try {
      const data = await batalkanEpisodeKehamilan(
        Number(req.params.id),
        req.body.tanggalSelesai ?? null,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.post(
  "/peserta/:nik/nifas",
  validateParams(nikParamsSchema),
  validateBody(tambahNifasSchema),
  async (req, res, next) => {
    try {
      const data = await tambahEpisodeNifas(String(req.params.nik), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.get(
  "/nifas/:id",
  validateParams(idParamsSchema),
  async (req, res, next) => {
    try {
      const data = await ambilDetailEpisodeNifas(Number(req.params.id));
      if (!data) throw notFound("Episode nifas tidak ditemukan.");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.put(
  "/nifas/:id",
  validateParams(idParamsSchema),
  validateBody(updateNifasSchema),
  async (req, res, next) => {
    try {
      const data = await updateEpisodeNifas(Number(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.post(
  "/nifas/:id/selesai",
  validateParams(idParamsSchema),
  validateBody(selesaiEpisodeSchema),
  async (req, res, next) => {
    try {
      const data = await selesaikanEpisodeNifas(
        Number(req.params.id),
        req.body.tanggalSelesai,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.post(
  "/nifas/:id/batal",
  validateParams(idParamsSchema),
  validateBody(batalEpisodeSchema),
  async (req, res, next) => {
    try {
      const data = await batalkanEpisodeNifas(
        Number(req.params.id),
        req.body.tanggalSelesai ?? null,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.post(
  "/nifas/:id/tindakan",
  validateParams(idParamsSchema),
  validateBody(tambahItemPersalinanSchema),
  async (req, res, next) => {
    try {
      const data = await tambahTindakanPersalinan(Number(req.params.id), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.put(
  "/tindakan-persalinan/:id",
  validateParams(idParamsSchema),
  validateBody(updateItemPersalinanSchema),
  async (req, res, next) => {
    try {
      const data = await updateTindakanPersalinan(Number(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.delete(
  "/tindakan-persalinan/:id",
  validateParams(idParamsSchema),
  async (req, res, next) => {
    try {
      const data = await hapusTindakanPersalinan(Number(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.post(
  "/nifas/:id/komplikasi",
  validateParams(idParamsSchema),
  validateBody(tambahItemPersalinanSchema),
  async (req, res, next) => {
    try {
      const data = await tambahKomplikasiPersalinan(Number(req.params.id), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.put(
  "/komplikasi-persalinan/:id",
  validateParams(idParamsSchema),
  validateBody(updateItemPersalinanSchema),
  async (req, res, next) => {
    try {
      const data = await updateKomplikasiPersalinan(Number(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

reproduksiRouter.delete(
  "/komplikasi-persalinan/:id",
  validateParams(idParamsSchema),
  async (req, res, next) => {
    try {
      const data = await hapusKomplikasiPersalinan(Number(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);
