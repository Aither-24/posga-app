import {
  z,
} from "zod";

import {
  nikSchema,
  nullableTextSchema,
} from "./common.schemas.js";

// ============================================================
// PARAM NIK
// ============================================================

export const pesertaNikParamsSchema =
  z.object({
    nik:
      nikSchema,
  });

// ============================================================
// BIODATA ANAK
// ============================================================

export const biodataAnakBodySchema =
  z
    .object({
      namaIbuKandung:
        nullableTextSchema,

      nikIbuKandung:
        nikSchema
          .nullable()
          .optional(),

      anakKe:
        z
          .number()
          .int()
          .positive(
            "Anak ke harus berupa bilangan bulat lebih dari 0.",
          )
          .nullable()
          .optional(),

      imd:
        z
          .boolean()
          .nullable()
          .optional(),

      bblGram:
        z
          .number()
          .min(
            300,
            "Berat badan lahir terlalu kecil untuk rentang input aplikasi.",
          )
          .max(
            7000,
            "Berat badan lahir terlalu besar untuk rentang input aplikasi.",
          )
          .nullable()
          .optional(),

      pblCm:
        z
          .number()
          .min(
            25,
            "Panjang badan lahir terlalu kecil untuk rentang input aplikasi.",
          )
          .max(
            70,
            "Panjang badan lahir terlalu besar untuk rentang input aplikasi.",
          )
          .nullable()
          .optional(),
    })
    .strict();

// ============================================================
// BIODATA DEWASA
// ============================================================

export const biodataDewasaBodySchema =
  z
    .object({
      namaPasangan:
        nullableTextSchema,

      nikPasangan:
        nikSchema
          .nullable()
          .optional(),

      jumlahAnak:
        z
          .number()
          .int()
          .min(
            0,
            "Jumlah anak harus berupa bilangan bulat minimal 0.",
          )
          .nullable()
          .optional(),

      kbYangDiikuti:
        nullableTextSchema,

      alasanTidakBerKb:
        nullableTextSchema,

      rpdHt:
        z
          .boolean()
          .nullable()
          .optional(),

      rpdDm:
        z
          .boolean()
          .nullable()
          .optional(),
    })
    .strict();