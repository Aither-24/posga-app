import {
  z,
} from "zod";

import {
  tanggalSchema,
} from "./common.schemas.js";

// ============================================================
// QUERY SEARCH SESI
// ============================================================

export const sesiQuerySchema =
  z
    .object({
      status:
        z
          .enum([
            "aktif",
            "selesai",
            "dibatalkan",
          ])
          .optional(),

      tanggalMulai:
        tanggalSchema
          .optional(),

      tanggalSelesai:
        tanggalSchema
          .optional(),

      page:
        z
          .coerce
          .number()
          .int(
            "Page harus berupa bilangan bulat.",
          )
          .positive(
            "Page minimal 1.",
          )
          .default(1),

      limit:
        z
          .coerce
          .number()
          .int(
            "Limit harus berupa bilangan bulat.",
          )
          .min(
            1,
            "Limit minimal 1.",
          )
          .max(
            100,
            "Limit maksimal 100.",
          )
          .default(20),
    })
    .strict()
    .superRefine(
      (
        data,
        ctx,
      ) => {
        if (
          data.tanggalMulai !==
            undefined &&
          data.tanggalSelesai !==
            undefined &&
          data.tanggalMulai >
            data.tanggalSelesai
        ) {
          ctx.addIssue({
            code:
              "custom",

            path: [
              "tanggalSelesai",
            ],

            message:
              "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.",
          });
        }
      },
    );

export type SesiQuery =
  z.infer<
    typeof sesiQuerySchema
  >;