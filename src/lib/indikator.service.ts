import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { db } from "../db/index.js";

import { aturanIndikator, indikator, opsiIndikator } from "../db/schema.js";

// ============================================================
// TYPE
// ============================================================

export type KelompokIndikator = "pemeriksaan" | "skrining" | "konseling";

export type TipeInputIndikator =
  | "number"
  | "text"
  | "boolean"
  | "date"
  | "select"
  | "multiselect";

export type KategoriIndikator =
  | "bayi"
  | "balita"
  | "prasekolah"
  | "sekolah"
  | "ibu_hamil"
  | "ibu_nifas"
  | "dewasa"
  | "lansia";

export type FrekuensiIndikator =
  | "setiap_sesi"
  | "tahunan"
  | "dua_kali_tahun"
  | "sekali_seumur_hidup"
  | "usia_tertentu"
  | "sesuai_indikasi"
  | "manual";

export interface TambahIndikatorInput {
  kode: string;
  nama: string;

  kelompok: KelompokIndikator;

  tipeInput: TipeInputIndikator;

  satuan?: string | null;

  derived?: boolean;

  deskripsi?: string | null;

  urutanDefault?: number;

  aktif?: boolean;
}

export interface UpdateIndikatorInput {
  kode?: string;
  nama?: string;

  kelompok?: KelompokIndikator;

  tipeInput?: TipeInputIndikator;

  satuan?: string | null;

  derived?: boolean;

  deskripsi?: string | null;

  urutanDefault?: number;

  aktif?: boolean;
}

export interface TambahOpsiIndikatorInput {
  indikatorId: number;

  kode: string;

  label: string;

  nilaiNumerik?: number | null;

  urutan?: number;

  aktif?: boolean;
}

export interface UpdateOpsiIndikatorInput {
  kode?: string;

  label?: string;

  nilaiNumerik?: number | null;

  urutan?: number;

  aktif?: boolean;
}

export interface TambahAturanIndikatorInput {
  indikatorId: number;

  kategori?: KategoriIndikator | null;

  frekuensi?: FrekuensiIndikator;

  usiaMinBulan?: number | null;

  usiaMaxBulan?: number | null;

  jenisKelamin?: "L" | "P" | null;

  wajib?: boolean;

  berdasarkanIndikasi?: boolean;

  aturanJson?: string | null;

  aktif?: boolean;
}

export interface UpdateAturanIndikatorInput {
  kategori?: KategoriIndikator | null;

  frekuensi?: FrekuensiIndikator;

  usiaMinBulan?: number | null;

  usiaMaxBulan?: number | null;

  jenisKelamin?: "L" | "P" | null;

  wajib?: boolean;

  berdasarkanIndikasi?: boolean;

  aturanJson?: string | null;

  aktif?: boolean;
}

// ============================================================
// HELPER
// ============================================================

function normalisasiKode(kode: string) {
  const hasil = kode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!hasil) {
    throw new Error("Kode indikator tidak boleh kosong.");
  }

  return hasil;
}

function validasiNama(nama: string) {
  const hasil = nama.trim();

  if (!hasil) {
    throw new Error("Nama tidak boleh kosong.");
  }

  return hasil;
}

function validasiUsia(
  usiaMinBulan?: number | null,
  usiaMaxBulan?: number | null,
) {
  if (usiaMinBulan !== undefined && usiaMinBulan !== null && usiaMinBulan < 0) {
    throw new Error("Usia minimum tidak boleh negatif.");
  }

  if (usiaMaxBulan !== undefined && usiaMaxBulan !== null && usiaMaxBulan < 0) {
    throw new Error("Usia maksimum tidak boleh negatif.");
  }

  if (
    usiaMinBulan !== undefined &&
    usiaMinBulan !== null &&
    usiaMaxBulan !== undefined &&
    usiaMaxBulan !== null &&
    usiaMinBulan > usiaMaxBulan
  ) {
    throw new Error("Usia minimum tidak boleh lebih besar dari usia maksimum.");
  }
}

// ============================================================
// READ INDIKATOR
// ============================================================

export async function ambilIndikatorById(id: number) {
  const hasil = await db
    .select()
    .from(indikator)
    .where(eq(indikator.id, id))
    .limit(1);

  return hasil[0] ?? null;
}

