import {
  and,
  count,
  desc,
  eq,
  gte,
  lte,
  type SQL,
} from "drizzle-orm";

import {
  db,
} from "../db/index.js";

import {
  posyandu,
  sesiPosga,
} from "../db/schema.js";

// ============================================================
// TYPE
// ============================================================

export interface CariSesiPosgaInput {
  posyanduId: number;

  status?:
    | "aktif"
    | "selesai"
    | "dibatalkan";

  tanggalMulai?: string;

  tanggalSelesai?: string;

  page: number;

  limit: number;
}

// ============================================================
// CEK POSYANDU
// ============================================================

async function pastikanPosyanduAda(
  id: number,
) {
  const rows =
    await db
      .select({
        id:
          posyandu.id,

        nama:
          posyandu.nama,

        aktif:
          posyandu.aktif,
      })
      .from(
        posyandu,
      )
      .where(
        eq(
          posyandu.id,
          id,
        ),
      )
      .limit(1);

  const data =
    rows[0];

  if (!data) {
    throw new Error(
      "Posyandu tidak ditemukan.",
    );
  }

  return data;
}

// ============================================================
// SEARCH + FILTER + PAGINATION SESI
// ============================================================

export async function cariSesiPosga(
  input: CariSesiPosgaInput,
) {
  const dataPosyandu =
    await pastikanPosyanduAda(
      input.posyanduId,
    );

  const kondisi: SQL[] = [
    eq(
      sesiPosga.posyanduId,
      input.posyanduId,
    ),
  ];

  // ==========================================================
  // STATUS
  // ==========================================================

  if (
    input.status !==
    undefined
  ) {
    kondisi.push(
      eq(
        sesiPosga.status,
        input.status,
      ),
    );
  }

  // ==========================================================
  // TANGGAL MULAI
  // ==========================================================

  if (
    input.tanggalMulai !==
    undefined
  ) {
    kondisi.push(
      gte(
        sesiPosga.tanggalPosga,
        input.tanggalMulai,
      ),
    );
  }

  // ==========================================================
  // TANGGAL SELESAI
  // ==========================================================

  if (
    input.tanggalSelesai !==
    undefined
  ) {
    kondisi.push(
      lte(
        sesiPosga.tanggalPosga,
        input.tanggalSelesai,
      ),
    );
  }

  const whereClause =
    and(
      ...kondisi,
    );

  // ==========================================================
  // TOTAL
  // ==========================================================

  const totalRows =
    await db
      .select({
        total:
          count(),
      })
      .from(
        sesiPosga,
      )
      .where(
        whereClause,
      );

  const total =
    Number(
      totalRows[0]
        ?.total ??
        0,
    );

  const totalPages =
    total === 0
      ? 0
      : Math.ceil(
          total /
            input.limit,
        );

  const offset =
    (input.page - 1) *
    input.limit;

  // ==========================================================
  // DATA
  // ==========================================================

  const items =
    await db
      .select()
      .from(
        sesiPosga,
      )
      .where(
        whereClause,
      )
      .orderBy(
        desc(
          sesiPosga.tanggalPosga,
        ),
        desc(
          sesiPosga.id,
        ),
      )
      .limit(
        input.limit,
      )
      .offset(
        offset,
      );

  return {
    posyandu: {
      id:
        dataPosyandu.id,

      nama:
        dataPosyandu.nama,

      aktif:
        dataPosyandu.aktif,
    },

    items,

    pagination: {
      page:
        input.page,

      limit:
        input.limit,

      total,

      totalPages,

      hasNext:
        input.page <
        totalPages,

      hasPrevious:
        input.page >
          1 &&
        totalPages >
          0,
    },

    filter: {
      status:
        input.status ??
        null,

      tanggalMulai:
        input.tanggalMulai ??
        null,

      tanggalSelesai:
        input.tanggalSelesai ??
        null,
    },
  };
}