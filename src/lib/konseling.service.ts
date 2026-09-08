import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../db/index.js";

import {
  hasilKonseling,
  hasilKonselingOpsi,
  indikator,
  opsiIndikator,
  pesertaSesiPosga,
  sesiPosga,
} from "../db/schema.js";

// ============================================================
// TYPE
// ============================================================

export interface TambahHasilKonselingInput {
  pesertaSesiPosgaId: number;

  indikatorId: number;

  opsiId?: number | null;

  opsiIds?: number[] | null;

  catatan?: string | null;
}

export interface UpdateHasilKonselingInput {
  opsiId?: number | null;

  opsiIds?: number[] | null;

  catatan?: string | null;
}

export interface OpsiHasilKonseling {
  id: number;

  kode: string;

  label: string;

  nilaiNumerik: number | null;
}

export interface DetailHasilKonseling {
  id: number;

  pesertaSesiPosgaId: number;

  indikatorId: number;

  indikatorKode: string;

  indikatorNama: string;

  tipeInput: "number" | "text" | "boolean" | "date" | "select" | "multiselect";

  opsiId: number | null;

  catatan: string | null;

  createdAt: string;

  updatedAt: string;

  opsiTerpilih: OpsiHasilKonseling[];
}

// ============================================================
// NORMALISASI TEXT
// ============================================================

function normalisasiText(nilai: string | null | undefined) {
  if (nilai === undefined || nilai === null) {
    return null;
  }

  const hasil = nilai.trim();

  return hasil.length > 0 ? hasil : null;
}

// ============================================================
// VALIDASI PESERTA SESI
// ============================================================

async function validasiPesertaSesi(
  pesertaSesiPosgaId: number,
  izinkanKoreksiSesiSelesai = false,
) {
  const rows = await db
    .select({
      id: pesertaSesiPosga.id,

      pesertaNik: pesertaSesiPosga.pesertaNik,

      sesiPosgaId: pesertaSesiPosga.sesiPosgaId,

      statusPemeriksaan: pesertaSesiPosga.statusPemeriksaan,

      statusSesi: sesiPosga.status,

      tanggalPosga: sesiPosga.tanggalPosga,
    })
    .from(pesertaSesiPosga)
    .innerJoin(sesiPosga, eq(sesiPosga.id, pesertaSesiPosga.sesiPosgaId))
    .where(eq(pesertaSesiPosga.id, pesertaSesiPosgaId))
    .limit(1);

  const hasil = rows[0];

  if (!hasil) {
    throw new Error("Peserta sesi POSGA tidak ditemukan.");
  }

  if (hasil.statusSesi === "dibatalkan") {
    throw new Error("Konseling tidak dapat dicatat karena sesi dibatalkan.");
  }

  if (
    hasil.statusSesi === "selesai" &&
    !izinkanKoreksiSesiSelesai
  ) {
    throw new Error(
      "Sesi sudah selesai. Gunakan mode koreksi riwayat untuk mengubah konseling.",
    );
  }

  if (
    hasil.statusPemeriksaan === "tidak_hadir" ||
    hasil.statusPemeriksaan === "batal"
  ) {
    throw new Error(
      "Konseling tidak dapat dicatat untuk peserta yang tidak hadir atau batal.",
    );
  }

  return hasil;
}

// ============================================================
// MASTER KONSELING
// ============================================================

async function ambilMasterKonseling(indikatorId: number) {
  const rows = await db
    .select({
      id: indikator.id,

      kode: indikator.kode,

      nama: indikator.nama,

      kelompok: indikator.kelompok,

      tipeInput: indikator.tipeInput,

      aktif: indikator.aktif,
    })
    .from(indikator)
    .where(eq(indikator.id, indikatorId))
    .limit(1);

  const hasil = rows[0];

  if (!hasil) {
    throw new Error("Indikator tidak ditemukan.");
  }

  if (!hasil.aktif) {
    throw new Error("Indikator sudah tidak aktif.");
  }

  if (hasil.kelompok !== "konseling") {
    throw new Error("Indikator bukan kelompok konseling.");
  }

  return hasil;
}

// ============================================================
// VALIDASI DAFTAR OPSI
// ============================================================

async function validasiOpsiIds(indikatorId: number, opsiIds: number[]) {
  const unik = [...new Set(opsiIds)];

  if (unik.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: opsiIndikator.id,
    })
    .from(opsiIndikator)
    .where(
      and(
        eq(opsiIndikator.indikatorId, indikatorId),

        eq(opsiIndikator.aktif, true),

        inArray(opsiIndikator.id, unik),
      ),
    );

  if (rows.length !== unik.length) {
    throw new Error(
      "Terdapat opsi konseling yang tidak valid atau tidak aktif.",
    );
  }

  return unik;
}