export async function ambilIndikatorByKode(kode: string) {
  const kodeNormal = normalisasiKode(kode);

  const hasil = await db
    .select()
    .from(indikator)
    .where(eq(indikator.kode, kodeNormal))
    .limit(1);

  return hasil[0] ?? null;
}

export async function ambilSemuaIndikator(hanyaAktif = false) {
  if (hanyaAktif) {
    return db
      .select()
      .from(indikator)
      .where(eq(indikator.aktif, true))
      .orderBy(asc(indikator.urutanDefault), asc(indikator.nama));
  }

  return db
    .select()
    .from(indikator)
    .orderBy(asc(indikator.urutanDefault), asc(indikator.nama));
}

// ============================================================
// CREATE INDIKATOR
// ============================================================

export async function tambahIndikator(input: TambahIndikatorInput) {
  const kode = normalisasiKode(input.kode);

  const nama = validasiNama(input.nama);

  const existing = await ambilIndikatorByKode(kode);

  if (existing) {
    throw new Error(`Indikator dengan kode ${kode} sudah tersedia.`);
  }

  const hasil = await db
    .insert(indikator)
    .values({
      kode,
      nama,

      kelompok: input.kelompok,

      tipeInput: input.tipeInput,

      satuan: input.satuan,

      derived: input.derived ?? false,

      deskripsi: input.deskripsi,

      urutanDefault: input.urutanDefault ?? 0,

      aktif: input.aktif ?? true,
    })
    .returning();

  return hasil[0] ?? null;
}

// ============================================================
// UPDATE INDIKATOR
// ============================================================

