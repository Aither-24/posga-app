import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../db/index.js";

import {
  validasiPlausibilitasAngka,
} from "./clinical-input-range.service.js";

import {
  hasilSkrining,
  indikator,
  opsiIndikator,
  peserta,
  pesertaSesiPosga,
  sesiPosga,
} from "../db/schema.js";

// ============================================================
// TYPE
// ============================================================

export type SumberSkrining = "posga" | "eksternal";

export interface TambahHasilSkriningInput {
  pesertaNik: string;

  indikatorId: number;

  sesiPosgaId?: number | null;

  tanggalSkrining: string;

  sumber: SumberSkrining;

  namaFasilitas?: string | null;

  opsiId?: number | null;

  nilaiNumber?: number | null;

  nilaiText?: string | null;

  nilaiBoolean?: boolean | null;

  catatan?: string | null;
}

export interface UpdateHasilSkriningInput {
  tanggalSkrining?: string;

  sumber?: SumberSkrining;

  sesiPosgaId?: number | null;

  namaFasilitas?: string | null;

  opsiId?: number | null;

  nilaiNumber?: number | null;

  nilaiText?: string | null;

  nilaiBoolean?: boolean | null;

  catatan?: string | null;
}

// ============================================================
// VALIDASI TANGGAL
// ============================================================

function validasiTanggal(nilai: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai)) {
    throw new Error("Tanggal skrining harus menggunakan format YYYY-MM-DD.");
  }

  const [tahunText, bulanText, hariText] = nilai.split("-");

  const tahun = Number(tahunText);

  const bulan = Number(bulanText);

  const hari = Number(hariText);

  const tanggal = new Date(Date.UTC(tahun, bulan - 1, hari));

  if (
    tanggal.getUTCFullYear() !== tahun ||
    tanggal.getUTCMonth() + 1 !== bulan ||
    tanggal.getUTCDate() !== hari
  ) {
    throw new Error("Tanggal skrining tidak valid.");
  }
}

// ============================================================
// NORMALISASI TEXT
// ============================================================

function normalisasiText(nilai: string | null | undefined) {
  if (nilai === undefined) {
    return undefined;
  }

  if (nilai === null) {
    return null;
  }

  const hasil = nilai.trim();

  return hasil === "" ? null : hasil;
}

// ============================================================
// AMBIL PESERTA
// ============================================================

async function pastikanPesertaAda(nik: string) {
  const hasil = await db
    .select({
      nik: peserta.nik,
    })
    .from(peserta)
    .where(eq(peserta.nik, nik))
    .limit(1);

  if (!hasil[0]) {
    throw new Error("Peserta tidak ditemukan.");
  }
}

// ============================================================
// AMBIL INDIKATOR
// ============================================================

async function ambilIndikatorSkrining(indikatorId: number) {
  const hasil = await db
    .select()
    .from(indikator)
    .where(eq(indikator.id, indikatorId))
    .limit(1);

  const item = hasil[0];

  if (!item) {
    throw new Error("Indikator tidak ditemukan.");
  }

  if (!item.aktif) {
    throw new Error("Indikator sudah tidak aktif.");
  }

  if (item.kelompok !== "skrining") {
    throw new Error("Indikator bukan indikator skrining.");
  }

  return item;
}

// ============================================================
// VALIDASI OPSI
// ============================================================

async function validasiOpsi(
  indikatorId: number,
  opsiId: number | null | undefined,
) {
  if (opsiId === undefined || opsiId === null) {
    return;
  }

  const hasil = await db
    .select({
      id: opsiIndikator.id,

      indikatorId: opsiIndikator.indikatorId,

      aktif: opsiIndikator.aktif,
    })
    .from(opsiIndikator)
    .where(eq(opsiIndikator.id, opsiId))
    .limit(1);

  const opsi = hasil[0];

  if (!opsi) {
    throw new Error("Opsi indikator tidak ditemukan.");
  }

  if (opsi.indikatorId !== indikatorId) {
    throw new Error("Opsi tidak sesuai dengan indikator skrining.");
  }

  if (!opsi.aktif) {
    throw new Error("Opsi indikator sudah tidak aktif.");
  }
}

