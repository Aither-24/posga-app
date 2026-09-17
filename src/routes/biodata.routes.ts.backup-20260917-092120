import { Router } from "express";

import {
  ambilBiodataPeserta,
  hapusBiodataAnak,
  hapusBiodataDewasa,
  simpanBiodataAnak,
  simpanBiodataDewasa,
} from "../lib/biodata.service.js";

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

biodataRouter.get(
  "/peserta/:nik/biodata",
  validateParams(pesertaNikParamsSchema),
  async (req, res, next) => {
    try {
      const data = await ambilBiodataPeserta(String(req.params.nik));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

biodataRouter.put(
  "/peserta/:nik/biodata-anak",
  validateParams(pesertaNikParamsSchema),
  validateBody(biodataAnakBodySchema),
  async (req, res, next) => {
    try {
      const data = await simpanBiodataAnak(String(req.params.nik), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

biodataRouter.delete(
  "/peserta/:nik/biodata-anak",
  validateParams(pesertaNikParamsSchema),
  async (req, res, next) => {
    try {
      const data = await hapusBiodataAnak(String(req.params.nik));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

biodataRouter.put(
  "/peserta/:nik/biodata-dewasa",
  validateParams(pesertaNikParamsSchema),
  validateBody(biodataDewasaBodySchema),
  async (req, res, next) => {
    try {
      const data = await simpanBiodataDewasa(String(req.params.nik), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

biodataRouter.delete(
  "/peserta/:nik/biodata-dewasa",
  validateParams(pesertaNikParamsSchema),
  async (req, res, next) => {
    try {
      const data = await hapusBiodataDewasa(String(req.params.nik));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);
