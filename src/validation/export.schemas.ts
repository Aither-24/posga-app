import {
  z,
} from "zod";

const tanggalIso =
  z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Tanggal harus menggunakan format YYYY-MM-DD.",
    );

export const exportPosgaQuerySchema =
  z
    .object({
      posyanduId:
        z.coerce
          .number()
          .int()
          .positive(),

      sesiId:
        z.coerce
          .number()
          .int()
          .positive()
          .optional(),

      tanggalMulai:
        tanggalIso
          .optional(),

      tanggalSelesai:
        tanggalIso
          .optional(),

      kategori:
        z
          .enum([
            "bayi",
            "balita",
            "prasekolah",
            "sekolah",
            "dewasa",
            "lansia",
            "ibu_hamil",
            "ibu_nifas",
          ])
          .optional(),
    })
    .superRefine(
      (
        value,
        ctx,
      ) => {
        if (
          value.tanggalMulai &&
          value.tanggalSelesai &&
          value.tanggalMulai >
            value.tanggalSelesai
        ) {
          ctx.addIssue({
            code:
              "custom",

            path: [
              "tanggalSelesai",
            ],

            message:
              "Tanggal selesai tidak boleh sebelum tanggal mulai.",
          });
        }
      },
    );

export type ExportPosgaQuery =
  z.infer<
    typeof exportPosgaQuerySchema
  >;
