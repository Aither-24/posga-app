import {
  z,
} from "zod";

import {
  idPositifSchema,
  jamSchema,
  nikSchema,
  nullableTextSchema,
  tanggalSchema,
} from "./common.schemas.js";

// ============================================================
// PARAMS
// ============================================================

export const nikParamsSchema =
  z.object({
    nik:
      nikSchema,
  });

export const idParamsSchema =
  z.object({
    id:
      idPositifSchema,
  });

// ============================================================
// KEHAMILAN CREATE
// ============================================================

export const tambahKehamilanSchema =
  z
    .object({
      tanggalMulai:
        tanggalSchema,

      bbSebelumHamilKg:
        z
          .number()
          .min(20)
          .max(300)
          .nullable()
          .optional(),

      tbCm:
        z
          .number()
          .min(100)
          .max(250)
          .nullable()
          .optional(),

      hpht:
        tanggalSchema
          .nullable()
          .optional(),

      hpl:
        tanggalSchema
          .nullable()
          .optional(),

      lilaAwalCm:
        z
          .number()
          .min(10)
          .max(60)
          .nullable()
          .optional(),

      catatan:
        nullableTextSchema,
    })
    .strict();

// ============================================================
// KEHAMILAN UPDATE
// ============================================================

export const updateKehamilanSchema =
  z
    .object({
      tanggalMulai:
        tanggalSchema
          .optional(),

      tanggalSelesai:
        tanggalSchema
          .nullable()
          .optional(),

      bbSebelumHamilKg:
        z
          .number()
          .min(20)
          .max(300)
          .nullable()
          .optional(),

      tbCm:
        z
          .number()
          .min(100)
          .max(250)
          .nullable()
          .optional(),

      hpht:
        tanggalSchema
          .nullable()
          .optional(),

      hpl:
        tanggalSchema
          .nullable()
          .optional(),

      lilaAwalCm:
        z
          .number()
          .min(10)
          .max(60)
          .nullable()
          .optional(),

      catatan:
        nullableTextSchema,
    })
    .strict();

// ============================================================
// SELESAI / BATAL
// ============================================================

export const selesaiEpisodeSchema =
  z
    .object({
      tanggalSelesai:
        tanggalSchema,
    })
    .strict();

export const batalEpisodeSchema =
  z
    .object({
      tanggalSelesai:
        tanggalSchema
          .nullable()
          .optional(),
    })
    .strict();

// ============================================================
// NIFAS CREATE
// ============================================================

export const tambahNifasSchema =
  z
    .object({
      episodeKehamilanId:
        idPositifSchema
          .nullable()
          .optional(),

      tanggalMulai:
        tanggalSchema,

      tanggalMelahirkan:
        tanggalSchema
          .nullable()
          .optional(),

      jamBersalin:
        jamSchema
          .nullable()
          .optional(),

      caraPersalinan:
        z
          .enum([
            "pervaginam",
            "sesar",
          ])
          .nullable()
          .optional(),

      vitaminA:
        z
          .boolean()
          .nullable()
          .optional(),

      asiEksklusif:
        z
          .boolean()
          .nullable()
          .optional(),

      catatan:
        nullableTextSchema,
    })
    .strict();

// ============================================================
// NIFAS UPDATE
// ============================================================

export const updateNifasSchema =
  z
    .object({
      episodeKehamilanId:
        idPositifSchema
          .nullable()
          .optional(),

      tanggalMulai:
        tanggalSchema
          .optional(),

      tanggalSelesai:
        tanggalSchema
          .nullable()
          .optional(),

      tanggalMelahirkan:
        tanggalSchema
          .nullable()
          .optional(),

      jamBersalin:
        jamSchema
          .nullable()
          .optional(),

      caraPersalinan:
        z
          .enum([
            "pervaginam",
            "sesar",
          ])
          .nullable()
          .optional(),

      vitaminA:
        z
          .boolean()
          .nullable()
          .optional(),

      asiEksklusif:
        z
          .boolean()
          .nullable()
          .optional(),

      catatan:
        nullableTextSchema,
    })
    .strict();

// ============================================================
// TINDAKAN / KOMPLIKASI
// ============================================================

export const tambahItemPersalinanSchema =
  z
    .object({
      kode:
        z
          .string()
          .trim()
          .min(
            1,
            "Kode wajib diisi.",
          ),

      label:
        z
          .string()
          .trim()
          .min(
            1,
            "Label wajib diisi.",
          ),

      catatan:
        nullableTextSchema,
    })
    .strict();

export const updateItemPersalinanSchema =
  z
    .object({
      kode:
        z
          .string()
          .trim()
          .min(
            1,
            "Kode wajib diisi.",
          )
          .optional(),

      label:
        z
          .string()
          .trim()
          .min(
            1,
            "Label wajib diisi.",
          )
          .optional(),

      catatan:
        nullableTextSchema,
    })
    .strict();