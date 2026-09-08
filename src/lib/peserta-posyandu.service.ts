import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "../db/index.js";

import { peserta, pesertaPosyandu, posyandu } from "../db/schema.js";

export interface TambahPesertaPosyanduInput {
  pesertaNik: string;
  posyanduId: number;
  tanggalMulai: string;
}

function tanggalSebelumnya(tanggal: string) {
  const date = new Date(`${tanggal}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal pindah tidak valid.");
  }

  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function ambilKeanggotaanAktif(pesertaNik: string) {
  const hasil = await db
    .select()
    .from(pesertaPosyandu)
    .where(
      and(
        eq(pesertaPosyandu.pesertaNik, pesertaNik),
        eq(pesertaPosyandu.aktif, true),
        isNull(pesertaPosyandu.tanggalSelesai),
      ),
    )
    .limit(1);

  return hasil[0] ?? null;
}

export async function ambilRiwayatPosyanduPeserta(pesertaNik: string) {
  return db
    .select()
    .from(pesertaPosyandu)
    .where(eq(pesertaPosyandu.pesertaNik, pesertaNik));
}

export async function ambilPesertaAktifByPosyandu(posyanduId: number) {
  return db
    .select({
      pesertaNik: pesertaPosyandu.pesertaNik,

      tanggalMulai: pesertaPosyandu.tanggalMulai,

      pesertaNama: peserta.nama,

      tanggalLahir: peserta.tanggalLahir,

      jenisKelamin: peserta.jenisKelamin,
    })
    .from(pesertaPosyandu)
    .innerJoin(peserta, eq(pesertaPosyandu.pesertaNik, peserta.nik))
    .where(
      and(
        eq(pesertaPosyandu.posyanduId, posyanduId),
        eq(pesertaPosyandu.aktif, true),
        eq(peserta.aktif, true),
        isNull(pesertaPosyandu.tanggalSelesai),
      ),
    );
}

export async function tempatkanPesertaKePosyandu(
  input: TambahPesertaPosyanduInput,
) {
  const pesertaAda = await db
    .select()
    .from(peserta)
    .where(eq(peserta.nik, input.pesertaNik))
    .limit(1);

  if (!pesertaAda[0]) {
    throw new Error("Peserta tidak ditemukan.");
  }

  const posyanduAda = await db
    .select()
    .from(posyandu)
    .where(eq(posyandu.id, input.posyanduId))
    .limit(1);

  if (!posyanduAda[0]) {
    throw new Error("Posyandu tidak ditemukan.");
  }

  const aktifSekarang = await ambilKeanggotaanAktif(input.pesertaNik);

  if (aktifSekarang) {
    if (aktifSekarang.posyanduId === input.posyanduId) {
      throw new Error("Peserta sudah aktif di Posyandu tersebut.");
    }

    throw new Error(
      "Peserta masih aktif di Posyandu lain. Gunakan proses pindah Posyandu.",
    );
  }

  const hasil = await db
    .insert(pesertaPosyandu)
    .values({
      pesertaNik: input.pesertaNik,

      posyanduId: input.posyanduId,

      tanggalMulai: input.tanggalMulai,

      aktif: true,
    })
    .returning();

  return hasil[0] ?? null;
}

export async function pindahPosyandu(
  pesertaNik: string,
  posyanduBaruId: number,
  tanggalPindah: string,
) {
  const aktifSekarang = await ambilKeanggotaanAktif(pesertaNik);

  if (!aktifSekarang) {
    throw new Error("Peserta tidak memiliki Posyandu aktif.");
  }

  if (aktifSekarang.posyanduId === posyanduBaruId) {
    throw new Error("Peserta sudah berada di Posyandu tersebut.");
  }

  if (tanggalPindah <= aktifSekarang.tanggalMulai) {
    throw new Error(
      "Tanggal pindah harus setelah tanggal mulai keanggotaan saat ini.",
    );
  }

  const posyanduBaru = await db
    .select()
    .from(posyandu)
    .where(eq(posyandu.id, posyanduBaruId))
    .limit(1);

  if (!posyanduBaru[0]) {
    throw new Error("Posyandu tujuan tidak ditemukan.");
  }

  return db.transaction((tx) => {
    tx
      .update(pesertaPosyandu)
      .set({
        aktif: false,
        tanggalSelesai: tanggalSebelumnya(tanggalPindah),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(pesertaPosyandu.id, aktifSekarang.id))
      .run();

    const hasil = tx
      .insert(pesertaPosyandu)
      .values({
        pesertaNik,
        posyanduId: posyanduBaruId,
        tanggalMulai: tanggalPindah,
        aktif: true,
      })
      .returning()
      .all();

    return hasil[0] ?? null;
  });
}
