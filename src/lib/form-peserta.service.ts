import {
  eq,
  sql,
} from "drizzle-orm";

import { db } from "../db/index.js";

import {
  pesertaSesiPosga,
} from "../db/schema.js";

import {
  generateFormPesertaSesi,
  type HasilRuleIndikator,
} from "./rule-engine.service.js";

import {
  ambilHasilPemeriksaanPesertaSesi,
  type DetailHasilPemeriksaan,
} from "./pemeriksaan.service.js";

import {
  ambilRiwayatSkriningPeserta,
} from "./skrining.service.js";

import {
  ambilHasilKonselingPesertaSesi,
  type DetailHasilKonseling,
} from "./konseling.service.js";

// ============================================================
// TYPE
// ============================================================

type StatusPemeriksaanPeserta =
  | "belum_diperiksa"
  | "sedang_diperiksa"
  | "selesai"
  | "tidak_hadir"
  | "batal";

export interface HasilSkriningForm {
  id: number;

  indikatorId: number;

  indikatorKode: string;

  indikatorNama: string;

  sesiPosgaId:
    number | null;

  tanggalSkrining: string;

  sumber:
    | "posga"
    | "eksternal";

  namaFasilitas:
    string | null;

  opsiId:
    number | null;

  nilaiNumber:
    number | null;

  nilaiText:
    string | null;

  nilaiBoolean:
    boolean | null;

  catatan:
    string | null;
}

export interface ItemPemeriksaanForm
  extends HasilRuleIndikator {
  hasilSaatIni:
    DetailHasilPemeriksaan | null;

  terisi: boolean;

  dihitungDalamProgres:
    boolean;
}

export interface ItemSkriningForm
  extends HasilRuleIndikator {
  hasilSaatIni:
    HasilSkriningForm | null;

  terisi: boolean;

  dihitungDalamProgres:
    boolean;
}

export interface ItemKonselingForm
  extends HasilRuleIndikator {
  hasilSaatIni:
    DetailHasilKonseling | null;

  terisi: boolean;

  dihitungDalamProgres:
    boolean;
}

export interface ProgresKelompok {
  wajib: number;

  terisi: number;

  belumTerisi: number;

  persen: number;
}

export interface ProgresFormPeserta {
  pemeriksaan:
    ProgresKelompok;

  skrining:
    ProgresKelompok;

  konseling:
    ProgresKelompok;

  totalWajib: number;

  totalTerisi: number;

  totalBelumTerisi: number;

  persen: number;

  lengkap: boolean;
}

export interface FormPesertaTerpadu {
  pesertaSesiId: number;

  pesertaNik: string;

  nama: string;

  tanggalLahir: string;

  jenisKelamin:
    | "L"
    | "P";

  tanggalPosga: string;

  kategori: string;

  umur: {
    tahun: number;

    bulan: number;

    hari: number;

    totalBulan: number;
  };

  statusPemeriksaan:
    StatusPemeriksaanPeserta;

  rekomendasiStatus:
    Exclude<
      StatusPemeriksaanPeserta,
      "tidak_hadir" | "batal"
    >;

  pemeriksaan:
    ItemPemeriksaanForm[];

  skrining:
    ItemSkriningForm[];

  konseling:
    ItemKonselingForm[];

  progres:
    ProgresFormPeserta;
}

// ============================================================
// HELPER
// ============================================================

function hitungPersen(
  terisi: number,
  wajib: number,
) {
  if (
    wajib ===
    0
  ) {
    return 100;
  }

  return Math.round(
    (
      terisi /
      wajib
    ) *
      100,
  );
}

// ============================================================
// APAKAH ITEM MASUK PROGRES?
//
// Hanya yang:
// - wajib,
// - statusnya tampil,
// - bukan derived.
//
// derived nantinya dihitung sistem,
// jadi tidak menahan pengguna menyelesaikan form.
// ============================================================

function dihitungDalamProgres(
  item:
    HasilRuleIndikator,
) {
  return (
    item.wajib ===
      true &&
    item.statusKelayakan ===
      "tampil" &&
    item.derived ===
      false
  );
}

// ============================================================
// PROGRES SATU KELOMPOK
// ============================================================

