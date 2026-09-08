import {
  z,
} from "zod";

// ============================================================
// LOGIN
// ============================================================

export const loginSchema =
  z
    .object({
      username:
        z
          .string()
          .trim()
          .min(
            1,
            "Username wajib diisi.",
          )
          .max(
            100,
          ),

      password:
        z
          .string()
          .min(
            1,
            "Password wajib diisi.",
          )
          .max(
            200,
          ),
    })
    .strict();

// ============================================================
// CREATE USER
// ============================================================

export const tambahUserSchema =
  z
    .object({
      username:
        z
          .string()
          .trim()
          .min(
            3,
            "Username minimal 3 karakter.",
          )
          .max(
            100,
          )
          .regex(
            /^[a-zA-Z0-9._-]+$/,
            "Username hanya boleh berisi huruf, angka, titik, underscore, dan tanda minus.",
          ),

      password:
        z
          .string()
          .min(
            8,
            "Password minimal 8 karakter.",
          )
          .max(
            200,
          ),

      nama:
        z
          .string()
          .trim()
          .min(
            1,
            "Nama wajib diisi.",
          )
          .max(
            150,
          ),

      role:
        z
          .enum([
            "admin",
            "petugas",
          ])
          .default(
            "petugas",
          ),

      aktif:
        z
          .boolean()
          .optional(),
    })
    .strict();

// ============================================================
// UPDATE USER
// ============================================================

export const updateUserSchema =
  z
    .object({
      nama:
        z
          .string()
          .trim()
          .min(1)
          .max(150)
          .optional(),

      role:
        z
          .enum([
            "admin",
            "petugas",
          ])
          .optional(),

      aktif:
        z
          .boolean()
          .optional(),

      password:
        z
          .string()
          .min(
            8,
            "Password minimal 8 karakter.",
          )
          .max(
            200,
          )
          .optional(),
    })
    .strict()
    .refine(
      (data) =>
        Object.keys(
          data,
        ).length > 0,
      {
        message:
          "Minimal satu field harus diperbarui.",
      },
    );

export const userIdParamsSchema =
  z.object({
    id:
      z.coerce
        .number()
        .int()
        .positive(),
  });