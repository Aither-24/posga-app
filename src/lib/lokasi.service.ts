import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { lokasi } from "../db/schema.js";

export interface TambahLokasiInput {
  nama: string;
  alamat?: string;
  aktif?: boolean;
}

export interface UpdateLokasiInput {
  nama?: string;
  alamat?: string | null;
  aktif?: boolean;
}

export async function tambahLokasi(input: TambahLokasiInput) {
  const hasil = await db
    .insert(lokasi)
    .values({
      nama: input.nama,
      alamat: input.alamat,
      aktif: input.aktif ?? true,
    })
    .returning();

  return hasil[0] ?? null;
}

export async function ambilSemuaLokasi() {
  return db.select().from(lokasi);
}

export async function ambilLokasiById(id: number) {
  const hasil = await db
    .select()
    .from(lokasi)
    .where(eq(lokasi.id, id))
    .limit(1);

  return hasil[0] ?? null;
}

export async function updateLokasi(id: number, input: UpdateLokasiInput) {
  const existing = await ambilLokasiById(id);

  if (!existing) {
    throw new Error("Lokasi tidak ditemukan.");
  }

  const hasil = await db
    .update(lokasi)
    .set({
      ...input,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(lokasi.id, id))
    .returning();

  return hasil[0] ?? null;
}

export async function nonaktifkanLokasi(id: number) {
  return updateLokasi(id, {
    aktif: false,
  });
}
