import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../db/index.js";

import {
  hasilPemeriksaan,
  hasilPemeriksaanOpsi,
  indikator,
  opsiIndikator,
  pesertaSesiPosga,
  sesiPosga,
} from "../db/schema.js";

import {
  validasiPlausibilitasAngka,
} from "./clinical-input-range.service.js";

import {
  indikatorMemengaruhiDerived,
  pastikanBukanDerivedManual,
  siapkanRencanaDerivedIndicators,
  terapkanRencanaDerivedIndicators,
} from "./derived-indicator.service.js";

// ============================================================
// TYPE
// ============================================================

export interface TambahHasilPemeriksaanInput {
  pesertaSesiPosgaId: number;

  indikatorId: number;

  opsiId?: number | null;

  opsiIds?: number[] | null;

  nilaiNumber?: number | null;

  nilaiText?: string | null;

  nilaiBoolean?: boolean | null;

  nilaiDate?: string | null;

  catatan?: string | null;
}

export interface UpdateHasilPemeriksaanInput {
  opsiId?: number | null;

  opsiIds?: number[] | null;

  nilaiNumber?: number | null;

  nilaiText?: string | null;

  nilaiBoolean?: boolean | null;

  nilaiDate?: string | null;

  catatan?: string | null;
}

export interface OpsiHasilPemeriksaan {
  id: number;

  kode: string;

  label: string;

  nilaiNumerik: number | null;
}

export interface DetailHasilPemeriksaan {
  id: number;

  pesertaSesiPosgaId: number;

  indikatorId: number;

  indikatorKode: string;

  indikatorNama: string;

  tipeInput: "number" | "text" | "boolean" | "date" | "select" | "multiselect";

  satuan: string | null;

  derived: boolean;

  opsiId: number | null;

  nilaiNumber: number | null;

  nilaiText: string | null;

  nilaiBoolean: boolean | null;

  nilaiDate: string | null;

  catatan: string | null;

  createdAt: string;

  updatedAt: string;

  opsiTerpilih: OpsiHasilPemeriksaan[];
}

// ============================================================
// INTERNAL TYPE
// ============================================================

interface NilaiPemeriksaanValid {
  opsiId: number | null;

  opsiIds: number[];

  nilaiNumber: number | null;

  nilaiText: string | null;

  nilaiBoolean: boolean | null;

  nilaiDate: string | null;
}

// ============================================================
// HELPER
// ============================================================

function normalisasiText(nilai: string | null | undefined) {
  if (nilai === undefined || nilai === null) {
    return null;
  }

  const hasil = nilai.trim();

  return hasil.length > 0 ? hasil : null;
}

// ============================================================
// VALIDASI TANGGAL
// ============================================================

function tanggalValid(nilai: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai)) {
    return false;
  }

  const [tahunText, bulanText, hariText] = nilai.split("-");

  const tahun = Number(tahunText);

  const bulan = Number(bulanText);

  const hari = Number(hariText);

  const tanggal = new Date(Date.UTC(tahun, bulan - 1, hari));

  return (
    tanggal.getUTCFullYear() === tahun &&
    tanggal.getUTCMonth() + 1 === bulan &&
    tanggal.getUTCDate() === hari
  );
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
      pesertaSesiId: pesertaSesiPosga.id,

      pesertaNik: pesertaSesiPosga.pesertaNik,

      statusPemeriksaan: pesertaSesiPosga.statusPemeriksaan,

      sesiPosgaId: pesertaSesiPosga.sesiPosgaId,

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
    throw new Error(
      "Hasil pemeriksaan tidak dapat dicatat karena sesi dibatalkan.",
    );
  }

  if (
    hasil.statusSesi === "selesai" &&
    !izinkanKoreksiSesiSelesai
  ) {
    throw new Error(
      "Sesi sudah selesai. Gunakan mode koreksi riwayat untuk mengubah hasil.",
    );
  }

  if (
    hasil.statusPemeriksaan === "tidak_hadir" ||
    hasil.statusPemeriksaan === "batal"
  ) {
    throw new Error(
      "Hasil pemeriksaan tidak dapat dicatat untuk peserta yang tidak hadir atau batal.",
    );
  }

  return hasil;
}

// ============================================================
// VALIDASI MASTER INDIKATOR
// ============================================================