// ============================================================
// VALIDASI SESSION POSGA
// ============================================================

async function pastikanSesiAda(
  sesiPosgaId: number,
  izinkanKoreksiSesiSelesai = false,
) {
  const hasil = await db
    .select({
      id: sesiPosga.id,

      tanggalPosga: sesiPosga.tanggalPosga,

      status: sesiPosga.status,
    })
    .from(sesiPosga)
    .where(eq(sesiPosga.id, sesiPosgaId))
    .limit(1);

  const sesi = hasil[0];

  if (!sesi) {
    throw new Error("Sesi Posga tidak ditemukan.");
  }

  if (sesi.status === "dibatalkan") {
    throw new Error("Sesi Posga sudah dibatalkan.");
  }

  if (
    sesi.status === "selesai" &&
    !izinkanKoreksiSesiSelesai
  ) {
    throw new Error(
      "Sesi sudah selesai. Gunakan mode koreksi riwayat untuk mengubah hasil skrining.",
    );
  }

  return sesi;
}


async function pastikanPesertaDalamSesi(
  pesertaNik: string,
  sesiPosgaId: number,
) {
  const rows = await db
    .select({
      id: pesertaSesiPosga.id,
    })
    .from(pesertaSesiPosga)
    .where(
      and(
        eq(
          pesertaSesiPosga.pesertaNik,
          pesertaNik,
        ),
        eq(
          pesertaSesiPosga.sesiPosgaId,
          sesiPosgaId,
        ),
      ),
    )
    .limit(1);

  if (!rows[0]) {
    throw new Error(
      "Peserta tidak terdaftar pada sesi POSGA ini.",
    );
  }
}

async function pastikanBelumAdaSkriningSesi(
  pesertaNik: string,
  indikatorId: number,
  sesiPosgaId: number,
  abaikanId?: number,
) {
  const rows = await db
    .select({
      id: hasilSkrining.id,
    })
    .from(hasilSkrining)
    .where(
      and(
        eq(
          hasilSkrining.pesertaNik,
          pesertaNik,
        ),
        eq(
          hasilSkrining.indikatorId,
          indikatorId,
        ),
        eq(
          hasilSkrining.sesiPosgaId,
          sesiPosgaId,
        ),
      ),
    );

  const bentrok =
    rows.find(
      (row) =>
        abaikanId === undefined ||
        row.id !== abaikanId,
    );

  if (bentrok) {
    throw new Error(
      "Hasil skrining indikator ini sudah tercatat pada sesi yang sama.",
    );
  }
}

// ============================================================
// VALIDASI SUMBER
// ============================================================

async function validasiSumber(
  pesertaNik: string,

  sumber: SumberSkrining,

  sesiPosgaId: number | null | undefined,

  tanggalSkrining: string,  izinkanKoreksiSesiSelesai = false,
) {
  if (sumber === "eksternal") {
    if (sesiPosgaId !== undefined && sesiPosgaId !== null) {
      throw new Error(
        "Riwayat skrining eksternal tidak boleh memiliki sesiPosgaId.",
      );
    }

    return;
  }

  if (sesiPosgaId === undefined || sesiPosgaId === null) {
    throw new Error(
      "Skrining yang dilakukan di POSGA harus memiliki sesiPosgaId.",
    );
  }

  const sesi = await pastikanSesiAda(sesiPosgaId, izinkanKoreksiSesiSelesai);

  if (sesi.tanggalPosga !== tanggalSkrining) {
    throw new Error("Tanggal skrining POSGA harus sama dengan tanggal sesi.");
  }

  await pastikanPesertaDalamSesi(
    pesertaNik,
    sesiPosgaId,
  );
}

// ============================================================
// VALIDASI NILAI BERDASARKAN TIPE INPUT
// ============================================================

