import { z } from "zod";

import {
  nikSchema,
  tanggalSchema,
} from "./common.schemas.js";

const textWajibSchema = z
  .string()
  .trim()
  .min(
    1,
    "Field wajib tidak boleh kosong.",
  );

const textOpsionalSchema = z
  .string()
  .trim()
  .nullable()
  .optional();

const booleanQuerySchema = z
  .enum(["true", "false"])
  .transform(
    (nilai) =>
      nilai === "true",
  );

export const pesertaTerkelolaQuerySchema =
  z
    .object({
      q: z
        .string()
        .trim()
        .max(100)
        .optional(),

      aktif:
        booleanQuerySchema.optional(),

      jenisKelamin:
        z
          .enum(["L", "P"])
          .optional(),

      lokasiId:
        z.coerce
          .number()
          .int()
          .positive()
          .optional(),

      posyanduId:
        z.coerce
          .number()
          .int()
          .positive()
          .optional(),

      page:
        z.coerce
          .number()
          .int()
          .positive()
          .default(1),

      limit:
        z.coerce
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20),
    })
    .strict();

export type PesertaTerkelolaQuery =
  z.infer<
    typeof pesertaTerkelolaQuerySchema
  >;

export const tambahPesertaTerkelolaSchema =
  z
    .object({
      nik: nikSchema,
      nama:
        z
          .string()
          .trim()
          .min(1),
      noRm:
        textOpsionalSchema,
      noTelp:
        textOpsionalSchema,
      tanggalLahir:
        tanggalSchema,
      jenisKelamin:
        z.enum(["L", "P"]),
      alamatKtp:
        textOpsionalSchema,
      rtKtp:
        textOpsionalSchema,
      rwKtp:
        textOpsionalSchema,
      alamatDomisili:
        textWajibSchema,
      rtDomisili:
        textWajibSchema,
      rwDomisili:
        textWajibSchema,
      posyanduId:
        z.coerce
          .number()
          .int()
          .positive(),

      tanggalMulai:
        tanggalSchema,
    })
    .strict();

export const pindahPesertaTerkelolaSchema =
  z
    .object({
      posyanduBaruId:
        z.coerce
          .number()
          .int()
          .positive(),

      tanggalPindah:
        tanggalSchema,
    })
    .strict();