function hitungProgresKelompok(
  items: Array<{
    dihitungDalamProgres:
      boolean;

    terisi:
      boolean;
  }>,
): ProgresKelompok {
  const wajib =
    items.filter(
      (item) =>
        item.dihitungDalamProgres,
    );

  const terisi =
    wajib.filter(
      (item) =>
        item.terisi,
    ).length;

  return {
    wajib:
      wajib.length,

    terisi,

    belumTerisi:
      wajib.length -
      terisi,

    persen:
      hitungPersen(
        terisi,
        wajib.length,
      ),
  };
}

// ============================================================
// STATUS REKOMENDASI
// ============================================================

function tentukanRekomendasiStatus(
  progres:
    ProgresFormPeserta,
): "belum_diperiksa"
  | "sedang_diperiksa"
  | "selesai" {
  if (
    progres.lengkap
  ) {
    return "selesai";
  }

  if (
    progres.totalTerisi >
    0
  ) {
    return "sedang_diperiksa";
  }

  return "belum_diperiksa";
}

// ============================================================
// AMBIL STATUS PESERTA SESI
// ============================================================

async function ambilStatusPesertaSesi(
  pesertaSesiId: number,
) {
  const rows =
    await db
      .select({
        status:
          pesertaSesiPosga.statusPemeriksaan,

        sesiPosgaId:
          pesertaSesiPosga.sesiPosgaId,
      })
      .from(
        pesertaSesiPosga,
      )
      .where(
        eq(
          pesertaSesiPosga.id,
          pesertaSesiId,
        ),
      )
      .limit(1);

  const hasil =
    rows[0];

  if (!hasil) {
    throw new Error(
      "Peserta sesi POSGA tidak ditemukan.",
    );
  }

  return hasil;
}

// ============================================================
// AMBIL FORM PESERTA TERPADU
// ============================================================

export async function ambilFormPesertaTerpadu(
  pesertaSesiId: number,
): Promise<FormPesertaTerpadu> {
  // ==========================================================
  // 1. RULE ENGINE
  // ==========================================================

  const rule =
    await generateFormPesertaSesi(
      pesertaSesiId,
    );

  // ==========================================================
  // 2. STATUS / SESSION ID
  // ==========================================================

  const pesertaSesi =
    await ambilStatusPesertaSesi(
      pesertaSesiId,
    );

  // ==========================================================
  // 3. HASIL PEMERIKSAAN
  // ==========================================================

  const hasilPemeriksaan =
    await ambilHasilPemeriksaanPesertaSesi(
      pesertaSesiId,
    );

  const pemeriksaan:
    ItemPemeriksaanForm[] =
      rule.pemeriksaan.map(
        (item) => {
          const hasil =
            hasilPemeriksaan.find(
              (data) =>
                data.indikatorId ===
                item.indikatorId,
            ) ??
            null;

          const dihitung =
            dihitungDalamProgres(
              item,
            );

          return {
            ...item,

            hasilSaatIni:
              hasil,

            terisi:
              hasil !==
              null,

            dihitungDalamProgres:
              dihitung,
          };
        },
      );

  // ==========================================================
  // 4. HASIL SKRINING
  //
  // Riwayat eksternal tetap dibaca Rule Engine.
  //
  // Tetapi hasilSaatIni hanya berarti hasil yang memang
  // dicatat pada sesi POSGA yang sedang dibuka.
  // ==========================================================

  const riwayatSkrining =
    await ambilRiwayatSkriningPeserta(
      rule.pesertaNik,
    );

  const hasilSkriningSesi =
    riwayatSkrining.filter(
      (hasil) =>
        hasil.sesiPosgaId ===
        pesertaSesi.sesiPosgaId &&
        hasil.sumber ===
          "posga",
    );

  const skrining:
    ItemSkriningForm[] =
      rule.skrining.map(
        (item) => {
          const hasil =
            hasilSkriningSesi.find(
              (data) =>
                data.indikatorId ===
                item.indikatorId,
            ) ??
            null;

          const dihitung =
            dihitungDalamProgres(
              item,
            );

          return {
            ...item,

            hasilSaatIni:
              hasil
                ? {
                    id:
                      hasil.id,

                    indikatorId:
                      hasil.indikatorId,

                    indikatorKode:
                      hasil.indikatorKode,

                    indikatorNama:
                      hasil.indikatorNama,

                    sesiPosgaId:
                      hasil.sesiPosgaId,

                    tanggalSkrining:
                      hasil.tanggalSkrining,

                    sumber:
                      hasil.sumber,

                    namaFasilitas:
                      hasil.namaFasilitas,

                    opsiId:
                      hasil.opsiId,

                    nilaiNumber:
                      hasil.nilaiNumber,

                    nilaiText:
                      hasil.nilaiText,

                    nilaiBoolean:
                      hasil.nilaiBoolean,

                    catatan:
                      hasil.catatan,
                  }
                : null,

            terisi:
              hasil !==
              null,

            dihitungDalamProgres:
              dihitung,
          };
        },
      );

  // ==========================================================
  // 5. HASIL KONSELING
  // ==========================================================

  const hasilKonseling =
    await ambilHasilKonselingPesertaSesi(
      pesertaSesiId,
    );

  const konseling:
    ItemKonselingForm[] =
      rule.konseling.map(
        (item) => {
          const hasil =
            hasilKonseling.find(
              (data) =>
                data.indikatorId ===
                item.indikatorId,
            ) ??
            null;

          const dihitung =
            dihitungDalamProgres(
              item,
            );

          return {
            ...item,

            hasilSaatIni:
              hasil,

            terisi:
              hasil !==
              null,

            dihitungDalamProgres:
              dihitung,
          };
        },
      );

  // ==========================================================
  // 6. HITUNG PROGRES
  // ==========================================================

  const progresPemeriksaan =
    hitungProgresKelompok(
      pemeriksaan,
    );

  const progresSkrining =
    hitungProgresKelompok(
      skrining,
    );

  const progresKonseling =
    hitungProgresKelompok(
      konseling,
    );

  const totalWajib =
    progresPemeriksaan.wajib +
    progresSkrining.wajib +
    progresKonseling.wajib;

  const totalTerisi =
    progresPemeriksaan.terisi +
    progresSkrining.terisi +
    progresKonseling.terisi;

  const progres:
    ProgresFormPeserta =
      {
        pemeriksaan:
          progresPemeriksaan,

        skrining:
          progresSkrining,

        konseling:
          progresKonseling,

        totalWajib,

        totalTerisi,

        totalBelumTerisi:
          totalWajib -
          totalTerisi,

        persen:
          hitungPersen(
            totalTerisi,
            totalWajib,
          ),

        lengkap:
          totalTerisi ===
          totalWajib,
      };

  // ==========================================================
  // 7. STATUS REKOMENDASI
  // ==========================================================

  const rekomendasiStatus =
    tentukanRekomendasiStatus(
      progres,
    );

  return {
    pesertaSesiId:
      rule.pesertaSesiId,

    pesertaNik:
      rule.pesertaNik,

    nama:
      rule.nama,

    tanggalLahir:
      rule.tanggalLahir,

    jenisKelamin:
      rule.jenisKelamin,

    tanggalPosga:
      rule.tanggalPosga,

    kategori:
      rule.kategori,

    umur:
      rule.umur,

    statusPemeriksaan:
      pesertaSesi.status,

    rekomendasiStatus,

    pemeriksaan,

    skrining,

    konseling,

    progres,
  };
}