function validasiNilai(
  indikatorKode: string,
  tipeInput: "number" | "text" | "boolean" | "date" | "select" | "multiselect",

  input: {
    opsiId?: number | null;

    nilaiNumber?: number | null;

    nilaiText?: string | null;

    nilaiBoolean?: boolean | null;
  },
) {
  if (
    tipeInput === "select" &&
    (input.opsiId === undefined || input.opsiId === null)
  ) {
    throw new Error("Indikator bertipe select harus memiliki opsiId.");
  }

  if (
    tipeInput === "number" &&
    (input.nilaiNumber === undefined || input.nilaiNumber === null)
  ) {
    throw new Error("Indikator bertipe number harus memiliki nilaiNumber.");
  }

  if (
    tipeInput === "number" &&
    input.nilaiNumber !== undefined &&
    input.nilaiNumber !== null
  ) {
    validasiPlausibilitasAngka(
      indikatorKode,
      input.nilaiNumber,
    );
  }

  if (
    tipeInput === "text" &&
    (input.nilaiText === undefined ||
      input.nilaiText === null ||
      input.nilaiText.trim() === "")
  ) {
    throw new Error("Indikator bertipe text harus memiliki nilaiText.");
  }

  if (
    tipeInput === "boolean" &&
    (input.nilaiBoolean === undefined || input.nilaiBoolean === null)
  ) {
    throw new Error("Indikator bertipe boolean harus memiliki nilaiBoolean.");
  }

  if (tipeInput === "multiselect") {
    throw new Error("Multiselect skrining belum didukung oleh CRUD ini.");
  }

  if (tipeInput === "date") {
    throw new Error(
      "Indikator skrining bertipe date belum didukung oleh schema hasil_skrining.",
    );
  }
}

// ============================================================
// AMBIL HASIL BY ID
// ============================================================

export async function ambilHasilSkriningById(id: number) {
  const hasil = await db
    .select({
      id: hasilSkrining.id,

      pesertaNik: hasilSkrining.pesertaNik,

      indikatorId: hasilSkrining.indikatorId,

      indikatorKode: indikator.kode,

      indikatorNama: indikator.nama,

      tipeInput: indikator.tipeInput,

      sesiPosgaId: hasilSkrining.sesiPosgaId,

      tanggalSkrining: hasilSkrining.tanggalSkrining,

      sumber: hasilSkrining.sumber,

      namaFasilitas: hasilSkrining.namaFasilitas,

      opsiId: hasilSkrining.opsiId,

      opsiKode: opsiIndikator.kode,

      opsiLabel: opsiIndikator.label,

      nilaiNumber: hasilSkrining.nilaiNumber,

      nilaiText: hasilSkrining.nilaiText,

      nilaiBoolean: hasilSkrining.nilaiBoolean,

      catatan: hasilSkrining.catatan,

      createdAt: hasilSkrining.createdAt,

      updatedAt: hasilSkrining.updatedAt,
    })
    .from(hasilSkrining)
    .innerJoin(indikator, eq(indikator.id, hasilSkrining.indikatorId))
    .leftJoin(opsiIndikator, eq(opsiIndikator.id, hasilSkrining.opsiId))
    .where(eq(hasilSkrining.id, id))
    .limit(1);

  return hasil[0] ?? null;
}

// ============================================================
// TAMBAH HASIL SKRINING
// ============================================================

