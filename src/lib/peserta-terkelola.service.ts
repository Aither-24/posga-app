import {
  and,
  asc,
  count,
  eq,
  like,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "../db/index.js";

import {
  lokasi,
  peserta,
  pesertaPosyandu,
  posyandu,
} from "../db/schema.js";

export interface CariPesertaTerkelolaInput {
  q?: string;
  aktif?: boolean;
  jenisKelamin?: "L" | "P";
  lokasiId?: number;
  posyanduId?: number;
  page: number;
  limit: number;
}

export interface TambahPesertaTerkelolaInput {
  nik: string;
  nama: string;
  noRm?: string | null;
  noTelp?: string | null;
  tanggalLahir: string;
  jenisKelamin: "L" | "P";
  alamatKtp?: string | null;
  rtKtp?: string | null;
  rwKtp?: string | null;
  alamatDomisili: string;
  rtDomisili: string;
  rwDomisili: string;
  posyanduId: number;
  tanggalMulai: string;
}

function tanggalSebelumnya(tanggal: string) {
  const bagian = tanggal
    .split("-")
    .map(Number);

  const tahun = bagian[0];
  const bulan = bagian[1];
  const hari = bagian[2];

  if (
    tahun === undefined ||
    bulan === undefined ||
    hari === undefined ||
    !Number.isInteger(tahun) ||
    !Number.isInteger(bulan) ||
    !Number.isInteger(hari)
  ) {
    throw new Error(
      "Tanggal tidak valid. Gunakan format YYYY-MM-DD.",
    );
  }

  const date = new Date(
    Date.UTC(
      tahun,
      bulan - 1,
      hari,
    ),
  );

  date.setUTCDate(
    date.getUTCDate() - 1,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

async function ambilPosyanduAktif(id: number) {
  const rows = await db
    .select({
      id: posyandu.id,
      nama: posyandu.nama,
      aktif: posyandu.aktif,
      lokasiId: posyandu.lokasiId,
      lokasiNama: lokasi.nama,
      lokasiAktif: lokasi.aktif,
    })
    .from(posyandu)
    .innerJoin(
      lokasi,
      eq(posyandu.lokasiId, lokasi.id),
    )
    .where(eq(posyandu.id, id))
    .limit(1);

  const data = rows[0];

  if (!data) {
    throw new Error(
      "Posyandu tidak ditemukan.",
    );
  }

  if (
    !data.aktif ||
    !data.lokasiAktif
  ) {
    throw new Error(
      "Peserta hanya dapat ditautkan ke Posyandu dan lokasi yang aktif.",
    );
  }

  return data;
}

export async function cariPesertaTerkelola(
  input: CariPesertaTerkelolaInput,
) {
  const kondisi: SQL[] = [];

  const kataKunci =
    input.q?.trim();

  if (kataKunci) {
    const pola =
      `%${kataKunci}%`;

    const search = or(
      like(peserta.nik, pola),
      like(peserta.nama, pola),
      like(peserta.noRm, pola),
      like(peserta.noTelp, pola),
    );

    if (search) {
      kondisi.push(search);
    }
  }

  if (
    input.aktif !== undefined
  ) {
    kondisi.push(
      eq(
        peserta.aktif,
        input.aktif,
      ),
    );
  }

  if (
    input.jenisKelamin !==
    undefined
  ) {
    kondisi.push(
      eq(
        peserta.jenisKelamin,
        input.jenisKelamin,
      ),
    );
  }

  if (
    input.posyanduId !==
    undefined
  ) {
    kondisi.push(
      eq(
        pesertaPosyandu.posyanduId,
        input.posyanduId,
      ),
    );
  }

  if (
    input.lokasiId !==
    undefined
  ) {
    kondisi.push(
      eq(
        posyandu.lokasiId,
        input.lokasiId,
      ),
    );
  }

  const whereClause =
    kondisi.length > 0
      ? and(...kondisi)
      : undefined;

  const baseCount = db
    .select({
      total:
        count(peserta.nik),
    })
    .from(peserta)
    .leftJoin(
      pesertaPosyandu,
      and(
        eq(
          pesertaPosyandu.pesertaNik,
          peserta.nik,
        ),
        eq(
          pesertaPosyandu.aktif,
          true,
        ),
      ),
    )
    .leftJoin(
      posyandu,
      eq(
        pesertaPosyandu.posyanduId,
        posyandu.id,
      ),
    );

  const totalRows =
    whereClause
      ? await baseCount.where(
          whereClause,
        )
      : await baseCount;

  const total =
    Number(
      totalRows[0]?.total ??
      0,
    );

  const totalPages =
    total === 0
      ? 0
      : Math.ceil(
          total / input.limit,
        );

  const offset =
    (input.page - 1) *
    input.limit;

  const baseItems = db
    .select({
      nik: peserta.nik,
      nama: peserta.nama,
      noRm: peserta.noRm,
      noTelp: peserta.noTelp,
      tanggalLahir:
        peserta.tanggalLahir,
      jenisKelamin:
        peserta.jenisKelamin,
      alamatKtp:
        peserta.alamatKtp,
      rtKtp:
        peserta.rtKtp,
      rwKtp:
        peserta.rwKtp,
      alamatDomisili:
        peserta.alamatDomisili,
      rtDomisili:
        peserta.rtDomisili,
      rwDomisili:
        peserta.rwDomisili,
      aktif: peserta.aktif,
      createdAt:
        peserta.createdAt,
      updatedAt:
        peserta.updatedAt,

      keanggotaanId:
        pesertaPosyandu.id,
      tanggalMulaiPosyandu:
        pesertaPosyandu.tanggalMulai,

      posyanduId:
        posyandu.id,
      posyanduNama:
        posyandu.nama,
      lokasiId:
        lokasi.id,
      lokasiNama:
        lokasi.nama,
    })
    .from(peserta)
    .leftJoin(
      pesertaPosyandu,
      and(
        eq(
          pesertaPosyandu.pesertaNik,
          peserta.nik,
        ),
        eq(
          pesertaPosyandu.aktif,
          true,
        ),
      ),
    )
    .leftJoin(
      posyandu,
      eq(
        pesertaPosyandu.posyanduId,
        posyandu.id,
      ),
    )
    .leftJoin(
      lokasi,
      eq(
        posyandu.lokasiId,
        lokasi.id,
      ),
    );

  const items =
    whereClause
      ? await baseItems
          .where(whereClause)
          .orderBy(
            asc(peserta.nama),
            asc(peserta.nik),
          )
          .limit(input.limit)
          .offset(offset)
      : await baseItems
          .orderBy(
            asc(peserta.nama),
            asc(peserta.nik),
          )
          .limit(input.limit)
          .offset(offset);

  return {
    items,

    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages,
      hasNext:
        input.page <
        totalPages,
      hasPrevious:
        input.page > 1 &&
        totalPages > 0,
    },
  };
}

export async function tambahPesertaTerkelola(
  input: TambahPesertaTerkelolaInput,
) {
  await ambilPosyanduAktif(
    input.posyanduId,
  );

  const existing = await db
    .select({
      nik: peserta.nik,
    })
    .from(peserta)
    .where(
      eq(
        peserta.nik,
        input.nik,
      ),
    )
    .limit(1);

  if (existing[0]) {
    throw new Error(
      "Peserta dengan NIK tersebut sudah terdaftar.",
    );
  }

  return db.transaction(
    (tx) => {
      const pesertaRows =
        tx
          .insert(peserta)
          .values({
            nik: input.nik,
            nama: input.nama,
            noRm: input.noRm,
            noTelp: input.noTelp,
            tanggalLahir:
              input.tanggalLahir,
            jenisKelamin:
              input.jenisKelamin,
            alamatKtp:
              input.alamatKtp,
            rtKtp: input.rtKtp,
            rwKtp: input.rwKtp,
            alamatDomisili:
              input.alamatDomisili,
            rtDomisili:
              input.rtDomisili,
            rwDomisili:
              input.rwDomisili,
            aktif: true,
          })
          .returning()
          .all();

      const dataPeserta =
        pesertaRows[0];

      if (!dataPeserta) {
        throw new Error(
          "Gagal membuat peserta.",
        );
      }

      const anggotaRows =
        tx
          .insert(
            pesertaPosyandu,
          )
          .values({
            pesertaNik:
              dataPeserta.nik,
            posyanduId:
              input.posyanduId,
            tanggalMulai:
              input.tanggalMulai,
            aktif: true,
          })
          .returning()
          .all();

      const keanggotaan =
        anggotaRows[0];

      if (!keanggotaan) {
        throw new Error(
          "Gagal menautkan peserta ke Posyandu.",
        );
      }

      return {
        peserta:
          dataPeserta,
        keanggotaan,
      };
    },
  );
}

export async function pindahPesertaTerkelola(
  pesertaNik: string,
  posyanduBaruId: number,
  tanggalPindah: string,
) {
  await ambilPosyanduAktif(
    posyanduBaruId,
  );

  const pesertaRows =
    await db
      .select()
      .from(peserta)
      .where(
        eq(
          peserta.nik,
          pesertaNik,
        ),
      )
      .limit(1);

  const dataPeserta =
    pesertaRows[0];

  if (!dataPeserta) {
    throw new Error(
      "Peserta tidak ditemukan.",
    );
  }

  if (!dataPeserta.aktif) {
    throw new Error(
      "Peserta nonaktif tidak dapat dipindahkan Posyandu.",
    );
  }

  const aktifRows =
    await db
      .select()
      .from(
        pesertaPosyandu,
      )
      .where(
        and(
          eq(
            pesertaPosyandu.pesertaNik,
            pesertaNik,
          ),
          eq(
            pesertaPosyandu.aktif,
            true,
          ),
        ),
      )
      .limit(1);

  const aktifSekarang =
    aktifRows[0];

  if (!aktifSekarang) {
    throw new Error(
      "Peserta belum memiliki Posyandu aktif. Gunakan penempatan peserta.",
    );
  }

  if (
    aktifSekarang.posyanduId ===
    posyanduBaruId
  ) {
    throw new Error(
      "Peserta sudah berada di Posyandu tersebut.",
    );
  }

  if (
    tanggalPindah <=
    aktifSekarang.tanggalMulai
  ) {
    throw new Error(
      "Tanggal pindah harus setelah tanggal mulai keanggotaan saat ini. Perpindahan pada hari yang sama akan menghasilkan periode keanggotaan yang tidak valid.",
    );
  }

  return db.transaction(
    (tx) => {
      tx
        .update(
          pesertaPosyandu,
        )
        .set({
          aktif: false,
          tanggalSelesai:
            tanggalSebelumnya(
              tanggalPindah,
            ),
          updatedAt:
            sql`CURRENT_TIMESTAMP`,
        })
        .where(
          eq(
            pesertaPosyandu.id,
            aktifSekarang.id,
          ),
        )
        .run();

      const baruRows =
        tx
          .insert(
            pesertaPosyandu,
          )
          .values({
            pesertaNik,
            posyanduId:
              posyanduBaruId,
            tanggalMulai:
              tanggalPindah,
            aktif: true,
          })
          .returning()
          .all();

      const baru =
        baruRows[0];

      if (!baru) {
        throw new Error(
          "Gagal memindahkan peserta.",
        );
      }

      return {
        sebelum:
          aktifSekarang,
        sesudah: baru,
      };
    },
  );
}

