import {
  z,
} from "zod";

import {
  idPositifSchema,
  nikSchema,
  tanggalSchema,
} from "./common.schemas.js";

// ============================================================
// PARAM
// ============================================================

export const sesiIdParamsSchema =
  z.object({
    id:
      idPositifSchema,
  });

export const posyanduIdParamsSchema =
  z.object({
    posyanduId:
      idPositifSchema,
  });

export const sesiPesertaParamsSchema =
  z.object({
    id:
      idPositifSchema,

    nik:
      nikSchema,
  });

// ============================================================
// CREATE SESI
// ============================================================

export const buatSesiSchema =
  z
    .object({
      posyanduId:
        idPositifSchema,

      tanggalPosga:
        tanggalSchema,

      catatan:
        z
          .string()
          .trim()
          .optional(),
    })
    .strict();

// ============================================================
// UPDATE SESI
// ============================================================

export const updateSesiSchema =
  z
    .object({
      tanggalPosga:
        tanggalSchema
          .optional(),

      catatan:
        z
          .string()
          .trim()
          .nullable()
          .optional(),
    })
    .strict();

// ============================================================
// TAMBAH PESERTA MANUAL
// ============================================================

export const tambahPesertaSesiSchema =
  z
    .object({
      pesertaNik:
        nikSchema,
    })
    .strict();