export async function tambahHasilSkrining(
  input: TambahHasilSkriningInput,
  opsi: { izinkanKoreksiSesiSelesai?: boolean } = {},
) {
  const pesertaNik = input.pesertaNik.trim();

  if (pesertaNik === "") {
    throw new Error("NIK peserta wajib diisi.");
  }

  validasiTanggal(input.tanggalSkrining);

  await pastikanPesertaAda(pesertaNik);

  const master = await ambilIndikatorSkrining(input.indikatorId);

  await validasiOpsi(input.indikatorId, input.opsiId);

  await validasiSumber(
    pesertaNik,
    input.sumber,
    input.sesiPosgaId,
    input.tanggalSkrining,
  );

  if (
    input.sumber === "posga" &&
    input.sesiPosgaId !== undefined &&
    input.sesiPosgaId !== null
  ) {
    await pastikanBelumAdaSkriningSesi(
      pesertaNik,
      input.indikatorId,
      input.sesiPosgaId,
    );
  }

  validasiNilai(master.kode, master.tipeInput, input);

  const namaFasilitas = normalisasiText(input.namaFasilitas);

  const nilaiText = normalisasiText(input.nilaiText);

  const catatan = normalisasiText(input.catatan);

  const inserted = await db
    .insert(hasilSkrining)
    .values({
      pesertaNik,

      indikatorId: input.indikatorId,

      tanggalSkrining: input.tanggalSkrining,

      sumber: input.sumber,

      ...(input.sesiPosgaId !== undefined
        ? {
            sesiPosgaId: input.sesiPosgaId,
          }
        : {}),

      ...(namaFasilitas !== undefined
        ? {
            namaFasilitas,
          }
        : {}),

      ...(input.opsiId !== undefined
        ? {
            opsiId: input.opsiId,
          }
        : {}),

      ...(input.nilaiNumber !== undefined
        ? {
            nilaiNumber: input.nilaiNumber,
          }
        : {}),

      ...(nilaiText !== undefined
        ? {
            nilaiText,
          }
        : {}),

      ...(input.nilaiBoolean !== undefined
        ? {
            nilaiBoolean: input.nilaiBoolean,
          }
        : {}),

      ...(catatan !== undefined
        ? {
            catatan,
          }
        : {}),
    })
    .returning({
      id: hasilSkrining.id,
    });

  const id = inserted[0]?.id;

  if (!id) {
    throw new Error("Gagal menyimpan hasil skrining.");
  }

  return ambilHasilSkriningById(id);
}

// ============================================================
// RIWAYAT SELURUH SKRINING PESERTA
// ============================================================

export async function ambilRiwayatSkriningPeserta(pesertaNik: string) {
  return db
    .select({
      id: hasilSkrining.id,

      pesertaNik: hasilSkrining.pesertaNik,

      indikatorId: hasilSkrining.indikatorId,

      indikatorKode: indikator.kode,

      indikatorNama: indikator.nama,

      sesiPosgaId: hasilSkrining.sesiPosgaId,

      tanggalSkrining: hasilSkrining.tanggalSkrining,

      sumber: hasilSkrining.sumber,

      namaFasilitas: hasilSkrining.namaFasilitas,

      opsiId: hasilSkrining.opsiId,

      opsiKode: opsiIndikator.kode,

      opsiLabel: opsiIndikator.label,

      nilaiNumber: hasilSkrining.nilaiNumber,

      nilaiText: hasilSkrining.nilaiText,

      nilaiBoolean: hasilSkrining.nilaiBoolean,

      catatan: hasilSkrining.catatan,
    })
    .from(hasilSkrining)
    .innerJoin(indikator, eq(indikator.id, hasilSkrining.indikatorId))
    .leftJoin(opsiIndikator, eq(opsiIndikator.id, hasilSkrining.opsiId))
    .where(eq(hasilSkrining.pesertaNik, pesertaNik))
    .orderBy(desc(hasilSkrining.tanggalSkrining), desc(hasilSkrining.id));
}

// ============================================================
// RIWAYAT PER INDIKATOR
// ============================================================

export async function ambilRiwayatSkriningPerIndikator(
  pesertaNik: string,
  indikatorId: number,
) {
  return db
    .select()
    .from(hasilSkrining)
    .where(
      and(
        eq(hasilSkrining.pesertaNik, pesertaNik),

        eq(hasilSkrining.indikatorId, indikatorId),
      ),
    )
    .orderBy(desc(hasilSkrining.tanggalSkrining), desc(hasilSkrining.id));
}

