import { conflict } from "./api-error.js";

import { and, asc, count, eq, like, or, sql, type SQL } from "drizzle-orm";

import { db } from "../db/index.js";

import {
  episodeKehamilan,
  episodeNifas,
  peserta,
} from "../db/schema.js";

// ============================================================
// TYPE
// ============================================================

export interface TambahPesertaInput {
  nik: string;

  nama: string;

  noRm?: string;

  noTelp?: string;

  tanggalLahir: string;

  jenisKelamin: "L" | "P";

  alamatKtp?: string;

  rtKtp?: string;

  rwKtp?: string;

  alamatDomisili?: string;

  rtDomisili?: string;

  rwDomisili?: string;

  aktif?: boolean;
}

export interface UpdatePesertaInput {
  nama?: string;

  noRm?: string | null;

  noTelp?: string | null;

  tanggalLahir?: string;

  jenisKelamin?: "L" | "P";

  alamatKtp?: string | null;

  rtKtp?: string | null;

  rwKtp?: string | null;

  alamatDomisili?: string | null;

  rtDomisili?: string | null;

  rwDomisili?: string | null;

}

export interface CariPesertaInput {
  q?: string;

  aktif?: boolean;

  jenisKelamin?: "L" | "P";

  page: number;

  limit: number;
}

// ============================================================
// GET PESERTA BY NIK
// ============================================================

export async function ambilPesertaByNik(nik: string) {
  const hasil = await db
    .select()
    .from(peserta)
    .where(eq(peserta.nik, nik))
    .limit(1);

  return hasil[0] ?? null;
}

// ============================================================
// GET SEMUA PESERTA
//
// Tetap dipertahankan untuk kompatibilitas service internal.
// Endpoint HTTP akan menggunakan cariPeserta().
// ============================================================

export async function ambilSemuaPeserta() {
  return db.select().from(peserta).orderBy(asc(peserta.nama));
}

// ============================================================
// SEARCH + FILTER + PAGINATION
// ============================================================

export async function cariPeserta(input: CariPesertaInput) {
  const kondisi: SQL[] = [];

  // ----------------------------------------------------------
  // PENCARIAN
  //
  // SQLite LIKE default-nya case-insensitive untuk ASCII.
  // Pencarian mencakup:
  // - NIK
  // - nama
  // - nomor RM
  // - nomor telepon
  // ----------------------------------------------------------

  const kataKunci = input.q?.trim();

  if (kataKunci) {
    const pola = `%${kataKunci}%`;

    const pencarian = or(
      like(peserta.nik, pola),

      like(peserta.nama, pola),

      like(peserta.noRm, pola),

      like(peserta.noTelp, pola),
    );

    if (pencarian) {
      kondisi.push(pencarian);
    }
  }

  // ----------------------------------------------------------
  // STATUS AKTIF
  // ----------------------------------------------------------

  if (input.aktif !== undefined) {
    kondisi.push(eq(peserta.aktif, input.aktif));
  }

  // ----------------------------------------------------------
  // JENIS KELAMIN
  // ----------------------------------------------------------

  if (input.jenisKelamin !== undefined) {
    kondisi.push(eq(peserta.jenisKelamin, input.jenisKelamin));
  }

  const whereClause = kondisi.length > 0 ? and(...kondisi) : undefined;

  // ----------------------------------------------------------
  // TOTAL DATA
  // ----------------------------------------------------------

  const totalRows = whereClause
    ? await db
        .select({
          total: count(),
        })
        .from(peserta)
        .where(whereClause)
    : await db
        .select({
          total: count(),
        })
        .from(peserta);

  const total = Number(totalRows[0]?.total ?? 0);

  // ----------------------------------------------------------
  // PAGINATION
  // ----------------------------------------------------------

  const totalPages = total === 0 ? 0 : Math.ceil(total / input.limit);

  const offset = (input.page - 1) * input.limit;

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

  const items = whereClause
    ? await db
        .select()
        .from(peserta)
        .where(whereClause)
        .orderBy(asc(peserta.nama), asc(peserta.nik))
        .limit(input.limit)
        .offset(offset)
    : await db
        .select()
        .from(peserta)
        .orderBy(asc(peserta.nama), asc(peserta.nik))
        .limit(input.limit)
        .offset(offset);

  return {
    items,

    pagination: {
      page: input.page,

      limit: input.limit,

      total,

      totalPages,

      hasNext: input.page < totalPages,

      hasPrevious: input.page > 1 && totalPages > 0,
    },
  };
}