// ============================================================
// SINKRONKAN STATUS PEMERIKSAAN
//
// Tidak boleh mengubah peserta yang sudah:
// - tidak_hadir
// - batal
//
// Status lainnya mengikuti progres aktual.
// ============================================================

export async function sinkronkanStatusPemeriksaanPeserta(
  pesertaSesiId: number,
) {
  const form =
    await ambilFormPesertaTerpadu(
      pesertaSesiId,
    );

  if (
    form.statusPemeriksaan ===
      "tidak_hadir" ||
    form.statusPemeriksaan ===
      "batal"
  ) {
    return {
      pesertaSesiId,

      statusSebelum:
        form.statusPemeriksaan,

      statusSesudah:
        form.statusPemeriksaan,

      diubah:
        false,
    };
  }

  const statusBaru =
    form.rekomendasiStatus;

  if (
    form.statusPemeriksaan ===
    statusBaru
  ) {
    return {
      pesertaSesiId,

      statusSebelum:
        form.statusPemeriksaan,

      statusSesudah:
        statusBaru,

      diubah:
        false,
    };
  }

  await db
    .update(
      pesertaSesiPosga,
    )
    .set({
      statusPemeriksaan:
        statusBaru,

      updatedAt:
        sql`CURRENT_TIMESTAMP`,
    })
    .where(
      eq(
        pesertaSesiPosga.id,
        pesertaSesiId,
      ),
    );

  return {
    pesertaSesiId,

    statusSebelum:
      form.statusPemeriksaan,

    statusSesudah:
      statusBaru,

    diubah:
      true,
  };
}