async function ambilMasterPemeriksaan(indikatorId: number) {
  const rows = await db
    .select({
      id: indikator.id,

      kode: indikator.kode,

      nama: indikator.nama,

      kelompok: indikator.kelompok,

      tipeInput: indikator.tipeInput,

      satuan: indikator.satuan,

      derived: indikator.derived,

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

  if (hasil.kelompok !== "pemeriksaan") {
    throw new Error("Indikator bukan kelompok pemeriksaan.");
  }

  return hasil;
}

// ============================================================
// VALIDASI OPSI
// ============================================================

async function validasiOpsi(indikatorId: number, opsiIds: number[]) {
  const unik = [...new Set(opsiIds)];

  if (unik.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: opsiIndikator.id,

      indikatorId: opsiIndikator.indikatorId,

      kode: opsiIndikator.kode,

      label: opsiIndikator.label,

      aktif: opsiIndikator.aktif,
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
      "Terdapat opsi indikator yang tidak valid atau tidak aktif.",
    );
  }

  return unik;
}

// ============================================================
// VALIDASI NILAI BERDASARKAN TIPE INPUT
// ============================================================

async function validasiNilai(
  indikatorId: number,

  indikatorKode: string,

  tipeInput: "number" | "text" | "boolean" | "date" | "select" | "multiselect",

  input: {
    opsiId?: number | null;

    opsiIds?: number[] | null;

    nilaiNumber?: number | null;

    nilaiText?: string | null;

    nilaiBoolean?: boolean | null;

    nilaiDate?: string | null;
  },
): Promise<NilaiPemeriksaanValid> {
  const hasil: NilaiPemeriksaanValid = {
    opsiId: null,

    opsiIds: [],

    nilaiNumber: null,

    nilaiText: null,

    nilaiBoolean: null,

    nilaiDate: null,
  };

  // ==========================================================
  // NUMBER
  // ==========================================================

  if (tipeInput === "number") {
    if (
      input.nilaiNumber === undefined ||
      input.nilaiNumber === null ||
      !Number.isFinite(input.nilaiNumber)
    ) {
      throw new Error(
        "Indikator bertipe number membutuhkan nilaiNumber yang valid.",
      );
    }

    validasiPlausibilitasAngka(
      indikatorKode,
      input.nilaiNumber,
    );

    hasil.nilaiNumber = input.nilaiNumber;

    return hasil;
  }

  // ==========================================================
  // TEXT
  // ==========================================================

  if (tipeInput === "text") {
    const nilai = normalisasiText(input.nilaiText);

    if (!nilai) {
      throw new Error("Indikator bertipe text membutuhkan nilaiText.");
    }

    hasil.nilaiText = nilai;

    return hasil;
  }

  // ==========================================================
  // BOOLEAN
  // ==========================================================

  if (tipeInput === "boolean") {
    if (typeof input.nilaiBoolean !== "boolean") {
      throw new Error("Indikator bertipe boolean membutuhkan nilaiBoolean.");
    }

    hasil.nilaiBoolean = input.nilaiBoolean;

    return hasil;
  }

  // ==========================================================
  // DATE
  // ==========================================================

  if (tipeInput === "date") {
    if (!input.nilaiDate || !tanggalValid(input.nilaiDate)) {
      throw new Error(
        "Indikator bertipe date membutuhkan nilaiDate YYYY-MM-DD yang valid.",
      );
    }

    hasil.nilaiDate = input.nilaiDate;

    return hasil;
  }

  // ==========================================================
  // SELECT
  // ==========================================================

  if (tipeInput === "select") {
    if (input.opsiId === undefined || input.opsiId === null) {
      throw new Error("Indikator bertipe select membutuhkan opsiId.");
    }

    await validasiOpsi(indikatorId, [input.opsiId]);

    hasil.opsiId = input.opsiId;

    return hasil;
  }

  // ==========================================================
  // MULTISELECT
  // ==========================================================

  if (tipeInput === "multiselect") {
    if (!input.opsiIds || input.opsiIds.length === 0) {
      throw new Error(
        "Indikator bertipe multiselect membutuhkan minimal satu opsi.",
      );
    }

    hasil.opsiIds = await validasiOpsi(indikatorId, input.opsiIds);

    return hasil;
  }

  throw new Error("Tipe input indikator tidak didukung.");
}

// ============================================================
// AMBIL OPSI TERPILIH
// ============================================================

async function ambilOpsiTerpilih(
  hasilPemeriksaanId: number,
  opsiId: number | null,
): Promise<OpsiHasilPemeriksaan[]> {
  const daftar: OpsiHasilPemeriksaan[] = [];

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

    const item = rows[0];

    if (item) {
      daftar.push(item);
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
    .from(hasilPemeriksaanOpsi)
    .innerJoin(opsiIndikator, eq(opsiIndikator.id, hasilPemeriksaanOpsi.opsiId))
    .where(eq(hasilPemeriksaanOpsi.hasilPemeriksaanId, hasilPemeriksaanId));

  for (const item of rowsMulti) {
    if (!daftar.some((opsi) => opsi.id === item.id)) {
      daftar.push(item);
    }
  }

  return daftar;
}

// ============================================================
// READ BY ID
// ============================================================

export async function ambilHasilPemeriksaanById(
  id: number,
): Promise<DetailHasilPemeriksaan | null> {
  const rows = await db
    .select({
      id: hasilPemeriksaan.id,

      pesertaSesiPosgaId: hasilPemeriksaan.pesertaSesiPosgaId,

      indikatorId: hasilPemeriksaan.indikatorId,

      indikatorKode: indikator.kode,

      indikatorNama: indikator.nama,

      tipeInput: indikator.tipeInput,

      satuan: indikator.satuan,

      derived: indikator.derived,

      opsiId: hasilPemeriksaan.opsiId,

      nilaiNumber: hasilPemeriksaan.nilaiNumber,

      nilaiText: hasilPemeriksaan.nilaiText,

      nilaiBoolean: hasilPemeriksaan.nilaiBoolean,

      nilaiDate: hasilPemeriksaan.nilaiDate,

      catatan: hasilPemeriksaan.catatan,

      createdAt: hasilPemeriksaan.createdAt,

      updatedAt: hasilPemeriksaan.updatedAt,
    })
    .from(hasilPemeriksaan)
    .innerJoin(indikator, eq(indikator.id, hasilPemeriksaan.indikatorId))
    .where(eq(hasilPemeriksaan.id, id))
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
// LIST PER PESERTA SESI
// ============================================================

export async function ambilHasilPemeriksaanPesertaSesi(
  pesertaSesiPosgaId: number,
): Promise<DetailHasilPemeriksaan[]> {
  const rows =
    await db
      .select({
        id:
          hasilPemeriksaan.id,

        pesertaSesiPosgaId:
          hasilPemeriksaan.pesertaSesiPosgaId,

        indikatorId:
          hasilPemeriksaan.indikatorId,

        indikatorKode:
          indikator.kode,

        indikatorNama:
          indikator.nama,

        tipeInput:
          indikator.tipeInput,

        satuan:
          indikator.satuan,

        derived:
          indikator.derived,

        opsiId:
          hasilPemeriksaan.opsiId,

        nilaiNumber:
          hasilPemeriksaan.nilaiNumber,

        nilaiText:
          hasilPemeriksaan.nilaiText,

        nilaiBoolean:
          hasilPemeriksaan.nilaiBoolean,

        nilaiDate:
          hasilPemeriksaan.nilaiDate,

        catatan:
          hasilPemeriksaan.catatan,

        createdAt:
          hasilPemeriksaan.createdAt,

        updatedAt:
          hasilPemeriksaan.updatedAt,
      })
      .from(
        hasilPemeriksaan,
      )
      .innerJoin(
        indikator,
        eq(
          indikator.id,
          hasilPemeriksaan.indikatorId,
        ),
      )
      .where(
        eq(
          hasilPemeriksaan.pesertaSesiPosgaId,
          pesertaSesiPosgaId,
        ),
      )
      .orderBy(
        hasilPemeriksaan.id,
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
        hasilPemeriksaanId:
          hasilPemeriksaanOpsi.hasilPemeriksaanId,

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
        hasilPemeriksaanOpsi,
      )
      .innerJoin(
        opsiIndikator,
        eq(
          opsiIndikator.id,
          hasilPemeriksaanOpsi.opsiId,
        ),
      )
      .where(
        inArray(
          hasilPemeriksaanOpsi.hasilPemeriksaanId,
          hasilIds,
        ),
      );

  const opsiMultiMap =
    new Map<
      number,
      OpsiHasilPemeriksaan[]
    >();

  for (
    const item of
    opsiMulti
  ) {
    const daftar =
      opsiMultiMap.get(
        item.hasilPemeriksaanId,
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
      item.hasilPemeriksaanId,
      daftar,
    );
  }

  return rows.map(
    (row) => {
      const opsiTerpilih:
        OpsiHasilPemeriksaan[] =
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
// TAMBAH
// ============================================================

export async function tambahHasilPemeriksaan(
  input: TambahHasilPemeriksaanInput,
  opsi: { izinkanKoreksiSesiSelesai?: boolean } = {},
) {
  await validasiPesertaSesi(
    input.pesertaSesiPosgaId,
    opsi.izinkanKoreksiSesiSelesai ?? false,
  );

  const master = await ambilMasterPemeriksaan(input.indikatorId);

  // ==========================================================
  // DERIVED TIDAK BOLEH INPUT MANUAL
  // ==========================================================

  await pastikanBukanDerivedManual(master.id);

  // ==========================================================
  // DUPLIKAT
  // ==========================================================

  const duplikat = await db
    .select({
      id: hasilPemeriksaan.id,
    })
    .from(hasilPemeriksaan)
    .where(
      and(
        eq(hasilPemeriksaan.pesertaSesiPosgaId, input.pesertaSesiPosgaId),

        eq(hasilPemeriksaan.indikatorId, input.indikatorId),
      ),
    )
    .limit(1);

  if (duplikat.length > 0) {
    throw new Error(
      "Hasil pemeriksaan untuk indikator ini sudah tercatat pada peserta sesi tersebut.",
    );
  }

  const nilai = await validasiNilai(master.id, master.kode, master.tipeInput, input);

  const memengaruhiDerived =
    await indikatorMemengaruhiDerived(
      master.id,
    );

  const rencanaDerived =
    memengaruhiDerived
      ? await siapkanRencanaDerivedIndicators(
          input.pesertaSesiPosgaId,
          {
            indikatorId: master.id,
            nilaiNumber: nilai.nilaiNumber,
          },
        )
      : null;

  const id =
    db.transaction(
      (tx) => {
        const inserted =
          tx
            .insert(
              hasilPemeriksaan,
            )
            .values({
              pesertaSesiPosgaId:
                input.pesertaSesiPosgaId,

              indikatorId:
                input.indikatorId,

              opsiId:
                nilai.opsiId,

              nilaiNumber:
                nilai.nilaiNumber,

              nilaiText:
                nilai.nilaiText,

              nilaiBoolean:
                nilai.nilaiBoolean,

              nilaiDate:
                nilai.nilaiDate,

              catatan:
                normalisasiText(
                  input.catatan,
                ),
            })
            .returning({
              id:
                hasilPemeriksaan.id,
            })
            .all();

        const id =
          inserted[0]?.id;

        if (!id) {
          throw new Error(
            "Gagal menyimpan hasil pemeriksaan.",
          );
        }

        if (
          nilai.opsiIds.length >
          0
        ) {
          tx
            .insert(
              hasilPemeriksaanOpsi,
            )
            .values(
              nilai.opsiIds.map(
                (opsiId) => ({
                  hasilPemeriksaanId:
                    id,

                  opsiId,
                }),
              ),
            )
            .run();
        }

        if (rencanaDerived) {
          terapkanRencanaDerivedIndicators(
            rencanaDerived,
            tx,
          );
        }

        return id;
      },
    );

  const hasil = await ambilHasilPemeriksaanById(id);

  if (!hasil) {
    throw new Error(
      "Hasil pemeriksaan berhasil disimpan tetapi gagal dibaca kembali.",
    );
  }

  return hasil;
}

// ============================================================
// UPDATE
// ============================================================

export async function updateHasilPemeriksaan(
  id: number,
  input: UpdateHasilPemeriksaanInput,
  opsi: { izinkanKoreksiSesiSelesai?: boolean } = {},
) {
  const lama = await ambilHasilPemeriksaanById(id);

  if (!lama) {
    throw new Error("Hasil pemeriksaan tidak ditemukan.");
  }

  await validasiPesertaSesi(
    lama.pesertaSesiPosgaId,
    opsi.izinkanKoreksiSesiSelesai ?? false,
  );

  const master = await ambilMasterPemeriksaan(lama.indikatorId);

  // ==========================================================
  // DERIVED TIDAK BOLEH UPDATE MANUAL
  // ==========================================================

  await pastikanBukanDerivedManual(master.id);

  let opsiIdsLama = lama.opsiTerpilih.map((item) => item.id);

  if (master.tipeInput !== "multiselect") {
    opsiIdsLama = [];
  }

  const nilai = await validasiNilai(master.id, master.kode, master.tipeInput, {
    opsiId: input.opsiId !== undefined ? input.opsiId : lama.opsiId,

    opsiIds: input.opsiIds !== undefined ? input.opsiIds : opsiIdsLama,

    nilaiNumber:
      input.nilaiNumber !== undefined ? input.nilaiNumber : lama.nilaiNumber,

    nilaiText: input.nilaiText !== undefined ? input.nilaiText : lama.nilaiText,

    nilaiBoolean:
      input.nilaiBoolean !== undefined ? input.nilaiBoolean : lama.nilaiBoolean,

    nilaiDate: input.nilaiDate !== undefined ? input.nilaiDate : lama.nilaiDate,
  });

  const memengaruhiDerived =
    await indikatorMemengaruhiDerived(
      master.id,
    );

  const rencanaDerived =
    memengaruhiDerived
      ? await siapkanRencanaDerivedIndicators(
          lama.pesertaSesiPosgaId,
          {
            indikatorId: master.id,
            nilaiNumber: nilai.nilaiNumber,
          },
        )
      : null;

  db.transaction(
    (tx) => {
      tx
        .update(
          hasilPemeriksaan,
        )
        .set({
          opsiId:
            nilai.opsiId,

          nilaiNumber:
            nilai.nilaiNumber,

          nilaiText:
            nilai.nilaiText,

          nilaiBoolean:
            nilai.nilaiBoolean,

          nilaiDate:
            nilai.nilaiDate,

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
            hasilPemeriksaan.id,
            id,
          ),
        )
        .run();

      tx
        .delete(
          hasilPemeriksaanOpsi,
        )
        .where(
          eq(
            hasilPemeriksaanOpsi.hasilPemeriksaanId,
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
            hasilPemeriksaanOpsi,
          )
          .values(
            nilai.opsiIds.map(
              (opsiId) => ({
                hasilPemeriksaanId:
                  id,

                opsiId,
              }),
            ),
          )
          .run();
      }

      if (rencanaDerived) {
        terapkanRencanaDerivedIndicators(
          rencanaDerived,
          tx,
        );
      }
    },
  );

  const hasil = await ambilHasilPemeriksaanById(id);

  if (!hasil) {
    throw new Error("Hasil pemeriksaan gagal dibaca setelah update.");
  }

  return hasil;
}

// ============================================================
// DELETE
// ============================================================

export async function hapusHasilPemeriksaan(
  id: number,
  opsi: { izinkanKoreksiSesiSelesai?: boolean } = {},
) {
  const lama = await ambilHasilPemeriksaanById(id);

  if (!lama) {
    throw new Error("Hasil pemeriksaan tidak ditemukan.");
  }

  await validasiPesertaSesi(
    lama.pesertaSesiPosgaId,
    opsi.izinkanKoreksiSesiSelesai ?? false,
  );

  // ==========================================================
  // DERIVED TIDAK BOLEH DIHAPUS MANUAL
  //
  // Derived akan otomatis hilang jika salah satu sumbernya
  // dihapus.
  // ==========================================================

  await pastikanBukanDerivedManual(lama.indikatorId);

  const memengaruhiDerived = await indikatorMemengaruhiDerived(
    lama.indikatorId,
  );

  const rencanaDerived =
    memengaruhiDerived
      ? await siapkanRencanaDerivedIndicators(
          lama.pesertaSesiPosgaId,
          {
            indikatorId: lama.indikatorId,
            hapus: true,
          },
        )
      : null;

  db.transaction(
    (tx) => {
      tx
        .delete(
          hasilPemeriksaan,
        )
        .where(
          eq(
            hasilPemeriksaan.id,
            id,
          ),
        )
        .run();

      if (rencanaDerived) {
        terapkanRencanaDerivedIndicators(
          rencanaDerived,
          tx,
        );
      }
    },
  );

  return {
    id,

    berhasil: true,
  };
}


