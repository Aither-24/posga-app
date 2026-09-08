import { z } from "zod";

import { idPositifSchema, nikSchema, tanggalSchema } from "./common.schemas.js";

// ============================================================
// HELPER
// ============================================================

const namaWajibSchema = z.string().trim().min(1, "Nama wajib diisi.");

const textOpsionalSchema = z.string().trim().optional();

const textNullableSchema = z.string().trim().nullable().optional();

// ============================================================
// PARAM
// ============================================================

export const idParamsSchema = z.object({
  id: idPositifSchema,
});

export const lokasiIdParamsSchema = z.object({
  lokasiId: idPositifSchema,
});

export const nikParamsSchema = z.object({
  nik: nikSchema,
});

// ============================================================
// LOKASI
// ============================================================

export const tambahLokasiSchema = z
  .object({
    nama: namaWajibSchema,

    alamat: textOpsionalSchema,

    aktif: z.boolean().optional(),
  })
  .strict();

export const updateLokasiSchema = z
  .object({
    nama: namaWajibSchema.optional(),

    alamat: textNullableSchema,

    aktif: z.boolean().optional(),
  })
  .strict();

// ============================================================
// POSYANDU
// ============================================================

export const tambahPosyanduSchema = z
  .object({
    lokasiId: idPositifSchema,

    nama: namaWajibSchema,

    alamat: textOpsionalSchema,

    aktif: z.boolean().optional(),
  })
  .strict();

export const updatePosyanduSchema = z
  .object({
    nama: namaWajibSchema.optional(),

    alamat: textNullableSchema,

    aktif: z.boolean().optional(),
  })
  .strict();

// ============================================================
// PESERTA
// ============================================================

export const tambahPesertaSchema = z
  .object({
    nik: nikSchema,

    nama: namaWajibSchema,

    noRm: textOpsionalSchema,

    noTelp: textOpsionalSchema,

    tanggalLahir: tanggalSchema,

    jenisKelamin: z.enum(["L", "P"]),

    alamatKtp: textOpsionalSchema,

    rtKtp: textOpsionalSchema,

    rwKtp: textOpsionalSchema,

    alamatDomisili: textOpsionalSchema,

    rtDomisili: textOpsionalSchema,

    rwDomisili: textOpsionalSchema,

  })
  .strict();

export const updatePesertaSchema = z
  .object({
    nama: namaWajibSchema.optional(),

    noRm: textNullableSchema,

    noTelp: textNullableSchema,

    tanggalLahir: tanggalSchema.optional(),

    jenisKelamin: z.enum(["L", "P"]).optional(),

    alamatKtp: textNullableSchema,

    rtKtp: textNullableSchema,

    rwKtp: textNullableSchema,

    alamatDomisili: textNullableSchema,

    rtDomisili: textNullableSchema,

    rwDomisili: textNullableSchema,

  })
  .strict();

// ============================================================
// KEANGGOTAAN POSYANDU
// ============================================================

export const tambahPesertaPosyanduSchema = z
  .object({
    pesertaNik: nikSchema,

    posyanduId: idPositifSchema,

    tanggalMulai: tanggalSchema,
  })
  .strict();
