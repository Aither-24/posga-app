import {
  and,
  eq,
  gte,
  isNull,
  lte,
  or,
} from "drizzle-orm";

import { db } from "../db/index.js";

import {
  pesertaPosyandu,
  sesiPosga,
} from "../db/schema.js";

export async function pastikanPesertaSesuaiPosyanduSesi(
  sesiId: number,
  pesertaNik: string,
) {
  const sesiRows = await db
    .select({
      id: sesiPosga.id,
      posyanduId:
        sesiPosga.posyanduId,
      tanggalPosga:
        sesiPosga.tanggalPosga,
    })
    .from(sesiPosga)
    .where(
      eq(
        sesiPosga.id,
        sesiId,
      ),
    )
    .limit(1);

  const sesi =
    sesiRows[0];

  if (!sesi) {
    throw new Error(
      "Sesi POSGA tidak ditemukan.",
    );
  }

  const anggotaRows =
    await db
      .select({
        id:
          pesertaPosyandu.id,
      })
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
            pesertaPosyandu.posyanduId,
            sesi.posyanduId,
          ),
          lte(
            pesertaPosyandu.tanggalMulai,
            sesi.tanggalPosga,
          ),
          or(
            isNull(
              pesertaPosyandu.tanggalSelesai,
            ),
            gte(
              pesertaPosyandu.tanggalSelesai,
              sesi.tanggalPosga,
            ),
          ),
        ),
      )
      .limit(1);

  if (!anggotaRows[0]) {
    throw new Error(
      "Peserta tidak terdaftar pada Posyandu yang menyelenggarakan sesi ini.",
    );
  }

  return true;
}