// ============================================================
// AMBIL SKRINING TERAKHIR
//
// Inilah fungsi yang nanti dipakai Rule Engine v2.
// ============================================================

export async function ambilSkriningTerakhir(
  pesertaNik: string,
  indikatorId: number,
  sampaiTanggal?: string,
) {
  if (sampaiTanggal !== undefined) {
    validasiTanggal(sampaiTanggal);
  }

  const semua = await ambilRiwayatSkriningPerIndikator(pesertaNik, indikatorId);

  if (sampaiTanggal === undefined) {
    return semua[0] ?? null;
  }

  return semua.find((item) => item.tanggalSkrining <= sampaiTanggal) ?? null;
}

// ============================================================
// UPDATE
// ============================================================

export async function updateHasilSkrining(
  id: number,
  input: UpdateHasilSkriningInput,
  opsi: { izinkanKoreksiSesiSelesai?: boolean } = {},
) {
  const existing = await ambilHasilSkriningById(id);

  if (!existing) {
    throw new Error("Hasil skrining tidak ditemukan.");
  }

  const tanggalSkrining = input.tanggalSkrining ?? existing.tanggalSkrining;

  const sumber = input.sumber ?? existing.sumber;

  const sesiPosgaId =
    input.sesiPosgaId !== undefined ? input.sesiPosgaId : existing.sesiPosgaId;

  const namaFasilitas =
    input.namaFasilitas !== undefined
      ? normalisasiText(input.namaFasilitas)
      : existing.namaFasilitas;

  const opsiId = input.opsiId !== undefined ? input.opsiId : existing.opsiId;

  const nilaiNumber =
    input.nilaiNumber !== undefined ? input.nilaiNumber : existing.nilaiNumber;

  const nilaiText =
    input.nilaiText !== undefined
      ? normalisasiText(input.nilaiText)
      : existing.nilaiText;

  const nilaiBoolean =
    input.nilaiBoolean !== undefined
      ? input.nilaiBoolean
      : existing.nilaiBoolean;

  const catatan =
    input.catatan !== undefined
      ? normalisasiText(input.catatan)
      : existing.catatan;

  validasiTanggal(tanggalSkrining);

  const master = await ambilIndikatorSkrining(existing.indikatorId);

  await validasiOpsi(existing.indikatorId, opsiId);

  await validasiSumber(
    existing.pesertaNik,
    sumber,
    sesiPosgaId,
    tanggalSkrining,
    opsi.izinkanKoreksiSesiSelesai ?? false,
  );

  if (
    sumber === "posga" &&
    sesiPosgaId !== null
  ) {
    await pastikanBelumAdaSkriningSesi(
      existing.pesertaNik,
      existing.indikatorId,
      sesiPosgaId,
      id,
    );
  }

  validasiNilai(master.kode, master.tipeInput, {
    opsiId,
    nilaiNumber,

    ...(nilaiText !== undefined
      ? {
          nilaiText,
        }
      : {}),

    nilaiBoolean,
  });

  await db
    .update(hasilSkrining)
    .set({
      tanggalSkrining,

      sumber,

      sesiPosgaId,

      namaFasilitas,

      opsiId,

      nilaiNumber,

      nilaiText,

      nilaiBoolean,

      catatan,

      updatedAt: new Date().toISOString(),
    })
    .where(eq(hasilSkrining.id, id));

  return ambilHasilSkriningById(id);
}

// ============================================================
// HAPUS
// ============================================================

export async function hapusHasilSkrining(
  id: number,
  opsi: { izinkanKoreksiSesiSelesai?: boolean } = {},
) {
  const existing = await ambilHasilSkriningById(id);

  if (!existing) {
    return false;
  }

  if (existing.sesiPosgaId !== null) {
    await pastikanSesiAda(
      existing.sesiPosgaId,
      opsi.izinkanKoreksiSesiSelesai ?? false,
    );
  }

  await db.delete(hasilSkrining).where(eq(hasilSkrining.id, id));

  return true;
}