// ============================================================
// VALIDASI NILAI KONSELING
// ============================================================

async function validasiNilaiKonseling(
  indikatorId: number,

  tipeInput: "number" | "text" | "boolean" | "date" | "select" | "multiselect",

  input: {
    opsiId?: number | null;

    opsiIds?: number[] | null;
  },
) {
  // ==========================================================
  // SELECT
  // ==========================================================

  if (tipeInput === "select") {
    if (input.opsiId === undefined || input.opsiId === null) {
      throw new Error("Konseling bertipe select membutuhkan opsiId.");
    }

    await validasiOpsiIds(indikatorId, [input.opsiId]);

    return {
      opsiId: input.opsiId,

      opsiIds: [] as number[],
    };
  }

  // ==========================================================
  // MULTISELECT
  // ==========================================================

  if (tipeInput === "multiselect") {
    if (!input.opsiIds || input.opsiIds.length === 0) {
      throw new Error(
        "Konseling bertipe multiselect membutuhkan minimal satu opsi.",
      );
    }

    const opsiIds = await validasiOpsiIds(indikatorId, input.opsiIds);

    return {
      opsiId: null,

      opsiIds,
    };
  }

  // ==========================================================
  // TIPE LAIN
  //
  // Untuk konseling non select/multiselect,
  // record + catatan sudah cukup.
  // ==========================================================

  return {
    opsiId: null,

    opsiIds: [] as number[],
  };
}

// ============================================================
// AMBIL OPSI TERPILIH
// ============================================================

async function ambilOpsiTerpilih(
  hasilKonselingId: number,
  opsiId: number | null,
): Promise<OpsiHasilKonseling[]> {
  const hasil: OpsiHasilKonseling[] = [];

  // ==========================================================
  // SELECT
  // ==========================================================

  if (opsiId !== null) {
    const rows = await db
      .select({
        id: opsiIndikator.id,

        kode: opsiIndikator.kode,

        label: opsiIndikator.label,

        nilaiNumerik: opsiIndikator.nilaiNumerik,
      })
      .from(opsiIndikator)
      .where(eq(opsiIndikator.id, opsiId))
      .limit(1);

    const opsi = rows[0];

    if (opsi) {
      hasil.push(opsi);
    }
  }

  // ==========================================================
  // MULTISELECT
  // ==========================================================

  const rowsMulti = await db
    .select({
      id: opsiIndikator.id,

      kode: opsiIndikator.kode,

      label: opsiIndikator.label,

      nilaiNumerik: opsiIndikator.nilaiNumerik,
    })
    .from(hasilKonselingOpsi)
    .innerJoin(opsiIndikator, eq(opsiIndikator.id, hasilKonselingOpsi.opsiId))
    .where(eq(hasilKonselingOpsi.hasilKonselingId, hasilKonselingId));

  for (const item of rowsMulti) {
    if (!hasil.some((opsi) => opsi.id === item.id)) {
      hasil.push(item);
    }
  }

  return hasil;
}

// ============================================================
// READ BY ID
// ============================================================

export async function ambilHasilKonselingById(
  id: number,
): Promise<DetailHasilKonseling | null> {
  const rows = await db
    .select({
      id: hasilKonseling.id,

      pesertaSesiPosgaId: hasilKonseling.pesertaSesiPosgaId,

      indikatorId: hasilKonseling.indikatorId,

      indikatorKode: indikator.kode,

      indikatorNama: indikator.nama,

      tipeInput: indikator.tipeInput,

      opsiId: hasilKonseling.opsiId,

      catatan: hasilKonseling.catatan,

      createdAt: hasilKonseling.createdAt,

      updatedAt: hasilKonseling.updatedAt,
    })
    .from(hasilKonseling)
    .innerJoin(indikator, eq(indikator.id, hasilKonseling.indikatorId))
    .where(eq(hasilKonseling.id, id))
    .limit(1);

  const hasil = rows[0];

  if (!hasil) {
    return null;
  }

  return {
    ...hasil,

    opsiTerpilih: await ambilOpsiTerpilih(hasil.id, hasil.opsiId),
  };
}

// ============================================================
// LIST PESERTA SESI
// ============================================================