export async function updateIndikator(id: number, input: UpdateIndikatorInput) {
  const existing = await ambilIndikatorById(id);

  if (!existing) {
    throw new Error("Indikator tidak ditemukan.");
  }

  let kodeBaru: string | undefined;

  if (input.kode !== undefined) {
    kodeBaru = normalisasiKode(input.kode);

    const duplikat = await ambilIndikatorByKode(kodeBaru);

    if (duplikat && duplikat.id !== id) {
      throw new Error(`Indikator dengan kode ${kodeBaru} sudah tersedia.`);
    }
  }

  const hasil = await db
    .update(indikator)
    .set({
      ...(kodeBaru !== undefined && {
        kode: kodeBaru,
      }),

      ...(input.nama !== undefined && {
        nama: validasiNama(input.nama),
      }),

      ...(input.kelompok !== undefined && {
        kelompok: input.kelompok,
      }),

      ...(input.tipeInput !== undefined && {
        tipeInput: input.tipeInput,
      }),

      ...(input.satuan !== undefined && {
        satuan: input.satuan,
      }),

      ...(input.derived !== undefined && {
        derived: input.derived,
      }),

      ...(input.deskripsi !== undefined && {
        deskripsi: input.deskripsi,
      }),

      ...(input.urutanDefault !== undefined && {
        urutanDefault: input.urutanDefault,
      }),

      ...(input.aktif !== undefined && {
        aktif: input.aktif,
      }),

      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(indikator.id, id))
    .returning();

  return hasil[0] ?? null;
}

// ============================================================
// NONAKTIFKAN INDIKATOR
// ============================================================

export async function nonaktifkanIndikator(id: number) {
  return updateIndikator(id, {
    aktif: false,
  });
}

// ============================================================
// AKTIFKAN INDIKATOR
// ============================================================

export async function aktifkanIndikator(id: number) {
  return updateIndikator(id, {
    aktif: true,
  });
}

// ============================================================
// DELETE INDIKATOR
//
// Untuk master indikator, default sebaiknya nonaktifkan.
// Delete permanen hanya dipakai untuk data salah/test.
//
// FK restrict dari hasil pemeriksaan akan menjaga indikator
// yang sudah digunakan.
// ============================================================

export async function hapusIndikatorPermanen(id: number) {
  const existing = await ambilIndikatorById(id);

  if (!existing) {
    throw new Error("Indikator tidak ditemukan.");
  }

  try {
    const hasil = await db
      .delete(indikator)
      .where(eq(indikator.id, id))
      .returning();

    return hasil[0] ?? null;
  } catch {
    throw new Error(
      "Indikator tidak dapat dihapus karena sudah digunakan oleh data lain. Nonaktifkan indikator sebagai gantinya.",
    );
  }
}

// ============================================================
// READ OPSI
// ============================================================

export async function ambilOpsiIndikator(
  indikatorId: number,
  hanyaAktif = true,
) {
  if (hanyaAktif) {
    return db
      .select()
      .from(opsiIndikator)
      .where(
        and(
          eq(opsiIndikator.indikatorId, indikatorId),
          eq(opsiIndikator.aktif, true),
        ),
      )
      .orderBy(asc(opsiIndikator.urutan), asc(opsiIndikator.label));
  }

  return db
    .select()
    .from(opsiIndikator)
    .where(eq(opsiIndikator.indikatorId, indikatorId))
    .orderBy(asc(opsiIndikator.urutan), asc(opsiIndikator.label));
}

export async function ambilOpsiById(id: number) {
  const hasil = await db
    .select()
    .from(opsiIndikator)
    .where(eq(opsiIndikator.id, id))
    .limit(1);

  return hasil[0] ?? null;
}

// ============================================================
// CREATE OPSI
// ============================================================

export async function tambahOpsiIndikator(input: TambahOpsiIndikatorInput) {
  const dataIndikator = await ambilIndikatorById(input.indikatorId);

  if (!dataIndikator) {
    throw new Error("Indikator tidak ditemukan.");
  }

  if (
    dataIndikator.tipeInput !== "select" &&
    dataIndikator.tipeInput !== "multiselect"
  ) {
    throw new Error(
      "Opsi hanya dapat ditambahkan pada indikator bertipe select atau multiselect.",
    );
  }

  const kode = normalisasiKode(input.kode);

  const label = validasiNama(input.label);

  const existing = await db
    .select()
    .from(opsiIndikator)
    .where(
      and(
        eq(opsiIndikator.indikatorId, input.indikatorId),

        eq(opsiIndikator.kode, kode),
      ),
    )
    .limit(1);

  if (existing[0]) {
    throw new Error(
      `Opsi dengan kode ${kode} sudah tersedia pada indikator tersebut.`,
    );
  }

  const hasil = await db
    .insert(opsiIndikator)
    .values({
      indikatorId: input.indikatorId,

      kode,

      label,

      nilaiNumerik: input.nilaiNumerik,

      urutan: input.urutan ?? 0,

      aktif: input.aktif ?? true,
    })
    .returning();

  return hasil[0] ?? null;
}

// ============================================================
// UPDATE OPSI
// ============================================================

export async function updateOpsiIndikator(
  id: number,
  input: UpdateOpsiIndikatorInput,
) {
  const existing = await ambilOpsiById(id);

  if (!existing) {
    throw new Error("Opsi indikator tidak ditemukan.");
  }

  let kodeBaru: string | undefined;

  if (input.kode !== undefined) {
    kodeBaru = normalisasiKode(input.kode);

    const duplikat = await db
      .select()
      .from(opsiIndikator)
      .where(
        and(
          eq(opsiIndikator.indikatorId, existing.indikatorId),
          eq(opsiIndikator.kode, kodeBaru),
        ),
      )
      .limit(1);

    if (duplikat[0] && duplikat[0].id !== id) {
      throw new Error(
        `Opsi dengan kode ${kodeBaru} sudah tersedia pada indikator tersebut.`,
      );
    }
  }

  const hasil = await db
    .update(opsiIndikator)
    .set({
      ...(kodeBaru !== undefined && {
        kode: kodeBaru,
      }),

      ...(input.label !== undefined && {
        label: validasiNama(input.label),
      }),

      ...(input.nilaiNumerik !== undefined && {
        nilaiNumerik: input.nilaiNumerik,
      }),

      ...(input.urutan !== undefined && {
        urutan: input.urutan,
      }),

      ...(input.aktif !== undefined && {
        aktif: input.aktif,
      }),
    })
    .where(eq(opsiIndikator.id, id))
    .returning();

  return hasil[0] ?? null;
}

export async function nonaktifkanOpsiIndikator(id: number) {
  return updateOpsiIndikator(id, {
    aktif: false,
  });
}

// ============================================================
// DELETE OPSI PERMANEN
// ============================================================

export async function hapusOpsiIndikatorPermanen(id: number) {
  const existing = await ambilOpsiById(id);

  if (!existing) {
    throw new Error("Opsi indikator tidak ditemukan.");
  }

  try {
    const hasil = await db
      .delete(opsiIndikator)
      .where(eq(opsiIndikator.id, id))
      .returning();

    return hasil[0] ?? null;
  } catch {
    throw new Error(
      "Opsi tidak dapat dihapus karena sudah digunakan oleh data lain.",
    );
  }
}

// ============================================================
// READ ATURAN
// ============================================================

export async function ambilAturanById(id: number) {
  const hasil = await db
    .select()
    .from(aturanIndikator)
    .where(eq(aturanIndikator.id, id))
    .limit(1);

  return hasil[0] ?? null;
}

export async function ambilAturanIndikator(
  indikatorId: number,
  hanyaAktif = true,
) {
  if (hanyaAktif) {
    return db
      .select()
      .from(aturanIndikator)
      .where(
        and(
          eq(aturanIndikator.indikatorId, indikatorId),
          eq(aturanIndikator.aktif, true),
        ),
      );
  }

  return db
    .select()
    .from(aturanIndikator)
    .where(eq(aturanIndikator.indikatorId, indikatorId));
}

// ============================================================
// CREATE ATURAN
// ============================================================

export async function tambahAturanIndikator(input: TambahAturanIndikatorInput) {
  const dataIndikator = await ambilIndikatorById(input.indikatorId);

  if (!dataIndikator) {
    throw new Error("Indikator tidak ditemukan.");
  }

  validasiUsia(input.usiaMinBulan, input.usiaMaxBulan);

  if (input.aturanJson !== undefined && input.aturanJson !== null) {
    try {
      JSON.parse(input.aturanJson);
    } catch {
      throw new Error("aturanJson harus berupa JSON yang valid.");
    }
  }

  const hasil = await db
    .insert(aturanIndikator)
    .values({
      indikatorId: input.indikatorId,

      kategori: input.kategori,

      frekuensi: input.frekuensi ?? "manual",

      usiaMinBulan: input.usiaMinBulan,

      usiaMaxBulan: input.usiaMaxBulan,

      jenisKelamin: input.jenisKelamin,

      wajib: input.wajib ?? false,

      berdasarkanIndikasi: input.berdasarkanIndikasi ?? false,

      aturanJson: input.aturanJson,

      aktif: input.aktif ?? true,
    })
    .returning();

  return hasil[0] ?? null;
}

// ============================================================
// UPDATE ATURAN
// ============================================================

export async function updateAturanIndikator(
  id: number,
  input: UpdateAturanIndikatorInput,
) {
  const existing = await ambilAturanById(id);

  if (!existing) {
    throw new Error("Aturan indikator tidak ditemukan.");
  }

  validasiUsia(
    input.usiaMinBulan ?? existing.usiaMinBulan,

    input.usiaMaxBulan ?? existing.usiaMaxBulan,
  );

  if (input.aturanJson !== undefined && input.aturanJson !== null) {
    try {
      JSON.parse(input.aturanJson);
    } catch {
      throw new Error("aturanJson harus berupa JSON yang valid.");
    }
  }

  const hasil = await db
    .update(aturanIndikator)
    .set({
      ...(input.kategori !== undefined && {
        kategori: input.kategori,
      }),

      ...(input.frekuensi !== undefined && {
        frekuensi: input.frekuensi,
      }),

      ...(input.usiaMinBulan !== undefined && {
        usiaMinBulan: input.usiaMinBulan,
      }),

      ...(input.usiaMaxBulan !== undefined && {
        usiaMaxBulan: input.usiaMaxBulan,
      }),

      ...(input.jenisKelamin !== undefined && {
        jenisKelamin: input.jenisKelamin,
      }),

      ...(input.wajib !== undefined && {
        wajib: input.wajib,
      }),

      ...(input.berdasarkanIndikasi !== undefined && {
        berdasarkanIndikasi: input.berdasarkanIndikasi,
      }),

      ...(input.aturanJson !== undefined && {
        aturanJson: input.aturanJson,
      }),

      ...(input.aktif !== undefined && {
        aktif: input.aktif,
      }),
    })
    .where(eq(aturanIndikator.id, id))
    .returning();

  return hasil[0] ?? null;
}

export async function nonaktifkanAturanIndikator(id: number) {
  return updateAturanIndikator(id, {
    aktif: false,
  });
}

export async function hapusAturanIndikatorPermanen(id: number) {
  const existing = await ambilAturanById(id);

  if (!existing) {
    throw new Error("Aturan indikator tidak ditemukan.");
  }

  const hasil = await db
    .delete(aturanIndikator)
    .where(eq(aturanIndikator.id, id))
    .returning();

  return hasil[0] ?? null;
}

// ============================================================
// PAKET INDIKATOR BERDASARKAN KATEGORI
// ============================================================

/**
 * Mengambil master indikator yang berlaku untuk suatu kategori.
 *
 * Ini BELUM menentukan apakah skrining tahunan sudah jatuh tempo.
 * Tahap tersebut dibuat pada rule engine berikutnya.
 *
 * Fungsi ini menjawab:
 *
 * "Indikator apa saja yang secara konfigurasi berlaku
 * untuk kategori BALITA?"
 */
export async function ambilPaketIndikatorKategori(kategori: KategoriIndikator) {
  const rows = await db
    .select({
      aturanId: aturanIndikator.id,

      indikatorId: indikator.id,

      kode: indikator.kode,

      nama: indikator.nama,

      kelompok: indikator.kelompok,

      tipeInput: indikator.tipeInput,

      satuan: indikator.satuan,

      derived: indikator.derived,

      deskripsi: indikator.deskripsi,

      urutanDefault: indikator.urutanDefault,

      kategori: aturanIndikator.kategori,

      frekuensi: aturanIndikator.frekuensi,

      usiaMinBulan: aturanIndikator.usiaMinBulan,

      usiaMaxBulan: aturanIndikator.usiaMaxBulan,

      jenisKelamin: aturanIndikator.jenisKelamin,

      wajib: aturanIndikator.wajib,

      berdasarkanIndikasi: aturanIndikator.berdasarkanIndikasi,

      aturanJson: aturanIndikator.aturanJson,
    })
    .from(aturanIndikator)
    .innerJoin(indikator, eq(indikator.id, aturanIndikator.indikatorId))
    .where(
      and(
        eq(aturanIndikator.aktif, true),

        eq(indikator.aktif, true),

        eq(aturanIndikator.kategori, kategori),
      ),
    )
    .orderBy(asc(indikator.urutanDefault), asc(indikator.nama));

  const ids = rows.map((item) => item.indikatorId);

  if (ids.length === 0) {
    return [];
  }

  const semuaOpsi = await db
    .select()
    .from(opsiIndikator)
    .where(
      and(
        inArray(opsiIndikator.indikatorId, ids),

        eq(opsiIndikator.aktif, true),
      ),
    )
    .orderBy(asc(opsiIndikator.urutan));

  return rows.map((item) => ({
    ...item,

    opsi: semuaOpsi.filter((opsi) => opsi.indikatorId === item.indikatorId),
  }));
}

// ============================================================
// PAKET INDIKATOR BERDASARKAN KATEGORI + UMUR + JK
// ============================================================

/**
 * Filter dasar berdasarkan:
 *
 * - kategori
 * - usia dalam bulan
 * - jenis kelamin
 *
 * Frekuensi tahunan/seumur hidup/indikasi akan diproses
 * lebih lanjut oleh rule engine.
 */
export async function ambilPaketIndikatorDasar(
  kategori: KategoriIndikator,
  usiaBulan: number,
  jenisKelamin: "L" | "P",
) {
  if (usiaBulan < 0) {
    throw new Error("Usia bulan tidak valid.");
  }

  const paket = await ambilPaketIndikatorKategori(kategori);

  return paket.filter((item) => {
    if (item.jenisKelamin && item.jenisKelamin !== jenisKelamin) {
      return false;
    }

    if (item.usiaMinBulan !== null && usiaBulan < item.usiaMinBulan) {
      return false;
    }

    if (item.usiaMaxBulan !== null && usiaBulan > item.usiaMaxBulan) {
      return false;
    }

    return true;
  });
}
