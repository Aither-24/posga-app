import { z } from "zod";

// ============================================================
// HELPER BOOLEAN QUERY
//
// URL:
// ?aktif=true
// ?aktif=false
//
// Query string dari Express selalu berasal dari string.
// ============================================================

const booleanQuerySchema = z
  .enum(["true", "false"])
  .transform((nilai) => nilai === "true");

// ============================================================
// QUERY PESERTA
// ============================================================

export const pesertaQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100, "Pencarian maksimal 100 karakter.")
      .optional(),

    aktif: booleanQuerySchema.optional(),

    jenisKelamin: z.enum(["L", "P"]).optional(),

    page: z.coerce
      .number()
      .int("Page harus berupa bilangan bulat.")
      .positive("Page minimal 1.")
      .default(1),

    limit: z.coerce
      .number()
      .int("Limit harus berupa bilangan bulat.")
      .min(1, "Limit minimal 1.")
      .max(100, "Limit maksimal 100.")
      .default(20),
  })
  .strict();

export type PesertaQuery = z.infer<typeof pesertaQuerySchema>;