export async function ambilHasilKonselingPesertaSesi(
  pesertaSesiPosgaId: number,
): Promise<DetailHasilKonseling[]> {
  const rows =
    await db
      .select({
        id:
          hasilKonseling.id,

        pesertaSesiPosgaId:
          hasilKonseling.pesertaSesiPosgaId,

        indikatorId:
          hasilKonseling.indikatorId,

        indikatorKode:
          indikator.kode,

        indikatorNama:
          indikator.nama,

        tipeInput:
          indikator.tipeInput,

        opsiId:
          hasilKonseling.opsiId,

        catatan:
          hasilKonseling.catatan,

        createdAt:
          hasilKonseling.createdAt,

        updatedAt:
          hasilKonseling.updatedAt,
      })
      .from(
        hasilKonseling,
      )
      .innerJoin(
        indikator,
        eq(
          indikator.id,
          hasilKonseling.indikatorId,
        ),
      )
      .where(
        eq(
          hasilKonseling.pesertaSesiPosgaId,
          pesertaSesiPosgaId,
        ),
      )
      .orderBy(
        hasilKonseling.id,
      );

  if (
    rows.length ===
    0
  ) {
    return [];
  }

  const hasilIds =
    rows.map(
      (row) =>
        row.id,
    );

  const opsiLangsungIds = [
    ...new Set(
      rows
        .map(
          (row) =>
            row.opsiId,
        )
        .filter(
          (
            id,
          ): id is number =>
            id !== null,
        ),
    ),
  ];

  const opsiLangsung =
    opsiLangsungIds.length >
    0
      ? await db
          .select({
            id:
              opsiIndikator.id,

            kode:
              opsiIndikator.kode,

            label:
              opsiIndikator.label,

            nilaiNumerik:
              opsiIndikator.nilaiNumerik,
          })
          .from(
            opsiIndikator,
          )
          .where(
            inArray(
              opsiIndikator.id,
              opsiLangsungIds,
            ),
          )
      : [];

  const opsiLangsungMap =
    new Map(
      opsiLangsung.map(
        (item) => [
          item.id,
          item,
        ],
      ),
    );

  const opsiMulti =
    await db
      .select({
        hasilKonselingId:
          hasilKonselingOpsi.hasilKonselingId,

        id:
          opsiIndikator.id,

        kode:
          opsiIndikator.kode,

        label:
          opsiIndikator.label,

        nilaiNumerik:
          opsiIndikator.nilaiNumerik,
      })
      .from(
        hasilKonselingOpsi,
      )
      .innerJoin(
        opsiIndikator,
        eq(
          opsiIndikator.id,
          hasilKonselingOpsi.opsiId,
        ),
      )
      .where(
        inArray(
          hasilKonselingOpsi.hasilKonselingId,
          hasilIds,
        ),
      );

  const opsiMultiMap =
    new Map<
      number,
      OpsiHasilKonseling[]
    >();

  for (
    const item of
    opsiMulti
  ) {
    const daftar =
      opsiMultiMap.get(
        item.hasilKonselingId,
      ) ?? [];

    if (
      !daftar.some(
        (opsi) =>
          opsi.id ===
          item.id,
      )
    ) {
      daftar.push({
        id:
          item.id,

        kode:
          item.kode,

        label:
          item.label,

        nilaiNumerik:
          item.nilaiNumerik,
      });
    }

    opsiMultiMap.set(
      item.hasilKonselingId,
      daftar,
    );
  }

  return rows.map(
    (row) => {
      const opsiTerpilih:
        OpsiHasilKonseling[] =
        [];

      if (
        row.opsiId !==
        null
      ) {
        const opsi =
          opsiLangsungMap.get(
            row.opsiId,
          );

        if (opsi) {
          opsiTerpilih.push(
            opsi,
          );
        }
      }

      const multi =
        opsiMultiMap.get(
          row.id,
        ) ?? [];

      for (
        const opsi of
        multi
      ) {
        if (
          !opsiTerpilih.some(
            (item) =>
              item.id ===
              opsi.id,
          )
        ) {
          opsiTerpilih.push(
            opsi,
          );
        }
      }

      return {
        ...row,

        opsiTerpilih,
      };
    },
  );
}

// ============================================================
// CREATE
// ============================================================