// ============================================================
// TAMBAH PESERTA
// ============================================================

export async function tambahPeserta(input: TambahPesertaInput) {
  const existing = await ambilPesertaByNik(input.nik);

  if (existing) {
    throw new Error("Peserta dengan NIK tersebut sudah terdaftar.");
  }

  const hasil = await db
    .insert(peserta)
    .values({
      nik: input.nik,

      nama: input.nama,

      noRm: input.noRm,

      noTelp: input.noTelp,

      tanggalLahir: input.tanggalLahir,

      jenisKelamin: input.jenisKelamin,

      alamatKtp: input.alamatKtp,

      rtKtp: input.rtKtp,

      rwKtp: input.rwKtp,

      alamatDomisili: input.alamatDomisili,

      rtDomisili: input.rtDomisili,

      rwDomisili: input.rwDomisili,

      aktif: input.aktif ?? true,
    })
    .returning();

  const data = hasil[0];

  if (!data) {
    throw new Error("Gagal menyimpan peserta.");
  }

  return data;
}

// ============================================================
// UPDATE PESERTA
// ============================================================

export async function updatePeserta(nik: string, input: UpdatePesertaInput) {
  const existing = await ambilPesertaByNik(nik);

  if (!existing) {
    throw new Error("Peserta tidak ditemukan.");
  }

  if (
    existing.jenisKelamin === "P" &&
    input.jenisKelamin === "L"
  ) {
    const [kehamilanRows, nifasRows] = await Promise.all([
      db
        .select({ id: episodeKehamilan.id })
        .from(episodeKehamilan)
        .where(eq(episodeKehamilan.pesertaNik, nik))
        .limit(1),
      db
        .select({ id: episodeNifas.id })
        .from(episodeNifas)
        .where(eq(episodeNifas.pesertaNik, nik))
        .limit(1),
    ]);

    if (kehamilanRows[0] || nifasRows[0]) {
      throw conflict(
        "Jenis kelamin tidak dapat diubah menjadi laki-laki karena peserta sudah memiliki riwayat kehamilan atau nifas.",
      );
    }
  }

  const hasil = await db
    .update(peserta)
    .set({
      ...input,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(peserta.nik, nik))
    .returning();

  const data = hasil[0];

  if (!data) {
    throw new Error("Peserta gagal diperbarui.");
  }

  return data;
}

// ============================================================
// NONAKTIFKAN PESERTA
// ============================================================

export async function nonaktifkanPeserta(nik: string) {
  const existing = await ambilPesertaByNik(nik);

  if (!existing) {
    throw new Error("Peserta tidak ditemukan.");
  }

  const hasil = await db
    .update(peserta)
    .set({
      aktif: false,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(peserta.nik, nik))
    .returning();

  const data = hasil[0];

  if (!data) {
    throw new Error("Peserta gagal dinonaktifkan.");
  }

  return data;
}

// ============================================================
// HAPUS PESERTA PERMANEN
// ============================================================

export async function hapusPesertaPermanen(nik: string) {
  const existing = await ambilPesertaByNik(nik);

  if (!existing) {
    throw new Error("Peserta tidak ditemukan.");
  }

  const hasil = await db
    .delete(peserta)
    .where(eq(peserta.nik, nik))
    .returning();

  const data = hasil[0];

  if (!data) {
    throw new Error("Peserta gagal dihapus permanen.");
  }

  return data;
}

