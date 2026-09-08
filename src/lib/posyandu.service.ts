import { conflict } from "./api-error.js";

import { eq, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { lokasi, posyandu } from "../db/schema.js";

export interface TambahPosyanduInput {
  lokasiId: number;
  nama: string;
  alamat?: string;
  aktif?: boolean;
}

export interface UpdatePosyanduInput {
  nama?: string;
  alamat?: string | null;
  aktif?: boolean;
}

export async function ambilPosyanduById(id: number) {
  const hasil = await db
    .select()
    .from(posyandu)
    .where(eq(posyandu.id, id))
    .limit(1);

  return hasil[0] ?? null;
}

export async function ambilPosyanduByLokasi(lokasiId: number) {
  return db.select().from(posyandu).where(eq(posyandu.lokasiId, lokasiId));
}

export async function tambahPosyandu(input: TambahPosyanduInput) {
  const lokasiAda = await db
    .select()
    .from(lokasi)
    .where(eq(lokasi.id, input.lokasiId))
    .limit(1);

  if (!lokasiAda[0]) {
    throw new Error("Lokasi tidak ditemukan.");
  }

  const hasil = await db
    .insert(posyandu)
    .values({
      lokasiId: input.lokasiId,
      nama: input.nama,
      alamat: input.alamat,
      aktif: input.aktif ?? true,
    })
    .returning();

  return hasil[0] ?? null;
}

export async function updatePosyandu(id: number, input: UpdatePosyanduInput) {
  const existing = await ambilPosyanduById(id);

  if (!existing) {
    throw new Error("Posyandu tidak ditemukan.");
  }

  const hasil = await db
    .update(posyandu)
    .set({
      ...input,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(posyandu.id, id))
    .returning();

  return hasil[0] ?? null;
}

export async function nonaktifkanPosyandu(id: number) {
  return updatePosyandu(id, {
    aktif: false,
  });
}

// ============================================================
// HAPUS POSYANDU PERMANEN
//
// Hanya berhasil bila Posyandu belum direferensikan oleh tabel
// lain. Foreign key SQLite memakai ON DELETE RESTRICT, sehingga
// database tetap menjadi penjaga integritas terakhir.
// ============================================================

export async function hapusPosyanduPermanen(id: number) {
  const existing = await ambilPosyanduById(id);

  if (!existing) {
    throw new Error("Posyandu tidak ditemukan.");
  }

  try {
    const hasil = await db
      .delete(posyandu)
      .where(eq(posyandu.id, id))
      .returning();

    const data = hasil[0];

    if (!data) {
      throw new Error("Gagal menghapus Posyandu.");
    }

    return data;
  } catch (error) {
    if (
      error instanceof Error &&
      /FOREIGN KEY constraint failed/i.test(error.message)
    ) {
      throw conflict(
        "Posyandu tidak dapat dihapus karena sudah memiliki peserta atau sesi POSGA. Gunakan Nonaktifkan agar riwayat tetap aman.",
      );
    }

    throw error;
  }
}