export async function tambahHasilKonseling(
  input: TambahHasilKonselingInput,
  opsi: { izinkanKoreksiSesiSelesai?: boolean } = {},
) {
  await validasiPesertaSesi(
    input.pesertaSesiPosgaId,
    opsi.izinkanKoreksiSesiSelesai ?? false,
  );

  const master = await ambilMasterKonseling(input.indikatorId);

  // ==========================================================
  // DUPLIKAT
  // ==========================================================

  const duplikat = await db
    .select({
      id: hasilKonseling.id,
    })
    .from(hasilKonseling)
    .where(
      and(
        eq(hasilKonseling.pesertaSesiPosgaId, input.pesertaSesiPosgaId),

        eq(hasilKonseling.indikatorId, input.indikatorId),
      ),
    )
    .limit(1);

  if (duplikat.length > 0) {
    throw new Error(
      "Konseling untuk indikator ini sudah tercatat pada peserta sesi tersebut.",
    );
  }

  const nilai = await validasiNilaiKonseling(master.id, master.tipeInput, {
    ...(input.opsiId !== undefined
      ? {
          opsiId: input.opsiId,
        }
      : {}),

    ...(input.opsiIds !== undefined
      ? {
          opsiIds: input.opsiIds,
        }
      : {}),
  });

  const id =
    db.transaction(
      (tx) => {
        const inserted =
          tx
            .insert(
              hasilKonseling,
            )
            .values({
              pesertaSesiPosgaId:
                input.pesertaSesiPosgaId,

              indikatorId:
                input.indikatorId,

              opsiId:
                nilai.opsiId,

              catatan:
                normalisasiText(
                  input.catatan,
                ),
            })
            .returning({
              id:
                hasilKonseling.id,
            })
            .all();

        const id =
          inserted[0]?.id;

        if (!id) {
          throw new Error(
            "Gagal menyimpan hasil konseling.",
          );
        }

        if (
          nilai.opsiIds.length >
          0
        ) {
          tx
            .insert(
              hasilKonselingOpsi,
            )
            .values(
              nilai.opsiIds.map(
                (opsiId) => ({
                  hasilKonselingId:
                    id,

                  opsiId,
                }),
              ),
            )
            .run();
        }

        return id;
      },
    );
const hasil = await ambilHasilKonselingById(id);

  if (!hasil) {
    throw new Error("Konseling tersimpan tetapi gagal dibaca kembali.");
  }

  return hasil;
}

// ============================================================
// UPDATE
// ============================================================

export async function updateHasilKonseling(
  id: number,

  input: UpdateHasilKonselingInput,
  opsi: { izinkanKoreksiSesiSelesai?: boolean } = {},
) {
  const lama = await ambilHasilKonselingById(id);

  if (!lama) {
    throw new Error("Hasil konseling tidak ditemukan.");
  }

  await validasiPesertaSesi(
    lama.pesertaSesiPosgaId,
    opsi.izinkanKoreksiSesiSelesai ?? false,
  );

  const master = await ambilMasterKonseling(lama.indikatorId);

  const opsiIdsLama =
    master.tipeInput === "multiselect"
      ? lama.opsiTerpilih.map((item) => item.id)
      : [];

  const nilai = await validasiNilaiKonseling(master.id, master.tipeInput, {
    opsiId: input.opsiId !== undefined ? input.opsiId : lama.opsiId,

    opsiIds: input.opsiIds !== undefined ? input.opsiIds : opsiIdsLama,
  });

  db.transaction(
    (tx) => {
      tx
        .update(
          hasilKonseling,
        )
        .set({
          opsiId:
            nilai.opsiId,

          ...(input.catatan !==
          undefined
            ? {
                catatan:
                  normalisasiText(
                    input.catatan,
                  ),
              }
            : {}),

          updatedAt:
            sql`CURRENT_TIMESTAMP`,
        })
        .where(
          eq(
            hasilKonseling.id,
            id,
          ),
        )
        .run();

      // ======================================================
      // RESET MULTISELECT
      // ======================================================

      tx
        .delete(
          hasilKonselingOpsi,
        )
        .where(
          eq(
            hasilKonselingOpsi.hasilKonselingId,
            id,
          ),
        )
        .run();

      if (
        nilai.opsiIds.length >
        0
      ) {
        tx
          .insert(
            hasilKonselingOpsi,
          )
          .values(
            nilai.opsiIds.map(
              (opsiId) => ({
                hasilKonselingId:
                  id,

                opsiId,
              }),
            ),
          )
          .run();
      }
    },
  );
const hasil = await ambilHasilKonselingById(id);

  if (!hasil) {
    throw new Error("Hasil konseling gagal dibaca setelah update.");
  }

  return hasil;
}

// ============================================================
// DELETE
// ============================================================

export async function hapusHasilKonseling(
  id: number,
  opsi: { izinkanKoreksiSesiSelesai?: boolean } = {},
) {
  const lama = await ambilHasilKonselingById(id);

  if (!lama) {
    throw new Error("Hasil konseling tidak ditemukan.");
  }

  await validasiPesertaSesi(
    lama.pesertaSesiPosgaId,
    opsi.izinkanKoreksiSesiSelesai ?? false,
  );

  await db.delete(hasilKonseling).where(eq(hasilKonseling.id, id));

  return {
    id,

    berhasil: true,
  };
}


