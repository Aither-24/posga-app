import {
  z,
} from "zod";

import {
  idPositifSchema,
  nikSchema,
  tanggalSchema,
} from "./common.schemas.js";

// ============================================================
// HELPER
// ============================================================

const nullableTextSchema =
  z
    .string()
    .trim()
    .nullable()
    .optional();

const nullableIdSchema =
  idPositifSchema
    .nullable()
    .optional();

const nullableNumberSchema =
  z
    .number()
    .finite()
    .nullable()
    .optional();

const nullableBooleanSchema =
  z
    .boolean()
    .nullable()
    .optional();

const opsiIdsSchema =
  z
    .array(
      idPositifSchema,
    )
    .nullable()
    .optional();

// ============================================================
// PARAM ID
// ============================================================

export const klinisIdParamsSchema =
  z.object({
    id:
      idPositifSchema,
  });

// ============================================================
// PEMERIKSAAN CREATE
// ============================================================

export const tambahPemeriksaanSchema =
  z
    .object({
      pesertaSesiPosgaId:
        idPositifSchema,

      indikatorId:
        idPositifSchema,

      opsiId:
        nullableIdSchema,

      opsiIds:
        opsiIdsSchema,

      nilaiNumber:
        nullableNumberSchema,

      nilaiText:
        nullableTextSchema,

      nilaiBoolean:
        nullableBooleanSchema,

      nilaiDate:
        tanggalSchema
          .nullable()
          .optional(),

      catatan:
        nullableTextSchema,
    })
    .strict();

// ============================================================
// PEMERIKSAAN UPDATE
// ============================================================

export const updatePemeriksaanSchema =
  z
    .object({
      opsiId:
        nullableIdSchema,

      opsiIds:
        opsiIdsSchema,

      nilaiNumber:
        nullableNumberSchema,

      nilaiText:
        nullableTextSchema,

      nilaiBoolean:
        nullableBooleanSchema,

      nilaiDate:
        tanggalSchema
          .nullable()
          .optional(),

      catatan:
        nullableTextSchema,
    })
    .strict();

// ============================================================
// SKRINING CREATE
// ============================================================

export const tambahSkriningSchema =
  z
    .object({
      pesertaNik:
        nikSchema,

      indikatorId:
        idPositifSchema,

      sesiPosgaId:
        nullableIdSchema,

      tanggalSkrining:
        tanggalSchema,

      sumber:
        z.enum([
          "posga",
          "eksternal",
        ]),

      namaFasilitas:
        nullableTextSchema,

      opsiId:
        nullableIdSchema,

      nilaiNumber:
        nullableNumberSchema,

      nilaiText:
        nullableTextSchema,

      nilaiBoolean:
        nullableBooleanSchema,

      catatan:
        nullableTextSchema,
    })
    .strict();

// ============================================================
// SKRINING UPDATE
// ============================================================

export const updateSkriningSchema =
  z
    .object({
      tanggalSkrining:
        tanggalSchema
          .optional(),

      sumber:
        z
          .enum([
            "posga",
            "eksternal",
          ])
          .optional(),

      sesiPosgaId:
        nullableIdSchema,

      namaFasilitas:
        nullableTextSchema,

      opsiId:
        nullableIdSchema,

      nilaiNumber:
        nullableNumberSchema,

      nilaiText:
        nullableTextSchema,

      nilaiBoolean:
        nullableBooleanSchema,

      catatan:
        nullableTextSchema,
    })
    .strict();

// ============================================================
// KONSELING CREATE
// ============================================================

export const tambahKonselingSchema =
  z
    .object({
      pesertaSesiPosgaId:
        idPositifSchema,

      indikatorId:
        idPositifSchema,

      opsiId:
        nullableIdSchema,

      opsiIds:
        opsiIdsSchema,

      catatan:
        nullableTextSchema,
    })
    .strict();

// ============================================================
// KONSELING UPDATE
// ============================================================

export const updateKonselingSchema =
  z
    .object({
      opsiId:
        nullableIdSchema,

      opsiIds:
        opsiIdsSchema,

      catatan:
        nullableTextSchema,
    })
    .strict();