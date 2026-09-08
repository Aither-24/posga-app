import {
  z,
} from "zod";

// ============================================================
// NIK
// ============================================================

export const nikSchema =
  z
    .string()
    .regex(
      /^\d{16}$/,
      "NIK harus terdiri dari 16 digit.",
    );

// ============================================================
// ID POSITIF
// ============================================================

export const idPositifSchema =
  z.coerce
    .number()
    .int(
      "ID harus berupa bilangan bulat.",
    )
    .positive(
      "ID harus lebih dari 0.",
    );

// ============================================================
// TANGGAL YYYY-MM-DD
// ============================================================

export const tanggalSchema =
  z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Tanggal harus menggunakan format YYYY-MM-DD.",
    )
    .refine(
      (value) => {
        const [
          tahunText,
          bulanText,
          hariText,
        ] =
          value.split("-");

        const tahun =
          Number(tahunText);

        const bulan =
          Number(bulanText);

        const hari =
          Number(hariText);

        const tanggal =
          new Date(
            Date.UTC(
              tahun,
              bulan - 1,
              hari,
            ),
          );

        return (
          tanggal.getUTCFullYear() ===
            tahun &&
          tanggal.getUTCMonth() ===
            bulan - 1 &&
          tanggal.getUTCDate() ===
            hari
        );
      },
      "Tanggal tidak valid.",
    );

// ============================================================
// JAM HH:MM
// ============================================================

export const jamSchema =
  z
    .string()
    .regex(
      /^([01]\d|2[0-3]):[0-5]\d$/,
      "Jam harus menggunakan format HH:MM.",
    );

// ============================================================
// TEXT OPSIONAL
// ============================================================

export const nullableTextSchema =
  z
    .string()
    .trim()
    .nullable()
    .optional();